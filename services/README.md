# Services

Long-running work that does not fit a serverless function, and the plumbing that lets a
service move between the two runtimes without rewriting it.

## Why this exists

Netlify background functions stop at 15 minutes. Auto-moderating an uploaded series —
transcribe, text check, frame extraction, vision check, per episode — has no such bound,
which is why it had been switched off entirely (`MODERATION_ENABLED=false`). It now runs
here instead.

The design goal was not "move moderation to a box". It was: make *where* a service runs a
configuration choice, so the next thing that outgrows serverless is an env var and a compose
entry rather than a rewrite.

## How it works

```
  upload  ──▶  saveSeries          series saved, episodes pending
                   │
                   ▼
              dispatchJob()        writes a job to MongoDB, then nudges the owner
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   serverless             server (here)
   background fn          claims the job, runs it
                               │
                               ▼
                    POST /api?type=jobProgress    per-episode verdict
                    POST /api?type=jobComplete    scan finished
```

**MongoDB is the queue.** Both runtimes already hold a connection, so this adds no
infrastructure, survives restarts and deploys, and gives an atomic claim for free. The HTTP
nudge is only a latency optimisation — if it is lost, the worker's poll picks the job up on
its next pass. The queue is the contract; the nudge is not.

**One implementation of the work.** The worker imports the same
`netlify/functions/utils/*` modules the serverless functions use, rather than a copy. There
is one answer to "is this video acceptable", and it cannot drift between runtimes.

**Moving a service is configuration.** `JOB_RUNTIME_<NAME>=server|serverless` overrides the
default in `JOB_DEFINITIONS` (`netlify/functions/utils/jobQueue.js`). Putting moderation
back on serverless is one env var — the background function accepts the same queued job and
runs the same pipeline, reporting verdicts by direct call instead of over HTTP.

That fallback is a rollback, not a steady state: it is still bounded by the 15-minute
function budget. It stops cleanly when the budget runs low, leaves the remaining episodes
pending, and requeues itself, so a large series is processed across several passes instead of
dying mid-episode. It also needs `MODERATION_ENABLED=true` in Netlify to do any checking at
all, which is off by design.

**No conflict.** Claiming is a single `findOneAndUpdate` guarded on status, so two runners
can never take the same job. Each claim carries a lease; a job whose lease expires — the
worker died mid-run — becomes claimable again, so work is never stranded. Enqueue is
deduplicated by key, so a retried upload does not queue the same scan twice.

**Both directions are signed.** Serverless→worker and worker→serverless requests carry an
HMAC over the body plus a timestamp (`WORKER_SHARED_SECRET`). The worker holds no user
session; these callbacks are the only path by which a non-user may record a review decision.

## Running it locally

No Docker needed — that is only how it ships to the instance. The worker is a plain Node
process that reads the repo's `.env`, so two terminals is the whole setup:

```bash
npm start               # terminal 1 — netlify dev: API on :8888, UI on :5173
npm run worker          # terminal 2 — the moderation worker on :8080
npm run worker nowait   # ...or with every interval collapsed to seconds, for testing
```

`nowait` drops the queue poll to 3s, the sweep to 5s and the encode retry to 15s, so a change
is visible immediately instead of after the production intervals (15s / 5 min / 10 min). It
is for testing only — those intervals exist so a worker is not hammering MongoDB and Bunny
for state that changes on the order of minutes.

To give the sweep something to find:

```bash
node scripts/mark-episode-pending.mjs "<series name>" [episodeNumber] --apply
```

`npm start` does **not** start the worker; they are deliberately separate processes, which is
what they are in production too.

There is no single command that runs both, on purpose. The obvious `worker & netlify dev`
composition does not clean up reliably — a `trap 'kill 0'` wrapper still left three stray
children in testing — and an orphaned worker is worse than an extra terminal: it keeps
claiming jobs from the shared database long after you think you stopped it. Two terminals
also keeps the worker's log readable, which is where you look when a scan misbehaves.

`WORKER_SHARED_SECRET`, `WORKER_URL=http://localhost:8080` and `API_URL=http://localhost:8888`
are already in `.env`, and locally both sides read that same file.

`npm run worker` sets `MODERATION_ENABLED=true` for you. `.env` has it `false` — correct for
the functions, which must never scan on upload again — and the worker reads that same file,
so without the override it would approve everything without checking.

Then, without uploading anything:

```bash
node scripts/test-moderation-job.mjs          # create a pending series, dispatch, watch
node scripts/test-moderation-job.mjs --keep   # leave it behind to inspect
```

```
job 6aa126f6… queued -> watching
  job=running by worker-94322  | series=pending  ep1=pending  ep2=pending  | shelved=true
  job=done    by worker-94322  progress=3/3 | series=approved ep1=approved ep2=approved | shelved=false
FINISHED
```

Its episodes have no `videoId`, which the pipeline treats as nothing to check — so it
exercises claim, lease, callbacks and verdict application without spending OpenAI credit or
waiting on Bunny. To exercise the checks themselves, upload a series through the UI instead.

To test the serverless side of the switch, stop the worker and set
`JOB_RUNTIME_MODERATE_UPLOAD=serverless`; the same script should behave identically.

If you would rather run the container locally (to test the image itself):

```bash
cp services/worker.env.example services/worker.env   # fill it in, MODERATION_ENABLED=true
cd services && API_URL=http://host.docker.internal:8888 docker-compose up --build
```

## Adding another service later

1. Add it to `JOB_DEFINITIONS` in `netlify/functions/utils/jobQueue.js`.
2. Add its handler to `HANDLED` in `services/moderation-worker/src/index.js` — or give it
   its own directory and its own compose entry if it should scale separately.
3. Call `dispatchJob('<name>', payload)` from wherever the work starts.

The queue, dispatch, leases, signing and callbacks are already generic.

## Deploying

One-time, on a fresh EC2 instance (Amazon Linux 2023, t3.small or larger — ffmpeg wants
memory):

```bash
sudo dnf install -y docker && sudo systemctl enable --now docker
sudo usermod -aG docker $USER          # then reconnect
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
     -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
mkdir -p ~/ganime/services
# copy services/worker.env.example to ~/ganime/services/worker.env and fill it in
```

Then, from a laptop, every deploy is:

```bash
./services/deploy.sh                   # WORKER_SSH_HOST from .env
```

Set `WORKER_SSH_HOST=ec2-user@<ip>` in `.env` (and `WORKER_SSH_KEY` if the key is not in your
agent). The script rsyncs `netlify/`, `services/` and the lockfiles, never `worker.env`, then
rebuilds and restarts on the instance and curls `/health`.

The image is verified: it builds, and a container running on `services/worker.env` alone
claims a job, reads the video, samples frames and records a verdict.

Two things the image has to do differently from a laptop, both of which failed before they
were fixed and would fail again if the Dockerfile is simplified:

- **It installs the distro `ffmpeg` and sets `FFMPEG_PATH`.** `ffmpeg-static`'s binary is
  statically linked and cannot use glibc name resolution inside a container: every remote
  read dies with `Failed to resolve hostname ...: System error`, while Node's own `fetch` to
  the same host succeeds. The symptom is subtle — frame extraction fails, the frame check
  finds nothing to check, and the video is approved having never been looked at.
- **`npm ci --ignore-scripts`.** The repo's `postinstall` is a Cordova/Android JDK patch that
  is meaningless here and fails outright, because its script is not in that build layer.

If you would rather not use Docker at all, systemd is a reasonable alternative:

```ini
# /etc/systemd/system/ganime-worker.service
[Unit]
Description=Ganime moderation worker
After=network-online.target

[Service]
WorkingDirectory=/home/ec2-user/ganime
EnvironmentFile=/home/ec2-user/ganime/services/worker.env
ExecStart=/usr/bin/node services/moderation-worker/src/index.js
Restart=always
RestartSec=10
# SIGTERM lets in-flight jobs drain; SIGKILL strands them for the lease duration.
KillSignal=SIGTERM
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ganime-worker && journalctl -u ganime-worker -f
```

That needs `npm ci --omit=dev` in `~/ganime` once, since it uses the host's node_modules
rather than the image's.

It rsyncs the repo (never `worker.env`), rebuilds the image on the instance, restarts with
`--remove-orphans`, and checks `/health`. Jobs already running finish first: the worker stops
claiming on SIGTERM and drains.

### Security group

Inbound 8080 should be reachable only by Netlify, or fronted by an ALB with TLS. The nudge
endpoint verifies its HMAC and is useless without the secret, but there is no reason to
expose it broadly. `/health` is unauthenticated by design.

### Environment

| Where | Variable | Purpose |
|---|---|---|
| Netlify | `WORKER_URL` | `http://<instance>:8080` — where to send nudges |
| Netlify | `WORKER_SHARED_SECRET` | must match the instance |
| Netlify | `JOB_RUNTIME_MODERATE_UPLOAD` | optional; `serverless` forces it back off the server |
| Instance | `API_URL` | `https://ganime.io` — where callbacks go |
| Instance | `WORKER_SHARED_SECRET` | must match Netlify |
| Instance | `MODERATION_ENABLED=true` | **on here**, even though it is off in Netlify |
| Instance | `MONGODB_URI` | connection string |
| Instance | `VITE_APP_DISPLAY_NAME` | **the database name.** `db.js` lowercases this; it does not read the database out of the URI. Miss it and nothing connects |
| Instance | `NODE_ENV` | `production` -> `ganime`, `qa` -> `ganime-qa` |
| Instance | `OPENAI_API_KEY` | Whisper + moderation |
| Instance | `BUNNY_API_KEY`, `VITE_BUNNY_LIBRARY_ID`, `BUNNY_PULL_ZONE`, `BUNNY_TOKEN_KEY`, `VITE_VIDEO_STORAGE` | reading the video, uploading captions |
| Instance | `FFMPEG_THREADS` | see Sizing below |

`services/worker.env.example` lists exactly these, and no more: a worker started with only
those variables connects and polls cleanly. Email credentials are deliberately absent — the
worker never sends mail, it calls back to the API, which does.

Optional tunables, all with sensible defaults: `WORKER_CONCURRENCY`, `WORKER_POLL_MS`,
`WORKER_SWEEP_MS`, `ENCODE_RETRY_MS`, `JOB_LEASE_MS`, `SUBTITLE_BACKFILL_PER_RUN`,
`MODERATION_EPISODE_TIMEOUT_MS`.

`MODERATION_ENABLED` stays `false` in Netlify: the serverless path must not start scanning
uploads again. It is `true` on the instance, which is the whole point of the instance.

## Sizing: concurrency and ffmpeg threads

A moderation job alternates between saturating the CPU (ffmpeg decoding the episode and
seeking out one frame every 5-15 seconds) and sitting idle waiting on OpenAI (Whisper, then
a vision call per five frames). That idle time is the whole argument for running more than
one job at once.

The catch is that ffmpeg defaults to using **every core**, so uncapped, one job owns the
instance and the others merely contend with it. `FFMPEG_THREADS` fixes that. Measured on a
10-core machine, three 1080p decode passes:

| `-threads` | wall | CPU | cores busy |
|---|---|---|---|
| auto | 3.50s | 19.5s | 5.6 |
| 1 | 15.20s | 14.9s | 1.0 |
| 2 | 8.24s | 15.5s | 1.9 |
| 4 | 4.43s | 15.9s | 3.6 |

Total CPU is roughly flat, so capping does not waste work — it spreads it. `auto` actually
burns about 25% *more* CPU on threading overhead. So N capped jobs in parallel deliver the
same throughput as one uncapped job, with the difference that no single job can monopolise
the box and job latency stays predictable.

**The rule:** `FFMPEG_THREADS × WORKER_CONCURRENCY ≤ vCPUs`.

| Instance | vCPU | `FFMPEG_THREADS` | `WORKER_CONCURRENCY` |
|---|---|---|---|
| t3.small | 2 | 2 | 1 |
| t3.large | 2 | 1 | 2 |
| c6i.xlarge | 4 | 2 | 2 |
| c6i.2xlarge | 8 | 2 | 4 |

Raise it one step at a time and watch CPU utilisation during a real scan: under ~60% with
jobs still queued means you are waiting on the network and another worker will help; pinned
at 100% means another worker will only make everything slower.

`FFMPEG_THREADS` is unset outside the worker, so the Netlify functions keep using every core
— correct there, since one invocation has the machine to itself.

**Check your OpenAI rate limits before raising concurrency at all.** A 10-minute episode is
roughly 60 frame extractions and 12 vision calls, plus a Whisper transcription; across
several concurrent jobs that ceiling is often lower than the hardware one, and hitting it
produces 429s that fail a scan rather than latency that merely slows it.

## Reading the log

Every line is timestamped, and each job reports where its wall-clock went:

```
13:11:53.818 [worker] polling the job queue every 15000ms · concurrency 1 · ffmpeg threads 2
13:12:24.010 [worker] start moderateUpload 6ff18b00  (1/1 slots busy)
13:12:25.102 [series 6aa1bda7] 1/3 series text -> approved in 1.1s
13:12:25.264 [series 6aa1bda7] 2/3 episode 1 -> approved in 0.9s
13:12:25.412 [series 6aa1bda7] 3/3 episode 2 -> approved in 0.1s
13:12:25.507 [series 6aa1bda7] all 3 item(s) decided — 1.5s total — cpu 0% / idle 71% / other 29%
13:12:25.546 [worker] done moderateUpload 6ff18b00 — 1.5s total — cpu 26% / idle 69% / other 5%  (ffmpeg x63, api x14)
```

Each video's own verdict carries the same breakdown plus a phase split:

```
13:12:41.220 [moderate 42fb3c86] APPROVED
13:12:41.220   14.8s total — cpu 31% / idle 63% / other 6%  (ffmpeg x63, api x14)
13:12:41.221   phases: transcribe 8.1s · moderate text 0.9s · moderate frames 5.8s
```

The three buckets:

| | |
|---|---|
| **cpu** | ffmpeg — decoding, seeking, extracting frames. Work this process is doing. |
| **idle** | blocked on someone else's server (Whisper, moderation API, Bunny). The CPU was free. |
| **other** | our own JS, MongoDB, and the poll-wait between Bunny readiness checks. |

**Idle is the sizing number.** It is the share of the job during which a core sat available,
so a consistently high idle percentage means another concurrent job could have used it and
`WORKER_CONCURRENCY` should go up. A low one means the box is already working and another
worker would only contend. Read it together with the `ffmpeg x` / `api x` call counts: many
ffmpeg calls with low idle is a CPU-bound run, and only a bigger instance (or a lower
`FFMPEG_THREADS` with higher concurrency) will help.

Timings are per job even when several run at once — each gets its own AsyncLocalStorage
context, so concurrent jobs never blend their numbers.

## Health

```bash
curl http://<instance>:8080/health
# {"ok":true,"runner":"...","active":0,"handles":["moderateUpload"]}
```

Queue state lives in the `jobs` collection: `status`, `attempts`, `leaseUntil`, `error`.

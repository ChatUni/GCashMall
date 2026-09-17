# Installing the Ganime moderation worker on EC2

For whoever runs the instance. It covers the box and the service only — the application side
is configured by the Ganime team, who will hand you the values in step 3.

## What this service does

It watches a queue in MongoDB for moderation jobs. For each one it reads the episode's video
from Bunny, transcribes it, checks the transcript and a sample of frames, and reports the
verdict back to the Ganime API. It serves no user traffic and holds no state of its own: if
the instance is rebuilt, nothing is lost, and jobs it did not finish are picked up again
automatically once it is running.

It needs outbound internet (MongoDB Atlas, OpenAI, Bunny) and one inbound port.

## 1. The instance

| | |
|---|---|
| AMI | Amazon Linux 2023 |
| Type | **t3.medium or larger** — `t3.small` has the same 2 vCPUs but half the RAM (2 GB), which the OS, Node and ffmpeg leave too little of |
| Disk | 20 GB is plenty; video is streamed from Bunny, never downloaded — only sampled frames and one audio track hit `/tmp`, and both are deleted after each job |
| Outbound | unrestricted (MongoDB Atlas, api.openai.com, Bunny) |
| Inbound | TCP **8080**, restricted to the Ganime site's egress, plus SSH for you |

Port 8080 serves two endpoints: `/health`, which is unauthenticated and safe to expose, and
`/jobs`, which verifies a signature and is useless without the shared secret. Neither is a
reason to open 8080 to the world — put it behind a security group or an ALB.

## 2. Docker

```bash
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER          # log out and back in for this to take effect
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
     -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
```

Confirm with `docker ps` (no sudo) and `docker-compose version` before continuing.

Amazon Linux 2023 ships Docker already installed on some AMIs — `dnf` will say so and the
install is still correct to run.

Two things the AMI does not set up, both worth doing before the first job:

```bash
# 2 GB of swap. AL2023 has none. Headroom so an ffmpeg spike cannot get the worker
# OOM-killed, which would strand the job it had claimed for the full 30-minute lease.
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Cap container logs. Unset, json-file logs grow until the disk is full.
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "50m", "max-file": "3" } }
EOF
sudo systemctl restart docker
```

`free -m` should then show a 2047 MB swap, and the log settings apply to containers created
after the restart — which is all of them, since the worker is not running yet.

## 3. The code and the configuration

Get the repository onto the instance at `~/ganime` — either clone it (you will need read
access to `github.com/ChatUni/GCashMall`) or have the team push it to you with
`services/deploy.sh`.

```bash
git clone https://github.com/ChatUni/GCashMall.git ~/ganime
cd ~/ganime
cp services/worker.env.example services/worker.env
```

Now fill in `services/worker.env`. **Every value comes from the Ganime team** — none of it is
generated here. Ask for all of these:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `VITE_APP_DISPLAY_NAME` | the **database name** (`Ganime`). Not read from the URI — without it nothing connects |
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | transcription and content checks |
| `BUNNY_API_KEY`, `VITE_BUNNY_LIBRARY_ID`, `BUNNY_PULL_ZONE`, `BUNNY_TOKEN_KEY` | reading video, uploading subtitles |
| `VITE_VIDEO_STORAGE` | `s1` |
| `API_URL` | where verdicts are sent, e.g. `https://ganime.io` |
| `WORKER_SHARED_SECRET` | signs the link in both directions; must match what the team set on their side |
| `MODERATION_ENABLED` | `true` — the service does nothing useful without it |
| `FFMPEG_THREADS` | `2` (see Sizing) |

`worker.env` holds live credentials. It is excluded from deploys so it is never overwritten,
and it must never be committed.

## 4. Start it

```bash
cd ~/ganime/services
docker-compose up -d --build
```

The first build takes a few minutes. Then:

```bash
curl http://127.0.0.1:8080/health
# {"ok":true,"runner":"...","active":0,"handles":["moderateUpload"]}
docker-compose logs -f moderation-worker
```

A healthy idle service logs its startup line and then stays quiet. It is not broken for being
silent — it only speaks when there is work.

## 5. Day to day

```bash
cd ~/ganime/services
docker-compose logs -f moderation-worker      # follow
docker-compose restart moderation-worker      # restart
docker-compose down                           # stop
docker-compose up -d --build                  # apply an update after the code changes
```

**Always stop it with `docker-compose stop` or `restart`, never `kill -9`.** On a normal stop
it finishes the job in flight; killed outright, that job stays claimed and cannot be retried
for up to 30 minutes.

To update: pull (or receive) the new code, then `docker-compose up -d --build`.

## Sizing

A job alternates between saturating a core (ffmpeg decoding and extracting frames) and waiting
on OpenAI. `FFMPEG_THREADS` caps one job's CPU use; `WORKER_CONCURRENCY` sets how many run at
once. Keep their product at or below the vCPU count:

| Instance | vCPU | `FFMPEG_THREADS` | `WORKER_CONCURRENCY` |
|---|---|---|---|
| t3.medium | 2 | 2 | 1 |
| c6i.xlarge | 4 | 2 | 2 |
| c6i.2xlarge | 8 | 2 | 4 |

Raise concurrency one step at a time and watch CPU during a real scan: consistently under
~60% with jobs still queued means another worker would help; pinned at 100% means it would
not. Check with the team before raising it — their OpenAI rate limit may bind before the
hardware does, and hitting it produces errors rather than slowness.

## If something is wrong

**`VITE_APP_DISPLAY_NAME is not set — it is the database name`** — exactly what it says. It is
the database name, not the app's title, and it is not taken from the connection string.

**`Failed to connect to MongoDB`** — check the URI, and that the instance's public IP is
allowed in the MongoDB Atlas network access list.

**Health endpoint answers but nothing is ever processed** — normal when there is no work. Ask
the team whether anything is queued before investigating.

**`EADDRINUSE :::8080`** — an older container is still running. `docker-compose down`, then up.

**Frame checks find nothing / every video is approved instantly** — the image must use the
distro ffmpeg, which it installs and points `FFMPEG_PATH` at. The bundled static binary cannot
resolve hostnames inside a container, and the failure is silent: extraction fails, there are no
frames to check, and videos pass unexamined. If the Dockerfile has been edited, restore those
two lines.

## What to hand back to the team

If you need to escalate, include:

```bash
curl -s http://127.0.0.1:8080/health
docker-compose logs --tail 200 moderation-worker
```

The logs contain no credentials — they carry timestamps, series and episode names, and timing
breakdowns.

// Per-job timing, so a run can say where its wall-clock actually went.
//
// The number that matters for sizing is IDLE: the share of a job spent waiting on someone
// else's server (Whisper, the moderation API, Bunny) rather than using the CPU. High idle
// means another concurrent job could have used those cores and WORKER_CONCURRENCY should go
// up; low idle means the box is already busy and another worker would only contend.
//
// Jobs run concurrently, so the accumulators cannot be module-level counters — they would
// blend. AsyncLocalStorage gives each job its own context automatically, through every await
// in its call tree, without threading a parameter through the whole pipeline.
//
//   cpu     ffmpeg: decoding, seeking, extracting
//   api     remote calls we are blocked on (OpenAI, Bunny)
//   other   the remainder — our own JS, MongoDB, polling sleeps
//
// `other` includes the poll-wait between Bunny readiness checks, which is idle in the plain
// sense but is not time another job could reclaim from us, so it is reported separately
// rather than folded into either.

import { AsyncLocalStorage } from 'async_hooks'

const storage = new AsyncLocalStorage()

const newContext = (label) => ({
  label,
  startedAt: Date.now(),
  cpu: 0,
  api: 0,
  calls: { cpu: 0, api: 0 },
  marks: [],
})

// Run `fn` with its own timing context. Nested contexts are independent: an episode's timings
// roll up into the job's because both wrap the same awaits, so each is measured in full.
export const withTiming = (label, fn) => storage.run(newContext(label), fn)

// Time one awaited operation into a bucket. A no-op (beyond running fn) outside a context, so
// the same instrumented code is safe in a Netlify function that never calls withTiming.
export const track = async (bucket, fn) => {
  const ctx = storage.getStore()
  if (!ctx) return fn()
  const started = Date.now()
  try {
    return await fn()
  } finally {
    ctx[bucket] += Date.now() - started
    ctx.calls[bucket] += 1
  }
}

// Note a named moment, for a phase-by-phase breakdown.
export const mark = (name) => {
  const ctx = storage.getStore()
  if (!ctx) return
  ctx.marks.push({ name, at: Date.now() })
}

export const timing = () => {
  const ctx = storage.getStore()
  if (!ctx) return null
  const total = Date.now() - ctx.startedAt
  const other = Math.max(0, total - ctx.cpu - ctx.api)
  return {
    label: ctx.label,
    totalMs: total,
    cpuMs: ctx.cpu,
    apiMs: ctx.api,
    otherMs: other,
    calls: { ...ctx.calls },
    // Idle: waiting on a remote server, so the CPU was free for another job.
    idlePct: total > 0 ? Math.round((ctx.api / total) * 100) : 0,
    busyPct: total > 0 ? Math.round((ctx.cpu / total) * 100) : 0,
    phases: phaseDurations(ctx),
  }
}

const phaseDurations = (ctx) => {
  const out = []
  for (let i = 0; i < ctx.marks.length; i += 1) {
    const end = i + 1 < ctx.marks.length ? ctx.marks[i + 1].at : Date.now()
    out.push({ name: ctx.marks[i].name, ms: end - ctx.marks[i].at })
  }
  return out
}

export const fmtMs = (ms) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`)

// "12.4s total — cpu 41% / idle 52% / other 7%  (ffmpeg x63, api x14)"
export const summarize = (t) =>
  t
    ? `${fmtMs(t.totalMs)} total — cpu ${t.busyPct}% / idle ${t.idlePct}% / other ${100 - t.busyPct - t.idlePct}%` +
      `  (ffmpeg x${t.calls.cpu}, api x${t.calls.api})`
    : 'no timing'

// HH:MM:SS.mmm — every log line carries one, so a slow phase is obvious in the log itself.
export const ts = () => {
  const d = new Date()
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

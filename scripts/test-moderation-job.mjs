// Local end-to-end test for the auto-moderation job.
//
// Creates a throwaway pending series, dispatches the job exactly as an upload would, then
// watches until the verdicts land — so you can see the whole serverless -> worker -> callback
// loop without uploading anything or waiting on Bunny.
//
// By default the episodes carry no video, so the pipeline leaves them pending (a videoless
// episode is unfinished, not approvable) and the verdict you see is the series TEXT being
// checked. That is still enough to exercise the whole loop — dispatch, claim, lease, the
// progress callback and verdict application — without depending on a real encoded video.
//
// Pass --video <bunnyId> to attach a real video to episode 1 and exercise the video checks
// too: transcription, then frame extraction and the vision calls.
//
//   node scripts/test-moderation-job.mjs                    # plumbing only
//   node scripts/test-moderation-job.mjs --video <bunnyId>  # plus the real checks
//   node scripts/test-moderation-job.mjs --keep             # leave the series behind
//
// Needs: netlify dev on :8888, plus the worker running (or JOB_RUNTIME_MODERATE_UPLOAD=serverless).

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
for (const l of readFileSync(`${REPO}/.env`, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { ObjectId } = createRequire(`${REPO}/netlify/functions/utils/x.js`)('mongodb')
const { get, save, remove, connectDB } = await import(`${REPO}/netlify/functions/utils/db.js`)
const { dispatchJob } = await import(`${REPO}/netlify/functions/utils/jobDispatch.js`)
const { runtimeFor } = await import(`${REPO}/netlify/functions/utils/jobQueue.js`)

const keep = process.argv.includes('--keep')
const videoArg = process.argv.indexOf('--video')
const videoId = videoArg >= 0 ? process.argv[videoArg + 1] || '' : ''
const uid = new ObjectId()
const sid = new ObjectId()
const pending = () => ({ status: 'pending', reason: '', reviewedAt: null, reviewedBy: null, pending: null })

const main = async () => {
  await save('users', { _id: uid, email: `modtest-${Date.now()}@example.test`, nickname: 'Moderation Test' })
  await save('series', {
    _id: sid,
    name: 'Moderation Test Series',
    description: 'A calm documentary about sourdough starters.',
    uploaderId: uid,
    shelved: true,
    tags: [],
    genre: [],
    moderation: pending(),
    episodes: [1, 2].map((n) => ({
      episodeNumber: n,
      title: `Episode ${n}`,
      videoId: n === 1 ? videoId : '',
      moderation: pending(),
    })),
  })

  console.log(`series ${sid}  (2 episodes, all pending)`)
  console.log(
    videoId
      ? `  episode 1 -> video ${videoId}; the real checks will run on it`
      : '  no --video given: episodes stay pending (unfinished), only the series text is judged',
  )
  console.log(`runtime for moderateUpload: ${runtimeFor('moderateUpload')}`)
  console.log(`  WORKER_URL=${process.env.WORKER_URL || '(unset)'}   API_URL=${process.env.API_URL || '(unset)'}`)

  const job = await dispatchJob('moderateUpload', { seriesId: String(sid), userId: String(uid) }, {
    key: `modtest:${sid}`,
  })
  console.log(`\njob ${job._id} queued -> watching\n`)

  const db = await connectDB()
  let last = ''
  for (let i = 0; i < 90; i += 1) {
    const j = await db.collection('jobs').findOne({ _id: job._id })
    const s = (await get('series', { _id: sid }, {}, {}, 1))[0]
    const line =
      `job=${j?.status}${j?.claimedBy ? ` by ${j.claimedBy}` : ''} ` +
      `progress=${j?.progress ? `${j.progress.episodesDone}/${j.progress.episodesTotal}` : '-'} | ` +
      `series=${s.moderation.status} ` +
      s.episodes.map((e) => `ep${e.episodeNumber}=${e.moderation.status}`).join(' ') +
      ` | shelved=${s.shelved}`
    if (line !== last) {
      console.log(`  ${new Date().toLocaleTimeString()}  ${line}`)
      last = line
    }
    if (j?.status === 'done' || j?.status === 'failed') {
      console.log(`\n${j.status === 'done' ? 'FINISHED' : `FAILED: ${j.error}`}`)
      break
    }
    await new Promise((r) => setTimeout(r, 2000))
  }

  if (keep) {
    console.log(`\nleft behind: series ${sid}, user ${uid}`)
  } else {
    await db.collection('jobs').deleteOne({ _id: job._id })
    await remove('series', { _id: sid })
    await remove('users', { _id: uid })
    console.log('\ncleaned up')
  }
}

main()
  .catch(async (e) => {
    console.error('FAILED:', e.message)
    await remove('series', { _id: sid }).catch(() => {})
    await remove('users', { _id: uid }).catch(() => {})
  })
  .finally(() => process.exit(0))

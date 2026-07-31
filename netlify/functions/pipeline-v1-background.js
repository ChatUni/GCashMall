// Netlify Background Function: Quick Create V1 generation (up to 15 minutes).
// Three modes, all writing progress/results into a `productions` job doc (v: 1):
//
//  • mode 'proposal' — run Call 1 (Executive Producer) → Production Proposal for Page 2.
//  • mode 'edit'     — AI Edit Assistant: apply a natural-language instruction to the
//                      proposal, changing only the affected section, preserving the rest.
//  • mode 'produce'  — after Approve: run Calls 2, 3, 4A‖4B, 5, then the Call 6 renderer
//                      adapter, then hand off to the shared video/composition chain.
//
// Background functions respond 202 immediately; the client polls the job document.

import { get, save, update } from './utils/db.js'
import jwt from 'jsonwebtoken'
import { runV1Call, V1_CALL_KEYS } from './utils/pipelineV1.js'
import { callOpenAIChatJson } from './utils/pipeline.js'
import { buildV1RenderStructures } from './utils/renderV1.js'
import { triggerBackground } from './utils/trigger.js'
import { modelHasNativeAudio } from './utils/seedance.js'

const JWT_SECRET = process.env.JWT_SECRET || 'gcashmall-secret-key'

const getUserId = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }
  return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET).id
}

const updateJob = (jobId, fields) =>
  update('productions', { jobId }, { $set: { ...fields, updatedAt: new Date() } })

const percentOf = (progress) => {
  const steps = progress.calls || []
  const done = steps.filter((c) => c.status === 'done').length
  return steps.length ? Math.round((done / steps.length) * 100) : 0
}

// ── Proposal mode: Call 1 only ──
const runProposal = async (jobId, userId, body) => {
  const existing = await get('productions', { jobId }, {}, {}, 1)
  const fields = {
    userId,
    v: 1,
    mode: 'v1proposal',
    status: 'running',
    error: '',
    proposal: null,
    idea: body.idea || '',
    episodeLength: 30,
    updatedAt: new Date(),
  }
  if (existing && existing.length > 0) await updateJob(jobId, fields)
  else await save('productions', { jobId, ...fields, createdAt: new Date() })

  const call1 = await runV1Call('executiveProducer', { creatorIdea: body.idea || '' })
  await updateJob(jobId, {
    proposal: call1,
    ideaTitle: call1?.project?.title || 'Untitled Series',
    title: call1?.project?.title || 'Untitled Series',
    status: 'done',
  })
}

// ── Edit mode: AI Edit Assistant regenerates only the affected section ──
const EDIT_SYSTEM_PROMPT =
  'You are the Executive Producer of Ganime editing an existing anime Production Proposal. ' +
  'You receive the current proposal JSON and a creator instruction. Apply the instruction, ' +
  'changing ONLY the sections the instruction affects and preserving everything else exactly ' +
  'as-is (same field values, same wording where untouched). Keep the SAME JSON schema and keep ' +
  'every array fully populated — never drop characters, episodes, or notes that already exist. ' +
  'Return the COMPLETE updated proposal as a single JSON object. Return ONLY valid JSON, no ' +
  'markdown, no commentary.'

const runEdit = async (jobId, userId, body) => {
  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error('production not found')
  if (String(docs[0].userId) !== String(userId)) throw new Error('not authorized')

  const proposal = body.proposal || docs[0].proposal || {}
  const instruction = body.instruction || ''
  await updateJob(jobId, { editResult: { id: body.reqId || '', status: 'running' } })

  const updated = await callOpenAIChatJson(
    EDIT_SYSTEM_PROMPT,
    JSON.stringify({ currentProposal: proposal, instruction }),
  )
  await updateJob(jobId, {
    proposal: updated,
    ideaTitle: updated?.project?.title || docs[0].ideaTitle,
    title: updated?.project?.title || docs[0].title,
    editResult: { id: body.reqId || '', status: 'done' },
  })
}

// ── Produce mode: Calls 2–5 + Call 6 adapter, then hand off to the render chain ──
const runProduce = async (jobId, userId, body) => {
  const docs = await get('productions', { jobId }, {}, {}, 1)
  const proposal = body.proposal || docs?.[0]?.proposal || {}
  const seriesTitle = proposal?.project?.title || 'Untitled Series'
  // Which episode to produce (default 1). Follow-up episodes reuse the parent's Character
  // Bible (pre-seeded on the doc) so characters stay consistent across the series.
  const episode = Number(body.episode || docs?.[0]?.episode || 1)
  const reusedBible = docs?.[0]?.callsV1?.characterDirector
  const episodeBrief = (proposal?.seasonRoadmap || [])[episode - 1] || {}

  const progress = {
    calls: [
      { key: 'executiveProducer', status: 'done' },
      { key: 'characterDirector', status: 'pending' },
      { key: 'episodeDirector', status: 'pending' },
      { key: 'visualAssetDirector', status: 'pending' },
      { key: 'audioDirector', status: 'pending' },
      { key: 'episodeProducer', status: 'pending' },
      { key: 'videoGeneration', status: 'pending' },
      ...(modelHasNativeAudio() ? [] : [{ key: 'audioGeneration', status: 'pending' }]),
      { key: 'composition', status: 'pending' },
    ],
    coverStatus: 'done',
  }
  // Reused character bible → mark that stage already done.
  if (reusedBible) {
    const c = progress.calls.find((x) => x.key === 'characterDirector')
    if (c) c.status = 'done'
  }
  const fields = {
    userId,
    v: 1,
    mode: 'v1produce',
    episode,
    status: 'running',
    error: '',
    title: seriesTitle,
    ideaTitle: seriesTitle,
    cover: '',
    episodeLength: 30,
    percent: percentOf(progress),
    progress,
    proposal,
  }
  if (docs && docs.length > 0) await updateJob(jobId, fields)
  else await save('productions', { jobId, ...fields, createdAt: new Date() })

  const setCall = async (key, status) => {
    const c = progress.calls.find((x) => x.key === key)
    if (c) c.status = status
    await updateJob(jobId, { progress, percent: percentOf(progress) })
  }

  const callsV1 = {}

  // Call 2 — Character Director (reuse the parent's bible for follow-up episodes)
  if (reusedBible) {
    callsV1.characterDirector = reusedBible
  } else {
    await setCall('characterDirector', 'running')
    callsV1.characterDirector = await runV1Call('characterDirector', { productionProposal: proposal })
    await setCall('characterDirector', 'done')
  }
  await updateJob(jobId, { callsV1 })

  // Call 3 — Episode Director (plans the target episode)
  await setCall('episodeDirector', 'running')
  callsV1.episodeDirector = await runV1Call('episodeDirector', {
    productionProposal: proposal,
    characterBible: callsV1.characterDirector,
    targetEpisode: episode,
    episodeBrief,
  })
  await setCall('episodeDirector', 'done')
  await updateJob(jobId, { callsV1 })

  const episodePlan = callsV1.episodeDirector?.episodePlan || {}
  // Key Moments for the Ready page, derived from the ACTUAL generated episode's shots
  // (the proposal roadmap only fills keyMoments for episode 1).
  const keyMoments = (episodePlan.shots || [])
    .map((sh) => sh.title || sh.summary || sh.action)
    .filter(Boolean)
  await updateJob(jobId, { keyMoments })

  // Calls 4A ‖ 4B — Visual Asset Director and Audio Director run in parallel
  await setCall('visualAssetDirector', 'running')
  await setCall('audioDirector', 'running')
  const [visual, audio] = await Promise.all([
    runV1Call('visualAssetDirector', {
      productionProposal: proposal,
      characterBible: callsV1.characterDirector,
      episodePlan,
      visualAssetLibrary: {},
    }),
    runV1Call('audioDirector', {
      characterBible: callsV1.characterDirector,
      episodePlan,
    }),
  ])
  callsV1.visualAssetDirector = visual
  callsV1.audioDirector = audio
  await setCall('visualAssetDirector', 'done')
  await setCall('audioDirector', 'done')
  await updateJob(jobId, { callsV1 })

  // Call 5 — Episode Producer (assemble immutable Episode Production Package)
  await setCall('episodeProducer', 'running')
  callsV1.episodeProducer = await runV1Call('episodeProducer', {
    episodePlan,
    visualAssetPackage: callsV1.visualAssetDirector?.visualAssetPackage || {},
    audioProductionSpecification: callsV1.audioDirector?.audioProductionSpecification || {},
  })
  await setCall('episodeProducer', 'done')

  // Call 6 — Renderer adapter: translate the package into v0 render structures.
  const calls = buildV1RenderStructures(callsV1, proposal)
  await updateJob(jobId, { callsV1, calls, percent: percentOf(progress) })
}

export const handler = async (event) => {
  let jobId
  try {
    const body = JSON.parse(event.body || '{}')
    jobId = body.jobId
    if (!jobId) return { statusCode: 400 }

    const authHeader = event.headers?.authorization || event.headers?.Authorization
    const userId = getUserId(authHeader)

    if (body.mode === 'proposal') {
      await runProposal(jobId, userId, body)
    } else if (body.mode === 'edit') {
      await runEdit(jobId, userId, body)
    } else if (body.mode === 'produce') {
      await runProduce(jobId, userId, body)
      // Hand video generation off to its own 15-minute budget (reuses the v0 chain).
      try {
        await triggerBackground('pipeline-video-background', jobId, authHeader)
      } catch (error) {
        console.error('V1 video hand-off failed:', error.message)
        await updateJob(jobId, { status: 'error', error: String(error.message || error) })
      }
    }
    return { statusCode: 200 }
  } catch (error) {
    console.error('pipeline-v1-background error:', error)
    if (jobId) {
      try {
        const docs = await get('productions', { jobId }, {}, {}, 1)
        const progress = docs?.[0]?.progress
        if (progress) {
          const running = (progress.calls || []).find((c) => c.status === 'running')
          if (running) running.status = 'error'
        }
        await updateJob(jobId, {
          status: 'error',
          error: String(error.message || error),
          ...(progress ? { progress } : {}),
        })
      } catch (e) {
        console.error('Failed to mark v1 job errored:', e.message)
      }
    }
    return { statusCode: 500 }
  }
}

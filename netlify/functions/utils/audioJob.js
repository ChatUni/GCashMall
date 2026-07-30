// Audio + composition runner. For a production whose shots already rendered (silent
// Seedance videos), it: generates a short voiceover line per shot, synthesizes it
// with OpenAI TTS, muxes it (+ optional background music) onto each shot video, and
// concatenates the shots into a single episode video — uploading everything to
// Cloudinary and writing the URLs back to the production job document.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { get, update } from './db.js'
import { v2 as cloudinary } from 'cloudinary'
import { synthesizeSpeech } from './tts.js'
import { muxAudioOntoVideo, concatVideos } from './ffmpeg.js'
import { callOpenAIChatJson } from './pipeline.js'
import { modelHasNativeAudio } from './seedance.js'
import { isS1, uploadEpisodeToBunny, bunnyEmbedUrl, setBunnyThumbnail } from './bunny.js'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

const updateJob = (jobId, fields) =>
  update('productions', { jobId }, { $set: { ...fields, updatedAt: new Date() } })

const percentOf = (progress) => {
  const steps = progress.calls || []
  const done = steps.filter((c) => c.status === 'done').length
  return steps.length ? Math.round((done / steps.length) * 100) : 0
}

const downloadTo = async (url, dest) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed (${res.status})`)
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

const uploadVideo = async (filePath) => {
  const up = await cloudinary.uploader.upload(filePath, {
    resource_type: 'video',
    folder: 'GCash/quick create/episode',
  })
  return up.secure_url
}

const NARRATION_INSTRUCTION =
  'You are writing cinematic voiceover narration for a short anime episode. Given the episode title and an ordered list of shots (each with story context and emotion), write ONE vivid narration sentence per shot — max ~18 words each — that together read as a single continuous voiceover in order. Return JSON only: {"lines": ["...", ...]} with exactly one line per shot, in the same order.'

const generateNarration = async (episodeTitle, shots) => {
  const input = {
    episode_title: episodeTitle,
    shots: shots.map((s, i) => ({
      shot: i + 1,
      context: s.story_context || s.shot_purpose || s.action_prompt || '',
      emotion: s.emotion || '',
    })),
  }
  try {
    const out = await callOpenAIChatJson(NARRATION_INSTRUCTION, JSON.stringify(input))
    return Array.isArray(out.lines) ? out.lines : []
  } catch (error) {
    console.error('Narration generation failed:', error.message)
    return []
  }
}

export const runAudioComposition = async (jobId, userId) => {
  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error('production not found')
  const doc = docs[0]
  if (userId && String(doc.userId) !== String(userId)) {
    throw new Error('not authorized for this production')
  }

  const progress = doc.progress || { calls: [] }
  const ensureStep = (key) => {
    let i = (progress.calls || []).findIndex((c) => c.key === key)
    if (i < 0) {
      progress.calls = [...(progress.calls || []), { key, status: 'pending' }]
      i = progress.calls.length - 1
    }
    return i
  }
  // Seedance 2.0 shots already carry synchronized audio — skip the audio-generation
  // step entirely and only stitch the shots.
  const nativeAudio = modelHasNativeAudio()
  const agIdx = nativeAudio ? -1 : ensureStep('audioGeneration')
  const cIdx = ensureStep('composition')

  const videos = (doc.videos || [])
    .filter((v) => v.url)
    .sort((a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0))

  if (agIdx >= 0) progress.calls[agIdx].status = 'running'
  else progress.calls[cIdx].status = 'running'
  await updateJob(jobId, { status: 'running', progress, percent: percentOf(progress) })

  if (videos.length === 0) {
    // Nothing rendered — finish
    if (agIdx >= 0) progress.calls[agIdx].status = 'done'
    progress.calls[cIdx].status = 'done'
    await updateJob(jobId, { progress, status: 'done', percent: 100 })
    return
  }

  // Voiceover text per shot (only when we synthesize audio ourselves)
  const shotPrompts =
    doc.calls?.promptCompiler?.universal_production_prompt_package?.shot_prompts || []
  const byId = new Map(shotPrompts.map((s) => [s.shot_id, s]))
  const shotsCtx = videos.map((v) => byId.get(v.shot_id) || {})
  const episodeTitle =
    doc.calls?.aiDirector?.episode_blueprint?.episode_title || doc.ideaTitle || 'Episode 1'
  // Only (re)generate narration if we do our own audio and some shot still needs it
  const needsWork = !nativeAudio && videos.some((v) => !v.audioUrl)
  const lines = needsWork ? await generateNarration(episodeTitle, shotsCtx) : []

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganime-'))
  try {
    // Optional background music (a stock/looping track URL); off unless configured
    let bgmPath
    const bgmUrl = process.env.EPISODE_BGM_URL
    if (bgmUrl) {
      bgmPath = path.join(tmp, 'bgm.mp3')
      try {
        await downloadTo(bgmUrl, bgmPath)
      } catch {
        bgmPath = undefined
      }
    }

    const composedPaths = []
    let composedCount = 0
    let firstError = ''
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i]
      const vPath = path.join(tmp, `shot${i}.mp4`)
      const nPath = path.join(tmp, `nar${i}.mp3`)
      const oPath = path.join(tmp, `out${i}.mp4`)

      // Seedance 2.0: the shot already has synchronized audio — just fetch it for the stitch
      if (nativeAudio) {
        try {
          await downloadTo(v.url, oPath)
          composedPaths.push(oPath)
          composedCount++
        } catch (error) {
          v.audioError = `download: ${error.message}`
          firstError ||= v.audioError
        }
        continue
      }

      // Reuse a shot already composed with audio (skip TTS/mux); just fetch it for the stitch
      if (v.audioUrl) {
        try {
          await downloadTo(v.audioUrl, oPath)
          composedPaths.push(oPath)
          composedCount++
          continue
        } catch {
          // fall through and recompose
        }
      }

      try {
        await downloadTo(v.url, vPath)
      } catch (error) {
        v.audioError = `download: ${error.message}`
        firstError ||= v.audioError
        continue
      }

      const line = (lines[i] || '').trim()
      let narrationPath
      if (line) {
        try {
          fs.writeFileSync(nPath, await synthesizeSpeech(line))
          narrationPath = nPath
        } catch (error) {
          v.audioError = `tts: ${error.message}`
          firstError ||= v.audioError
        }
      }

      try {
        await muxAudioOntoVideo({ videoPath: vPath, narrationPath, bgmPath, outPath: oPath })
        v.audioUrl = await uploadVideo(oPath)
        v.narration = line
        v.audioError = undefined
        composedPaths.push(oPath)
        composedCount++
      } catch (error) {
        v.audioError = `mux: ${error.message}`
        firstError ||= v.audioError
        composedPaths.push(vPath) // fall back to the silent shot in the concat
      }
      await updateJob(jobId, { videos: doc.videos })
    }

    // Per-shot audio is done (or errored if nothing composed); composition is next
    if (agIdx >= 0) progress.calls[agIdx].status = composedCount > 0 ? 'done' : 'error'
    progress.calls[cIdx].status = 'running'
    await updateJob(jobId, { progress, videos: doc.videos, percent: percentOf(progress) })

    // Stitch all shots into one episode video, then store it. s0 → Cloudinary mp4;
    // s1 → Bunny (episodeVideo holds the Bunny embed URL for playback).
    let episodeVideo = ''
    let episodeBunnyVideoId = ''
    let compositionError = ''
    if (composedPaths.length > 0) {
      const listPath = path.join(tmp, 'list.txt')
      const epPath = path.join(tmp, 'episode.mp4')
      try {
        await concatVideos({ paths: composedPaths, listPath, outPath: epPath })
        if (isS1()) {
          episodeBunnyVideoId = await uploadEpisodeToBunny(episodeTitle, epPath)
          episodeVideo = bunnyEmbedUrl(episodeBunnyVideoId)
        } else {
          episodeVideo = await uploadVideo(epPath)
        }
      } catch (error) {
        compositionError = error.message
        firstError ||= `concat: ${error.message}`
      }
    }

    // If the stitch produced nothing, mark composition as errored so it can be retried
    progress.calls[cIdx].status = episodeVideo ? 'done' : 'error'
    // Give the finished production a cover if it has none (e.g. Quick Create V1, which
    // generates no cover art): use the opening shot's thumbnail as the episode cover.
    const cover = doc.cover || videos.find((v) => v.coverUrl)?.coverUrl || ''
    // In s1, use that cover as the Bunny video's poster (best-effort).
    if (episodeBunnyVideoId && cover) {
      await setBunnyThumbnail(episodeBunnyVideoId, cover).catch((e) =>
        console.error('setBunnyThumbnail (episode) failed:', e.message),
      )
    }
    await updateJob(jobId, {
      progress,
      videos: doc.videos,
      episodeVideo,
      episodeBunnyVideoId,
      cover,
      audioError: firstError || compositionError || '',
      status: 'done',
      percent: 100,
    })
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

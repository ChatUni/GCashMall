// Subtitle pipeline for the "s1" (Bunny) storage flow. For a finished episode video it:
//   1. extracts the audio track with ffmpeg
//   2. transcribes it to timed text (SRT) with OpenAI whisper-1 (also detects language)
//   3. translates the timed text into every other language in the list
//   4. uploads every SRT to the episode's Bunny video as a caption track
// Subtitles are best-effort: any failure is surfaced but never fails the production.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { extractAudioTrack } from './ffmpeg.js'
import { uploadBunnyCaption } from './bunny.js'
import { getChatModel, chatTuning } from './modelConfig.js'

// The languages we produce subtitles for. `whisper` is how Whisper names the language
// (used to detect which language the audio is already in, so we don't re-translate it).
export const SUBTITLE_LANGS = [
  { code: 'en', label: 'English', whisper: 'english' },
  { code: 'zh', label: '简体中文', whisper: 'chinese' },
]

// ── Whisper transcription ──────────────────────────────────────────────────────────
const transcribeAudio = async (audioPath) => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
  const form = new FormData()
  const bytes = fs.readFileSync(audioPath)
  form.append('file', new Blob([bytes], { type: 'audio/mpeg' }), 'audio.mp3')
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json') // gives per-segment timings + language
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Whisper error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const segments = (data.segments || [])
    .map((s) => ({ start: s.start, end: s.end, text: (s.text || '').trim() }))
    .filter((s) => s.text)
  return { language: (data.language || '').toLowerCase(), segments }
}

// ── SRT formatting ─────────────────────────────────────────────────────────────────
const pad = (n, w = 2) => String(n).padStart(w, '0')
const srtTime = (sec) => {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const secs = Math.floor(s % 60)
  const ms = Math.round((s - Math.floor(s)) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(secs)},${pad(ms, 3)}`
}
const segmentsToSrt = (segments) =>
  segments
    .map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`)
    .join('\n')

// ── Translation (keeps timings, only translates the text of each segment) ────────────
const translateSegments = async (segments, targetLabel) => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
  const numbered = segments.map((s, i) => ({ i, text: s.text }))
  const model = await getChatModel()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      ...chatTuning(model, 0.2),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `You are a professional subtitle translator. Translate each subtitle line into ${targetLabel}. ` +
            `Preserve meaning and tone; keep it concise for on-screen reading. ` +
            `Return JSON of the exact shape {"lines":[{"i":<number>,"text":"<translation>"}]} ` +
            `with one entry per input line and the same "i" values. Translate the text only.`,
        },
        { role: 'user', content: JSON.stringify({ lines: numbered }) },
      ],
    }),
  })
  if (!res.ok)
    throw new Error(`Translate error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}')
  const byIndex = new Map((parsed.lines || []).map((l) => [l.i, l.text]))
  // Map translations back onto the original timings; fall back to source text if missing.
  return segments.map((s, i) => ({ ...s, text: (byIndex.get(i) || s.text).trim() }))
}

// Which subtitle language the audio is already in (so we don't translate it back).
const detectSourceLang = (whisperLanguage, langs) =>
  langs.find((l) => l.whisper === whisperLanguage) || langs[0]

// ── Orchestration ────────────────────────────────────────────────────────────────
// onProgress(percent, task) is called as the 4 tasks advance (percent 0→100 over all
// four). log(key, ...args) reports a human-readable activity for the studio log.
export const transcribeEpisode = async ({
  videoPath,
  videoId,
  langs = SUBTITLE_LANGS,
  referer,
  onProgress = () => {},
  log = () => {},
}) => {
  if (!videoPath) throw new Error('videoPath is required')
  if (!videoId) throw new Error('videoId is required')

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganime-srt-'))
  try {
    // 1. extract audio (referer lets ffmpeg read a referer-protected CDN URL)
    log('extractAudio')
    await onProgress(10, 'extractAudio')
    const audioPath = path.join(tmp, 'audio.mp3')
    await extractAudioTrack({ videoPath, outPath: audioPath, referer })

    // 2. transcribe → timed text + detected language
    log('transcribing')
    await onProgress(40, 'transcribe')
    const { language, segments } = await transcribeAudio(audioPath)
    if (segments.length === 0) {
      log('noSpeech')
      await onProgress(100, 'uploadSubs')
      return { language: '', tracks: 0, text: '' }
    }
    const transcriptText = segments.map((s) => s.text).join(' ')
    const srcLang = detectSourceLang(language, langs)
    const tracks = [{ lang: srcLang, srt: segmentsToSrt(segments) }]

    // 3. translate into every other language
    const others = langs.filter((l) => l.code !== srcLang.code)
    for (let i = 0; i < others.length; i++) {
      log('translating', others[i].label)
      await onProgress(40 + Math.round(((i + 1) / (others.length + 1)) * 35), 'translate')
      const translated = await translateSegments(segments, others[i].label)
      tracks.push({ lang: others[i], srt: segmentsToSrt(translated) })
    }

    // 4. upload every subtitle track to the Bunny video
    log('uploadingSubs')
    await onProgress(80, 'uploadSubs')
    for (const t of tracks) {
      await uploadBunnyCaption(videoId, t.lang.code, t.lang.label, t.srt)
    }
    await onProgress(100, 'uploadSubs')
    return { language: srcLang.code, tracks: tracks.length, text: transcriptText }
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

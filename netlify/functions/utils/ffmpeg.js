// Thin ffmpeg helpers (using the bundled ffmpeg-static binary) for muxing narration
// (+ optional background music) onto silent shot videos and concatenating shots into
// one episode video.

import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const run = (args) =>
  new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    proc.stderr.on('data', (d) => {
      err += d.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-500)}`)),
    )
  })

// Mux narration and/or background music onto a (silent) video. Output length matches
// the video (audio is padded with silence to fit; bgm is ducked under narration).
export const muxAudioOntoVideo = async ({ videoPath, narrationPath, bgmPath, outPath }) => {
  const inputs = ['-i', videoPath]
  const parts = []
  const labels = []
  let idx = 1

  if (narrationPath) {
    inputs.push('-i', narrationPath)
    parts.push(`[${idx}:a]apad[n]`)
    labels.push('[n]')
    idx++
  }
  if (bgmPath) {
    inputs.push('-i', bgmPath)
    parts.push(`[${idx}:a]apad,volume=${narrationPath ? '0.18' : '0.5'}[b]`)
    labels.push('[b]')
    idx++
  }

  if (labels.length === 0) {
    // No audio to add — just remux the video as-is
    await run(['-i', videoPath, '-c', 'copy', outPath])
    return
  }

  let filter
  if (labels.length === 1) {
    filter = parts[0].replace(labels[0], '[aout]')
  } else {
    filter = `${parts.join(';')};${labels.join('')}amix=inputs=${labels.length}:duration=longest[aout]`
  }

  await run([
    ...inputs,
    '-filter_complex',
    filter,
    '-map',
    '0:v:0',
    '-map',
    '[aout]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-shortest',
    outPath,
  ])
}

// Extract the audio track from a video as a compact mono mp3 (16 kHz is plenty for
// speech-to-text and keeps the upload to Whisper small). `videoPath` may be a URL;
// pass `referer` to satisfy a CDN that blocks direct access without an allowed referer.
export const extractAudioTrack = async ({ videoPath, outPath, referer }) => {
  const pre = referer ? ['-referer', referer] : []
  await run([...pre, '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '64k', outPath])
}

// Concatenate videos into one (re-encoded, since sources may differ slightly).
// Extract a frame near the very end of a video as a JPEG. Used for frame-chaining:
// the last frame of one shot seeds the next shot's first-frame image. -sseof seeks
// relative to end-of-file so we grab the final rendered frame cheaply.
export const extractLastFrame = async ({ videoPath, outPath }) => {
  await run(['-sseof', '-0.2', '-i', videoPath, '-frames:v', '1', '-q:v', '2', outPath])
}

// Extract a representative cover frame (a little past the start, to skip any fade-in)
// as a JPEG. Used to save a static thumbnail for each generated shot.
export const extractCoverFrame = async ({ videoPath, outPath }) => {
  await run(['-ss', '0.5', '-i', videoPath, '-frames:v', '1', '-q:v', '2', outPath])
}

// Extract a single frame at a given timestamp (seconds) as a JPEG. `videoPath` may be a
// URL; pass `referer` for a CDN that requires an allowed referer. -ss before -i seeks so
// only the needed region is fetched (cheap for remote HLS).
export const extractFrameAt = async ({ videoPath, seconds, outPath, referer }) => {
  const pre = referer ? ['-referer', referer] : []
  await run([...pre, '-ss', String(seconds), '-i', videoPath, '-frames:v', '1', '-q:v', '2', outPath])
}

// Read a video's duration (seconds) by parsing ffmpeg's own stderr banner — avoids
// needing ffprobe (not shipped by ffmpeg-static). Resolves 0 if it can't be determined.
export const probeDuration = ({ videoPath }) =>
  new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', videoPath], { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    proc.stderr.on('data', (d) => {
      err += d.toString()
    })
    proc.on('error', () => resolve(0))
    proc.on('close', () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
      resolve(m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]) : 0)
    })
  })

export const concatVideos = async ({ paths, listPath, outPath }) => {
  const list = paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listPath, list)
  await run([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    outPath,
  ])
}

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

// Concatenate videos into one (re-encoded, since sources may differ slightly).
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

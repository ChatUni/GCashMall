// OpenAI text-to-speech: synthesize narration audio (mp3) for a line of text.

export const synthesizeSpeech = async (text, voice = 'onyx') => {
  const input = String(text || '').trim().slice(0, 4000)
  if (!input) throw new Error('No text to synthesize')

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice,
      input,
      response_format: 'mp3',
    }),
  })
  if (!res.ok) {
    throw new Error(`TTS error (${res.status}): ${(await res.text()).slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

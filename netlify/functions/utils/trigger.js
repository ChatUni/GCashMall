// Fire-and-forget server-to-server trigger of another background function (returns
// once accepted with 202). Used to chain: episode calls → video → audio.

export const triggerBackground = async (fnName, jobId, authHeader) => {
  const base = (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.VITE_PROD_SERVER ||
    'http://localhost:8888'
  ).replace(/\/+$/, '')

  const res = await fetch(`${base}/.netlify/functions/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({ jobId }),
  })
  if (!res.ok && res.status !== 202) {
    throw new Error(`trigger ${fnName} failed (${res.status})`)
  }
}

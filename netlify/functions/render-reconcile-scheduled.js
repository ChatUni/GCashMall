// Scheduled backstop for the poll-first async video render. Every minute it advances any
// production stuck in the 'rendering' phase — covering dropped client polls (closed tab),
// missed progress, and crashed ticks (stale 'processing' shots). The client poll normally
// drives progress; this only guarantees forward motion when nothing else is watching.
//
// advanceVideoGeneration is idempotent + bounded, so this is safe alongside client-driven
// advances. Capped per run to stay within the function budget; the next run picks up more.
import { get } from './utils/db.js'
import { advanceVideoGeneration } from './utils/videoJob.js'

export const config = { schedule: '* * * * *' } // every minute

export const handler = async () => {
  try {
    const jobs = await get(
      'productions',
      { 'render.phase': 'rendering' },
      { jobId: 1, userId: 1 },
      { updatedAt: 1 },
      5,
    )
    for (const j of jobs) {
      try {
        await advanceVideoGeneration(j.jobId, j.userId)
      } catch (error) {
        console.error(`[render-reconcile] ${j.jobId}:`, error.message)
      }
    }
    return { statusCode: 200 }
  } catch (error) {
    console.error('render-reconcile error:', error.message)
    return { statusCode: 500 }
  }
}

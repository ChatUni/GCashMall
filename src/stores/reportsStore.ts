// Admin queue of content reports (Account → Moderation → Reports). Removing takes the reported
// content down; dismissing closes the report and leaves the content as it is. Either way every
// open report on the same content is closed together on the server.

import { createStore } from 'solid-js/store'
import { fetchReports, resolveReport, type ContentReport } from '../services/dataService'
import { toastStoreActions } from './index'

interface ReportsState {
  reports: ContentReport[]
  loading: boolean
  resolvingId: string
}

const getInitialState = (): ReportsState => ({
  reports: [],
  loading: false,
  resolvingId: '',
})

const [state, setState] = createStore<ReportsState>(getInitialState())

export const reportsStore = state

export const reportsStoreActions = {
  load: async () => {
    setState({ loading: true })
    const result = await fetchReports()
    setState({ reports: result.success && result.data ? result.data : [], loading: false })
  },

  resolve: async (report: ContentReport, action: 'dismiss' | 'remove') => {
    if (!report?._id) return
    setState({ resolvingId: report._id })
    const result = await resolveReport(report._id, action)
    setState({ resolvingId: '' })
    if (!result.success) {
      toastStoreActions.show(result.error || 'Failed', 'error')
      return
    }
    // Reload rather than filter locally: the server closed every report on that content.
    await reportsStoreActions.load()
  },
}

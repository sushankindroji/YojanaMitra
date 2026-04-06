/**
 * Application service - API calls for saved applications
 */
import api from './api'

const applicationService = {
  // Save an application for a scheme
  saveApplication: (schemeId, notes = '') =>
    api.post('/applications/save-scheme', {
      scheme_id: schemeId,
      notes,
      prefilled_data: {},
    }),

  // Get all saved applications
  getApplications: (params = {}) =>
    api.get('/applications', { params }),

  // Get applications by status
  getApplicationsByStatus: (status, limit = 100) =>
    api.get('/applications', { params: { status, limit } }),

  // Get specific application
  getApplication: (applicationId) =>
    api.get(`/applications/${applicationId}`),

  // Update application
  updateApplication: (applicationId, data) =>
    api.patch(`/applications/${applicationId}`, data),

  // Delete application
  deleteApplication: (applicationId) =>
    api.delete(`/applications/${applicationId}`),

  // Get application stats
  getApplicationStats: () =>
    api.get('/applications/stats/summary'),
}

export default applicationService
export { applicationService }

import api from './api'

const eligibilityService = {
  run: () => api.post('/eligibility/run', {}),
  getStatus: (jobId) => api.get(`/eligibility/status/${jobId}`),
  getResults: () => api.get('/eligibility/results'),
  getDashboard: () => api.get('/eligibility/dashboard'),
  getTop: (n = 10) => api.get(`/eligibility/top/${n}`),
  getSchemeResult: (schemeCode) => api.get(`/eligibility/scheme/${schemeCode}`),
  recalculate: () => api.post('/eligibility/recalculate', {}),
}

export default eligibilityService

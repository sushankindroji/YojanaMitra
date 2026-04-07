import api from './api'

const schemeService = {
  getSchemes: (params) => api.get('/schemes', { params }),
  getEligibleSchemes: (params) => api.get('/schemes/eligible', { params }),
  getPartiallyEligibleSchemes: (params) => api.get('/schemes/partially-eligible', { params }),
  getSchemeDetail: (schemeId, params) => api.get(`/schemes/${schemeId}`, { params }),
  getSchemeEligibility: (schemeId) => api.get(`/schemes/${schemeId}/eligibility`),
  getApplyInfo: (schemeId, params) => api.get(`/schemes/${schemeId}/apply-info`, { params }),
  getApplyGuide: (schemeId) => api.get(`/schemes/${schemeId}/apply-guide`),
  checkEligibility: (refresh = true) => api.post('/eligibility/check', { refresh }),
  getEligibilityRecommendations: (params) => api.get('/eligibility/schemes', { params }),
  getEligibilitySummary: () => api.get('/eligibility/summary'),
  checkAllSchemes: () => api.post('/schemes/check-all'),
  searchSchemes: (query) => api.get(`/schemes/search?q=${query}`),
  getSectors: () => api.get('/schemes/sectors'),
  getStates: () => api.get('/schemes/states'),
}

export default schemeService

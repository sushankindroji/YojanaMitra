import api from './api'

export const schemeService = {
  getSchemes: (params) => api.get('/schemes', { params }),
  getEligibleSchemes: (params) => api.get('/schemes/eligible', { params }),
  getPartiallyEligibleSchemes: (params) => api.get('/schemes/partially-eligible', { params }),
  getSchemeDetail: (schemeId) => api.get(`/schemes/${schemeId}`),
  getSchemeEligibility: (schemeId) => api.get(`/schemes/${schemeId}/eligibility`),
  getApplyGuide: (schemeId) => api.get(`/schemes/${schemeId}/apply-guide`),
  checkEligibility: () => api.post('/schemes/check-eligibility'),
  checkAllSchemes: () => api.post('/schemes/check-all'),
  searchSchemes: (query) => api.get(`/schemes/search?q=${query}`),
  getSectors: () => api.get('/schemes/sectors'),
  getStates: () => api.get('/schemes/states'),
}

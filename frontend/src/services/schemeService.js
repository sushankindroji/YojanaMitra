import api, { publicApi } from './api'

const optionalAuthConfig = (token, baseConfig = {}) => {
  if (!token) return baseConfig

  return {
    ...baseConfig,
    headers: {
      ...(baseConfig.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  }
}

const schemeService = {
  getPublicSchemes: (params, token) =>
    publicApi.get('/schemes', optionalAuthConfig(token, { params })),
  getPublicSchemeDetail: (schemeId, params, token) =>
    publicApi.get(`/schemes/${schemeId}`, optionalAuthConfig(token, { params })),
  getPublicSchemeEligibility: (schemeId, token) =>
    publicApi.get(`/schemes/${schemeId}/eligibility`, optionalAuthConfig(token)),
  getPublicApplyInfo: (schemeId, params, token) =>
    publicApi.get(`/schemes/${schemeId}/apply-info`, optionalAuthConfig(token, { params })),
  getPublicApplyGuide: (schemeId, token) =>
    publicApi.get(`/schemes/${schemeId}/apply-guide`, optionalAuthConfig(token)),
  getSchemes: (params) => api.get('/schemes', { params }),
  getEligibleSchemes: (params) => api.get('/schemes/eligible', { params }),
  getPartiallyEligibleSchemes: (params) => api.get('/schemes/partially-eligible', { params }),
  getSchemeDetail: (schemeId, params) => api.get(`/schemes/${schemeId}`, { params }),
  getSchemeEligibility: (schemeId) => api.get(`/schemes/${schemeId}/eligibility`),
  getApplyInfo: (schemeId, params) => api.get(`/schemes/${schemeId}/apply-info`, { params }),
  getApplyGuide: (schemeId) => api.get(`/schemes/${schemeId}/apply-guide`),
  checkEligibility: (refresh = true) => api.post('/eligibility/check', { refresh }),
  checkEligibilitySafe: (refresh = true, token) =>
    publicApi.post('/eligibility/check', { refresh }, optionalAuthConfig(token)),
  getEligibilityRecommendations: (params) => api.get('/eligibility/schemes', { params }),
  getEligibilitySummary: () => api.get('/eligibility/summary'),
  checkAllSchemes: () => api.post('/schemes/check-all'),
  searchSchemes: (query) => api.get(`/schemes/search?q=${query}`),
  getSectors: () => api.get('/schemes/sectors'),
  getStates: () => api.get('/schemes/states'),
}

export default schemeService

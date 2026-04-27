import api, { publicApi } from './api'
import i18n from '../i18n'

const withLang = (params = {}) => {
  const lang = (i18n?.resolvedLanguage || i18n?.language || 'en').split('-')[0]
  return { ...params, lang }
}

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
    publicApi.get('/schemes', optionalAuthConfig(token, { params: withLang(params) })),
  getPublicSchemeDetail: (schemeId, params, token) =>
    publicApi.get(`/schemes/${schemeId}`, optionalAuthConfig(token, { params: withLang(params) })),
  getPublicSchemeEligibility: (schemeId, token) =>
    publicApi.get(`/schemes/${schemeId}/eligibility`, optionalAuthConfig(token, { params: withLang() })),
  getPublicApplyInfo: (schemeId, params, token) =>
    publicApi.get(`/schemes/${schemeId}/apply-info`, optionalAuthConfig(token, { params: withLang(params) })),
  getPublicApplyGuide: (schemeId, token) =>
    publicApi.get(`/schemes/${schemeId}/apply-guide`, optionalAuthConfig(token, { params: withLang() })),
  getSchemes: (params) => api.get('/schemes', { params: withLang(params) }),
  getEligibleSchemes: (params) => api.get('/schemes/eligible', { params: withLang(params) }),
  getPartiallyEligibleSchemes: (params) => api.get('/schemes/partially-eligible', { params: withLang(params) }),
  getSchemeDetail: (schemeId, params) => api.get(`/schemes/${schemeId}`, { params: withLang(params) }),
  getSchemeEligibility: (schemeId) => api.get(`/schemes/${schemeId}/eligibility`, { params: withLang() }),
  getApplyInfo: (schemeId, params) => api.get(`/schemes/${schemeId}/apply-info`, { params: withLang(params) }),
  getApplyGuide: (schemeId) => api.get(`/schemes/${schemeId}/apply-guide`, { params: withLang() }),
  checkEligibility: (refresh = true) => api.post('/eligibility/check', { refresh }),
  checkEligibilitySafe: (refresh = true, token) =>
    publicApi.post('/eligibility/check', { refresh }, optionalAuthConfig(token)),
  getEligibilityRecommendations: (params) => api.get('/eligibility/schemes', { params: withLang(params) }),
  getEligibilitySummary: () => api.get('/eligibility/summary'),
  checkAllSchemes: () => api.post('/schemes/check-all'),
  searchSchemes: (query) => api.get('/schemes/search', { params: withLang({ q: query }) }),
  getSectors: () => api.get('/schemes/sectors'),
  getStates: () => api.get('/schemes/states'),
}

export default schemeService

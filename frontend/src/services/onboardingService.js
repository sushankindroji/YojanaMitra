import api from './api'

const onboardingService = {
  getStatus: () => api.get('/onboarding/status'),
  uploadAadhaar: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/onboarding/upload-aadhaar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmAadhaar: (confirmedData) =>
    api.post('/onboarding/confirm-aadhaar', { confirmed_data: confirmedData }),
  uploadDocument: (file, docType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('doc_type', docType)
    return api.post('/onboarding/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmDocument: (docType, confirmedData) =>
    api.post('/onboarding/confirm-document', {
      doc_type: docType,
      confirmed_data: confirmedData,
    }),
  completeOnboarding: (additionalData) =>
    api.post('/onboarding/complete', { additional_data: additionalData }),
}

export default onboardingService

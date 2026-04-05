import api from './api'

const profileService = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  getCompleteness: () => api.get('/profile/completeness'),
  updateOptionalQuestions: (data) => api.post('/profile/optional-questions', data),
}

export default profileService

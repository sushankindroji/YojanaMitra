import api from './api'

const documentService = {
  uploadDocument: (fileOrFormData, docType, options = {}) => {
    const isFormData =
      typeof FormData !== 'undefined' && fileOrFormData instanceof FormData

    const formData = isFormData ? fileOrFormData : new FormData()

    if (!isFormData) {
      formData.append('file', fileOrFormData)
      if (docType) {
        formData.append('doc_type', docType)
      }
    } else if (docType && !formData.get('doc_type')) {
      formData.append('doc_type', docType)
    }

    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...options,
    })
  },
  getDocuments: () => api.get('/documents'),
  getDocument: (docId) => api.get(`/documents/${docId}`),
  updateExtraction: (docId, extractedData) =>
    api.patch(`/documents/${docId}/extraction`, extractedData),
  deleteDocument: (docId) => api.delete(`/documents/${docId}`),
  downloadDocument: (docId) =>
    api.get(`/documents/${docId}/download`, { responseType: 'blob' }),
  reprocessDocument: (docId) =>
    api.post(`/documents/${docId}/reprocess`),
}

export default documentService
import api from './api'

const documentService = {
  uploadDocument: (file, docType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('doc_type', docType)
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getDocuments: () => api.get('/documents'),
  getDocument: (docId) => api.get(`/documents/${docId}`),
  deleteDocument: (docId) => api.delete(`/documents/${docId}`),
  downloadDocument: (docId) =>
    api.get(`/documents/${docId}/download`, { responseType: 'blob' }),
  reprocessDocument: (docId) =>
    api.post(`/documents/${docId}/reprocess`),
}

export default documentService
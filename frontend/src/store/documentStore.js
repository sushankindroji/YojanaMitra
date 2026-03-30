import { create } from 'zustand'

export const useDocumentStore = create((set) => ({
  documents: [],
  uploadProgress: 0,
  isProcessing: false,

  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  setDocuments: (documents) => set({ documents }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setProcessing: (isProcessing) => set({ isProcessing }),
}))

// frontend/src/pages/admin/AdminApplications.jsx
/**
 * Admin Applications Management - Review and manage user applications
 * Features:
 * - List all applications with status filtering
 * - Review application details and attached documents
 * - Approve/reject applications
 * - Add comments and notes
 * - Export application data
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  Download,
  Loader,
  AlertCircle,
  User,
} from 'lucide-react'
import api from '../../services/api'

export default function AdminApplications() {
  const { t } = useTranslation()
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('submitted') // submitted, acknowledged, rejected, all
  const [selectedApp, setSelectedApp] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    filterApplications()
  }, [applications, searchQuery, filterStatus])

  const fetchApplications = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/admin/applications', {
        params: { limit: 1000 },
      })
      setApplications(res.data.applications || [])
    } catch (err) {
      console.error('Error fetching applications:', err)
      toast.error(t('admin.fetchError') || 'Failed to load applications')
    } finally {
      setIsLoading(false)
    }
  }

  const filterApplications = () => {
    let filtered = applications

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (app) =>
          app.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.scheme_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((app) => app.status === filterStatus)
    }

    setFilteredApplications(filtered)
  }

  const handleApproveApplication = async (appId) => {
    if (!window.confirm('Approve this application?')) return

    try {
      setActionInProgress(true)
      await api.patch(`/admin/applications/${appId}`, {
        status: 'acknowledged',
      })
      toast.success('Application approved')
      fetchApplications()
      setSelectedApp(null)
    } catch (err) {
      console.error('Error approving application:', err)
      toast.error('Failed to approve application')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleRejectApplication = async (appId, reason) => {
    if (!window.confirm('Reject this application?')) return

    try {
      setActionInProgress(true)
      await api.patch(`/admin/applications/${appId}`, {
        status: 'rejected',
        rejection_reason: reason,
      })
      toast.success('Application rejected')
      fetchApplications()
      setSelectedApp(null)
    } catch (err) {
      console.error('Error rejecting application:', err)
      toast.error('Failed to reject application')
    } finally {
      setActionInProgress(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'saved':
        return 'bg-blue-100 text-blue-800'
      case 'started':
        return 'bg-yellow-100 text-yellow-800'
      case 'submitted':
        return 'bg-purple-100 text-purple-800'
      case 'acknowledged':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Application Management</h1>
          <p className="text-gray-600">Review and manage user scheme applications</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by applicant, email, or scheme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="submitted">Pending Review</option>
              <option value="acknowledged">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Status</option>
            </select>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredApplications.length} of {applications.length} applications
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Scheme
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Docs
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="text-blue-600" size={18} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{app.user_name}</div>
                            <div className="text-xs text-gray-500">{app.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{app.scheme_name}</div>
                        <div className="text-xs text-gray-500">
                          {app.scheme_ministry}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            app.status
                          )}`}
                        >
                          {app.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(app.submission_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          {app.documents_count || 0} docs
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            if (app.notes || app.admin_notes) {
                              setSelectedApp(app)
                            } else {
                              toast.info('No notes for this application')
                            }
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="View Notes"
                        >
                          <MessageSquare size={18} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {app.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleApproveApplication(app.id)}
                                disabled={actionInProgress}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectApplication(
                                    app.id,
                                    'Insufficient documents'
                                  )
                                }
                                disabled={actionInProgress}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Application Details Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-96 overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-2xl font-bold text-gray-900">Application Details</h3>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Applicant Name</p>
                    <p className="font-medium text-gray-900">{selectedApp.user_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selectedApp.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Scheme</p>
                    <p className="font-medium text-gray-900">{selectedApp.scheme_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p
                      className={`font-medium inline-block px-2 py-1 rounded ${getStatusColor(
                        selectedApp.status
                      )}`}
                    >
                      {selectedApp.status?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Submitted Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedApp.submission_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Documents</p>
                    <p className="font-medium text-gray-900">
                      {selectedApp.documents_count || 0} attached
                    </p>
                  </div>
                </div>

                {selectedApp.notes && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Applicant Notes</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedApp.notes}
                    </p>
                  </div>
                )}

                {selectedApp.admin_notes && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Admin Notes</p>
                    <p className="text-gray-900 bg-blue-50 p-3 rounded">
                      {selectedApp.admin_notes}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex gap-2">
                  {selectedApp.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => {
                          handleApproveApplication(selectedApp.id)
                        }}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          handleRejectApplication(
                            selectedApp.id,
                            'Insufficient documents'
                          )
                        }}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

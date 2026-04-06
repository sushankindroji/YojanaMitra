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
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  MessageSquare,
  Search,
  User,
  XCircle,
} from 'lucide-react'
import api from '../../services/api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'

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
    <div className="space-y-5">
      <PageHeader
        title="Application Management"
        description="Review user submissions and update decision statuses"
        actions={
          <Button variant="ghost">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <Card className="border border-stone-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-stone-400" size={20} />
              <input
                type="text"
                placeholder="Search by applicant, email, or scheme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-stone-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="submitted">Pending Review</option>
              <option value="acknowledged">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Status</option>
            </select>
          </div>

          <div className="mt-4 text-body-sm text-gray-600">
            Showing {filteredApplications.length} of {applications.length} applications
          </div>
      </Card>

      <Card className="overflow-hidden border border-stone-200 p-0">
          {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : filteredApplications.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-stone-400" />
            <p className="text-stone-600">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-label font-medium tracking-wide text-stone-900">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-label font-medium tracking-wide text-stone-900">
                      Scheme
                    </th>
                    <th className="px-6 py-3 text-left text-label font-medium tracking-wide text-stone-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-label font-medium tracking-wide text-stone-900">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-label font-medium tracking-wide text-stone-900">
                      Docs
                    </th>
                    <th className="px-6 py-3 text-left text-label font-medium tracking-wide text-stone-900">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-center text-label font-medium tracking-wide text-stone-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                    className="border-b border-stone-100 transition hover:bg-stone-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                          <User className="text-blue-600" size={18} />
                          </div>
                          <div>
                          <div className="font-medium text-stone-900">{app.user_name}</div>
                          <div className="text-caption text-stone-500">{app.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                      <div className="font-medium text-stone-900">{app.scheme_name}</div>
                      <div className="text-caption text-stone-500">
                          {app.scheme_ministry}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-caption font-medium ${getStatusColor(
                            app.status
                          )}`}
                        >
                          {app.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-stone-600">
                        {new Date(app.submission_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                      <span className="inline-block rounded bg-stone-100 px-2 py-1 text-caption font-medium text-stone-700">
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
                        className="rounded-lg p-2 text-stone-600 transition hover:bg-stone-100"
                          title="View Notes"
                        >
                          <MessageSquare size={18} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedApp(app)}
                          className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {app.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleApproveApplication(app.id)}
                                disabled={actionInProgress}
                                className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 disabled:opacity-50"
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
                                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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
      </Card>

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-6">
              <h3 className="text-h3 font-medium text-stone-900">Application Details</h3>
                <button
                  onClick={() => setSelectedApp(null)}
                className="text-h3 text-stone-500 hover:text-stone-700"
                >
                  ✕
                </button>
              </div>

            <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                  <p className="text-label text-stone-600">Applicant Name</p>
                  <p className="font-medium text-stone-900">{selectedApp.user_name}</p>
                  </div>
                  <div>
                  <p className="text-label text-stone-600">Email</p>
                  <p className="font-medium text-stone-900">{selectedApp.user_email}</p>
                  </div>
                  <div>
                  <p className="text-label text-stone-600">Scheme</p>
                  <p className="font-medium text-stone-900">{selectedApp.scheme_name}</p>
                  </div>
                  <div>
                  <p className="text-label text-stone-600">Status</p>
                    <p
                      className={`font-medium inline-block px-2 py-1 rounded ${getStatusColor(
                        selectedApp.status
                      )}`}
                    >
                      {selectedApp.status?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                  <p className="text-label text-stone-600">Submitted Date</p>
                  <p className="font-medium text-stone-900">
                      {new Date(selectedApp.submission_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                  <p className="text-label text-stone-600">Documents</p>
                  <p className="font-medium text-stone-900">
                      {selectedApp.documents_count || 0} attached
                    </p>
                  </div>
                </div>

                {selectedApp.notes && (
                  <div>
                  <p className="mb-2 text-label text-stone-600">Applicant Notes</p>
                  <p className="rounded bg-stone-50 p-3 text-stone-900">
                      {selectedApp.notes}
                    </p>
                  </div>
                )}

                {selectedApp.admin_notes && (
                  <div>
                  <p className="mb-2 text-label text-stone-600">Admin Notes</p>
                  <p className="rounded bg-blue-50 p-3 text-stone-900">
                      {selectedApp.admin_notes}
                    </p>
                  </div>
                )}

              <div className="flex gap-2 border-t border-stone-200 pt-4">
                  {selectedApp.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => {
                          handleApproveApplication(selectedApp.id)
                        }}
                        className="rounded-lg bg-green-100 px-4 py-2 text-body-sm font-medium text-green-700 hover:bg-green-200"
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
                        className="rounded-lg bg-red-100 px-4 py-2 text-body-sm font-medium text-red-700 hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="ml-auto rounded-lg bg-stone-100 px-4 py-2 text-body-sm font-medium text-stone-700 hover:bg-stone-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}

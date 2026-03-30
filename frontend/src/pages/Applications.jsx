import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { applicationService } from '../services/applicationService'
import { useApplicationStore } from '../store/applicationStore'
import { toast } from 'react-toastify'
import { FiTrash2, FiEdit2, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi'
import LanguageSelector from '../components/common/LanguageSelector'

const statusColors = {
  saved: 'bg-blue-50 border-blue-200 text-blue-700',
  started: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  submitted: 'bg-purple-50 border-purple-200 text-purple-700',
  acknowledged: 'bg-green-50 border-green-200 text-green-700',
  rejected: 'bg-red-50 border-red-200 text-red-700',
}

const statusIcons = {
  saved: <FiClock className="w-4 h-4" />,
  started: <FiEdit2 className="w-4 h-4" />,
  submitted: <FiCheckCircle className="w-4 h-4" />,
  acknowledged: <FiCheckCircle className="w-4 h-4" />,
  rejected: <FiAlertCircle className="w-4 h-4" />,
}

export default function Applications() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const { removeApplication } = useApplicationStore()

  useEffect(() => {
    fetchApplications()
    fetchStats()
  }, [filter])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const response = await applicationService.getApplications({
        status: filter !== 'all' ? filter : undefined,
        limit: 100,
      })
      setApplications(response.data.applications)
    } catch (error) {
      toast.error('Failed to load applications')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await applicationService.getApplicationStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleDelete = async (applicationId) => {
    if (!window.confirm(t('applications.confirmDelete'))) return

    try {
      await applicationService.deleteApplication(applicationId)
      removeApplication(applicationId)
      setApplications(applications.filter(app => app.id !== applicationId))
      toast.success(t('applications.removeSuccess'))
      fetchStats()
    } catch (error) {
      toast.error('Failed to remove application')
    }
  }

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applicationService.updateApplication(applicationId, { status: newStatus })
      setApplications(applications.map(app =>
        app.id === applicationId ? { ...app, status: newStatus } : app
      ))
      toast.success(t('applications.updateSuccess'))
      fetchStats()
    } catch (error) {
      toast.error('Failed to update application')
    }
  }

  const getFilteredApplications = () => {
    if (filter === 'all') return applications
    return applications.filter(app => app.status === filter)
  }

  const filtered = getFilteredApplications()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="tricolor-bar"></div>
      
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1A3A6B]">YojanaMitra</h2>
            <p className="text-sm text-gray-600">{t('applications.trackAndManage')}</p>
          </div>
          <LanguageSelector />
        </div>
      </nav>

      <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('applications.title')}</h1>
          <p className="text-gray-600">{t('applications.trackAndManage')}</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Saved</div>
              <div className="text-2xl font-bold text-blue-900">{stats.total_saved}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-600 font-medium">Started</div>
              <div className="text-2xl font-bold text-yellow-900">{stats.total_started}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Submitted</div>
              <div className="text-2xl font-bold text-purple-900">{stats.total_submitted}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Approved</div>
              <div className="text-2xl font-bold text-green-900">{stats.total_acknowledged}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium">Rejected</div>
              <div className="text-2xl font-bold text-red-900">{stats.total_rejected}</div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'saved', 'started', 'submitted', 'acknowledged', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FiAlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {applications.length === 0
                  ? 'No applications yet. Check eligibility and save schemes!'
                  : `No ${filter} applications`}
              </p>
              <button
                onClick={() => navigate('/eligibility')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check Eligibility
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Scheme Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ministry</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Benefit Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Saved Date</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(app => (
                    <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{app.scheme_name}</div>
                        <div className="text-sm text-gray-500">{app.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${statusColors[app.status]}`}>
                          {statusIcons[app.status]}
                          <span className="text-sm font-medium">
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {app.scheme_ministry || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {app.scheme_benefit_amount ? `₹${(app.scheme_benefit_amount / 100000).toFixed(1)}L+` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(app.saved_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                          >
                            <option value="saved">Saved</option>
                            <option value="started">Started</option>
                            <option value="submitted">Submitted</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Application Status Guide</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <strong>Saved:</strong> You've bookmarked this scheme for later
            </div>
            <div>
              <strong>Started:</strong> You've begun filling out the application
            </div>
            <div>
              <strong>Submitted:</strong> Application officially submitted to scheme
            </div>
            <div>
              <strong>Acknowledged:</strong> Government has received your application
            </div>
            <div>
              <strong>Rejected:</strong> Your application was not approved
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

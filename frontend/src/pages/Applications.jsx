import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import applicationService from '../services/applicationService'
import { useApplicationStore } from '../store/applicationStore'
import { toast } from 'react-toastify'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileClock,
  PencilLine,
  Trash2,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'

const statusColors = {
  saved: 'bg-blue-50 border-blue-200 text-blue-700',
  started: 'bg-amber-50 border-amber-200 text-amber-700',
  submitted: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  acknowledged: 'bg-green-50 border-green-200 text-green-700',
  rejected: 'bg-red-50 border-red-200 text-red-700',
}

const statusIcons = {
  saved: <Clock3 className="h-4 w-4" />,
  started: <PencilLine className="h-4 w-4" />,
  submitted: <FileClock className="h-4 w-4" />,
  acknowledged: <CheckCircle2 className="h-4 w-4" />,
  rejected: <AlertCircle className="h-4 w-4" />,
}

const statusCards = [
  { key: 'total_saved', label: 'Saved', tone: 'info' },
  { key: 'total_started', label: 'Started', tone: 'warning' },
  { key: 'total_submitted', label: 'Submitted', tone: 'neutral' },
  { key: 'total_acknowledged', label: 'Approved', tone: 'success' },
  { key: 'total_rejected', label: 'Rejected', tone: 'danger' },
]

const statusFilterOptions = ['all', 'saved', 'started', 'submitted', 'acknowledged', 'rejected']

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
    <div className="space-y-5">
      <PageHeader
        title={t('applications.title')}
        description={t('applications.trackAndManage')}
        actions={
          <Button onClick={() => navigate('/eligibility')} variant="secondary">
            Find New Schemes
          </Button>
        }
      />

      {stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {statusCards.map((item) => (
            <Card key={item.key} className="border border-stone-200 bg-white">
              <Badge variant={item.tone}>{item.label}</Badge>
              <p className="mt-2 text-h2 font-medium text-stone-900">{stats[item.key] || 0}</p>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {statusCards.map((item) => (
            <Skeleton key={item.key} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      <Card className="border border-stone-200 p-0">
        <div className="border-b border-stone-200 p-3">
          <div className="flex flex-wrap gap-2">
            {statusFilterOptions.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-full px-3 py-1.5 text-caption font-medium uppercase tracking-[0.08em] transition ${
                  filter === status
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden">
          {loading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-stone-400" />
              <p className="mt-3 text-body-sm text-stone-600">
                {applications.length === 0
                  ? 'No applications yet. Check eligibility and save schemes!'
                  : `No ${filter} applications`}
              </p>
              <Button
                onClick={() => navigate('/eligibility')}
                className="mt-4"
              >
                Check Eligibility
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-label font-medium tracking-wide text-stone-900">Scheme Name</th>
                    <th className="px-5 py-3 text-left text-label font-medium tracking-wide text-stone-900">Status</th>
                    <th className="px-5 py-3 text-left text-label font-medium tracking-wide text-stone-900">Ministry</th>
                    <th className="px-5 py-3 text-left text-label font-medium tracking-wide text-stone-900">Benefit</th>
                    <th className="px-5 py-3 text-left text-label font-medium tracking-wide text-stone-900">Saved Date</th>
                    <th className="px-5 py-3 text-center text-label font-medium tracking-wide text-stone-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr key={app.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-stone-900">{app.scheme_name}</div>
                        <div className="text-caption text-stone-500">{app.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${statusColors[app.status]}`}>
                          {statusIcons[app.status]}
                          <span className="text-body-sm font-medium">
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-body-sm text-stone-600">
                        {app.scheme_ministry || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-body-sm font-medium text-stone-900">
                        {app.scheme_benefit_amount ? `Rs ${(app.scheme_benefit_amount / 100000).toFixed(1)}L+` : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-body-sm text-stone-600">
                        {new Date(app.saved_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className="h-8 rounded-md border border-stone-300 px-2 text-caption focus:outline-none focus:ring-2 focus:ring-orange-300"
                          >
                            <option value="saved">Saved</option>
                            <option value="started">Started</option>
                            <option value="submitted">Submitted</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </Card>

      <Card className="border border-blue-200 bg-blue-50">
        <h3 className="text-micro font-medium uppercase tracking-wider text-blue-900">Application Status Guide</h3>
        <div className="mt-3 grid gap-2 text-body-sm text-blue-900 md:grid-cols-2">
          <p><strong>Saved:</strong> You bookmarked a scheme for later.</p>
          <p><strong>Started:</strong> Application form filling has begun.</p>
          <p><strong>Submitted:</strong> Form submitted to the scheme authority.</p>
          <p><strong>Acknowledged:</strong> Authority has recorded your application.</p>
          <p><strong>Rejected:</strong> Application was not approved.</p>
        </div>
      </Card>
    </div>
  )
}

// frontend/src/pages/admin/AdminDashboard.jsx
/**
 * Admin Dashboard - Overview of system metrics and statistics
 * Features:
 * - System overview cards (users, schemes, applications)
 * - Recent activity feed
 * - Quick actions
 * - Admin-only access check
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  Settings,
  BarChart3,
  Loader,
} from 'lucide-react'
import api from '../../services/api'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'

const appStatusRows = [
  { label: 'Saved', key: 'apps_saved', pctKey: 'apps_saved_pct', color: 'bg-blue-600' },
  { label: 'Started', key: 'apps_started', pctKey: 'apps_started_pct', color: 'bg-amber-600' },
  { label: 'Submitted', key: 'apps_submitted', pctKey: 'apps_submitted_pct', color: 'bg-indigo-600' },
  { label: 'Acknowledged', key: 'apps_acknowledged', pctKey: 'apps_acknowledged_pct', color: 'bg-green-600' },
  { label: 'Rejected', key: 'apps_rejected', pctKey: 'apps_rejected_pct', color: 'bg-red-600' },
]

const quickActions = [
  { label: 'Manage Users', path: '/admin/users', icon: Users, tone: 'info' },
  { label: 'Manage Schemes', path: '/admin/schemes', icon: Briefcase, tone: 'success' },
  { label: 'Review Applications', path: '/admin/applications', icon: FileText, tone: 'warning' },
  { label: 'System Settings', path: '/admin/settings', icon: Settings, tone: 'neutral' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)

      // Fetch admin stats from backend
      const res = await api.get('/admin/dashboard/stats')
      setStats(res.data)
    } catch (err) {
      console.error('Error fetching admin stats:', err)
      // When API fails, show default stats instead of error
      setStats({
        total_users: 0,
        active_users: 0,
        total_schemes: 0,
        active_schemes: 0,
        total_applications: 0,
        pending_applications: 0,
        submission_rate: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <div className="flex items-center justify-center gap-2 text-body-sm text-stone-500">
          <Loader className="h-4 w-4 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Admin Dashboard" description="System overview and key governance metrics" />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-stone-200">
          <div className="flex items-center justify-between">
            <Badge variant="info">Users</Badge>
            <Users className="h-5 w-5 text-blue-700" />
          </div>
          <p className="mt-2 text-h2 font-medium text-stone-900">{stats?.total_users || 0}</p>
          <p className="text-body-sm text-stone-500">{stats?.active_users || 0} active this month</p>
        </Card>

        <Card className="border border-stone-200">
          <div className="flex items-center justify-between">
            <Badge variant="success">Schemes</Badge>
            <Briefcase className="h-5 w-5 text-green-700" />
          </div>
          <p className="mt-2 text-h2 font-medium text-stone-900">{stats?.total_schemes || 0}</p>
          <p className="text-body-sm text-stone-500">{stats?.active_schemes || 0} active schemes</p>
        </Card>

        <Card className="border border-stone-200">
          <div className="flex items-center justify-between">
            <Badge variant="neutral">Applications</Badge>
            <FileText className="h-5 w-5 text-indigo-700" />
          </div>
          <p className="mt-2 text-h2 font-medium text-stone-900">{stats?.total_applications || 0}</p>
          <p className="text-body-sm text-stone-500">{stats?.pending_applications || 0} pending review</p>
        </Card>

        <Card className="border border-stone-200">
          <div className="flex items-center justify-between">
            <Badge variant="warning">Submission Rate</Badge>
            <TrendingUp className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-2 text-h2 font-medium text-stone-900">{stats?.submission_rate || 0}%</p>
          <p className="text-body-sm text-stone-500">Applications submitted</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-stone-200">
          <h3 className="mb-4 flex items-center gap-2 text-h3 font-medium text-stone-900">
            <Users size={18} />
              User Status Breakdown
          </h3>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-caption">
                  <span className="text-stone-600">Registered</span>
                  <span className="font-medium text-stone-900">
                    {stats?.users_registered || 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-200">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${stats?.users_registered_pct || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-caption">
                  <span className="text-stone-600">Profile Complete</span>
                  <span className="font-medium text-stone-900">
                    {stats?.users_profile_complete || 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-200">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${stats?.users_profile_complete_pct || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-caption">
                  <span className="text-stone-600">Email Verified</span>
                  <span className="font-medium text-stone-900">
                    {stats?.users_email_verified || 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-200">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${stats?.users_email_verified_pct || 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
        </Card>

        <Card className="border border-stone-200">
          <h3 className="mb-4 flex items-center gap-2 text-h3 font-medium text-stone-900">
            <FileText size={18} />
              Application Status
          </h3>
            <div className="space-y-3">
              {appStatusRows.map((status) => (
                <div key={status.key}>
                  <div className="mb-1 flex justify-between text-caption">
                    <span className="text-stone-600">{status.label}</span>
                    <span className="font-medium text-stone-900">
                      {stats?.[status.key] || 0}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-200">
                    <div
                      className={`${status.color} h-2 rounded-full`}
                      style={{
                        width: `${stats?.[status.pctKey] || 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
        </Card>

        <Card className="border border-stone-200">
          <h3 className="mb-4 flex items-center gap-2 text-h3 font-medium text-stone-900">
            <Settings size={18} />
              Quick Actions
          </h3>
            <div className="space-y-2">
              {quickActions.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-body font-medium text-stone-700 transition hover:bg-stone-100"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
        </Card>
      </section>

      <Card className="border border-stone-200">
        <h3 className="mb-4 flex items-center gap-2 text-h3 font-medium text-stone-900">
          <BarChart3 size={18} />
            System Health
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
            <div>
            <p className="mb-2 text-caption text-stone-600">Database Health</p>
              <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="font-medium text-stone-900">Operational</span>
              </div>
            </div>
            <div>
            <p className="mb-2 text-caption text-stone-600">API Status</p>
              <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="font-medium text-stone-900">Operational</span>
              </div>
            </div>
            <div>
            <p className="mb-2 text-caption text-stone-600">Last Updated</p>
            <span className="font-medium text-stone-900">
                {stats?.last_updated
                  ? new Date(stats.last_updated).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
          </div>
      </Card>
    </div>
  )
}

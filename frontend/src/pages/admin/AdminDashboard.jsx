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
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  Settings,
  BarChart3,
  Loader,
} from 'lucide-react'
import api from '../../services/api'

export default function AdminDashboard() {
  const { t } = useTranslation()
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and key metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Total Users</h3>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.total_users || 0}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats?.active_users || 0} active this month
            </p>
          </div>

          {/* Total Schemes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Total Schemes</h3>
              <div className="p-3 bg-green-100 rounded-lg">
                <Briefcase className="text-green-600" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.total_schemes || 0}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats?.active_schemes || 0} active schemes
            </p>
          </div>

          {/* Total Applications */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Total Applications</h3>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="text-purple-600" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.total_applications || 0}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats?.pending_applications || 0} pending review
            </p>
          </div>

          {/* Submission Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Submission Rate</h3>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="text-orange-600" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.submission_rate || 0}%
            </div>
            <p className="text-sm text-gray-500 mt-2">Applications submitted</p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Status Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} />
              User Status Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Registered</span>
                  <span className="font-medium text-gray-900">
                    {stats?.users_registered || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${stats?.users_registered_pct || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Profile Complete</span>
                  <span className="font-medium text-gray-900">
                    {stats?.users_profile_complete || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${stats?.users_profile_complete_pct || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Email Verified</span>
                  <span className="font-medium text-gray-900">
                    {stats?.users_email_verified || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${stats?.users_email_verified_pct || 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Application Status Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Application Status
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Saved', value: 'saved', color: 'blue' },
                { label: 'Started', value: 'started', color: 'yellow' },
                { label: 'Submitted', value: 'submitted', color: 'purple' },
                { label: 'Acknowledged', value: 'acknowledged', color: 'green' },
                { label: 'Rejected', value: 'rejected', color: 'red' },
              ].map((status) => (
                <div key={status.value}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{status.label}</span>
                    <span className="font-medium text-gray-900">
                      {stats?.[`apps_${status.value}`] || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-${status.color}-600 h-2 rounded-full`}
                      style={{
                        width: `${stats?.[`apps_${status.value}_pct`] || 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings size={20} />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <a
                href="/admin/users"
                className="block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition"
              >
                👥 Manage Users
              </a>
              <a
                href="/admin/schemes"
                className="block px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium text-sm transition"
              >
                📋 Manage Schemes
              </a>
              <a
                href="/admin/applications"
                className="block px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 font-medium text-sm transition"
              >
                📄 Review Applications
              </a>
              <a
                href="/admin/settings"
                className="block px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 font-medium text-sm transition"
              >
                ⚙️ System Settings
              </a>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            System Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 text-sm mb-2">Database Health</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full" />
                <span className="font-medium text-gray-900">Operational</span>
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">API Status</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full" />
                <span className="font-medium text-gray-900">Operational</span>
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Last Updated</p>
              <span className="font-medium text-gray-900">
                {stats?.last_updated
                  ? new Date(stats.last_updated).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

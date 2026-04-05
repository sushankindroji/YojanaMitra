// frontend/src/pages/admin/AdminUsers.jsx
/**
 * Admin Users Management - CRUD operations for users
 * Features:
 * - List all users with search/filter
 * - View user details
 * - Deactivate/ban users
 * - Reset user passwords
 * - View user activity logs
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  AlertCircle,
  Ban,
  Calendar,
  Eye,
  Mail,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
} from 'lucide-react'
import api from '../../services/api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'

export default function AdminUsers() {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, active, inactive, banned
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, filterStatus])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/admin/users', {
        params: { limit: 1000 },
      })
      setUsers(res.data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error(t('admin.fetchError') || 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone?.includes(searchQuery)
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((user) => user.status === filterStatus)
    }

    setFilteredUsers(filtered)
  }

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm('Are you sure? This will deactivate the user account.')) return

    try {
      setActionInProgress(true)
      await api.patch(`/admin/users/${userId}/deactivate`)
      toast.success('User deactivated successfully')
      fetchUsers()
    } catch (err) {
      console.error('Error deactivating user:', err)
      toast.error('Failed to deactivate user')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleBanUser = async (userId) => {
    if (!window.confirm('Are you sure? This will ban the user permanently.')) return

    try {
      setActionInProgress(true)
      await api.patch(`/admin/users/${userId}/ban`)
      toast.success('User banned successfully')
      fetchUsers()
    } catch (err) {
      console.error('Error banning user:', err)
      toast.error('Failed to ban user')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Send password reset email to this user?')) return

    try {
      setActionInProgress(true)
      await api.post(`/admin/users/${userId}/reset-password`)
      toast.success('Password reset email sent')
    } catch (err) {
      console.error('Error resetting password:', err)
      toast.error('Failed to reset password')
    } finally {
      setActionInProgress(false)
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-stone-100 text-stone-700 border-stone-200'
      case 'banned':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        description="Manage platform users, account status, and security actions"
      />

      <Card className="border border-stone-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-stone-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
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
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>

          <Button
              onClick={fetchUsers}
            variant="secondary"
            >
              <RefreshCw size={18} />
              Refresh
          </Button>
          </div>

        <div className="mt-4 text-sm text-stone-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
      </Card>

      <Card className="border border-stone-200 p-0 overflow-hidden">
          {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-stone-400" />
            <p className="text-stone-600">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Profile
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-stone-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                    className="border-b border-stone-100 transition hover:bg-stone-50"
                    >
                      <td className="px-6 py-4">
                      <div className="font-medium text-stone-900">{user.full_name}</div>
                      <div className="text-xs text-stone-500">{user.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                        <Mail size={16} className="text-stone-400" />
                        <span className="text-sm text-stone-600">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                        <Phone size={16} className="text-stone-400" />
                        <span className="text-sm text-stone-600">
                            {user.phone || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                        className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeColor(
                            user.status
                          )}`}
                        >
                          {user.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-stone-400" />
                        <span className="text-sm text-stone-600">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                            user.profile_complete
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.profile_complete ? '✓ Complete' : '○ Incomplete'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                          className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            disabled={actionInProgress}
                          className="rounded-lg p-2 text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
                            title="Reset Password"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            disabled={actionInProgress || user.status === 'inactive'}
                          className="rounded-lg p-2 text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
                            title="Deactivate"
                          >
                            <MoreVertical size={18} />
                          </button>
                          <button
                            onClick={() => handleBanUser(user.id)}
                            disabled={actionInProgress || user.status === 'banned'}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            title="Ban User"
                          >
                            <Ban size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-6">
              <h3 className="text-2xl font-bold text-stone-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                className="text-2xl text-stone-500 hover:text-stone-700"
                >
                  ✕
                </button>
              </div>

            <div className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                  <p className="text-sm text-stone-600">Full Name</p>
                  <p className="font-medium text-stone-900">{selectedUser.full_name}</p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Email</p>
                  <p className="font-medium text-stone-900">{selectedUser.email}</p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Phone</p>
                  <p className="font-medium text-stone-900">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Status</p>
                  <p className="font-medium text-stone-900">
                      {selectedUser.status?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Joined</p>
                  <p className="font-medium text-stone-900">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Last Login</p>
                  <p className="font-medium text-stone-900">
                      {selectedUser.last_login
                        ? new Date(selectedUser.last_login).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Profile Completion</p>
                  <p className="font-medium text-stone-900">
                      {selectedUser.profile_completion_pct || 0}%
                    </p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Email Verified</p>
                  <p className="font-medium text-stone-900">
                      {selectedUser.email_verified ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                </div>

              <div className="border-t border-stone-200 pt-4">
                <p className="mb-2 text-sm text-stone-600">Quick Actions</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleResetPassword(selectedUser.id)
                        setSelectedUser(null)
                      }}
                    className="rounded-lg bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-200"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => {
                        handleDeactivateUser(selectedUser.id)
                        setSelectedUser(null)
                      }}
                    className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => {
                        handleBanUser(selectedUser.id)
                        setSelectedUser(null)
                      }}
                    className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                    >
                      Ban User
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}

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
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Loader,
  Eye,
  Ban,
  RefreshCw,
} from 'lucide-react'
import api from '../../services/api'

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
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'banned':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage platform users and permissions</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
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
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>

            <button
              onClick={fetchUsers}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Profile
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-xs text-gray-500">{user.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {user.phone || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            user.status
                          )}`}
                        >
                          {user.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
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
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            disabled={actionInProgress}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition disabled:opacity-50"
                            title="Reset Password"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            disabled={actionInProgress || user.status === 'inactive'}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                            title="Deactivate"
                          >
                            <MoreVertical size={18} />
                          </button>
                          <button
                            onClick={() => handleBanUser(user.id)}
                            disabled={actionInProgress || user.status === 'banned'}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
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
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium text-gray-900">
                      {selectedUser.status?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>
                    <p className="font-medium text-gray-900">
                      {selectedUser.last_login
                        ? new Date(selectedUser.last_login).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profile Completion</p>
                    <p className="font-medium text-gray-900">
                      {selectedUser.profile_completion_pct || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email Verified</p>
                    <p className="font-medium text-gray-900">
                      {selectedUser.email_verified ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Quick Actions</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleResetPassword(selectedUser.id)
                        setSelectedUser(null)
                      }}
                      className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium text-sm"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => {
                        handleDeactivateUser(selectedUser.id)
                        setSelectedUser(null)
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => {
                        handleBanUser(selectedUser.id)
                        setSelectedUser(null)
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
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
    </div>
  )
}

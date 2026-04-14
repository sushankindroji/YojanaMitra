import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  AlertCircle,
  Ban,
  Calendar,
  Eye,
  Mail,
  RefreshCw,
  Search,
  Shield,
  UserX,
} from 'lucide-react'
import api from '../../services/api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'

const PAGE_SIZE = 20

const getStatusPillClass = (status) => {
  if (status === 'active') return 'border-green-200 bg-green-100 text-green-800'
  if (status === 'inactive') return 'border-stone-200 bg-stone-100 text-stone-700'
  if (status === 'banned') return 'border-red-200 bg-red-100 text-red-800'
  return 'border-blue-200 bg-blue-100 text-blue-800'
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('registered_desc')
  const [page, setPage] = useState(1)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/admin/users', { params: { limit: 1000 } })
      setUsers(Array.isArray(response.data?.users) ? response.data.users : [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    let output = [...users]

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      output = output.filter((user) => {
        const name = String(user.full_name || '').toLowerCase()
        const email = String(user.email || '').toLowerCase()
        return name.includes(query) || email.includes(query)
      })
    }

    if (statusFilter !== 'all') {
      output = output.filter((user) => String(user.status || '') === statusFilter)
    }

    if (roleFilter !== 'all') {
      output = output.filter((user) => String(user.role || 'user') === roleFilter)
    }

    if (sortBy === 'name_asc') {
      output.sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')))
    } else if (sortBy === 'email_asc') {
      output.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
    } else {
      output.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }

    return output
  }, [users, searchQuery, statusFilter, roleFilter, sortBy])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, roleFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const patchUserRole = async (user, role) => {
    const actionText = role === 'admin' ? 'promote' : 'demote'
    const confirmed = window.confirm(`Are you sure you want to ${actionText} this user?`)
    if (!confirmed) return

    try {
      setActionInProgress(true)
      await api.patch(`/admin/users/${user.id}/role`, { role })
      toast.success(role === 'admin' ? 'User promoted to admin' : 'User changed to standard role')
      await fetchUsers()
    } catch {
      toast.error('Failed to update role')
    } finally {
      setActionInProgress(false)
    }
  }

  const patchUserStatus = async (user, action) => {
    const actionConfig = {
      deactivate: {
        path: `/admin/users/${user.id}/deactivate`,
        confirm: 'Are you sure you want to deactivate this account?',
        success: 'User deactivated',
      },
      ban: {
        path: `/admin/users/${user.id}/ban`,
        confirm: 'Are you sure you want to ban this account?',
        success: 'User banned',
      },
    }

    const config = actionConfig[action]
    if (!config) return

    const confirmed = window.confirm(config.confirm)
    if (!confirmed) return

    try {
      setActionInProgress(true)
      await api.patch(config.path)
      toast.success(config.success)
      await fetchUsers()
    } catch {
      toast.error('Failed to update user status')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        description="Search, filter, and manage platform users"
      />

      <Card className="border border-stone-200">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or email"
              className="h-10 w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-10 rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-10 rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="registered_desc">Newest Registered</option>
            <option value="name_asc">Name A-Z</option>
            <option value="email_asc">Email A-Z</option>
          </select>

          <Button variant="secondary" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <p className="mt-3 text-body-sm text-stone-600">
          Showing {filteredUsers.length.toLocaleString('en-IN')} users
        </p>
      </Card>

      <Card className="overflow-hidden border border-stone-200 p-0">
        {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-stone-400" />
            <p className="text-body-sm text-stone-600">No users found for current filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-label font-medium tracking-wide text-stone-900">Name</th>
                    <th className="px-4 py-3 text-left text-label font-medium tracking-wide text-stone-900">Email</th>
                    <th className="px-4 py-3 text-left text-label font-medium tracking-wide text-stone-900">Registered date</th>
                    <th className="px-4 py-3 text-left text-label font-medium tracking-wide text-stone-900">Profile complete %</th>
                    <th className="px-4 py-3 text-left text-label font-medium tracking-wide text-stone-900">Applications count</th>
                    <th className="px-4 py-3 text-left text-label font-medium tracking-wide text-stone-900">Role</th>
                    <th className="px-4 py-3 text-center text-label font-medium tracking-wide text-stone-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">{user.full_name || 'N/A'}</p>
                        <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-caption font-medium ${getStatusPillClass(user.status)}`}>
                          {String(user.status || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3" title={user.email}>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-stone-400" />
                          <span className="max-w-[16rem] truncate text-body-sm text-stone-700">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-stone-700">
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-stone-400" />
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-stone-700">{user.profile_completion_pct || 0}%</td>
                      <td className="px-4 py-3 text-body-sm text-stone-700">{Number(user.applications_count || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2 py-1 text-caption font-medium text-stone-700">
                          <Shield className="h-3.5 w-3.5" />
                          {String(user.role || 'user').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50"
                            onClick={() => setSelectedUser(user)}
                            title="View user"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                            onClick={() => patchUserStatus(user, 'deactivate')}
                            disabled={actionInProgress || user.status === 'inactive'}
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                            onClick={() => patchUserRole(user, user.role === 'admin' ? 'user' : 'admin')}
                            disabled={actionInProgress}
                            title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => patchUserStatus(user, 'ban')}
                            disabled={actionInProgress || user.status === 'banned'}
                            title="Ban user"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-body-sm text-stone-600">
              <p>Page {safePage} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h3 className="text-h3 font-medium text-stone-900">User profile</h3>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <p className="text-body-sm text-stone-700"><span className="font-medium text-stone-900">Name:</span> {selectedUser.full_name || 'N/A'}</p>
              <p className="text-body-sm text-stone-700"><span className="font-medium text-stone-900">Email:</span> {selectedUser.email || 'N/A'}</p>
              <p className="text-body-sm text-stone-700"><span className="font-medium text-stone-900">Phone:</span> {selectedUser.phone || 'N/A'}</p>
              <p className="text-body-sm text-stone-700"><span className="font-medium text-stone-900">Role:</span> {selectedUser.role || 'user'}</p>
              <p className="text-body-sm text-stone-700"><span className="font-medium text-stone-900">Registered:</span> {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-GB') : 'N/A'}</p>
              <p className="text-body-sm text-stone-700"><span className="font-medium text-stone-900">Profile completion:</span> {selectedUser.profile_completion_pct || 0}%</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// frontend/src/pages/admin/AdminSchemes.jsx
/**
 * Admin Schemes Management - CRUD operations for schemes
 * Features:
 * - List all schemes
 * - Add new scheme
 * - Edit scheme details
 * - Manage eligibility conditions
 * - Upload/manage scheme documents
 * - Archive/restore schemes
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  AlertCircle,
  Archive,
  Edit,
  Eye,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import api from '../../services/api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'

export default function AdminSchemes() {
  const { t } = useTranslation()
  const [schemes, setSchemes] = useState([])
  const [filteredSchemes, setFilteredSchemes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('active') // active, archived, all
  const [selectedScheme, setSelectedScheme] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    fetchSchemes()
  }, [])

  useEffect(() => {
    filterSchemes()
  }, [schemes, searchQuery, filterStatus])

  const fetchSchemes = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/admin/schemes', {
        params: { limit: 1000 },
      })
      setSchemes(res.data.schemes || [])
    } catch (err) {
      console.error('Error fetching schemes:', err)
      toast.error(t('admin.fetchError') || 'Failed to load schemes')
    } finally {
      setIsLoading(false)
    }
  }

  const filterSchemes = () => {
    let filtered = schemes

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (scheme) =>
          scheme.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scheme.ministry?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(
        (scheme) =>
          (filterStatus === 'active' && scheme.is_active) ||
          (filterStatus === 'archived' && !scheme.is_active)
      )
    }

    setFilteredSchemes(filtered)
  }

  const handleArchiveScheme = async (schemeId) => {
    if (!window.confirm('Archive this scheme? It will not appear in user listings.')) return

    try {
      setActionInProgress(true)
      await api.patch(`/admin/schemes/${schemeId}`, { is_active: false })
      toast.success('Scheme archived successfully')
      fetchSchemes()
    } catch (err) {
      console.error('Error archiving scheme:', err)
      toast.error('Failed to archive scheme')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleRestoreScheme = async (schemeId) => {
    if (!window.confirm('Restore this scheme? It will appear in user listings.')) return

    try {
      setActionInProgress(true)
      await api.patch(`/admin/schemes/${schemeId}`, { is_active: true })
      toast.success('Scheme restored successfully')
      fetchSchemes()
    } catch (err) {
      console.error('Error restoring scheme:', err)
      toast.error('Failed to restore scheme')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleDeleteScheme = async (schemeId) => {
    if (!window.confirm('Delete this scheme permanently? This cannot be undone.')) return

    try {
      setActionInProgress(true)
      await api.delete(`/admin/schemes/${schemeId}`)
      toast.success('Scheme deleted successfully')
      fetchSchemes()
    } catch (err) {
      console.error('Error deleting scheme:', err)
      toast.error('Failed to delete scheme')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scheme Management"
        description="Manage government schemes and eligibility metadata"
        actions={
          <Button
            onClick={() => {
              setSelectedScheme(null)
              setShowForm(true)
            }}
          >
            <Plus size={20} />
            Add New Scheme
          </Button>
        }
      />

      <Card className="border border-stone-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-stone-400" size={20} />
              <input
                type="text"
                placeholder="Search schemes by name or ministry..."
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
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
              <option value="all">All Schemes</option>
            </select>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredSchemes.length} of {schemes.length} schemes
          </div>
      </Card>

      <Card className="overflow-hidden border border-stone-200 p-0">
          {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : filteredSchemes.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-stone-400" />
            <p className="text-stone-600">No schemes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Scheme Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Ministry
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Benefit Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Conditions
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-900">
                      Applications
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-stone-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchemes.map((scheme) => (
                    <tr
                      key={scheme.id}
                    className="border-b border-stone-100 transition hover:bg-stone-50"
                    >
                      <td className="px-6 py-4">
                      <div className="font-medium text-stone-900">{scheme.name}</div>
                      <div className="text-xs text-stone-500">{scheme.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {scheme.ministry || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                      <span className="text-sm font-medium text-stone-900">
                          ₹
                          {scheme.benefit_amount
                            ? (scheme.benefit_amount / 100000).toFixed(1)
                            : 'Varies'}
                          L+
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            scheme.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {scheme.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {scheme.conditions_count || 0} conditions
                        </span>
                      </td>
                      <td className="px-6 py-4">
                      <span className="text-sm text-stone-600">
                          {scheme.applications_count || 0} apps
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedScheme(scheme)}
                          className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedScheme(scheme)
                              setShowForm(true)
                            }}
                          className="rounded-lg p-2 text-orange-600 transition hover:bg-orange-50"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          {scheme.is_active ? (
                            <button
                              onClick={() => handleArchiveScheme(scheme.id)}
                              disabled={actionInProgress}
                            className="rounded-lg p-2 text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
                              title="Archive"
                            >
                              <Archive size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestoreScheme(scheme.id)}
                              disabled={actionInProgress}
                            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 disabled:opacity-50"
                              title="Restore"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteScheme(scheme.id)}
                            disabled={actionInProgress}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={18} />
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

      {selectedScheme && !showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-6">
              <h3 className="text-2xl font-bold text-stone-900">Scheme Details</h3>
                <button
                  onClick={() => setSelectedScheme(null)}
                className="text-2xl text-stone-500 hover:text-stone-700"
                >
                  ✕
                </button>
              </div>

            <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                  <p className="text-sm text-stone-600">Scheme Name</p>
                  <p className="font-medium text-stone-900">{selectedScheme.name}</p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Ministry</p>
                  <p className="font-medium text-stone-900">
                      {selectedScheme.ministry || 'N/A'}
                    </p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Benefit Amount</p>
                  <p className="font-medium text-stone-900">
                      ₹{(selectedScheme.benefit_amount / 100000).toFixed(1)}L+
                    </p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Status</p>
                  <p className="font-medium text-stone-900">
                      {selectedScheme.is_active ? '✓ Active' : '✗ Archived'}
                    </p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">Sector</p>
                  <p className="font-medium text-stone-900">{selectedScheme.sector || 'N/A'}</p>
                  </div>
                  <div>
                  <p className="text-sm text-stone-600">State</p>
                  <p className="font-medium text-stone-900">{selectedScheme.state || 'All India'}</p>
                  </div>
                </div>

                <div>
                <p className="mb-2 text-sm text-stone-600">Description</p>
                <p className="text-stone-900">{selectedScheme.description || 'No description'}</p>
                </div>

              <div className="flex gap-2 border-t border-stone-200 pt-4">
                  <button
                    onClick={() => {
                      setShowForm(true)
                    }}
                  className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Edit Scheme
                  </button>
                  <button
                    onClick={() => setSelectedScheme(null)}
                  className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
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

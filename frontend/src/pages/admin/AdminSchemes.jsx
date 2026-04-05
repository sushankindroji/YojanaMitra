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
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Archive,
  RotateCcw,
  Loader,
  AlertCircle,
} from 'lucide-react'
import api from '../../services/api'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Scheme Management</h1>
            <p className="text-gray-600">Manage government schemes and eligibility conditions</p>
          </div>
          <button
            onClick={() => {
              setSelectedScheme(null)
              setShowForm(true)
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            Add New Scheme
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search schemes by name or ministry..."
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
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
              <option value="all">All Schemes</option>
            </select>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredSchemes.length} of {schemes.length} schemes
          </div>
        </div>

        {/* Schemes Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading schemes...</p>
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No schemes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Scheme Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Ministry
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Benefit Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Conditions
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Applications
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchemes.map((scheme) => (
                    <tr
                      key={scheme.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{scheme.name}</div>
                        <div className="text-xs text-gray-500">{scheme.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {scheme.ministry || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          ₹
                          {scheme.benefit_amount
                            ? (scheme.benefit_amount / 100000).toFixed(1)
                            : 'Varies'}
                          L+
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            scheme.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
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
                        <span className="text-sm text-gray-600">
                          {scheme.applications_count || 0} apps
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedScheme(scheme)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedScheme(scheme)
                              setShowForm(true)
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          {scheme.is_active ? (
                            <button
                              onClick={() => handleArchiveScheme(scheme.id)}
                              disabled={actionInProgress}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                              title="Archive"
                            >
                              <Archive size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestoreScheme(scheme.id)}
                              disabled={actionInProgress}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                              title="Restore"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteScheme(scheme.id)}
                            disabled={actionInProgress}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
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
        </div>

        {/* Scheme Details Modal */}
        {selectedScheme && !showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-96 overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-2xl font-bold text-gray-900">Scheme Details</h3>
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Scheme Name</p>
                    <p className="font-medium text-gray-900">{selectedScheme.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ministry</p>
                    <p className="font-medium text-gray-900">
                      {selectedScheme.ministry || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Benefit Amount</p>
                    <p className="font-medium text-gray-900">
                      ₹{(selectedScheme.benefit_amount / 100000).toFixed(1)}L+
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium text-gray-900">
                      {selectedScheme.is_active ? '✓ Active' : '✗ Archived'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sector</p>
                    <p className="font-medium text-gray-900">{selectedScheme.sector || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">State</p>
                    <p className="font-medium text-gray-900">{selectedScheme.state || 'All India'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Description</p>
                  <p className="text-gray-900">{selectedScheme.description || 'No description'}</p>
                </div>

                <div className="pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => {
                      setShowForm(true)
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
                  >
                    Edit Scheme
                  </button>
                  <button
                    onClick={() => setSelectedScheme(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
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

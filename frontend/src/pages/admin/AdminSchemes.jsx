import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit,
  Search,
} from 'lucide-react'
import api from '../../services/api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'

const toCsv = (rows) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ].join('\n')
}

export default function AdminSchemes() {
  const [schemes, setSchemes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [editScheme, setEditScheme] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  const fetchSchemes = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/admin/schemes', { params: { limit: 1000 } })
      setSchemes(Array.isArray(response.data?.schemes) ? response.data.schemes : [])
    } catch {
      toast.error('Failed to load schemes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchemes()
  }, [])

  const filteredSchemes = useMemo(() => {
    let output = [...schemes]

    if (search.trim()) {
      const query = search.trim().toLowerCase()
      output = output.filter((scheme) => {
        const name = String(scheme.name || '').toLowerCase()
        const ministry = String(scheme.ministry || '').toLowerCase()
        return name.includes(query) || ministry.includes(query)
      })
    }

    if (sectorFilter !== 'all') {
      output = output.filter((scheme) => String(scheme.sector || '') === sectorFilter)
    }

    if (stateFilter !== 'all') {
      output = output.filter((scheme) => String(scheme.state || '') === stateFilter)
    }

    if (activeFilter !== 'all') {
      const shouldBeActive = activeFilter === 'active'
      output = output.filter((scheme) => Boolean(scheme.is_active) === shouldBeActive)
    }

    return output
  }, [schemes, search, sectorFilter, stateFilter, activeFilter])

  const sectors = useMemo(
    () => [...new Set(schemes.map((scheme) => scheme.sector).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [schemes]
  )
  const states = useMemo(
    () => [...new Set(schemes.map((scheme) => scheme.state).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [schemes]
  )

  const missingPortalCount = schemes.filter((scheme) => !String(scheme.official_portal_url || '').trim()).length
  const missingEligibilityCount = schemes.filter((scheme) => Number(scheme.conditions_count || 0) === 0).length

  const toggleSchemeActive = async (scheme, nextState) => {
    try {
      setActionBusy(true)
      await api.patch(`/admin/schemes/${scheme.id}`, { is_active: nextState })
      toast.success(nextState ? 'Scheme activated' : 'Scheme deactivated')
      await fetchSchemes()
    } catch {
      toast.error('Failed to update scheme status')
    } finally {
      setActionBusy(false)
    }
  }

  const runBulkToggle = async (nextState) => {
    if (selectedIds.length === 0) {
      toast.warning('Select at least one scheme first')
      return
    }

    const confirmed = window.confirm(
      nextState
        ? `Activate ${selectedIds.length} selected schemes?`
        : `Deactivate ${selectedIds.length} selected schemes?`
    )
    if (!confirmed) return

    try {
      setActionBusy(true)
      await Promise.all(
        selectedIds.map((id) => api.patch(`/admin/schemes/${id}`, { is_active: nextState }))
      )
      toast.success(nextState ? 'Selected schemes activated' : 'Selected schemes deactivated')
      setSelectedIds([])
      await fetchSchemes()
    } catch {
      toast.error('Failed to update selected schemes')
    } finally {
      setActionBusy(false)
    }
  }

  const exportCsv = () => {
    const rows = filteredSchemes.map((scheme) => ({
      name: scheme.name,
      ministry: scheme.ministry,
      sector: scheme.sector,
      state: scheme.state,
      benefit_amount: scheme.benefit_amount,
      active: scheme.is_active ? 'yes' : 'no',
      portal_url: scheme.official_portal_url || '',
      eligibility_rules_count: scheme.conditions_count || 0,
    }))

    const csv = toCsv(rows)
    if (!csv) {
      toast.warning('No rows available for export')
      return
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'admin-schemes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const selectedSet = new Set(selectedIds)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scheme Management"
        description="Review scheme metadata quality and activation status"
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card className="border border-amber-200 bg-amber-50">
        <div className="flex flex-wrap items-center gap-2 text-body-sm text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <p>Missing portal URL: {missingPortalCount.toLocaleString('en-IN')}</p>
          <span>•</span>
          <p>Missing eligibility rules: {missingEligibilityCount.toLocaleString('en-IN')}</p>
        </div>
      </Card>

      <Card className="border border-stone-200">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by scheme name or ministry"
              className="h-10 w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className="h-10 rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="all">All sectors</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>

          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="h-10 rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="all">All states</option>
            {states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)} className="h-10 rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => runBulkToggle(true)} disabled={actionBusy || selectedIds.length === 0}>Activate selected</Button>
          <Button variant="ghost" size="sm" onClick={() => runBulkToggle(false)} disabled={actionBusy || selectedIds.length === 0}>Deactivate selected</Button>
          <span className="text-body-sm text-stone-600">{selectedIds.length} selected</span>
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
          <div className="p-8 text-center text-body-sm text-stone-600">No schemes found for current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredSchemes.length}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedIds(filteredSchemes.map((scheme) => scheme.id))
                        } else {
                          setSelectedIds([])
                        }
                      }}
                      aria-label="Select all schemes"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">Name</th>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">Ministry</th>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">Sector</th>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">State</th>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">Benefit</th>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">Active</th>
                  <th className="px-3 py-3 text-left text-label font-medium tracking-wide text-stone-900">Portal URL</th>
                  <th className="px-3 py-3 text-center text-label font-medium tracking-wide text-stone-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchemes.map((scheme) => {
                  const checked = selectedSet.has(scheme.id)
                  return (
                    <tr key={scheme.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedIds((prev) => [...prev, scheme.id])
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== scheme.id))
                            }
                          }}
                          aria-label={`Select ${scheme.name}`}
                        />
                      </td>
                      <td className="px-3 py-3 text-body-sm font-medium text-stone-900" title={scheme.name}>{scheme.name}</td>
                      <td className="px-3 py-3 text-body-sm text-stone-700" title={scheme.ministry}>{scheme.ministry || 'N/A'}</td>
                      <td className="px-3 py-3 text-body-sm text-stone-700">{scheme.sector || 'N/A'}</td>
                      <td className="px-3 py-3 text-body-sm text-stone-700">{scheme.state || 'Central'}</td>
                      <td className="px-3 py-3 text-body-sm text-stone-700">
                        {Number(scheme.benefit_amount || 0) > 0
                          ? `₹${Number(scheme.benefit_amount).toLocaleString('en-IN')}`
                          : 'Not specified'}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSchemeActive(scheme, !scheme.is_active)}
                          className={`rounded-full border px-2 py-1 text-caption font-medium ${
                            scheme.is_active
                              ? 'border-green-200 bg-green-100 text-green-800'
                              : 'border-stone-200 bg-stone-100 text-stone-700'
                          }`}
                        >
                          {scheme.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-body-sm text-stone-700">
                        {scheme.official_portal_url ? (
                          <a href={scheme.official_portal_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800">
                            Open
                          </a>
                        ) : (
                          <span className="text-red-700">Missing</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditScheme(scheme)}
                            className="rounded-md p-1.5 text-orange-700 hover:bg-orange-50"
                            title="Edit scheme"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {Number(scheme.conditions_count || 0) > 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-700" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-700" />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editScheme ? (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-0 md:p-4">
          <div className="h-full w-full max-w-lg bg-white p-5 shadow-xl md:h-auto md:rounded-2xl">
            <h3 className="text-h3 font-medium text-stone-900">Edit scheme</h3>
            <p className="mt-1 text-body-sm text-stone-600">{editScheme.name}</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Portal URL</span>
                <input
                  type="text"
                  value={editScheme.official_portal_url || ''}
                  onChange={(event) => setEditScheme((prev) => ({ ...prev, official_portal_url: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Active</span>
                <select
                  value={editScheme.is_active ? 'active' : 'inactive'}
                  onChange={(event) => setEditScheme((prev) => ({ ...prev, is_active: event.target.value === 'active' }))}
                  className="h-10 w-full rounded-lg border border-stone-300 px-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    await api.patch(`/admin/schemes/${editScheme.id}`, {
                      official_portal_url: editScheme.official_portal_url || null,
                      is_active: Boolean(editScheme.is_active),
                    })
                    toast.success('Scheme updated')
                    setEditScheme(null)
                    await fetchSchemes()
                  } catch {
                    toast.error('Failed to update scheme')
                  }
                }}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditScheme(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Edit, FileText, Loader2, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import ApiService from '../../../layers/application/services/ApiService'
import APP_CONFIG from '../../../config/app.config'
import SeasonPlayerRegistrationForm from '../components/SeasonPlayerRegistrationForm'
import RegistrationStatusBadge from '../components/RegistrationStatusBadge'
import RejectReasonView from '../components/RejectReasonView'

const toDateInputValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const PlayerRegistrationsPage = ({ currentUser }) => {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const [editing, setEditing] = useState(null)
  const [editFile, setEditFile] = useState(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    date_of_birth: '',
    nationality: '',
    position_code: '',
    shirt_number: '',
    player_type: 'domestic'
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      const params = filterStatus ? { status: filterStatus } : {}
      const data = await ApiService.get(APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.LIST, params)
      setRegistrations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load registrations', err)
      toast.error(err?.message || 'Unable to load registrations.')
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  const openPdf = (path) => {
    if (!path) return
    const normalized = String(path).replace(/\\/g, '/')
    window.open(`/${normalized}`, '_blank')
  }

  const canEdit = (item) => String(item?.registration_status ?? '').toLowerCase() === 'pending'

  const openEditModal = (item) => {
    setEditing(item)
    setEditFile(null)
    setEditForm({
      full_name: item.player_name || '',
      date_of_birth: toDateInputValue(item.date_of_birth),
      nationality: item.nationality || '',
      position_code: item.position_code || '',
      shirt_number: item.shirt_number ?? '',
      player_type: item.player_type || 'domestic'
    })
  }

  const closeEditModal = () => {
    setEditing(null)
    setEditFile(null)
  }

  const submitUpdate = async (e) => {
    e.preventDefault()
    if (!editing?.id) return

    setSubmitting(true)
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.UPDATE.replace(':id', editing.id)
      await ApiService.upload(
        endpoint,
        editFile,
        {
          full_name: editForm.full_name,
          date_of_birth: editForm.date_of_birth,
          nationality: editForm.nationality || null,
          position_code: editForm.position_code,
          shirt_number: editForm.shirt_number === '' ? null : Number(editForm.shirt_number),
          player_type: editForm.player_type
        },
        { method: 'PUT' }
      )

      toast.success('Registration updated.')
      closeEditModal()
      fetchRegistrations()
    } catch (err) {
      console.error('Failed to update registration', err)
      toast.error(err?.message || 'Unable to update registration.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = useMemo(() => {
    return registrations.filter((item) => String(item.registration_status ?? '').toLowerCase() === 'pending').length
  }, [registrations])

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Player Registration</h1>
          <p className="text-gray-400 mt-1">
            Create and track player registrations for your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-900/30 text-blue-200 border border-blue-800 text-sm font-semibold px-4 py-1.5 rounded-full">
            {pendingCount} pending
          </div>
          <div className="w-44">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <SeasonPlayerRegistrationForm currentUser={currentUser} onSuccess={fetchRegistrations} />

      <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">My registrations</h2>
          {loading && (
            <div className="flex items-center text-gray-300 text-sm">
              <Loader2 size={16} className="animate-spin mr-2" />
              Loading...
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/50 text-gray-300">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Player</th>
                <th className="px-6 py-3 text-left font-semibold">Team</th>
                <th className="px-6 py-3 text-left font-semibold">Season</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-left font-semibold">Doc</th>
                <th className="px-6 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {!loading && registrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-300">
                    No registrations found.
                  </td>
                </tr>
              )}

              {registrations.map((item) => (
                <tr key={item.id} className="hover:bg-gray-900/40">
                  <td className="px-6 py-4 text-gray-100">
                    <div className="font-semibold">{item.player_name}</div>
                    <div className="text-xs text-gray-400">
                      {item.position_code || '—'} · #{item.shirt_number ?? '—'} · {item.player_type || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-200">{item.team_name}</td>
                  <td className="px-6 py-4 text-gray-200">{item.season_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <RegistrationStatusBadge status={item.registration_status} />
                      {String(item.registration_status ?? '').toLowerCase() === 'rejected' && item.reject_reason && (
                        <RejectReasonView reason={item.reject_reason} />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.file_path ? (
                      <button
                        type="button"
                        onClick={() => openPdf(item.file_path)}
                        className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"
                      >
                        <FileText size={16} />
                        View
                      </button>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canEdit(item) ? (
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
              <h3 className="text-lg font-bold text-white">Edit registration</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Full name</label>
                  <input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Date of birth</label>
                  <input
                    type="date"
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Nationality</label>
                  <input
                    value={editForm.nationality}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nationality: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Player type</label>
                  <select
                    value={editForm.player_type}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, player_type: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="domestic">Domestic</option>
                    <option value="foreign">Foreign</option>
                    <option value="u21">U21</option>
                    <option value="u23">U23</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Position</label>
                  <input
                    value={editForm.position_code}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, position_code: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Shirt number</label>
                  <input
                    type="number"
                    value={editForm.shirt_number}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, shirt_number: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Replace PDF (optional)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerRegistrationsPage


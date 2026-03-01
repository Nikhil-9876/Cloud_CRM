import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Button from '../components/Button'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STATUSES = ['All', 'New', 'Contacted', 'Qualified', 'Dropped']
const SOURCES = ['Website', 'Cold Call', 'Referral', 'Social Media', 'Other']

const statusColors = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-yellow-100 text-yellow-700',
  Qualified: 'bg-green-100 text-green-700',
  Dropped: 'bg-red-100 text-red-700',
}

const emptyForm = { name: '', email: '', source: 'Website', status: 'New', assigned_to: '', notes: '' }

const Leads = () => {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchLeads = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/leads')
      setLeads(data ?? [])
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, [])

  const filtered = tab === 'All' ? leads : leads.filter((l) => l.status === tab)

  const openAdd = () => {
    setEditLead(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (l) => {
    setEditLead(l)
    setForm({
      name: l.name ?? '',
      email: l.email ?? '',
      source: l.source ?? 'Website',
      status: l.status ?? 'New',
      assigned_to: l.assigned_to ?? '',
      notes: l.notes ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (editLead) {
        await api.put(`/leads/${editLead.id}`, form)
        toast.success('Lead updated!')
      } else {
        await api.post('/leads', form)
        toast.success('Lead added!')
      }
      setModalOpen(false)
      fetchLeads()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return
    try {
      await api.delete(`/leads/${id}`)
      toast.success('Lead deleted')
      fetchLeads()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/leads/${id}`, { status })
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
      toast.success('Status updated')
    } catch (err) {
      toast.error(err.message)
    }
  }

  // AUTOMATION: one-click convert a lead into a Contact
  const handleConvert = async (lead) => {
    if (!confirm(`Convert "${lead.name}" to a Contact?\n\nThis will create a new Contact and mark the lead as Qualified.`)) return
    try {
      await api.post(`/leads/${lead.id}/convert`, {})
      toast.success(`"${lead.name}" converted to Contact!`)
      fetchLeads()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{leads.length} total leads</p>
        </div>
        <Button onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Lead
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
            <span className="ml-1.5 text-xs text-gray-400">
              {s === 'All' ? leads.length : leads.filter((l) => l.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <Skeleton.Table rows={5} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLeads} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <EmptyState
            title={tab !== 'All' ? `No ${tab} leads` : 'No leads yet'}
            description={tab !== 'All' ? `No leads with status "${tab}" found.` : 'Start tracking potential customers by adding your first lead.'}
            action={tab === 'All' && <Button onClick={openAdd} size="sm">Add Lead</Button>}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Source</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Assigned To</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Created</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{l.name}</td>
                    <td className="px-6 py-3 text-gray-500">{l.email || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{l.source || '—'}</td>
                    <td className="px-6 py-3">
                      <select
                        value={l.status}
                        onChange={(e) => handleStatusChange(l.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${statusColors[l.status] ?? 'bg-gray-100 text-gray-700'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUSES.slice(1).map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{l.assigned_to || '—'}</td>
                    <td className="px-6 py-3 text-gray-400">{format(new Date(l.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {l.status !== 'Dropped' && (
                          <button onClick={() => handleConvert(l)} className="text-gray-400 hover:text-green-600 transition-colors p-1" title="Convert to Contact">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          </button>
                        )}
                        <button onClick={() => openEdit(l)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(l.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {filtered.map((l) => (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{l.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{l.email || l.source || '—'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${statusColors[l.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {l.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-50">
                  {l.status !== 'Dropped' && (
                    <button onClick={() => handleConvert(l)} className="flex-1 text-center text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg py-1.5 transition-colors">Convert</button>
                  )}
                  <button onClick={() => openEdit(l)} className="flex-1 text-center text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(l.id)} className="flex-1 text-center text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg py-1.5 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editLead ? 'Edit Lead' : 'Add Lead'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {STATUSES.slice(1).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <input
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{editLead ? 'Update' : 'Add Lead'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Leads

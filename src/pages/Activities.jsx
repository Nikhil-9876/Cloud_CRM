import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { format, isPast, parseISO } from 'date-fns'

const TYPES = ['All', 'Call', 'Email', 'Meeting', 'Note']

const typeColors = {
  Call: 'bg-blue-100 text-blue-700',
  Email: 'bg-purple-100 text-purple-700',
  Meeting: 'bg-green-100 text-green-700',
  Note: 'bg-yellow-100 text-yellow-700',
}

const emptyForm = {
  type: 'Call',
  title: '',
  description: '',
  contact_id: '',
  deal_id: '',
  due_date: '',
  done: false,
}

const Activities = () => {
  const [activities, setActivities] = useState([])
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editActivity, setEditActivity] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const data = await api.get('/activities')
      setActivities(data ?? [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
    Promise.all([
      api.get('/contacts'),
      api.get('/deals'),
    ]).then(([contactsData, dealsData]) => {
      setContacts(contactsData ?? [])
      setDeals(dealsData ?? [])
    }).catch(() => {})
  }, [])

  const filtered = tab === 'All' ? activities : activities.filter((a) => a.type === tab)

  const isOverdue = (a) => a.due_date && !a.done && isPast(parseISO(a.due_date))

  const openAdd = () => {
    setEditActivity(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (a) => {
    setEditActivity(a)
    setForm({
      type: a.type ?? 'Call',
      title: a.title ?? '',
      description: a.description ?? '',
      contact_id: a.contact_id ?? '',
      deal_id: a.deal_id ?? '',
      due_date: a.due_date ?? '',
      done: a.done ?? false,
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      contact_id: form.contact_id || null,
      deal_id: form.deal_id || null,
      due_date: form.due_date || null,
    }
    try {
      if (editActivity) {
        await api.put(`/activities/${editActivity.id}`, payload)
        toast.success('Activity updated!')
      } else {
        await api.post('/activities', payload)
        toast.success('Activity added!')
      }
      setModalOpen(false)
      fetchActivities()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDone = async (a) => {
    const newDone = !a.done
    setActivities((prev) => prev.map((x) => x.id === a.id ? { ...x, done: newDone } : x))
    try {
      await api.put(`/activities/${a.id}`, { done: newDone })
      toast.success(newDone ? 'Marked as done' : 'Marked as pending')
    } catch (err) {
      toast.error(err.message)
      fetchActivities()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this activity?')) return
    try {
      await api.delete(`/activities/${id}`)
      toast.success('Activity deleted')
      fetchActivities()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-500 mt-1">{activities.length} total activities</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Activity
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            <span className="ml-1.5 text-xs text-gray-400">
              {t === 'All' ? activities.length : activities.filter((a) => a.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
            No activities found
          </div>
        ) : (
          filtered.map((a) => {
            const overdue = isOverdue(a)
            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-4 transition-all ${
                  overdue ? 'border-red-200 bg-red-50' : 'border-gray-100'
                }`}
              >
                {/* Done checkbox */}
                <button
                  onClick={() => handleToggleDone(a)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    a.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-500'
                  }`}
                  title={a.done ? 'Mark as pending' : 'Mark as done'}
                >
                  {a.done && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Type badge */}
                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap mt-0.5 ${typeColors[a.type] ?? 'bg-gray-100 text-gray-700'}`}>
                  {a.type}
                </span>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${a.done ? 'line-through text-gray-400' : overdue ? 'text-red-800' : 'text-gray-900'}`}>
                    {a.title}
                    {overdue && <span className="ml-2 text-xs font-normal text-red-500">Overdue</span>}
                  </p>
                  {a.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {a.contacts && (
                      <span className="text-xs text-gray-400">
                        👤 {a.contacts.first_name} {a.contacts.last_name}
                      </span>
                    )}
                    {a.deals && (
                      <span className="text-xs text-gray-400">
                        💼 {a.deals.title}
                      </span>
                    )}
                    {a.due_date && (
                      <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        📅 {format(parseISO(a.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editActivity ? 'Edit Activity' : 'Add Activity'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {TYPES.slice(1).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <select
                value={form.contact_id}
                onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal</label>
              <select
                value={form.deal_id}
                onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">— None —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="done"
              checked={form.done}
              onChange={(e) => setForm({ ...form, done: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="done" className="text-sm font-medium text-gray-700">Mark as done</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors">
              {saving ? 'Saving…' : editActivity ? 'Update' : 'Add Activity'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Activities

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Button from '../components/Button'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { toCSV, downloadCSV, parseCSV, readFileAsText } from '../lib/csv'

const ContactsIcon = () => (
  <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', company_name: '', notes: '' }

const CSV_COLUMNS = [
  { key: 'first_name',   label: 'First Name' },
  { key: 'last_name',    label: 'Last Name' },
  { key: 'email',        label: 'Email' },
  { key: 'phone',        label: 'Phone' },
  { key: 'company_name', label: 'Company' },
  { key: 'notes',        label: 'Notes' },
]

const Contacts = () => {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const importRef = useRef(null)

  const handleExport = () => {
    if (!contacts.length) { toast.error('No contacts to export'); return }
    const csv = toCSV(contacts, CSV_COLUMNS)
    downloadCSV(csv, `contacts-${new Date().toISOString().slice(0,10)}.csv`)
    toast.success(`Exported ${contacts.length} contacts`)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await readFileAsText(file)
      const { rows } = parseCSV(text)
      if (!rows.length) { toast.error('No rows found in CSV'); return }
      let success = 0, failed = 0
      for (const row of rows) {
        const first = row['First Name'] ?? row['first_name'] ?? ''
        const last  = row['Last Name']  ?? row['last_name']  ?? ''
        if (!first.trim() && !last.trim()) { failed++; continue }
        try {
          await api.post('/contacts', {
            first_name:   first.trim(),
            last_name:    last.trim(),
            email:        row['Email']   ?? row['email']   ?? '',
            phone:        row['Phone']   ?? row['phone']   ?? '',
            company_name: row['Company'] ?? row['company_name'] ?? '',
            notes:        row['Notes']   ?? row['notes']   ?? '',
          })
          success++
        } catch { failed++ }
      }
      toast.success(`Imported ${success} contacts${failed ? ` (${failed} skipped)` : ''}`)
      fetchContacts()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  const fetchContacts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/contacts')
      setContacts(data ?? [])
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchContacts() }, [])

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.company_name ?? '').toLowerCase().includes(q)
    )
  })

  const openAdd = () => {
    setEditContact(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (c, e) => {
    e?.stopPropagation()
    setEditContact(c)
    setForm({
      first_name: c.first_name ?? '',
      last_name: c.last_name ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      company_name: c.company_name ?? '',
      notes: c.notes ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First name and last name are required')
      return
    }
    setSaving(true)
    try {
      if (editContact) {
        await api.put(`/contacts/${editContact.id}`, form)
        toast.success('Contact updated!')
      } else {
        await api.post('/contacts', form)
        toast.success('Contact added!')
      }
      setModalOpen(false)
      fetchContacts()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Delete this contact?')) return
    try {
      await api.delete(`/contacts/${id}`)
      toast.success('Contact deleted')
      fetchContacts()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">{contacts.length} total contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="secondary" size="sm" loading={importing} onClick={() => importRef.current?.click()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
          <Button onClick={openAdd}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or company…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton.Table rows={6} cols={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchContacts} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <EmptyState
            icon={<ContactsIcon />}
            title={search ? 'No contacts match your search' : 'No contacts yet'}
            description={search ? 'Try a different name or company.' : 'Add your first contact to start building your network.'}
            action={!search && <Button onClick={openAdd} size="sm">Add Contact</Button>}
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
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Phone</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Company</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Created</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/contacts/${c.id}`)}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{c.email || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{c.company_name || '—'}</td>
                    <td className="px-6 py-3 text-gray-400">{format(new Date(c.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={(e) => openEdit(c, e)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(c.id, e)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
            {filtered.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer"
                onClick={() => navigate(`/contacts/${c.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base flex-shrink-0">
                      {c.first_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.company_name || c.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={(e) => openEdit(c, e)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={(e) => handleDelete(c.id, e)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editContact ? 'Edit Contact' : 'Add Contact'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
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
            <Button type="submit" loading={saving} className="flex-1">{editContact ? 'Update' : 'Add Contact'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Contacts

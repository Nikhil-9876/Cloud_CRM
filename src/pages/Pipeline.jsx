import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import Button from '../components/Button'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STAGES = ['Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won', 'Lost']

const stageColors = {
  Lead: 'border-gray-300',
  Contacted: 'border-blue-300',
  'Proposal Sent': 'border-yellow-300',
  Negotiation: 'border-orange-300',
  Won: 'border-green-400',
  Lost: 'border-red-300',
}

const stageHeaderColors = {
  Lead: 'bg-gray-100 text-gray-700',
  Contacted: 'bg-blue-100 text-blue-700',
  'Proposal Sent': 'bg-yellow-100 text-yellow-700',
  Negotiation: 'bg-orange-100 text-orange-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
}

const emptyForm = {
  title: '',
  value: '',
  stage: 'Lead',
  contact_id: '',
  expected_close_date: '',
  notes: '',
}

const DealCard = ({ deal, onDelete, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  })

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    opacity: isDragging ? 0.3 : 1,
  } : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-sm font-semibold text-gray-900 flex-1 cursor-pointer hover:text-blue-600"
          onClick={(e) => { e.stopPropagation(); onClick(deal) }}
        >
          {deal.title}
        </p>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(deal.id) }}
          className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {deal.contacts && (
        <p className="text-xs text-gray-500 mt-1">
          {deal.contacts.first_name} {deal.contacts.last_name}
        </p>
      )}
      <p className="text-sm font-bold text-gray-800 mt-2">
        ${Number(deal.value ?? 0).toLocaleString()}
      </p>
    </div>
  )
}

const KanbanColumn = ({ stage, deals, onDelete, onDealClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const total = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border-2 ${stageColors[stage]} ${isOver ? 'ring-2 ring-blue-400' : ''} bg-gray-50 min-h-[400px] w-64 flex-shrink-0`}
    >
      <div className={`px-4 py-3 rounded-t-xl ${stageHeaderColors[stage]}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{stage}</span>
          <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full">{deals.length}</span>
        </div>
        <p className="text-xs mt-0.5 opacity-70">${total.toLocaleString()}</p>
      </div>
      <div className="flex-1 p-3 space-y-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onDelete={onDelete} onClick={onDealClick} />
        ))}
      </div>
    </div>
  )
}

const DealDetailModal = ({ deal, open, onClose, activities }) => {
  if (!deal) return null
  return (
    <Modal open={open} onClose={onClose} title="Deal Details">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{deal.title}</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">${Number(deal.value ?? 0).toLocaleString()}</p>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2"><dt className="text-gray-500 w-32">Stage</dt><dd className="font-medium text-gray-800">{deal.stage}</dd></div>
          <div className="flex gap-2"><dt className="text-gray-500 w-32">Contact</dt><dd className="font-medium text-gray-800">{deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : '—'}</dd></div>
          <div className="flex gap-2"><dt className="text-gray-500 w-32">Close Date</dt><dd className="font-medium text-gray-800">{deal.expected_close_date ? format(new Date(deal.expected_close_date), 'MMM d, yyyy') : '—'}</dd></div>
          {deal.notes && <div className="pt-2 border-t border-gray-100"><dt className="text-gray-500 mb-1">Notes</dt><dd className="text-gray-700 whitespace-pre-wrap">{deal.notes}</dd></div>}
        </dl>
        {activities.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Activities ({activities.length})</h4>
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.type}
                  </span>
                  <span className="text-gray-700">{a.title}</span>
                  {a.due_date && <span className="text-gray-400 text-xs ml-auto">{format(new Date(a.due_date), 'MMM d')}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

const Pipeline = () => {
  const [deals, setDeals] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailDeal, setDetailDeal] = useState(null)
  const [detailActivities, setDetailActivities] = useState([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeDragId, setActiveDragId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const fetchDeals = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/deals')
      setDeals(data ?? [])
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
    api.get('/contacts').then((data) => setContacts(data ?? [])).catch(() => {})
  }, [])

  const dealsByStage = (stage) => deals.filter((d) => d.stage === stage)

  const handleDragStart = ({ active }) => setActiveDragId(active.id)

  const handleDragEnd = async ({ active, over }) => {
    setActiveDragId(null)
    if (!over) return
    const newStage = over.id
    const deal = deals.find((d) => d.id === active.id)
    if (!deal || deal.stage === newStage) return
    // Optimistic update
    setDeals((prev) => prev.map((d) => d.id === active.id ? { ...d, stage: newStage } : d))
    try {
      await api.put(`/deals/${active.id}`, { stage: newStage })
      toast.success(`Moved to ${newStage}`)
      // Lambda auto-creates follow-up activity for key stage transitions
      if (['Proposal Sent', 'Negotiation', 'Won'].includes(newStage)) {
        toast.success(`Follow-up activity created automatically`)
      }
    } catch (err) {
      toast.error(err.message)
      fetchDeals()
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await api.post('/deals', {
        ...form,
        value: form.value ? Number(form.value) : 0,
        contact_id: form.contact_id || null,
        expected_close_date: form.expected_close_date || null,
      })
      toast.success('Deal added!')
      setModalOpen(false)
      setForm(emptyForm)
      fetchDeals()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this deal?')) return
    try {
      await api.delete(`/deals/${id}`)
      toast.success('Deal deleted')
      fetchDeals()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDealClick = async (deal) => {
    setDetailDeal(deal)
    try {
      const data = await api.get(`/deals/${deal.id}/activities`)
      setDetailActivities(data ?? [])
    } catch {
      setDetailActivities([])
    }
    setDetailOpen(true)
  }

  const activeDeal = activeDragId ? deals.find((d) => d.id === activeDragId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1">Drag deals between stages</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setModalOpen(true) }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Deal
        </Button>
      </div>

      {loading ? (
        <Skeleton.Kanban cols={6} cardsPerCol={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDeals} />
      ) : (
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <p className="text-xs text-gray-400 mb-2 md:hidden">← Scroll horizontally to see all stages</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max">
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  deals={dealsByStage(stage)}
                  onDelete={handleDelete}
                  onDealClick={handleDealClick}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDeal && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-3 w-60 rotate-2 opacity-90">
                  <p className="text-sm font-semibold text-gray-900">{activeDeal.title}</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">${Number(activeDeal.value ?? 0).toLocaleString()}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Add Deal Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Deal">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
              <input
                type="number"
                min="0"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
            <input
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
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
            <Button type="submit" loading={saving} className="flex-1">Add Deal</Button>
          </div>
        </form>
      </Modal>

      {/* Deal Detail Modal */}
      <DealDetailModal
        deal={detailDeal}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        activities={detailActivities}
      />
    </div>
  )
}

export default Pipeline

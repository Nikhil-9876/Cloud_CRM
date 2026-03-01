import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const typeColors = {
  Call: 'bg-blue-100 text-blue-700',
  Email: 'bg-purple-100 text-purple-700',
  Meeting: 'bg-green-100 text-green-700',
  Note: 'bg-yellow-100 text-yellow-700',
}

const stageColors = {
  Lead: 'bg-gray-100 text-gray-700',
  Contacted: 'bg-blue-100 text-blue-700',
  'Proposal Sent': 'bg-yellow-100 text-yellow-700',
  Negotiation: 'bg-orange-100 text-orange-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
}

const ContactDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState(null)
  const [deals, setDeals] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [contactData, dealsData, activitiesData] = await Promise.all([
        api.get(`/contacts/${id}`),
        api.get(`/contacts/${id}/deals`),
        api.get(`/contacts/${id}/activities`),
      ])
      setContact(contactData)
      setDeals(dealsData ?? [])
      setActivities(activitiesData ?? [])
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [id])

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/contacts')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton.Section lines={5} />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton.Section lines={3} />
            <Skeleton.Section lines={4} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/contacts')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-gray-400">Contact Details</span>
        </div>
        <ErrorState message={error} onRetry={fetchAll} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/contacts')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {contact.first_name} {contact.last_name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                {contact.first_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{contact.first_name} {contact.last_name}</h2>
                <p className="text-sm text-gray-500">{contact.company_name || 'No company'}</p>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 flex-shrink-0">Email</dt>
                <dd className="text-gray-800 font-medium truncate">{contact.email || '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 flex-shrink-0">Phone</dt>
                <dd className="text-gray-800 font-medium">{contact.phone || '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 flex-shrink-0">Company</dt>
                <dd className="text-gray-800 font-medium">{contact.company_name || '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 flex-shrink-0">Added</dt>
                <dd className="text-gray-800 font-medium">{format(new Date(contact.created_at), 'MMM d, yyyy')}</dd>
              </div>
              {contact.notes && (
                <div className="pt-3 border-t border-gray-100">
                  <dt className="text-gray-500 mb-1">Notes</dt>
                  <dd className="text-gray-700 text-sm whitespace-pre-wrap">{contact.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right column: deals + activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deals */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Linked Deals ({deals.length})</h3>
            {deals.length === 0 ? (
              <p className="text-gray-400 text-sm">No deals linked</p>
            ) : (
              <div className="space-y-3">
                {deals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.title}</p>
                      {d.expected_close_date && (
                        <p className="text-xs text-gray-400 mt-0.5">Close: {format(new Date(d.expected_close_date), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stageColors[d.stage] ?? 'bg-gray-100 text-gray-700'}`}>
                        {d.stage}
                      </span>
                      <span className="text-sm font-bold text-gray-800">
                        ${Number(d.value ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activities Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Activity Timeline ({activities.length})</h3>
            {activities.length === 0 ? (
              <p className="text-gray-400 text-sm">No activities linked</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />
                <div className="space-y-4">
                  {activities.map((a) => (
                    <div key={a.id} className="relative flex items-start gap-4 pl-10">
                      {/* Dot */}
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${typeColors[a.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {a.type?.[0]}
                      </div>
                      <div className={`flex-1 p-3 rounded-xl border ${a.done ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${a.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{a.title}</p>
                            {a.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.description}</p>}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[a.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {a.type}
                            </span>
                            {a.due_date && (
                              <p className="text-xs text-gray-400 mt-1">{format(new Date(a.due_date), 'MMM d, yyyy')}</p>
                            )}
                          </div>
                        </div>
                        {a.done && (
                          <div className="flex items-center gap-1 mt-2">
                            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-green-600 font-medium">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactDetail

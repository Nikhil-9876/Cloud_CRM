import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    contacts: null,
    leads: null,
    openDeals: null,
    wonThisMonth: null,
    pendingActivities: null,
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [overdueDeals, setOverdueDeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const data = await api.get('/dashboard/stats')
        setStats({
          contacts:          data.contacts,
          leads:             data.leads,
          openDeals:         data.openDeals,
          wonThisMonth:      data.wonThisMonth,
          pendingActivities: data.pendingActivities,
        })
        setRecentActivities(data.recentActivities ?? [])
        setOverdueDeals(data.overdueDeals ?? [])
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const typeColors = {
    Call: 'bg-blue-100 text-blue-700',
    Email: 'bg-purple-100 text-purple-700',
    Meeting: 'bg-green-100 text-green-700',
    Note: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your CRM at a glance</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            <StatCard
              label="Total Contacts"
              value={stats.contacts}
              color="bg-blue-50"
              icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            />
            <StatCard
              label="Total Leads"
              value={stats.leads}
              color="bg-purple-50"
              icon={<svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <StatCard
              label="Open Deals"
              value={stats.openDeals}
              color="bg-orange-50"
              icon={<svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            />
            <StatCard
              label="Won This Month"
              value={stats.wonThisMonth}
              color="bg-green-50"
              icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
            />
            <StatCard
              label="Pending Activities"
              value={stats.pendingActivities}
              color="bg-red-50"
              icon={<svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>

          {/* AUTOMATION: Overdue Deals Alert */}
          {overdueDeals.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <h2 className="text-sm font-semibold text-red-700">{overdueDeals.length} Overdue Deal{overdueDeals.length > 1 ? 's' : ''} — Past Expected Close Date</h2>
              </div>
              <div className="space-y-2">
                {overdueDeals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.title}</p>
                      {d.contacts && (
                        <p className="text-xs text-gray-500">{d.contacts.first_name} {d.contacts.last_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-red-600">{format(new Date(d.expected_close_date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-gray-500">{d.stage}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/pipeline')}
                className="mt-3 text-xs text-red-600 font-semibold hover:underline"
              >
                Go to Pipeline →
              </button>
            </div>
          )}

          {/* Recent Activities */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
              <button
                onClick={() => navigate('/activities')}
                className="text-sm text-blue-600 hover:underline"
              >
                View all
              </button>
            </div>
            {recentActivities.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">No activities yet</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap mt-0.5 ${typeColors[a.type] ?? 'bg-gray-100 text-gray-700'}`}>
                      {a.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                      {a.contacts && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {a.contacts.first_name} {a.contacts.last_name}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {a.due_date && (
                        <p className="text-xs text-gray-400">{format(new Date(a.due_date), 'MMM d')}</p>
                      )}
                      {a.done && (
                        <span className="text-xs text-green-600 font-medium">Done</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard

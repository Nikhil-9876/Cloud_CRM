import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

const COLORS = {
  Lead:           '#6b7280',
  Contacted:      '#3b82f6',
  'Proposal Sent':'#f59e0b',
  Negotiation:    '#f97316',
  Won:            '#22c55e',
  Lost:           '#ef4444',
  New:            '#3b82f6',
  Qualified:      '#22c55e',
  Dropped:        '#ef4444',
  Call:           '#3b82f6',
  Email:          '#8b5cf6',
  Meeting:        '#22c55e',
  Note:           '#f59e0b',
}

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316']

const StatCard = ({ label, value, sub, color = 'bg-blue-50' }) => (
  <div className={`${color} rounded-2xl p-5`}>
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
)

const SectionTitle = ({ children }) => (
  <h2 className="text-base font-semibold text-gray-900 mb-4">{children}</h2>
)

const Reports = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/reports/summary')
      setData(res)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  const totalRevenue = data?.revenueByMonth?.reduce((s, r) => s + (r.revenue ?? 0), 0) ?? 0
  const totalDeals   = data?.dealsByStage?.reduce((s, d) => s + (d.count ?? 0), 0) ?? 0
  const wonDeals     = data?.dealsByStage?.find((d) => d.stage === 'Won')?.count ?? 0

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={fetchReports} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Overview of your CRM performance</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          sub="from won deals (12 mo)"
          color="bg-green-50"
        />
        <StatCard
          label="Deals Won"
          value={wonDeals}
          sub={`of ${totalDeals} total deals`}
          color="bg-blue-50"
        />
        <StatCard
          label="Conversion Rate"
          value={`${data?.conversionRate ?? 0}%`}
          sub="leads to qualified"
          color="bg-amber-50"
        />
        <StatCard
          label="Lead Sources"
          value={data?.leadsByStatus?.length ?? 0}
          sub="active statuses"
          color="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue by Month */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SectionTitle>Monthly Revenue (Won Deals)</SectionTitle>
          {(data?.revenueByMonth?.length ?? 0) === 0 ? (
            <p className="text-gray-400 text-sm text-center pt-12">No won deals yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.revenueByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deals by Stage */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SectionTitle>Deals by Stage</SectionTitle>
          {(data?.dealsByStage?.length ?? 0) === 0 ? (
            <p className="text-gray-400 text-sm text-center pt-12">No deals yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.dealsByStage}
                  dataKey="count"
                  nameKey="stage"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ stage, percent }) => `${stage} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.dealsByStage.map((entry) => (
                    <Cell key={entry.stage} fill={COLORS[entry.stage] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name, { payload }) => [v, payload.stage]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leads by Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SectionTitle>Leads by Status</SectionTitle>
          {(data?.leadsByStatus?.length ?? 0) === 0 ? (
            <p className="text-gray-400 text-sm text-center pt-12">No leads yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.leadsByStatus} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 12, fill: '#374151' }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.leadsByStatus.map((entry, i) => (
                    <Cell key={entry.status} fill={COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activities by Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SectionTitle>Activities by Type</SectionTitle>
          {(data?.activitiesByType?.length ?? 0) === 0 ? (
            <p className="text-gray-400 text-sm text-center pt-12">No activities yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.activitiesByType} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#374151' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="done" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports

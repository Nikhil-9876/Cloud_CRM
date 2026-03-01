import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const roleColors = {
  admin:     'bg-amber-100 text-amber-700 border border-amber-200',
  sales_rep: 'bg-blue-100 text-blue-700 border border-blue-200',
}

const statusColors = {
  CONFIRMED:   'bg-green-100 text-green-700',
  UNCONFIRMED: 'bg-yellow-100 text-yellow-700',
  FORCE_CHANGE_PASSWORD: 'bg-orange-100 text-orange-700',
}

const TeamIcon = () => (
  <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const Team = () => {
  const { isAdmin } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(null) // username being updated

  const fetchTeam = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/team')
      setMembers(data ?? [])
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeam() }, [])

  const handleRoleChange = async (username, newRole) => {
    setUpdating(username)
    try {
      await api.put(`/team/${encodeURIComponent(username)}`, { role: newRole })
      setMembers((prev) =>
        prev.map((m) => m.username === username ? { ...m, role: newRole } : m)
      )
      toast.success('Role updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdating(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-700">Admin Access Only</h2>
          <p className="text-gray-400 text-sm mt-1">Only admins can view the team page.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <Skeleton.Table rows={4} cols={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTeam} />
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <EmptyState icon={<TeamIcon />} title="No team members found" description="No users in your Cognito User Pool." />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Member</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Joined</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m) => (
                  <tr key={m.username} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                          {(m.email?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{m.email}</p>
                          <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{m.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.role === 'admin' ? 'Admin' : 'Sales Rep'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {m.created ? new Date(m.created).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={m.role}
                        disabled={updating === m.username}
                        onChange={(e) => handleRoleChange(m.username, e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="sales_rep">Sales Rep</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {members.map((m) => (
              <div key={m.username} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {(m.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-[180px]">{m.email}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.role === 'admin' ? 'Admin' : 'Sales Rep'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusColors[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {m.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{m.created ? new Date(m.created).toLocaleDateString() : '—'}</span>
                  <select
                    value={m.role}
                    disabled={updating === m.username}
                    onChange={(e) => handleRoleChange(m.username, e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="sales_rep">Sales Rep</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Team

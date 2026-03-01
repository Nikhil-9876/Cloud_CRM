import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const Signup = () => {
  const [step, setStep] = useState('register') // 'register' | 'confirm'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, confirmSignUp } = useAuth()
  const navigate = useNavigate()

  // Step 1 — register with Cognito (sends verification code to email)
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!email || !password || !confirm) { toast.error('Please fill in all fields'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await signUp(email, password)
      toast.success('Verification code sent to your email!')
      setStep('confirm')
    } catch (err) {
      toast.error(err.message ?? 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — confirm with the 6-digit code Cognito emailed the user
  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!code.trim()) { toast.error('Please enter the verification code'); return }
    setLoading(true)
    try {
      await confirmSignUp(email, code.trim())
      toast.success('Account verified! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {step === 'register' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="text-gray-500 mt-1">Start managing your CRM today</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
              <p className="text-gray-500 mt-1">
                We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>
              </p>
            </>
          )}
        </div>

        {step === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Min. 8 characters"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest text-lg font-mono"
                placeholder="123456"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-400 mt-1.5">Check your inbox (and spam folder)</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button
              type="button"
              onClick={() => setStep('register')}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back
            </button>
          </form>
        )}

        {step === 'register' && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default Signup

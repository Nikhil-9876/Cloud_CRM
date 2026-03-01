import { createContext, useContext, useEffect, useState } from 'react'
import {
  getCurrentUser,
  fetchAuthSession,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
} from 'aws-amplify/auth'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('sales_rep')
  const [loading, setLoading] = useState(true)

  // Load the currently signed-in Cognito user on mount
  const loadUser = async () => {
    try {
      const u = await getCurrentUser()
      setUser(u)
      // Extract role from the ID-token claims
      const session = await fetchAuthSession()
      const claims = session.tokens?.idToken?.payload ?? {}
      setRole(claims['custom:role'] ?? 'sales_rep')
    } catch {
      setUser(null)
      setRole('sales_rep')
    }
  }

  useEffect(() => {
    loadUser().finally(() => setLoading(false))
  }, [])

  /**
   * Sign in with email + password.
   * Returns Amplify's SignInOutput ({ isSignedIn, nextStep }).
   */
  const signIn = async (email, password) => {
    const result = await amplifySignIn({ username: email, password })
    if (result.isSignedIn) await loadUser()
    return result
  }

  /**
   * Register a new user. Cognito sends a verification code to the email.
   * @param {string} email
   * @param {string} password
   * @param {string} [role='sales_rep']  'admin' | 'sales_rep'
   */
  const signUp = (email, password, role = 'sales_rep') =>
    amplifySignUp({
      username: email,
      password,
      options: { userAttributes: { email, 'custom:role': role } },
    })

  /**
   * Confirm sign-up with the 6-digit code Cognito emailed the user.
   */
  const confirmSignUp = (email, code) =>
    amplifyConfirmSignUp({ username: email, confirmationCode: code })

  const signOut = async () => {
    await amplifySignOut()
    setUser(null)
    setRole('sales_rep')
  }

  const isAdmin = role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, role, isAdmin, signIn, signUp, confirmSignUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

import { createContext, useContext, useEffect, useState } from 'react'
import {
  getCurrentUser,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
} from 'aws-amplify/auth'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load the currently signed-in Cognito user on mount
  const loadUser = async () => {
    try {
      const u = await getCurrentUser()
      setUser(u)
    } catch {
      setUser(null)
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
   * Returns Amplify's SignUpOutput.
   */
  const signUp = (email, password) =>
    amplifySignUp({
      username: email,
      password,
      options: { userAttributes: { email } },
    })

  /**
   * Confirm sign-up with the 6-digit code Cognito emailed the user.
   */
  const confirmSignUp = (email, code) =>
    amplifyConfirmSignUp({ username: email, confirmationCode: code })

  const signOut = async () => {
    await amplifySignOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, confirmSignUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

import { Amplify } from 'aws-amplify'

/**
 * Configure AWS Amplify with Cognito User Pool details.
 * Values come from .env (Vite injects VITE_* vars at build time).
 * Import this file once at the app entry point (main.jsx).
 */
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        email: true,
      },
    },
  },
})

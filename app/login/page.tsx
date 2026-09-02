'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Read error or message from query params (e.g. from auth callback redirect)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')

    if (errorParam) {
      setErrorMsg(getFriendlyErrorMessage(errorParam))
    }
    if (messageParam) {
      setSuccessMsg(messageParam)
    }
  }, [searchParams])

  const getFriendlyErrorMessage = (rawError: string): string => {
    const lower = rawError.toLowerCase()
    if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
      return 'Invalid email or password. Please check your credentials and try again.'
    }
    if (lower.includes('email not confirmed') || lower.includes('not confirmed') || lower.includes('email_not_confirmed')) {
      return 'Your email has not been confirmed yet. Please check your inbox or request a new confirmation email below.'
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    if (lower.includes('password should be at least') || lower.includes('weak password')) {
      return 'Password must be at least 6 characters long.'
    }
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
      return 'Too many requests. Please wait a moment before trying again.'
    }
    if (lower.includes('invalid or missing') || lower.includes('token has expired')) {
      return 'The confirmation link is invalid or has expired. Please request a new one.'
    }
    return rawError
  }

  const getSiteOrigin = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin
    }
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }
    return 'https://familyexpense-tracker.vercel.app'
  }

  const handleResendConfirmation = async (targetEmail?: string) => {
    const emailToUse = targetEmail || email
    if (!emailToUse.trim()) {
      setErrorMsg('Please enter your email address to resend confirmation.')
      return
    }

    setResendingEmail(true)
    setErrorMsg(null)

    try {
      const origin = getSiteOrigin()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      })

      if (error) {
        setErrorMsg(getFriendlyErrorMessage(error.message))
      } else {
        setResendSuccess(true)
        setSuccessMsg(`Confirmation email resent to ${emailToUse.trim()}! Please check your inbox and spam folder.`)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resend confirmation email.')
    } finally {
      setResendingEmail(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsEmailUnconfirmed(false)
    setResendSuccess(false)

    const origin = getSiteOrigin()

    if (mode === 'forgot_password') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.')
        setLoading(false)
        return
      }

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        })

        if (error) {
          setErrorMsg(getFriendlyErrorMessage(error.message))
        } else {
          setSuccessMsg(`Password reset link sent to ${email.trim()}! Please check your inbox and follow the link.`)
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to send password reset email.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your name.')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
            },
            emailRedirectTo: `${origin}/auth/callback`,
          },
        })

        if (error) {
          setErrorMsg(getFriendlyErrorMessage(error.message))
        } else {
          if (data.session) {
            router.refresh()
            router.replace('/onboarding')
          } else {
            setSuccessMsg(`Registration successful! We've sent a verification link to ${email.trim()}. Please confirm your email to sign in.`)
            setIsEmailUnconfirmed(true)
          }
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'An error occurred during registration.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Sign In Mode
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        const errorText = error.message.toLowerCase()
        if (
          errorText.includes('email not confirmed') ||
          errorText.includes('not confirmed') ||
          (error as any).code === 'email_not_confirmed'
        ) {
          setIsEmailUnconfirmed(true)
          setErrorMsg('Your email has not been confirmed yet. Please verify your email before signing in.')
        } else {
          setErrorMsg(getFriendlyErrorMessage(error.message))
        }
      } else {
        router.refresh()
        router.replace('/')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred during sign in.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: 'signin' | 'signup' | 'forgot_password') => {
    setMode(newMode)
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsEmailUnconfirmed(false)
    setResendSuccess(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-md dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Family Expense Tracker
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {mode === 'signup' && 'Create an account for your family'}
            {mode === 'signin' && 'Sign in to track your expenses'}
            {mode === 'forgot_password' && 'Reset your account password'}
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {isEmailUnconfirmed && !resendSuccess && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleResendConfirmation()}
                    disabled={resendingEmail}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                  >
                    {resendingEmail ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Resend confirmation email
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{successMsg}</p>
              {mode === 'signup' && isEmailUnconfirmed && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleResendConfirmation()}
                    disabled={resendingEmail}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50"
                  >
                    {resendingEmail ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Resend confirmation email
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 pr-3 pl-10 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder="Your Name"
                />
              </div>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 py-3 pr-3 pl-10 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                placeholder="Email address"
              />
            </div>

            {mode !== 'forgot_password' && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 pr-3 pl-10 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder={mode === 'signup' ? 'Password (min. 6 characters)' : 'Password'}
                />
              </div>
            )}

            {mode === 'signin' && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('forgot_password')}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 py-3 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : mode === 'signup' ? (
                'Sign Up'
              ) : mode === 'forgot_password' ? (
                'Send Reset Link'
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-2 pt-2 text-center text-sm">
          {mode === 'forgot_password' ? (
            <button
              onClick={() => switchMode('signin')}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Back to Sign In
            </button>
          ) : mode === 'signup' ? (
            <button
              onClick={() => switchMode('signin')}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Already have an account? Sign In
            </button>
          ) : (
            <button
              onClick={() => switchMode('signup')}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Don't have an account? Sign Up
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

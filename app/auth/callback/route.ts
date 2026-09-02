import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/'
  const errorParam = requestUrl.searchParams.get('error')
  const errorDesc = requestUrl.searchParams.get('error_description')

  // Resolve base origin (support x-forwarded-host if behind proxy/Vercel)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const isLocalEnv = process.env.NODE_ENV === 'development'

  let baseUrl = requestUrl.origin
  if (!isLocalEnv && forwardedHost) {
    baseUrl = `${forwardedProto}://${forwardedHost}`
  }

  // Handle upstream Supabase auth errors
  if (errorParam || errorDesc) {
    const redirectUrl = new URL('/login', baseUrl)
    redirectUrl.searchParams.set('error', errorDesc || errorParam || 'Authentication failed')
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = await createClient()

  // 1. Support token_hash + type (email OTP / magic links / verification)
  if (token_hash && type) {
    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type })
      if (!error) {
        const redirectUrl = new URL(next, baseUrl)
        return NextResponse.redirect(redirectUrl)
      } else {
        console.error('Error verifying token_hash OTP:', error.message)
        const redirectUrl = new URL('/login', baseUrl)
        redirectUrl.searchParams.set('error', error.message)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (err: any) {
      console.error('Auth verifyOtp exception:', err)
      const redirectUrl = new URL('/login', baseUrl)
      redirectUrl.searchParams.set('error', err?.message || 'Authentication error')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 2. Support PKCE code exchange
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Successfully exchanged code for session, redirect to target path
        const redirectUrl = new URL(next, baseUrl)
        return NextResponse.redirect(redirectUrl)
      } else {
        console.error('Error exchanging code for session:', error.message)
        const redirectUrl = new URL('/login', baseUrl)
        redirectUrl.searchParams.set('error', error.message)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (err: any) {
      console.error('Auth callback exception:', err)
      const redirectUrl = new URL('/login', baseUrl)
      redirectUrl.searchParams.set('error', err?.message || 'Authentication error')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Return to login with error if no code or token was provided
  const redirectUrl = new URL('/login', baseUrl)
  redirectUrl.searchParams.set('error', 'Invalid or missing authentication link')
  return NextResponse.redirect(redirectUrl)
}

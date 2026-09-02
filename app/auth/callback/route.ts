import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // Resolve base origin (support x-forwarded-host if behind load balancer/proxy)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const isLocalEnv = process.env.NODE_ENV === 'development'

  let baseUrl = requestUrl.origin
  if (!isLocalEnv && forwardedHost) {
    baseUrl = `${forwardedProto}://${forwardedHost}`
  }

  if (code) {
    try {
      const supabase = await createClient()
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

  // Return to login with error if no code was provided
  const redirectUrl = new URL('/login', baseUrl)
  redirectUrl.searchParams.set('error', 'Invalid or missing authentication link')
  return NextResponse.redirect(redirectUrl)
}

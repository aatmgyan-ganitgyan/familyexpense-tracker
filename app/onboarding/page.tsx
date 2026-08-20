'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFamily, joinFamily } from '@/app/actions/onboarding'
import { PlusCircle, Users, ArrowRight, Loader2, Sparkles } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const res = await createFamily(familyName)
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      router.refresh()
      router.replace('/')
    }
  }

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const res = await joinFamily(inviteCode)
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      router.refresh()
      router.replace('/')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-md dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Welcome to Tracker!
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Let's set up your family workspace to start tracking expenses together.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {mode === 'selection' && (
          <div className="mt-8 space-y-4">
            <button
              onClick={() => setMode('create')}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-5 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Create a Family</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Start a new shared budget workspace</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>

            <button
              onClick={() => setMode('join')}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-5 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Join Existing Family</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Use an invite code from your partner/parents</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form className="mt-8 space-y-6" onSubmit={handleCreateFamily}>
            <div className="space-y-2">
              <label htmlFor="family-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Family Name
              </label>
              <input
                id="family-name"
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g. Sharma Family, Amit & Ritu"
                className="block w-full rounded-lg border border-gray-300 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Default currency will be set to INR (₹)
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setMode('selection')
                  setErrorMsg(null)
                }}
                className="w-1/2 rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex w-1/2 justify-center rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create'}
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form className="mt-8 space-y-6" onSubmit={handleJoinFamily}>
            <div className="space-y-2">
              <label htmlFor="invite-code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                maxLength={8}
                className="block w-full text-center text-lg tracking-widest uppercase rounded-lg border border-gray-300 py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Enter the 6-8 character code shared by your family admin.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setMode('selection')
                  setErrorMsg(null)
                }}
                className="w-1/2 rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex w-1/2 justify-center rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join Workspace'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

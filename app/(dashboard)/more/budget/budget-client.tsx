'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Edit2, X, AlertCircle, CheckCircle, PiggyBank, User } from 'lucide-react'
import { saveBudget } from '@/app/actions/budget'

interface BudgetClientProps {
  currentUserProfileId: string
  initialFamilyBudget: number
  initialPersonalBudget: number
  familySpent: number
  personalSpent: number
}

export default function BudgetClient({
  currentUserProfileId,
  initialFamilyBudget,
  initialPersonalBudget,
  familySpent,
  personalSpent,
}: BudgetClientProps) {
  const router = useRouter()

  // Budget Values State
  const [familyBudget, setFamilyBudget] = useState(initialFamilyBudget)
  const [personalBudget, setPersonalBudget] = useState(initialPersonalBudget)

  // Edit Modes State
  const [editFamilyMode, setEditFamilyMode] = useState(false)
  const [editPersonalMode, setEditPersonalMode] = useState(false)

  // Form input states
  const [familyInput, setFamilyInput] = useState(initialFamilyBudget.toString())
  const [personalInput, setPersonalInput] = useState(initialPersonalBudget.toString())

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSaveFamilyBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const amount = parseFloat(familyInput)
    if (isNaN(amount) || amount < 0) {
      setErrorMsg('Please enter a valid budget amount.')
      setLoading(false)
      return
    }

    const res = await saveBudget({ userId: null, amount })
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setFamilyBudget(amount)
      setEditFamilyMode(false)
      setSuccessMsg('Family budget updated successfully.')
      router.refresh()
    }
    setLoading(false)
  }

  const handleSavePersonalBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const amount = parseFloat(personalInput)
    if (isNaN(amount) || amount < 0) {
      setErrorMsg('Please enter a valid budget amount.')
      setLoading(false)
      return
    }

    const res = await saveBudget({ userId: currentUserProfileId, amount })
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setPersonalBudget(amount)
      setEditPersonalMode(false)
      setSuccessMsg('Personal budget updated successfully.')
      router.refresh()
    }
    setLoading(false)
  }

  // Helper to draw progress bars
  const renderProgressBar = (spent: number, limit: number) => {
    if (limit <= 0) return null
    const pct = Math.min((spent / limit) * 100, 100)
    const isExceeded = spent > limit

    return (
      <div className="space-y-1.5 mt-2">
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isExceeded ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-semibold">
          <span className={isExceeded ? 'text-red-500' : 'text-gray-400'}>
            {isExceeded ? 'Limit Exceeded!' : `${pct.toFixed(0)}% Used`}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Remaining: ₹{Math.max(limit - spent, 0).toFixed(2)}
          </span>
        </div>
      </div>
    )
  }

  const getRemainingDaysInMonth = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    const currentDay = today.getDate()
    return Math.max(lastDayOfMonth - currentDay + 1, 1)
  }

  const remainingDays = getRemainingDaysInMonth()
  const familyRemaining = Math.max(familyBudget - familySpent, 0)
  const familyDailySafeSpend = familyRemaining / remainingDays

  const personalRemaining = Math.max(personalBudget - personalSpent, 0)
  const personalDailySafeSpend = personalRemaining / remainingDays

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/more"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Budget Settings</h1>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Configure monthly family and personal spending limits</p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-green-50 p-4 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400 flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Family Budget Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              <PiggyBank className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Family Budget</h2>
              <p className="text-[9px] text-gray-400">Limits total family spendings</p>
            </div>
          </div>
          {!editFamilyMode && (
            <button
              onClick={() => setEditFamilyMode(true)}
              className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {editFamilyMode ? (
          <form onSubmit={handleSaveFamilyBudget} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400">₹</span>
              <input
                type="number"
                value={familyInput}
                onChange={(e) => setFamilyInput(e.target.value)}
                placeholder="Limit amount"
                className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-7 text-xs text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditFamilyMode(false)
                setFamilyInput(familyBudget.toString())
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                ₹{familySpent.toFixed(0)}
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                of {familyBudget > 0 ? `₹${familyBudget.toFixed(0)} limit` : 'No Limit set'}
              </span>
            </div>
            {renderProgressBar(familySpent, familyBudget)}
            {familyBudget > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-150 dark:border-gray-800 flex justify-between text-[10px] text-gray-500 font-semibold">
                <span>Days Left: <strong>{remainingDays}</strong></span>
                <span>Daily Safe Spend: <strong className="text-indigo-600 dark:text-indigo-400">₹{familyDailySafeSpend.toFixed(2)}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Budget Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
              <User className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Your Personal Budget</h2>
              <p className="text-[9px] text-gray-400">Limits only expenses paid by you</p>
            </div>
          </div>
          {!editPersonalMode && (
            <button
              onClick={() => setEditPersonalMode(true)}
              className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {editPersonalMode ? (
          <form onSubmit={handleSavePersonalBudget} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400">₹</span>
              <input
                type="number"
                value={personalInput}
                onChange={(e) => setPersonalInput(e.target.value)}
                placeholder="Limit amount"
                className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-7 text-xs text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditPersonalMode(false)
                setPersonalInput(personalBudget.toString())
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                ₹{personalSpent.toFixed(0)}
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                of {personalBudget > 0 ? `₹${personalBudget.toFixed(0)} limit` : 'No Limit set'}
              </span>
            </div>
            {renderProgressBar(personalSpent, personalBudget)}
            {personalBudget > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-150 dark:border-gray-800 flex justify-between text-[10px] text-gray-500 font-semibold">
                <span>Days Left: <strong>{remainingDays}</strong></span>
                <span>Daily Safe Spend: <strong className="text-emerald-600 dark:text-emerald-450">₹{personalDailySafeSpend.toFixed(2)}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  RotateCw,
  Play,
  Pause,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Clock,
  User,
} from 'lucide-react'
import { CategoryIconBox } from '@/lib/category-colors'
import {
  addRecurringExpense,
  updateRecurringStatus,
  deleteRecurringExpense,
} from '@/app/actions/recurring'

interface Category {
  id: string
  name: string
  icon: string
}

interface Member {
  id: string
  name: string
}

interface RecurringItem {
  id: string
  amount: number
  merchant: string
  category_id: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_due_date: string
  status: 'active' | 'paused' | 'cancelled'
  user_id: string
  categories?: { name: string; icon: string } | null
  profiles?: { name: string } | null
}

interface RecurringClientProps {
  initialRecurring: RecurringItem[]
  categories: Category[]
  members: Member[]
  currentUserId: string
  todayStr: string
}

export default function RecurringClient({
  initialRecurring,
  categories,
  members,
  currentUserId,
  todayStr,
}: RecurringClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<RecurringItem[]>(initialRecurring)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form State
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [nextDueDate, setNextDueDate] = useState(todayStr)
  const [paidBy, setPaidBy] = useState(currentUserId)

  // UI state
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount.')
      setLoading(false)
      return
    }

    if (!merchant.trim()) {
      setErrorMsg('Please enter a merchant or service name.')
      setLoading(false)
      return
    }

    const res = await addRecurringExpense({
      amount: numAmount,
      merchant: merchant.trim(),
      categoryId: categoryId || null,
      frequency,
      nextDueDate,
      userId: paidBy,
    })

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg(`Recurring expense for "${merchant.trim()}" added!`)
      setShowAddModal(false)
      setAmount('')
      setMerchant('')
      router.refresh()
    }
    setLoading(false)
  }

  const handleStatusToggle = async (item: RecurringItem) => {
    const newStatus = item.status === 'active' ? 'paused' : 'active'
    setActionLoadingId(item.id)
    setErrorMsg(null)

    const res = await updateRecurringStatus(item.id, newStatus)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      )
      setSuccessMsg(`"${item.merchant}" set to ${newStatus}.`)
      router.refresh()
    }
    setActionLoadingId(null)
  }

  const handleDelete = async (item: RecurringItem) => {
    if (!confirm(`Are you sure you want to remove recurring expense for "${item.merchant}"?`)) {
      return
    }

    setActionLoadingId(item.id)
    setErrorMsg(null)

    const res = await deleteRecurringExpense(item.id)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setSuccessMsg(`"${item.merchant}" removed.`)
      router.refresh()
    }
    setActionLoadingId(null)
  }

  const activeItems = items.filter((i) => i.status === 'active')
  const totalMonthlyCommitment = activeItems.reduce((sum, i) => {
    if (i.frequency === 'monthly') return sum + Number(i.amount)
    if (i.frequency === 'weekly') return sum + Number(i.amount) * 4.33
    if (i.frequency === 'daily') return sum + Number(i.amount) * 30
    if (i.frequency === 'yearly') return sum + Number(i.amount) / 12
    return sum
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/more"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Recurring Expenses</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Subscriptions, utilities & regular bills
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true)
            setErrorMsg(null)
          }}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Bill</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2 rounded-lg bg-green-50 p-4 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-100 uppercase tracking-wider">
              Est. Monthly Recurring
            </p>
            <h2 className="mt-1 text-2xl font-black">
              ₹{Math.round(totalMonthlyCommitment).toLocaleString('en-IN')}
            </h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
            <RotateCw className="h-6 w-6 text-white" />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-amber-100">
          {activeItems.length} active recurring bills automated by cron
        </p>
      </div>

      {/* Recurring Items List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          All Recurring Bills ({items.length})
        </h2>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <RotateCw className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              No recurring expenses yet
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Add your monthly subscriptions or bills to automate expense tracking.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Recurring Expense
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => {
              const catName = item.categories?.name || 'Other'
              const catIcon = item.categories?.icon || 'Coins'
              const isPaused = item.status === 'paused'
              const isCancelled = item.status === 'cancelled'

              return (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl border bg-white p-4 shadow-xs transition dark:bg-gray-900 ${
                    isPaused
                      ? 'border-amber-200/60 opacity-75 dark:border-amber-900/40'
                      : isCancelled
                      ? 'border-gray-200 opacity-50 dark:border-gray-800'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <CategoryIconBox categoryName={catName} iconName={catIcon} size="md" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.merchant}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">{catName}</span>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {item.frequency}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-gray-900 dark:text-white">
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </span>
                      <div>
                        <span
                          className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                            item.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : item.status === 'paused'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer details & Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        Next: <strong>{item.next_due_date}</strong>
                      </span>
                      {item.profiles?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {item.profiles.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStatusToggle(item)}
                        disabled={actionLoadingId === item.id}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                          item.status === 'active'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        {actionLoadingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : item.status === 'active' ? (
                          <>
                            <Pause className="h-3 w-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Resume
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        disabled={actionLoadingId === item.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition"
                        title="Delete recurring expense"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Recurring Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <RotateCw className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Add Recurring Expense
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Amount (₹)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-8 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Merchant / Service
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Netflix, Wifi, Electricity, Maid"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Paid By
                  </label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Recurring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

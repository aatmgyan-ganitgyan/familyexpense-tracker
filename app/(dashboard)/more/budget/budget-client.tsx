'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Edit2,
  X,
  AlertCircle,
  CheckCircle,
  PiggyBank,
  User,
  Plus,
  Trash2,
  PieChart,
  Loader2,
} from 'lucide-react'
import { CategoryIconBox, getCategoryColor } from '@/lib/category-colors'
import { saveBudget, saveCategoryBudget, deleteCategoryBudget } from '@/app/actions/budget'

interface Category {
  id: string
  name: string
  icon: string
}

interface CategoryBudget {
  id: string
  categoryId: string
  amount: number
}

interface BudgetClientProps {
  currentUserProfileId: string
  initialFamilyBudget: number
  initialPersonalBudget: number
  familySpent: number
  personalSpent: number
  categories: Category[]
  initialCategoryBudgets: CategoryBudget[]
  categorySpentMap: Record<string, number>
}

export default function BudgetClient({
  currentUserProfileId,
  initialFamilyBudget,
  initialPersonalBudget,
  familySpent,
  personalSpent,
  categories,
  initialCategoryBudgets,
  categorySpentMap,
}: BudgetClientProps) {
  const router = useRouter()

  // Budget Values State
  const [familyBudget, setFamilyBudget] = useState(initialFamilyBudget)
  const [personalBudget, setPersonalBudget] = useState(initialPersonalBudget)
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(initialCategoryBudgets)

  // Edit Modes State
  const [editFamilyMode, setEditFamilyMode] = useState(false)
  const [editPersonalMode, setEditPersonalMode] = useState(false)
  const [showAddCatModal, setShowAddCatModal] = useState(false)

  // Category modal inputs
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || '')
  const [catBudgetInput, setCatBudgetInput] = useState('')

  // Form input states
  const [familyInput, setFamilyInput] = useState(initialFamilyBudget ? initialFamilyBudget.toString() : '')
  const [personalInput, setPersonalInput] = useState(initialPersonalBudget ? initialPersonalBudget.toString() : '')

  const [loading, setLoading] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
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

  const handleSaveCategoryBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const amount = parseFloat(catBudgetInput)
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid budget amount greater than 0.')
      setLoading(false)
      return
    }

    const res = await saveCategoryBudget({ categoryId: selectedCatId, amount })
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      const catObj = categories.find((c) => c.id === selectedCatId)
      setSuccessMsg(`Monthly budget set for ${catObj?.name || 'category'}!`)
      setShowAddCatModal(false)
      setCatBudgetInput('')
      router.refresh()
    }
    setLoading(false)
  }

  const handleDeleteCategoryBudget = async (budgetId: string, catName: string) => {
    if (!confirm(`Remove monthly limit for ${catName}?`)) return

    setDeletingCatId(budgetId)
    setErrorMsg(null)

    const res = await deleteCategoryBudget(budgetId)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setCategoryBudgets((prev) => prev.filter((b) => b.id !== budgetId))
      setSuccessMsg(`Budget limit for ${catName} removed.`)
      router.refresh()
    }
    setDeletingCatId(null)
  }

  // Helper to draw progress bars
  const renderProgressBar = (spent: number, limit: number) => {
    if (limit <= 0) return null
    const pct = Math.min((spent / limit) * 100, 100)
    const isExceeded = spent > limit

    return (
      <div className="space-y-1.5 mt-2">
        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isExceeded ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-semibold">
          <span className={isExceeded ? 'text-red-500 font-bold' : 'text-gray-400'}>
            {isExceeded ? 'Limit Exceeded!' : `${pct.toFixed(0)}% Used`}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {spent > limit ? (
              <span className="text-red-500">Over by ₹{(spent - limit).toFixed(2)}</span>
            ) : (
              `Remaining: ₹${(limit - spent).toFixed(2)}`
            )}
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
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Configure family, personal, and category spending limits
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 flex items-center space-x-2 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl bg-green-50 p-4 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400 flex items-center space-x-2 border border-green-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Family Budget Section */}
      <div className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Family Budget</h2>
              <p className="text-[10px] text-gray-400">Limits total family spendings</p>
            </div>
          </div>
          {!editFamilyMode && (
            <button
              onClick={() => setEditFamilyMode(true)}
              className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {editFamilyMode ? (
          <form onSubmit={handleSaveFamilyBudget} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={familyInput}
                onChange={(e) => setFamilyInput(e.target.value)}
                placeholder="Limit amount"
                className="w-full rounded-xl border border-gray-300 py-2 pr-3 pl-7 text-xs text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditFamilyMode(false)
                setFamilyInput(familyBudget.toString())
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                ₹{familySpent.toFixed(0)}
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                {familyBudget > 0
                  ? `of ₹${familyBudget.toFixed(0)} limit`
                  : 'Tap edit to set a monthly limit'}
              </span>
            </div>
            {renderProgressBar(familySpent, familyBudget)}
            {familyBudget > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-[10px] text-gray-500 font-semibold">
                <span>
                  Days Left: <strong>{remainingDays}</strong>
                </span>
                <span>
                  Daily Safe Spend:{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    ₹{familyDailySafeSpend.toFixed(2)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Budget Section */}
      <div className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Your Personal Budget</h2>
              <p className="text-[10px] text-gray-400">Limits only expenses paid by you</p>
            </div>
          </div>
          {!editPersonalMode && (
            <button
              onClick={() => setEditPersonalMode(true)}
              className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {editPersonalMode ? (
          <form onSubmit={handleSavePersonalBudget} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={personalInput}
                onChange={(e) => setPersonalInput(e.target.value)}
                placeholder="Limit amount"
                className="w-full rounded-xl border border-gray-300 py-2 pr-3 pl-7 text-xs text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditPersonalMode(false)
                setPersonalInput(personalBudget.toString())
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                ₹{personalSpent.toFixed(0)}
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                {personalBudget > 0
                  ? `of ₹${personalBudget.toFixed(0)} limit`
                  : 'Tap edit to set a monthly limit'}
              </span>
            </div>
            {renderProgressBar(personalSpent, personalBudget)}
            {personalBudget > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-[10px] text-gray-500 font-semibold">
                <span>
                  Days Left: <strong>{remainingDays}</strong>
                </span>
                <span>
                  Daily Safe Spend:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    ₹{personalDailySafeSpend.toFixed(2)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category-Level Budgets Section */}
      <div className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Category Limits</h2>
              <p className="text-[10px] text-gray-400">Set spending limits per category</p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowAddCatModal(true)
              setErrorMsg(null)
            }}
            className="flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Set Limit</span>
          </button>
        </div>

        {categoryBudgets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 text-center text-xs text-gray-400">
            No category limits set yet. Click "Set Limit" to cap spending on groceries, dining out, etc.
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {categoryBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId)
              const spent = categorySpentMap[b.categoryId] || 0
              const isExceeded = spent > b.amount
              const pct = Math.min((spent / b.amount) * 100, 100)

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 bg-gray-50/50 dark:bg-gray-800/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <CategoryIconBox
                        categoryName={cat?.name}
                        iconName={cat?.icon}
                        size="sm"
                      />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {cat?.name || 'Category'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                          ₹{spent.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium ml-1">
                          / ₹{b.amount.toFixed(0)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteCategoryBudget(b.id, cat?.name || 'Category')}
                        disabled={deletingCatId === b.id}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Delete limit"
                      >
                        {deletingCatId === b.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExceeded ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Category Budget Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Set Category Monthly Limit
              </h3>
              <button
                onClick={() => setShowAddCatModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryBudgetSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Select Category
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Monthly Budget Limit (₹)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={catBudgetInput}
                    onChange={(e) => setCatBudgetInput(e.target.value)}
                    className="block w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-8 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

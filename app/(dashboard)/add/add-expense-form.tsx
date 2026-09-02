'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { getISTDateString, getISTTimeString } from '@/lib/date'
import { CategoryIcon, CategoryIconBox, getCategoryColor } from '@/lib/category-colors'

export { CategoryIcon } from '@/lib/category-colors'
import {
  saveExpense,
  editExpense,
  checkDuplicateExpense,
  getMerchantDefaultCategory,
} from '@/app/actions/expenses'

interface Member {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  icon: string
}

interface Merchant {
  merchant_name: string
  default_category_id: string | null
}

interface AddExpenseFormProps {
  currentUserProfileId: string
  members: Member[]
  categories: Category[]
  merchants?: Merchant[]
  recentCategoryIds?: string[]
}

export default function AddExpenseForm({
  currentUserProfileId,
  members,
  categories,
  merchants = [],
  recentCategoryIds = [],
}: AddExpenseFormProps) {
  const router = useRouter()

  // Form State
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserProfileId)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id || null
  )
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank'>('UPI')
  const [merchant, setMerchant] = useState('')
  const [note, setNote] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  // UI States
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [suggestedMsg, setSuggestedMsg] = useState<string | null>(null)

  // Duplicate Dialog State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([])

  // Determine top 4-5 quick-select category chips
  const quickCategories = useMemo(() => {
    if (recentCategoryIds.length > 0) {
      const matched = recentCategoryIds
        .map((id) => categories.find((c) => c.id === id))
        .filter(Boolean) as Category[]
      if (matched.length >= 3) return matched.slice(0, 5)
    }
    // Fallback to top 5 categories
    return categories.slice(0, 5)
  }, [categories, recentCategoryIds])

  // Merchant autocomplete selection handler
  const handleMerchantChange = (value: string) => {
    setMerchant(value)

    const match = merchants.find(
      (m) => m.merchant_name.toLowerCase() === value.trim().toLowerCase()
    )
    if (match && match.default_category_id) {
      const cat = categories.find((c) => c.id === match.default_category_id)
      if (cat) {
        setSelectedCategoryId(cat.id)
        setSuggestedMsg(`Auto-selected category "${cat.name}" for ${match.merchant_name}.`)
        setTimeout(() => setSuggestedMsg(null), 3500)
      }
    }
  }

  // On Merchant blur, look up historical category (Merchant Memory from DB if not in static list)
  const handleMerchantBlur = async () => {
    if (!merchant.trim()) return
    try {
      const defaultCatId = await getMerchantDefaultCategory(merchant)
      if (defaultCatId && categories.some((c) => c.id === defaultCatId)) {
        setSelectedCategoryId(defaultCatId)
        const cat = categories.find((c) => c.id === defaultCatId)
        setSuggestedMsg(`Suggested category "${cat?.name}" based on previous transactions.`)
        setTimeout(() => setSuggestedMsg(null), 3500)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Submission handler
  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.')
      return
    }

    if (!selectedCategoryId) {
      setErrorMsg('Please select a category.')
      return
    }

    setLoading(true)

    // Check for duplicate expenses
    const todayStr = getISTDateString(new Date())
    try {
      const dupCheck = await checkDuplicateExpense(numAmount, merchant, todayStr)
      if (dupCheck.isDuplicate && dupCheck.matches) {
        setDuplicateMatches(dupCheck.matches)
        setShowDuplicateModal(true)
        setLoading(false)
      } else {
        await executeSave()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission.')
      setLoading(false)
    }
  }

  // Core save execution
  const executeSave = async () => {
    setLoading(true)
    const now = new Date()
    const dateStr = getISTDateString(now)
    const timeStr = getISTTimeString(now)

    const input = {
      amount: parseFloat(amount),
      userId: paidBy,
      categoryId: selectedCategoryId,
      merchant: merchant,
      paymentMethod,
      expenseDate: dateStr,
      expenseTime: timeStr,
      note,
      source: 'manual' as const,
      status: 'confirmed' as const,
      isPrivate: isPrivate,
    }

    const res = await saveExpense(input)
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  // Merge duplicate execution
  const executeMerge = async (matchId: string) => {
    setLoading(true)
    setShowDuplicateModal(false)

    const mergedNote = note.trim()
      ? `Merged entry. Original note, plus: ${note.trim()}`
      : 'Confirmed via duplicate detection merge.'

    const res = await editExpense(matchId, {
      status: 'confirmed',
      note: mergedNote,
      categoryId: selectedCategoryId,
      userId: paidBy,
    })

    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handlePreSubmit} className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          {errorMsg}
        </div>
      )}

      {suggestedMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in duration-200">
          <Sparkles className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>{suggestedMsg}</span>
        </div>
      )}

      {/* Large Amount Input */}
      <div className="flex flex-col items-center justify-center py-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Amount (INR)
        </span>
        <div className="mt-2 flex items-center justify-center">
          <span className="text-4xl font-black text-rose-500 mr-1">₹</span>
          <input
            type="text"
            inputMode="decimal"
            required
            autoFocus
            value={amount}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setAmount(val)
              }
            }}
            placeholder="0.00"
            className="text-4xl font-black text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none bg-transparent w-48 text-center"
          />
        </div>
      </div>

      {/* Quick-Select Category Chips */}
      {quickCategories.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Quick Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {quickCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id
              const colors = getCategoryColor(cat.name)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-105'
                      : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                  }`}
                >
                  <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Form Details */}
      <div className="space-y-4">
        {/* Paid By Selection */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Paid By
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="block w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Selector */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['UPI', 'Cash', 'Card', 'Bank'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2.5 text-center text-xs font-bold rounded-xl border transition ${
                  paymentMethod === method
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant with Autocomplete & Note Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Merchant / Payee
            </label>
            <input
              type="text"
              list="merchants-datalist"
              value={merchant}
              onChange={(e) => handleMerchantChange(e.target.value)}
              onBlur={handleMerchantBlur}
              placeholder="e.g. Swiggy, DMart, Uber"
              className="block w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
            {/* Native datalist for instant autocomplete suggestions */}
            <datalist id="merchants-datalist">
              {merchants.map((m) => (
                <option key={m.merchant_name} value={m.merchant_name} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Dinner with family"
              className="block w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Grid (2 columns, no inner scroll, full page scroll) */}
        <div className="flex flex-col space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Select Category
            </label>
            <span className="text-[10px] text-gray-400 font-medium">
              {categories.length} options
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id
              const colors = getCategoryColor(category.name)

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-left transition relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500 shadow-xs'
                      : 'bg-white border-gray-150 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:hover:border-gray-700'
                  }`}
                >
                  <CategoryIconBox
                    categoryName={category.name}
                    iconName={category.icon}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        isSelected
                          ? 'text-indigo-950 dark:text-indigo-200'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {category.name}
                    </p>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modern Private Expense Toggle Switch */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <Lock className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              Private Expense
            </p>
            <p className="text-[10px] text-gray-400">
              Only visible to you (hidden from family aggregates)
            </p>
          </div>
        </div>

        {/* Large smooth toggle button */}
        <button
          type="button"
          role="switch"
          aria-checked={isPrivate}
          onClick={() => setIsPrivate(!isPrivate)}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isPrivate ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              isPrivate ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center rounded-2xl bg-indigo-600 py-4 px-4 font-bold text-white shadow-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 transition"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Expense'}
      </button>

      {/* Duplicate Dialog Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                Duplicate Detected!
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                An expense with amount <strong>₹{amount}</strong> for{' '}
                <strong>{merchant || 'No Merchant'}</strong> has already been entered today.
              </p>
            </div>

            {/* List matches */}
            <div className="mt-4 max-h-32 overflow-y-auto space-y-2 border border-gray-100 dark:border-gray-800 p-2.5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
              {duplicateMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center text-[11px] font-medium text-gray-600 dark:text-gray-400"
                >
                  <span>
                    {m.merchant || 'Merchant'} (₹{m.amount})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                      m.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false)
                  executeSave()
                }}
                className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Keep Both (Save New)
              </button>

              <button
                type="button"
                onClick={() => executeMerge(duplicateMatches[0].id)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Merge (Update Existing)
              </button>

              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

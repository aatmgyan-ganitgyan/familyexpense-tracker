'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { getISTDateString, getISTTimeString } from '@/lib/date'
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

interface AddExpenseFormProps {
  currentUserProfileId: string
  members: Member[]
  categories: Category[]
}

// Helper component to dynamically render Lucide icons by string name
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as any)[name] || Icons.Coins
  return <IconComponent className={className} />
}

export default function AddExpenseForm({
  currentUserProfileId,
  members,
  categories,
}: AddExpenseFormProps) {
  const router = useRouter()

  // Form State
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserProfileId)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
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

  // On Merchant blur, look up historical category (Merchant Memory)
  const handleMerchantBlur = async () => {
    if (!merchant.trim()) return
    try {
      const defaultCatId = await getMerchantDefaultCategory(merchant)
      if (defaultCatId && categories.some((c) => c.id === defaultCatId)) {
        setSelectedCategoryId(defaultCatId)
        setSuggestedMsg(`Suggested category "${categories.find((c) => c.id === defaultCatId)?.name}" based on merchant history.`)
        // Clear suggestion message after 4s
        setTimeout(() => setSuggestedMsg(null), 4000)
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
        // Safe to save
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

  // Merge duplicate execution (update status of existing, discard new)
  const executeMerge = async (matchId: string) => {
    setLoading(true)
    setShowDuplicateModal(false)

    // Merging confirms the duplicate expense and appends our note
    const matched = duplicateMatches.find((m) => m.id === matchId)
    const mergedNote = note.trim()
      ? `Merged entry. original note, plus: ${note.trim()}`
      : 'Confirmed via duplicate detection merge.'

    const res = await editExpense(matchId, {
      status: 'confirmed',
      note: mergedNote,
      categoryId: selectedCategoryId, // Update category if needed
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
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {suggestedMsg && (
        <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
          {suggestedMsg}
        </div>
      )}

      {/* Large Amount Input */}
      <div className="flex flex-col items-center justify-center py-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Amount (INR)</span>
        <div className="mt-2 flex items-center justify-center">
          <span className="text-4xl font-extrabold text-gray-400 mr-1">₹</span>
          <input
            type="text"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setAmount(val);
              }
            }}
            placeholder="0.00"
            className="text-4xl font-extrabold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none bg-transparent w-48 text-center"
          />
        </div>
      </div>

      {/* Grid of details */}
      <div className="space-y-4">
        {/* Paid By Selection */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase">Paid By</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
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
          <label className="text-xs font-bold text-gray-500 uppercase">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {(['UPI', 'Cash', 'Card', 'Bank'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2.5 text-center text-xs font-semibold rounded-lg border transition ${
                  paymentMethod === method
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant & Note Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              onBlur={handleMerchantBlur}
              placeholder="e.g. Swiggy, Zomato"
              className="block w-full rounded-lg border border-gray-300 py-2.5 px-3.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Lunch with team"
              className="block w-full rounded-lg border border-gray-300 py-2.5 px-3.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
          <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 border border-gray-100 dark:border-gray-850 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                      : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <CategoryIcon name={category.icon} className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-semibold truncate w-full">{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Private Expense Toggle */}
      <div className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2">
          <Icons.Lock className="h-4.5 w-4.5 text-gray-400" />
          <div className="text-left">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Private Expense</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-400">Only visible to you (hidden from family aggregates)</p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-4.5 w-4.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center rounded-xl bg-indigo-600 py-3.5 px-4 font-bold text-white shadow-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
      >
        {loading ? (
          <Icons.Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          'Save Expense'
        )}
      </button>

      {/* Duplicate Dialog Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <Icons.AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Duplicate Detected!</h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                An expense with amount <strong>₹{amount}</strong> for <strong>{merchant || 'No Merchant'}</strong> has already been entered today.
              </p>
            </div>

            {/* List matches */}
            <div className="mt-4 max-h-32 overflow-y-auto space-y-2 border border-gray-100 dark:border-gray-800 p-2 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
              {duplicateMatches.map((m) => (
                <div key={m.id} className="flex justify-between items-center text-[10px] font-medium text-gray-600 dark:text-gray-400">
                  <span>{m.merchant || 'Merchant'} (₹{m.amount})</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                    m.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
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
                  executeSave() // Save new anyways
                }}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Keep Both (Save New)
              </button>
              
              <button
                type="button"
                onClick={() => executeMerge(duplicateMatches[0].id)}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Merge (Confirm & Update Existing)
              </button>

              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
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

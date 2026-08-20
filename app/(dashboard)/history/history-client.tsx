'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { editExpense, softDeleteExpense } from '@/app/actions/expenses'
import { CategoryIcon } from '../add/add-expense-form'
import { getISTDateString, getISTTimeString } from '@/lib/date'

interface Expense {
  id: string
  amount: number
  merchant: string | null
  upi_id: string | null
  payment_method: 'UPI' | 'Cash' | 'Card' | 'Bank'
  expense_date: string
  expense_time: string
  note: string | null
  status: string
  source: string
  category_id: string | null
  user_id: string
  categories: {
    name: string
    icon: string
  } | null
  profiles: {
    name: string
  } | null
}

interface Member {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  icon: string
}

interface HistoryClientProps {
  initialExpenses: Expense[]
  members: Member[]
  categories: Category[]
  serverTodayStr: string
}

export default function HistoryClient({
  initialExpenses,
  members,
  categories,
  serverTodayStr,
}: HistoryClientProps) {
  const router = useRouter()

  // Filter States
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Edit Modal State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editPaidBy, setEditPaidBy] = useState('')
  const [editCategory, setEditCategory] = useState<string | null>(null)
  const [editPaymentMethod, setEditPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank'>('UPI')
  const [editMerchant, setEditMerchant] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editStatus, setEditStatus] = useState<any>('confirmed')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filter Logic
  const filteredExpenses = initialExpenses.filter((exp) => {
    // Search
    const term = search.toLowerCase()
    const matchesSearch =
      !term ||
      (exp.merchant?.toLowerCase() || '').includes(term) ||
      (exp.note?.toLowerCase() || '').includes(term)

    // Member
    const matchesMember = selectedMember === 'all' || exp.user_id === selectedMember

    // Category
    const matchesCategory = selectedCategory === 'all' || exp.category_id === selectedCategory

    // Payment Method
    const matchesPayment = selectedPayment === 'all' || exp.payment_method === selectedPayment

    return matchesSearch && matchesMember && matchesCategory && matchesPayment
  })

  // Date Grouping Helper
  const groupExpensesByDate = (list: Expense[]) => {
    const groups: { [key: string]: Expense[] } = {}
    list.forEach((exp) => {
      const date = exp.expense_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(exp)
    })
    return groups
  }

  const grouped = groupExpensesByDate(filteredExpenses)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Friendly Date Label Generator
  const getDateLabel = (dateStr: string) => {
    const today = serverTodayStr
    const parsedToday = new Date(serverTodayStr + 'T00:00:00')
    const yesterdayDate = new Date(parsedToday)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = getISTDateString(yesterdayDate)

    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'

    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Edit handlers
  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp)
    setEditAmount(exp.amount.toString())
    setEditPaidBy(exp.user_id)
    setEditCategory(exp.category_id)
    setEditPaymentMethod(exp.payment_method)
    setEditMerchant(exp.merchant || '')
    setEditNote(exp.note || '')
    setEditStatus(exp.status)
    setEditDate(exp.expense_date)
    setEditTime(exp.expense_time)
    setErrorMsg(null)
  }

  const closeEditModal = () => {
    setEditingExpense(null)
  }

  // Auto-open edit modal from query param (e.g. from dashboard Recent Activity links)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const editId = params.get('edit')
      if (editId) {
        const match = initialExpenses.find((e) => e.id === editId)
        if (match) {
          openEditModal(match)
          // Clean up search params so it doesn't reopen if refreshed
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }
      }
    }
  }, [initialExpenses])

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    setLoading(true)
    setErrorMsg(null)

    const numAmount = parseFloat(editAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount.')
      setLoading(false)
      return
    }

    const res = await editExpense(editingExpense.id, {
      amount: numAmount,
      userId: editPaidBy,
      categoryId: editCategory,
      paymentMethod: editPaymentMethod,
      merchant: editMerchant,
      note: editNote,
      status: editStatus,
      expenseDate: editDate,
      expenseTime: editTime,
    })

    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      closeEditModal()
      router.refresh()
      setLoading(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (!editingExpense) return
    if (!confirm('Are you sure you want to delete this expense?')) return

    setLoading(true)
    setErrorMsg(null)

    const res = await softDeleteExpense(editingExpense.id)

    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      closeEditModal()
      router.refresh()
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icons.Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by merchant or notes..."
          className="block w-full rounded-xl border border-gray-200 bg-white py-3 pr-3 pl-10 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white text-sm"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
            showFilters || selectedMember !== 'all' || selectedCategory !== 'all' || selectedPayment !== 'all'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-400'
          }`}
        >
          <Icons.SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Expanded Filters Drawer */}
      {showFilters && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/50 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Filter by Member */}
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Paid By</label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white p-2 text-[10px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Category */}
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white p-2 text-[10px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Payment Method */}
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Payment</label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white p-2 text-[10px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank">Bank</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Trigger */}
          {(selectedMember !== 'all' || selectedCategory !== 'all' || selectedPayment !== 'all' || search !== '') && (
            <button
              onClick={() => {
                setSelectedMember('all')
                setSelectedCategory('all')
                setSelectedPayment('all')
                setSearch('')
              }}
              className="text-[10px] font-bold text-red-500 hover:text-red-600 block ml-auto"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Transaction List */}
      {sortedDates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center text-gray-400 text-xs">
          No expenses matches the filters.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dayTotal = grouped[date].reduce((sum, exp) => sum + Number(exp.amount), 0)
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {getDateLabel(date)}
                  </h3>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    Day Total: ₹{dayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="space-y-2">
                {grouped[date].map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => openEditModal(exp)}
                    className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xs text-left hover:border-indigo-500 transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 flex-shrink-0">
                        <CategoryIcon name={exp.categories?.icon || 'Coins'} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {exp.merchant || 'Expense'}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          Paid by {exp.profiles?.name || 'Someone'} • {exp.note || 'No notes'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3 flex items-center space-x-2">
                      <div className="flex flex-col items-end">
                        <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                          ₹{Number(exp.amount).toFixed(2)}
                        </p>
                        <p className="text-[8px] text-gray-400 text-right mt-0.5">{exp.payment_method}</p>
                        {exp.status !== 'confirmed' && (
                          <span className={`inline-block px-1 py-0.5 rounded-sm text-[7px] font-bold uppercase mt-1 ${
                            exp.status === 'expected' ? 'bg-amber-100 text-amber-800' :
                            exp.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {exp.status}
                          </span>
                        )}
                      </div>
                      <Icons.ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        </div>
      )}

      {/* Edit / Detail Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Expense Details</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateExpense} className="mt-4 space-y-4">
              {/* Amount */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Amount (INR)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={editAmount}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setEditAmount(val)
                    }
                  }}
                  className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-extrabold text-lg"
                />
              </div>

              {/* Paid By */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Paid By</label>
                <select
                  value={editPaidBy}
                  onChange={(e) => setEditPaidBy(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Payment Method</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Time</label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Merchant & Note */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Merchant</label>
                  <input
                    type="text"
                    value={editMerchant}
                    onChange={(e) => setEditMerchant(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Note</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-100 dark:border-gray-800 rounded-lg">
                  {categories.map((c) => {
                    const isSelected = editCategory === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditCategory(c.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <CategoryIcon name={c.icon} className="h-4 w-4 mb-0.5" />
                        <span className="text-[8px] font-bold truncate w-full">{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="expected">Expected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="ignored">Ignored</option>
                </select>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={handleDeleteExpense}
                  disabled={loading}
                  className="w-1/2 flex items-center justify-center rounded-xl border border-red-200 text-red-600 py-3 text-xs font-bold hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 disabled:opacity-50"
                >
                  <Icons.Trash className="h-4 w-4 mr-1.5" />
                  Delete
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 flex items-center justify-center rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

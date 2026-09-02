'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  SlidersHorizontal,
  Lock,
  ChevronRight,
  Trash2,
  X,
  Loader2,
  Calendar,
  Clock,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { editExpense, softDeleteExpense } from '@/app/actions/expenses'
import { CategoryIconBox, getCategoryColor } from '@/lib/category-colors'
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
  is_private: boolean
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
  currentUserId?: string
  serverTodayStr: string
}

export function PaymentMethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    UPI: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    Cash: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    Card: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    Bank: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  }
  const badgeStyle = styles[method] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300'

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${badgeStyle}`}
    >
      {method}
    </span>
  )
}

export default function HistoryClient({
  initialExpenses,
  members,
  categories,
  currentUserId,
  serverTodayStr,
}: HistoryClientProps) {
  const router = useRouter()

  // Filter States
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState('all')
  const [onlyMyExpenses, setOnlyMyExpenses] = useState(false)
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
  const [editIsPrivate, setEditIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filter Logic
  const filteredExpenses = initialExpenses.filter((exp) => {
    // Search query
    const term = search.toLowerCase()
    const matchesSearch =
      !term ||
      (exp.merchant?.toLowerCase() || '').includes(term) ||
      (exp.categories?.name?.toLowerCase() || '').includes(term) ||
      (exp.note?.toLowerCase() || '').includes(term)

    // Member filter
    const matchesMember = selectedMember === 'all' || exp.user_id === selectedMember

    // Only my expenses filter
    const matchesMyOnly = !onlyMyExpenses || (currentUserId ? exp.user_id === currentUserId : true)

    // Category filter
    const matchesCategory = selectedCategory === 'all' || exp.category_id === selectedCategory

    // Payment Method filter
    const matchesPayment = selectedPayment === 'all' || exp.payment_method === selectedPayment

    return matchesSearch && matchesMember && matchesMyOnly && matchesCategory && matchesPayment
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
    setEditIsPrivate(exp.is_private || false)
    setErrorMsg(null)
  }

  const closeEditModal = () => {
    setEditingExpense(null)
  }

  // Auto-open edit modal from query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const editId = params.get('edit')
      if (editId) {
        const match = initialExpenses.find((e) => e.id === editId)
        if (match) {
          openEditModal(match)
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
      isPrivate: editIsPrivate,
    })

    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      closeEditModal()
      router.refresh()
    }
  }

  const handleDeleteExpense = async () => {
    if (!editingExpense) return
    if (!confirm('Are you sure you want to delete this expense?')) return

    setLoading(true)
    const res = await softDeleteExpense(editingExpense.id)
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      closeEditModal()
      router.refresh()
    }
  }

  // Active filters count and list for chips
  const activeFilters = []
  if (selectedMember !== 'all') {
    const mem = members.find((m) => m.id === selectedMember)
    activeFilters.push({
      label: `Paid by: ${mem?.name || selectedMember}`,
      clear: () => setSelectedMember('all'),
    })
  }
  if (selectedCategory !== 'all') {
    const cat = categories.find((c) => c.id === selectedCategory)
    activeFilters.push({
      label: `Category: ${cat?.name || selectedCategory}`,
      clear: () => setSelectedCategory('all'),
    })
  }
  if (selectedPayment !== 'all') {
    activeFilters.push({
      label: `Method: ${selectedPayment}`,
      clear: () => setSelectedPayment('all'),
    })
  }
  if (onlyMyExpenses) {
    activeFilters.push({
      label: 'Only My Expenses',
      clear: () => setOnlyMyExpenses(false),
    })
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search merchant, category, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-2xl border border-gray-200 bg-white py-2.5 pr-3 pl-10 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
            showFilters || activeFilters.length > 0
              ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
          }`}
          title="Filter expenses"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {activeFilters.map((f, i) => (
            <button
              key={i}
              onClick={f.clear}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition"
            >
              <span>{f.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedMember('all')
              setSelectedCategory('all')
              setSelectedPayment('all')
              setOnlyMyExpenses(false)
              setSearch('')
            }}
            className="text-[10px] font-bold text-red-500 hover:underline px-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-bold text-gray-900 dark:text-white">Filter Criteria</span>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Filter by Member */}
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Paid By
              </label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 bg-white p-2 text-[11px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 bg-white p-2 text-[11px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Payment
              </label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 bg-white p-2 text-[11px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank">Bank</option>
              </select>
            </div>
          </div>

          {/* Quick Only My Expenses Toggle */}
          <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span>Only show my expenses</span>
            </label>
            <input
              type="checkbox"
              checked={onlyMyExpenses}
              onChange={(e) => setOnlyMyExpenses(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Transaction List */}
      {sortedDates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center text-gray-400 text-xs">
          No expenses match the current filters.
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

                <div className="space-y-2.5">
                  {grouped[date].map((exp) => {
                    const displayTitle =
                      exp.merchant?.trim() || exp.categories?.name || 'Expense'
                    const noteText = exp.note?.trim()

                    return (
                      <button
                        key={exp.id}
                        onClick={() => openEditModal(exp)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition shadow-xs hover:border-indigo-400 ${
                          exp.is_private
                            ? 'bg-amber-50/40 border-amber-200/50 dark:bg-amber-950/15 dark:border-amber-900/30'
                            : 'bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <CategoryIconBox
                            categoryName={exp.categories?.name}
                            iconName={exp.categories?.icon}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {displayTitle}
                              </p>
                              {exp.is_private && (
                                <span
                                  className="inline-flex items-center text-amber-600 dark:text-amber-400"
                                  title="Private Expense"
                                >
                                  <Lock className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">
                              Paid by {exp.profiles?.name || 'Someone'}
                              {noteText ? ` • ${noteText}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3 flex items-center space-x-2">
                          <div className="flex flex-col items-end">
                            <p className="text-xs font-black text-rose-600 dark:text-rose-400">
                              ₹{Number(exp.amount).toFixed(2)}
                            </p>
                            <div className="mt-1 flex items-center gap-1">
                              <PaymentMethodBadge method={exp.payment_method} />
                              {exp.status !== 'confirmed' && (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                                    exp.status === 'expected'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                      : exp.status === 'pending'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {exp.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / Detail Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Expense Details</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-2xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateExpense} className="mt-4 space-y-4">
              {/* Amount */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-base font-bold text-rose-500">
                    ₹
                  </span>
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
                    className="block w-full rounded-2xl border border-gray-200 py-2.5 pr-3 pl-8 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-extrabold text-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Paid By */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Paid By
                </label>
                <select
                  value={editPaidBy}
                  onChange={(e) => setEditPaidBy(e.target.value)}
                  className="block w-full rounded-2xl border border-gray-200 bg-white py-2.5 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Category
                </label>
                <select
                  value={editCategory || ''}
                  onChange={(e) => setEditCategory(e.target.value || null)}
                  className="block w-full rounded-2xl border border-gray-200 bg-white py-2.5 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Payment Method
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                  className="block w-full rounded-2xl border border-gray-200 bg-white py-2.5 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>

              {/* Merchant */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Merchant / Payee
                </label>
                <input
                  type="text"
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  placeholder="e.g. Swiggy, Amazon"
                  className="block w-full rounded-2xl border border-gray-200 py-2.5 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Note */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Note
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Additional notes"
                  className="block w-full rounded-2xl border border-gray-200 py-2.5 px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="block w-full rounded-2xl border border-gray-200 py-2 px-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="block w-full rounded-2xl border border-gray-200 bg-white py-2 px-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="expected">Expected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Private Expense Checkbox in Edit Modal */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-150 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Private Expense
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editIsPrivate}
                  onChange={(e) => setEditIsPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center rounded-2xl bg-indigo-600 py-3 px-4 font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 text-xs"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleDeleteExpense}
                    disabled={loading}
                    className="flex-1 flex justify-center items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 py-2.5 px-3 font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="flex-1 rounded-2xl border border-gray-200 bg-white py-2.5 px-3 font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

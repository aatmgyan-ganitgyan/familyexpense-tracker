'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart,
  Users,
  CreditCard,
  BarChart3,
  Coins,
} from 'lucide-react'
import { CategoryIconBox, getCategoryColor } from '@/lib/category-colors'

interface Expense {
  id: string
  amount: number
  category_id: string | null
  merchant: string | null
  payment_method: 'UPI' | 'Cash' | 'Card' | 'Bank'
  expense_date: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'ignored' | 'expected'
  is_private: boolean
  user_id: string
  categories?: { name: string; icon: string } | null
  profiles?: { id: string; name: string } | null
}

interface Member {
  id: string
  name: string
}

interface ReportsClientProps {
  initialExpenses: Expense[]
  members: Member[]
  todayStr: string
}

const MEMBER_COLORS = [
  { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-950/40' },
  { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50 dark:bg-purple-950/40' },
  { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-950/40' },
  { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50 dark:bg-rose-950/40' },
  { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950/40' },
  { bg: 'bg-teal-500', text: 'text-teal-600', light: 'bg-teal-50 dark:bg-teal-950/40' },
]

export function getMemberInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function ReportsClient({
  initialExpenses,
  members,
  todayStr,
}: ReportsClientProps) {
  // Available Months for dropdown (last 12 months)
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string; year: number; month: number }[] = []
    const [currYear, currMonth] = todayStr.split('-').map(Number)

    for (let i = 0; i < 12; i++) {
      const d = new Date(currYear, currMonth - 1 - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const key = `${year}-${String(month).padStart(2, '0')}`
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      list.push({ key, label, year, month })
    }
    return list
  }, [todayStr])

  const [selectedMonthKey, setSelectedMonthKey] = useState(availableMonths[0]?.key || '')

  // Filter valid spendable expenses
  const spendableExpenses = useMemo(() => {
    return initialExpenses.filter(
      (e) => e.status === 'confirmed' || e.status === 'pending'
    )
  }, [initialExpenses])

  // Current selected month expenses
  const currentMonthExpenses = useMemo(() => {
    return spendableExpenses.filter((e) => e.expense_date.startsWith(selectedMonthKey))
  }, [spendableExpenses, selectedMonthKey])

  // Previous month expenses for comparison
  const previousMonthExpenses = useMemo(() => {
    const [y, m] = selectedMonthKey.split('-').map(Number)
    const prevDate = new Date(y, m - 2, 1)
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    return spendableExpenses.filter((e) => e.expense_date.startsWith(prevKey))
  }, [spendableExpenses, selectedMonthKey])

  const totalCurrentSpent = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalPreviousSpent = previousMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // Month-over-month calculation
  const momChange = useMemo(() => {
    if (totalPreviousSpent === 0) return null
    return ((totalCurrentSpent - totalPreviousSpent) / totalPreviousSpent) * 100
  }, [totalCurrentSpent, totalPreviousSpent])

  // Category breakdown for selected month
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; icon: string; amount: number; count: number }> = {}

    currentMonthExpenses.forEach((exp) => {
      const catName = exp.categories?.name || 'Other'
      const catIcon = exp.categories?.icon || 'Coins'
      if (!map[catName]) {
        map[catName] = { name: catName, icon: catIcon, amount: 0, count: 0 }
      }
      map[catName].amount += Number(exp.amount)
      map[catName].count += 1
    })

    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [currentMonthExpenses])

  // Member breakdown for selected month
  const memberBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; amount: number; count: number }> = {}

    currentMonthExpenses.forEach((exp) => {
      const memberId = exp.user_id
      const memberName = exp.profiles?.name || 'Family Member'
      if (!map[memberId]) {
        map[memberId] = { id: memberId, name: memberName, amount: 0, count: 0 }
      }
      map[memberId].amount += Number(exp.amount)
      map[memberId].count += 1
    })

    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [currentMonthExpenses])

  // Payment method breakdown
  const paymentMethodBreakdown = useMemo(() => {
    const map: Record<string, number> = { UPI: 0, Cash: 0, Card: 0, Bank: 0 }
    currentMonthExpenses.forEach((exp) => {
      if (map[exp.payment_method] !== undefined) {
        map[exp.payment_method] += Number(exp.amount)
      }
    })
    return Object.entries(map).map(([method, amount]) => ({ method, amount }))
  }, [currentMonthExpenses])

  // 6-Month Spending Trend
  const sixMonthTrend = useMemo(() => {
    const months = availableMonths.slice(0, 6).reverse()
    const data = months.map((m) => {
      const monthExpenses = spendableExpenses.filter((e) => e.expense_date.startsWith(m.key))
      const total = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      const shortName = new Date(m.year, m.month - 1, 1).toLocaleString('en-US', { month: 'short' })
      return { key: m.key, label: shortName, amount: total }
    })
    const maxAmount = Math.max(...data.map((d) => d.amount), 1)
    return { data, maxAmount }
  }, [availableMonths, spendableExpenses])

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Monthly spending insights and trends
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <select
          value={selectedMonthKey}
          onChange={(e) => setSelectedMonthKey(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-xs focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {availableMonths.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main Monthly Spend Card with MoM Comparison */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
          <TrendingUp className="h-40 w-40" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
          Monthly Total Spend
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">
          ₹{totalCurrentSpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {momChange !== null ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                momChange > 0
                  ? 'bg-rose-500/25 text-rose-200 border border-rose-400/30'
                  : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
              }`}
            >
              {momChange > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(momChange).toFixed(1)}% {momChange > 0 ? 'more' : 'less'} vs last month
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-indigo-100">
              First recorded month
            </span>
          )}

          <span className="text-xs text-indigo-200">
            • {currentMonthExpenses.length} transaction{currentMonthExpenses.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* 6-Month Spending Trend Bar Chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              6-Month Trend
            </h3>
          </div>
        </div>

        <div className="mt-4 flex h-32 items-end justify-between gap-2 pt-2 border-b border-gray-100 dark:border-gray-800 pb-2">
          {sixMonthTrend.data.map((d) => {
            const heightPct = Math.max((d.amount / sixMonthTrend.maxAmount) * 100, 4)
            const isSelected = d.key === selectedMonthKey

            return (
              <div
                key={d.key}
                onClick={() => setSelectedMonthKey(d.key)}
                className="flex flex-1 flex-col items-center gap-1.5 cursor-pointer group"
              >
                <span className="text-[9px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  ₹{Math.round(d.amount / 1000)}k
                </span>
                <div className="w-full h-24 flex items-end justify-center">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                      isSelected
                        ? 'bg-indigo-600 shadow-xs'
                        : 'bg-indigo-100 dark:bg-indigo-950/60 group-hover:bg-indigo-300 dark:group-hover:bg-indigo-900'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    isSelected
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-gray-400'
                  }`}
                >
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PieChart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Category Breakdown
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
            {categoryBreakdown.length} Categories
          </span>
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-400">
            No spending recorded for this month.
          </p>
        ) : (
          <div className="space-y-3.5">
            {categoryBreakdown.map((cat) => {
              const pct = totalCurrentSpent > 0 ? (cat.amount / totalCurrentSpent) * 100 : 0
              const colors = getCategoryColor(cat.name)

              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <CategoryIconBox
                        categoryName={cat.name}
                        iconName={cat.icon}
                        size="sm"
                      />
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {cat.name}
                        </span>
                        <span className="ml-1.5 text-[10px] text-gray-400 font-medium">
                          ({cat.count} txn{cat.count !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-gray-900 dark:text-white">
                        ₹{cat.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="ml-1.5 text-[10px] font-semibold text-gray-400">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${colors.solid || 'bg-indigo-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Member Breakdown */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Members Breakdown
            </h3>
          </div>
        </div>

        {memberBreakdown.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-400">
            No member expenses this month.
          </p>
        ) : (
          <div className="space-y-3">
            {memberBreakdown.map((m, idx) => {
              const color = MEMBER_COLORS[idx % MEMBER_COLORS.length]
              const pct = totalCurrentSpent > 0 ? (m.amount / totalCurrentSpent) * 100 : 0

              return (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-black ${color.bg}`}
                      >
                        {getMemberInitials(m.name)}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {m.name}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-gray-900 dark:text-white">
                        ₹{m.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="ml-1.5 text-[10px] font-semibold text-gray-400">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${color.bg}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Payment Methods Breakdown */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Payment Methods
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {paymentMethodBreakdown.map(({ method, amount }) => {
            const pct = totalCurrentSpent > 0 ? (amount / totalCurrentSpent) * 100 : 0
            return (
              <div
                key={method}
                className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">{method}</span>
                  <span className="font-semibold text-[10px] text-gray-400">{pct.toFixed(0)}%</span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-gray-900 dark:text-white">
                  ₹{amount.toLocaleString('en-IN')}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

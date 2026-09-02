'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CategoryIconBox, getCategoryColor } from '@/lib/category-colors'
import { getISTDateString } from '@/lib/date'
import {
  LogOut,
  Users,
  TrendingUp,
  PlusCircle,
  QrCode,
  Sparkles,
  ChevronDown,
  Calendar,
} from 'lucide-react'

interface Expense {
  id: string
  amount: number
  merchant: string | null
  expense_date: string
  expense_time: string
  note: string | null
  status: string
  payment_method: string
  source: string
  categories: {
    name: string
    icon: string
  } | null
  profiles: {
    name: string
  } | null
}

interface DashboardProps {
  userName: string
  familyName: string
  inviteCode: string
  memberCount: number
  initialExpenses: Expense[]
  serverTodayStr: string
}

const MEMBER_COLORS = [
  { bg: 'bg-indigo-500', bar: 'bg-indigo-500' },
  { bg: 'bg-emerald-500', bar: 'bg-emerald-500' },
  { bg: 'bg-purple-500', bar: 'bg-purple-500' },
  { bg: 'bg-amber-500', bar: 'bg-amber-500' },
  { bg: 'bg-rose-500', bar: 'bg-rose-500' },
  { bg: 'bg-blue-500', bar: 'bg-blue-500' },
  { bg: 'bg-teal-500', bar: 'bg-teal-500' },
]

function getMemberInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function Dashboard({
  userName,
  familyName,
  inviteCode,
  memberCount,
  initialExpenses,
  serverTodayStr,
}: DashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  // Primary active period (prominent: week, month, year; extended: today, quarter, custom)
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month')

  // Time utilities for filtering
  const todayStr = serverTodayStr
  const [customStart, setCustomStart] = useState(todayStr)
  const [customEnd, setCustomEnd] = useState(todayStr)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.replace('/login')
  }

  const getStartDateOfPeriod = () => {
    const start = new Date()
    if (period === 'today') {
      return todayStr
    } else if (period === 'week') {
      start.setDate(start.getDate() - 7)
    } else if (period === 'month') {
      start.setDate(start.getDate() - 30)
    } else if (period === 'quarter') {
      start.setDate(start.getDate() - 90)
    } else if (period === 'year') {
      start.setDate(start.getDate() - 365)
    } else if (period === 'custom') {
      return customStart
    }
    return getISTDateString(start)
  }

  const startDate = getStartDateOfPeriod()

  // Filtered expenses
  const filteredExpenses = initialExpenses.filter((exp) => {
    if (period === 'today') {
      return exp.expense_date === todayStr
    }
    if (period === 'custom') {
      return exp.expense_date >= customStart && exp.expense_date <= customEnd
    }
    return exp.expense_date >= startDate && exp.expense_date <= todayStr
  })

  // Calculations (exclude expected/cancelled from spent aggregates)
  const spendableExpenses = filteredExpenses.filter(
    (exp) => exp.status === 'confirmed' || exp.status === 'pending'
  )
  const totalSpent = spendableExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
  const transactionCount = spendableExpenses.length

  // Category breakdown
  const categoryGroups: { [key: string]: { name: string; icon: string; amount: number } } = {}
  spendableExpenses.forEach((exp) => {
    const catName = exp.categories?.name || 'Other'
    const catIcon = exp.categories?.icon || 'Coins'
    if (!categoryGroups[catName]) {
      categoryGroups[catName] = { name: catName, icon: catIcon, amount: 0 }
    }
    categoryGroups[catName].amount += Number(exp.amount)
  })

  const categoryBreakdown = Object.values(categoryGroups).sort((a, b) => b.amount - a.amount)

  // Member breakdown
  const memberGroups: { [key: string]: { name: string; amount: number } } = {}
  spendableExpenses.forEach((exp) => {
    const memberName = exp.profiles?.name || 'Unknown'
    if (!memberGroups[memberName]) {
      memberGroups[memberName] = { name: memberName, amount: 0 }
    }
    memberGroups[memberName].amount += Number(exp.amount)
  })

  const memberBreakdown = Object.values(memberGroups).sort((a, b) => b.amount - a.amount)

  const getSmartInsights = () => {
    const insights: string[] = []

    if (spendableExpenses.length === 0) {
      return ['No expenses recorded yet for this period. Start tracking to see insights!']
    }

    // Insight 1: Top Category
    if (categoryBreakdown.length > 0) {
      const topCat = categoryBreakdown[0]
      const pct = totalSpent > 0 ? (topCat.amount / totalSpent) * 100 : 0
      if (pct > 25) {
        insights.push(
          `🛒 ${topCat.name} is your highest spend (${pct.toFixed(0)}% of total: ₹${topCat.amount.toLocaleString('en-IN')}).`
        )
      }
    }

    // Insight 2: Largest Transaction
    const sortedByAmount = [...spendableExpenses].sort((a, b) => Number(b.amount) - Number(a.amount))
    if (sortedByAmount.length > 0) {
      const largest = sortedByAmount[0]
      const title = largest.merchant || largest.categories?.name || 'Expense'
      insights.push(
        `💸 Largest expense: ₹${Number(largest.amount).toLocaleString('en-IN')} on "${title}" (${largest.expense_date}).`
      )
    }

    // Insight 3: UPI utilization
    const upiTxns = spendableExpenses.filter((e) => e.payment_method === 'UPI').length
    if (transactionCount > 2) {
      const upiPct = (upiTxns / transactionCount) * 100
      if (upiPct > 60) {
        insights.push(`⚡ UPI accounted for ${upiPct.toFixed(0)}% of transactions.`)
      }
    }

    return insights.slice(0, 2)
  }

  // Recent 5 expenses
  const recentExpenses = filteredExpenses.slice(0, 5)

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider dark:text-gray-400">
            Family Workspace
          </p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[250px]">
            {familyName}
          </h1>
        </div>
        <button
          onClick={handleSignOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-red-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Greeting & Invite Card — only displayed if family has 1 member */}
      {memberCount <= 1 ? (
        <div className="mt-5 rounded-2xl bg-indigo-600 p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
            <TrendingUp className="h-32 w-32" />
          </div>
          <h2 className="text-lg font-bold">Hello, {userName}!</h2>
          <p className="mt-1 text-xs text-indigo-100">
            Invite family members to start tracking expenses together:
          </p>
          <div className="mt-3 flex items-center space-x-2 text-[10px] bg-indigo-700/50 rounded-lg py-2 px-3 w-fit">
            <Users className="h-3.5 w-3.5" />
            <span>
              Code: <strong>{inviteCode}</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 px-4 py-3 border border-indigo-100 dark:border-indigo-900/50">
          <div>
            <h2 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
              Welcome back, {userName}
            </h2>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
              {memberCount} active family members tracking
            </p>
          </div>
          <Link
            href="/more/family"
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            Family Settings
          </Link>
        </div>
      )}

      {/* Dashboard Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">Overview</h3>

          {/* Period selector: Prominent Week / Month / Year with More dropdown */}
          <div className="flex items-center space-x-1">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 text-[11px] font-semibold">
              {(['week', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg transition capitalize ${
                    period === p
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-xs font-bold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* "More" dropdown for Today / Quarter / Custom */}
            <div className="relative">
              <select
                value={['today', 'quarter', 'custom'].includes(period) ? period : 'more'}
                onChange={(e) => {
                  const val = e.target.value
                  if (val !== 'more') setPeriod(val as any)
                }}
                className={`rounded-xl border px-2 py-1 text-[11px] font-semibold appearance-none pr-6 cursor-pointer ${
                  ['today', 'quarter', 'custom'].includes(period)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <option value="more" disabled>
                  {['today', 'quarter', 'custom'].includes(period) ? period.toUpperCase() : 'More ▾'}
                </option>
                <option value="today">Today</option>
                <option value="quarter">Quarter (90d)</option>
                <option value="custom">Custom Range</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Custom date range picker overlay */}
        {period === 'custom' && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xs flex items-center justify-between space-x-2 text-xs">
            <div className="flex flex-col space-y-1 w-1/2">
              <span className="font-bold text-[9px] text-gray-400 uppercase">From</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
            <div className="flex flex-col space-y-1 w-1/2">
              <span className="font-bold text-[9px] text-gray-400 uppercase">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
          </div>
        )}

        {/* Aggregated Totals */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Total Spent
            </span>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Transactions
            </span>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {transactionCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights Section */}
      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950/30 dark:bg-indigo-950/15 shadow-xs">
        <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>Smart Insights</span>
        </h4>
        <ul className="space-y-2 text-xs text-indigo-900/80 dark:text-indigo-300 font-semibold">
          {getSmartInsights().map((insight, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Category breakdown progress bars */}
      {categoryBreakdown.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Categories
            </h4>
            <Link
              href="/more/reports"
              className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Full Report
            </Link>
          </div>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => {
              const percentage = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0
              const colors = getCategoryColor(cat.name)
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2 font-semibold text-gray-800 dark:text-gray-200">
                      <CategoryIconBox
                        categoryName={cat.name}
                        iconName={cat.icon}
                        size="sm"
                      />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-extrabold text-gray-900 dark:text-white">
                      ₹{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${colors.solid || 'bg-indigo-600'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Members Breakdown */}
      {memberBreakdown.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-xs">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Members Breakdown
          </h4>
          <div className="space-y-3">
            {memberBreakdown.map((member, idx) => {
              const percentage = totalSpent > 0 ? (member.amount / totalSpent) * 100 : 0
              const color = MEMBER_COLORS[idx % MEMBER_COLORS.length]
              return (
                <div key={member.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2 font-semibold text-gray-800 dark:text-gray-200">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white ${color.bg}`}
                      >
                        {getMemberInitials(member.name)}
                      </div>
                      <span>{member.name}</span>
                    </div>
                    <span className="font-extrabold text-gray-900 dark:text-white">
                      ₹{member.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${color.bar}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Recent Activity</h4>
          {filteredExpenses.length > 5 && (
            <Link
              href="/history"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              See all
            </Link>
          )}
        </div>

        {recentExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center text-xs text-gray-400">
            No expenses recorded for this period.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentExpenses.map((exp) => {
              const displayTitle =
                exp.merchant?.trim() || exp.categories?.name || 'Expense'
              const noteText = exp.note?.trim()

              return (
                <Link
                  key={exp.id}
                  href={`/history?edit=${exp.id}`}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xs hover:border-indigo-200 dark:hover:border-indigo-900/60 transition block w-full text-left"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <CategoryIconBox
                      categoryName={exp.categories?.name}
                      iconName={exp.categories?.icon}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {displayTitle}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        Paid by {exp.profiles?.name || 'Someone'}
                        {noteText ? ` • ${noteText}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3 flex flex-col items-end">
                    <p className="text-xs font-black text-rose-600 dark:text-rose-400">
                      ₹{Number(exp.amount).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{exp.expense_date}</p>
                    {exp.status !== 'confirmed' && (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase mt-1 ${
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
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Primary Actions Grid */}
      <div className="mt-8 grid grid-cols-3 gap-3 text-xs font-bold text-gray-600 dark:text-gray-400">
        <Link
          href="/scan"
          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:border-indigo-500 text-center space-y-2 transition"
        >
          <QrCode className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[10px]">Scan Pay</span>
        </Link>
        <Link
          href="/add"
          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:border-emerald-500 text-center space-y-2 transition"
        >
          <PlusCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-450" />
          <span className="text-[10px]">Add Manual</span>
        </Link>
        <Link
          href="/more"
          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:border-amber-500 text-center space-y-2 transition"
        >
          <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px]">More</span>
        </Link>
      </div>
    </div>
  )
}

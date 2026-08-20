'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CategoryIcon } from './add/add-expense-form'
import { getISTDateString } from '@/lib/date'
import {
  LogOut,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  PlusCircle,
  HelpCircle,
  QrCode,
  Sparkles,
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
  initialExpenses: Expense[]
  serverTodayStr: string
}

export default function Dashboard({
  userName,
  familyName,
  inviteCode,
  initialExpenses,
  serverTodayStr,
}: DashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('today')

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
  const spendableExpenses = filteredExpenses.filter((exp) => exp.status === 'confirmed' || exp.status === 'pending')
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
      return ["No expenses recorded yet. Start tracking to see insights!"]
    }

    // Insight 1: Top Category
    if (categoryBreakdown.length > 0) {
      const topCat = categoryBreakdown[0]
      const pct = totalSpent > 0 ? (topCat.amount / totalSpent) * 100 : 0
      if (pct > 30) {
        insights.push(
          `🛒 ${topCat.name} is your highest category, making up ${pct.toFixed(0)}% of your spending.`
        )
      }
    }

    // Insight 2: Largest Transaction
    const sortedByAmount = [...spendableExpenses].sort((a, b) => Number(b.amount) - Number(a.amount))
    if (sortedByAmount.length > 0) {
      const largest = sortedByAmount[0]
      insights.push(
        `💸 Largest single expense was ₹${Number(largest.amount).toFixed(0)} on "${largest.merchant || 'Expense'}" on ${largest.expense_date}.`
      )
    }

    // Insight 3: Weekly comparison
    const now = new Date()
    const getDaysAgo = (days: number) => {
      const d = new Date()
      d.setDate(d.getDate() - days)
      return getISTDateString(d)
    }

    const sevenDaysAgo = getDaysAgo(7)
    const fourteenDaysAgo = getDaysAgo(14)

    const thisWeekExpenses = initialExpenses.filter(
      (e) => (e.status === 'confirmed' || e.status === 'pending') && e.expense_date >= sevenDaysAgo && e.expense_date <= todayStr
    )
    const prevWeekExpenses = initialExpenses.filter(
      (e) => (e.status === 'confirmed' || e.status === 'pending') && e.expense_date >= fourteenDaysAgo && e.expense_date < sevenDaysAgo
    )

    const thisWeekTotal = thisWeekExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const prevWeekTotal = prevWeekExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

    if (prevWeekTotal > 0) {
      const change = ((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100
      if (change > 5) {
        insights.push(
          `📈 Weekly spending is up by ${change.toFixed(0)}% compared to the previous 7 days.`
        )
      } else if (change < -5) {
        insights.push(
          `📉 Great job! Weekly spending is down by ${Math.abs(change).toFixed(0)}% compared to the previous 7 days.`
        )
      }
    }

    // Insight 4: UPI utilization
    const upiTxns = spendableExpenses.filter(e => e.payment_method === 'UPI').length
    if (transactionCount > 2) {
      const upiPct = (upiTxns / transactionCount) * 100
      if (upiPct > 70) {
        insights.push(`⚡ UPI is your preferred payment method, used for ${upiPct.toFixed(0)}% of your transactions.`)
      }
    }

    // Pick top 2 insights
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
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-red-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Greeting card */}
      <div className="mt-5 rounded-2xl bg-indigo-600 p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
          <TrendingUp className="h-32 w-32" />
        </div>
        <h2 className="text-lg font-bold">Hello, {userName}!</h2>
        <p className="mt-1 text-xs text-indigo-100">
          Tracking your family expenses made easy. Invite your members using this code:
        </p>
        <div className="mt-3 flex items-center space-x-2 text-[10px] bg-indigo-700/50 rounded-lg py-2 px-3 w-fit">
          <Users className="h-3.5 w-3.5" />
          <span>
            Code: <strong>{inviteCode}</strong>
          </span>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">Overview</h3>
          {/* Period selector */}
          <div className="flex overflow-x-auto scrollbar-none bg-gray-200/70 dark:bg-gray-800/80 rounded-lg p-0.5 text-[10px] font-semibold space-x-0.5 max-w-[210px] sm:max-w-xs">
            {(['today', 'week', 'month', 'quarter', 'year', 'custom'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1.5 rounded-md transition capitalize flex-shrink-0 ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
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
                className="block w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] text-gray-705 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
            <div className="flex flex-col space-y-1 w-1/2">
              <span className="font-bold text-[9px] text-gray-400 uppercase">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] text-gray-705 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
          </div>
        )}

        {/* Aggregated Totals */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Spent</span>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Txns</span>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {transactionCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights Section */}
      <div className="mt-6 rounded-xl border border-indigo-150 bg-indigo-50/50 p-4 dark:border-indigo-950/30 dark:bg-indigo-950/15 shadow-xs">
        <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
          <Sparkles className="h-4 w-4" />
          <span>Smart Insights</span>
        </h4>
        <ul className="space-y-2 text-xs text-indigo-900/80 dark:text-indigo-300 font-semibold">
          {getSmartInsights().map((insight, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="mt-0.5 flex-shrink-0">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Category breakdown progress bars */}
      {categoryBreakdown.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categories</h4>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => {
              const percentage = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-1.5 font-medium text-gray-700 dark:text-gray-300">
                      <CategoryIcon name={cat.icon} className="h-3.5 w-3.5 text-gray-400" />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹{cat.amount.toFixed(0)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
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
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Members Breakdown</h4>
          <div className="space-y-3">
            {memberBreakdown.map((member) => {
              const percentage = totalSpent > 0 ? (member.amount / totalSpent) * 100 : 0
              return (
                <div key={member.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{member.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹{member.amount.toFixed(0)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
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
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
            >
              See all
            </Link>
          )}
        </div>

        {recentExpenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center text-xs text-gray-400">
            No expenses recorded for this period.
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map((exp) => (
              <Link
                key={exp.id}
                href={`/history?edit=${exp.id}`}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xs hover:border-indigo-150 dark:hover:border-indigo-900/60 transition block w-full text-left"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0">
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
                <div className="text-right flex-shrink-0 ml-3 flex flex-col items-end">
                  <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                    ₹{Number(exp.amount).toFixed(2)}
                  </p>
                  <p className="text-[8px] text-gray-400 mt-0.5">{exp.expense_date}</p>
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
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Primary Actions Grid */}
      <div className="mt-8 grid grid-cols-3 gap-3 text-xs font-bold text-gray-600 dark:text-gray-400">
        <Link
          href="/scan"
          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:border-indigo-500 text-center space-y-2"
        >
          <QrCode className="h-6 w-6 text-indigo-650 dark:text-indigo-400" />
          <span className="text-[10px]">Scan Pay</span>
        </Link>
        <Link
          href="/add"
          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:border-emerald-500 text-center space-y-2"
        >
          <PlusCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-450" />
          <span className="text-[10px]">Add Manual</span>
        </Link>
        <Link
          href="/more"
          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:border-amber-500 text-center space-y-2"
        >
          <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px]">Settings</span>
        </Link>
      </div>
    </div>
  )
}

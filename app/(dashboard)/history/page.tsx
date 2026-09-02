import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryClient from './history-client'
import { getISTDateString } from '@/lib/date'

export default async function HistoryPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile to check family_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    redirect('/onboarding')
  }

  // 3. Fetch family members
  const { data: members } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('family_id', profile.family_id)
    .order('name', { ascending: true })

  // 4. Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .or(`family_id.is.null,family_id.eq.${profile.family_id}`)
    .order('name', { ascending: true })

  // 5. Fetch all non-deleted expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, categories(name, icon), profiles:profiles!expenses_user_id_fkey(name)')
    .eq('family_id', profile.family_id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('expense_time', { ascending: false })

  const todayStr = getISTDateString(new Date())

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense History</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        View and manage all family expenditures
      </p>

      <div className="mt-6">
        <HistoryClient
          initialExpenses={(expenses || []) as any}
          members={members || []}
          categories={categories || []}
          currentUserId={user.id}
          serverTodayStr={todayStr}
        />
      </div>
    </div>
  )
}

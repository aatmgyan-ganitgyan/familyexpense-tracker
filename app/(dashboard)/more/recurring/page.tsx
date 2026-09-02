import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecurringClient from './recurring-client'
import { getISTDateString } from '@/lib/date'

export default async function RecurringPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    redirect('/onboarding')
  }

  // 3. Fetch recurring expenses
  const { data: recurringExpenses } = await supabase
    .from('recurring_expenses')
    .select('*, categories(id, name, icon), profiles:profiles!recurring_expenses_user_id_fkey(id, name)')
    .eq('family_id', profile.family_id)
    .order('next_due_date', { ascending: true })

  // 4. Fetch categories for adding new recurring
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .or(`family_id.is.null,family_id.eq.${profile.family_id}`)
    .order('name', { ascending: true })

  // 5. Fetch members for payer selection
  const { data: members } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('family_id', profile.family_id)
    .order('name', { ascending: true })

  const todayStr = getISTDateString(new Date())

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <RecurringClient
        initialRecurring={(recurringExpenses || []) as any}
        categories={categories || []}
        members={members || []}
        currentUserId={user.id}
        todayStr={todayStr}
      />
    </div>
  )
}

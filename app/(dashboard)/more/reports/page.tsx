import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './reports-client'
import { getISTDateString } from '@/lib/date'

export default async function ReportsPage() {
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

  // 3. Fetch all non-deleted expenses for the family
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, amount, category_id, merchant, payment_method, expense_date, status, is_private, user_id, categories(name, icon), profiles:profiles!expenses_user_id_fkey(id, name)')
    .eq('family_id', profile.family_id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })

  // 4. Fetch family members
  const { data: members } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('family_id', profile.family_id)
    .order('name', { ascending: true })

  const todayStr = getISTDateString(new Date())

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <ReportsClient
        initialExpenses={(expenses || []) as any}
        members={members || []}
        todayStr={todayStr}
      />
    </div>
  )
}

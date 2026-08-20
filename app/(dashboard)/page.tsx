import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from './dashboard'
import { getISTDateString } from '@/lib/date'

export default async function HomePage() {
  const supabase = await createClient()

  // 1. Get user details
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile & family details
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, family_id, families(name, invite_code)')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    redirect('/onboarding')
  }

  // 3. Fetch all non-deleted expenses for this family
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, categories(name, icon), profiles:profiles!expenses_user_id_fkey(name)')
    .eq('family_id', profile.family_id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('expense_time', { ascending: false })

  const familyName = (profile?.families as any)?.name || 'Family Workspace'
  const inviteCode = (profile?.families as any)?.invite_code || ''
  const todayStr = getISTDateString(new Date())

  return (
    <Dashboard
      userName={profile.name}
      familyName={familyName}
      inviteCode={inviteCode}
      initialExpenses={(expenses || []) as any}
      serverTodayStr={todayStr}
    />
  )
}

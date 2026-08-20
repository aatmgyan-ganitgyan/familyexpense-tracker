import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BudgetClient from './budget-client'

export default async function BudgetPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    redirect('/onboarding')
  }

  // 3. Fetch budgets
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('family_id', profile.family_id)
    .eq('period', 'monthly')

  const familyBudget = budgets?.find((b) => b.user_id === null)?.amount || 0
  const personalBudget = budgets?.find((b) => b.user_id === user.id)?.amount || 0

  // 4. Calculate current month's spending
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const startOfMonth = `${year}-${month}-01`
  
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  const { data: monthExpenses } = await supabase
    .from('expenses')
    .select('amount, user_id')
    .eq('family_id', profile.family_id)
    .is('deleted_at', null)
    .gte('expense_date', startOfMonth)
    .lte('expense_date', endOfMonth)

  const familySpent = monthExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
  const personalSpent = monthExpenses
    ?.filter((exp) => exp.user_id === user.id)
    .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <BudgetClient
        currentUserProfileId={user.id}
        initialFamilyBudget={Number(familyBudget)}
        initialPersonalBudget={Number(personalBudget)}
        familySpent={familySpent}
        personalSpent={personalSpent}
      />
    </div>
  )
}

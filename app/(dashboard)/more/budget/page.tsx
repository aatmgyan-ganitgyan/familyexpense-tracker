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
    .select('id, amount, user_id, category_id, period')
    .eq('family_id', profile.family_id)
    .eq('period', 'monthly')

  const familyBudget = budgets?.find((b) => !b.user_id && !b.category_id)?.amount || 0
  const personalBudget = budgets?.find((b) => b.user_id === user.id && !b.category_id)?.amount || 0

  // 4. Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .or(`family_id.is.null,family_id.eq.${profile.family_id}`)
    .order('name', { ascending: true })

  // 5. Calculate current month's spending
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const startOfMonth = `${year}-${month}-01`
  
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  const { data: monthExpenses } = await supabase
    .from('expenses')
    .select('amount, user_id, category_id')
    .eq('family_id', profile.family_id)
    .is('deleted_at', null)
    .gte('expense_date', startOfMonth)
    .lte('expense_date', endOfMonth)

  const familySpent = monthExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
  const personalSpent = monthExpenses
    ?.filter((exp) => exp.user_id === user.id)
    .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

  // Category spent map
  const categorySpentMap: Record<string, number> = {}
  monthExpenses?.forEach((exp) => {
    if (exp.category_id) {
      categorySpentMap[exp.category_id] = (categorySpentMap[exp.category_id] || 0) + Number(exp.amount)
    }
  })

  // Category budgets list
  const categoryBudgets = (budgets?.filter((b) => b.category_id) || []).map((b) => ({
    id: b.id,
    categoryId: b.category_id!,
    amount: Number(b.amount),
  }))

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <BudgetClient
        currentUserProfileId={user.id}
        initialFamilyBudget={Number(familyBudget)}
        initialPersonalBudget={Number(personalBudget)}
        familySpent={familySpent}
        personalSpent={personalSpent}
        categories={categories || []}
        initialCategoryBudgets={categoryBudgets}
        categorySpentMap={categorySpentMap}
      />
    </div>
  )
}

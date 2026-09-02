import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddExpenseForm from './add-expense-form'

export default async function AddExpensePage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch current user profile to get family_id
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

  // 4. Fetch categories (both global defaults and family-specific)
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .or(`family_id.is.null,family_id.eq.${profile.family_id}`)
    .order('name', { ascending: true })

  // 5. Fetch known merchants for autocomplete
  const { data: merchants } = await supabase
    .from('merchants')
    .select('merchant_name, default_category_id')
    .eq('family_id', profile.family_id)
    .order('merchant_name', { ascending: true })

  // 6. Fetch recent expenses to determine top recently-used category IDs
  const { data: recentExpenses } = await supabase
    .from('expenses')
    .select('category_id')
    .eq('family_id', profile.family_id)
    .is('deleted_at', null)
    .not('category_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30)

  // Extract unique top 5 recently used category IDs
  const recentCatCount: Record<string, number> = {}
  recentExpenses?.forEach((e) => {
    if (e.category_id) {
      recentCatCount[e.category_id] = (recentCatCount[e.category_id] || 0) + 1
    }
  })
  const recentCategoryIds = Object.entries(recentCatCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Enter a new expense for your family workspace
      </p>

      <div className="mt-6">
        <AddExpenseForm
          currentUserProfileId={user.id}
          members={members || []}
          categories={categories || []}
          merchants={merchants || []}
          recentCategoryIds={recentCategoryIds}
        />
      </div>
    </div>
  )
}

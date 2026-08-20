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

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a new expense for your family workspace</p>
      
      <div className="mt-6">
        <AddExpenseForm
          currentUserProfileId={user.id}
          members={members || []}
          categories={categories || []}
        />
      </div>
    </div>
  )
}

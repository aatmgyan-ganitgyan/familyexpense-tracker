import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CategoriesClient from './categories-client'

export default async function CategoriesPage() {
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
    .select('family_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    redirect('/onboarding')
  }

  // 3. Fetch all categories (global defaults + family-specific)
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, family_id, created_at')
    .or(`family_id.is.null,family_id.eq.${profile.family_id}`)
    .order('name', { ascending: true })

  const isAdmin = profile.role === 'admin'

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <CategoriesClient
        initialCategories={categories || []}
        isAdmin={isAdmin}
        familyId={profile.family_id}
      />
    </div>
  )
}

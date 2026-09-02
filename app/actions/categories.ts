'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface AddCategoryInput {
  name: string
  icon: string
}

export async function addCustomCategory(input: AddCategoryInput) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 2. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return { error: 'No family workspace associated' }
  }

  const cleanName = input.name.trim()
  const cleanIcon = input.icon.trim() || 'Tag'

  if (!cleanName) {
    return { error: 'Category name is required' }
  }

  // 3. Insert custom category
  const { data, error } = await supabase
    .from('categories')
    .insert({
      family_id: profile.family_id,
      name: cleanName,
      icon: cleanIcon,
    })
    .select('id, name, icon, family_id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/categories')
  revalidatePath('/add')
  revalidatePath('/history')
  revalidatePath('/')
  return { success: true, category: data }
}

export async function deleteCustomCategory(categoryId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 2. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return { error: 'No family workspace associated' }
  }

  // 3. Delete only if it belongs to this family (prevents deleting global categories)
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('family_id', profile.family_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/categories')
  revalidatePath('/add')
  revalidatePath('/history')
  revalidatePath('/')
  return { success: true }
}

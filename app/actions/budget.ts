'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface BudgetInput {
  userId: string | null // null for family budget
  amount: number
}

interface CategoryBudgetInput {
  categoryId: string
  amount: number
}

export async function saveBudget(input: BudgetInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return { error: 'No family workspace associated' }
  }

  // Check if budget exists for this period (monthly) and user_id combination
  const query = supabase
    .from('budgets')
    .select('id')
    .eq('family_id', profile.family_id)
    .eq('period', 'monthly')
    .is('category_id', null)

  if (input.userId) {
    query.eq('user_id', input.userId)
  } else {
    query.is('user_id', null)
  }

  const { data: existing, error: fetchError } = await query.maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }

  let dbResult
  if (existing) {
    // Update existing budget
    dbResult = await supabase
      .from('budgets')
      .update({ amount: input.amount })
      .eq('id', existing.id)
  } else {
    // Insert new budget
    dbResult = await supabase
      .from('budgets')
      .insert({
        family_id: profile.family_id,
        user_id: input.userId,
        period: 'monthly',
        amount: input.amount,
      })
  }

  if (dbResult.error) {
    return { error: dbResult.error.message }
  }

  revalidatePath('/more/budget')
  revalidatePath('/')
  return { success: true }
}

export async function saveCategoryBudget(input: CategoryBudgetInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return { error: 'No family workspace associated' }
  }

  if (input.amount <= 0 || isNaN(input.amount)) {
    return { error: 'Please enter a valid amount greater than 0.' }
  }

  // Check if budget exists for this category
  const { data: existing, error: fetchError } = await supabase
    .from('budgets')
    .select('id')
    .eq('family_id', profile.family_id)
    .eq('category_id', input.categoryId)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }

  let dbResult
  if (existing) {
    dbResult = await supabase
      .from('budgets')
      .update({ amount: input.amount })
      .eq('id', existing.id)
  } else {
    dbResult = await supabase
      .from('budgets')
      .insert({
        family_id: profile.family_id,
        category_id: input.categoryId,
        period: 'monthly',
        amount: input.amount,
      })
  }

  if (dbResult.error) {
    return { error: dbResult.error.message }
  }

  revalidatePath('/more/budget')
  revalidatePath('/')
  return { success: true }
}

export async function deleteCategoryBudget(budgetId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return { error: 'No family workspace associated' }
  }

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId)
    .eq('family_id', profile.family_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/budget')
  revalidatePath('/')
  return { success: true }
}

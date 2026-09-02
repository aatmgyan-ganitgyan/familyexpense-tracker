'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface AddRecurringInput {
  amount: number
  merchant: string
  categoryId: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  nextDueDate: string // YYYY-MM-DD
  userId?: string
}

export async function addRecurringExpense(input: AddRecurringInput) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 2. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return { error: 'No family workspace associated' }
  }

  if (input.amount <= 0 || isNaN(input.amount)) {
    return { error: 'Amount must be greater than zero.' }
  }

  const cleanMerchant = input.merchant.trim()
  if (!cleanMerchant) {
    return { error: 'Merchant / Description is required.' }
  }

  // 3. Insert recurring expense
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      family_id: profile.family_id,
      user_id: input.userId || user.id,
      amount: input.amount,
      merchant: cleanMerchant,
      category_id: input.categoryId || null,
      frequency: input.frequency,
      next_due_date: input.nextDueDate,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/recurring')
  revalidatePath('/')
  return { success: true, id: data.id }
}

export async function updateRecurringStatus(id: string, status: 'active' | 'paused' | 'cancelled') {
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
    .from('recurring_expenses')
    .update({ status })
    .eq('id', id)
    .eq('family_id', profile.family_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/recurring')
  revalidatePath('/')
  return { success: true }
}

export async function deleteRecurringExpense(id: string) {
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
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('family_id', profile.family_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/recurring')
  revalidatePath('/')
  return { success: true }
}

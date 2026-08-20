'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ExpenseInput {
  amount: number
  userId: string
  categoryId: string | null
  merchant: string
  upiId?: string
  paymentMethod: 'UPI' | 'Cash' | 'Card' | 'Bank'
  expenseDate: string // YYYY-MM-DD
  expenseTime: string // HH:MM:SS
  note?: string
  source: 'manual' | 'upi_qr' | 'recurring' | 'future_bank_integration'
  status: 'pending' | 'confirmed' | 'cancelled' | 'ignored' | 'expected'
  isPrivate?: boolean
}

// 1. Get previous merchant category (merchant memory)
export async function getMerchantDefaultCategory(merchantName: string) {
  if (!merchantName.trim()) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) return null

  // Query merchants table
  const { data: merchantData } = await supabase
    .from('merchants')
    .select('default_category_id')
    .eq('family_id', profile.family_id)
    .ilike('merchant_name', merchantName.trim())
    .maybeSingle()

  return merchantData?.default_category_id || null
}

// 2. Check for duplicate expenses
export async function checkDuplicateExpense(amount: number, merchantName: string, date: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { isDuplicate: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) return { isDuplicate: false }

  // Query non-deleted expenses on the same date with same amount and similar merchant
  const query = supabase
    .from('expenses')
    .select('id, amount, merchant, expense_date, status')
    .eq('family_id', profile.family_id)
    .eq('amount', amount)
    .eq('expense_date', date)
    .is('deleted_at', null)

  if (merchantName.trim()) {
    query.ilike('merchant', merchantName.trim())
  } else {
    query.is('merchant', null)
  }

  const { data: matches, error } = await query

  if (error || !matches || matches.length === 0) {
    return { isDuplicate: false }
  }

  return {
    isDuplicate: true,
    matches: matches.map((m) => ({
      id: m.id,
      amount: m.amount,
      merchant: m.merchant,
      date: m.expense_date,
      status: m.status,
    })),
  }
}

// 3. Save Expense (creates or updates merchant memory as well)
export async function saveExpense(input: ExpenseInput) {
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

  // Insert the expense
  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      family_id: profile.family_id,
      user_id: input.userId,
      amount: input.amount,
      category_id: input.categoryId,
      merchant: input.merchant.trim() || null,
      upi_id: input.upiId?.trim() || null,
      payment_method: input.paymentMethod,
      expense_date: input.expenseDate,
      expense_time: input.expenseTime,
      note: input.note?.trim() || null,
      source: input.source,
      status: input.status,
      is_private: input.isPrivate || false,
    })
    .select('id')
    .single()

  if (expenseError) {
    return { error: expenseError.message }
  }

  // Update or create merchant memory
  const merchantClean = input.merchant.trim()
  if (merchantClean && input.categoryId) {
    // Upsert merchant record
    const { error: merchantUpsertError } = await supabase.from('merchants').upsert(
      {
        family_id: profile.family_id,
        merchant_name: merchantClean,
        default_category_id: input.categoryId,
        upi_id: input.upiId?.trim() || null,
      },
      { onConflict: 'family_id, merchant_name' }
    )

    if (merchantUpsertError) {
      console.error('Failed to update merchant memory:', merchantUpsertError.message)
    }
  }

  revalidatePath('/')
  revalidatePath('/history')
  return { success: true, id: expenseData.id }
}

// 4. Update Expense (Edit)
export async function editExpense(id: string, input: Partial<ExpenseInput>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: any = {
    last_edited_at: new Date().toISOString(),
    edited_by: user.id,
  }

  if (input.amount !== undefined) updates.amount = input.amount
  if (input.categoryId !== undefined) updates.category_id = input.categoryId
  if (input.merchant !== undefined) updates.merchant = input.merchant.trim() || null
  if (input.upiId !== undefined) updates.upi_id = input.upiId?.trim() || null
  if (input.paymentMethod !== undefined) updates.payment_method = input.paymentMethod
  if (input.expenseDate !== undefined) updates.expense_date = input.expenseDate
  if (input.expenseTime !== undefined) updates.expense_time = input.expenseTime
  if (input.note !== undefined) updates.note = input.note?.trim() || null
  if (input.status !== undefined) updates.status = input.status
  if (input.isPrivate !== undefined) updates.is_private = input.isPrivate

  const { error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Upsert merchant memory if category and merchant are edited
  if (input.merchant && input.categoryId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (profile?.family_id) {
      await supabase.from('merchants').upsert(
        {
          family_id: profile.family_id,
          merchant_name: input.merchant.trim(),
          default_category_id: input.categoryId,
        },
        { onConflict: 'family_id, merchant_name' }
      )
    }
  }

  revalidatePath('/')
  revalidatePath('/history')
  return { success: true }
}

// 5. Soft Delete Expense
export async function softDeleteExpense(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('expenses')
    .update({
      deleted_at: new Date().toISOString(),
      edited_by: user.id,
      last_edited_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/history')
  return { success: true }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = Math.floor(Math.random() * 3) + 6 // 6, 7, or 8 characters
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createFamily(familyName: string) {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  console.log('DEBUG createFamily auth:', {
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  if (!familyName.trim()) {
    return { error: 'Family name is required' }
  }

  // 2. Loop to generate a unique invite code
  let inviteCode = ''
  let attempts = 0
  const maxAttempts = 10
  let isUnique = false

  const adminDb = getAdminClient()
  while (!isUnique && attempts < maxAttempts) {
    inviteCode = generateInviteCode()
    const { data, error } = await adminDb
      .from('families')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle()

    if (!error && !data) {
      isUnique = true
    }
    attempts++
  }

  if (!isUnique) {
    return { error: 'Failed to generate a unique invite code. Please try again.' }
  }

  // 3. Create the family using admin client (bypasses RLS timing on new family creation)
  const { data: familyData, error: familyError } = await adminDb
    .from('families')
    .insert({
      name: familyName,
      currency: 'INR',
      invite_code: inviteCode,
    })
    .select('id')
    .single()

  if (familyError) {
    return { error: familyError.message }
  }

  // 4. Update or create user profile to link to the new family and make them admin
  const fallbackName = user.email ? user.email.split('@')[0] : 'Member'
  const { error: profileError } = await adminDb
    .from('profiles')
    .upsert({
      id: user.id,
      name: user.user_metadata?.name || fallbackName,
      email: user.email!,
      family_id: familyData.id,
      role: 'admin',
    })

  if (profileError) {
    return { error: profileError.message }
  }

  return { success: true, familyId: familyData.id, inviteCode }
}

export async function joinFamily(inviteCode: string) {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const cleanCode = inviteCode.trim().toUpperCase()
  if (!cleanCode) {
    return { error: 'Invite code is required' }
  }

  // 2. Find family with invite code (bypass RLS SELECT to find by invite code)
  const adminDb = getAdminClient()
  const { data: familyData, error: familyError } = await adminDb
    .from('families')
    .select('id, name')
    .eq('invite_code', cleanCode)
    .maybeSingle()

  if (familyError) {
    return { error: familyError.message }
  }

  if (!familyData) {
    return { error: 'Invalid invite code. Family workspace not found.' }
  }

  // 3. Update or create user profile to link to this family as member
  const fallbackName = user.email ? user.email.split('@')[0] : 'Member'
  const { error: profileError } = await adminDb
    .from('profiles')
    .upsert({
      id: user.id,
      name: user.user_metadata?.name || fallbackName,
      email: user.email!,
      family_id: familyData.id,
      role: 'member',
    })

  if (profileError) {
    return { error: profileError.message }
  }

  return { success: true, familyName: familyData.name }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMemberRole(memberId: string, role: 'admin' | 'member') {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 2. Fetch current user profile to verify admin role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile?.family_id || currentProfile.role !== 'admin') {
    return { error: 'Only family admins can change member roles.' }
  }

  // 3. Update target member role (ensuring target is in same family)
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', memberId)
    .eq('family_id', currentProfile.family_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/family')
  revalidatePath('/')
  return { success: true }
}

export async function removeFamilyMember(memberId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (user.id === memberId) {
    return { error: 'You cannot remove yourself from the family here.' }
  }

  // 2. Fetch current user profile to verify admin role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile?.family_id || currentProfile.role !== 'admin') {
    return { error: 'Only family admins can remove members.' }
  }

  // 3. Remove target member by unsetting their family_id
  const { error } = await supabase
    .from('profiles')
    .update({ family_id: null, role: 'member' })
    .eq('id', memberId)
    .eq('family_id', currentProfile.family_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/more/family')
  revalidatePath('/')
  return { success: true }
}

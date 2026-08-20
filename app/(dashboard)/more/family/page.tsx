import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FamilyClient from './family-client'

export default async function FamilySettingsPage() {
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

  // 3. Fetch family details
  const { data: family } = await supabase
    .from('families')
    .select('name, invite_code')
    .eq('id', profile.family_id)
    .single()

  // 4. Fetch all members of this family
  const { data: members } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: true })

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <FamilyClient
        familyName={family?.name || 'Family Workspace'}
        inviteCode={family?.invite_code || ''}
        members={(members || []) as any}
      />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScanClient from './scan-client'

export default async function ScanPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile to check family_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    redirect('/onboarding')
  }

  // 3. Fetch categories for classification
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .or(`family_id.is.null,family_id.eq.${profile.family_id}`)
    .order('name', { ascending: true })

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan UPI QR</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scan a shop QR to pay and track instantly</p>
      
      <div className="mt-6">
        <ScanClient
          currentUserProfileId={user.id}
          categories={categories || []}
        />
      </div>
    </div>
  )
}

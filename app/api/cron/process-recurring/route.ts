import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getNextDueDate(currentDateStr: string, frequency: string): string {
  const d = new Date(currentDateStr)
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  if (frequency === 'daily') {
    d.setDate(d.getDate() + 1)
  } else if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1)
  } else if (frequency === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(request: NextRequest) {
  // 1. Verify Vercel Cron signature / secret
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isLocalSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isVercelCron && !isLocalSecret && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 2. Initialize Supabase with service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const todayStr = new Date().toISOString().split('T')[0]

  try {
    // 3. Fetch active recurring expenses due today or in the past
    const { data: recurringExpenses, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('status', 'active')
      .lte('next_due_date', todayStr)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!recurringExpenses || recurringExpenses.length === 0) {
      return NextResponse.json({ message: 'No recurring expenses due today.' })
    }

    const processedList: string[] = []

    // 4. Process each due expense
    for (const rec of recurringExpenses) {
      // a. Insert expected expense record
      const { error: insertError } = await supabase.from('expenses').insert({
        family_id: rec.family_id,
        user_id: rec.user_id,
        amount: rec.amount,
        category_id: rec.category_id,
        merchant: rec.merchant,
        payment_method: 'UPI', // Default to UPI for automated ones
        expense_date: rec.next_due_date,
        expense_time: '00:00:00',
        note: 'Automated recurring expense',
        source: 'recurring',
        status: 'expected', // Kept as expected until confirmed by family
      })

      if (insertError) {
        console.error(`Failed to insert expense for recurring ID ${rec.id}:`, insertError.message)
        continue
      }

      // b. Calculate next due date
      const nextDue = getNextDueDate(rec.next_due_date, rec.frequency)

      // c. Update recurring expense record
      const { error: updateError } = await supabase
        .from('recurring_expenses')
        .update({ next_due_date: nextDue })
        .eq('id', rec.id)

      if (updateError) {
        console.error(`Failed to update next due date for recurring ID ${rec.id}:`, updateError.message)
      } else {
        processedList.push(rec.id)
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processedList.length,
      processedIds: processedList,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

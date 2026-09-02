'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { saveExpense, editExpense, getMerchantDefaultCategory } from '@/app/actions/expenses'
import { CategoryIcon, CategoryIconBox, getCategoryColor } from '@/lib/category-colors'
import { getISTDateString, getISTTimeString } from '@/lib/date'

interface Category {
  id: string
  name: string
  icon: string
}

interface ScanClientProps {
  currentUserProfileId: string
  categories: Category[]
}

export default function ScanClient({ currentUserProfileId, categories }: ScanClientProps) {
  const router = useRouter()
  const scannerRef = useRef<any>(null)

  // Scanner States
  const [scanState, setScanState] = useState<'scanning' | 'confirming' | 'verifying'>('scanning')
  const [scanError, setScanError] = useState<string | null>(null)

  // QR Parsed details
  const [upiLink, setUpiLink] = useState('')
  const [merchant, setMerchant] = useState('')
  const [upiId, setUpiId] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  
  // App States
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  // 1. Initialize QR scanner inside client
  useEffect(() => {
    if (scanState !== 'scanning') return

    let scannerInstance: any = null

    // Dynamically import to prevent SSR errors
    import('html5-qrcode').then((module) => {
      const config = { fps: 10, qrbox: { width: 250, height: 250 } }
      scannerInstance = new module.Html5QrcodeScanner('qr-reader', config, false)
      scannerRef.current = scannerInstance

      scannerInstance.render(
        async (decodedText: string) => {
          // Success
          handleQrDecoded(decodedText)
        },
        (errorMessage: string) => {
          // Normal scanning noise, usually ignored or set to low-priority state
        }
      )
    })

    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch((err: any) => console.error('Failed to clear scanner:', err))
      }
    }
  }, [scanState])

  // 2. Parse UPI link parameters
  const handleQrDecoded = async (text: string) => {
    setScanError(null)

    // Example UPI URI: upi://pay?pa=merchant@upi&pn=MerchantName&am=100&cu=INR
    if (!text.startsWith('upi://pay')) {
      setScanError('Not a valid UPI payment QR code. Please scan a standard shop QR code.')
      return
    }

    setUpiLink(text)

    try {
      const urlParams = new URL(text.replace('upi://pay', 'https://placeholder.com'))
      const pa = urlParams.searchParams.get('pa') || ''
      const pn = urlParams.searchParams.get('pn') || ''
      const am = urlParams.searchParams.get('am') || ''

      setUpiId(pa)
      const cleanPn = decodeURIComponent(pn).replace(/\+/g, ' ')
      setMerchant(cleanPn)
      setAmount(am)

      // Query historical default category (Merchant Memory)
      if (cleanPn) {
        const defaultCatId = await getMerchantDefaultCategory(cleanPn)
        if (defaultCatId && categories.some((c) => c.id === defaultCatId)) {
          setSelectedCategoryId(defaultCatId)
        }
      }

      // Stop scanner and shift to confirmation screen
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err: any) => console.error(err))
      }
      setScanState('confirming')
    } catch (err) {
      setScanError('Failed to parse UPI QR parameters.')
    }
  }

  // 3. Initiate payment: Save pending transaction and open UPI app link
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount.')
      return
    }

    if (!selectedCategoryId) {
      setErrorMsg('Please select a category.')
      return
    }

    setLoading(true)

    const now = new Date()
    const dateStr = getISTDateString(now)
    const timeStr = getISTTimeString(now)

    // Create a PENDING expense
    const input = {
      amount: numAmount,
      userId: currentUserProfileId,
      categoryId: selectedCategoryId,
      merchant,
      upiId,
      paymentMethod: 'UPI' as const,
      expenseDate: dateStr,
      expenseTime: timeStr,
      note: 'Initiated via QR scanner payment link.',
      source: 'upi_qr' as const,
      status: 'pending' as const,
    }

    const res = await saveExpense(input)
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else if (res.id) {
      setPendingId(res.id)
      setLoading(false)

      // Construct upi deep link (with updated amount if edited)
      const updatedUpiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchant)}&am=${amount}&cu=INR`

      // Open the deep link to load UPI app
      window.location.href = updatedUpiLink

      // Shift screen to verification questionnaire
      setScanState('verifying')
    }
  }

  // 4. Verify payment outcome from user
  const handlePaymentOutcome = async (outcome: 'confirmed' | 'cancelled') => {
    if (!pendingId) return
    setLoading(true)

    const outcomeNote =
      outcome === 'confirmed'
        ? 'Payment confirmed by user.'
        : 'Payment cancelled/ignored by user.'

    const res = await editExpense(pendingId, {
      status: outcome,
      note: outcomeNote,
    })

    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: SCANNING VIEW */}
      {scanState === 'scanning' && (
        <div className="flex flex-col items-center justify-center space-y-4">
          {scanError && (
            <div className="w-full rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-center">
              {scanError}
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-gray-250 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-md w-full max-w-sm">
            <div id="qr-reader" className="w-full" />
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Icons.Camera className="h-4 w-4" />
            <span>Point camera at any UPI QR code</span>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIRMATION BEFORE PAYMENT VIEW */}
      {scanState === 'confirming' && (
        <form onSubmit={handleInitiatePayment} className="space-y-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-xs">
          <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Confirm Payment Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Check values before launch</p>
          </div>

          {/* Amount */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-400">₹</span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                  }
                }}
                placeholder="Enter amount"
                className="block w-full rounded-lg border border-gray-300 py-2.5 pr-3 pl-7 text-gray-950 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-extrabold"
              />
            </div>
          </div>

          {/* Merchant Name */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Merchant</label>
            <input
              type="text"
              required
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Merchant Name"
              className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-gray-950 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
            />
          </div>

          {/* Payee UPI ID (Read Only) */}
          <div className="flex flex-col space-y-1 text-xs">
            <span className="font-bold text-[10px] text-gray-455 uppercase tracking-wider">UPI ID</span>
            <span className="py-2.5 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-lg text-gray-500 truncate dark:text-gray-400">
              {upiId}
            </span>
          </div>

          {/* Category Select grid */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50/50">
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                        : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <CategoryIcon name={category.icon} className="h-4 w-4 mb-0.5" />
                    <span className="text-[8px] font-bold truncate w-full">{category.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setScanState('scanning')}
              className="w-1/2 rounded-xl border border-gray-250 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Scan Again
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 flex items-center justify-center rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <Icons.Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <>
                  <Icons.Zap className="h-4 w-4 mr-1.5" />
                  Pay & Track
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: POST-PAYMENT VERIFICATION QUESTIONNAIRE */}
      {scanState === 'verifying' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl shadow-md space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mx-auto">
            <Icons.HelpCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Did you pay successfully?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              We launched your UPI payment app to pay <strong>₹{amount}</strong> to <strong>{merchant}</strong>.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handlePaymentOutcome('confirmed')}
              disabled={loading}
              className="w-full flex items-center justify-center rounded-xl bg-emerald-600 py-3.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Yes, Payment Completed'
              )}
            </button>
            <button
              onClick={() => handlePaymentOutcome('cancelled')}
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 bg-white py-3.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-50"
            >
              No, Payment Failed / Cancelled
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scanner States
  const [scanState, setScanState] = useState<'scanning' | 'confirming' | 'verifying'>('scanning')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraPermissionError, setCameraPermissionError] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  // QR Parsed details
  const [rawQrText, setRawQrText] = useState('')
  const [upiLink, setUpiLink] = useState('')
  const [merchant, setMerchant] = useState('')
  const [upiId, setUpiId] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categories[0]?.id || null)
  const [copiedUpi, setCopiedUpi] = useState(false)

  // App States
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  // Auto-start camera scanner using Html5Qrcode API
  const startCamera = async () => {
    try {
      setCameraPermissionError(false)
      setScanError(null)

      const module = await import('html5-qrcode')
      const Html5Qrcode = module.Html5Qrcode

      // Clear any previous instance
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop()
          }
          scannerRef.current.clear()
        } catch (e) {
          // ignore cleanup errors
        }
      }

      const qrScanner = new Html5Qrcode('qr-reader-container')
      scannerRef.current = qrScanner

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      }

      await qrScanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          handleQrDecoded(decodedText)
        },
        () => {
          // normal frame noise
        }
      )

      setCameraActive(true)
    } catch (err: any) {
      console.warn('Camera start error:', err)
      setCameraActive(false)
      setCameraPermissionError(true)
      setScanError(
        'Camera permission was not granted or camera is not available. Please allow camera access or choose a QR code image.'
      )
    }
  }

  // Handle Scan from Image File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setScanError(null)
      const module = await import('html5-qrcode')
      const Html5Qrcode = module.Html5Qrcode
      const qrScanner = new Html5Qrcode('qr-reader-container')
      const decodedText = await qrScanner.scanFile(file, true)
      await handleQrDecoded(decodedText)
    } catch (err: any) {
      setScanError('Could not find a valid QR code in the selected image. Please try another image.')
    } finally {
      setLoading(false)
    }
  }

  // Stop scanner
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
      setCameraActive(false)
    }
  }

  useEffect(() => {
    if (scanState === 'scanning') {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [scanState])

  // Parse UPI link parameters
  const handleQrDecoded = async (text: string) => {
    setScanError(null)
    setRawQrText(text)

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

      await stopCamera()
      setScanState('confirming')
    } catch (err) {
      setScanError('Failed to parse UPI QR parameters.')
    }
  }

  // Build UPI URI with all preserved parameters
  const getFullUpiUri = (scheme = 'upi://pay') => {
    try {
      if (rawQrText.startsWith('upi://pay')) {
        const url = new URL(rawQrText.replace('upi://pay', 'https://placeholder.com'))
        if (amount) url.searchParams.set('am', amount)
        if (merchant) url.searchParams.set('pn', merchant)
        if (upiId) url.searchParams.set('pa', upiId)
        url.searchParams.set('cu', 'INR')
        return url.toString().replace('https://placeholder.com', scheme)
      }
    } catch (e) {
      // fallback to manual build
    }
    return `${scheme}?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchant)}&am=${encodeURIComponent(amount)}&cu=INR`
  }

  const handleCopyUpi = () => {
    if (!upiId) return
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  // Save directly as confirmed without launching deep link
  const handleSaveDirectly = async () => {
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

    const input = {
      amount: numAmount,
      userId: currentUserProfileId,
      categoryId: selectedCategoryId,
      merchant: merchant || 'UPI Payment',
      upiId,
      paymentMethod: 'UPI' as const,
      expenseDate: dateStr,
      expenseTime: timeStr,
      note: 'Recorded via QR scanner.',
      source: 'upi_qr' as const,
      status: 'confirmed' as const,
    }

    const res = await saveExpense(input)
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  // Initiate payment: Save pending transaction and open UPI app link
  const handleInitiatePayment = async (targetScheme = 'upi://pay') => {
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
      merchant: merchant || 'UPI Payment',
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

      const targetUri = getFullUpiUri(targetScheme)
      // Open the deep link to load UPI app
      window.location.href = targetUri

      // Shift screen to verification questionnaire
      setScanState('verifying')
    }
  }

  // Verify payment outcome from user
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

  const isPersonalUpi =
    upiId.endsWith('@oksbi') ||
    upiId.endsWith('@okhdfcbank') ||
    upiId.endsWith('@okaxis') ||
    upiId.endsWith('@okicici') ||
    upiId.endsWith('@ibl') ||
    upiId.endsWith('@axl') ||
    upiId.endsWith('@ybl')

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: SCANNING VIEW */}
      {scanState === 'scanning' && (
        <div className="flex flex-col items-center justify-center space-y-4">
          {scanError && (
            <div className="w-full rounded-2xl bg-amber-50 p-3.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-center border border-amber-200/60">
              {scanError}
            </div>
          )}

          {/* Camera Viewfinder Box */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-500/40 bg-black shadow-xl w-full max-w-sm aspect-square flex items-center justify-center">
            <div id="qr-reader-container" className="w-full h-full overflow-hidden" />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-gray-950/90 z-10 space-y-3">
                <Icons.Camera className="h-10 w-10 text-indigo-400 animate-pulse" />
                <p className="text-xs text-gray-300">
                  {cameraPermissionError
                    ? 'Camera access is blocked in your browser settings.'
                    : 'Starting camera...'}
                </p>

                {cameraPermissionError && (
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                  >
                    <Icons.RotateCcw className="h-3.5 w-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <Icons.Camera className="h-4 w-4 text-indigo-500" />
            <span>Point your camera at any UPI QR code</span>
          </div>

          {/* Fallback upload image button */}
          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              {loading ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.Image className="h-4 w-4 text-gray-500" />
              )}
              <span>Upload QR Code Image</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIRMATION BEFORE PAYMENT VIEW */}
      {scanState === 'confirming' && (
        <div className="space-y-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Confirm Payment Details
            </h2>
            <p className="text-xs text-gray-400 mt-1">Review details before paying</p>
          </div>

          {/* Amount */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-rose-500">₹</span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val)
                  }
                }}
                placeholder="0.00"
                className="block w-full rounded-2xl border border-gray-200 py-2.5 pr-3 pl-8 text-gray-950 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-black text-lg focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Merchant Name */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Payee / Shop Name
            </label>
            <input
              type="text"
              required
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Merchant Name"
              className="block w-full rounded-2xl border border-gray-200 py-2.5 px-3.5 text-gray-950 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold text-xs focus:border-indigo-500"
            />
          </div>

          {/* Payee UPI ID */}
          <div className="flex flex-col space-y-1 text-xs">
            <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">
              UPI ID
            </span>
            <div className="flex items-center gap-2">
              <span className="flex-1 py-2.5 px-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-2xl text-gray-600 truncate dark:text-gray-300 font-mono text-[11px]">
                {upiId || 'N/A'}
              </span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 shrink-0"
                title="Copy UPI ID"
              >
                {copiedUpi ? (
                  <Icons.Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Icons.Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Helpful P2P transfer notice */}
          {isPersonalUpi && (
            <div className="rounded-2xl bg-blue-50/70 p-3 text-[11px] text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200/60 flex items-start gap-2">
              <Icons.Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Personal UPI ID detected. If direct app launch shows an NPCI warning, you can copy the UPI ID above or tap <strong>"Save & Mark Paid"</strong> directly.
              </span>
            </div>
          )}

          {/* Category Select grid with Phase 0 colors */}
          <div className="flex flex-col space-y-1.5 pt-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id
                const colors = getCategoryColor(category.name)

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-2xl border text-left transition ${
                      isSelected
                        ? `border-2 ${colors.border} ${colors.bg} ring-2 ring-indigo-500/20`
                        : 'bg-white border-gray-100 text-gray-700 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <CategoryIconBox
                      categoryName={category.name}
                      iconName={category.icon}
                      size="sm"
                    />
                    <span className="text-xs font-bold truncate flex-1">{category.name}</span>
                    {isSelected && (
                      <Icons.Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3">
            <button
              type="button"
              onClick={() => handleInitiatePayment('upi://pay')}
              disabled={loading}
              className="w-full flex items-center justify-center rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50 transition"
            >
              {loading ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Icons.Zap className="h-4 w-4 mr-1.5" />
                  <span>Pay with UPI App & Track</span>
                </>
              )}
            </button>

            {/* Direct Save Option */}
            <button
              type="button"
              onClick={handleSaveDirectly}
              disabled={loading}
              className="w-full flex items-center justify-center rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs disabled:opacity-50 transition"
            >
              <Icons.CheckCircle2 className="h-4 w-4 mr-1.5" />
              <span>Already Paid? Save & Mark Confirmed</span>
            </button>

            <button
              type="button"
              onClick={() => setScanState('scanning')}
              className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Scan Another QR
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: POST-PAYMENT VERIFICATION QUESTIONNAIRE */}
      {scanState === 'verifying' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-md space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mx-auto">
            <Icons.HelpCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Did you complete the payment?
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              We launched your UPI app to pay{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-bold">₹{amount}</strong> to{' '}
              <strong>{merchant}</strong>.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handlePaymentOutcome('confirmed')}
              disabled={loading}
              className="w-full flex items-center justify-center rounded-2xl bg-emerald-600 py-3.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs disabled:opacity-50"
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
              className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-50"
            >
              No, Payment Failed / Cancelled
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

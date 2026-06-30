import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EnvelopeIcon, LockClosedIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid'

type LoginStep = 'email' | 'otp'

export default function LoginPage() {
  const { sendOTP, verifyOTP, isAuthenticated, isLoading: authLoading, error, clearError } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    if (!email || !email.includes('@')) {
      setLocalError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    try {
      await sendOTP(email)
      setStep('otp')
      setCountdown(300) // 5 minutes
      // Focus first OTP input
      setTimeout(() => {
        if (otpRefs.current[0]) {
          otpRefs.current[0]?.focus()
        }
      }, 100)
    } catch {
      // Error is handled by auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    const code = otp.join('')
    if (code.length !== 4) {
      setLocalError('Please enter the complete 4-digit code')
      return
    }

    setIsLoading(true)
    try {
      await verifyOTP(email, code)
      // Navigation handled by useEffect on isAuthenticated
    } catch {
      // Error is handled by auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setLocalError(null)
    clearError()
    setIsLoading(true)
    try {
      await sendOTP(email)
      setOtp(['', '', '', ''])
      setCountdown(300)
    } catch {
      // Error handled by auth context
    } finally {
      setIsLoading(false)
    }
  }

  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60)
    const seconds = countdown % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <LockClosedIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
          <p className="text-gray-400 mt-2">
            {step === 'email' ? 'Enter your email to get started' : 'Enter the 4-digit code sent to your email'}
          </p>
        </div>

        {/* Error Messages */}
        {(error || localError) && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error || localError}</p>
          </div>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-dark-surface border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>Send OTP</>
              )}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <div className="flex gap-3 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el }}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    maxLength={1}
                    className="w-14 h-14 bg-dark-surface border border-gray-700 rounded-xl text-center text-2xl font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.some((d) => !d)}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Verifying...
                </>
              ) : (
                <>Verify & Login</>
              )}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to email
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || isLoading}
                className="text-primary hover:text-primary-light disabled:opacity-50 disabled:text-gray-500 transition-colors"
              >
                {countdown > 0 ? `Resend in ${formatCountdown()}` : 'Resend OTP'}
              </button>
            </div>

            {/* Success notification */}
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm">
              <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
              <p>
                OTP sent to <strong>{email}</strong>. Valid for 5 minutes.
              </p>
            </div>

            <p className="text-center text-sm text-gray-500">
              Enter the 4-digit code sent to your email to verify your identity.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

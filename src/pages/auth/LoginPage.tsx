import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, User, Shield, Smartphone, ArrowLeft } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { signInWithCustomToken } from 'firebase/auth'
import { useAuth } from '../../contexts/AuthContext'
import { functions, auth } from '../../firebase/config'
import { Spinner } from '../../components/ui/LoadingScreen'
import { normalizeKenyanPhone } from '../../utils/phone'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password:   z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof loginSchema>

type OtpStage = 'idle' | 'sending' | 'awaiting' | 'signing_in'

function getRolePath(role: UserRole | null, salonId: string | null): string {
  switch (role) {
    case 'SUPER_ADMIN':        return '/admin'
    case 'PROPERTY_MANAGER':   return '/property'
    case 'CARETAKER':          return '/caretaker'
    case 'SECURITY_GUARD':     return '/gate'
    case 'SALON_OWNER':        return salonId ? `/salon/${salonId}/owner` : '/login'
    case 'SALON_RECEPTIONIST': return salonId ? `/salon/${salonId}/receptionist` : '/login'
    case 'SALON_PROVIDER':     return salonId ? `/salon/${salonId}/provider` : '/login'
    default:                   return '/login'
  }
}

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'password' | 'otp'>('password')

  // OTP state
  const [otpPhone, setOtpPhone]   = useState('')
  const [otpPin, setOtpPin]       = useState('')
  const [pinId, setPinId]         = useState<string | null>(null)
  const [otpStage, setOtpStage]   = useState<OtpStage>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (user) return <Navigate to={getRolePath(user.role, user.salonId)} replace />

  // ── Password login ─────────────────────────────────────────────────────────
  const onSubmit = async (data: LoginForm) => {
    try {
      let email = data.identifier.trim()
      if (!email.includes('@')) {
        const phone = normalizeKenyanPhone(email)
        if (!phone) { toast.error('Enter a valid email or Kenyan phone number'); return }
        const resolve = httpsCallable<{ phone: string }, { email: string }>(functions, 'resolvePhoneToEmail')
        const res = await resolve({ phone })
        email = res.data.email
      }
      await signIn(email, data.password)
    } catch (error: any) {
      const code = error?.code as string
      if (code === 'functions/not-found') {
        toast.error('No account found for that phone number')
      } else if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)) {
        toast.error('Invalid credentials')
      } else if (code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.')
      } else if (code === 'auth/user-disabled') {
        toast.error('This account has been disabled. Contact your administrator.')
      } else {
        toast.error('Login failed. Please try again.')
      }
    }
  }

  // ── OTP login ──────────────────────────────────────────────────────────────
  const sendCode = async () => {
    const norm = normalizeKenyanPhone(otpPhone.trim())
    if (!norm) { toast.error('Enter a valid Kenyan phone number'); return }
    setOtpStage('sending')
    try {
      const fn = httpsCallable<{ phone: string }, { pinId: string }>(functions, 'sendSmsOtp')
      const res = await fn({ phone: norm })
      setPinId(res.data.pinId)
      setOtpStage('awaiting')
    } catch (err: any) {
      setOtpStage('idle')
      if (err?.code === 'functions/resource-exhausted') {
        toast.error('Too many attempts. Please wait before trying again.')
      } else {
        toast.error('Could not send verification code. Please try again.')
      }
    }
  }

  const verifyAndSignIn = async () => {
    if (!pinId) return
    if (otpPin.length < 4) { toast.error('Enter the 4-digit code from your SMS'); return }
    setOtpStage('signing_in')
    try {
      const fn = httpsCallable<
        { pinId: string; pin: string },
        { customToken: string }
      >(functions, 'signInWithPhoneOtp')
      const res = await fn({ pinId, pin: otpPin.trim() })
      await signInWithCustomToken(auth, res.data.customToken)
      // Auth state change will redirect via the user check above
    } catch (err: any) {
      setOtpStage('awaiting')
      const code = err?.code as string
      if (code === 'functions/unauthenticated') {
        toast.error('Incorrect or expired code. Please try again.')
      } else if (code === 'functions/not-found') {
        toast.error('No Lango account found for that number.')
      } else {
        toast.error('Sign-in failed. Please try again.')
      }
    }
  }

  const resetOtp = () => {
    setOtpPhone(''); setOtpPin(''); setPinId(null); setOtpStage('idle')
  }

  const isBusy = otpStage === 'sending' || otpStage === 'signing_in'

  return (
    <div className="min-h-screen bg-gradient-to-br from-lango-dark via-lango-primary to-lango-secondary flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-lango-primary px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">LANGO</h1>
            <p className="text-white/70 text-sm mt-1">Smart Gate Management</p>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => { setMode('password'); resetOtp() }}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
                ${mode === 'password'
                  ? 'text-lango-primary border-b-2 border-lango-primary'
                  : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Lock className="w-3.5 h-3.5" /> Password
            </button>
            <button
              type="button"
              onClick={() => setMode('otp')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
                ${mode === 'otp'
                  ? 'text-lango-primary border-b-2 border-lango-primary'
                  : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Phone OTP
            </button>
          </div>

          <div className="px-8 py-8">
            {/* ── Password tab ─────────────────────────────────────── */}
            {mode === 'password' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
                <p className="text-sm text-gray-500 mb-6">Enter your credentials to access your dashboard</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <div>
                    <label className="label">Email or phone number</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        {...register('identifier')}
                        type="text"
                        autoComplete="username"
                        placeholder="you@example.com or 0712345678"
                        className={`input pl-9 ${errors.identifier ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                      />
                    </div>
                    {errors.identifier && <p className="form-error">{errors.identifier.message}</p>}
                  </div>

                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={`input pl-9 pr-10 ${errors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="form-error">{errors.password.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full py-2.5 mt-2"
                  >
                    {isSubmitting ? <Spinner size="sm" className="text-white" /> : null}
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-5 text-center space-y-2">
                  <p className="text-xs text-gray-400">
                    Forgot your password?{' '}
                    <span className="text-lango-primary font-medium cursor-pointer hover:underline">
                      Reset password
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Don't have an account?{' '}
                    <span className="text-gray-500 font-medium">Contact your administrator</span>
                  </p>
                </div>
              </>
            )}

            {/* ── OTP tab ───────────────────────────────────────────── */}
            {mode === 'otp' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in with OTP</h2>
                <p className="text-sm text-gray-500 mb-6">
                  {otpStage === 'awaiting' || otpStage === 'signing_in'
                    ? `Enter the 4-digit code sent to ${otpPhone}`
                    : 'We\'ll send a one-time code to your phone'}
                </p>

                {/* Step 1 — phone entry */}
                {(otpStage === 'idle' || otpStage === 'sending') && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Phone number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="tel"
                          value={otpPhone}
                          onChange={e => setOtpPhone(e.target.value)}
                          placeholder="0712 345 678"
                          className="input pl-9"
                          disabled={isBusy}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={isBusy || otpPhone.trim().length < 9}
                      className="btn-primary w-full py-2.5"
                    >
                      {otpStage === 'sending' ? <><Spinner size="sm" className="text-white" /> Sending...</> : 'Send Code'}
                    </button>
                  </div>
                )}

                {/* Step 2 — OTP entry */}
                {(otpStage === 'awaiting' || otpStage === 'signing_in') && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Verification code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otpPin}
                        onChange={e => setOtpPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="0 0 0 0"
                        className="input text-center text-2xl tracking-[0.5em] font-mono"
                        disabled={otpStage === 'signing_in'}
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={verifyAndSignIn}
                      disabled={otpStage === 'signing_in' || otpPin.length < 4}
                      className="btn-primary w-full py-2.5"
                    >
                      {otpStage === 'signing_in' ? <><Spinner size="sm" className="text-white" /> Verifying...</> : 'Verify & Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={resetOtp}
                      disabled={otpStage === 'signing_in'}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mx-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change number
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-6">
          © {new Date().getFullYear()} Lango · Smart Gate Management
        </p>
      </div>
    </div>
  )
}

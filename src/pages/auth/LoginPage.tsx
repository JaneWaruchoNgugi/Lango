import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, User, Shield } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '../../contexts/AuthContext'
import { functions } from '../../firebase/config'
import { Spinner } from '../../components/ui/LoadingScreen'
import { normalizeKenyanPhone } from '../../utils/phone'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password:   z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof loginSchema>

function getRolePath(role: UserRole | null): string {
  switch (role) {
    case 'SUPER_ADMIN':      return '/admin'
    case 'PROPERTY_MANAGER': return '/property'
    case 'CARETAKER':        return '/caretaker'
    case 'SECURITY_GUARD':   return '/gate'
    default:                 return '/login'
  }
}

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (user) return <Navigate to={getRolePath(user.role)} replace />

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

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your credentials to access your dashboard</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Email or phone */}
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

              {/* Password */}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-2.5 mt-2"
              >
                {isSubmitting ? <Spinner size="sm" className="text-white" /> : null}
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Forgot password & contact */}
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

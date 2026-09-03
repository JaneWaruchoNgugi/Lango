import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types'

const loginSchema = z.object({
  email:    z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
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
  const navigate          = useNavigate()
  const location          = useLocation()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // Already logged in — redirect immediately
  if (user) {
    navigate(getRolePath(user.role), { replace: true })
    return null
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      await signIn(data.email, data.password)
      // Wait for auth state to update, then redirect
      // The onAuthStateChanged sets user.role — we navigate after brief delay
      setTimeout(() => {
        const role = (window as any).__lango_role as UserRole | null
        navigate(getRolePath(role), { replace: true })
      }, 300)
    } catch (error: any) {
      const code = error?.code as string
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Invalid email or password')
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
              {/* Email */}
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`input pl-9 ${errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                  />
                </div>
                {errors.email && <p className="form-error">{errors.email.message}</p>}
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

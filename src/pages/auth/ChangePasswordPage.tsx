import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { KeyRound } from 'lucide-react'
import { auth, db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types'

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })
type FormData = z.infer<typeof schema>

function rolePath(role: UserRole | null): string {
  switch (role) {
    case 'SUPER_ADMIN':      return '/admin'
    case 'PROPERTY_MANAGER': return '/property'
    case 'CARETAKER':        return '/caretaker'
    case 'SECURITY_GUARD':   return '/gate'
    default:                 return '/login'
  }
}

export default function ChangePasswordPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  if (!user) return <Navigate to="/login" replace />

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      if (!auth.currentUser) throw new Error('no-session')
      await updatePassword(auth.currentUser, data.password)
      await updateDoc(doc(db, 'users', user.uid), { tempPasswordSet: false, updatedAt: serverTimestamp() })
      await auth.currentUser.getIdToken(true)
      // Pull the cleared tempPasswordSet into context state so ProtectedRoute
      // doesn't bounce us straight back here.
      await refreshProfile()
      toast.success('Password updated')
      navigate(rolePath(user.role), { replace: true })
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log in again, then change your password.')
      } else {
        toast.error('Could not update password. Try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lango-dark via-lango-primary to-lango-secondary flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-lango-primary px-8 py-7 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">Set a new password</h1>
          <p className="text-white/70 text-xs mt-1">You must change your temporary password to continue</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-4">
          <div>
            <label className="label">New password</label>
            <input {...register('password')} type="password" autoComplete="new-password" className="input" placeholder="••••••••" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input {...register('confirm')} type="password" autoComplete="new-password" className="input" placeholder="••••••••" />
            {errors.confirm && <p className="form-error">{errors.confirm.message}</p>}
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving && <Spinner size="sm" className="text-white" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  )
}

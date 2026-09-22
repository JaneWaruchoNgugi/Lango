import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { startShift } from '../../services/shiftService'
import { Clock, ArrowRight, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { Spinner } from '../ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { ShiftType } from '../../types'
import { SHIFT_CONFIG, DEFAULT_SECURITY_POSTS } from '../../types'

type Step = 'verify' | 'confirm' | 'done'

function normalizePhone(p: string) {
  return p.replace(/\D/g, '').replace(/^0/, '254')
}

function suggestShiftType(): ShiftType {
  const h = new Date().getHours()
  return h >= 6 && h < 18 ? 'DAY' : 'NIGHT'
}

export function ShiftSetupGate() {
  const { user } = useAuth()

  const guardName = user?.profile?.name ?? 'Guard'
  const storedPhone = user?.profile?.phone ?? ''
  const maskedPhone = storedPhone
    ? `+254 *** ${storedPhone.replace(/\D/g, '').slice(-4)}`
    : '—'

  // Skip phone verify if guard has no phone on file
  const [step, setStep] = useState<Step>(storedPhone ? 'verify' : 'confirm')
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [shiftType, setShiftType] = useState<ShiftType>(suggestShiftType())
  const [securityPost, setSecurityPost] = useState(DEFAULT_SECURITY_POSTS[0])
  const [busy, setBusy] = useState(false)

  const verifyPhone = () => {
    const entered = normalizePhone(phoneInput)
    const stored = normalizePhone(storedPhone)
    if (entered !== stored && phoneInput.trim() !== storedPhone.trim()) {
      setPhoneError('Phone number does not match our records')
      return
    }
    setPhoneError('')
    setStep('confirm')
  }

  const handleStart = async () => {
    if (!user?.propertyId) return
    setBusy(true)
    try {
      await startShift(
        user.propertyId,
        { uid: user.uid, name: guardName, role: 'SECURITY_GUARD' },
        { shiftType, securityPost },
      )
      setStep('done')
      toast.success('Shift started!')
    } catch (e) {
      toast.error((e as Error).message ?? 'Could not start shift')
      setBusy(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Shift Started</h2>
          <p className="text-sm text-gray-500">
            {guardName} · {SHIFT_CONFIG[shiftType].label} · {securityPost}
          </p>
          <Spinner size="sm" />
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-xl bg-lango-primary/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-lango-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Start Shift</h2>
            <p className="text-sm text-gray-500">{guardName}</p>
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <label className="label">Shift Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['DAY', 'NIGHT'] as ShiftType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setShiftType(t)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      shiftType === t
                        ? 'border-lango-primary bg-lango-primary/10 text-lango-primary'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {SHIFT_CONFIG[t].label}
                    <span className="block text-xs font-normal text-gray-400 mt-0.5">
                      {SHIFT_CONFIG[t].start} – {SHIFT_CONFIG[t].end}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Security Post</label>
              <select
                className="input"
                value={securityPost}
                onChange={e => setSecurityPost(e.target.value)}
              >
                {DEFAULT_SECURITY_POSTS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn-primary w-full py-3 text-base"
            disabled={busy}
            onClick={handleStart}
          >
            {busy
              ? <Spinner size="sm" className="text-white" />
              : <><ArrowRight className="w-4 h-4" /> Start Shift</>}
          </button>

          {storedPhone && (
            <button
              onClick={() => setStep('verify')}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    )
  }

  // step === 'verify'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-lango-primary/10 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-lango-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Identity</h1>
          <p className="text-base font-medium text-gray-800">{guardName}</p>
          <p className="text-sm text-gray-500">
            ID ending {user?.profile?.idNumber ? `•${user.profile.idNumber.slice(-4)}` : '—'}
          </p>
        </div>

        <div className="card p-5">
          <label className="label">Phone Number</label>
          <p className="text-xs text-gray-400 mb-2">Registered: {maskedPhone}</p>
          <input
            className={`input ${phoneError ? 'border-red-400' : ''}`}
            type="tel"
            placeholder="Enter your registered phone number"
            value={phoneInput}
            onChange={e => { setPhoneInput(e.target.value); setPhoneError('') }}
            onKeyDown={e => e.key === 'Enter' && verifyPhone()}
            autoFocus
          />
          {phoneError && (
            <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {phoneError}
            </p>
          )}
        </div>

        <button className="btn-primary w-full py-3 text-base" onClick={verifyPhone}>
          Verify & Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

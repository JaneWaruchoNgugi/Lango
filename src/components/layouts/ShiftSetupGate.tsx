import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { startShift } from '../../services/shiftService'
import { ArrowRight, ArrowLeft, Sun, Moon, AlertCircle, CheckCircle, Phone, MapPin } from 'lucide-react'
import { LangoLogo } from '../ui/LangoLogo'
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

  const steps = ['Verify', 'Shift', 'Done']
  const stepIndex = step === 'verify' ? 0 : step === 'confirm' ? 1 : 2

  return (
    <KioskFrame guardName={guardName}>
      {/* Progress */}
      <ol className="flex items-center gap-2 mb-8" aria-label="Progress">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${
              i < stepIndex ? 'bg-green-500 text-white' : i === stepIndex ? 'bg-lango-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-sm font-medium ${i === stepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            {i < steps.length - 1 && <span className={`flex-1 h-px ${i < stepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </li>
        ))}
      </ol>

      {step === 'verify' && (
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">Confirm it's you</h1>
          <p className="mt-1.5 text-gray-500">Enter the phone number registered to <span className="font-medium text-gray-700">{guardName}</span> to start your shift.</p>

          <label className="label mt-7" htmlFor="guard-phone">Phone number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="guard-phone"
              className={`input !min-h-12 pl-10 text-base tracking-wide ${phoneError ? '!border-red-400 focus:!ring-red-500/10' : ''}`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="07XX XXX XXX"
              value={phoneInput}
              onChange={e => { setPhoneInput(e.target.value); setPhoneError('') }}
              onKeyDown={e => e.key === 'Enter' && verifyPhone()}
              autoFocus
            />
          </div>
          {phoneError
            ? <p className="flex items-center gap-1.5 text-sm text-red-600 mt-2"><AlertCircle className="w-4 h-4" /> {phoneError}</p>
            : <p className="text-xs text-gray-500 mt-2">On file: {maskedPhone}</p>}

          <button className="btn-primary w-full !min-h-12 text-base mt-6" onClick={verifyPhone}>
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">Start your shift</h1>
          <p className="mt-1.5 text-gray-500">Choose your shift and where you're posted today.</p>

          <p className="label mt-7">Shift</p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {(['DAY', 'NIGHT'] as ShiftType[]).map(t => {
              const active = shiftType === t
              const Icon = t === 'DAY' ? Sun : Moon
              return (
                <button key={t} role="radio" aria-checked={active} onClick={() => setShiftType(t)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${active ? 'border-lango-primary bg-lango-light' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                  <Icon className={`w-5 h-5 ${active ? 'text-lango-primary' : 'text-gray-400'}`} />
                  <span className={`block mt-2 font-semibold ${active ? 'text-lango-primary' : 'text-gray-800'}`}>{SHIFT_CONFIG[t].label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5 tabular-nums">{SHIFT_CONFIG[t].start} – {SHIFT_CONFIG[t].end}</span>
                </button>
              )
            })}
          </div>

          <label className="label mt-6" htmlFor="guard-post">Security post</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select id="guard-post" className="input !min-h-12 pl-10 text-base" value={securityPost} onChange={e => setSecurityPost(e.target.value)}>
              {DEFAULT_SECURITY_POSTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <button className="btn-primary w-full !min-h-12 text-base mt-7" disabled={busy} onClick={handleStart}>
            {busy ? <Spinner size="sm" className="text-white" /> : <>Start shift <ArrowRight className="w-4 h-4" /></>}
          </button>
          {storedPhone && (
            <button onClick={() => setStep('verify')} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 py-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-gray-900">You're on shift</h1>
          <p className="mt-1.5 text-gray-500">{SHIFT_CONFIG[shiftType].label} · {securityPost}</p>
          <Spinner size="sm" className="mx-auto mt-6" />
        </div>
      )}
    </KioskFrame>
  )
}

/** Branded two-panel frame for the shared gate tablet: brand + live clock on the left, the step on the right. */
function KioskFrame({ guardName, children }: { guardName: string; children: React.ReactNode }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000 * 15); return () => clearInterval(t) }, [])
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = guardName.split(' ')[0]

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-surface">
      <aside className="relative overflow-hidden bg-lango-dark text-white px-6 py-8 sm:px-10 lg:p-14 flex flex-col">
        <div className="absolute inset-0 opacity-60 [background:radial-gradient(60%_50%_at_20%_100%,rgba(59,130,246,.25),transparent_70%)]" aria-hidden />
        <LangoLogo tone="light" size={34} caption="Gate kiosk" className="relative" />
        <div className="relative mt-8 lg:mt-auto">
          <p className="text-white/60">{greeting},</p>
          <p className="font-display text-3xl lg:text-4xl font-semibold tracking-tight mt-1">{first}</p>
          <p className="hidden lg:block mt-10 font-display text-6xl font-semibold tabular-nums tracking-tight">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="hidden lg:block text-white/60 mt-2">{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </aside>
      <main className="flex items-start lg:items-center justify-center px-5 py-8 sm:px-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200/80 shadow-card p-6 sm:p-8">{children}</div>
      </main>
    </div>
  )
}

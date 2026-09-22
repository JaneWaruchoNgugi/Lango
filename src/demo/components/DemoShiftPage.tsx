import { useState, useEffect } from 'react'
import { useDemoStore, selectShiftFor } from '../store/demoStore'
import { Clock, CheckCircle, LogOut, ArrowRight, Shield, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const SHIFT_LABELS = { DAY: 'Day Shift', NIGHT: 'Night Shift' }
const DEMO_POSTS = ['Main Gate', 'Back Gate', 'Service Gate', 'Parking']

type StartStep = 'idle' | 'verify' | 'confirm' | 'started'

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function DemoShiftPage({ staffId }: { staffId: string }) {
  const guard = useDemoStore(s => s.staff.find(m => m.id === staffId))
  const shift = useDemoStore(selectShiftFor(staffId))
  const startShift = useDemoStore(s => s.startShift)
  const endShift = useDemoStore(s => s.endShift)

  const [startStep, setStartStep] = useState<StartStep>('idle')
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [shiftType, setShiftType] = useState<'DAY' | 'NIGHT'>('DAY')
  const [securityPost, setSecurityPost] = useState('Main Gate')
  const [elapsed, setElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState(0)

  const on = shift?.status === 'ON'

  useEffect(() => {
    if (!on) { setElapsed(0); return }
    const base = startedAt || Date.now()
    const tick = () => setElapsed(Math.floor((Date.now() - base) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [on, startedAt])

  const guardName = guard?.name ?? 'Guard'
  const demoPhone = guard?.phone ?? '+254712001001'
  const maskedPhone = `+254 *** ${demoPhone.replace(/\D/g, '').slice(-4)}`

  const verifyPhone = () => {
    if (!phoneInput.trim()) { setPhoneError('Please enter your phone number'); return }
    const normalize = (p: string) => p.replace(/\D/g, '').replace(/^0/, '254')
    if (normalize(phoneInput) !== normalize(demoPhone) && phoneInput.trim() !== demoPhone) {
      setPhoneError('Phone number does not match')
      return
    }
    setPhoneError('')
    setStartStep('confirm')
  }

  const handleStart = () => {
    setStartedAt(Date.now())
    startShift(staffId, { shiftType, securityPost })
    setStartStep('started')
    toast.success('Shift started!')
  }

  const handleEnd = () => {
    endShift(staffId)
    setStartStep('idle')
    toast('Shift ended')
  }

  if (on) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="card p-5 bg-green-50 border-green-200 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-green-700">SHIFT ACTIVE</span>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{guardName}</p>
            <p className="text-sm text-gray-600">{SHIFT_LABELS[shift?.shiftType ?? 'DAY']} · {shift?.securityPost ?? 'Main Gate'}</p>
            <p className="text-xs text-gray-500 mt-1">Started just now</p>
          </div>
          <div className="text-center py-2">
            <p className="text-4xl font-mono font-bold text-gray-900 tracking-wider">{formatTimer(elapsed)}</p>
            <p className="text-xs text-gray-500 mt-1">Duration</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['Visitors', 'Deliveries', 'Incidents'] as const).map(l => (
            <div key={l} className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500">{l}</p>
            </div>
          ))}
        </div>
        <button onClick={handleEnd} className="btn-secondary w-full py-3 border-red-200 text-red-600 hover:bg-red-50">
          <LogOut className="w-4 h-4" /> End Shift
        </button>
      </div>
    )
  }

  if (startStep === 'started') {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Shift Started</h2>
        <p className="text-sm text-gray-500">{guardName} · {SHIFT_LABELS[shiftType]} · {securityPost}</p>
        <button className="btn-primary w-full" onClick={() => setStartStep('idle')}>Go to Active Shift</button>
      </div>
    )
  }

  if (startStep === 'confirm') {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">
        <button onClick={() => setStartStep('verify')} className="text-lango-primary text-sm font-medium">← Back</button>
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
              {(['DAY', 'NIGHT'] as const).map(t => (
                <button key={t} onClick={() => setShiftType(t)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${shiftType === t ? 'border-lango-primary bg-lango-primary/10 text-lango-primary' : 'border-gray-200 text-gray-600'}`}>
                  {SHIFT_LABELS[t]}
                  <span className="block text-xs font-normal text-gray-400 mt-0.5">{t === 'DAY' ? '06:00 – 18:00' : '18:00 – 06:00'}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Security Post</label>
            <select className="input" value={securityPost} onChange={e => setSecurityPost(e.target.value)}>
              {DEMO_POSTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary w-full py-3 text-base" onClick={handleStart}>
          <ArrowRight className="w-4 h-4" /> Start Shift
        </button>
      </div>
    )
  }

  if (startStep === 'verify') {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">
        <button onClick={() => setStartStep('idle')} className="text-lango-primary text-sm font-medium">← Back</button>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-900">Verify Identity</h2>
          <p className="text-base font-medium text-gray-800">{guardName}</p>
          <p className="text-sm text-gray-500">ID ending •{(guard?.idNumber ?? '0000').slice(-4)}</p>
        </div>
        <div className="card p-5 space-y-3">
          <div>
            <label className="label">Phone Number</label>
            <p className="text-xs text-gray-400 mb-2">Registered: {maskedPhone}</p>
            <input
              className={`input ${phoneError ? 'border-red-400' : ''}`}
              type="tel"
              placeholder={`Demo phone: ${demoPhone}`}
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
        </div>
        <button className="btn-primary w-full py-3 text-base" onClick={verifyPhone}>
          Verify & Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-lango-primary/10 flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7 text-lango-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Start Your Shift</h1>
        <p className="text-sm text-gray-500">Select your name to begin</p>
      </div>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lango-primary flex items-center justify-center text-white font-bold shrink-0">
            {guardName[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{guardName}</p>
            <p className="text-xs text-gray-500">Security Guard · {guard?.guardNumber ?? 'G-001'}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setPhoneInput(''); setPhoneError(''); setStartStep('verify') }}>
          Select
        </button>
      </div>
      <p className="text-xs text-center text-gray-400">Your identity will be verified before shift starts.</p>
    </div>
  )
}

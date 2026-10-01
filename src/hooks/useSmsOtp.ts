import { useState, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

type Stage = 'idle' | 'sending' | 'awaiting' | 'verifying' | 'verified' | 'failed'

interface OtpState {
  stage: Stage
  pinId: string | null
  error: string | null
}

export function useSmsOtp() {
  const [state, setState] = useState<OtpState>({ stage: 'idle', pinId: null, error: null })
  const fns = getFunctions()

  const sendOtp = useCallback(async (phone: string): Promise<boolean> => {
    setState({ stage: 'sending', pinId: null, error: null })
    try {
      const fn = httpsCallable<{ phone: string }, { pinId: string }>(fns, 'sendSmsOtp')
      const res = await fn({ phone })
      setState({ stage: 'awaiting', pinId: res.data.pinId, error: null })
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code. Try again.'
      setState({ stage: 'failed', pinId: null, error: msg })
      return false
    }
  }, [fns])

  const verifyOtp = useCallback(async (pin: string): Promise<boolean> => {
    if (!state.pinId) return false
    setState(s => ({ ...s, stage: 'verifying', error: null }))
    try {
      const fn = httpsCallable<{ pinId: string; pin: string }, { verified: boolean; reason?: string }>(fns, 'verifySmsOtp')
      const res = await fn({ pinId: state.pinId, pin })
      if (res.data.verified) {
        setState(s => ({ ...s, stage: 'verified', error: null }))
        return true
      }
      setState(s => ({ ...s, stage: 'awaiting', error: 'Incorrect code. Please try again.' }))
      return false
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Try again.'
      setState(s => ({ ...s, stage: 'failed', error: msg }))
      return false
    }
  }, [fns, state.pinId])

  const reset = useCallback(() => {
    setState({ stage: 'idle', pinId: null, error: null })
  }, [])

  return {
    stage:     state.stage,
    error:     state.error,
    sending:   state.stage === 'sending',
    awaiting:  state.stage === 'awaiting',
    verifying: state.stage === 'verifying',
    verified:  state.stage === 'verified',
    sendOtp,
    verifyOtp,
    reset,
  }
}

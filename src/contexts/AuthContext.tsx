import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { AuthUser, AppUser, UserRole } from '../types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          // Get custom claims from token (role is set server-side)
          const tokenResult = await firebaseUser.getIdTokenResult()
          const role        = tokenResult.claims.role as UserRole | undefined
          const propertyId  = tokenResult.claims.propertyId as string | null | undefined

          // Fetch user profile from Firestore
          const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
          const profile     = profileSnap.exists() ? (profileSnap.data() as AppUser) : null

          setUser({
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName,
            role:        role ?? profile?.role ?? null,
            propertyId:  propertyId !== undefined ? propertyId : (profile?.propertyId ?? null),
            profile,
          })

          // Update lastLoginAt
          if (profileSnap.exists()) {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastLoginAt: serverTimestamp(),
            }).catch(() => {
              // Non-critical — don't throw
            })
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // onAuthStateChanged will handle setting the user
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

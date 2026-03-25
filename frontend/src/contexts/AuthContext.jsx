import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  const fetchProfile = async (email) => {
    if (!email) return
    try {
      const { data } = await supabase
        .from('members')
        .select('*, organizations(name)')
        .eq('email', email)
        .maybeSingle()
      setProfile(data || null)
    } catch (e) {
      console.error('Profile fetch failed', e)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.email)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.email)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, role = 'user', orgId = '', orgName = '') => {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { role, org_id: orgId, org_name: orgName } },
    })
  }

  const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = () => supabase.auth.signOut()

  const role = profile?.role || user?.user_metadata?.role || 'user'
  const orgId = profile?.org_id || user?.user_metadata?.org_id || ''
  const orgName = profile?.organizations?.name || user?.user_metadata?.org_name || ''
  const name = profile?.name || user?.email?.split('@')[0] || ''

  return (
    <AuthContext.Provider value={{ user, session, loading, role, orgId, orgName, name, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

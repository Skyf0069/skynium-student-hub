import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Vérifie si une session existe déjà au chargement de la page
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Écoute les changements (connexion / déconnexion en direct)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Petit écran de chargement pendant que Supabase réfléchit
  if (loading) {
    return <div className="min-h-screen bg-skynium flex items-center justify-center text-skynium-accent">Chargement...</div>
  }

  // LA LOGIQUE : Pas de session ? Login. Sinon ? Dashboard.
  if (!session) {
    return <Login />
  }
  
  return <Dashboard session={session} />
}

export default App
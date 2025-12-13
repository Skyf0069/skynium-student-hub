import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { LogIn } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) alert(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 transition-colors duration-500">
      
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-skynium-card p-10 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 text-center transition-all">
        
        <div className="mb-10">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-skynium-primary to-skynium-secondary dark:from-white dark:to-skynium-secondary mb-2">
            SSH
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Skynium Student Hub</p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-skynium-primary hover:bg-skynium-secondary text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-skynium-primary/30"
        >
          {loading ? (
            <span>Chargement...</span>
          ) : (
            <>
              <LogIn size={20} />
              <span>Se connecter avec Google</span>
            </>
          )}
        </button>

        <p className="mt-8 text-xs text-slate-400 dark:text-slate-600">
          Accès réservé aux étudiants R&T Luminy.
        </p>
      </div>
    </div>
  )
}
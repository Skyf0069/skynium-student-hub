import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Notes from './pages/Notes'
import { Calendar, FileText } from 'lucide-react'

function App() {
  const { isLoading, isAuthenticated } = useAuth0()
  // L'état qui gère la page affichée (dashboard par défaut)
  const [activePage, setActivePage] = useState('dashboard')

  // Petit écran de chargement pendant qu'Auth0 réfléchit (Ton code de base préservé)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark flex flex-col items-center justify-center text-skynium-accent transition-colors duration-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-skynium-primary mb-4"></div>
        <p className="font-medium text-slate-500 dark:text-slate-400">Connexion à Skynium Student Hub...</p>
      </div>
    )
  }

  // LA LOGIQUE : Pas de session ? Login.
  if (!isAuthenticated) {
    return <Login />
  }

  // Si on arrive ici, l'étudiant est connecté !
  return (
    <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark relative transition-colors duration-500">
      
      {/* --- MENU DE NAVIGATION FLOTTANT --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-skynium-card/90 backdrop-blur-md p-2 rounded-full shadow-2xl border border-slate-200 dark:border-slate-800 flex gap-2">
        <button 
          onClick={() => setActivePage('dashboard')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-300 ${
            activePage === 'dashboard' 
              ? 'bg-skynium-primary text-white shadow-lg shadow-skynium-primary/30 scale-105' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar size={18} /> <span className="hidden sm:inline">EDT</span>
        </button>
        <button 
          onClick={() => setActivePage('notes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-300 ${
            activePage === 'notes' 
              ? 'bg-skynium-primary text-white shadow-lg shadow-skynium-primary/30 scale-105' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={18} /> <span className="hidden sm:inline">Notes</span>
        </button>
      </div>

      {/* --- AFFICHAGE DE LA PAGE SÉLECTIONNÉE --- */}
      {activePage === 'dashboard' ? (
        // On passe onGoToNotes au Dashboard pour que son bouton interne puisse aussi changer la page
        <Dashboard onGoToNotes={() => setActivePage('notes')} />
      ) : (
        <Notes />
      )}
      
    </div>
  )
}

export default App
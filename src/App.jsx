import { useAuth0 } from '@auth0/auth0-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  // Auth0 nous donne directement ces variables prêtes à l'emploi
  const { isLoading, isAuthenticated } = useAuth0()

  // Petit écran de chargement pendant qu'Auth0 réfléchit
  if (isLoading) {
    return (
      <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark flex flex-col items-center justify-center text-skynium-accent transition-colors duration-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-skynium-primary mb-4"></div>
        <p className="font-medium text-slate-500 dark:text-slate-400">Connexion à Skynium Student Hub...</p>
      </div>
    )
  }

  // LA LOGIQUE : Pas de session ? Login. Sinon ? Dashboard.
  if (!isAuthenticated) {
    return <Login />
  }

  // Si on arrive ici, l'étudiant est connecté !
  return <Dashboard />
}

export default App
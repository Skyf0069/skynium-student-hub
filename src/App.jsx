import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Grades from './pages/Grades'

function App() {
  const { isLoading, isAuthenticated } = useAuth0()
  
  // 🎥 L'ÉTAT "RÉGIE" : Permet de switcher de vue (caméra 1 : dashboard, caméra 2 : grades)
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark flex flex-col items-center justify-center text-skynium-accent transition-colors duration-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-skynium-primary mb-4"></div>
        <p className="font-medium text-slate-500 dark:text-slate-400">Connexion à Skynium Student Hub...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark relative transition-colors duration-500">
      
      {/* 📺 ÉCRAN 1 : Le Dashboard */}
      {currentPage === 'dashboard' && (
        <Dashboard onGoToGrades={() => setCurrentPage('grades')} />
      )}
      
      {/* 📺 ÉCRAN 2 : Le Calculateur de Moyenne */}
      {currentPage === 'grades' && (
        <Grades onBack={() => setCurrentPage('dashboard')} />
      )}
      
    </div>
  )
}

export default App
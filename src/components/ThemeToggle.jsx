import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null)

  useEffect(() => {
    // 1. Vérifie s'il y a une préférence sauvegardée ou utilise le système
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark')
      document.documentElement.classList.add('dark')
    } else {
      setTheme('light')
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light')
      localStorage.theme = 'light'
      document.documentElement.classList.remove('dark')
    } else {
      setTheme('dark')
      localStorage.theme = 'dark'
      document.documentElement.classList.add('dark')
    }
  }

  // Ne rien afficher tant que le thème n'est pas chargé (évite le flash)
  if (!theme) return null

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all duration-300 ease-in-out bg-slate-200 text-skynium-primary dark:bg-skynium-primary dark:text-skynium-secondary hover:scale-110 shadow-md border border-transparent dark:border-skynium-secondary/30"
      aria-label="Changer le thème"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
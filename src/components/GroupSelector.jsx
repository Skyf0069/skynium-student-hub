import { useState } from 'react'
import { Check } from 'lucide-react'

export default function GroupSelector({ onGroupSelected }) {
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState('')

  // Liste des groupes
  const groups = ['TP1', 'TP2', 'TP3', 'TP4']

  const handleSave = () => {
    if (!selected) return
    setLoading(true)
    onGroupSelected(selected)
    setLoading(false)
  }

  return (
    <div className="text-center max-w-lg mx-auto mt-10 p-8 bg-white dark:bg-skynium-card rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-all duration-500">
      
      {/* text-skynium-primary en clair, et text-white en sombre */}
      <h2 className="text-3xl font-black mb-3 text-skynium-primary dark:text-white">
        Configure ton profil 🎓
      </h2>
      
      {/* text-slate-500 en clair pour bien lire, et text-slate-400 en sombre */}
      <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
        Pour t'afficher le bon emploi du temps, nous avons besoin de ton groupe de TP.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {groups.map((grp) => (
          <button
            key={grp}
            onClick={() => setSelected(grp)}
            className={`p-4 rounded-2xl border-2 transition-all font-bold text-lg flex items-center justify-center gap-2 ${
              selected === grp
                ? 'bg-skynium-primary/10 dark:bg-skynium-primary/20 text-skynium-primary dark:text-white border-skynium-primary shadow-lg shadow-skynium-primary/20'
                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-skynium-primary/50 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {grp}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!selected || loading}
        className="w-full sm:w-auto bg-skynium-primary hover:bg-skynium-secondary text-white font-bold py-4 px-8 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto shadow-lg shadow-skynium-primary/30"
      >
        {loading ? 'Sauvegarde...' : <><Check size={20}/> Valider mon groupe</>}
      </button>
    </div>
  )
}
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Check } from 'lucide-react'

export default function GroupSelector({ session, onGroupSelected }) {
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState('')

  // Liste des groupes (tu pourras en ajouter d'autres ici)
  const groups = ['TP1', 'TP2', 'TP3', 'TP4']

  const handleSave = async () => {
    if (!selected) return
    setLoading(true)

    const user = session.user

    // On sauvegarde dans la base de données Supabase
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        email: user.email,
        groupe_tp: selected 
      })

    if (error) {
      alert("Erreur lors de la sauvegarde : " + error.message)
    } else {
      // On prévient le Dashboard que c'est bon
      onGroupSelected(selected) 
    }
    setLoading(false)
  }

  return (
    <div className="text-center max-w-lg mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4 text-white">Configure ton profil 🎓</h2>
      <p className="text-slate-400 mb-8">Pour t'afficher le bon emploi du temps, nous avons besoin de ton groupe de TP.</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {groups.map((grp) => (
          <button
            key={grp}
            onClick={() => setSelected(grp)}
            className={`p-4 rounded-xl border transition-all font-bold ${
              selected === grp
                ? 'bg-skynium-accent text-skynium border-skynium-accent shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                : 'bg-skynium-light text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            {grp}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!selected || loading}
        className="bg-white text-skynium font-bold py-3 px-8 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
      >
        {loading ? 'Sauvegarde...' : <><Check size={20}/> Valider mon groupe</>}
      </button>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { LogOut, MapPin, User, ChevronLeft, ChevronRight, Calendar as CalIcon, Clock } from 'lucide-react'
import GroupSelector from '../components/GroupSelector'
import ThemeToggle from '../components/ThemeToggle'
import { fetchAndParseCalendar } from '../utils/icsParser'
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Dashboard({ session }) {
  const [groupeTp, setGroupeTp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cours, setCours] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date()) 

  useEffect(() => { getProfile() }, [session])
  useEffect(() => { if (groupeTp) chargerCalendrier() }, [groupeTp])

  async function getProfile() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('groupe_tp').eq('id', session.user.id).single()
    if (data?.groupe_tp) setGroupeTp(data.groupe_tp)
    setLoading(false)
  }

  async function chargerCalendrier() {
    const events = await fetchAndParseCalendar(groupeTp)
    setCours(events)
  }

  const coursDuJour = cours.filter(c => isSameDay(c.start, selectedDate))

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-skynium-light dark:bg-skynium-dark text-skynium-primary dark:text-white transition-colors duration-300">Chargement...</div>

  return (
    // FOND GLOBAL : Blanc cassé en Light / Violet très sombre en Dark
    <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark text-slate-800 dark:text-white p-4 pb-20 transition-colors duration-500 ease-in-out font-sans">
      
      {/* --- HEADER --- */}
      <nav className="flex justify-between items-center mb-8 pt-2 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
            {/* Logo en dégradé Skynium */}
            <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-skynium-primary to-skynium-secondary dark:from-white dark:to-skynium-secondary">
              SSH
            </h1>
            {groupeTp && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-skynium-primary/10 text-skynium-primary dark:bg-skynium-secondary/20 dark:text-skynium-secondary border border-skynium-primary/20 dark:border-skynium-secondary/50">
                {groupeTp}
              </span>
            )}
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-full bg-white dark:bg-skynium-card shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {!groupeTp ? (
        <GroupSelector session={session} onGroupSelected={setGroupeTp} />
      ) : (
        <div className="max-w-3xl mx-auto">
            
            {/* --- NAVIGATION DATE --- */}
            <div className="flex items-center justify-between bg-white dark:bg-skynium-card p-4 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-800 mb-8 sticky top-4 z-20 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80 transition-all duration-300">
                <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-skynium-primary transition-colors text-skynium-primary dark:text-white">
                    <ChevronLeft size={24} />
                </button>
                
                <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-skynium-tertiary mb-1">
                        {isToday(selectedDate) ? "Aujourd'hui" : format(selectedDate, 'EEEE', { locale: fr })}
                    </p>
                    <p className="text-xl font-black capitalize text-skynium-primary dark:text-white">
                        {format(selectedDate, 'd MMMM', { locale: fr })}
                    </p>
                </div>

                <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-skynium-primary transition-colors text-skynium-primary dark:text-white">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* --- LISTE DES COURS --- */}
            <div className="space-y-5 animate-in slide-in-from-bottom-6 duration-700">
                {coursDuJour.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <CalIcon size={64} className="text-skynium-primary dark:text-slate-600" />
                        <p className="text-skynium-primary dark:text-slate-400 font-medium">Aucun cours ce jour-là.</p>
                        {!isToday(selectedDate) && (
                            <button onClick={() => setSelectedDate(new Date())} className="text-skynium-secondary font-bold hover:underline">
                                Revenir à aujourd'hui
                            </button>
                        )}
                    </div>
                ) : (
                    coursDuJour.map((c, index) => (
                        <div key={index} className={`relative p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group ${
                            c.isAutonomie 
                                ? 'bg-slate-100 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-700' 
                                : 'bg-white dark:bg-skynium-card border-transparent dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20'
                        }`}>
                            
                            {/* Barre latérale de couleur */}
                            <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full ${c.isAutonomie ? 'bg-slate-400' : 'bg-skynium-secondary'}`}></div>

                            <div className="pl-4">
                                {/* Tag Type (R101...) */}
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className={`text-2xl font-black tracking-tight ${c.isAutonomie ? 'text-slate-500 dark:text-slate-400' : 'text-skynium-primary dark:text-white'}`}>
                                        {format(c.start, 'HH:mm')}
                                    </span>
                                    <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                                        Fin : {format(c.end, 'HH:mm')}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-skynium-primary text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                                      {c.type}
                                  </span>
                                </div>

                                {/* Titre */}
                                <h3 className={`text-lg font-bold mb-4 leading-snug ${c.isAutonomie ? 'text-slate-500 italic' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {c.title}
                                </h3>

                                {/* Infos */}
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                                      c.isAutonomie 
                                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' 
                                        : 'bg-indigo-50 text-indigo-600 dark:bg-skynium-secondary/10 dark:text-skynium-secondary'
                                    }`}>
                                        <MapPin size={16} />
                                        <span className="font-bold">{c.location}</span>
                                    </div>

                                    {c.prof && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                            <User size={16} />
                                            <span>{c.prof}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* --- ACCÈS RAPIDE (Skynium Style) --- */}
            <div className="mt-16">
              <div className="border-t border-slate-200 dark:border-slate-800 mb-8"></div>
              
              <h3 className="text-slate-400 dark:text-slate-500 font-bold mb-6 uppercase text-xs tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-skynium-secondary shadow-[0_0_10px_#FA5DFF]"></span>
                Hub Skynium
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { 
                    name: "ENT AMU", 
                    url: "https://ent.univ-amu.fr", 
                    icon: <User size={22}/>, 
                    // Rose (Secondary)
                    color: "text-skynium-secondary", 
                    bg: "bg-skynium-secondary/10",
                    border: "hover:border-skynium-secondary"
                  },
                  { 
                    name: "AMeTICE", 
                    url: "https://ametice.univ-amu.fr", 
                    icon: <MapPin size={22}/>, 
                    // Orange (Tertiary)
                    color: "text-skynium-tertiary", 
                    bg: "bg-skynium-tertiary/10",
                    border: "hover:border-skynium-tertiary"
                  },
                  { 
                    name: "Wiki R&T", 
                    url: "#", 
                    icon: <Clock size={22}/>, 
                    // Rose (Secondary) - Retour au rose pour l'harmonie
                    color: "text-skynium-secondary", 
                    bg: "bg-skynium-secondary/10",
                    border: "hover:border-skynium-secondary"
                  },
                  { 
                    name: "Discord", 
                    url: "#", 
                    icon: <span className="font-black text-lg">Dj</span>, 
                    // Orange (Tertiary)
                    color: "text-skynium-tertiary", 
                    bg: "bg-skynium-tertiary/10",
                    border: "hover:border-skynium-tertiary"
                  },
                ].map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" 
                     className={`
                        bg-white dark:bg-skynium-card p-4 rounded-2xl shadow-sm 
                        border border-slate-100 dark:border-slate-800 
                        ${item.border} hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center gap-3
                     `}>
                    
                    {/* Cercle de l'icône */}
                    <div className={`p-3 rounded-full ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                      {item.icon}
                    </div>
                    
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300 group-hover:text-skynium-primary dark:group-hover:text-white transition-colors">
                        {item.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
        </div>
      )}
    </div>
  )
}
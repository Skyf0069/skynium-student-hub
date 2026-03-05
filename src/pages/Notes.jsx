import { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import ReactMarkdown from 'react-markdown'
import { Plus, FileText, Trash2, LogIn, LogOut, Layout } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function Notes() {
  const { user, isAuthenticated, loginWithRedirect, logout, isLoading } = useAuth0()
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // LE BOUCLIER ANTI-DDOS : On crée une référence pour notre chronomètre
  const debounceTimer = useRef(null)

  // 1. CHERCHER LES NOTES (GET)
  useEffect(() => {
    if (user) {
      const loadNotes = async () => {
        try {
          const response = await fetch(`https://api.skynium.fr/webhook/get-notes?userId=${user.sub}`);
          if (response.ok) {
            const data = await response.json();
            setNotes(data.notes || []);
            if (data.notes?.length > 0) setActiveNoteId(data.notes[0].id);
          } else {
            // Si 404 ou erreur, on crée une note par défaut
            if (notes.length === 0) createNewNote();
          }
        } catch (e) {
          setSyncStatus('error');
          const local = localStorage.getItem(`sk_notes_${user.sub}`);
          if (local) setNotes(JSON.parse(local));
        }
      };
      loadNotes();
    }
  }, [user]);

  // 2. ENVOYER À N8N (POST) - Cette fonction ne fait que parler au serveur
  const sendToCloud = async (notesToSave) => {
    setSyncStatus('saving');
    try {
      const response = await fetch('https://api.skynium.fr/webhook/save-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.sub, notes: notesToSave })
      });
      
      if (response.ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
      console.error("Erreur Cloud:", e);
    }
  };

  // --- ACTIONS ---
  const createNewNote = () => {
    const newNote = {
      id: Date.now().toString(),
      title: 'Nouvelle Note',
      content: '# Titre de ma note\n\nCommencez à écrire ici en **Markdown**...',
      updatedAt: new Date().toISOString()
    }
    const updatedNotes = [newNote, ...notes]
    setNotes(updatedNotes)
    setActiveNoteId(newNote.id)
    
    // Sauvegarde locale + Envoi direct car c'est un clic unique
    localStorage.setItem(`skynium_notes_${user.sub}`, JSON.stringify(updatedNotes))
    setIsSaving(true)
    sendToCloud(updatedNotes)
  }

  // C'EST ICI QUE TOUT CHANGE : La mise à jour du texte
  const updateActiveNote = (field, value) => {
    const updatedNotes = notes.map(note => {
      if (note.id === activeNoteId) {
        return { ...note, [field]: value, updatedAt: new Date().toISOString() }
      }
      return note
    })
    
    // 1. On met à jour l'écran instantanément pour que ce soit fluide
    setNotes(updatedNotes)
    
    // 2. On sauvegarde en local instantanément (au cas où le PC s'éteint)
    localStorage.setItem(`skynium_notes_${user.sub}`, JSON.stringify(updatedNotes))
    
    // 3. LA SÉCURITÉ : On annule le précédent envoi s'il était en attente
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // 4. On relance le chronomètre : on attend 1.5 seconde sans frappe avant d'appeler n8n
    setIsSaving(true)
    debounceTimer.current = setTimeout(() => {
      sendToCloud(updatedNotes)
    }, 1500)
  }

  const deleteNote = (id, e) => {
    e.stopPropagation()
    const updatedNotes = notes.filter(note => note.id !== id)
    setNotes(updatedNotes)
    
    localStorage.setItem(`skynium_notes_${user.sub}`, JSON.stringify(updatedNotes))
    setIsSaving(true)
    sendToCloud(updatedNotes)
    
    if (activeNoteId === id) {
      setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null)
    }
  }

  // --- ÉTATS DE CHARGEMENT ET CONNEXION ---
  if (isLoading) {
    return <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-skynium-primary"></div></div>
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-skynium-card p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100 dark:border-slate-800">
          <Layout size={48} className="mx-auto text-skynium-primary mb-6" />
          <h1 className="text-3xl font-black text-skynium-primary dark:text-white mb-4">Skynium Notes</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Votre espace de prise de notes intelligent, synchronisé dans le cloud Skynium.</p>
          <button onClick={() => loginWithRedirect()} className="w-full bg-skynium-primary hover:bg-skynium-secondary text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all">
            <LogIn size={20} /> Se connecter via SSO
          </button>
        </div>
      </div>
    )
  }

  const activeNote = notes.find(n => n.id === activeNoteId)

  return (
    <div className="flex h-screen bg-skynium-light dark:bg-skynium-dark text-slate-800 dark:text-white transition-colors duration-500 font-sans overflow-hidden">
      
      {/* ================= SIDEBAR (Fichiers) ================= */}
      <aside className="w-72 bg-white dark:bg-skynium-card border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors z-10">
        
        {/* En-tête Sidebar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-skynium-primary/10 dark:bg-skynium-primary/20 p-2 rounded-xl text-skynium-primary">
              <Layout size={20} />
            </div>
            <h2 className="font-black text-lg tracking-tight">Skynium Notes</h2>
          </div>
          <ThemeToggle />
        </div>

        {/* Bouton Nouvelle Note */}
        <div className="p-4">
          <button 
            onClick={createNewNote}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-skynium-primary hover:text-white dark:hover:bg-skynium-primary text-slate-600 dark:text-slate-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700 hover:border-transparent"
          >
            <Plus size={18} /> Nouvelle Note
          </button>
        </div>

        {/* Liste des Notes */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
          <p className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-4">Récents</p>
          {notes.map(note => (
            <div 
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                activeNoteId === note.id 
                  ? 'bg-skynium-primary/10 dark:bg-skynium-primary/20 text-skynium-primary dark:text-white font-semibold' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={16} className={activeNoteId === note.id ? 'text-skynium-primary' : 'text-slate-400'} />
                <span className="truncate text-sm">{note.title || 'Note sans titre'}</span>
              </div>
              <button 
                onClick={(e) => deleteNote(note.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Profil Utilisateur */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-skynium-tertiary text-white flex items-center justify-center font-bold text-sm">
              {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-sm font-semibold truncate dark:text-slate-300">{user.name || user.nickname}</span>
          </div>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="text-slate-400 hover:text-skynium-primary transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ================= MAIN AREA (Éditeur) ================= */}
      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-skynium-dark">
        {activeNote ? (
          <>
            {/* Header de l'éditeur */}
            <header className="p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-between items-center">
              <input value={activeNote.title} onChange={e => updateActiveNote('title', e.target.value)} className="bg-transparent font-bold text-xl outline-none dark:text-white w-1/2" />
              
              {/* STATUS DE SYNCHRO AMÉLIORÉ */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider transition-all">
                {syncStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-skynium-tertiary">
                    <div className="w-2 h-2 bg-skynium-tertiary rounded-full animate-pulse"></div> Envoi...
                  </div>
                )}
                {syncStatus === 'synced' && (
                  <div className="flex items-center gap-2 text-green-500">
                    <Check size={14} /> Synchronisé
                  </div>
                )}
                {syncStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-500">
                    <CloudOff size={14} /> Erreur Cloud
                  </div>
                )}
              </div>
            </header>

            {/* Zone de texte scindée */}
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#1A050A]">
                <div className="bg-slate-100 dark:bg-slate-800/50 py-2 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} /> Éditeur Markdown
                </div>
                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateActiveNote('content', e.target.value)}
                  className="flex-1 w-full p-6 bg-transparent border-none outline-none resize-none text-slate-700 dark:text-slate-300 font-mono text-sm leading-relaxed"
                  placeholder="Commencez à écrire votre rapport CROUS ici..."
                />
              </div>

              <div className="w-1/2 flex flex-col bg-slate-50 dark:bg-skynium-dark overflow-y-auto">
                <div className="bg-slate-100 dark:bg-slate-800/50 py-2 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 sticky top-0 z-10 backdrop-blur-md">
                  <Layout size={14} /> Aperçu en direct
                </div>
                <div className="p-8 prose prose-slate dark:prose-invert max-w-none prose-headings:text-skynium-primary dark:prose-headings:text-white prose-a:text-skynium-secondary">
                  <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
            <FileText size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Sélectionnez ou créez une note pour commencer</p>
          </div>
        )}
      </main>

    </div>
  )
}
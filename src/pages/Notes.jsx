import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import ReactMarkdown from 'react-markdown'
import { Plus, FileText, Trash2, LogIn, LogOut, Layout, Cloud, CloudOff } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

// L'ADRESSE DE TON VPS (À adapter selon ton Nginx)
const API_URL = 'https://cloud.skynium.fr/api' // ou http://IP_DE_TON_VPS:3001 si tu n'as pas encore fait le nom de domaine

export default function Notes() {
  const { user, isAuthenticated, loginWithRedirect, logout, isLoading } = useAuth0()
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  
  // États de synchronisation
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced', 'saving', 'error'

  // 1. CHERCHER LES NOTES DEPUIS N8N
  useEffect(() => {
    if (user) {
      const loadNotes = async () => {
        try {
          const response = await fetch(`https://api.skynium.fr/webhook/get-notes?userId=${user.sub}`);
          if (response.ok) {
            const data = await response.json();
            setNotes(data.notes || []);
            if (data.notes && data.notes.length > 0) setActiveNoteId(data.notes[0].id);
          } else {
            createNewNote();
          }
        } catch (error) {
          console.error("Erreur de connexion au cloud Skynium:", error);
          // Sécurité : on charge la mémoire locale si n8n est éteint
          const localFallback = localStorage.getItem(`skynium_notes_${user.sub}`);
          if (localFallback) setNotes(JSON.parse(localFallback));
        }
      };
      loadNotes();
    }
  }, [user]);

  // 2. SAUVEGARDER VERS N8N
  const saveToCloud = async (updatedNotes) => {
    setIsSaving(true);
    // Sauvegarde locale de secours (toujours bien d'avoir un backup)
    localStorage.setItem(`skynium_notes_${user.sub}`, JSON.stringify(updatedNotes));
    
    try {
      // On envoie le paquet à n8n !
      await fetch('https://api.skynium.fr/webhook/save-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.sub, 
          notes: updatedNotes 
        })
      });
    } catch (error) {
      console.error("Erreur d'envoi à n8n :", error);
    }
    
    setTimeout(() => setIsSaving(false), 500);
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
    saveToVPS(updatedNotes)
  }

  const updateActiveNote = (field, value) => {
    const updatedNotes = notes.map(note => {
      if (note.id === activeNoteId) {
        return { ...note, [field]: value, updatedAt: new Date().toISOString() }
      }
      return note
    })
    setNotes(updatedNotes)
    
    // On met à jour l'interface tout de suite, mais on attend 1 seconde pour envoyer au VPS (Debounce)
    setSyncStatus('saving')
    clearTimeout(window.saveTimeout)
    window.saveTimeout = setTimeout(() => {
      saveToVPS(updatedNotes)
    }, 1000)
  }

  const deleteNote = (id, e) => {
    e.stopPropagation()
    const updatedNotes = notes.filter(note => note.id !== id)
    setNotes(updatedNotes)
    saveToVPS(updatedNotes)
    if (activeNoteId === id) {
      setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null)
    }
  }

  // --- Écrans de connexion / chargement ---
  if (isLoading) return <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-skynium-primary"></div></div>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-skynium-light dark:bg-skynium-dark flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-skynium-card p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100 dark:border-slate-800">
          <Cloud size={48} className="mx-auto text-skynium-primary mb-6" />
          <h1 className="text-3xl font-black text-skynium-primary dark:text-white mb-4">Skynium Cloud</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Vos notes hébergées de manière 100% souveraine sur nos serveurs.</p>
          <button onClick={() => loginWithRedirect()} className="w-full bg-skynium-primary hover:bg-skynium-secondary text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all">
            <LogIn size={20} /> Connexion SSO
          </button>
        </div>
      </div>
    )
  }

  const activeNote = notes.find(n => n.id === activeNoteId)

  return (
    <div className="flex h-screen bg-skynium-light dark:bg-skynium-dark text-slate-800 dark:text-white transition-colors duration-500 font-sans overflow-hidden">
      
      {/* SIDEBAR (Fichiers) */}
      <aside className="w-72 bg-white dark:bg-skynium-card border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors z-10">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-skynium-primary/10 dark:bg-skynium-primary/20 p-2 rounded-xl text-skynium-primary">
              <Cloud size={20} />
            </div>
            <h2 className="font-black text-lg tracking-tight">Skynium Notes</h2>
          </div>
          <ThemeToggle />
        </div>

        <div className="p-4">
          <button onClick={createNewNote} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-skynium-primary hover:text-white dark:hover:bg-skynium-primary text-slate-600 dark:text-slate-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700 hover:border-transparent">
            <Plus size={18} /> Nouvelle Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
          <p className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-4">Fichiers sur le VPS</p>
          {notes.map(note => (
            <div key={note.id} onClick={() => setActiveNoteId(note.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeNoteId === note.id ? 'bg-skynium-primary/10 dark:bg-skynium-primary/20 text-skynium-primary dark:text-white font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={16} className={activeNoteId === note.id ? 'text-skynium-primary' : 'text-slate-400'} />
                <span className="truncate text-sm">{note.title || 'Note sans titre'}</span>
              </div>
              <button onClick={(e) => deleteNote(note.id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-skynium-tertiary text-white flex items-center justify-center font-bold text-sm">
              {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-sm font-semibold truncate dark:text-slate-300">{user.name || user.nickname}</span>
          </div>
        </div>
      </aside>

      {/* ZONE PRINCIPALE (Éditeur) */}
      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-skynium-dark">
        {activeNote ? (
          <>
            {/* Header avec statut de synchro */}
            <header className="px-8 py-4 bg-white dark:bg-skynium-card border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <input type="text" value={activeNote.title} onChange={(e) => updateActiveNote('title', e.target.value)} placeholder="Titre de la note..." className="text-2xl font-black bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-white w-2/3 placeholder-slate-300 dark:placeholder-slate-600" />
              
              <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${syncStatus === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {syncStatus === 'saving' && <><div className="w-2 h-2 bg-skynium-tertiary rounded-full animate-pulse"></div> Envoi au VPS...</>}
                {syncStatus === 'synced' && <><Cloud size={14} className="text-skynium-primary" /> Synchronisé</>}
                {syncStatus === 'error' && <><CloudOff size={14} /> VPS Hors-ligne</>}
              </div>
            </header>

            {/* Éditeur Scindé */}
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#1A050A]">
                <div className="bg-slate-100 dark:bg-slate-800/50 py-2 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} /> Markdown (Écriture)
                </div>
                <textarea value={activeNote.content} onChange={(e) => updateActiveNote('content', e.target.value)} className="flex-1 w-full p-6 bg-transparent border-none outline-none resize-none text-slate-700 dark:text-slate-300 font-mono text-sm leading-relaxed" placeholder="Commencez à écrire..." />
              </div>

              <div className="w-1/2 flex flex-col bg-slate-50 dark:bg-skynium-dark overflow-y-auto">
                <div className="bg-slate-100 dark:bg-slate-800/50 py-2 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 sticky top-0 z-10 backdrop-blur-md">
                  <Layout size={14} /> Aperçu (Lecture)
                </div>
                <div className="p-8 prose prose-slate dark:prose-invert max-w-none prose-headings:text-skynium-primary dark:prose-headings:text-white prose-a:text-skynium-secondary">
                  <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
            <Cloud size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Votre Cloud Skynium est vide.</p>
          </div>
        )}
      </main>

    </div>
  )
}
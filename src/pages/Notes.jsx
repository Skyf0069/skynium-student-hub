import { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import ReactMarkdown from 'react-markdown'
import { Plus, FileText, Trash2, LogIn, LogOut, Layout, Check, CloudOff } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function Notes() {
  const { user, isAuthenticated, loginWithRedirect, logout, isLoading } = useAuth0()
  
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  
  // 🔴 C'EST CETTE LIGNE QUI MANQUAIT ET QUI CRÉAIT L'ÉCRAN BLANC :
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced', 'saving', 'error'
  
  const debounceTimer = useRef(null)

  // 1. CHARGEMENT
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

  // 2. ENVOI CLOUD AVEC VÉRIFICATION
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

  const createNewNote = () => {
    const newNote = { id: Date.now().toString(), title: 'Nouvelle Note', content: '# Bienvenue\nÉcrivez ici...', updatedAt: new Date().toISOString() };
    const updated = [newNote, ...notes];
    setNotes(updated);
    setActiveNoteId(newNote.id);
    localStorage.setItem(`sk_notes_${user.sub}`, JSON.stringify(updated));
    sendToCloud(updated);
  };

  const updateActiveNote = (field, value) => {
    const updated = notes.map(n => n.id === activeNoteId ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    localStorage.setItem(`sk_notes_${user.sub}`, JSON.stringify(updated));
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSyncStatus('saving');
    debounceTimer.current = setTimeout(() => sendToCloud(updated), 1500);
  };

  const deleteNote = (id, e) => {
    e.stopPropagation()
    const updatedNotes = notes.filter(note => note.id !== id)
    setNotes(updatedNotes)
    
    localStorage.setItem(`sk_notes_${user.sub}`, JSON.stringify(updatedNotes))
    setSyncStatus('saving');
    sendToCloud(updatedNotes)
    
    if (activeNoteId === id) {
      setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null)
    }
  }

  if (isLoading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-skynium-primary"></div></div>

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <button onClick={() => loginWithRedirect()} className="p-4 bg-skynium-primary text-white rounded-xl font-bold flex gap-2">
        <LogIn size={20} /> Se connecter
      </button>
    </div>
  )

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-500 font-sans">
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="font-black text-skynium-primary dark:text-white tracking-tighter">SKYNIUM NOTES</span>
          <ThemeToggle />
        </div>
        <div className="p-4">
          <button onClick={createNewNote} className="w-full bg-skynium-primary/10 text-skynium-primary dark:bg-skynium-primary dark:text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:scale-[1.02] transition-all">
            <Plus size={18} /> Nouvelle Note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {notes.map(n => (
            <div key={n.id} onClick={() => setActiveNoteId(n.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeNoteId === n.id ? 'bg-skynium-primary text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <div className="flex items-center gap-2 truncate text-sm font-semibold">
                <FileText size={14} /> {n.title}
              </div>
              <button onClick={(e) => deleteNote(n.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all rounded-md">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {activeNote ? (
          <>
            <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center z-0">
              <input value={activeNote.title} onChange={e => updateActiveNote('title', e.target.value)} className="bg-transparent font-bold text-xl outline-none text-slate-800 dark:text-white w-1/2" />
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider transition-all">
                {syncStatus === 'saving' && <div className="flex items-center gap-2 text-skynium-tertiary"><div className="w-2 h-2 bg-skynium-tertiary rounded-full animate-pulse"></div> Envoi...</div>}
                {syncStatus === 'synced' && <div className="flex items-center gap-2 text-green-500"><Check size={14} /> Synchronisé</div>}
                {syncStatus === 'error' && <div className="flex items-center gap-2 text-red-500"><CloudOff size={14} /> Erreur Cloud</div>}
              </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
              <textarea value={activeNote.content} onChange={e => updateActiveNote('content', e.target.value)} className="w-1/2 p-6 bg-white dark:bg-[#1A050A] border-r border-slate-200 dark:border-slate-800 outline-none resize-none font-mono text-sm text-slate-700 dark:text-slate-300" placeholder="Écrivez ici..." />
              <div className="w-1/2 p-8 prose dark:prose-invert overflow-y-auto max-w-none prose-headings:text-skynium-primary dark:prose-headings:text-white prose-a:text-skynium-secondary">
                <ReactMarkdown>{activeNote.content}</ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic">
            <Layout size={48} className="mb-4 opacity-20" />
            Cliquez sur une note pour commencer
          </div>
        )}
      </main>
    </div>
  )
}
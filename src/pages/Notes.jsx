import React, { useState, useEffect, useRef } from 'react'
import { 
  LogOut, MapPin, User, ChevronLeft, ChevronRight, 
  Calendar as CalIcon, Clock, FileText, Plus, Trash2, 
  LogIn, Layout, Check, Moon, Sun, CloudOff
} from 'lucide-react'
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import { useAuth0 } from '@auth0/auth0-react'

/** ==========================================
 * COMPOSANT THEME TOGGLE
 * ========================================== */
const ThemeToggle = () => {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [dark])
  return (
    <button onClick={() => setDark(!dark)} className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-skynium-primary dark:hover:text-white transition-all">
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

/** ==========================================
 * COMPOSANT NOTES (SÉCURISÉ ANTI-CRASH)
 * ========================================== */
const Notes = () => {
  const { user } = useAuth0()
  const [notes, setNotes] = useState([]) // Toujours un tableau
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [syncStatus, setSyncStatus] = useState('synced') 
  const debounceTimer = useRef(null)

  // 1. CHARGEMENT SÉCURISÉ
  useEffect(() => {
    if (user) {
      const loadNotes = async () => {
        try {
          const response = await fetch(`https://api.skynium.fr/webhook/get-notes?userId=${user.sub}`);
          if (response.ok) {
            const data = await response.json();
            // LA SÉCURITÉ ICI : On vérifie que c'est bien un tableau !
            if (data.notes && Array.isArray(data.notes)) {
              setNotes(data.notes);
              if (data.notes.length > 0) setActiveNoteId(data.notes[0].id);
            } else {
              throw new Error("Format de données invalide");
            }
          } else {
            throw new Error("Erreur serveur");
          }
        } catch (e) {
          console.error("Erreur de chargement:", e);
          setSyncStatus('error');
          // Repli sur la mémoire locale en cas de crash n8n
          const local = localStorage.getItem(`sk_notes_${user.sub}`);
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed)) {
                setNotes(parsed);
                if (parsed.length > 0) setActiveNoteId(parsed[0].id);
              }
            } catch (err) {
              setNotes([]); // Si la mémoire locale est corrompue, on vide tout
            }
          } else {
             if (notes.length === 0) createNewNote();
          }
        }
      };
      loadNotes();
    }
  }, [user]);

  // 2. SAUVEGARDE
  const sendToCloud = async (notesToSave) => {
    setSyncStatus('saving');
    try {
      const response = await fetch('https://api.skynium.fr/webhook/save-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.sub, notes: notesToSave })
      });
      if (response.ok) setSyncStatus('synced');
      else setSyncStatus('error');
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const createNewNote = () => {
    const newNote = { id: Date.now().toString(), title: 'Nouvelle Note', content: '# Bienvenue\nÉcrivez votre rapport ici...', updatedAt: new Date().toISOString() };
    const updated = [newNote, ...(Array.isArray(notes) ? notes : [])]; // Sécurité
    setNotes(updated);
    setActiveNoteId(newNote.id);
    localStorage.setItem(`sk_notes_${user.sub}`, JSON.stringify(updated));
    sendToCloud(updated);
  };

  const updateActiveNote = (field, value) => {
    if (!Array.isArray(notes)) return;
    const updated = notes.map(n => n.id === activeNoteId ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    localStorage.setItem(`sk_notes_${user.sub}`, JSON.stringify(updated));
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSyncStatus('saving');
    debounceTimer.current = setTimeout(() => sendToCloud(updated), 1500);
  };

  const deleteNote = (id, e) => {
    e.stopPropagation()
    if (!Array.isArray(notes)) return;
    const updatedNotes = notes.filter(note => note.id !== id)
    setNotes(updatedNotes)
    localStorage.setItem(`sk_notes_${user.sub}`, JSON.stringify(updatedNotes))
    setSyncStatus('saving');
    sendToCloud(updatedNotes)
    if (activeNoteId === id) setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null)
  }

  // SÉCURITÉ : notes.find() ne crashera plus jamais car notes est forcé d'être un tableau
  const activeNote = Array.isArray(notes) ? notes.find(n => n.id === activeNoteId) : null;
  const safeNotes = Array.isArray(notes) ? notes : [];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="font-black text-skynium-primary dark:text-white tracking-tighter">SKYNIUM NOTES</span>
          <ThemeToggle />
        </div>
        <div className="p-4">
          <button onClick={createNewNote} className="w-full bg-skynium-primary/10 text-skynium-primary dark:bg-skynium-primary dark:text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:scale-[1.02] transition-all">
            <Plus size={18} /> Nouvelle Note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {safeNotes.map(n => (
            <div key={n.id} onClick={() => setActiveNoteId(n.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeNoteId === n.id ? 'bg-skynium-primary text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <div className="flex items-center gap-2 truncate text-sm font-semibold">
                <FileText size={14} /> {n.title}
              </div>
              <button onClick={(e) => deleteNote(n.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded-md">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {activeNote ? (
          <>
            <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <input value={activeNote.title} onChange={e => updateActiveNote('title', e.target.value)} className="bg-transparent font-bold text-xl outline-none text-slate-800 dark:text-white w-1/2" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider">
                {syncStatus === 'saving' && <div className="flex items-center gap-2 text-skynium-tertiary"><div className="w-2 h-2 bg-skynium-tertiary rounded-full animate-pulse"></div> Envoi...</div>}
                {syncStatus === 'synced' && <div className="flex items-center gap-2 text-green-500"><Check size={14} /> Synchronisé</div>}
                {syncStatus === 'error' && <div className="flex items-center gap-2 text-red-500"><CloudOff size={14} /> Erreur Cloud</div>}
              </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
              <textarea value={activeNote.content} onChange={e => updateActiveNote('content', e.target.value)} className="w-1/2 p-6 bg-white dark:bg-[#1A050A] border-r border-slate-200 dark:border-slate-800 outline-none resize-none font-mono text-sm text-slate-700 dark:text-slate-300" placeholder="Rapport CROUS..." />
              <div className="w-1/2 p-8 prose dark:prose-invert overflow-y-auto max-w-none prose-headings:text-skynium-primary dark:prose-headings:text-white prose-a:text-skynium-secondary">
                <ReactMarkdown>{activeNote.content}</ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic">
            <Layout size={48} className="mb-4 opacity-20" />
            Cliquez sur une note
          </div>
        )}
      </main>
    </div>
  )
}

/** ==========================================
 * COMPOSANT DASHBOARD
 * ========================================== */
const Dashboard = ({ onGoToNotes }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
    <button onClick={onGoToNotes} className="p-10 bg-skynium-primary text-white rounded-3xl shadow-2xl flex flex-col items-center gap-4 hover:scale-105 transition-transform">
      <div className="bg-white/20 p-5 rounded-full"><FileText size={40} /></div>
      <span className="text-xl font-black uppercase tracking-tight">Ouvrir Skynium Notes</span>
    </button>
  </div>
)

/** ==========================================
 * APP
 * ========================================== */
export default function App() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()
  const [page, setPage] = useState('dashboard')

  if (isLoading) return <div className="h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white">Chargement...</div>
  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <button onClick={() => loginWithRedirect()} className="p-4 bg-skynium-primary text-white rounded-xl font-bold">Se connecter</button>
    </div>
  )
  return page === 'dashboard' ? <Dashboard onGoToNotes={() => setPage('notes')} /> : <Notes />
}
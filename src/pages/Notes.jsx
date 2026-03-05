import React, { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import ReactMarkdown from 'react-markdown'
import { Plus, FileText, Trash2, LogIn, Layout, Check, CloudOff } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function Notes() {
  const { user, isAuthenticated, loginWithRedirect, isLoading } = useAuth0()
  
  const [notes, setNotes] = useState([]) 
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [syncStatus, setSyncStatus] = useState('synced') 
  
  const debounceTimer = useRef(null)

  // Nettoyage de l'ID pour Linux (auth0|123 -> auth0_123)
  const getSafeUserId = () => {
    if (!user || !user.sub) return 'unknown_user';
    return user.sub.replace(/\|/g, '_');
  }

  useEffect(() => {
    if (user) {
      const safeUserId = getSafeUserId();
      
      const loadNotes = async () => {
        try {
          const response = await fetch(`https://api.skynium.fr/webhook/get-notes?userId=${safeUserId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.notes && Array.isArray(data.notes)) {
              setNotes(data.notes);
              if (data.notes.length > 0) setActiveNoteId(data.notes[0].id);
            } else {
              throw new Error("Format invalide");
            }
          } else {
            throw new Error("Erreur serveur");
          }
        } catch (e) {
          console.error("Erreur n8n, passage en mode local");
          setSyncStatus('error');
          const local = localStorage.getItem(`sk_notes_${safeUserId}`);
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed)) {
                setNotes(parsed);
                if (parsed.length > 0) setActiveNoteId(parsed[0].id);
              }
            } catch (err) {
              setNotes([]); 
            }
          } else {
             if (notes.length === 0) createNewNote();
          }
        }
      };
      loadNotes();
    }
  }, [user]);

  const sendToCloud = async (notesToSave) => {
    setSyncStatus('saving');
    const safeUserId = getSafeUserId();
    
    try {
      const response = await fetch('https://api.skynium.fr/webhook/save-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: safeUserId, notes: notesToSave })
      });
      if (response.ok) setSyncStatus('synced');
      else setSyncStatus('error');
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const createNewNote = () => {
    const safeUserId = getSafeUserId();
    const newNote = { 
      id: Date.now().toString(), 
      title: 'Nouvelle Note', 
      content: '# Rapport CROUS\nCommencez à rédiger ici...', 
      updatedAt: new Date().toISOString() 
    };
    
    const currentNotes = Array.isArray(notes) ? notes : [];
    const updated = [newNote, ...currentNotes];
    
    setNotes(updated);
    setActiveNoteId(newNote.id);
    localStorage.setItem(`sk_notes_${safeUserId}`, JSON.stringify(updated));
    sendToCloud(updated);
  };

  const updateActiveNote = (field, value) => {
    if (!Array.isArray(notes)) return;
    const safeUserId = getSafeUserId();
    
    const updated = notes.map(n => n.id === activeNoteId ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    localStorage.setItem(`sk_notes_${safeUserId}`, JSON.stringify(updated));
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSyncStatus('saving');
    debounceTimer.current = setTimeout(() => sendToCloud(updated), 1500);
  };

  const deleteNote = (id, e) => {
    e.stopPropagation();
    if (!Array.isArray(notes)) return;
    const safeUserId = getSafeUserId();
    
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(`sk_notes_${safeUserId}`, JSON.stringify(updatedNotes));
    
    setSyncStatus('saving');
    sendToCloud(updatedNotes);
    
    if (activeNoteId === id) {
      setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
    }
  }

  const safeNotes = Array.isArray(notes) ? notes : [];
  const activeNote = safeNotes.find(n => n.id === activeNoteId) || null;

  if (isLoading) return <div className="min-h-screen bg-slate-50 dark:bg-skynium-dark flex items-center justify-center transition-colors duration-500"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-skynium-primary"></div></div>

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-skynium-dark transition-colors duration-500">
      <div className="bg-white dark:bg-skynium-card p-10 rounded-3xl shadow-xl text-center border border-slate-100 dark:border-slate-800">
        <Layout size={48} className="mx-auto text-skynium-primary mb-6" />
        <h1 className="text-3xl font-black text-skynium-primary dark:text-white mb-8">Skynium Notes</h1>
        <button onClick={() => loginWithRedirect()} className="w-full bg-skynium-primary hover:bg-skynium-secondary text-white font-bold py-4 px-6 rounded-2xl flex items-center gap-3 transition-all justify-center">
          <LogIn size={20} /> Se connecter via SSO
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-skynium-dark overflow-hidden transition-colors duration-500 font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white dark:bg-skynium-card border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-colors duration-500">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="font-black text-skynium-primary dark:text-white tracking-tighter text-lg">SKYNIUM NOTES</span>
          <ThemeToggle />
        </div>
        
        <div className="p-4">
          <button onClick={createNewNote} className="w-full bg-skynium-primary/10 text-skynium-primary dark:bg-skynium-primary dark:text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:scale-[1.02] transition-all">
            <Plus size={18} /> Nouvelle Note
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {safeNotes.map(n => (
            <div key={n.id} onClick={() => setActiveNoteId(n.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeNoteId === n.id ? 'bg-skynium-primary text-white shadow-lg shadow-skynium-primary/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}>
              <div className="flex items-center gap-2 truncate text-sm font-semibold">
                <FileText size={14} className={activeNoteId === n.id ? 'text-white' : 'text-slate-400'} /> 
                {n.title}
              </div>
              <button onClick={(e) => deleteNote(n.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded-md transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col">
        {activeNote ? (
          <>
            <header className="p-4 bg-white dark:bg-skynium-card border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors duration-500 z-0">
              <input value={activeNote.title} onChange={e => updateActiveNote('title', e.target.value)} className="bg-transparent font-black text-2xl outline-none text-slate-800 dark:text-white w-1/2 placeholder-slate-300 dark:placeholder-slate-600" placeholder="Titre..." />
              
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800/80 text-xs font-bold uppercase tracking-wider transition-all">
                {syncStatus === 'saving' && <div className="flex items-center gap-2 text-skynium-tertiary"><div className="w-2 h-2 bg-skynium-tertiary rounded-full animate-pulse"></div> Envoi...</div>}
                {syncStatus === 'synced' && <div className="flex items-center gap-2 text-green-500"><Check size={14} /> Synchronisé</div>}
                {syncStatus === 'error' && <div className="flex items-center gap-2 text-red-500"><CloudOff size={14} /> Erreur Cloud</div>}
              </div>
            </header>
            
            <div className="flex-1 flex overflow-hidden">
              <textarea 
                value={activeNote.content} 
                onChange={e => updateActiveNote('content', e.target.value)} 
                className="w-1/2 p-8 bg-white dark:bg-[#1A050A] border-r border-slate-200 dark:border-slate-800 outline-none resize-none font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300 transition-colors duration-500" 
                placeholder="Commencez à rédiger votre rapport CROUS..." 
              />
              <div className="w-1/2 p-10 prose prose-slate dark:prose-invert overflow-y-auto max-w-none prose-headings:text-skynium-primary dark:prose-headings:text-white prose-a:text-skynium-secondary transition-colors duration-500">
                <ReactMarkdown>{activeNote.content}</ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 transition-colors duration-500">
            <Layout size={64} className="mb-6 opacity-20" />
            <p className="text-xl font-medium tracking-tight">Cliquez sur une note ou créez-en une nouvelle</p>
          </div>
        )}
      </main>
    </div>
  )
}
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Book, Award, Calculator, Plus, Trash2, X, AlertCircle, CheckCircle2, TrendingUp, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

// ==========================================
// 1. CONFIGURATION CLOUD
// ==========================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = 'skynium-grades';

// ==========================================
// 2. DONNÉES DES COEFFICIENTS (Semestre 2)
// ==========================================
const S2_COEFS = {
  // Ressources
  'R201': { nom: 'R201', type: 'R', ue1: 15, ue2: 5, ue3: 5 },
  'R202': { nom: 'R202', type: 'R', ue1: 10, ue2: 0, ue3: 3 },
  'R203': { nom: 'R203', type: 'R', ue1: 13, ue2: 0, ue3: 0 },
  'R204': { nom: 'R204', type: 'R', ue1: 7, ue2: 3, ue3: 3 },
  'R205': { nom: 'R205', type: 'R', ue1: 5, ue2: 10, ue3: 0 },
  'R206': { nom: 'R206', type: 'R', ue1: 3, ue2: 7, ue3: 0 },
  'R207': { nom: 'R207', type: 'R', ue1: 1, ue2: 0, ue3: 7 },
  'R208': { nom: 'R208', type: 'R', ue1: 0, ue2: 0, ue3: 7 },
  'R209': { nom: 'R209', type: 'R', ue1: 3, ue2: 0, ue3: 8 },
  'R210': { nom: 'R210', type: 'R', ue1: 12, ue2: 4, ue3: 4 },
  'R211': { nom: 'R211', type: 'R', ue1: 6, ue2: 4, ue3: 4 },
  'R212': { nom: 'R212', type: 'R', ue1: 2, ue2: 2, ue3: 2 },
  'R213': { nom: 'R213', type: 'R', ue1: 3, ue2: 3, ue3: 6 },
  'R214': { nom: 'R214', type: 'R', ue1: 4, ue2: 9, ue3: 0 },
  // SAÉ & Portfolio
  'SAÉ201': { nom: 'SAÉ201', type: 'S', ue1: 20, ue2: 0, ue3: 0 },
  'SAÉ202': { nom: 'SAÉ202', type: 'S', ue1: 0, ue2: 20, ue3: 0 },
  'SAÉ203': { nom: 'SAÉ203', type: 'S', ue1: 0, ue2: 0, ue3: 25 },
  'SAÉ204': { nom: 'SAÉ204', type: 'S', ue1: 17, ue2: 15, ue3: 17 },
  'SAÉ205': { nom: 'SAÉ205', type: 'S', ue1: 0, ue2: 0, ue3: 0 },
  'SAÉ206': { nom: 'SAÉ206', type: 'S', ue1: 0, ue2: 0, ue3: 0 },
  'Portfolio': { nom: 'Portfolio', type: 'S', ue1: 2, ue2: 2, ue3: 2 },
};

// ==========================================
// 3. COMPOSANT PRINCIPAL
// ==========================================
export default function SkyniumGrades({ onBack }) {
  const { user, isAuthenticated } = useAuth0();
  
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États de l'interface
  const [selectedMatiere, setSelectedMatiere] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState({ R: true, S: true });

  // États du formulaire
  const [newNoteValue, setNewNoteValue] = useState('');
  const [newNoteCoef, setNewNoteCoef] = useState('1');
  const [newNoteName, setNewNoteName] = useState('');

  // SÉCURITÉ : Nettoyage de l'ID Auth0 pour la base de données
  const getSafeUserId = () => {
    if (!user || !user.sub) return 'unknown_user';
    return user.sub.replace(/\|/g, '_');
  };

  // ------------------------------------------
  // SYNCHRONISATION CLOUD (Basée sur Auth0)
  // ------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const safeUserId = getSafeUserId();
    const gradesRef = collection(db, 'artifacts', appId, 'users', safeUserId, 'grades');
    
    const unsubscribe = onSnapshot(gradesRef, (snapshot) => {
      const loadedGrades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGrades(loadedGrades);
      setLoading(false);
    }, (error) => {
      console.error("Erreur de synchronisation des notes", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthenticated]);

  // ------------------------------------------
  // ACTIONS DE BASE DE DONNÉES
  // ------------------------------------------
  const handleAddGrade = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !user || !selectedMatiere || !newNoteValue) return;

    const valueNum = parseFloat(newNoteValue.replace(',', '.'));
    const coefNum = parseFloat(newNoteCoef.replace(',', '.'));

    if (isNaN(valueNum) || valueNum < 0 || valueNum > 20 || isNaN(coefNum) || coefNum <= 0) {
      alert("Veuillez entrer une note valide (0-20) et un coefficient positif.");
      return;
    }

    const newGrade = {
      matiere: selectedMatiere,
      valeur: valueNum,
      coef: coefNum,
      nom: newNoteName || `Note ${grades.filter(g => g.matiere === selectedMatiere).length + 1}`,
      date: new Date().toISOString()
    };

    try {
      const safeUserId = getSafeUserId();
      const docId = crypto.randomUUID();
      const gradeRef = doc(db, 'artifacts', appId, 'users', safeUserId, 'grades', docId);
      
      await setDoc(gradeRef, newGrade);
      
      setNewNoteValue('');
      setNewNoteCoef('1');
      setNewNoteName('');
    } catch (err) {
      console.error("Erreur d'ajout de note:", err);
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (!isAuthenticated || !user) return;
    try {
      const safeUserId = getSafeUserId();
      await deleteDoc(doc(db, 'artifacts', appId, 'users', safeUserId, 'grades', gradeId));
    } catch (err) {
      console.error("Erreur de suppression:", err);
    }
  };

  // ------------------------------------------
  // MOTEUR DE CALCUL DES MOYENNES
  // ------------------------------------------
  const calculations = useMemo(() => {
    const matieresStats = {};
    const ueStats = { ue1: { sum: 0, coef: 0 }, ue2: { sum: 0, coef: 0 }, ue3: { sum: 0, coef: 0 } };

    Object.keys(S2_COEFS).forEach(matId => {
      const matGrades = grades.filter(g => g.matiere === matId);
      if (matGrades.length > 0) {
        const sumValues = matGrades.reduce((acc, g) => acc + (g.valeur * g.coef), 0);
        const sumCoefs = matGrades.reduce((acc, g) => acc + g.coef, 0);
        matieresStats[matId] = sumValues / sumCoefs;
      }
    });

    Object.entries(matieresStats).forEach(([matId, moyMatiere]) => {
      const coefs = S2_COEFS[matId];
      if (coefs.ue1 > 0) { ueStats.ue1.sum += moyMatiere * coefs.ue1; ueStats.ue1.coef += coefs.ue1; }
      if (coefs.ue2 > 0) { ueStats.ue2.sum += moyMatiere * coefs.ue2; ueStats.ue2.coef += coefs.ue2; }
      if (coefs.ue3 > 0) { ueStats.ue3.sum += moyMatiere * coefs.ue3; ueStats.ue3.coef += coefs.ue3; }
    });

    const moyUe1 = ueStats.ue1.coef > 0 ? ueStats.ue1.sum / ueStats.ue1.coef : null;
    const moyUe2 = ueStats.ue2.coef > 0 ? ueStats.ue2.sum / ueStats.ue2.coef : null;
    const moyUe3 = ueStats.ue3.coef > 0 ? ueStats.ue3.sum / ueStats.ue3.coef : null;

    let globalSum = 0;
    let globalCoef = 0;
    Object.entries(matieresStats).forEach(([matId, moyMatiere]) => {
      const coefs = S2_COEFS[matId];
      const coefTotal = coefs.ue1 + coefs.ue2 + coefs.ue3; 
      if (coefTotal > 0) {
        globalSum += moyMatiere * coefTotal;
        globalCoef += coefTotal;
      }
    });
    
    const moyGlobal = globalCoef > 0 ? globalSum / globalCoef : null;

    return {
      matieres: matieresStats,
      ue1: moyUe1,
      ue2: moyUe2,
      ue3: moyUe3,
      global: moyGlobal
    };
  }, [grades]);

  // ------------------------------------------
  // COMPOSANTS D'INTERFACE
  // ------------------------------------------
  const renderUeCard = (title, avg, uenum) => {
    const isValide = avg >= 10;
    
    return (
      <div className={`p-5 rounded-3xl border-2 transition-all duration-300 ${
        avg === null ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' :
        isValide ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-slate-700 dark:text-slate-300">{title}</h3>
          {avg !== null && (
            isValide ? <CheckCircle2 className="text-emerald-500" size={20}/> : <AlertCircle className="text-red-500" size={20}/>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-black ${
             avg === null ? 'text-slate-400 dark:text-slate-500' :
             isValide ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {avg !== null ? avg.toFixed(2) : '--'}
          </span>
          <span className="text-sm font-bold text-slate-400">/ 20</span>
        </div>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {avg === null ? 'Aucune note' : (isValide ? 'UE Validée' : 'UE en danger')}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#1A050A] flex flex-col items-center justify-center transition-colors">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600 mb-4"></div>
      <p className="text-indigo-600 font-bold animate-pulse">Synchronisation Skynium Cloud...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#1A050A] text-slate-800 dark:text-white font-sans pb-20 transition-colors">
      
      {/* HEADER / HERO SECTION */}
      <div className="bg-indigo-600 dark:bg-[#2A0813] text-white pt-8 pb-24 px-4 rounded-b-[3rem] shadow-xl relative border-b border-indigo-700 dark:border-[#4A1823]">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex justify-between items-center mb-8">
            <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm">
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Cloud Actif ({user?.nickname})
            </div>
          </div>

          <div className="text-center mt-2">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <Calculator size={32} />
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-6">Skynium Grades</h1>
            <p className="text-indigo-200 dark:text-slate-400 font-semibold uppercase tracking-widest mb-2 text-sm">Semestre 2 • Moyenne Générale</p>
            <div className="flex justify-center items-baseline gap-2">
              <span className="text-7xl font-black tracking-tighter">
                {calculations.global !== null ? calculations.global.toFixed(2) : '--'}
              </span>
              <span className="text-2xl font-bold text-indigo-300 dark:text-slate-500">/ 20</span>
            </div>
            {calculations.global !== null && (
              <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full font-bold text-sm ${calculations.global >= 10 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {calculations.global >= 10 ? <TrendingUp size={16}/> : <AlertCircle size={16}/>}
                {calculations.global >= 10 ? 'Semestre validé pour le moment' : 'Semestre non validé'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-10">
        
        {/* CARTES UE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {renderUeCard("UE 1.1 : Gérer", calculations.ue1, 1)}
          {renderUeCard("UE 1.2 : Répondre", calculations.ue2, 2)}
          {renderUeCard("UE 1.3 : Connecter", calculations.ue3, 3)}
        </div>

        {/* LISTE DES MATIÈRES */}
        <div className="bg-white dark:bg-[#2A0813] rounded-3xl shadow-sm border border-slate-200 dark:border-[#4A1823] overflow-hidden mb-8 transition-colors">
          
          <div className="border-b border-slate-100 dark:border-[#4A1823]">
            <button 
              onClick={() => setExpandedSection(prev => ({...prev, R: !prev.R}))}
              className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-[#1A050A]/50 hover:bg-slate-100 dark:hover:bg-[#1A050A] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Book className="text-indigo-500 dark:text-indigo-400" size={24}/>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Ressources (R2xx)</h2>
              </div>
              {expandedSection.R ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
            </button>
            
            {expandedSection.R && (
              <div className="divide-y divide-slate-100 dark:divide-[#4A1823] p-2">
                {Object.entries(S2_COEFS).filter(([_, data]) => data.type === 'R').map(([matId, data]) => {
                  const avg = calculations.matieres[matId];
                  const gradeCount = grades.filter(g => g.matiere === matId).length;
                  return (
                    <div key={matId} onClick={() => { setSelectedMatiere(matId); setIsModalOpen(true); }} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#1A050A]/80 rounded-2xl cursor-pointer transition-colors group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{matId}</span>
                          {gradeCount > 0 && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">{gradeCount} note{gradeCount > 1 ? 's' : ''}</span>}
                        </div>
                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex gap-2">
                          {data.ue1 > 0 && <span>UE1: {data.ue1}</span>}
                          {data.ue2 > 0 && <span>UE2: {data.ue2}</span>}
                          {data.ue3 > 0 && <span>UE3: {data.ue3}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-black text-lg ${avg === null ? 'text-slate-300 dark:text-slate-600' : avg >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {avg !== null ? avg.toFixed(2) : '-'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <button 
              onClick={() => setExpandedSection(prev => ({...prev, S: !prev.S}))}
              className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-[#1A050A]/50 hover:bg-slate-100 dark:hover:bg-[#1A050A] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Award className="text-amber-500" size={24}/>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">SAÉ & Portfolio</h2>
              </div>
              {expandedSection.S ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
            </button>
            
            {expandedSection.S && (
              <div className="divide-y divide-slate-100 dark:divide-[#4A1823] p-2">
                {Object.entries(S2_COEFS).filter(([_, data]) => data.type === 'S').map(([matId, data]) => {
                  const avg = calculations.matieres[matId];
                  const gradeCount = grades.filter(g => g.matiere === matId).length;
                  return (
                    <div key={matId} onClick={() => { setSelectedMatiere(matId); setIsModalOpen(true); }} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#1A050A]/80 rounded-2xl cursor-pointer transition-colors group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{matId}</span>
                          {gradeCount > 0 && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">{gradeCount} note{gradeCount > 1 ? 's' : ''}</span>}
                        </div>
                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex gap-2">
                          {data.ue1 > 0 && <span>UE1: {data.ue1}</span>}
                          {data.ue2 > 0 && <span>UE2: {data.ue2}</span>}
                          {data.ue3 > 0 && <span>UE3: {data.ue3}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-black text-lg ${avg === null ? 'text-slate-300 dark:text-slate-600' : avg >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {avg !== null ? avg.toFixed(2) : '-'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL AJOUT/EDITION DE NOTES */}
      {isModalOpen && selectedMatiere && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2A0813] rounded-[2rem] w-full max-w-lg shadow-2xl border dark:border-[#4A1823] overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#4A1823] bg-slate-50 dark:bg-[#1A050A]">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{selectedMatiere}</h3>
                <p className="text-sm font-semibold text-slate-500">Moyenne: {calculations.matieres[selectedMatiere] !== undefined ? calculations.matieres[selectedMatiere].toFixed(2) : '--'} / 20</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white dark:bg-[#2A0813] rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm border border-transparent dark:border-[#4A1823] transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddGrade} className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-5 rounded-2xl mb-8">
                <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Plus size={16} /> Ajouter une note
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-indigo-400 dark:text-indigo-500 mb-1 uppercase">Note /20</label>
                    <input type="number" step="0.01" min="0" max="20" required value={newNoteValue} onChange={e => setNewNoteValue(e.target.value)} className="w-full bg-white dark:bg-[#1A050A] border border-indigo-200 dark:border-indigo-900/50 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="15.5"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-400 dark:text-indigo-500 mb-1 uppercase">Coefficient</label>
                    <input type="number" step="0.1" min="0.1" required value={newNoteCoef} onChange={e => setNewNoteCoef(e.target.value)} className="w-full bg-white dark:bg-[#1A050A] border border-indigo-200 dark:border-indigo-900/50 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-indigo-400 dark:text-indigo-500 mb-1 uppercase">Titre (Optionnel)</label>
                  <input type="text" value={newNoteName} onChange={e => setNewNoteName(e.target.value)} className="w-full bg-white dark:bg-[#1A050A] border border-indigo-200 dark:border-indigo-900/50 rounded-xl px-4 py-3 font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ex: DS 1, Rendu Final..."/>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
                  Enregistrer la note
                </button>
              </form>

              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">Notes enregistrées</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {grades.filter(g => g.matiere === selectedMatiere).length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">Aucune note pour le moment.</p>
                  ) : (
                    grades.filter(g => g.matiere === selectedMatiere).sort((a,b) => new Date(b.date) - new Date(a.date)).map(grade => (
                      <div key={grade.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#1A050A] border border-slate-100 dark:border-[#4A1823] rounded-xl shadow-sm group">
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200">{grade.nom}</p>
                          <p className="text-xs font-semibold text-slate-400">Coef: {grade.coef}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg ${grade.valeur >= 10 ? 'text-emerald-500' : 'text-red-500'}`}>{grade.valeur}</span>
                          <button onClick={() => handleDeleteGrade(grade.id)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
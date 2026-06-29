import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useObraData } from './hooks/useObraData';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hammer, 
  LayoutDashboard, 
  Briefcase, 
  DollarSign, 
  ShoppingBag, 
  Coins, 
  Store, 
  Sparkles, 
  LogOut, 
  Menu, 
  X, 
  MapPin, 
  ChevronRight, 
  HardHat,
  Loader2
} from 'lucide-react';

// Components
import AuthScreen from './components/AuthScreen';
import DashboardView from './components/DashboardView';
import ObrasView from './components/ObrasView';
import FinanceiroView from './components/FinanceiroView';
import MateriaisView from './components/MateriaisView';
import MaoObraView from './components/MaoObraView';
import ComparacaoView from './components/ComparacaoView';
import AIChatView from './components/AIChatView';

type TabType = 'dashboard' | 'obras' | 'financeiro' | 'materiais' | 'maoObra' | 'comparador' | 'iaChat';

export default function App() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all Firestore live bindings
  const data = useObraData(user ? user.uid : null);
  const {
    obras,
    selectedObraId,
    setSelectedObraId,
    entradas,
    saidas,
    maoObra,
    materiais,
    comparacoes,
    loading: dataLoading,
    addObra,
    updateObra,
    deleteObra,
    addEntrada,
    updateEntrada,
    deleteEntrada,
    addSaida,
    updateSaida,
    deleteSaida,
    addMaoObra,
    updateMaoObra,
    deleteMaoObra,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addComparacao,
    deleteComparacao,
    bootstrapSampleProject
  } = data;

  // Active Selected Project object
  const activeObra = obras.find(o => o.id === selectedObraId) || null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Callback to bypass or set demo user directly
  const handleAuthSuccess = (userId: string, email: string, displayName?: string) => {
    setUser({ uid: userId, email, displayName });
  };

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    setBootstrapError(null);
    try {
      await bootstrapSampleProject();
    } catch (err: any) {
      console.error("Error bootstrapping project:", err);
      setBootstrapError(err?.message || 'Erro ao carregar dados de simulação. Verifique sua conexão e banco de dados.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-[#E4E6EB] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#F27D26] animate-spin" />
        <p className="text-xs font-semibold tracking-wider uppercase text-[#9BA1B1]">Iniciando ObraControl...</p>
      </div>
    );
  }

  // Auth Screen if not logged in
  if (!user) {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
  }

  // Main UI render after login
  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E4E6EB] flex overflow-hidden">
      
      {/* 1. Left Sidebar (Hidden on mobile unless toggled) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#16191F] border-r border-[#2D323D] flex flex-col justify-between transition-transform duration-300 ease-in-out
        md:static md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand header */}
          <div className="p-6 border-b border-[#2D323D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#F27D26]/10 p-2 rounded-xl text-[#F27D26]">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-[#E4E6EB] text-base font-sans tracking-tight">ObraControl</span>
                <span className="block text-[9px] font-mono text-[#9BA1B1]/60 tracking-widest uppercase">Financeiro</span>
              </div>
            </div>
            
            {/* Close mobile menu */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 text-[#9BA1B1] hover:text-[#E4E6EB]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active project context selector card */}
          <div className="p-4 border-b border-[#2D323D] bg-[#0F1115]/30">
            <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase tracking-wider">
              Obra Ativa
            </label>
            {obras.length > 0 ? (
              <select
                value={selectedObraId || ''}
                onChange={(e) => setSelectedObraId(e.target.value || null)}
                className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] font-semibold focus:outline-none focus:border-[#F27D26] cursor-pointer"
              >
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-center py-2 bg-[#0F1115] border border-[#2D323D] border-dashed rounded-lg">
                <button
                  onClick={() => {
                    setActiveTab('obras');
                    setMobileMenuOpen(false);
                  }}
                  className="text-[10px] text-[#F27D26] font-bold hover:underline"
                >
                  + Cadastrar Obra
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border-l-4 border-[#F27D26]' 
                  : 'text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#1C2129]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Painel Geral</span>
            </button>

            <button
              onClick={() => { setActiveTab('obras'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'obras' 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border-l-4 border-[#F27D26]' 
                  : 'text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#1C2129]'
              }`}
            >
              <Briefcase className="w-4 h-4 shrink-0" />
              <span>Minhas Obras</span>
            </button>

            <button
              onClick={() => { setActiveTab('financeiro'); setMobileMenuOpen(false); }}
              disabled={!activeObra}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer ${
                activeTab === 'financeiro' 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border-l-4 border-[#F27D26]' 
                  : 'text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#1C2129]'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Fluxo de Caixa</span>
            </button>

            <button
              onClick={() => { setActiveTab('materiais'); setMobileMenuOpen(false); }}
              disabled={!activeObra}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer ${
                activeTab === 'materiais' 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border-l-4 border-[#F27D26]' 
                  : 'text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#1C2129]'
              }`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Materiais</span>
            </button>

            <button
              onClick={() => { setActiveTab('maoObra'); setMobileMenuOpen(false); }}
              disabled={!activeObra}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer ${
                activeTab === 'maoObra' 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border-l-4 border-[#F27D26]' 
                  : 'text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#1C2129]'
              }`}
            >
              <Coins className="w-4 h-4 shrink-0" />
              <span>Mão de Obra</span>
            </button>

            <button
              onClick={() => { setActiveTab('comparador'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'comparador' 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border-l-4 border-[#F27D26]' 
                  : 'text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#1C2129]'
              }`}
            >
              <Store className="w-4 h-4 shrink-0" />
              <span>Comparador</span>
            </button>

            <button
              onClick={() => { setActiveTab('iaChat'); setMobileMenuOpen(false); }}
              disabled={!activeObra}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer ${
                activeTab === 'iaChat' 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border-l-4 border-[#F27D26]' 
                  : 'text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#1C2129]'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 text-[#F27D26]" />
              <span className="flex items-center gap-1.5">
                Assistente IA
              </span>
            </button>
          </nav>
        </div>

        {/* Profile Card / Footer info */}
        <div className="p-4 border-t border-[#2D323D] bg-[#101318] flex items-center justify-between">
          <div className="truncate pr-2">
            <span className="block text-xs font-bold text-[#E4E6EB] truncate">
              {user.displayName || 'Proprietário'}
            </span>
            <span className="block text-[10px] text-[#9BA1B1] truncate">
              {user.email}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-[#1C2129] hover:bg-[#ef4444]/10 text-[#9BA1B1] hover:text-[#ef4444] rounded-lg transition-colors cursor-pointer"
            title="Sair do aplicativo"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      {/* 2. Main Container Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0F1115]">
        
        {/* Top Header */}
        <header className="h-16 border-b border-[#2D323D] bg-[#16191F] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* Hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 bg-[#1C2129] text-[#9BA1B1] hover:text-[#E4E6EB] rounded-lg border border-[#2D323D]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Selected Project Quick details */}
            {activeObra ? (
              <div className="flex items-center gap-2 text-xs truncate">
                <span className="font-bold text-[#E4E6EB] tracking-tight">{activeObra.nome}</span>
                <span className="text-[#9BA1B1] hidden sm:inline">•</span>
                <span className="text-[#9BA1B1] hidden sm:flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {activeObra.endereco}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-[#9BA1B1]">Nenhuma obra cadastrada</span>
            )}
          </div>

          {/* Quick AI Trigger icon */}
          {activeObra && activeTab !== 'iaChat' && (
            <button
              onClick={() => setActiveTab('iaChat')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/20 hover:border-[#F27D26]/40 text-[#F27D26] rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chamar IA</span>
            </button>
          )}
        </header>

        {/* Dynamic content window */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* Data loader backdrop */}
          {dataLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#F27D26] animate-spin" />
                <p className="text-xs text-[#9BA1B1]">Sincronizando dados...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {/* 1. Dashboard Tab */}
                {activeTab === 'dashboard' && (
                  activeObra ? (
                    <DashboardView
                      obra={activeObra}
                      entradas={entradas}
                      saidas={saidas}
                      maoObra={maoObra}
                      materiais={materiais}
                    />
                  ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-center bg-[#1C2129] p-8 rounded-2xl border border-[#2D323D]">
                      {isBootstrapping ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-10 h-10 text-[#F27D26] animate-spin" />
                          <h3 className="font-bold text-[#E4E6EB]">Construindo Ambiente de Simulação...</h3>
                          <p className="text-xs text-[#9BA1B1] max-w-sm">
                            Criando obra modelo, aportes financeiros, compras de materiais e contratações de equipes. Isso levará apenas alguns segundos.
                          </p>
                        </div>
                      ) : (
                        <>
                          <Briefcase className="w-12 h-12 text-[#2D323D] mb-4" />
                          <h3 className="font-bold text-[#E4E6EB]">Bem-vindo ao ObraControl!</h3>
                          <p className="text-xs text-[#9BA1B1] mt-2 max-w-sm">
                            Para começar a gerenciar finanças de construção, você precisa criar seu primeiro projeto ou carregar uma simulação.
                          </p>
                          
                          {bootstrapError && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs max-w-sm">
                              {bootstrapError}
                            </div>
                          )}

                          <div className="mt-6 flex gap-4">
                            <button
                              onClick={handleBootstrap}
                              className="px-4 py-2 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/20 hover:border-[#F27D26]/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Carregar Projeto Demo (Rápido)
                            </button>
                            <button
                              onClick={() => setActiveTab('obras')}
                              className="px-4 py-2 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Criar Nova Obra
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                )}

                {/* 2. Obras Tab */}
                {activeTab === 'obras' && (
                  <ObrasView
                    obras={obras}
                    selectedObraId={selectedObraId}
                    setSelectedObraId={setSelectedObraId}
                    onAddObra={addObra}
                    onUpdateObra={updateObra}
                    onDeleteObra={deleteObra}
                    onBootstrap={handleBootstrap}
                  />
                )}

                {/* 3. Financeiro Tab */}
                {activeTab === 'financeiro' && activeObra && (
                  <FinanceiroView
                    obra={activeObra}
                    entradas={entradas}
                    saidas={saidas}
                    onAddEntrada={addEntrada}
                    onUpdateEntrada={updateEntrada}
                    onDeleteEntrada={deleteEntrada}
                    onAddSaida={addSaida}
                    onUpdateSaida={updateSaida}
                    onDeleteSaida={deleteSaida}
                  />
                )}

                {/* 4. Materiais Tab */}
                {activeTab === 'materiais' && activeObra && (
                  <MateriaisView
                    obra={activeObra}
                    materiais={materiais}
                    onAddMaterial={addMaterial}
                    onUpdateMaterial={updateMaterial}
                    onDeleteMaterial={deleteMaterial}
                  />
                )}

                {/* 5. Mão de Obra Tab */}
                {activeTab === 'maoObra' && activeObra && (
                  <MaoObraView
                    obra={activeObra}
                    maoObra={maoObra}
                    onAddMaoObra={addMaoObra}
                    onUpdateMaoObra={updateMaoObra}
                    onDeleteMaoObra={deleteMaoObra}
                  />
                )}

                {/* 6. Comparador Tab */}
                {activeTab === 'comparador' && (
                  <ComparacaoView
                    comparacoes={comparacoes}
                    onAddComparacao={addComparacao}
                    onDeleteComparacao={deleteComparacao}
                  />
                )}

                {/* 7. IA Chat Tab */}
                {activeTab === 'iaChat' && activeObra && (
                  <AIChatView
                    obra={activeObra}
                    entradas={entradas}
                    saidas={saidas}
                    maoObra={maoObra}
                    materiais={materiais}
                  />
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  TrendingDown, 
  Store, 
  Tag, 
  Calendar, 
  Coins, 
  AlertCircle,
  Award,
  Sparkles,
  Calculator,
  ShieldCheck,
  Scale,
  PlusCircle,
  Info,
  Layers,
  Check,
  TrendingUp
} from 'lucide-react';
import { Obra, ComparacaoPreco, UNIDADES, CATEGORIAS_MATERIAIS } from '../types';

interface ComparacaoViewProps {
  obra?: Obra;
  comparacoes: ComparacaoPreco[];
  onAddComparacao: (data: any) => Promise<any>;
  onDeleteComparacao: (id: string) => Promise<any>;
}

interface SimMaterialItem {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

interface SimFornecedor {
  id: string;
  nome: string;
}

interface SimPrecos {
  [itemId: string]: {
    [fornecedorId: string]: number; // Unit price
  };
}

export default function ComparacaoView({
  obra,
  comparacoes,
  onAddComparacao,
  onDeleteComparacao
}: ComparacaoViewProps) {
  // Navigation between Individual Quotes & Supplier shopping list simulator
  const [activeSubTab, setActiveSubTab] = useState<'individuais' | 'simulador'>('individuais');

  // ==========================================
  // STATE & LOGIC: INDIVIDUAL QUOTES (EXISTING)
  // ==========================================
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [material, setMaterial] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loja, setLoja] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setMaterial('');
    setCategoria('');
    setLoja('');
    setValor('');
    setData(new Date().toISOString().split('T')[0]);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material || !loja || !valor || !categoria) return;

    setLoading(true);
    try {
      await onAddComparacao({
        material: material.trim(),
        categoria: categoria,
        loja: loja.trim(),
        valor: Number(valor),
        data: new Date().toISOString().split('T')[0]
      });
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group quotes by material name
  const groupedQuotes: Record<string, ComparacaoPreco[]> = useMemo(() => {
    const groups: { [key: string]: ComparacaoPreco[] } = {};
    
    comparacoes.forEach(q => {
      const matKey = q.material.trim().toLowerCase();
      const existingKey = Object.keys(groups).find(k => k.toLowerCase() === matKey);
      if (existingKey) {
        groups[existingKey].push(q);
      } else {
        groups[q.material] = [q];
      }
    });

    // Sort quotes inside each group by price ascending (cheapest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.valor - b.valor);
    });

    return groups;
  }, [comparacoes]);

  // Total unique materials compared
  const uniqueMaterialsCount = useMemo(() => {
    return Object.keys(groupedQuotes).length;
  }, [groupedQuotes]);

  // Filter groups based on search term
  const filteredGroupedQuotes = useMemo(() => {
    if (!searchTerm) return groupedQuotes;
    
    const query = searchTerm.toLowerCase();
    const result: { [key: string]: ComparacaoPreco[] } = {};
    
    Object.entries(groupedQuotes).forEach(([matName, quotes]) => {
      if (
        matName.toLowerCase().includes(query) || 
        quotes.some(q => q.loja.toLowerCase().includes(query)) ||
        quotes.some(q => q.categoria?.toLowerCase().includes(query))
      ) {
        result[matName] = quotes;
      }
    });
    
    return result;
  }, [groupedQuotes, searchTerm]);


  // ==========================================
  // STATE & LOGIC: BUDGET MULTI-SUPPLIER SIMULATOR (NEW FEATURE)
  // ==========================================
  const storageKey = obra ? `obra_simulador_${obra.id}` : 'obra_simulador_default';

  // Load state lazily or with default helpful mock items
  const [simItems, setSimItems] = useState<SimMaterialItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_items`);
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return [
      { id: '1', nome: 'Cimento Votoran CP II 50kg', quantidade: 30, unidade: 'saco' },
      { id: '2', nome: 'Areia Média Lavada', quantidade: 6, unidade: 'm³' },
      { id: '3', nome: 'Aço CA-50 10mm (3/8)', quantidade: 12, unidade: 'barra' },
      { id: '4', nome: 'Tijolo Cerâmico 9x19x19', quantidade: 1500, unidade: 'unidade' },
    ];
  });

  const [simSuppliers, setSimSuppliers] = useState<SimFornecedor[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_suppliers`);
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return [
      { id: 's1', nome: 'Depósito Silva' },
      { id: 's2', nome: 'Ferragens Constrular' },
      { id: 's3', nome: 'Supermercado da Construção' },
    ];
  });

  const [simPrices, setSimPrices] = useState<SimPrecos>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_prices`);
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return {
      '1': { 's1': 39.50, 's2': 41.00, 's3': 38.90 },
      '2': { 's1': 110.00, 's2': 105.00, 's3': 115.00 },
      '3': { 's1': 62.00, 's2': 59.90, 's3': 64.50 },
      '4': { 's1': 1.10, 's2': 1.25, 's3': 1.15 },
    };
  });

  // Keep saved configurations in sync with local storage
  React.useEffect(() => {
    localStorage.setItem(`${storageKey}_items`, JSON.stringify(simItems));
  }, [simItems, storageKey]);

  React.useEffect(() => {
    localStorage.setItem(`${storageKey}_suppliers`, JSON.stringify(simSuppliers));
  }, [simSuppliers, storageKey]);

  React.useEffect(() => {
    localStorage.setItem(`${storageKey}_prices`, JSON.stringify(simPrices));
  }, [simPrices, storageKey]);

  // Load specific data when switching projects
  React.useEffect(() => {
    try {
      const savedItems = localStorage.getItem(`${storageKey}_items`);
      const savedSuppliers = localStorage.getItem(`${storageKey}_suppliers`);
      const savedPrices = localStorage.getItem(`${storageKey}_prices`);

      if (savedItems) {
        setSimItems(JSON.parse(savedItems));
      } else {
        setSimItems([
          { id: '1', nome: 'Cimento Votoran CP II 50kg', quantidade: 30, unidade: 'saco' },
          { id: '2', nome: 'Areia Média Lavada', quantidade: 6, unidade: 'm³' },
          { id: '3', nome: 'Aço CA-50 10mm (3/8)', quantidade: 12, unidade: 'barra' },
          { id: '4', nome: 'Tijolo Cerâmico 9x19x19', quantidade: 1500, unidade: 'unidade' },
        ]);
      }

      if (savedSuppliers) {
        setSimSuppliers(JSON.parse(savedSuppliers));
      } else {
        setSimSuppliers([
          { id: 's1', nome: 'Depósito Silva' },
          { id: 's2', nome: 'Ferragens Constrular' },
          { id: 's3', nome: 'Supermercado da Construção' },
        ]);
      }

      if (savedPrices) {
        setSimPrices(JSON.parse(savedPrices));
      } else {
        setSimPrices({
          '1': { 's1': 39.50, 's2': 41.00, 's3': 38.90 },
          '2': { 's1': 110.00, 's2': 105.00, 's3': 115.00 },
          '3': { 's1': 62.00, 's2': 59.90, 's3': 64.50 },
          '4': { 's1': 1.10, 's2': 1.25, 's3': 1.15 },
        });
      }
    } catch (e) {
      console.error('Erro ao alternar o banco do simulador para a obra selecionada.', e);
    }
  }, [storageKey]);

  // Inputs for adding simulated item
  const [newSimItemNome, setNewSimItemNome] = useState('');
  const [newSimItemQtd, setNewSimItemQtd] = useState('');
  const [newSimItemUnidade, setNewSimItemUnidade] = useState<string>('unidade');

  // Inputs for adding simulated supplier
  const [newSimSupNome, setNewSimSupNome] = useState('');

  // Handle Add simulated item
  const handleAddSimItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimItemNome || !newSimItemQtd || Number(newSimItemQtd) <= 0) return;
    
    const newItem: SimMaterialItem = {
      id: Date.now().toString(),
      nome: newSimItemNome.trim(),
      quantidade: Number(newSimItemQtd),
      unidade: newSimItemUnidade
    };

    setSimItems(prev => [...prev, newItem]);
    setNewSimItemNome('');
    setNewSimItemQtd('');
    setNewSimItemUnidade('unidade');
  };

  // Handle Add simulated supplier
  const handleAddSimSup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimSupNome) return;

    const newSup: SimFornecedor = {
      id: 's_' + Date.now().toString(),
      nome: newSimSupNome.trim()
    };

    setSimSuppliers(prev => [...prev, newSup]);
    setNewSimSupNome('');
  };

  // Delete simulated item
  const handleDeleteSimItem = (itemId: string) => {
    setSimItems(prev => prev.filter(item => item.id !== itemId));
    setSimPrices(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  // Delete simulated supplier
  const handleDeleteSimSup = (supId: string) => {
    setSimSuppliers(prev => prev.filter(sup => sup.id !== supId));
    setSimPrices(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(itemId => {
        const itemPrices = { ...updated[itemId] };
        delete itemPrices[supId];
        updated[itemId] = itemPrices;
      });
      return updated;
    });
  };

  // Helper to determine the cheapest supplier for a single item
  const getCheapestSupplierForItem = (itemId: string) => {
    const itemPrices = (simPrices[itemId] || {}) as Record<string, number>;
    let minPrice = Infinity;
    let cheapestSupId = '';

    Object.entries(itemPrices).forEach(([supId, price]) => {
      const p = price as number;
      if (p > 0 && p < minPrice) {
        minPrice = p;
        cheapestSupId = supId;
      }
    });

    return { supId: cheapestSupId, value: minPrice === Infinity ? 0 : minPrice };
  };

  // Compute stats for multi-supplier comparison matrix
  const supplierTotalsAndStats = useMemo(() => {
    const stats: { 
      [supId: string]: { 
        total: number; 
        itemCount: number; 
        fullyQuoted: boolean; 
      } 
    } = {};

    simSuppliers.forEach(sup => {
      let total = 0;
      let count = 0;

      simItems.forEach(item => {
        const price = simPrices[item.id]?.[sup.id] || 0;
        if (price > 0) {
          total += price * item.quantidade;
          count++;
        }
      });

      stats[sup.id] = {
        total,
        itemCount: count,
        fullyQuoted: count === simItems.length && simItems.length > 0
      };
    });

    return stats;
  }, [simItems, simSuppliers, simPrices]);

  // Determine cheapest supplier for a fully central purchase
  const cheapestOverallSupplier = useMemo(() => {
    let bestSupId = '';
    let minTotal = Infinity;

    Object.entries(supplierTotalsAndStats).forEach(([supId, data]) => {
      const stats = data as { total: number; itemCount: number; fullyQuoted: boolean };
      // Must be fully quoted or at least have some items quoted to consider
      if (stats.total > 0 && stats.total < minTotal && stats.fullyQuoted) {
        minTotal = stats.total;
        bestSupId = supId;
      }
    });

    // Fallback to highest quote count if none is 100% fully quoted
    if (!bestSupId) {
      let maxCount = -1;
      Object.entries(supplierTotalsAndStats).forEach(([supId, data]) => {
        const stats = data as { total: number; itemCount: number; fullyQuoted: boolean };
        if (stats.total > 0 && stats.itemCount > maxCount) {
          maxCount = stats.itemCount;
          minTotal = stats.total;
          bestSupId = supId;
        }
      });
    }

    return {
      supId: bestSupId,
      nome: simSuppliers.find(s => s.id === bestSupId)?.nome || '',
      total: minTotal === Infinity ? 0 : minTotal
    };
  }, [supplierTotalsAndStats, simSuppliers]);

  // Compute split purchase total (buying each item from its absolute cheapest source)
  const splitPurchaseTotal = useMemo(() => {
    let total = 0;
    let allItemsHavePrice = true;

    simItems.forEach(item => {
      const cheapest = getCheapestSupplierForItem(item.id);
      if (cheapest.value > 0) {
        total += cheapest.value * item.quantidade;
      } else {
        allItemsHavePrice = false;
      }
    });

    return {
      total,
      complete: allItemsHavePrice && simItems.length > 0
    };
  }, [simItems, simPrices]);

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E4E6EB] font-sans tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#F27D26]" />
            Comparador & Simulador de Preços
          </h2>
          <p className="text-xs text-[#9BA1B1] mt-1">
            Compare preços de lojas, monte listas de orçamento simuladas e descubra onde economizar mais.
          </p>
        </div>

        {/* Sub-tab Toggle */}
        <div className="flex bg-[#13171F] p-1.5 rounded-xl border border-[#2D323D] shrink-0">
          <button
            onClick={() => setActiveSubTab('simulador')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'simulador'
                ? 'bg-[#F27D26] text-white shadow-sm'
                : 'text-[#9BA1B1] hover:text-[#E4E6EB]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Simulador de Orçamento
          </button>
          <button
            onClick={() => setActiveSubTab('individuais')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'individuais'
                ? 'bg-[#F27D26] text-white shadow-sm'
                : 'text-[#9BA1B1] hover:text-[#E4E6EB]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Cotações Avulsas
          </button>
        </div>
      </div>

      {/* Main Container */}
      {activeSubTab === 'simulador' ? (
        // ==========================================
        // RENDER: BUDGET MULTI-SUPPLIER SIMULATOR (NEW)
        // ==========================================
        <div className="space-y-6">
          
          {/* Sandbox Info Banner */}
          <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Ambiente de Simulação Ativo (Sandbox)
              </h4>
              <p className="text-[11px] text-[#9BA1B1] mt-1">
                As listas e preços inseridos nesta tela servem para comparar comércios e simular orçamentos. 
                <span className="text-[#E4E6EB] font-semibold"> Nenhum valor aqui lançado afetará o caixa, saldo ou despesas oficiais da obra</span>. Fique à vontade para planejar!
              </p>
            </div>
          </div>

          {/* Quick Stats banner for Simulation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Stat 1: Best central store */}
            <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3.5">
              <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-lg shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Compra Centralizada</p>
                <h3 className="text-sm font-bold text-[#E4E6EB] mt-0.5">
                  {cheapestOverallSupplier.nome ? cheapestOverallSupplier.nome : 'Sem cotações'}
                </h3>
                <p className="text-[9px] text-[#9BA1B1] mt-0.5">
                  {cheapestOverallSupplier.total > 0 
                    ? `Total: R$ ${cheapestOverallSupplier.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : 'Insira preços para calcular'}
                </p>
              </div>
            </div>

            {/* Stat 2: Split optimized purchase */}
            <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Compra Fracionada (Otimizada)</p>
                <h3 className="text-sm font-bold text-emerald-400 mt-0.5">
                  {splitPurchaseTotal.total > 0 
                    ? `R$ ${splitPurchaseTotal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : 'Sem cotações'}
                </h3>
                <p className="text-[9px] text-[#9BA1B1] mt-0.5">
                  {splitPurchaseTotal.total > 0 
                    ? 'Comprando cada item no fornecedor mais barato!'
                    : 'Adicione preços para otimizar'}
                </p>
              </div>
            </div>

            {/* Stat 3: Potencial Savings */}
            <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3.5">
              <div className="p-2.5 bg-[#F27D26]/10 text-[#F27D26] rounded-lg shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Economia Estimada</p>
                <h3 className="text-sm font-bold text-[#F27D26] mt-0.5">
                  {cheapestOverallSupplier.total > 0 && splitPurchaseTotal.total > 0 && cheapestOverallSupplier.total > splitPurchaseTotal.total
                    ? `Economize R$ ${(cheapestOverallSupplier.total - splitPurchaseTotal.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Cote vários depósitos'}
                </h3>
                <p className="text-[9px] text-[#9BA1B1] mt-0.5">
                  {cheapestOverallSupplier.total > splitPurchaseTotal.total 
                    ? 'Ao dividir as compras entre as lojas mais baratas!'
                    : 'Compare os preços abaixo'}
                </p>
              </div>
            </div>

          </div>

          {/* Setup Panel: Add Items & Add Suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Box 1: Add Material Item (col-span-7) */}
            <div className="lg:col-span-7 bg-[#1C2129] p-5 rounded-2xl border border-[#2D323D] space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-[#E4E6EB] uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-[#F27D26]" />
                1. Adicionar Material à Lista de Orçamento
              </h3>

              <form onSubmit={handleAddSimItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[9px] font-bold text-[#9BA1B1] uppercase mb-1">Nome do Material</label>
                  <input
                    type="text"
                    required
                    value={newSimItemNome}
                    onChange={(e) => setNewSimItemNome(e.target.value)}
                    placeholder="Ex: Cimento CP II, Tijolo 8f"
                    className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[9px] font-bold text-[#9BA1B1] uppercase mb-1">Qtd.</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSimItemQtd}
                    onChange={(e) => setNewSimItemQtd(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[9px] font-bold text-[#9BA1B1] uppercase mb-1">Unidade</label>
                  <select
                    value={newSimItemUnidade}
                    onChange={(e) => setNewSimItemUnidade(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                  >
                    {UNIDADES.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-12 flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Item
                  </button>
                </div>
              </form>
            </div>

            {/* Box 2: Add Store/Supplier (col-span-5) */}
            <div className="lg:col-span-5 bg-[#1C2129] p-5 rounded-2xl border border-[#2D323D] space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-[#E4E6EB] uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-400" />
                2. Adicionar Fornecedor / Loja
              </h3>

              <form onSubmit={handleAddSimSup} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-[#9BA1B1] uppercase mb-1">Nome da Loja / Depósito</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newSimSupNome}
                      onChange={(e) => setNewSimSupNome(e.target.value)}
                      placeholder="Ex: Comercial Silva, Leroy"
                      className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                      title="Adicionar fornecedor"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            </div>

          </div>

          {/* Matrix / Spreadsheet table */}
          <div className="bg-[#1C2129] rounded-2xl border border-[#2D323D] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#2D323D] bg-[#16191F]/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#E4E6EB] flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Planilha de Cotação Comparativa
                </h3>
                <p className="text-[10px] text-[#9BA1B1] mt-0.5">
                  Digite o valor unitário cobrado por cada comércio. O sistema recalcula os totais automaticamente.
                </p>
              </div>
            </div>

            {simItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-[#0F1115] text-[#9BA1B1] text-[10px] font-bold uppercase tracking-wider border-b border-[#2D323D]">
                      <th className="py-4 px-5">Material (Qtd)</th>
                      
                      {simSuppliers.map((sup) => {
                        const stats = supplierTotalsAndStats[sup.id];
                        const isCheapestCentral = cheapestOverallSupplier.supId === sup.id && cheapestOverallSupplier.total > 0;
                        
                        return (
                          <th key={sup.id} className="py-4 px-4 text-center border-l border-[#2D323D]/50 relative group min-w-[140px]">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="text-[#E4E6EB] truncate max-w-[120px]">{sup.nome}</span>
                              <span className="text-[9px] text-[#9BA1B1] normal-case">
                                ({stats?.itemCount || 0}/{simItems.length} cotados)
                              </span>
                              {isCheapestCentral && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-[8px] font-bold">
                                  Mais em Conta 🏆
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteSimSup(sup.id)}
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-[#9BA1B1] hover:text-rose-500 p-1 rounded transition-opacity cursor-pointer"
                                title={`Excluir fornecedor ${sup.nome}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </th>
                        );
                      })}

                      <th className="py-4 px-4 text-right min-w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-[#2D323D]/50 text-xs text-[#E4E6EB]">
                    {simItems.map((item) => {
                      const cheapest = getCheapestSupplierForItem(item.id);

                      return (
                        <tr key={item.id} className="hover:bg-[#151921] transition-colors">
                          {/* Item description */}
                          <td className="py-4 px-5">
                            <div className="font-semibold text-[#E4E6EB]">{item.nome}</div>
                            <div className="text-[10px] text-[#9BA1B1] mt-0.5">
                              {item.quantidade} {item.unidade}{item.quantidade > 1 ? 's' : ''}
                            </div>
                          </td>

                          {/* Suppliers pricing cells */}
                          {simSuppliers.map((sup) => {
                            const unitPrice = simPrices[item.id]?.[sup.id] || 0;
                            const isCheapestCell = cheapest.supId === sup.id && cheapest.value > 0 && simSuppliers.length > 1;
                            const subtotal = unitPrice * item.quantidade;

                            return (
                              <td 
                                key={sup.id} 
                                className={`py-3 px-4 border-l border-[#2D323D]/30 text-center ${
                                  isCheapestCell ? 'bg-emerald-500/5' : ''
                                }`}
                              >
                                <div className="flex flex-col items-center gap-1.5 justify-center">
                                  {/* Input unit value */}
                                  <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-[10px] text-[#9BA1B1] font-bold">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={unitPrice || ''}
                                      placeholder="0,00"
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const parsed = raw === '' ? 0 : Number(raw);
                                        setSimPrices(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...(prev[item.id] || {}),
                                            [sup.id]: parsed
                                          }
                                        }));
                                      }}
                                      className={`w-24 pl-6 pr-2 py-1 bg-[#0F1115] border rounded text-xs text-right text-[#E4E6EB] font-mono focus:outline-none ${
                                        isCheapestCell ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-[#2D323D] focus:border-[#F27D26]'
                                      }`}
                                    />
                                  </div>

                                  {/* Calculated Subtotal */}
                                  {unitPrice > 0 ? (
                                    <span className={`text-[9px] font-mono ${isCheapestCell ? 'text-emerald-400 font-bold' : 'text-[#9BA1B1]'}`}>
                                      Sub: R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-[#9BA1B1]/40 italic">Sem preço</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Action cell */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleDeleteSimItem(item.id)}
                              className="p-1.5 text-[#9BA1B1] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                              title="Remover material da simulação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Footer Row for Totals */}
                    <tr className="bg-[#0F1115] font-bold text-xs border-t border-[#2D323D]">
                      <td className="py-4 px-5 text-[#9BA1B1] uppercase font-bold tracking-wider">
                        Total Estimado
                      </td>

                      {simSuppliers.map((sup) => {
                        const stats = supplierTotalsAndStats[sup.id];
                        const isCheapestCentral = cheapestOverallSupplier.supId === sup.id && cheapestOverallSupplier.total > 0;

                        return (
                          <td key={sup.id} className="py-4 px-4 border-l border-[#2D323D]/50 text-center">
                            {stats && stats.total > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-mono ${isCheapestCentral ? 'text-yellow-500 font-bold' : 'text-[#E4E6EB]'}`}>
                                  R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {!stats.fullyQuoted && (
                                  <span className="text-[8px] text-amber-500 font-medium normal-case mt-0.5">
                                    Preço parcial
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#9BA1B1]/40 italic">Sem cotação</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-4 px-4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-[#9BA1B1] text-xs bg-[#13171F]">
                <Calculator className="w-10 h-10 text-[#2D323D] mx-auto mb-3 animate-pulse" />
                Sua lista de simulação está vazia. Adicione materiais e fornecedores acima para começar!
              </div>
            )}
          </div>

          {/* Buying strategy tips (Split purchase visualizer) */}
          {simItems.length > 0 && simSuppliers.length > 1 && splitPurchaseTotal.total > 0 && (
            <div className="bg-[#1C2129] p-5 rounded-2xl border border-[#2D323D] space-y-4 shadow-sm animate-fadeIn">
              <h3 className="text-xs font-bold text-[#E4E6EB] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#F27D26]" />
                Análise de Inteligência de Compras 🧠
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#9BA1B1]">
                <div className="space-y-2 border-r border-[#2D323D]/40 pr-0 md:pr-6">
                  <h4 className="font-bold text-[#E4E6EB] flex items-center gap-1">
                    <span className="text-yellow-500">🏆</span> Cenário A: Comprar Tudo na Mesma Loja
                  </h4>
                  <p>
                    Comprando o lote completo no fornecedor mais barato (<span className="text-[#E4E6EB] font-semibold">{cheapestOverallSupplier.nome}</span>), o custo de aquisição será de <span className="text-[#E4E6EB] font-bold font-mono">R$ {cheapestOverallSupplier.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>.
                  </p>
                  <p className="text-[11px] italic">
                    Ideal para economizar com frete único e simplificar o pagamento na entrega.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="text-emerald-400">🔥</span> Cenário B: Compra Inteligente Dividida
                  </h4>
                  <p>
                    Se você comprar cada produto individualmente na loja que oferece o melhor preço, o custo cai para <span className="text-emerald-400 font-bold font-mono">R$ {splitPurchaseTotal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>.
                  </p>
                  {cheapestOverallSupplier.total > splitPurchaseTotal.total && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 shrink-0" />
                      <span>Você economiza R$ {(cheapestOverallSupplier.total - splitPurchaseTotal.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} extras escolhendo a compra fracionada!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        // ==========================================
        // RENDER: INDIVIDUAL QUOTES (ORIGINAL LOGIC)
        // ==========================================
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#1C2129] p-5 rounded-2xl border border-[#2D323D] flex items-center gap-4">
              <div className="p-3 bg-[#F27D26]/10 text-[#F27D26] rounded-xl">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#9BA1B1] uppercase font-semibold">Materiais Pesquisados</p>
                <h3 className="text-xl font-bold text-[#E4E6EB] mt-0.5">
                  {uniqueMaterialsCount} produtos
                </h3>
                <p className="text-[10px] text-[#9BA1B1] mt-0.5">{comparacoes.length} orçamentos salvos</p>
              </div>
            </div>

            <div className="bg-[#1C2129] p-5 rounded-2xl border border-[#2D323D] flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#9BA1B1] uppercase font-semibold">Economia Inteligente</p>
                <h3 className="text-xl font-bold text-emerald-400 mt-0.5">
                  Evite superfaturar
                </h3>
                <p className="text-[10px] text-[#9BA1B1] mt-0.5">Diferenças chegam a até 30%</p>
              </div>
            </div>
          </div>

          {/* Add quote form container */}
          {showAddForm && (
            <div className="bg-[#1C2129] p-6 rounded-2xl border border-[#2D323D] shadow-lg animate-fadeIn">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-bold text-[#E4E6EB] uppercase tracking-wider">
                  Adicionar Nova Cotação de Preço
                </h3>
                <button
                  onClick={resetForm}
                  className="text-xs text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="Ex: Cimento CP II 50kg Votoran"
                      className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                      Categoria *
                    </label>
                    <select
                      required
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                    >
                      <option value="">Selecione uma categoria</option>
                      {CATEGORIAS_MATERIAIS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                      Preço *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="Ex: 39.90"
                      className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                      Loja/Fornecedor *
                    </label>
                    <input
                      type="text"
                      required
                      value={loja}
                      onChange={(e) => setLoja(e.target.value)}
                      placeholder="Ex: Casa do Construtor"
                      className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-semibold text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] disabled:bg-[#F27D26]/50 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
                  >
                    {loading ? 'Salvando...' : 'Salvar Cotação'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Filter bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#16191F] p-4 rounded-xl border border-[#2D323D]">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#9BA1B1]" />
              <input
                type="text"
                placeholder="Filtrar por produto ou loja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1] focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Nova Cotação
              </button>
            )}
          </div>

          {/* Comparisons Group list */}
          <div className="space-y-6">
            {Object.keys(filteredGroupedQuotes).length > 0 ? (
              (Object.entries(filteredGroupedQuotes) as [string, ComparacaoPreco[]][]).map(([matName, quotes]) => {
                const minQuote = quotes[0]; // Already sorted cheapest first
                const maxQuote = quotes[quotes.length - 1];
                const potentialSavings = quotes.length > 1 ? maxQuote.valor - minQuote.valor : 0;
                const savingsPercent = quotes.length > 1 ? Math.round((potentialSavings / maxQuote.valor) * 100) : 0;
                const productCategory = quotes.find(q => q.categoria)?.categoria;

                return (
                  <div 
                    key={matName} 
                    className="bg-[#1C2129] rounded-2xl border border-[#2D323D] overflow-hidden shadow-sm hover:border-[#F27D26]/40 transition-all"
                  >
                    {/* Group Title and Savings alert */}
                    <div className="p-5 border-b border-[#2D323D] bg-[#16191F]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#E4E6EB] flex flex-wrap items-center gap-2">
                          <Tag className="w-4 h-4 text-[#F27D26]" />
                          {matName}
                          {productCategory && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#1F2937] text-[#9BA1B1] border border-[#2D323D]">
                              {productCategory}
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-[#9BA1B1] mt-0.5">
                          {quotes.length} cotações salvas para este produto
                        </p>
                      </div>

                      {quotes.length > 1 && potentialSavings > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Diferença Máxima: R$ {potentialSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({savingsPercent}% de economia potencial)</span>
                        </div>
                      )}
                    </div>

                    {/* Side-by-side or stacked price listing */}
                    <div className="divide-y divide-[#2D323D]/50">
                      {quotes.map((quote, idx) => {
                        const isCheapest = idx === 0 && quotes.length > 1;
                        const diffFromCheapest = quote.valor - minQuote.valor;

                        return (
                          <div 
                            key={quote.id} 
                            className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                              isCheapest ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                isCheapest 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-[#16191F] text-[#9BA1B1]'
                              }`}>
                                <Store className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-[#E4E6EB] flex flex-wrap items-center gap-2">
                                  <span>{quote.loja}</span>
                                  {isCheapest && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                      <Award className="w-2.5 h-2.5" />
                                      Melhor Preço 🏆
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-[#9BA1B1] mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#9BA1B1]" />
                                  Cotação em {new Date(quote.data).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className={`text-sm font-bold font-mono block ${
                                  isCheapest ? 'text-emerald-400' : 'text-[#E4E6EB]'
                                }`}>
                                  R$ {quote.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {!isCheapest && quotes.length > 1 && diffFromCheapest > 0 && (
                                  <span className="text-[10px] text-rose-400 font-medium font-mono block mt-0.5">
                                    +{diffFromCheapest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({Math.round((diffFromCheapest / minQuote.valor) * 100)}% mais caro)
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => onDeleteComparacao(quote.id)}
                                className="p-1.5 text-[#9BA1B1] hover:text-[#ef4444] rounded-lg hover:bg-[#ef4444]/10 transition-all cursor-pointer shrink-0"
                                title="Excluir cotação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-[#1C2129] rounded-2xl border border-[#2D323D] text-center py-12 text-[#9BA1B1] text-xs">
                <Store className="w-8 h-8 text-[#2D323D] mx-auto mb-3" />
                Nenhuma cotação de preço cadastrada. Adicione cotações para comparar fornecedores!
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

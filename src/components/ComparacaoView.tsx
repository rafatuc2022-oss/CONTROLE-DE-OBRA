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
  Sparkles
} from 'lucide-react';
import { ComparacaoPreco } from '../types';

interface ComparacaoViewProps {
  comparacoes: ComparacaoPreco[];
  onAddComparacao: (data: any) => Promise<any>;
  onDeleteComparacao: (id: string) => Promise<any>;
}

export default function ComparacaoView({
  comparacoes,
  onAddComparacao,
  onDeleteComparacao
}: ComparacaoViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields
  const [material, setMaterial] = useState('');
  const [loja, setLoja] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setMaterial('');
    setLoja('');
    setValor('');
    setData(new Date().toISOString().split('T')[0]);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material || !loja || !valor || !data) return;

    setLoading(true);
    try {
      await onAddComparacao({
        material: material.trim(),
        loja: loja.trim(),
        valor: Number(valor),
        data
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
      // Match close names or exact names
      // Find matching key case-insensitive
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
      if (matName.toLowerCase().includes(query) || quotes.some(q => q.loja.toLowerCase().includes(query))) {
        result[matName] = quotes;
      }
    });
    
    return result;
  }, [groupedQuotes, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E4E6EB] font-sans tracking-tight">
            Comparador de Preços de Materiais
          </h2>
          <p className="text-xs text-[#9BA1B1] mt-1">
            Compare orçamentos de diferentes depósitos e lojas para economizar no material de construção
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Cotação
          </button>
        )}
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Nome do Material (Exato ou similar) *
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
                  Fornecedor / Depósito / Loja *
                </label>
                <input
                  type="text"
                  required
                  value={loja}
                  onChange={(e) => setLoja(e.target.value)}
                  placeholder="Ex: Casa do Construtor Ltda"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Preço Unitário (R$) *
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Data do Orçamento *
                </label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
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
      </div>

      {/* Comparisons Group list */}
      <div className="space-y-6">
        {Object.keys(filteredGroupedQuotes).length > 0 ? (
          (Object.entries(filteredGroupedQuotes) as [string, ComparacaoPreco[]][]).map(([matName, quotes]) => {
            const minQuote = quotes[0]; // Already sorted cheapest first
            const maxQuote = quotes[quotes.length - 1];
            const potentialSavings = quotes.length > 1 ? maxQuote.valor - minQuote.valor : 0;
            const savingsPercent = quotes.length > 1 ? Math.round((potentialSavings / maxQuote.valor) * 100) : 0;

            return (
              <div 
                key={matName} 
                className="bg-[#1C2129] rounded-2xl border border-[#2D323D] overflow-hidden shadow-sm hover:border-[#F27D26]/40 transition-all"
              >
                {/* Group Title and Savings alert */}
                <div className="p-5 border-b border-[#2D323D] bg-[#16191F]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#E4E6EB] flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#F27D26]" />
                      {matName}
                    </h3>
                    <p className="text-[10px] text-[#9BA1B1] mt-0.5">
                      {quotes.length} cotações salvas para este produto
                    </p>
                  </div>

                  {quotes.length > 1 && potentialSavings > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Diferença: R$ {potentialSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({savingsPercent}% de economia potencial)</span>
                    </div>
                  )}
                </div>

                {/* Side-by-side or stacked price listing */}
                <div className="divide-y divide-[#2D323D]/50">
                  {quotes.map((quote, idx) => {
                    const isCheapest = idx === 0 && quotes.length > 1;
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
                            <p className="text-xs font-semibold text-[#E4E6EB] flex items-center gap-1.5">
                              {quote.loja}
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
                          <span className={`text-sm font-bold font-mono ${
                            isCheapest ? 'text-emerald-400' : 'text-[#E4E6EB]'
                          }`}>
                            R$ {quote.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>

                          <button
                            onClick={() => onDeleteComparacao(quote.id)}
                            className="p-1.5 text-[#9BA1B1] hover:text-[#ef4444] rounded-lg hover:bg-[#ef4444]/10 transition-all cursor-pointer"
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
  );
}

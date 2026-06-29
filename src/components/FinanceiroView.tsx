import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  Trash2, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info,
  Edit2
} from 'lucide-react';
import { Obra, Entrada, Saida, CATEGORIAS_SAIDAS } from '../types';

interface FinanceiroViewProps {
  obra: Obra;
  entradas: Entrada[];
  saidas: Saida[];
  onAddEntrada: (data: any) => Promise<any>;
  onUpdateEntrada: (id: string, data: any) => Promise<any>;
  onDeleteEntrada: (record: Entrada) => Promise<any>;
  onAddSaida: (data: any) => Promise<any>;
  onUpdateSaida: (id: string, data: any) => Promise<any>;
  onDeleteSaida: (record: Saida) => Promise<any>;
}

export default function FinanceiroView({
  obra,
  entradas,
  saidas,
  onAddEntrada,
  onUpdateEntrada,
  onDeleteEntrada,
  onAddSaida,
  onUpdateSaida,
  onDeleteSaida
}: FinanceiroViewProps) {
  const [activeTab, setActiveTab] = useState<'tudo' | 'entradas' | 'saidas'>('tudo');
  const [showAddForm, setShowAddForm] = useState<'entrada' | 'saida' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form States
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [origem, setOrigem] = useState('');
  const [categoria, setCategoria] = useState<typeof CATEGORIAS_SAIDAS[number]>('Material');
  const [descricao, setDescricao] = useState('');
  const [observacao, setObservacao] = useState('');

  const resetForm = () => {
    setValor('');
    setData(new Date().toISOString().split('T')[0]);
    setOrigem('');
    setCategoria('Material');
    setDescricao('');
    setObservacao('');
    setShowAddForm(null);
    setEditingItem(null);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setValor(item.valor.toString());
    setData(item.data);
    setOrigem(item.origem || '');
    if (item.tipo === 'saida') {
      setCategoria(item.displayCategory as any);
    }
    setDescricao(item.descricao);
    setObservacao(item.observacao || '');
    setShowAddForm(item.tipo);
    
    // Scroll smoothly to form
    const formElement = document.getElementById('form-financeiro');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0 || !descricao || !data) return;

    const parsedValue = Number(valor);

    if (editingItem) {
      if (editingItem.tipo === 'entrada') {
        await onUpdateEntrada(editingItem.id, {
          valor: parsedValue,
          data,
          origem: origem || 'Aporte do Proprietário',
          descricao,
          observacao
        });
      } else {
        await onUpdateSaida(editingItem.id, {
          valor: parsedValue,
          data,
          categoria,
          descricao,
          observacao
        });
      }
    } else {
      if (showAddForm === 'entrada') {
        await onAddEntrada({
          obraId: obra.id,
          valor: parsedValue,
          data,
          origem: origem || 'Aporte do Proprietário',
          descricao,
          observacao
        });
      } else if (showAddForm === 'saida') {
        await onAddSaida({
          obraId: obra.id,
          valor: parsedValue,
          data,
          categoria,
          descricao,
          observacao
        });
      }
    }

    resetForm();
  };

  // Combine movements into a single log list
  const combinedMovements = useMemo(() => {
    const list: any[] = [];
    
    entradas.forEach(e => {
      list.push({
        ...e,
        tipo: 'entrada',
        displayCategory: 'Aporte'
      });
    });

    saidas.forEach(s => {
      list.push({
        ...s,
        tipo: 'saida',
        displayCategory: s.categoria
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [entradas, saidas]);

  // Apply filters and searches (4.8 Pesquisa)
  const filteredMovements = useMemo(() => {
    return combinedMovements.filter(item => {
      // 1. Tab type filter
      if (activeTab === 'entradas' && item.tipo !== 'entrada') return false;
      if (activeTab === 'saidas' && item.tipo !== 'saida') return false;

      // 2. Category filter
      if (selectedCategory !== 'todas' && item.displayCategory !== selectedCategory) return false;

      // 3. Search text (matches description, category, origin, value, or observation)
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = item.descricao?.toLowerCase().includes(query);
        const matchesCategory = item.displayCategory?.toLowerCase().includes(query);
        const matchesOrigin = item.origem?.toLowerCase().includes(query);
        const matchesObs = item.observacao?.toLowerCase().includes(query);
        const matchesVal = item.valor?.toString().includes(query);

        if (!matchesDesc && !matchesCategory && !matchesOrigin && !matchesObs && !matchesVal) {
          return false;
        }
      }

      // 4. Date Range filters
      if (startDate && new Date(item.data) < new Date(startDate)) return false;
      if (endDate && new Date(item.data) > new Date(endDate)) return false;

      return true;
    });
  }, [combinedMovements, activeTab, selectedCategory, searchTerm, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Controle Financeiro da Obra
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Lance entradas de caixa ou despesas e acompanhe o extrato em tempo real
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowAddForm('entrada')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            Lançar Entrada
          </button>
          <button
            onClick={() => setShowAddForm('saida')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Lançar Saída
          </button>
        </div>
      </div>

      {/* 2. Launch Form Overlay */}
      {showAddForm && (
        <div id="form-financeiro" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${showAddForm === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {editingItem 
                ? (showAddForm === 'entrada' ? 'Editar Entrada de Recursos' : 'Editar Saída (Despesa)')
                : (showAddForm === 'entrada' ? 'Registrar Entrada de Recursos' : 'Registrar Saída (Despesa)')
              }
            </h3>
            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500">
              {showAddForm === 'entrada' ? 'Adicionará ao saldo' : 'Descontará do saldo'}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                  Valor Total (R$) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                  Data de Lançamento *
                </label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {showAddForm === 'entrada' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                    Origem do Dinheiro *
                  </label>
                  <input
                    type="text"
                    required={showAddForm === 'entrada'}
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    placeholder="Ex: Recursos próprios, Banco, Parcela Cliente..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                    Categoria da Despesa *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {CATEGORIAS_SAIDAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                  Descrição Curta *
                </label>
                <input
                  type="text"
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={showAddForm === 'entrada' ? 'Ex: Empréstimo CAIXA parcela final' : 'Ex: Compra de blocos cerâmicos de vedação'}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                  Observações Extras (Opcional)
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: NF-e emitida com frete CIF incluso..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow cursor-pointer"
              >
                {editingItem ? 'Salvar Alterações' : 'Confirmar Lançamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Search and Filters (4.8 Pesquisa) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Text Search */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por material, loja, funcionário, categoria, valor..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="todas">Todas Categorias</option>
              <option value="Aporte">Aporte (Entrada)</option>
              {CATEGORIAS_SAIDAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Collapsible Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-50 dark:border-slate-700/40">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Período:</span>
          </div>
          <div className="flex items-center gap-2">
            <span>De</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>Até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
          {(searchTerm || selectedCategory !== 'todas' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('todas');
                setStartDate('');
                setEndDate('');
              }}
              className="text-violet-600 hover:underline cursor-pointer text-[11px] font-semibold ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 4. Tab Navigation and List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 px-4">
          <button
            onClick={() => setActiveTab('tudo')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors relative cursor-pointer ${
              activeTab === 'tudo' 
                ? 'border-violet-600 text-violet-600 dark:text-violet-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Todos Movimentos ({combinedMovements.length})
          </button>
          <button
            onClick={() => setActiveTab('entradas')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors relative cursor-pointer ${
              activeTab === 'entradas' 
                ? 'border-violet-600 text-violet-600 dark:text-violet-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Entradas ({entradas.length})
          </button>
          <button
            onClick={() => setActiveTab('saidas')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors relative cursor-pointer ${
              activeTab === 'saidas' 
                ? 'border-violet-600 text-violet-600 dark:text-violet-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Saídas ({saidas.length})
          </button>
        </div>

        {/* List Content */}
        {filteredMovements.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60 text-slate-400 uppercase tracking-wider bg-slate-50/30 dark:bg-slate-800/30">
                    <th className="py-3 px-6 font-semibold">Data</th>
                    <th className="py-3 px-4 font-semibold">Descrição / Detalhe</th>
                    <th className="py-3 px-4 font-semibold">Categoria</th>
                    <th className="py-3 px-4 font-semibold">Origem / Destino</th>
                    <th className="py-3 px-4 font-semibold text-right">Valor</th>
                    <th className="py-3 px-6 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                  {filteredMovements.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-medium whitespace-nowrap text-slate-500">
                        {new Date(item.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold max-w-xs truncate">
                        <div className="truncate" title={item.descricao}>
                          {item.descricao}
                        </div>
                        {item.observacao && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.observacao}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.tipo === 'entrada' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                            : item.displayCategory === 'Material'
                              ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600'
                              : item.displayCategory === 'Mão de obra'
                                ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {item.displayCategory}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 truncate max-w-[120px]" title={item.origem || '-'}>
                        {item.origem || '-'}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap text-sm ${
                        item.tipo === 'entrada' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1 text-violet-500 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded transition-all cursor-pointer"
                            title="Editar Transação"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Excluir este lançamento financeiro? O saldo da obra será atualizado.')) {
                                if (item.tipo === 'entrada') onDeleteEntrada(item);
                                else onDeleteSaida(item);
                              }
                            }}
                            className="p-1 text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all cursor-pointer"
                            title="Excluir Transação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredMovements.map((item) => (
                <div key={item.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {new Date(item.data).toLocaleDateString('pt-BR')}
                      </span>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs break-words max-w-[200px]">
                        {item.descricao}
                      </h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      item.tipo === 'entrada' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                        : item.displayCategory === 'Material'
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600'
                          : item.displayCategory === 'Mão de obra'
                            ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>
                      {item.displayCategory}
                    </span>
                  </div>

                  {item.observacao && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.observacao}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <div>
                      <span className="text-slate-400">Origem/Destino:</span> <span className="font-medium text-slate-600 dark:text-slate-300">{item.origem || '—'}</span>
                    </div>
                    <div className={`font-bold text-sm ${
                      item.tipo === 'entrada' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="px-2.5 py-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir este lançamento financeiro? O saldo da obra será atualizado.')) {
                          if (item.tipo === 'entrada') onDeleteEntrada(item);
                          else onDeleteSaida(item);
                        }
                      }}
                      className="px-2.5 py-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400 dark:text-slate-500">
            Nenhum movimento financeiro encontrado para os filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
}

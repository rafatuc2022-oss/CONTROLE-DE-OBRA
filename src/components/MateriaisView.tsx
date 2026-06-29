import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  ShoppingBag, 
  Filter, 
  Receipt, 
  Calendar, 
  Coins,
  Edit2
} from 'lucide-react';
import { Obra, Material, CATEGORIAS_MATERIAIS, UNIDADES } from '../types';

interface MateriaisViewProps {
  obra: Obra;
  materiais: Material[];
  onAddMaterial: (data: any) => Promise<any>;
  onUpdateMaterial: (id: string, data: any, original: Material) => Promise<any>;
  onDeleteMaterial: (record: Material) => Promise<any>;
}

export default function MateriaisView({
  obra,
  materiais,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial
}: MateriaisViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');

  // Form Fields
  const [categoria, setCategoria] = useState<string>('Cimento');
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<string>('saco');
  const [valorUnitario, setValorUnitario] = useState('');
  const [loja, setLoja] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCategoria('Cimento');
    setNome('');
    setQuantidade('');
    setUnidade('saco');
    setValorUnitario('');
    setLoja('');
    setNotaFiscal('');
    setDataCompra(new Date().toISOString().split('T')[0]);
    setObservacao('');
    setError(null);
    setShowAddForm(false);
    setEditingMaterial(null);
  };

  const handleEditClick = (item: Material) => {
    setEditingMaterial(item);
    setCategoria(item.categoria);
    setNome(item.nome);
    setQuantidade(item.quantidade.toString());
    setUnidade(item.unidade);
    setValorUnitario(item.valorUnitario.toString());
    setLoja(item.loja);
    setNotaFiscal(item.notaFiscal || '');
    setDataCompra(item.dataCompra);
    setObservacao(item.observacao || '');
    setShowAddForm(true);

    const formElement = document.getElementById('form-material');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !quantidade || !valorUnitario || !loja || !dataCompra) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const qty = Number(quantidade);
      const unitVal = Number(valorUnitario);
      if (isNaN(qty) || qty <= 0) {
        throw new Error('A quantidade deve ser um número maior que zero.');
      }
      if (isNaN(unitVal) || unitVal <= 0) {
        throw new Error('O valor unitário deve ser um número maior que zero.');
      }
      const totalVal = qty * unitVal;

      if (editingMaterial) {
        await onUpdateMaterial(editingMaterial.id, {
          categoria,
          nome,
          quantidade: qty,
          unidade,
          valorUnitario: unitVal,
          valorTotal: totalVal,
          loja,
          notaFiscal,
          dataCompra,
          observacao
        }, editingMaterial);
      } else {
        await onAddMaterial({
          obraId: obra.id,
          categoria,
          nome,
          quantidade: qty,
          unidade,
          valorUnitario: unitVal,
          valorTotal: totalVal,
          loja,
          notaFiscal,
          dataCompra,
          observacao
        });
      }

      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao salvar o material. Verifique os campos e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search materials
  const filteredMateriais = useMemo(() => {
    return materiais.filter(item => {
      if (selectedCategory !== 'todas' && item.categoria !== selectedCategory) return false;
      
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          item.nome.toLowerCase().includes(query) ||
          item.loja.toLowerCase().includes(query) ||
          item.notaFiscal?.toLowerCase().includes(query) ||
          item.observacao?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [materiais, selectedCategory, searchTerm]);

  // Total materials expenditure
  const totalGeral = useMemo(() => {
    return materiais.reduce((sum, m) => sum + m.valorTotal, 0);
  }, [materiais]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E4E6EB] font-sans tracking-tight">
            Controle de Materiais
          </h2>
          <p className="text-xs text-[#9BA1B1] mt-1">
            Registre todas as compras de materiais de construção e alimente o fluxo de caixa
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Lançar Compra
          </button>
        )}
      </div>

      {/* Quick Stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1C2129] p-5 rounded-2xl border border-[#2D323D] flex items-center gap-4">
          <div className="p-3 bg-[#F27D26]/10 text-[#F27D26] rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#9BA1B1] uppercase font-semibold">Total em Materiais</p>
            <h3 className="text-xl font-bold text-[#E4E6EB] mt-0.5">
              R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-[#9BA1B1] mt-0.5">{materiais.length} itens cadastrados</p>
          </div>
        </div>
      </div>

      {/* Add Form Container */}
      {showAddForm && (
        <div id="form-material" className="bg-[#1C2129] p-6 rounded-2xl border border-[#2D323D] shadow-lg animate-fadeIn">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-[#E4E6EB] uppercase tracking-wider">
              {editingMaterial ? 'Editar Compra de Material' : 'Lançar Compra de Material'}
            </h3>
            <button
              onClick={resetForm}
              className="text-xs text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors"
            >
              Cancelar
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Categoria *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                >
                  {CATEGORIAS_MATERIAIS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Nome do Material / Especificação *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Tijolo de Cerâmica 8 furos"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Quantidade *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Unidade *
                </label>
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                >
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Valor Unitário (R$) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  placeholder="Ex: 1.20"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Total Estimado
                </label>
                <div className="w-full px-3 py-2 bg-[#0F1115]/50 border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB]/60 font-semibold font-mono">
                  R$ {(Number(quantidade) * Number(valorUnitario) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Fornecedor / Loja *
                </label>
                <input
                  type="text"
                  required
                  value={loja}
                  onChange={(e) => setLoja(e.target.value)}
                  placeholder="Ex: Depósito Alvorada"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Nota Fiscal / Recibo
                </label>
                <input
                  type="text"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  placeholder="Nº ou série da NF"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Data da Compra *
                </label>
                <input
                  type="date"
                  required
                  value={dataCompra}
                  onChange={(e) => setDataCompra(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                Observações
              </label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Material entregue na obra, guardado no abrigo coberto."
                rows={2}
                className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
              />
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
                {loading ? 'Salvando...' : (editingMaterial ? 'Salvar Alterações' : 'Confirmar Compra')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#16191F] p-4 rounded-xl border border-[#2D323D]">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#9BA1B1]" />
          <input
            type="text"
            placeholder="Buscar por material, loja ou nota fiscal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1] focus:outline-none focus:border-[#F27D26]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <Filter className="w-4 h-4 text-[#9BA1B1]" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
          >
            <option value="todas">Todas Categorias</option>
            {CATEGORIAS_MATERIAIS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-[#1C2129] rounded-2xl border border-[#2D323D] overflow-hidden">
        {filteredMateriais.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2D323D] bg-[#16191F]/50 text-[10px] text-[#9BA1B1] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Material</th>
                    <th className="py-4 px-4">Qtd</th>
                    <th className="py-4 px-4">Val. Unitário</th>
                    <th className="py-4 px-4">Val. Total</th>
                    <th className="py-4 px-4">Fornecedor</th>
                    <th className="py-4 px-4">Nota Fiscal</th>
                    <th className="py-4 px-4">Data Compra</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D323D]/50 text-xs text-[#E4E6EB]">
                  {filteredMateriais.map((item) => (
                    <tr key={item.id} className="hover:bg-[#16191F]/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold">{item.nome}</div>
                        <div className="text-[10px] text-[#9BA1B1] mt-0.5">{item.categoria}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-[#9BA1B1]">
                        {item.quantidade} <span className="text-[10px]">{item.unidade}</span>
                      </td>
                      <td className="py-4 px-4 font-mono">
                        R$ {item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-[#F27D26]">
                        R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-[#9BA1B1]">{item.loja}</td>
                      <td className="py-4 px-4 font-mono text-xs">{item.notaFiscal || '—'}</td>
                      <td className="py-4 px-4 text-[#9BA1B1]">
                        {new Date(item.dataCompra).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-[#9BA1B1] hover:text-[#F27D26] rounded-lg hover:bg-[#F27D26]/10 transition-all cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Excluir este lançamento de material? O saldo da obra e o comparador de preços serão atualizados.')) {
                                onDeleteMaterial(item);
                              }
                            }}
                            className="p-1.5 text-[#9BA1B1] hover:text-[#ef4444] rounded-lg hover:bg-[#ef4444]/10 transition-all cursor-pointer"
                            title="Excluir lançamento"
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
            <div className="md:hidden divide-y divide-[#2D323D]/50">
              {filteredMateriais.map((item) => (
                <div key={item.id} className="p-4 space-y-2.5 hover:bg-[#16191F]/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-[#9BA1B1] block">
                        {new Date(item.dataCompra).toLocaleDateString('pt-BR')}
                      </span>
                      <h4 className="font-semibold text-[#E4E6EB] text-xs">
                        {item.nome}
                      </h4>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase bg-[#0F1115] text-[#9BA1B1] px-1.5 py-0.5 rounded border border-[#2D323D]">
                        {item.categoria}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-[#9BA1B1] block font-mono">
                        {item.quantidade} {item.unidade} x R$ {item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="font-bold text-sm text-[#F27D26] block font-mono">
                        R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-[#9BA1B1] bg-[#0F1115]/50 p-2 rounded border border-[#2D323D]/40">
                    <div>
                      <span className="text-[#9BA1B1]/60">Fornecedor:</span> <span className="font-medium text-[#E4E6EB]">{item.loja}</span>
                    </div>
                    <div>
                      <span className="text-[#9BA1B1]/60">Nota Fiscal:</span> <span className="font-mono text-[#E4E6EB]">{item.notaFiscal || '—'}</span>
                    </div>
                    {item.observacao && (
                      <div className="mt-1 pt-1 border-t border-[#2D323D]/30 text-[10px]">
                        <span className="text-[#9BA1B1]/60">Obs:</span> <span className="italic text-[#E4E6EB]/80">{item.observacao}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2D323D]/40">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="px-2.5 py-1 text-[#F27D26] hover:bg-[#F27D26]/10 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir este lançamento de material? O saldo da obra e o comparador de preços serão atualizados.')) {
                          onDeleteMaterial(item);
                        }
                      }}
                      className="px-2.5 py-1 text-rose-500 hover:bg-[#ef4444]/10 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-[#9BA1B1] text-xs">
            <ShoppingBag className="w-8 h-8 text-[#2D323D] mx-auto mb-3" />
            Nenhuma compra de material encontrada com os filtros atuais.
          </div>
        )}
      </div>
    </div>
  );
}

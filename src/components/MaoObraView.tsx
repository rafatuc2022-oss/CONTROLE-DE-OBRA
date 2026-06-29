import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Briefcase, 
  User, 
  Calendar, 
  Coins, 
  Phone, 
  FileText,
  Edit2
} from 'lucide-react';
import { Obra, MaoObra } from '../types';

interface MaoObraViewProps {
  obra: Obra;
  maoObra: MaoObra[];
  onAddMaoObra: (data: any) => Promise<any>;
  onUpdateMaoObra: (id: string, data: any, original: MaoObra) => Promise<any>;
  onDeleteMaoObra: (record: MaoObra) => Promise<any>;
}

export default function MaoObraView({
  obra,
  maoObra,
  onAddMaoObra,
  onUpdateMaoObra,
  onDeleteMaoObra
}: MaoObraViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaoObra, setEditingMaoObra] = useState<MaoObra | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [valor, setValor] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacao, setObservacao] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNome('');
    setFuncao('');
    setValor('');
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setFormaPagamento('Pix');
    setCpf('');
    setTelefone('');
    setObservacao('');
    setError(null);
    setShowAddForm(false);
    setEditingMaoObra(null);
  };

  const handleEditClick = (item: MaoObra) => {
    setEditingMaoObra(item);
    setNome(item.nome);
    setFuncao(item.funcao);
    setValor(item.valor.toString());
    setDataPagamento(item.dataPagamento);
    setFormaPagamento(item.formaPagamento);
    setCpf(item.cpf || '');
    setTelefone(item.telefone || '');
    setObservacao(item.observacao || '');
    setShowAddForm(true);

    const formElement = document.getElementById('form-mao-obra');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !funcao || !valor || !dataPagamento || !formaPagamento) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const parsedVal = Number(valor);
      if (isNaN(parsedVal) || parsedVal <= 0) {
        throw new Error('O valor pago deve ser um número maior que zero.');
      }

      if (editingMaoObra) {
        await onUpdateMaoObra(editingMaoObra.id, {
          nome,
          funcao,
          valor: parsedVal,
          dataPagamento,
          formaPagamento,
          cpf,
          telefone,
          observacao
        }, editingMaoObra);
      } else {
        await onAddMaoObra({
          obraId: obra.id,
          nome,
          funcao,
          valor: parsedVal,
          dataPagamento,
          formaPagamento,
          cpf,
          telefone,
          observacao
        });
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao registrar o pagamento. Verifique os campos e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search labor list
  const filteredMaoObra = useMemo(() => {
    return maoObra.filter(item => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          item.nome.toLowerCase().includes(query) ||
          item.funcao.toLowerCase().includes(query) ||
          item.formaPagamento.toLowerCase().includes(query) ||
          item.observacao?.toLowerCase().includes(query) ||
          item.cpf?.includes(query)
        );
      }
      return true;
    });
  }, [maoObra, searchTerm]);

  // Aggregate sum
  const totalMaoObra = useMemo(() => {
    return maoObra.reduce((sum, item) => sum + item.valor, 0);
  }, [maoObra]);

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E4E6EB] font-sans tracking-tight">
            Pagamentos de Mão de Obra
          </h2>
          <p className="text-xs text-[#9BA1B1] mt-1">
            Lance pagamentos de pedreiros, mestres de obras, serventes e subempreiteiras com comprovantes
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Lançar Pagamento
          </button>
        )}
      </div>

      {/* Quick Stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1C2129] p-5 rounded-2xl border border-[#2D323D] flex items-center gap-4">
          <div className="p-3 bg-[#F27D26]/10 text-[#F27D26] rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#9BA1B1] uppercase font-semibold">Custo de Mão de Obra</p>
            <h3 className="text-xl font-bold text-[#E4E6EB] mt-0.5">
              R$ {totalMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-[#9BA1B1] mt-0.5">{maoObra.length} registros no caixa</p>
          </div>
        </div>
      </div>

      {/* Add payment form container */}
      {showAddForm && (
        <div id="form-mao-obra" className="bg-[#1C2129] p-6 rounded-2xl border border-[#2D323D] shadow-lg animate-fadeIn">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-[#E4E6EB] uppercase tracking-wider">
              {editingMaoObra ? 'Editar Pagamento de Funcionário' : 'Registrar Pagamento de Funcionário'}
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
                  Nome do Profissional / Equipe *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: José da Silva de Souza"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Função / Especialidade *
                </label>
                <input
                  type="text"
                  required
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                  placeholder="Ex: Pedreiro, Eletricista, Servente..."
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Valor Pago (R$) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Ex: 1500.00"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Data de Pagamento *
                </label>
                <input
                  type="date"
                  required
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Forma de Pagamento *
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro em Espécie</option>
                  <option value="Transferência">Transferência Bancária</option>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  CPF (Opcional)
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Telefone (Opcional)
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                Observações / Descrição do Serviço
              </label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Pagamento referente à segunda quinzena de reboco externo."
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
                {loading ? 'Salvando...' : (editingMaoObra ? 'Salvar Alterações' : 'Confirmar Pagamento')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#16191F] p-4 rounded-xl border border-[#2D323D]">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#9BA1B1]" />
          <input
            type="text"
            placeholder="Buscar por profissional, cargo, CPF ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1] focus:outline-none focus:border-[#F27D26]"
          />
        </div>
      </div>

      {/* Labor Table */}
      <div className="bg-[#1C2129] rounded-2xl border border-[#2D323D] overflow-hidden">
        {filteredMaoObra.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2D323D] bg-[#16191F]/50 text-[10px] text-[#9BA1B1] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Profissional</th>
                    <th className="py-4 px-4">Cargo / Função</th>
                    <th className="py-4 px-4">Valor Pago</th>
                    <th className="py-4 px-4">Forma de Pagto</th>
                    <th className="py-4 px-4">Contato</th>
                    <th className="py-4 px-4">Data Pagto</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D323D]/50 text-xs text-[#E4E6EB]">
                  {filteredMaoObra.map((item) => (
                    <tr key={item.id} className="hover:bg-[#16191F]/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                          {item.nome}
                        </div>
                        {item.cpf && (
                          <div className="text-[10px] text-[#9BA1B1] mt-0.5 ml-5">CPF: {item.cpf}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 bg-[#F27D26]/10 text-[#F27D26] rounded text-[10px] font-semibold uppercase">
                          {item.funcao}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-[#E4E6EB]">
                        R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-[#9BA1B1]">{item.formaPagamento}</td>
                      <td className="py-4 px-4 text-[#9BA1B1]">
                        {item.telefone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {item.telefone}
                          </span>
                        ) : (
                          <span className="text-[#9BA1B1]/40">Não informado</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-[#9BA1B1]">
                        {new Date(item.dataPagamento).toLocaleDateString('pt-BR')}
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
                              if (confirm('Excluir este lançamento de mão de obra? O saldo da obra será atualizado.')) {
                                onDeleteMaoObra(item);
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
              {filteredMaoObra.map((item) => (
                <div key={item.id} className="p-4 space-y-2.5 hover:bg-[#16191F]/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-[#9BA1B1] block">
                        {new Date(item.dataPagamento).toLocaleDateString('pt-BR')}
                      </span>
                      <h4 className="font-semibold text-[#E4E6EB] text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                        {item.nome}
                      </h4>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase bg-[#0F1115] text-[#F27D26] px-1.5 py-0.5 rounded border border-[#2D323D]">
                        {item.funcao}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-[#E4E6EB] block font-mono">
                        R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-[#9BA1B1] block">
                        {item.formaPagamento}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-[#9BA1B1] bg-[#0F1115]/50 p-2 rounded border border-[#2D323D]/40">
                    {item.cpf && (
                      <div>
                        <span className="text-[#9BA1B1]/60">CPF:</span> <span className="font-mono text-[#E4E6EB]">{item.cpf}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[#9BA1B1]/60">Contato:</span> <span className="font-medium text-[#E4E6EB]">{item.telefone || 'Não informado'}</span>
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
                        if (confirm('Excluir este lançamento de mão de obra? O saldo da obra será atualizado.')) {
                          onDeleteMaoObra(item);
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
            <Briefcase className="w-8 h-8 text-[#2D323D] mx-auto mb-3" />
            Nenhum pagamento registrado com os filtros atuais.
          </div>
        )}
      </div>
    </div>
  );
}

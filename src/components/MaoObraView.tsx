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
  Edit2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { Obra, MaoObra, PagamentoMaoObra } from '../types';
import { useNotification } from '../context/NotificationContext';

interface MaoObraViewProps {
  obra: Obra;
  maoObra: MaoObra[];
  onAddMaoObra: (data: any) => Promise<any>;
  onUpdateMaoObra: (id: string, data: any, original: MaoObra) => Promise<any>;
  onDeleteMaoObra: (record: MaoObra) => Promise<any>;
  onAddMaoObraVale: (maoObraId: string, vale: Omit<PagamentoMaoObra, 'id'>) => Promise<any>;
  onDeleteMaoObraVale: (maoObraId: string, paymentId: string) => Promise<any>;
  onUpdateMaoObraVale: (maoObraId: string, paymentId: string, updatedFields: Partial<PagamentoMaoObra>) => Promise<any>;
}

export default function MaoObraView({
  obra,
  maoObra,
  onAddMaoObra,
  onUpdateMaoObra,
  onDeleteMaoObra,
  onAddMaoObraVale,
  onDeleteMaoObraVale,
  onUpdateMaoObraVale
}: MaoObraViewProps) {
  const { confirmAction } = useNotification();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaoObra, setEditingMaoObra] = useState<MaoObra | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProfIds, setExpandedProfIds] = useState<Record<string, boolean>>({});

  // Professional Form Fields
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [valorContrato, setValorContrato] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacao, setObservacao] = useState('');

  // Vale / Retirada Form Modal State
  const [showValeModalFor, setShowValeModalFor] = useState<MaoObra | null>(null);
  const [editingVale, setEditingVale] = useState<{ professional: MaoObra; vale: PagamentoMaoObra } | null>(null);
  const [valeValor, setValeValor] = useState('');
  const [valeData, setValeData] = useState(new Date().toISOString().split('T')[0]);
  const [valeFormaPagamento, setValeFormaPagamento] = useState('Pix');
  const [valeObservacao, setValeObservacao] = useState('');

  const [loading, setLoading] = useState(false);
  const [valeLoading, setValeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valeError, setValeError] = useState<string | null>(null);

  // Sanitizes a professional's record to cleanly handle legacy items
  const sanitizedMaoObra = useMemo(() => {
    return maoObra.map(item => {
      const pagamentos = item.pagamentos || [];
      const vContrato = item.valorContrato || item.valor || 0;
      
      // If there's no pagamentos array but there was a legacy valor, we map it as a legacy payment
      let finalPagamentos = [...pagamentos];
      if (pagamentos.length === 0 && item.valor > 0) {
        finalPagamentos = [
          {
            id: 'legacy-payment',
            valor: item.valor,
            data: item.dataPagamento || new Date().toISOString().split('T')[0],
            formaPagamento: item.formaPagamento || 'Pix',
            observacao: item.observacao || 'Lançamento original'
          }
        ];
      }
      return {
        ...item,
        valorContrato: vContrato,
        pagamentos: finalPagamentos
      };
    });
  }, [maoObra]);

  const toggleExpand = (id: string) => {
    setExpandedProfIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const resetForm = () => {
    setNome('');
    setFuncao('');
    setValorContrato('');
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
    setValorContrato((item.valorContrato || item.valor || 0).toString());
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
    if (!nome || !funcao || !valorContrato || !dataPagamento || !formaPagamento) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const parsedValContrato = Number(valorContrato);
      if (isNaN(parsedValContrato) || parsedValContrato <= 0) {
        throw new Error('O valor do orçamento/contrato deve ser um número maior que zero.');
      }

      if (editingMaoObra) {
        await onUpdateMaoObra(editingMaoObra.id, {
          nome,
          funcao,
          valorContrato: parsedValContrato,
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
          valor: 0, // initially R$ 0,00 paid
          valorContrato: parsedValContrato,
          dataPagamento,
          formaPagamento,
          cpf,
          telefone,
          observacao,
          pagamentos: []
        });
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao registrar o profissional. Verifique os campos e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Vale Submission (Add / Edit)
  const openValeModal = (professional: MaoObra, valeToEdit?: PagamentoMaoObra) => {
    if (valeToEdit) {
      setEditingVale({ professional, vale: valeToEdit });
      setValeValor(valeToEdit.valor.toString());
      setValeData(valeToEdit.data);
      setValeFormaPagamento(valeToEdit.formaPagamento);
      setValeObservacao(valeToEdit.observacao || '');
    } else {
      setShowValeModalFor(professional);
      setValeValor('');
      setValeData(new Date().toISOString().split('T')[0]);
      setValeFormaPagamento(professional.formaPagamento || 'Pix');
      setValeObservacao('');
    }
    setValeError(null);
  };

  const closeValeModal = () => {
    setShowValeModalFor(null);
    setEditingVale(null);
    setValeValor('');
    setValeData(new Date().toISOString().split('T')[0]);
    setValeFormaPagamento('Pix');
    setValeObservacao('');
    setValeError(null);
  };

  const handleValeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valeValor || !valeData || !valeFormaPagamento) {
      setValeError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setValeLoading(true);
    setValeError(null);
    try {
      const parsedVal = Number(valeValor);
      if (isNaN(parsedVal) || parsedVal <= 0) {
        throw new Error('O valor do vale deve ser maior que zero.');
      }

      if (editingVale) {
        if (editingVale.vale.id === 'legacy-payment') {
          // If editing a legacy payment, we need to convert it to a real payment.
          // Since legacy was stored in the base 'valor' field, the easiest way is to update
          // the contract's pagamentos array by adding this edited one, and setting the model.
          await onUpdateMaoObra(editingVale.professional.id, {
            valor: parsedVal,
            dataPagamento: valeData,
            formaPagamento: valeFormaPagamento,
            observacao: valeObservacao,
            pagamentos: [{
              id: 'vale_' + Math.random().toString(36).substr(2, 9),
              valor: parsedVal,
              data: valeData,
              formaPagamento: valeFormaPagamento,
              observacao: valeObservacao
            }]
          }, editingVale.professional);
        } else {
          await onUpdateMaoObraVale(editingVale.professional.id, editingVale.vale.id, {
            valor: parsedVal,
            data: valeData,
            formaPagamento: valeFormaPagamento,
            observacao: valeObservacao
          });
        }
      } else if (showValeModalFor) {
        await onAddMaoObraVale(showValeModalFor.id, {
          valor: parsedVal,
          data: valeData,
          formaPagamento: valeFormaPagamento,
          observacao: valeObservacao
        });
        // Auto-expand this professional to see the new voucher
        setExpandedProfIds(prev => ({ ...prev, [showValeModalFor.id]: true }));
      }
      closeValeModal();
    } catch (err: any) {
      console.error(err);
      setValeError(err.message || 'Erro ao registrar o vale. Tente novamente.');
    } finally {
      setValeLoading(false);
    }
  };

  const handleDeleteVale = async (professional: MaoObra, paymentId: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Vale/Retirada',
      message: 'Tem certeza que deseja excluir este vale de adiantamento? O saldo da obra e o histórico do profissional serão recalculados automaticamente.',
      confirmText: 'Excluir Vale',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }
    
    try {
      if (paymentId === 'legacy-payment') {
        // Clear out the payment completely for legacy
        await onUpdateMaoObra(professional.id, {
          valor: 0,
          pagamentos: []
        }, professional);
      } else {
        await onDeleteMaoObraVale(professional.id, paymentId);
      }
    } catch (err) {
      console.error('Erro ao excluir o vale:', err);
      alert('Erro ao excluir o vale.');
    }
  };

  // Filter and search labor list
  const filteredMaoObra = useMemo(() => {
    return sanitizedMaoObra.filter(item => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          item.nome.toLowerCase().includes(query) ||
          item.funcao.toLowerCase().includes(query) ||
          item.observacao?.toLowerCase().includes(query) ||
          item.cpf?.includes(query)
        );
      }
      return true;
    });
  }, [sanitizedMaoObra, searchTerm]);

  // Financial calculations
  const totalOrcado = useMemo(() => {
    return sanitizedMaoObra.reduce((sum, item) => sum + item.valorContrato, 0);
  }, [sanitizedMaoObra]);

  const totalPago = useMemo(() => {
    return sanitizedMaoObra.reduce((sum, item) => {
      const pSum = item.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      return sum + pSum;
    }, 0);
  }, [sanitizedMaoObra]);

  const totalDevedor = useMemo(() => {
    return Math.max(0, totalOrcado - totalPago);
  }, [totalOrcado, totalPago]);

  const percentualGeral = useMemo(() => {
    if (totalOrcado === 0) return 0;
    return Math.min(100, Math.round((totalPago / totalOrcado) * 100));
  }, [totalOrcado, totalPago]);

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E4E6EB] font-sans tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#F27D26]" />
            Mão de Obra e Orçamentos
          </h2>
          <p className="text-xs text-[#9BA1B1] mt-1">
            Gerencie contratos, orçamentos totais cobrados e registre adiantamentos (vales) de pedreiros e equipes.
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Contratar Profissional
          </button>
        )}
      </div>

      {/* Quick Stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Orçamentos Totais</p>
            <h3 className="text-base font-bold text-[#E4E6EB] mt-0.5">
              R$ {totalOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-[#9BA1B1]">{sanitizedMaoObra.length} profissionais contratados</p>
          </div>
        </div>

        <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Total Pago (Vales)</p>
            <h3 className="text-base font-bold text-emerald-400 mt-0.5">
              R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-[#9BA1B1]">{percentualGeral}% do orçamento liquidado</p>
          </div>
        </div>

        <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3">
          <div className="p-2.5 bg-[#F27D26]/10 text-[#F27D26] rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Restante a Pagar</p>
            <h3 className="text-base font-bold text-[#F27D26] mt-0.5">
              R$ {totalDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-[#9BA1B1]">Saldo restante da mão de obra</p>
          </div>
        </div>

        <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex flex-col justify-center">
          <div className="flex justify-between text-[10px] text-[#9BA1B1] font-bold uppercase mb-1">
            <span>Progresso da Quitação</span>
            <span>{percentualGeral}%</span>
          </div>
          <div className="w-full bg-[#0F1115] h-2 rounded-full overflow-hidden border border-[#2D323D]/50">
            <div 
              className="bg-gradient-to-r from-[#F27D26] to-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${percentualGeral}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit professional form */}
      {showAddForm && (
        <div id="form-mao-obra" className="bg-[#1C2129] p-6 rounded-2xl border border-[#2D323D] shadow-lg animate-fadeIn">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-[#E4E6EB] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#F27D26]" />
              {editingMaoObra ? 'Editar Cadastro de Profissional' : 'Contratar Novo Profissional'}
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
                  placeholder="Ex: Pedro de Alcântara (Pedreiro)"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Cargo / Especialidade *
                </label>
                <input
                  type="text"
                  required
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                  placeholder="Ex: Pedreiro, Eletricista, Encanador, Mestre de Obra..."
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Valor Fechado do Orçamento (R$) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={valorContrato}
                  onChange={(e) => setValorContrato(e.target.value)}
                  placeholder="Ex: 8500.00"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Data de Contratação *
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
                  Forma de Pagto Preferencial *
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
                Escopo do Contrato / Observações
              </label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Reboco completo da casa e colocação de pisos nas áreas externas."
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
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] disabled:bg-[#F27D26]/50 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
              >
                {loading ? 'Salvando...' : (editingMaoObra ? 'Salvar Contrato' : 'Cadastrar Profissional')}
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
            placeholder="Buscar profissional por nome, cargo ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1] focus:outline-none focus:border-[#F27D26]"
          />
        </div>
        <p className="text-[10px] text-[#9BA1B1] italic">
          💡 Clique em um profissional para visualizar e gerenciar seus vales e adiantamentos.
        </p>
      </div>

      {/* Labor Table */}
      <div className="bg-[#1C2129] rounded-2xl border border-[#2D323D] overflow-hidden">
        {filteredMaoObra.length > 0 ? (
          <div className="divide-y divide-[#2D323D]">
            {filteredMaoObra.map((item) => {
              const totalPagoProf = item.pagamentos.reduce((acc, p) => acc + p.valor, 0);
              const devedorProf = Math.max(0, item.valorContrato - totalPagoProf);
              const percentualProf = item.valorContrato === 0 ? 0 : Math.min(100, Math.round((totalPagoProf / item.valorContrato) * 100));
              const isExpanded = !!expandedProfIds[item.id];

              return (
                <div key={item.id} className="transition-all duration-200">
                  {/* Master row */}
                  <div 
                    onClick={() => toggleExpand(item.id)}
                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#16191F]/40 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3.5 w-full md:w-1/3">
                      <div className="p-2.5 bg-[#F27D26]/10 text-[#F27D26] rounded-xl shrink-0 mt-0.5">
                        <User className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#E4E6EB] text-xs flex items-center gap-2">
                          {item.nome}
                          <span className="px-2 py-0.5 bg-[#0F1115] text-[#9BA1B1] rounded text-[9px] font-mono border border-[#2D323D]">
                            {item.funcao}
                          </span>
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-[#9BA1B1] mt-1">
                          {item.cpf && <span>CPF: {item.cpf}</span>}
                          {item.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {item.telefone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial stats of this professional */}
                    <div className="grid grid-cols-3 gap-6 w-full md:w-1/2 text-left md:text-right md:justify-end">
                      <div>
                        <span className="text-[9px] text-[#9BA1B1] uppercase font-semibold block">Orçamento</span>
                        <span className="font-bold text-xs text-[#E4E6EB] font-mono block mt-0.5">
                          R$ {item.valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#9BA1B1] uppercase font-semibold block">Total Pago</span>
                        <span className="font-bold text-xs text-emerald-400 font-mono block mt-0.5">
                          R$ {totalPagoProf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#9BA1B1] uppercase font-semibold block">Restante</span>
                        <span className="font-bold text-xs text-[#F27D26] font-mono block mt-0.5">
                          R$ {devedorProf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Visual bar and toggle */}
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-2.5 md:pt-0 border-t border-[#2D323D]/50 md:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#E4E6EB] font-mono">{percentualProf}%</span>
                        <div className="w-16 bg-[#0F1115] h-1.5 rounded-full overflow-hidden border border-[#2D323D]">
                          <div className="bg-emerald-500 h-full" style={{ width: `${percentualProf}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openValeModal(item);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          title="Lançar vale / adiantamento"
                        >
                          <Plus className="w-3 h-3" />
                          Vale
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(item);
                          }}
                          className="p-1.5 text-[#9BA1B1] hover:text-[#F27D26] hover:bg-[#F27D26]/10 rounded-lg transition-all cursor-pointer"
                          title="Editar contrato"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = await confirmAction({
                              title: 'Excluir Profissional',
                              message: `Tem certeza que deseja excluir o cadastro do profissional "${item.nome}"? Todos os vales, adiantamentos e lançamentos financeiros correspondentes serão excluídos permanentemente.`,
                              confirmText: 'Excluir Profissional',
                              cancelText: 'Cancelar',
                              variant: 'danger'
                            });
                            if (confirmed) {
                              onDeleteMaoObra(item);
                            }
                          }}
                          className="p-1.5 text-[#9BA1B1] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="Excluir profissional"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="p-1 text-[#9BA1B1]">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Payments / Vales detail panel */}
                  {isExpanded && (
                    <div className="bg-[#13171F] px-6 py-5 border-t border-[#2D323D]/40 space-y-4 animate-fadeIn">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-[#2D323D]/30">
                        <div>
                          <h5 className="text-[11px] font-bold text-[#E4E6EB] uppercase tracking-wider flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-emerald-400" />
                            Histórico de Vales e Adiantamentos
                          </h5>
                          <p className="text-[10px] text-[#9BA1B1] mt-0.5">
                            Abaixo estão todos os adiantamentos já pagos e vales concedidos para {item.nome}.
                          </p>
                        </div>
                        <button
                          onClick={() => openValeModal(item)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-[#0F1115] rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Registrar Vale / Adiantamento
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Contract summary and details on left */}
                        <div className="space-y-3 bg-[#0F1115]/50 p-4 rounded-xl border border-[#2D323D]/50 text-xs">
                          <h6 className="font-bold text-[#E4E6EB] uppercase text-[10px] tracking-wider text-[#F27D26]">Detalhes do Contrato</h6>
                          <div className="space-y-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-[#9BA1B1]">Data de Início:</span>
                              <span className="text-[#E4E6EB] font-medium">{new Date(item.dataPagamento).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#9BA1B1]">Forma de Pagto Padrão:</span>
                              <span className="text-[#E4E6EB] font-medium">{item.formaPagamento}</span>
                            </div>
                            {item.cpf && (
                              <div className="flex justify-between">
                                <span className="text-[#9BA1B1]">CPF:</span>
                                <span className="text-[#E4E6EB] font-mono">{item.cpf}</span>
                              </div>
                            )}
                            {item.telefone && (
                              <div className="flex justify-between">
                                <span className="text-[#9BA1B1]">Telefone:</span>
                                <span className="text-[#E4E6EB]">{item.telefone}</span>
                              </div>
                            )}
                          </div>
                          {item.observacao && (
                            <div className="pt-2.5 border-t border-[#2D323D]/30">
                              <span className="text-[10px] font-semibold text-[#9BA1B1] uppercase block mb-1">Escopo do Serviço / Obs:</span>
                              <p className="text-[#E4E6EB] italic leading-relaxed text-[11px] font-sans">"{item.observacao}"</p>
                            </div>
                          )}
                        </div>

                        {/* List of vales on right */}
                        <div className="lg:col-span-2">
                          {item.pagamentos.length > 0 ? (
                            <div className="overflow-x-auto border border-[#2D323D]/40 rounded-xl">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-[#2D323D]/40 bg-[#0F1115]/60 text-[9px] text-[#9BA1B1] font-bold uppercase">
                                    <th className="py-2.5 px-4">Data do Vale</th>
                                    <th className="py-2.5 px-4">Valor</th>
                                    <th className="py-2.5 px-4">Forma de Pagto</th>
                                    <th className="py-2.5 px-4">Descrição / Observação</th>
                                    <th className="py-2.5 px-4 text-right">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2D323D]/30 text-xs text-[#E4E6EB]">
                                  {item.pagamentos.map((p) => (
                                    <tr key={p.id} className="hover:bg-[#0F1115]/30">
                                      <td className="py-3 px-4 font-mono text-[#9BA1B1]">
                                        {new Date(p.data).toLocaleDateString('pt-BR')}
                                      </td>
                                      <td className="py-3 px-4 font-mono font-bold text-[#E4E6EB]">
                                        R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-3 px-4 text-[#9BA1B1]">
                                        <span className="px-1.5 py-0.5 bg-[#0F1115] rounded text-[10px] border border-[#2D323D]/60 text-[#E4E6EB]">
                                          {p.formaPagamento}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-[#9BA1B1] max-w-xs truncate" title={p.observacao || 'Sem observação'}>
                                        {p.observacao || <span className="text-[#9BA1B1]/40 italic">Sem observação</span>}
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => openValeModal(item, p)}
                                            className="p-1 text-[#9BA1B1] hover:text-[#F27D26] hover:bg-[#F27D26]/10 rounded transition-all cursor-pointer"
                                            title="Editar vale"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteVale(item, p.id)}
                                            className="p-1 text-[#9BA1B1] hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                                            title="Excluir vale"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-[#0F1115]/30 rounded-xl border border-dashed border-[#2D323D]/50 text-[#9BA1B1] text-xs">
                              <Coins className="w-6 h-6 text-[#2D323D]/70 mx-auto mb-2" />
                              Nenhum vale ou retirada foi registrado ainda para este profissional.
                              <button 
                                onClick={() => openValeModal(item)}
                                className="text-[#F27D26] hover:underline font-bold block mx-auto mt-2"
                              >
                                Clique aqui para conceder o primeiro vale.
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-[#9BA1B1] text-xs">
            <Briefcase className="w-10 h-10 text-[#2D323D] mx-auto mb-3" />
            Nenhum profissional de mão de obra registrado para esta obra.
            <button
              onClick={() => setShowAddForm(true)}
              className="text-[#F27D26] hover:underline font-bold block mx-auto mt-2"
            >
              Registrar o primeiro profissional agora
            </button>
          </div>
        )}
      </div>

      {/* Vale / Retirada Form Modal */}
      {(showValeModalFor || editingVale) && (
        <div className="fixed inset-0 bg-[#000]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#1C2129] w-full max-w-md p-6 rounded-2xl border border-[#2D323D] shadow-2xl relative">
            <button
              onClick={closeValeModal}
              className="absolute top-4 right-4 text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors p-1 hover:bg-[#2D323D]/40 rounded-lg"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="text-sm font-bold text-[#E4E6EB] uppercase tracking-wider mb-1 flex items-center gap-1.5 border-b border-[#2D323D]/50 pb-3">
              <Coins className="w-4 h-4 text-emerald-400" />
              {editingVale ? 'Editar Vale / Retirada' : 'Registrar Vale / Retirada'}
            </h3>
            
            <p className="text-[11px] text-[#9BA1B1] mb-4">
              Profissional: <span className="font-bold text-[#E4E6EB]">{editingVale ? editingVale.professional.nome : showValeModalFor?.nome}</span>
            </p>

            {valeError && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
                {valeError}
              </div>
            )}

            <form onSubmit={handleValeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Valor Retirado (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-[#9BA1B1] font-bold">R$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={valeValor}
                    onChange={(e) => setValeValor(e.target.value)}
                    placeholder="Ex: 500.00"
                    className="w-full pl-8 pr-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                    Data do Adiantamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={valeData}
                    onChange={(e) => setValeData(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={valeFormaPagamento}
                    onChange={(e) => setValeFormaPagamento(e.target.value)}
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
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Descrição / Finalidade do Vale
                </label>
                <input
                  type="text"
                  value={valeObservacao}
                  onChange={(e) => setValeObservacao(e.target.value)}
                  placeholder="Ex: Adiantamento para compra de sapatos ou final de semana 1."
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#2D323D]/40">
                <button
                  type="button"
                  onClick={closeValeModal}
                  className="px-4 py-2 text-xs font-semibold text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={valeLoading}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-[#0F1115] rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
                >
                  {valeLoading ? 'Salvando...' : (editingVale ? 'Salvar Alterações' : 'Confirmar Vale')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

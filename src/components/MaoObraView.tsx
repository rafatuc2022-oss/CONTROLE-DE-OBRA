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
  Edit2,
  DollarSign,
  CheckCircle2,
  X,
  AlertTriangle,
  History
} from 'lucide-react';
import { Obra, MaoObra, PagamentoMaoObra } from '../types';
import { useNotification } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';

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
  const { confirmAction, showToast } = useNotification();
  
  // Local state for UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaoObra, setEditingMaoObra] = useState<MaoObra | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedreiroId, setSelectedPedreiroId] = useState<string | null>(null);

  // Pedreiro Registration Form Fields (SIMPLIFIED)
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [valorContrato, setValorContrato] = useState('');

  // Vale Form Fields
  const [valeValor, setValeValor] = useState('');
  const [valeData, setValeData] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPagamento, setTipoPagamento] = useState<'vale' | 'final'>('vale');
  const [valeObservacao, setValeObservacao] = useState('');

  const [loading, setLoading] = useState(false);
  const [valeLoading, setValeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valeError, setValeError] = useState<string | null>(null);

  // Sanitizes professional records to cleanly handle legacy/missing values
  const sanitizedMaoObra = useMemo(() => {
    return maoObra.map(item => {
      const pagamentos = item.pagamentos || [];
      const vContrato = item.valorContrato || item.valor || 0;
      
      let finalPagamentos = [...pagamentos];
      if (pagamentos.length === 0 && item.valor > 0) {
        finalPagamentos = [
          {
            id: 'legacy-payment',
            valor: item.valor,
            data: item.dataPagamento || new Date().toISOString().split('T')[0],
            formaPagamento: item.formaPagamento || 'Pix',
            observacao: item.observacao || 'Lançamento original',
            tipo: 'final'
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

  // Set initial selected pedreiro once loaded if none is selected
  const activeSelectedId = useMemo(() => {
    if (selectedPedreiroId && sanitizedMaoObra.some(p => p.id === selectedPedreiroId)) {
      return selectedPedreiroId;
    }
    return sanitizedMaoObra.length > 0 ? sanitizedMaoObra[0].id : null;
  }, [selectedPedreiroId, sanitizedMaoObra]);

  const selectedPedreiro = useMemo(() => {
    return sanitizedMaoObra.find(p => p.id === activeSelectedId) || null;
  }, [activeSelectedId, sanitizedMaoObra]);

  const filteredMaoObra = useMemo(() => {
    return sanitizedMaoObra.filter(item => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          item.nome.toLowerCase().includes(query) ||
          item.telefone?.includes(query)
        );
      }
      return true;
    });
  }, [sanitizedMaoObra, searchTerm]);

  // General Financial Totals
  const totalOrcado = useMemo(() => {
    return sanitizedMaoObra.reduce((sum, item) => sum + item.valorContrato, 0);
  }, [sanitizedMaoObra]);

  const totalValesGeral = useMemo(() => {
    return sanitizedMaoObra.reduce((sum, item) => {
      const vSum = item.pagamentos
        .filter(p => p.tipo === 'vale')
        .reduce((acc, p) => acc + p.valor, 0);
      return sum + vSum;
    }, 0);
  }, [sanitizedMaoObra]);

  const totalFinaisGeral = useMemo(() => {
    return sanitizedMaoObra.reduce((sum, item) => {
      const fSum = item.pagamentos
        .filter(p => p.tipo === 'final' || !p.tipo)
        .reduce((acc, p) => acc + p.valor, 0);
      return sum + fSum;
    }, 0);
  }, [sanitizedMaoObra]);

  const totalDevedor = useMemo(() => {
    return Math.max(0, totalOrcado - totalValesGeral - totalFinaisGeral);
  }, [totalOrcado, totalValesGeral, totalFinaisGeral]);

  const percentualGeral = useMemo(() => {
    if (totalOrcado === 0) return 0;
    return Math.min(100, Math.round(((totalValesGeral + totalFinaisGeral) / totalOrcado) * 100));
  }, [totalOrcado, totalValesGeral, totalFinaisGeral]);

  // Reset registration form
  const resetForm = () => {
    setNome('');
    setTelefone('');
    setValorContrato('');
    setError(null);
    setShowAddForm(false);
    setEditingMaoObra(null);
  };

  const handleEditClick = (item: MaoObra) => {
    setEditingMaoObra(item);
    setNome(item.nome);
    setTelefone(item.telefone || '');
    setValorContrato(item.valorContrato.toString());
    setShowAddForm(true);

    const formElement = document.getElementById('form-cadastro-pedreiro');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit Pedreiro Registration
  const handlePedreiroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !valorContrato) {
      setError('Por favor, preencha o nome e o valor contratado.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const parsedValContrato = Number(valorContrato);
      if (isNaN(parsedValContrato) || parsedValContrato <= 0) {
        throw new Error('O valor contratado deve ser um número maior que zero.');
      }

      if (editingMaoObra) {
        await onUpdateMaoObra(editingMaoObra.id, {
          nome,
          telefone: telefone || '',
          valorContrato: parsedValContrato,
        }, editingMaoObra);
      } else {
        const result = await onAddMaoObra({
          obraId: obra.id,
          nome,
          funcao: 'Pedreiro',
          valor: 0,
          valorContrato: parsedValContrato,
          dataPagamento: new Date().toISOString().split('T')[0],
          formaPagamento: 'Pix',
          cpf: '',
          telefone: telefone || '',
          observacao: '',
          pagamentos: []
        });
        if (result && result.id) {
          setSelectedPedreiroId(result.id);
        }
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao registrar o pedreiro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Vale/Adiantamento or Pagamento Efetivo
  const handleValeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPedreiroId = activeSelectedId;

    if (!targetPedreiroId) {
      setValeError('Selecione um pedreiro para registrar o pagamento.');
      return;
    }
    if (!valeValor || !valeData) {
      setValeError('Preencha o valor e a data do pagamento.');
      return;
    }

    setValeLoading(true);
    setValeError(null);
    try {
      const parsedVal = Number(valeValor);
      if (isNaN(parsedVal) || parsedVal <= 0) {
        throw new Error('O valor deve ser maior que zero.');
      }

      await onAddMaoObraVale(targetPedreiroId, {
        valor: parsedVal,
        data: valeData,
        formaPagamento: 'Pix',
        observacao: valeObservacao || (tipoPagamento === 'vale' ? 'Pagamento de Vale' : 'Pagamento Efetivo (Final)'),
        tipo: tipoPagamento
      });

      // Reset vale fields
      setValeValor('');
      setValeObservacao('');
      setValeData(new Date().toISOString().split('T')[0]);
      showToast(
        tipoPagamento === 'vale' 
          ? 'Vale registrado e abatido do orçamento (sem alterar caixa da obra)!' 
          : 'Pagamento efetivo registrado e descontado do caixa da obra!', 
        'success'
      );
    } catch (err: any) {
      console.error(err);
      setValeError(err.message || 'Erro ao registrar o pagamento. Tente novamente.');
    } finally {
      setValeLoading(false);
    }
  };

  // Delete Vale
  const handleDeleteVale = async (pedreiroId: string, paymentId: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Vale',
      message: 'Tem certeza de que deseja excluir este vale? O saldo restante do pedreiro e o balanço da obra serão recalculados.',
      confirmText: 'Excluir Vale',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      if (paymentId === 'legacy-payment') {
        const ped = sanitizedMaoObra.find(p => p.id === pedreiroId);
        if (ped) {
          await onUpdateMaoObra(pedreiroId, {
            valor: 0,
            pagamentos: []
          }, ped);
        }
      } else {
        await onDeleteMaoObraVale(pedreiroId, paymentId);
      }
      showToast('Vale excluído com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao excluir vale:', err);
    }
  };

  // Delete Pedreiro
  const handleDeletePedreiro = async (pedreiro: MaoObra) => {
    const confirmed = await confirmAction({
      title: 'Excluir Pedreiro',
      message: `Tem certeza que deseja excluir o cadastro de "${pedreiro.nome}"? Todos os vales correspondentes serão excluídos permanentemente.`,
      confirmText: 'Excluir Pedreiro',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await onDeleteMaoObra(pedreiro);
      if (activeSelectedId === pedreiro.id) {
        setSelectedPedreiroId(null);
      }
    } catch (err: any) {
      console.error('Erro ao excluir pedreiro:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E4E6EB] font-sans tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#F27D26]" />
            Mão de Obra (Pedreiros)
          </h2>
          <p className="text-xs text-[#9BA1B1] mt-1">
            Controle os contratos de prestação de serviço, registre adiantamentos através de vales e acompanhe o saldo a pagar em tempo real.
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Pedreiro
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
            <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Orçamento Total</p>
            <h3 className="text-base font-bold text-[#E4E6EB] mt-0.5">
              R$ {totalOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-[#9BA1B1]">{sanitizedMaoObra.length} profissionais</p>
          </div>
        </div>

        <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Vales Concedidos</p>
            <h3 className="text-base font-bold text-emerald-400 mt-0.5">
              R$ {totalValesGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-[#9BA1B1]">Antecipação (Sem impacto no caixa)</p>
          </div>
        </div>

        <div className="bg-[#1C2129] p-4 rounded-xl border border-[#2D323D] flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#9BA1B1] uppercase font-semibold">Efetivamente Pago</p>
            <h3 className="text-base font-bold text-amber-500 mt-0.5">
              R$ {totalFinaisGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-[#9BA1B1]">Liquidado (Descontado do caixa)</p>
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
            <p className="text-[9px] text-[#9BA1B1]">Balanço final a quitar</p>
          </div>
        </div>
      </div>

      {/* Add/Edit professional form */}
      {showAddForm && (
        <div id="form-cadastro-pedreiro" className="bg-[#1C2129] p-6 rounded-2xl border border-[#2D323D] shadow-lg animate-fadeIn">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-[#E4E6EB] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#F27D26]" />
              {editingMaoObra ? 'Editar Cadastro de Pedreiro' : 'Cadastrar Novo Pedreiro'}
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

          <form onSubmit={handlePedreiroSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Nome do Pedreiro *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: José da Silva"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Número de Telefone
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Valor Total Contratado (R$) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={valorContrato}
                  onChange={(e) => setValorContrato(e.target.value)}
                  placeholder="Ex: 5000.00"
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
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] disabled:bg-[#F27D26]/50 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
              >
                {loading ? 'Salvando...' : (editingMaoObra ? 'Salvar Alterações' : 'Salvar Cadastro')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Two-Column Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Pedreiro List (col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#1C2129] rounded-2xl border border-[#2D323D] overflow-hidden p-5 space-y-4 shadow-md">
            
            {/* Search Box */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9BA1B1]" />
                <input
                  type="text"
                  placeholder="Buscar pedreiro por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1] focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            {/* Pedreiros List */}
            <div className="space-y-3">
              {filteredMaoObra.length > 0 ? (
                filteredMaoObra.map((item) => {
                  const totalValesProf = item.pagamentos
                    .filter(p => p.tipo === 'vale')
                    .reduce((acc, p) => acc + p.valor, 0);
                  const totalFinaisProf = item.pagamentos
                    .filter(p => p.tipo === 'final' || !p.tipo)
                    .reduce((acc, p) => acc + p.valor, 0);
                  const devedorProf = Math.max(0, item.valorContrato - totalValesProf - totalFinaisProf);
                  const isSelected = activeSelectedId === item.id;
                  const isPago = devedorProf <= 0;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedPedreiroId(item.id)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-[#1D2433] border-[#F27D26] shadow-md shadow-[#F27D26]/5 ring-1 ring-[#F27D26]' 
                          : 'bg-[#13171F] border-[#2D323D] hover:bg-[#161B26]'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isPago ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#F27D26]/10 text-[#F27D26]'
                          }`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#E4E6EB] text-xs flex items-center gap-2">
                              {item.nome}
                            </h4>
                            {item.telefone && (
                              <p className="flex items-center gap-1 text-[10px] text-[#9BA1B1] mt-1">
                                <Phone className="w-3 h-3 text-[#9BA1B1]" />
                                {item.telefone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isPago ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
                              ● Quitante
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-bold uppercase tracking-wider">
                              ● Em aberto
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mini Financial Display inside card */}
                      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-[#2D323D]/50 text-left text-[10px]">
                        <div>
                          <span className="text-[9px] text-[#9BA1B1] uppercase block">Contratado</span>
                          <span className="font-semibold text-[#E4E6EB] font-mono">
                            R$ {item.valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9BA1B1] uppercase block">Vales</span>
                          <span className="font-semibold text-emerald-400 font-mono">
                            R$ {totalValesProf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9BA1B1] uppercase block">Efet. Pago</span>
                          <span className="font-semibold text-amber-500 font-mono">
                            R$ {totalFinaisProf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9BA1B1] uppercase block">Restante</span>
                          <span className="font-semibold text-[#F27D26] font-mono">
                            R$ {devedorProf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons footer */}
                      <div className="flex justify-end gap-2 mt-3 pt-2.5 border-t border-[#2D323D]/30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(item);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[#9BA1B1] hover:text-[#F27D26] hover:bg-[#F27D26]/10 rounded-md text-[10px] font-medium transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePedreiro(item);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[#9BA1B1] hover:text-rose-500 hover:bg-rose-500/10 rounded-md text-[10px] font-medium transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-[#13171F] rounded-xl border border-dashed border-[#2D323D]/50 text-[#9BA1B1] text-xs">
                  <Briefcase className="w-8 h-8 text-[#2D323D] mx-auto mb-2" />
                  Nenhum pedreiro cadastrado.
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-[#F27D26] hover:underline font-bold block mx-auto mt-1"
                  >
                    Clique aqui para adicionar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pagamento / Vale Section (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1C2129] rounded-2xl border border-[#2D323D] p-5 space-y-5 shadow-md">
            
            <div className="border-b border-[#2D323D]/50 pb-3 flex items-center gap-2">
              <Coins className="w-4.5 h-4.5 text-emerald-400" />
              <h3 className="text-xs font-bold text-[#E4E6EB] uppercase tracking-wider">
                Registrar Pagamento / Vale
              </h3>
            </div>

            {/* Select/Dropdown to specify pedreiro */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Nome do Pedreiro
                </label>
                <select
                  value={activeSelectedId || ''}
                  onChange={(e) => setSelectedPedreiroId(e.target.value || null)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26] cursor-pointer"
                >
                  <option value="">-- Selecione o Pedreiro --</option>
                  {sanitizedMaoObra.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[#9BA1B1]/60 mt-1">
                  Selecione da lista ao lado ou escolha acima.
                </p>
              </div>

              {/* Form to submit vale/final if a pedreiro is selected */}
              <form onSubmit={handleValeSubmit} className="space-y-4">
                {valeError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs animate-fadeIn">
                    {valeError}
                  </div>
                )}

                {/* Payment Type Selector Toggle */}
                <div>
                  <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                    Tipo de Lançamento *
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0F1115] p-1 rounded-lg border border-[#2D323D]">
                    <button
                      type="button"
                      onClick={() => setTipoPagamento('vale')}
                      className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        tipoPagamento === 'vale'
                          ? 'bg-[#1C2129] text-emerald-400 shadow-sm border border-[#2D323D]'
                          : 'text-[#9BA1B1] hover:text-[#E4E6EB]'
                      }`}
                    >
                      Vale (Adiantamento)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoPagamento('final');
                        if (selectedPedreiro) {
                          const vVales = selectedPedreiro.pagamentos
                            .filter(p => p.tipo === 'vale')
                            .reduce((sum, p) => sum + p.valor, 0);
                          const vFinais = selectedPedreiro.pagamentos
                            .filter(p => p.tipo === 'final' || !p.tipo)
                            .reduce((sum, p) => sum + p.valor, 0);
                          const remainingLiquid = Math.max(0, selectedPedreiro.valorContrato - vVales - vFinais);
                          setValeValor(remainingLiquid > 0 ? remainingLiquid.toString() : '');
                        }
                      }}
                      className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        tipoPagamento === 'final'
                          ? 'bg-[#1C2129] text-amber-500 shadow-sm border border-[#2D323D]'
                          : 'text-[#9BA1B1] hover:text-[#E4E6EB]'
                      }`}
                    >
                      Pgto Efetivo (Final)
                    </button>
                  </div>
                  <p className="text-[9px] text-[#9BA1B1]/60 mt-1">
                    {tipoPagamento === 'vale' 
                      ? 'Não abate do caixa da obra, apenas reduz o orçamento do profissional.' 
                      : 'Abate diretamente do caixa da obra.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                      Data do Lançamento *
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
                      Valor (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-[#9BA1B1] font-bold font-mono">R$</span>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={valeValor}
                        onChange={(e) => setValeValor(e.target.value)}
                        placeholder="Ex: 250.00"
                        className="w-full pl-8 pr-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs font-mono text-[#E4E6EB] focus:outline-none focus:border-[#F27D26]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                    Observação / Descrição
                  </label>
                  <input
                    type="text"
                    value={valeObservacao}
                    onChange={(e) => setValeObservacao(e.target.value)}
                    placeholder="Ex: Adiantamento para compra de EPI, pagamento de quitação"
                    className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/40 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={valeLoading || !activeSelectedId}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/20 disabled:text-[#9BA1B1]/50 disabled:cursor-not-allowed text-[#0F1115] rounded-lg text-xs font-bold shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {valeLoading ? 'Registrando...' : (tipoPagamento === 'vale' ? 'Registrar Vale' : 'Registrar Pgto Efetivo')}
                </button>
              </form>
            </div>

            {/* Selected Pedreiro Financial Details Box & History */}
            {selectedPedreiro ? (
              <div className="pt-4 border-t border-[#2D323D]/50 space-y-4 animate-fadeIn">
                
                {/* Resumo Financeiro do Pedreiro Selecionado */}
                {(() => {
                  const totalVales = selectedPedreiro.pagamentos
                    .filter(p => p.tipo === 'vale')
                    .reduce((sum, p) => sum + p.valor, 0);
                  const totalFinais = selectedPedreiro.pagamentos
                    .filter(p => p.tipo === 'final' || !p.tipo)
                    .reduce((sum, p) => sum + p.valor, 0);
                  const remainingLiquid = Math.max(0, selectedPedreiro.valorContrato - totalVales - totalFinais);

                  return (
                    <div className="bg-[#13171F] p-4 rounded-xl border border-[#2D323D]/60 space-y-3">
                      <div className="flex justify-between items-center border-b border-[#2D323D]/40 pb-2">
                        <span className="text-[10px] font-bold text-[#F27D26] uppercase">Resumo de Quitação</span>
                        {remainingLiquid <= 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded uppercase">
                            Quitado (Pago)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded uppercase">
                            Em Aberto
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1.5 text-xs text-[#E4E6EB]">
                        <div className="flex justify-between">
                          <span className="text-[#9BA1B1]">Orçamento Total Contratado:</span>
                          <span className="font-semibold font-mono text-[#E4E6EB]">
                            R$ {selectedPedreiro.valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-[#9BA1B1]">(-) Total de Vales Concedidos:</span>
                          <span className="font-semibold font-mono text-emerald-400">
                            R$ {totalVales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#9BA1B1]">(-) Valor Efetivamente Pago:</span>
                          <span className="font-semibold font-mono text-amber-500">
                            R$ {totalFinais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <div className="flex justify-between pt-1.5 border-t border-[#2D323D]/30 text-sm font-bold">
                          <span className="text-[#9BA1B1]">Valor Líquido Restante:</span>
                          <span className="font-mono text-[#F27D26]">
                            R$ {remainingLiquid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Historico de Lançamentos do Pedreiro Selecionado */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[#9BA1B1] text-[10px] uppercase font-bold tracking-wider">
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lançamentos Registrados ({selectedPedreiro.nome})</span>
                  </div>

                  {selectedPedreiro.pagamentos.length > 0 ? (
                    <div className="border border-[#2D323D]/40 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-[#2D323D]/30">
                      {selectedPedreiro.pagamentos.map((p) => {
                        const isVale = p.tipo === 'vale';
                        return (
                          <div key={p.id} className="p-3 bg-[#13171F] flex items-center justify-between text-xs hover:bg-[#161B26] transition-colors">
                            <div className="space-y-0.5 max-w-[80%]">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-mono font-bold ${isVale ? 'text-emerald-400' : 'text-amber-500'}`}>
                                  R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className={`px-1.5 py-0.2 text-[8px] font-bold rounded uppercase ${
                                  isVale ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                                }`}>
                                  {isVale ? 'Vale' : 'Efetivo'}
                                </span>
                              </div>
                              {p.observacao && (
                                <p className="text-[10px] text-[#E4E6EB]/80 italic break-words">
                                  "{p.observacao}"
                                </p>
                              )}
                              <div className="flex items-center gap-1 text-[9px] text-[#9BA1B1]">
                                <Calendar className="w-3 h-3 text-[#9BA1B1]" />
                                <span>{new Date(p.data).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleDeleteVale(selectedPedreiro.id, p.id)}
                              className="p-1.5 text-[#9BA1B1] hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all cursor-pointer shrink-0"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-[#13171F] rounded-xl border border-dashed border-[#2D323D]/50 text-[#9BA1B1] text-xs">
                      Nenhum pagamento ou vale registrado para este pedreiro.
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-8 bg-[#13171F]/50 rounded-xl border border-[#2D323D]/40 text-[#9BA1B1] text-xs flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500/80" />
                <span>Nenhum pedreiro selecionado.</span>
                <span className="text-[10px] text-[#9BA1B1]/60">Cadastre ou selecione um pedreiro ao lado para registrar pagamentos e ver o histórico.</span>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  Filter, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShoppingBag, 
  Briefcase, 
  Coins 
} from 'lucide-react';
import { Obra, Entrada, Saida, MaoObra, Material } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  obra: Obra;
  entradas: Entrada[];
  saidas: Saida[];
  maoObra: MaoObra[];
  materiais: Material[];
}

type PeriodType = 'diário' | 'semanal' | 'mensal' | 'personalizado';

export default function ReportModal({
  isOpen,
  onClose,
  obra,
  entradas,
  saidas,
  maoObra,
  materiais
}: ReportModalProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('mensal');
  const [singleDate, setSingleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Helper: Date range calculation based on selection
  const resolvedRange = useMemo(() => {
    let start = '';
    let end = '';

    if (periodType === 'diário') {
      start = singleDate;
      end = singleDate;
    } else if (periodType === 'semanal') {
      // Last 7 days from endDate
      const endD = new Date(endDate);
      const startD = new Date(endDate);
      startD.setDate(endD.getDate() - 6);
      start = startD.toISOString().split('T')[0];
      end = endDate;
    } else if (periodType === 'mensal') {
      // Full selected month
      const [year, month] = selectedMonth.split('-');
      start = `${year}-${month}-01`;
      // Find last day of month
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const lastDayStr = lastDay < 10 ? `0${lastDay}` : `${lastDay}`;
      end = `${year}-${month}-${lastDayStr}`;
    } else {
      start = startDate;
      end = endDate;
    }

    return { start, end };
  }, [periodType, singleDate, selectedMonth, startDate, endDate]);

  // Helper to verify if a date is within selected range
  const isWithinRange = (dateStr: string) => {
    if (!dateStr) return false;
    // Normalize format
    const formattedDate = dateStr.slice(0, 10);
    return formattedDate >= resolvedRange.start && formattedDate <= resolvedRange.end;
  };

  // Filter Data
  const filteredEntradas = useMemo(() => {
    return entradas.filter(e => isWithinRange(e.data));
  }, [entradas, resolvedRange]);

  const filteredSaidas = useMemo(() => {
    return saidas.filter(s => isWithinRange(s.data));
  }, [saidas, resolvedRange]);

  const filteredMateriais = useMemo(() => {
    return materiais.filter(m => isWithinRange(m.dataCompra));
  }, [materiais, resolvedRange]);

  // Filter Labor (Mão de Obra) Payments
  // Checking individual sub-payments if listed, otherwise falling back to main contract payments
  const filteredMaoObraList = useMemo(() => {
    const list: { profissional: string; funcao: string; valor: number; data: string; descricao: string; tipo: string }[] = [];
    
    maoObra.forEach(m => {
      const pagamentos = m.pagamentos || [];
      if (pagamentos.length > 0) {
        pagamentos.forEach(p => {
          if (isWithinRange(p.data)) {
            list.push({
              profissional: m.nome,
              funcao: m.funcao,
              valor: p.valor,
              data: p.data,
              descricao: p.observacao || (p.tipo === 'vale' ? 'Vale / Adiantamento' : 'Pagamento Efetivo'),
              tipo: p.tipo || 'final'
            });
          }
        });
      } else {
        if (isWithinRange(m.dataPagamento)) {
          list.push({
            profissional: m.nome,
            funcao: m.funcao,
            valor: m.valor || m.valorContrato || 0,
            data: m.dataPagamento,
            descricao: m.observacao || 'Pagamento total contrato',
            tipo: 'final'
          });
        }
      }
    });

    return list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [maoObra, resolvedRange]);

  // General Labor (Mão de Obra) Metrics
  const laborMetrics = useMemo(() => {
    let totalOrcadoMaoObra = 0;
    let totalValesConcedidosMaoObra = 0;
    let totalEfetivoPagoMaoObra = 0;

    maoObra.forEach(m => {
      const vContrato = m.valorContrato || m.valor || 0;
      totalOrcadoMaoObra += vContrato;

      const pagamentos = m.pagamentos || [];
      if (pagamentos.length > 0) {
        pagamentos.forEach(p => {
          if (p.tipo === 'vale') {
            totalValesConcedidosMaoObra += p.valor;
          } else {
            totalEfetivoPagoMaoObra += p.valor;
          }
        });
      } else if (m.valor > 0) {
        totalEfetivoPagoMaoObra += m.valor;
      }
    });

    const totalRestantePagarMaoObra = Math.max(0, totalOrcadoMaoObra - totalValesConcedidosMaoObra - totalEfetivoPagoMaoObra);

    return {
      totalOrcadoMaoObra,
      totalValesConcedidosMaoObra,
      totalEfetivoPagoMaoObra,
      totalRestantePagarMaoObra
    };
  }, [maoObra]);

  // Financial calculations
  const totalInflows = useMemo(() => {
    return filteredEntradas.reduce((sum, e) => sum + e.valor, 0);
  }, [filteredEntradas]);

  const totalOutflows = useMemo(() => {
    return filteredSaidas.reduce((sum, s) => sum + s.valor, 0);
  }, [filteredSaidas]);

  const totalMaterialsCost = useMemo(() => {
    return filteredMateriais.reduce((sum, m) => sum + m.valorTotal, 0);
  }, [filteredMateriais]);

  const totalLaborCost = useMemo(() => {
    return filteredMaoObraList.reduce((sum, l) => sum + l.valor, 0);
  }, [filteredMaoObraList]);

  const periodBalance = useMemo(() => {
    return totalInflows - totalOutflows;
  }, [totalInflows, totalOutflows]);

  // Outflows by Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      'Material': totalMaterialsCost,
      'Mão de obra': totalLaborCost,
    };

    filteredSaidas.forEach(s => {
      if (s.categoria !== 'Material' && s.categoria !== 'Mão de obra') {
        breakdown[s.categoria] = (breakdown[s.categoria] || 0) + s.valor;
      }
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredSaidas, totalMaterialsCost, totalLaborCost]);

  // Format date helper
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  };

  // Generate plain text report for copying
  const handleCopyText = () => {
    const periodLabel = periodType === 'diário' 
      ? `Dia: ${formatDateBR(resolvedRange.start)}`
      : periodType === 'semanal'
      ? `Semana de ${formatDateBR(resolvedRange.start)} até ${formatDateBR(resolvedRange.end)}`
      : periodType === 'mensal'
      ? `Mês: ${selectedMonth}`
      : `Período: ${formatDateBR(resolvedRange.start)} até ${formatDateBR(resolvedRange.end)}`;

    let text = `=========================================\n`;
    text += `   RELATÓRIO FINANCEIRO - OBRACONTROL\n`;
    text += `=========================================\n`;
    text += `Obra: ${obra.nome}\n`;
    text += `Cliente: ${obra.cliente}\n`;
    text += `${periodLabel}\n`;
    text += `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
    text += `-----------------------------------------\n\n`;

    text += `1. RESUMO FINANCEIRO DO PERÍODO\n`;
    text += `-----------------------------------------\n`;
    text += `Total Entradas (Aportes): R$ ${totalInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `Total Saídas (Despesas): R$ ${totalOutflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `Saldo do Período: R$ ${periodBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

    text += `2. RESUMO POR CATEGORIA DE DESPESAS\n`;
    text += `-----------------------------------------\n`;
    if (categoryBreakdown.length > 0) {
      categoryBreakdown.forEach(cat => {
        const percentage = totalOutflows > 0 ? Math.round((cat.value / totalOutflows) * 100) : 0;
        text += `- ${cat.name}: R$ ${cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)\n`;
      });
    } else {
      text += `Nenhuma despesa registrada no período.\n`;
    }
    text += `\n`;

    text += `3. COMPRAS DE MATERIAIS NO PERÍODO\n`;
    text += `-----------------------------------------\n`;
    if (filteredMateriais.length > 0) {
      filteredMateriais.forEach(m => {
        text += `- [${formatDateBR(m.dataCompra)}] ${m.quantidade} ${m.unidade} de ${m.nome} (${m.loja}): R$ ${m.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    } else {
      text += `Nenhuma compra de material cadastrada.\n`;
    }
    text += `\n`;

    text += `4. GASTOS COM MÃO DE OBRA NO PERÍODO\n`;
    text += `-----------------------------------------\n`;
    text += `Orçamento Total da Mão de Obra (Geral): R$ ${laborMetrics.totalOrcadoMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `Total de Vales Concedidos (Geral): R$ ${laborMetrics.totalValesConcedidosMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `Valor Efetivamente Pago (Geral): R$ ${laborMetrics.totalEfetivoPagoMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `Valor Restante a Pagar (Geral): R$ ${laborMetrics.totalRestantePagarMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    text += `Lançamentos no Período Selecionado:\n`;
    if (filteredMaoObraList.length > 0) {
      filteredMaoObraList.forEach(l => {
        const tipoLabel = l.tipo === 'vale' ? 'Vale' : 'Efetivo';
        text += `- [${formatDateBR(l.data)}] ${l.profissional} (${l.funcao}) [${tipoLabel}]: R$ ${l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${l.descricao}\n`;
      });
    } else {
      text += `Nenhum pagamento de mão de obra cadastrado no período.\n`;
    }
    text += `\n`;

    text += `5. FLUXO DETALHADO (ENTRADAS E SAÍDAS)\n`;
    text += `-----------------------------------------\n`;
    text += `ENTRADAS:\n`;
    if (filteredEntradas.length > 0) {
      filteredEntradas.forEach(e => {
        text += `  + [${formatDateBR(e.data)}] ${e.descricao || e.origem}: R$ ${e.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    } else {
      text += `  Nenhuma entrada registrada.\n`;
    }

    text += `SAÍDAS:\n`;
    if (filteredSaidas.length > 0) {
      filteredSaidas.forEach(s => {
        text += `  - [${formatDateBR(s.data)}] [${s.categoria}] ${s.descricao}: R$ ${s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    } else {
      text += `  Nenhuma saída registrada.\n`;
    }
    text += `\n=========================================\n`;
    text += `Gerado automaticamente via ObraControl.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn print:absolute print:inset-0 print:bg-white print:p-0">
      <div className="bg-white dark:bg-[#16191F] border border-slate-200 dark:border-[#2D323D] rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden animate-zoomIn print:border-none print:shadow-none print:h-auto print:max-w-none print:w-full">
        
        {/* Header - Hidden on Print */}
        <div className="p-5 border-b border-slate-100 dark:border-[#2D323D] flex justify-between items-center bg-slate-50 dark:bg-[#101318]/50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#F27D26]/10 rounded-lg text-[#F27D26]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-[#E4E6EB] uppercase tracking-wider">
                Gerador de Relatórios Financeiros
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9BA1B1]">
                Consolide compras, mão de obra, fluxo de caixa e saldos do período selecionado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#2D323D] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#E4E6EB] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar - Hidden on Print */}
        <div className="p-4 bg-slate-50/50 dark:bg-[#101318]/20 border-b border-slate-100 dark:border-[#2D323D] flex flex-col md:flex-row items-stretch md:items-center gap-4 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#F27D26]" />
            <span>Filtro de Período:</span>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex bg-slate-100 dark:bg-[#0F1115] p-1 rounded-xl">
            {(['diário', 'semanal', 'mensal', 'personalizado'] as PeriodType[]).map((type) => (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  periodType === type
                    ? 'bg-white dark:bg-[#16191F] text-slate-800 dark:text-[#E4E6EB] shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Dynamic Period Inputs */}
          <div className="flex-1 flex flex-wrap items-center gap-3">
            {periodType === 'diário' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-700 dark:text-[#E4E6EB] focus:outline-none"
                />
              </div>
            )}

            {periodType === 'semanal' && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Até a data de:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-700 dark:text-[#E4E6EB] focus:outline-none"
                />
                <span className="text-[10px] bg-slate-100 dark:bg-[#1C2129] px-2 py-1 rounded">
                  Início em: {formatDateBR(resolvedRange.start)}
                </span>
              </div>
            )}

            {periodType === 'mensal' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-700 dark:text-[#E4E6EB] focus:outline-none"
                />
              </div>
            )}

            {periodType === 'personalizado' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-700 dark:text-[#E4E6EB] focus:outline-none"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-700 dark:text-[#E4E6EB] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Quick Actions (Copy, Print) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1C2129] text-slate-700 dark:text-[#E4E6EB] border border-slate-200 dark:border-[#2D323D] rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#252B35] transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F27D26] text-white rounded-xl text-xs font-semibold hover:bg-[#ff8c3a] transition-all cursor-pointer shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Report Content Panel (Scrollable, Styleable for Print) */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 dark:bg-[#0F1115] text-slate-800 dark:text-[#E4E6EB] print:bg-white print:text-black print:overflow-visible print:p-0">
          
          {/* Printable Container wrapper */}
          <div className="max-w-3xl mx-auto bg-white dark:bg-[#16191F] border border-slate-200/60 dark:border-[#2D323D] rounded-2xl p-8 space-y-8 shadow-sm print:border-none print:shadow-none print:p-0">
            
            {/* Report Letterhead / Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-100 dark:border-[#2D323D] gap-4">
              <div>
                <div className="flex items-center gap-2 text-slate-800 dark:text-white print:text-black">
                  <div className="bg-[#F27D26] p-1.5 rounded-lg text-white print:bg-transparent print:text-black print:p-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-lg font-bold tracking-tight">OBRACONTROL</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-[#9BA1B1] font-mono tracking-wider mt-1 uppercase print:text-gray-500">
                  Sistema de Gestão Financeira Integrada
                </p>
              </div>

              <div className="text-left sm:text-right font-sans">
                <h4 className="text-base font-bold text-[#F27D26] print:text-black">Relatório Consolidado</h4>
                <div className="text-xs text-slate-500 dark:text-[#9BA1B1] mt-1 space-y-0.5 print:text-gray-600">
                  <p className="font-semibold text-slate-700 dark:text-[#E4E6EB] print:text-black">Obra: {obra.nome}</p>
                  <p>Cliente: {obra.cliente}</p>
                  <p className="text-[10px]">
                    Período: <strong className="text-slate-700 dark:text-white print:text-black">
                      {formatDateBR(resolvedRange.start)} a {formatDateBR(resolvedRange.end)}
                    </strong>
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    Emitido: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Inflow/Outflow Key KPI Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/20 rounded-xl print:border-gray-200">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold block mb-1">
                  Total Entradas (Aportes)
                </span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  R$ {totalInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {filteredEntradas.length} lançamentos de entrada
                </span>
              </div>

              <div className="p-4 bg-rose-50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-800/20 rounded-xl print:border-gray-200">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-wider font-bold block mb-1">
                  Total Saídas (Despesas)
                </span>
                <span className="text-xl font-bold text-rose-700 dark:text-rose-400 font-mono">
                  R$ {totalOutflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {filteredSaidas.length} transações liquidadas
                </span>
              </div>

              <div className={`p-4 border rounded-xl print:border-gray-200 ${
                periodBalance >= 0 
                  ? 'bg-blue-50 dark:bg-blue-950/10 border-blue-200/50 dark:border-blue-800/20' 
                  : 'bg-amber-50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/20'
              }`}>
                <span className={`text-[10px] uppercase tracking-wider font-bold block mb-1 ${
                  periodBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  Saldo do Período
                </span>
                <span className={`text-xl font-bold font-mono ${
                  periodBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'
                }`}>
                  R$ {periodBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Balanço líquido das movimentações
                </span>
              </div>
            </div>

            {/* Expense Breakdown by Category */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-[#2D323D]">
                Resumo de Despesas por Categoria
              </h4>
              {categoryBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category cards */}
                  <div className="space-y-3">
                    {categoryBreakdown.map((cat, idx) => {
                      const pct = totalOutflows > 0 ? (cat.value / totalOutflows) * 100 : 0;
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">{cat.name}</span>
                            <span className="font-mono text-slate-500 font-bold">
                              R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({Math.round(pct)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-[#0F1115] h-2 rounded-full overflow-hidden print:border print:border-gray-200">
                            <div 
                              className="bg-[#F27D26] h-full rounded-full" 
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary commentary box */}
                  <div className="p-4 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-100 dark:border-[#2D323D] flex flex-col justify-between print:bg-white print:border-gray-200">
                    <div className="text-xs space-y-2">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Análise de Alocação:</p>
                      <p className="text-slate-500 dark:text-[#9BA1B1] leading-relaxed">
                        Os maiores centros de custos registrados no período foram de <strong className="text-slate-700 dark:text-white print:text-black">{categoryBreakdown[0]?.name || 'N/A'}</strong> (R$ {categoryBreakdown[0]?.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}).
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-3">
                      * Certifique-se de vincular notas fiscais e recibos para auditoria de obra.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  Nenhuma despesa para exibir no breakdown do período.
                </div>
              )}
            </div>

            {/* Materials Purchases Table Summary */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-[#2D323D] flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#F27D26]" />
                Compras de Materiais no Período
              </h4>
              {filteredMateriais.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#2D323D] text-slate-400 font-bold">
                        <th className="py-2">Data</th>
                        <th className="py-2">Material</th>
                        <th className="py-2">Fornecedor</th>
                        <th className="py-2 text-right">Qtd</th>
                        <th className="py-2 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#2D323D]/40">
                      {filteredMateriais.map((m) => (
                        <tr key={m.id} className="text-slate-600 dark:text-slate-300 print:text-black">
                          <td className="py-2 font-mono text-[11px]">{formatDateBR(m.dataCompra)}</td>
                          <td className="py-2 font-semibold">
                            {m.nome}
                            {m.categoria && <span className="block text-[9px] text-slate-400 font-normal">{m.categoria}</span>}
                          </td>
                          <td className="py-2 text-slate-500">{m.loja}</td>
                          <td className="py-2 text-right">{m.quantidade} {m.unidade}</td>
                          <td className="py-2 text-right font-mono font-bold">
                            R$ {m.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  Nenhuma compra de material registrada nas datas selecionadas.
                </div>
              )}
            </div>

            {/* Labor (Mão de Obra) Table Summary */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 pb-1 border-b border-slate-100 dark:border-[#2D323D] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#F27D26]" />
                Gastos com Mão de Obra no Período
              </h4>

              {/* Labor Consolidated Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-[#0F1115]/50 border border-slate-100 dark:border-[#2D323D]/50 rounded-xl">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-[#9BA1B1] uppercase block font-semibold">Orçamento Total</span>
                  <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 print:text-black">
                    R$ {laborMetrics.totalOrcadoMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-[#9BA1B1] uppercase block font-semibold">Vales Concedidos</span>
                  <span className="text-sm font-bold font-mono text-emerald-500">
                    R$ {laborMetrics.totalValesConcedidosMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-[#9BA1B1] uppercase block font-semibold">Efetivamente Pago</span>
                  <span className="text-sm font-bold font-mono text-amber-500">
                    R$ {laborMetrics.totalEfetivoPagoMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-[#9BA1B1] uppercase block font-semibold">Restante a Pagar</span>
                  <span className="text-sm font-bold font-mono text-[#F27D26]">
                    R$ {laborMetrics.totalRestantePagarMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {filteredMaoObraList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#2D323D] text-slate-400 font-bold">
                        <th className="py-2">Data</th>
                        <th className="py-2">Profissional</th>
                        <th className="py-2">Função</th>
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Descrição Lançamento</th>
                        <th className="py-2 text-right">Valor Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#2D323D]/40">
                      {filteredMaoObraList.map((l, idx) => {
                        const isVale = l.tipo === 'vale';
                        return (
                          <tr key={idx} className="text-slate-600 dark:text-slate-300 print:text-black">
                            <td className="py-2 font-mono text-[11px]">{formatDateBR(l.data)}</td>
                            <td className="py-2 font-semibold">{l.profissional}</td>
                            <td className="py-2 text-slate-500">{l.funcao}</td>
                            <td className="py-2">
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                                isVale ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {isVale ? 'Vale' : 'Efetivo'}
                              </span>
                            </td>
                            <td className="py-2 text-slate-400 text-[11px] max-w-[200px] truncate" title={l.descricao}>
                              {l.descricao}
                            </td>
                            <td className="py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-200 print:text-black">
                              R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  Nenhum pagamento de mão de obra registrado nas datas selecionadas.
                </div>
              )}
            </div>

            {/* Cash Flow Details (Inflows and Outflows) */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-[#2D323D] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#F27D26]" />
                Entradas e Saídas Detalhadas
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Entradas column */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <ArrowUpRight className="w-4 h-4" />
                    Entradas de Caixa
                  </h5>
                  {filteredEntradas.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
                      {filteredEntradas.map((e) => (
                        <div key={e.id} className="p-2.5 bg-slate-50 dark:bg-[#0F1115]/50 border border-slate-100 dark:border-[#2D323D]/45 rounded-lg flex justify-between items-center text-xs print:bg-white print:border-gray-200">
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 truncate print:text-black">{e.descricao || e.origem}</p>
                            <span className="text-[9px] font-mono text-slate-400">{formatDateBR(e.data)}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 shrink-0">
                            + R$ {e.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Nenhuma entrada no período.</p>
                  )}
                </div>

                {/* Saídas column */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <ArrowDownRight className="w-4 h-4" />
                    Saídas de Caixa
                  </h5>
                  {filteredSaidas.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
                      {filteredSaidas.map((s) => (
                        <div key={s.id} className="p-2.5 bg-slate-50 dark:bg-[#0F1115]/50 border border-slate-100 dark:border-[#2D323D]/45 rounded-lg flex justify-between items-center text-xs print:bg-white print:border-gray-200">
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 truncate print:text-black">{s.descricao}</p>
                            <span className="text-[9px] text-slate-400">
                              {s.categoria} • <span className="font-mono">{formatDateBR(s.data)}</span>
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 shrink-0 print:text-black">
                            - R$ {s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Nenhuma saída no período.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sign-off Signature field for printed versions */}
            <div className="hidden print:block pt-16 mt-16 border-t border-dashed border-gray-300">
              <div className="grid grid-cols-2 gap-12 text-center text-xs text-gray-600">
                <div className="space-y-1">
                  <div className="w-48 border-b border-gray-400 mx-auto h-8"></div>
                  <p className="font-bold">Responsável Técnico / Engenheiro</p>
                  <p className="text-[10px]">ObraControl</p>
                </div>
                <div className="space-y-1">
                  <div className="w-48 border-b border-gray-400 mx-auto h-8"></div>
                  <p className="font-bold">Cliente / Proprietário</p>
                  <p className="text-[10px]">{obra.cliente}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

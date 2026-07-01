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
  Coins,
  Download,
  Loader2
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Helper: Date range calculation based on selection
  const resolvedRange = useMemo(() => {
    let start = '';
    let end = '';

    try {
      if (periodType === 'diário') {
        start = singleDate || '';
        end = singleDate || '';
      } else if (periodType === 'semanal') {
        const baseDateStr = endDate || new Date().toISOString().split('T')[0];
        const endD = new Date(baseDateStr);
        const startD = new Date(baseDateStr);
        if (!isNaN(endD.getTime())) {
          startD.setDate(endD.getDate() - 6);
          start = startD.toISOString().split('T')[0];
          end = baseDateStr;
        } else {
          start = baseDateStr;
          end = baseDateStr;
        }
      } else if (periodType === 'mensal') {
        const baseMonthStr = selectedMonth || new Date().toISOString().slice(0, 7);
        const parts = baseMonthStr.split('-');
        const year = parts[0] || new Date().getFullYear().toString();
        const month = parts[1] || (new Date().getMonth() + 1).toString().padStart(2, '0');
        start = `${year}-${month}-01`;
        const lastDayDate = new Date(parseInt(year), parseInt(month), 0);
        const lastDay = isNaN(lastDayDate.getTime()) ? 30 : lastDayDate.getDate();
        const lastDayStr = lastDay < 10 ? `0${lastDay}` : `${lastDay}`;
        end = `${year}-${month}-${lastDayStr}`;
      } else {
        start = startDate || '';
        end = endDate || '';
      }
    } catch (e) {
      console.error("Error calculating resolved range:", e);
      start = new Date().toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    }

    return { start, end };
  }, [periodType, singleDate, selectedMonth, startDate, endDate]);

  // Helper to verify if a date is within selected range
  const isWithinRange = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const formattedDate = dateStr.slice(0, 10);
    return formattedDate >= resolvedRange.start && formattedDate <= resolvedRange.end;
  };

  // Filter Data
  const filteredEntradas = useMemo(() => {
    return (entradas || []).filter(e => e && isWithinRange(e.data));
  }, [entradas, resolvedRange]);

  const filteredSaidas = useMemo(() => {
    return (saidas || []).filter(s => s && isWithinRange(s.data));
  }, [saidas, resolvedRange]);

  const filteredMateriais = useMemo(() => {
    return (materiais || []).filter(m => m && isWithinRange(m.dataCompra));
  }, [materiais, resolvedRange]);

  // Filter Labor (Mão de Obra) Payments
  // Checking individual sub-payments if listed, otherwise falling back to main contract payments
  const filteredMaoObraList = useMemo(() => {
    const list: { profissional: string; funcao: string; valor: number; data: string; descricao: string; tipo: string }[] = [];
    
    if (!Array.isArray(maoObra)) return list;

    maoObra.forEach(m => {
      if (!m) return;
      const pagamentos = m.pagamentos;
      if (Array.isArray(pagamentos) && pagamentos.length > 0) {
        pagamentos.forEach(p => {
          if (p && p.data && isWithinRange(p.data)) {
            list.push({
              profissional: m.nome || 'Profissional',
              funcao: m.funcao || 'Mão de Obra',
              valor: Number(p.valor) || 0,
              data: p.data,
              descricao: p.observacao || (p.tipo === 'vale' ? 'Vale / Adiantamento' : 'Pagamento Efetivo'),
              tipo: p.tipo || 'final'
            });
          }
        });
      } else {
        if (m.dataPagamento && isWithinRange(m.dataPagamento)) {
          list.push({
            profissional: m.nome || 'Profissional',
            funcao: m.funcao || 'Mão de Obra',
            valor: Number(m.valor || m.valorContrato || 0),
            data: m.dataPagamento,
            descricao: m.observacao || 'Pagamento total contrato',
            tipo: 'final'
          });
        }
      }
    });

    return list.sort((a, b) => {
      const timeA = a.data ? new Date(a.data).getTime() : 0;
      const timeB = b.data ? new Date(b.data).getTime() : 0;
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
  }, [maoObra, resolvedRange]);

  const filteredVales = useMemo(() => {
    return filteredMaoObraList.filter(l => l.tipo === 'vale');
  }, [filteredMaoObraList]);

  const totalValesConcedidos = useMemo(() => {
    return filteredVales.reduce((sum, v) => sum + v.valor, 0);
  }, [filteredVales]);

  // General Labor (Mão de Obra) Metrics
  const laborMetrics = useMemo(() => {
    let totalOrcadoMaoObra = 0;
    let totalValesConcedidosMaoObra = 0;
    let totalEfetivoPagoMaoObra = 0;

    if (Array.isArray(maoObra)) {
      maoObra.forEach(m => {
        if (!m) return;
        const vContrato = Number(m.valorContrato || m.valor || 0);
        totalOrcadoMaoObra += vContrato;

        const pagamentos = m.pagamentos;
        if (Array.isArray(pagamentos) && pagamentos.length > 0) {
          pagamentos.forEach(p => {
            if (p) {
              const v = Number(p.valor || 0);
              if (p.tipo === 'vale') {
                totalValesConcedidosMaoObra += v;
              } else {
                totalEfetivoPagoMaoObra += v;
              }
            }
          });
        } else {
          const v = Number(m.valor || 0);
          if (v > 0) {
            totalEfetivoPagoMaoObra += v;
          }
        }
      });
    }

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
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
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

  // Helper to load html2pdf from CDN dynamically
  const loadHtml2Pdf = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).html2pdf) {
          resolve((window as any).html2pdf);
        } else {
          reject(new Error('html2pdf not found on window object'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load html2pdf script'));
      document.body.appendChild(script);
    });
  };

  const preprocessColorsForHtml2Canvas = (element: HTMLElement) => {
    const colorMap: { [key: string]: { prop: string, value: string } } = {
      'text-slate-950': { prop: 'color', value: '#020617' },
      'text-slate-900': { prop: 'color', value: '#0f172a' },
      'text-slate-800': { prop: 'color', value: '#1e293b' },
      'text-slate-700': { prop: 'color', value: '#334155' },
      'text-slate-600': { prop: 'color', value: '#475569' },
      'text-slate-500': { prop: 'color', value: '#64748b' },
      'text-slate-400': { prop: 'color', value: '#94a3b8' },
      'text-slate-300': { prop: 'color', value: '#cbd5e1' },
      'text-emerald-600': { prop: 'color', value: '#16a34a' },
      'text-rose-600': { prop: 'color', value: '#dc2626' },
      'text-amber-600': { prop: 'color', value: '#d97706' },
      'bg-white': { prop: 'backgroundColor', value: '#ffffff' },
      'bg-slate-50': { prop: 'backgroundColor', value: '#f8fafc' },
      'bg-emerald-50': { prop: 'backgroundColor', value: '#f0fdf4' },
      'bg-rose-50': { prop: 'backgroundColor', value: '#fef2f2' },
      'bg-amber-50': { prop: 'backgroundColor', value: '#fef3c7' },
      'border-slate-200': { prop: 'borderColor', value: '#e2e8f0' },
      'border-slate-100': { prop: 'borderColor', value: '#f1f5f9' },
    };

    const traverse = (node: HTMLElement) => {
      const classes = Array.from(node.classList);
      classes.forEach(cls => {
        if (colorMap[cls]) {
          const { prop, value } = colorMap[cls];
          node.style[prop as any] = value;
          node.classList.remove(cls);
        }
        if (cls === 'divide-slate-100' || cls === 'divide-slate-200') {
          node.classList.remove(cls);
        }
      });

      node.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';

      if (node.tagName === 'TD' || node.tagName === 'TH') {
        node.style.borderBottom = '1px solid #f1f5f9';
        node.style.padding = '8px';
      }
      if (node.tagName === 'TH') {
        node.style.borderBottom = '2px solid #e2e8f0';
        node.style.fontWeight = 'bold';
        node.style.color = '#475569';
        node.style.backgroundColor = '#f8fafc';
      }

      Array.from(node.children).forEach(child => traverse(child as HTMLElement));
    };

    traverse(element);
  };

  const replaceOklch = (str: string): string => {
    let result = '';
    let i = 0;
    while (i < str.length) {
      if (str.substring(i, i + 6) === 'oklch(') {
        let depth = 1;
        let j = i + 6;
        while (j < str.length && depth > 0) {
          if (str[j] === '(') depth++;
          else if (str[j] === ')') depth--;
          j++;
        }
        result += 'rgb(120, 120, 120)';
        i = j;
      } else {
        result += str[i];
        i++;
      }
    }
    return result;
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-report-area');
    if (!element) return;

    setIsGeneratingPDF(true);

    const styleElements = Array.from(document.querySelectorAll('style'));
    const originalContents = styleElements.map(style => style.textContent || '');
    const originalGetComputedStyle = window.getComputedStyle;
    const restoredRules: { sheet: CSSStyleSheet; index: number; originalText: string }[] = [];

    try {
      // Temporarily replace oklch color values in standard style tags to prevent html2canvas color parser crash
      styleElements.forEach(style => {
        if (style.textContent) {
          style.textContent = replaceOklch(style.textContent);
        }
      });

      // Temporarily clean oklch from all CSSOM stylesheets
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          if (!sheet.cssRules) continue;
          for (let j = 0; j < sheet.cssRules.length; j++) {
            const rule = sheet.cssRules[j];
            if (rule.cssText && rule.cssText.includes('oklch')) {
              restoredRules.push({
                sheet,
                index: j,
                originalText: rule.cssText
              });
              const cleanText = replaceOklch(rule.cssText);
              sheet.deleteRule(j);
              sheet.insertRule(cleanText, j);
            }
          }
        } catch (e) {
          // Ignore cross-origin stylesheet errors
        }
      }

      // Intercept window.getComputedStyle to return safe color fallbacks instead of oklch
      window.getComputedStyle = function (elt, pseudoElt) {
        const style = originalGetComputedStyle(elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return function (propertyName: string) {
                const value = target.getPropertyValue(propertyName);
                if (typeof value === 'string' && value.includes('oklch')) {
                  return replaceOklch(value);
                }
                return value;
              };
            }
            const val = Reflect.get(target, prop);
            if (typeof val === 'string' && val.includes('oklch')) {
              return replaceOklch(val);
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        }) as any;
      };

      const html2pdf = await loadHtml2Pdf();

      // Create a clone to strip out dark mode styles
      const clone = element.cloneNode(true) as HTMLElement;

      // Recursively strip out classes starting with "dark:"
      const allElements = clone.querySelectorAll('*');
      allElements.forEach((el) => {
        const classesToRemove: string[] = [];
        el.classList.forEach((cls) => {
          if (cls.startsWith('dark:')) {
            classesToRemove.push(cls);
          }
        });
        classesToRemove.forEach((cls) => el.classList.remove(cls));
      });

      // Also strip dark classes from clone itself
      const cloneClassesToRemove: string[] = [];
      clone.classList.forEach((cls) => {
        if (cls.startsWith('dark:')) {
          cloneClassesToRemove.push(cls);
        }
      });
      cloneClassesToRemove.forEach((cls) => clone.classList.remove(cls));

      // Force clean, high-contrast style overrides on elements
      preprocessColorsForHtml2Canvas(clone);

      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a'; // slate-900
      clone.style.padding = '20px';
      clone.style.borderRadius = '0px';
      clone.style.border = 'none';
      clone.style.boxShadow = 'none';

      // Set standard print styles
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Relatorio_Obra_${(obra.nome || 'Obra').replace(/\s+/g, '_')}_${resolvedRange.start}_a_${resolvedRange.end}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate the PDF
      await html2pdf().set(opt).from(clone).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente ou use a opção de Imprimir.');
    } finally {
      // Restore window.getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;

      // Restore CSSOM stylesheet rules
      restoredRules.forEach(({ sheet, index, originalText }) => {
        try {
          sheet.deleteRule(index);
          sheet.insertRule(originalText, index);
        } catch (e) {
          // Ignore restore errors
        }
      });

      // Restore original style tags' content
      styleElements.forEach((style, index) => {
        style.textContent = originalContents[index];
      });
      setIsGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

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
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 transition-all cursor-pointer shadow"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPDF ? 'Gerando PDF...' : 'Gerar PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F27D26] text-white rounded-xl text-xs font-semibold hover:bg-[#ff8c3a] transition-all cursor-pointer shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Report Content Panel (Scrollable, Styleable for Print) */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 dark:bg-[#0F1115] text-slate-800 dark:text-[#E4E6EB] print:bg-white print:text-black print:overflow-visible print:p-0">
          
          {/* Printable Container wrapper */}
          <div id="printable-report-area" className="max-w-3xl mx-auto bg-white text-slate-800 border border-slate-200 rounded-2xl p-8 space-y-8 shadow-md print:border-none print:shadow-none print:p-0 font-sans">
            
            {/* Report Letterhead / Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4">
              <div>
                <div className="flex items-center gap-2 text-slate-800 print:text-black">
                  <div className="bg-[#F27D26] p-1.5 rounded-lg text-white print:bg-transparent print:text-black print:p-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-slate-900">OBRACONTROL</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase">
                  Sistema de Gestão Financeira Integrada
                </p>
              </div>

              <div className="text-left sm:text-right font-sans">
                <h4 className="text-base font-bold text-[#F27D26] print:text-black">Relatório de Fluxo Financeiro</h4>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <p className="font-semibold text-slate-700">Obra: {obra.nome}</p>
                  <p>Cliente: {obra.cliente}</p>
                  <p className="text-[10px]">
                    Período: <strong className="text-slate-700">
                      {formatDateBR(resolvedRange.start)} a {formatDateBR(resolvedRange.end)}
                    </strong>
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    Emitido: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 1: FLUXO DE CAIXA */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#F27D26]" />
                1. Fluxo de Caixa do Período
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2">Item</th>
                      <th className="py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 text-slate-600 font-medium">Saldo Inicial</td>
                      <td className="py-2.5 text-right font-mono text-slate-900">
                        R$ {(obra.saldoInicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-emerald-600 font-medium">(+) Entradas de Dinheiro (Aportes)</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-emerald-600">
                        + R$ {totalInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-rose-600 font-medium">(-) Saídas de Dinheiro (Despesas / Pagamentos)</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-rose-600">
                        - R$ {totalOutflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <td className="py-2.5 text-slate-800">Saldo Final do Caixa</td>
                      <td className="py-2.5 text-right font-mono text-base text-slate-950">
                        R$ {((obra.saldoInicial || 0) + totalInflows - totalOutflows).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 2: COMPRAS DE MATERIAIS */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#F27D26]" />
                2. Compras de Materiais
              </h3>
              {filteredMateriais.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-2">Data</th>
                        <th className="py-2">Descrição do Material</th>
                        <th className="py-2">Fornecedor</th>
                        <th className="py-2 text-center">Quantidade</th>
                        <th className="py-2 text-right">Valor Unitário</th>
                        <th className="py-2 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMateriais.map((m) => (
                        <tr key={m.id} className="text-slate-700">
                          <td className="py-2 font-mono text-[11px]">{formatDateBR(m.dataCompra)}</td>
                          <td className="py-2">
                            <p className="font-semibold">{m.nome}</p>
                            {m.descricao && <p className="text-[10px] text-slate-400 font-normal">{m.descricao}</p>}
                          </td>
                          <td className="py-2 text-slate-500">{m.loja || '-'}</td>
                          <td className="py-2 text-center">{m.quantidade} {m.unidade}</td>
                          <td className="py-2 text-right font-mono">
                            R$ {(m.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold text-slate-950">
                            R$ {(m.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td colSpan={5} className="py-2.5 text-slate-800 text-right">Total gasto com compras de materiais:</td>
                        <td className="py-2.5 text-right font-mono text-slate-950">
                          R$ {totalMaterialsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                  Nenhuma compra de material registrada no período.
                </div>
              )}
            </div>

            {/* SEÇÃO 3: ENTRADAS DE DINHEIRO */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                3. Entradas de Dinheiro
              </h3>
              {filteredEntradas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-2">Data</th>
                        <th className="py-2">Descrição</th>
                        <th className="py-2">Origem / Categoria</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEntradas.map((e) => (
                        <tr key={e.id} className="text-slate-700">
                          <td className="py-2 font-mono text-[11px]">{formatDateBR(e.data)}</td>
                          <td className="py-2 font-semibold">{e.descricao || '-'}</td>
                          <td className="py-2 text-slate-500">{e.origem || 'Aporte'}</td>
                          <td className="py-2 text-right font-mono font-semibold text-emerald-600">
                            + R$ {e.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td colSpan={3} className="py-2.5 text-slate-800 text-right">Total de entradas de dinheiro:</td>
                        <td className="py-2.5 text-right font-mono text-emerald-600">
                          R$ {totalInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                  Nenhuma entrada registrada no período.
                </div>
              )}
            </div>

            {/* SEÇÃO 4: SAÍDAS DE DINHEIRO */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
                4. Saídas de Dinheiro
              </h3>
              {filteredSaidas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-2">Data</th>
                        <th className="py-2">Descrição</th>
                        <th className="py-2">Categoria</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSaidas.map((s) => (
                        <tr key={s.id} className="text-slate-700">
                          <td className="py-2 font-mono text-[11px]">{formatDateBR(s.data)}</td>
                          <td className="py-2 font-semibold">{s.descricao || '-'}</td>
                          <td className="py-2 text-slate-500">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px]">
                              {s.categoria}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono font-semibold text-rose-600">
                            - R$ {s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td colSpan={3} className="py-2.5 text-slate-800 text-right">Total de saídas de dinheiro:</td>
                        <td className="py-2.5 text-right font-mono text-rose-600">
                          R$ {totalOutflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                  Nenhuma saída registrada no período.
                </div>
              )}
            </div>

            {/* SEÇÃO 5: VALES DA MÃO DE OBRA */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#F27D26]" />
                5. Vales da Mão de Obra
              </h3>
              {filteredVales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-2">Data</th>
                        <th className="py-2">Funcionário / Profissional</th>
                        <th className="py-2">Descrição / Observação</th>
                        <th className="py-2 text-right">Valor do Vale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVales.map((v, idx) => (
                        <tr key={idx} className="text-slate-700">
                          <td className="py-2 font-mono text-[11px]">{formatDateBR(v.data)}</td>
                          <td className="py-2 font-semibold">
                            {v.profissional}
                            <span className="block text-[9px] text-slate-400 font-normal">{v.funcao}</span>
                          </td>
                          <td className="py-2 text-slate-500 italic">{v.descricao || 'Vale / Adiantamento'}</td>
                          <td className="py-2 text-right font-mono font-semibold text-amber-600">
                            R$ {v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td colSpan={3} className="py-2.5 text-slate-800 text-right">Total de vales concedidos:</td>
                        <td className="py-2.5 text-right font-mono text-amber-600">
                          R$ {totalValesConcedidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                  Nenhum vale registrado para mão de obra no período.
                </div>
              )}
            </div>

            {/* SEÇÃO 6: RESUMO FINANCEIRO (Última Página) */}
            <div style={{ pageBreakBefore: 'always' }} className="pt-8 border-t-2 border-dashed border-slate-300">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center pb-2 border-b border-slate-200">
                  Resumo Financeiro Consolidado
                </h3>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Total de Entradas:</span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      R$ {totalInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Total de Saídas:</span>
                    <span className="font-mono font-bold text-rose-600 text-sm">
                      R$ {totalOutflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Total gasto com Compras de Materiais:</span>
                    <span className="font-mono font-semibold text-slate-800 text-sm">
                      R$ {totalMaterialsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Total de Vales Concedidos:</span>
                    <span className="font-mono font-semibold text-amber-600 text-sm">
                      R$ {totalValesConcedidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-slate-300">
                    <span className="text-slate-900 font-bold text-sm">Saldo Final do Caixa:</span>
                    <span className="font-mono font-black text-slate-950 text-base">
                      R$ {((obra.saldoInicial || 0) + totalInflows - totalOutflows).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign-off Signature field for printed versions */}
            <div className="hidden print:block pt-16 mt-16 border-t border-dashed border-gray-300">
              <div className="grid grid-cols-2 gap-12 text-center text-xs text-gray-600">
                <div className="space-y-1">
                  <div className="w-48 border-b border-gray-400 mx-auto h-8"></div>
                  <p className="font-bold text-slate-700">Responsável Técnico / Engenheiro</p>
                  <p className="text-[10px] text-slate-400">ObraControl</p>
                </div>
                <div className="space-y-1">
                  <div className="w-48 border-b border-gray-400 mx-auto h-8"></div>
                  <p className="font-bold text-slate-700">Cliente / Proprietário</p>
                  <p className="text-[10px] text-slate-400">{obra.cliente}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

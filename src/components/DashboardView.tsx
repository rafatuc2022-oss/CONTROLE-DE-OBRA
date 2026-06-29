import { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Briefcase, 
  Receipt, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line 
} from 'recharts';
import { Obra, Entrada, Saida, MaoObra, Material } from '../types';

interface DashboardViewProps {
  obra: Obra;
  entradas: Entrada[];
  saidas: Saida[];
  maoObra: MaoObra[];
  materiais: Material[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

export default function DashboardView({ 
  obra, 
  entradas, 
  saidas, 
  maoObra, 
  materiais 
}: DashboardViewProps) {

  // 1. Calculations
  const totalEntradas = useMemo(() => entradas.reduce((sum, e) => sum + e.valor, 0), [entradas]);
  const totalSaidas = useMemo(() => saidas.reduce((sum, s) => sum + s.valor, 0), [saidas]);
  const totalMateriais = useMemo(() => materiais.reduce((sum, m) => sum + m.valorTotal, 0), [materiais]);
  const totalMaoObra = useMemo(() => maoObra.reduce((sum, l) => sum + l.valor, 0), [maoObra]);
  
  const saldoAtual = useMemo(() => {
    return obra.saldoInicial + totalEntradas - totalSaidas;
  }, [obra.saldoInicial, totalEntradas, totalSaidas]);

  const percentUtilized = useMemo(() => {
    const totalOutflow = totalSaidas;
    const initialFunds = obra.saldoInicial + totalEntradas;
    if (initialFunds <= 0) return 0;
    return Math.min(100, Math.round((totalOutflow / initialFunds) * 100));
  }, [obra.saldoInicial, totalEntradas, totalSaidas]);

  // 2. Chart: Expenses by Category
  const categoryChartData = useMemo(() => {
    const categories: { [key: string]: number } = {
      'Material': totalMateriais,
      'Mão de obra': totalMaoObra,
    };

    // Add other expenses categories from general "saidas"
    saidas.forEach(s => {
      if (s.categoria !== 'Material' && s.categoria !== 'Mão de obra') {
        categories[s.categoria] = (categories[s.categoria] || 0) + s.valor;
      }
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [saidas, totalMateriais, totalMaoObra]);

  // 3. Chart: Cost Evolution by Month
  const monthlyChartData = useMemo(() => {
    const months: { [key: string]: { entradas: number; saidas: number } } = {};
    
    // Sort transactions by date helper
    const allDates = [
      ...entradas.map(e => ({ date: e.data, type: 'entrada', val: e.valor })),
      ...saidas.map(s => ({ date: s.data, type: 'saida', val: s.valor }))
    ];

    allDates.forEach(t => {
      if (!t.date) return;
      const dateObj = new Date(t.date);
      if (isNaN(dateObj.getTime())) return;
      
      const monthYear = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[monthYear]) {
        months[monthYear] = { entradas: 0, saidas: 0 };
      }
      if (t.type === 'entrada') {
        months[monthYear].entradas += t.val;
      } else {
        months[monthYear].saidas += t.val;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      name: month,
      entradas: data.entradas,
      saidas: data.saidas
    })).sort((a, b) => {
      // Sort key helper
      return a.name.localeCompare(b.name);
    });
  }, [entradas, saidas]);

  // 4. Combined Recent logs (Últimas movimentações)
  const recentMovements = useMemo(() => {
    const list: { id: string; type: 'entrada' | 'saida'; description: string; value: number; date: string; category?: string }[] = [];
    
    entradas.forEach(e => {
      list.push({
        id: e.id,
        type: 'entrada',
        description: e.descricao || e.origem,
        value: e.valor,
        date: e.data,
        category: 'Aporte'
      });
    });

    saidas.forEach(s => {
      list.push({
        id: s.id,
        type: 'saida',
        description: s.descricao,
        value: s.valor,
        date: s.data,
        category: s.categoria
      });
    });

    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [entradas, saidas]);

  return (
    <div className="space-y-8">
      {/* 1. Budget Alerts */}
      {saldoAtual < (obra.saldoInicial * 0.1) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-lg text-amber-800 dark:text-amber-200 text-sm flex items-start gap-3 shadow-sm animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Atenção: Saldo de Caixa Baixo!</span>
            <p className="text-xs text-amber-700/90 dark:text-amber-300/85 mt-0.5">
              O saldo atual da obra corresponde a menos de 10% do orçamento estimado. Planeje novos aportes ou contingencie despesas imediatas.
            </p>
          </div>
        </div>
      )}

      {/* 2. Primary Financial Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Saldo Disponível */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Saldo em Caixa
            </span>
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl text-violet-600 dark:text-violet-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
              R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Saldo Inicial: R$ {obra.saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Card 2: Entradas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Entradas
            </span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Recursos extras aportados
            </p>
          </div>
        </div>

        {/* Card 3: Saídas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Saídas
            </span>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Despesas gerais da obra
            </p>
          </div>
        </div>

        {/* Card 4: Orçamento Consumido */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Orçamento Utilizado
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300">
              <span className="text-sm font-bold">{percentUtilized}%</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${percentUtilized}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {percentUtilized}% das receitas totais gastas
            </p>
          </div>
        </div>
      </div>

      {/* 3. Sub-indicator Cards (Materials, Labor, counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/40 flex items-center gap-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Gasto Materiais</p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              R$ {totalMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{materiais.length} compras</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/40 flex items-center gap-4">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Mão de Obra</p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              R$ {totalMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{maoObra.length} pagamentos</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/40 flex items-center gap-4">
          <div className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-lg">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Total Transações</p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              {entradas.length + saidas.length} registros
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Entradas e saídas no caixa</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/40 flex items-center gap-4">
          <div className="p-2 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Cronograma</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {new Date(obra.dataInicio).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Até {obra.dataTermino ? new Date(obra.dataTermino).toLocaleDateString('pt-BR') : 'Não definido'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Graphical Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Despesas por Categoria */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm lg:col-span-1">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 font-sans">
            Gastos por Categoria
          </h4>
          <div className="h-60 flex items-center justify-center">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400 dark:text-slate-500">
                Nenhum gasto registrado para exibir gráfico.
              </div>
            )}
          </div>
          {/* Chart Legends */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryChartData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{item.name} ({Math.round((item.value / (totalSaidas || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evolução Mensal */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
            Fluxo Mensal (Entradas x Saídas)
          </h4>
          <div className="h-60">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                    formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                  <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                Aguardando mais movimentações mensais para exibir o histórico.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Transactions List (Últimas movimentações) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Últimas Movimentações
          </h4>
          <span className="text-[10px] bg-slate-50 dark:bg-slate-700/40 text-slate-400 px-2 py-1 rounded">
            Tempo real
          </span>
        </div>

        {recentMovements.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 truncate">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    movement.type === 'entrada' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                      : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                  }`}>
                    {movement.type === 'entrada' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {movement.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span>{movement.category}</span>
                      <span>•</span>
                      <span>{new Date(movement.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${
                  movement.type === 'entrada' ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {movement.type === 'entrada' ? '+' : '-'} R$ {movement.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">
            Nenhuma transação registrada nesta obra. Clique nas abas abaixo para lançar valores.
          </div>
        )}
      </div>
    </div>
  );
}

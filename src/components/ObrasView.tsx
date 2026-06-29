import React, { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Calendar, 
  User, 
  Trash2, 
  Edit, 
  ExternalLink, 
  Briefcase,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Obra } from '../types';

interface ObrasViewProps {
  obras: Obra[];
  selectedObraId: string | null;
  setSelectedObraId: (id: string | null) => void;
  onAddObra: (data: any) => Promise<any>;
  onUpdateObra: (id: string, data: any) => Promise<any>;
  onDeleteObra: (id: string) => Promise<any>;
  onBootstrap: () => void;
}

export default function ObrasView({
  obras,
  selectedObraId,
  setSelectedObraId,
  onAddObra,
  onUpdateObra,
  onDeleteObra,
  onBootstrap
}: ObrasViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const resetForm = () => {
    setNome('');
    setCliente('');
    setEndereco('');
    setSaldoInicial(0);
    setDataInicio('');
    setDataTermino('');
    setObservacoes('');
    setIsAdding(false);
    setIsEditingId(null);
    setError(null);
  };

  const startEdit = (obra: Obra) => {
    setIsEditingId(obra.id);
    setNome(obra.nome);
    setCliente(obra.cliente);
    setEndereco(obra.endereco);
    setSaldoInicial(obra.saldoInicial);
    setDataInicio(obra.dataInicio);
    setDataTermino(obra.dataTermino || '');
    setObservacoes(obra.observacoes || '');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cliente || !dataInicio) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      nome: nome.trim(),
      cliente: cliente.trim(),
      endereco: endereco.trim(),
      saldoInicial: Number(saldoInicial),
      dataInicio,
      dataTermino,
      observacoes: observacoes.trim()
    };

    try {
      if (isEditingId) {
        await onUpdateObra(isEditingId, payload);
      } else {
        await onAddObra(payload);
      }
      resetForm();
    } catch (err: any) {
      console.error("Erro ao salvar obra no Firebase:", err);
      setError(
        err?.message || 
        'Ocorreu um erro ao salvar os dados da obra. Verifique sua conexão ou permissões no Firestore.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header with Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E4E6EB] font-sans tracking-tight">
            Gerenciamento de Obras
          </h2>
          <p className="text-xs text-[#9BA1B1] mt-1">
            Cadastre novas obras ou selecione o projeto ativo para gerenciar
          </p>
        </div>

        {!isAdding && !isEditingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Obra
          </button>
        )}
      </div>

      {/* Main Form container (Add/Edit) */}
      {(isAdding || isEditingId) && (
        <div className="bg-[#1C2129] p-6 rounded-2xl border border-[#2D323D] shadow-lg animate-fadeIn text-[#E4E6EB]">
          <h3 className="text-sm font-bold text-[#E4E6EB] mb-5 uppercase tracking-wider">
            {isEditingId ? 'Editar Detalhes da Obra' : 'Cadastrar Nova Obra'}
          </h3>

          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Não foi possível salvar:</span> {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Nome do Projeto / Obra *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  disabled={loading}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Reforma Apartamento Pinheiros"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={cliente}
                  disabled={loading}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: Ana Maria Mendonça"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={endereco}
                  disabled={loading}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Rua Clélia, 510 - Lapa, São Paulo SP"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Saldo Inicial Disponível (R$) *
                </label>
                <input
                  type="number"
                  required
                  disabled={!!isEditingId || loading}
                  value={saldoInicial || ''}
                  onChange={(e) => setSaldoInicial(Number(e.target.value))}
                  placeholder="Ex: 50000"
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    disabled={loading}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                    Previsão Término
                  </label>
                  <input
                    type="date"
                    value={dataTermino}
                    disabled={loading}
                    onChange={(e) => setDataTermino(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-[#9BA1B1] mb-1.5 uppercase">
                  Observações Gerais
                </label>
                <textarea
                  value={observacoes}
                  disabled={loading}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Anotações sobre a equipe, prazos ou materiais especiais..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D323D] rounded-lg text-xs text-[#E4E6EB] placeholder-[#9BA1B1]/50 focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] disabled:bg-[#F27D26]/50 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Salvando...' : isEditingId ? 'Salvar Alterações' : 'Criar Projeto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid List of Projects */}
      {obras.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {obras.map((obra) => {
            const isSelected = selectedObraId === obra.id;
            return (
              <div
                key={obra.id}
                className={`p-6 rounded-2xl bg-[#1C2129] border-2 transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'border-[#F27D26] shadow-md ring-2 ring-[#F27D26]/10' 
                    : 'border-[#2D323D] shadow-sm hover:border-[#2D323D]/80 hover:shadow'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-mono uppercase font-bold text-[#9BA1B1] tracking-wider">
                      CÓD: {obra.id.substring(0, 6).toUpperCase()}
                    </span>
                    {isSelected && (
                      <span className="bg-[#F27D26]/10 text-[#F27D26] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Ativa
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#E4E6EB] mt-2.5 truncate">
                    {obra.nome}
                  </h3>

                  <div className="space-y-2.5 mt-4 text-xs text-[#9BA1B1]">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 shrink-0 text-[#F27D26]/60" />
                      <span className="truncate">Cliente: <b className="text-[#E4E6EB]">{obra.cliente}</b></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0 text-[#F27D26]/60" />
                      <span className="truncate">{obra.endereco || 'Endereço não informado'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 shrink-0 text-[#F27D26]/60" />
                      <span>Início: {new Date(obra.dataInicio).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="mt-5 p-3.5 bg-[#0F1115]/50 border border-[#2D323D]/40 rounded-xl flex justify-between items-center text-[#E4E6EB]">
                    <div className="text-left">
                      <span className="text-[9px] text-[#9BA1B1] uppercase font-semibold">Caixa Disponível</span>
                      <p className="text-sm font-bold text-[#E4E6EB]">
                        R$ {obra.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#9BA1B1] uppercase font-semibold">Orç. Inicial</span>
                      <p className="text-xs font-semibold text-[#9BA1B1]">
                        R$ {obra.saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-[#2D323D]/50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(obra)}
                      disabled={loading}
                      className="p-1.5 text-[#9BA1B1] hover:text-[#E4E6EB] hover:bg-[#2D323D] rounded transition-colors cursor-pointer"
                      title="Editar Obra"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza de que deseja excluir permanentemente esta obra? Todos os dados vinculados serão deletados.')) {
                          onDeleteObra(obra.id);
                        }
                      }}
                      disabled={loading}
                      className="p-1.5 text-[#9BA1B1] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      title="Excluir Obra"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!isSelected && (
                    <button
                      onClick={() => setSelectedObraId(obra.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Selecionar
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-[#1C2129] border border-dashed border-[#2D323D] rounded-2xl flex flex-col items-center">
          <Briefcase className="w-12 h-12 text-[#2D323D] mb-4 stroke-1" />
          <h4 className="text-base font-bold text-[#E4E6EB]">
            Nenhuma obra cadastrada ainda!
          </h4>
          <p className="text-xs text-[#9BA1B1] max-w-sm mt-1 mb-6">
            Você precisa de pelo menos uma obra ativa para realizar lançamentos, visualizar gráficos e comparar preços.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsAdding(true)}
              className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Criar primeira Obra
            </button>
            <button
              onClick={onBootstrap}
              className="px-5 py-2.5 border border-[#2D323D] bg-[#16191F] hover:bg-[#2D323D] text-[#E4E6EB] rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Carregar dados de demonstração
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

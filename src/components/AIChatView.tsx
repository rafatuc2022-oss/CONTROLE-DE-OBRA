import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  TrendingDown, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Obra, Entrada, Saida, MaoObra, Material } from '../types';

interface AIChatViewProps {
  obra: Obra | null;
  entradas: Entrada[];
  saidas: Saida[];
  maoObra: MaoObra[];
  materiais: Material[];
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function AIChatView({
  obra,
  entradas,
  saidas,
  maoObra,
  materiais
}: AIChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Olá! Sou o **Assistente de IA do ObraControl**. \n\nPosso analisar as finanças da sua obra atual, sugerir cortes de custos, resumir despesas de materiais ou mão de obra e dar recomendações de planejamento. Como posso ajudar você hoje?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Compile detailed project context to send to server
  const projectContext = useMemo(() => {
    if (!obra) return null;

    const totalMat = materiais.reduce((sum, m) => sum + m.valorTotal, 0);
    const totalLab = maoObra.reduce((sum, l) => sum + l.valor, 0);
    
    // Sort transactions
    const txs = [
      ...entradas.map(e => ({ tipo: 'entrada', valor: e.valor, data: e.data, desc: e.descricao || e.origem })),
      ...saidas.map(s => ({ tipo: 'saida', valor: s.valor, data: s.data, desc: s.descricao, cat: s.categoria }))
    ]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 5);

    return {
      nome: obra.nome,
      cliente: obra.cliente,
      endereco: obra.endereco,
      saldoInicial: obra.saldoInicial,
      saldoAtual: obra.saldoAtual,
      totalMateriais: totalMat,
      totalMaoObra: totalLab,
      materialCount: materiais.length,
      maoObraCount: maoObra.length,
      recentTransactions: txs
    };
  }, [obra, entradas, saidas, maoObra, materiais]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = customText || inputText;
    if (!textToSend.trim() || sending) return;

    if (!customText) {
      setInputText('');
    }

    const userMsgId = Math.random().toString(36).substring(7);
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          projectContext
        })
      });

      if (!response.ok) {
        throw new Error('Erro na requisição ao servidor');
      }

      const data = await response.json();
      
      const botMsgId = Math.random().toString(36).substring(7);
      const botMessage: Message = {
        id: botMsgId,
        sender: 'bot',
        text: data.response || 'Desculpe, não consegui processar a resposta.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      const errorMsgId = Math.random().toString(36).substring(7);
      setMessages(prev => [...prev, {
        id: errorMsgId,
        sender: 'bot',
        text: '⚠️ Ocorreu um erro ao conectar com o serviço de IA. Verifique se o servidor de desenvolvimento está rodando.',
        timestamp: new Date()
      }]);
    } finally {
      setSending(false);
    }
  };

  // Pre-configured suggestions
  const suggestions = [
    "Análise completa do meu caixa atual",
    "Quanto gastei com materiais e onde economizar?",
    "Resumo de pagamentos de Mão de Obra",
    "Dicas para evitar estouro de orçamento nesta obra"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-[#1C2129] rounded-2xl border border-[#2D323D] overflow-hidden">
      {/* View Header */}
      <div className="p-4 border-b border-[#2D323D] bg-[#16191F] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#F27D26]/10 text-[#F27D26] rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E4E6EB]">Engenheiro Assistente IA</h3>
            <p className="text-[10px] text-[#9BA1B1] mt-0.5">
              Análise financeira e planejamento inteligente para a obra <span className="text-[#F27D26] font-semibold">{obra?.nome || 'Não selecionada'}</span>
            </p>
          </div>
        </div>

        {!obra && (
          <span className="flex items-center gap-1 text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-2 py-1 rounded">
            <AlertCircle className="w-3.5 h-3.5" />
            Nenhuma obra ativa
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#0F1115]/40">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-3xl ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                isBot 
                  ? 'bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20' 
                  : 'bg-[#2D323D] text-[#E4E6EB]'
              }`}>
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Text Bubble */}
              <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                isBot 
                  ? 'bg-[#1C2129] border-[#2D323D] text-[#E4E6EB]' 
                  : 'bg-[#F27D26] border-transparent text-white rounded-tr-none'
              }`}>
                {/* Parse Markdown elements simply (or dangerously with formatting checks) */}
                <div className="space-y-2 whitespace-pre-wrap">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    // Check for bold styling
                    const formatted = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return (
                      <p 
                        key={pIdx}
                        dangerouslySetInnerHTML={{ __html: formatted }}
                      />
                    );
                  })}
                </div>
                <span className="block text-[9px] text-[#9BA1B1] mt-2 text-right">
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {sending && (
          <div className="flex gap-3 mr-auto max-w-3xl">
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-[#1C2129] border border-[#2D323D] text-xs text-[#9BA1B1] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F27D26]" />
              <span>Analisando custos e elaborando diagnóstico...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Prompts */}
      {messages.length === 1 && (
        <div className="px-5 py-3 border-t border-[#2D323D] bg-[#16191F]/30">
          <p className="text-[10px] text-[#9BA1B1] font-bold uppercase mb-2 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Sugestões de consulta:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(undefined, sug)}
                disabled={sending || !obra}
                className="px-3 py-1.5 bg-[#1C2129] hover:bg-[#2D323D] disabled:opacity-50 disabled:hover:bg-[#1C2129] border border-[#2D323D] hover:border-[#F27D26]/30 text-[11px] text-[#E4E6EB] rounded-lg transition-all cursor-pointer text-left"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form 
        onSubmit={handleSend}
        className="p-4 border-t border-[#2D323D] bg-[#16191F] flex gap-2.5 items-center"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending || !obra}
          placeholder={obra ? "Pergunte ao assistente sobre o orçamento, materiais..." : "Selecione uma obra ativa para começar a usar o assistente de IA."}
          className="flex-1 px-4 py-2.5 bg-[#0F1115] border border-[#2D323D] disabled:opacity-50 disabled:bg-[#0F1115]/30 rounded-xl text-xs text-[#E4E6EB] placeholder-[#9BA1B1] focus:outline-none focus:border-[#F27D26]"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim() || !obra}
          className="p-2.5 bg-[#F27D26] hover:bg-[#ff8c3a] disabled:bg-[#F27D26]/30 text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please add it to your secrets or environment configuration.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API endpoint for Construction Assistant AI chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, projectContext } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let responseText = '';

      // Check if GEMINI_API_KEY is defined. If not, use high-quality template fallback responses
      if (!process.env.GEMINI_API_KEY) {
        // Fallback simulated answers based on project context to keep the experience completely functional!
        const msgLower = message.toLowerCase();
        if (msgLower.includes('cimento') || msgLower.includes('material') || msgLower.includes('materiais')) {
          const totalMateriais = projectContext?.totalMateriais || 0;
          const materialCount = projectContext?.materialCount || 0;
          responseText = `Com base nos dados da obra **${projectContext?.nome || 'sua obra'}**, você já realizou **${materialCount} compras** de materiais, totalizando **R$ ${totalMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\nPara economizar mais, lembre-se de registrar as cotações no *Comparador de Preços* antes de fechar novos pedidos de cimento ou ferragens.`;
        } else if (msgLower.includes('mão') || msgLower.includes('mao') || msgLower.includes('trabalhador') || msgLower.includes('pedreiro')) {
          const totalMaoObra = projectContext?.totalMaoObra || 0;
          const maoObraCount = projectContext?.maoObraCount || 0;
          responseText = `Você registrou **${maoObraCount} pagamentos** de mão de obra na obra **${projectContext?.nome || 'sua obra'}**, somando um custo de **R$ ${totalMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\nCertifique-se de registrar todos os adiantamentos semanais de pedreiros e ajudantes para evitar distorções no saldo disponível de **R$ ${(projectContext?.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`;
        } else if (msgLower.includes('saldo') || msgLower.includes('disponível') || msgLower.includes('quanto tenho')) {
          const saldo = projectContext?.saldoAtual || 0;
          responseText = `Atualmente, o saldo disponível em caixa para a obra **${projectContext?.nome || 'sua obra'}** é de **R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\nO orçamento inicial foi de **R$ ${(projectContext?.saldoInicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**, o que significa que você já comprometeu **${(((projectContext?.saldoInicial || 1) - saldo) / (projectContext?.saldoInicial || 1) * 100).toFixed(1)}%** do saldo inicial.`;
        } else {
          responseText = `Olá! Sou o Assistente ObraControl. Posso ajudar você a analisar as finanças da sua obra **${projectContext?.nome || 'sua obra'}**.\n\nAtualmente, a obra possui um saldo de **R$ ${(projectContext?.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\n*Nota: O assistente está operando no modo de demonstração off-line (chave API ausente).*`;
        }

        return res.json({ response: responseText });
      }

      // Initialize Gemini Client safely (lazy initialization)
      const ai = getGeminiClient();

      // Create a detailed prompt injecting project context
      const prompt = `
Você é o "Assistente de IA do ObraControl", um especialista em planejamento de obras e gerenciamento de custos de construção civil.
Responda de forma prestativa, direta e amigável em português do Brasil. Use formatação Markdown elegante.

CONTEÚDO DA OBRA ATUAL:
- Nome da Obra: ${projectContext?.nome || 'Não especificado'}
- Cliente: ${projectContext?.cliente || 'Não especificado'}
- Endereço: ${projectContext?.endereco || 'Não especificado'}
- Saldo Inicial: R$ ${projectContext?.saldoInicial || 0}
- Saldo Atual: R$ ${projectContext?.saldoAtual || 0}
- Total Gasto em Materiais: R$ ${projectContext?.totalMateriais || 0}
- Total Gasto em Mão de Obra: R$ ${projectContext?.totalMaoObra || 0}
- Qtd Compras Materiais: ${projectContext?.materialCount || 0}
- Qtd Pagamentos Mão de Obra: ${projectContext?.maoObraCount || 0}
- Últimas Movimentações: ${JSON.stringify(projectContext?.recentTransactions || [])}

PERGUNTA DO USUÁRIO:
"${message}"

Analise os dados fornecidos e dê uma resposta financeira consultiva, ajudando o usuário a entender seus gastos e a economizar na obra.
`;

      const model = 'gemini-2.5-flash';
      const result = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      responseText = result.text || 'Desculpe, não consegui processar sua resposta no momento.';
      return res.json({ response: responseText });

    } catch (error: any) {
      console.error('Error generating content with Gemini:', error);
      return res.status(500).json({ 
        error: 'Erro ao gerar resposta com IA',
        details: error.message 
      });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

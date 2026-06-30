export interface Usuario {
  id: string;
  nome: string;
  email: string;
  fotoPerfil?: string;
}

export interface Obra {
  id: string;
  usuarioId: string;
  nome: string;
  cliente: string;
  endereco: string;
  saldoInicial: number;
  saldoAtual: number;
  dataInicio: string;
  dataTermino?: string;
  observacoes?: string;
  criadoEm: string;
}

export interface Entrada {
  id: string;
  obraId: string;
  valor: number;
  data: string;
  origem: string;
  descricao: string;
  observacao?: string;
}

export interface PagamentoMaoObra {
  id: string;
  valor: number;
  data: string;
  formaPagamento: string;
  observacao?: string;
  tipo?: 'vale' | 'final';
}

export interface Saida {
  id: string;
  obraId: string;
  valor: number;
  data: string;
  categoria: 'Material' | 'Mão de obra' | 'Transporte' | 'Ferramentas' | 'Alimentação' | 'Outros';
  descricao: string;
  observacao?: string;
  maoObraId?: string;
  paymentId?: string;
}

export interface MaoObra {
  id: string;
  obraId: string;
  nome: string;
  funcao: string;
  valor: number; // For backward compatibility/legacy fallback
  valorContrato: number; // Total budget charged by the professional
  dataPagamento: string;
  formaPagamento: string; // Default/initial payment method
  observacao?: string;
  cpf?: string;
  telefone?: string;
  pagamentos?: PagamentoMaoObra[];
}

export interface Material {
  id: string;
  obraId: string;
  categoria: string;
  nome: string;
  descricao?: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  loja: string;
  notaFiscal?: string;
  dataCompra: string;
  observacao?: string;
}

export interface ComparacaoPreco {
  id: string;
  usuarioId: string;
  material: string;
  loja: string;
  valor: number;
  data: string;
}

export const CATEGORIAS_MATERIAIS = [
  'Areia',
  'Brita',
  'Cimento',
  'Ferro',
  'Telha',
  'Tijolo',
  'Bloco',
  'Madeira',
  'Piso',
  'Cerâmica',
  'Revestimento',
  'Tinta',
  'Tubos',
  'Hidráulica',
  'Elétrica',
  'Ferragens',
  'Ferramentas',
  'Concreto',
  'Argamassa',
  'Outros'
] as const;

export const CATEGORIAS_SAIDAS = [
  'Material',
  'Mão de obra',
  'Transporte',
  'Ferramentas',
  'Alimentação',
  'Outros'
] as const;

export const UNIDADES = [
  'unidade',
  'saco',
  'kg',
  'm²',
  'm³',
  'barra',
  'litro',
  'metro',
  'cento',
  'Outro'
] as const;

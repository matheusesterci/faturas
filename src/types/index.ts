export interface ClientProfile {
  id: string;
  sacado: string;
  endereco: string;
  municipio: string;
  uf: string;
  cnpj: string;
}

export interface FlightLeg {
  id: string;
  rota: string;
  data: string;
}

export interface FlightItem {
  id: string;
  localizador: string;
  passageiro: string;
  rotaIda: string;
  rotaVolta?: string;
  dataIda: string;
  dataVolta?: string;
  rota?: string;
  data?: string;
  valor?: number;
}

export interface AgencyInfo {
  nome: string;
  subtitulo: string;
  endereco: string;
  cidadeEstadoCep: string;
  cnpj: string;
  telefone: string;
  instrucaoPagamento: string;
  customLogoUrl?: string | null;
}

export type DueDatePreset = '7d' | 'outro';

export interface AttachedBoleto {
  fileName: string;
  fileType: 'pdf' | 'image';
  dataUrl: string; // base64 data url
  fileSize?: number;
  uploadedAt: string;
}

export interface InvoiceData {
  id: string;
  numero: string;
  valor: number;
  valorExtenso: string;
  dataEmissao: string; // YYYY-MM-DD
  dataVencimento: string; // YYYY-MM-DD
  diasVencimentoPreset: DueDatePreset;
  customDiasVencimento?: number;
  client: ClientProfile;
  itens: FlightItem[];
  // Backwards compatibility
  localizador?: string;
  passageiros?: string[];
  rotas?: FlightLeg[];
  agencyInfo: AgencyInfo;
  attachedBoleto?: AttachedBoleto | null;
  createdAt: string;
}

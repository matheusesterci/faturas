import { AgencyInfo, ClientProfile, InvoiceData } from '../types';
import { addDaysToIsoDate, getTodayIsoDate } from '../utils/dateUtils';

export const DEFAULT_AGENCY: AgencyInfo = {
  nome: 'BE Travel',
  subtitulo: 'Fatura/Duplicata',
  endereco: 'Rua Gisela, 850, Barreiros',
  cidadeEstadoCep: 'São José - SC, CEP 88110-111',
  cnpj: '58.474.217/0001-13',
  telefone: '(48) 99606 - 2608',
  instrucaoPagamento: 'Boleto Tradicional ou QR Code Pix',
  customLogoUrl: null,
};

// Apenas os 2 clientes/CNPJs enviados nos modelos originais
export const DEFAULT_PROFILES: ClientProfile[] = [
  {
    id: 'prof-1',
    sacado: 'INSTITUICAO ADVENTISTA SUL-RIO-GRANDENSE DE EDUCACAO',
    endereco: 'AV. JOÃO WALLIG, 596',
    municipio: 'PORTO ALEGRE',
    uf: 'RIO GRANDE DO SUL',
    cnpj: '87.115.838/0080-02',
  },
  {
    id: 'prof-2',
    sacado: 'UNIÃO SUL BRASILEIRA DA IGREJA ADVENTISTA DO SÉTIMO DIA',
    endereco: 'RUA DEPUTADO JOÃO FERREIRA NEVES, 159',
    municipio: 'CURITIBA',
    uf: 'PARANÁ',
    cnpj: '79.080.602/0037-67',
  },
];

export function createBlankInvoice(lastInvoiceNumber: string, agencyInfo: AgencyInfo): InvoiceData {
  const today = getTodayIsoDate();
  const defaultDueDate = addDaysToIsoDate(today, 7);

  return {
    id: `inv-${Date.now()}`,
    numero: lastInvoiceNumber || '',
    valor: 0,
    valorExtenso: '',
    dataEmissao: today,
    dataVencimento: defaultDueDate,
    diasVencimentoPreset: '7d',
    customDiasVencimento: 7,
    client: {
      id: '',
      sacado: '',
      endereco: '',
      municipio: '',
      uf: '',
      cnpj: '',
    },
    itens: [
      {
        id: `item-${Date.now()}`,
        localizador: '',
        passageiro: '',
        rotaIda: '',
        rotaVolta: '',
        dataIda: '',
        dataVolta: '',
        rota: '',
        data: '',
      },
    ],
    agencyInfo,
    createdAt: new Date().toISOString(),
  };
}

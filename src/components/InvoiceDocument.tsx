import React from 'react';
import { FlightItem, InvoiceData } from '../types';
import { formatIsoToBr } from '../utils/dateUtils';
import { formatCurrencyBRL } from '../utils/numberToWordsPtBr';
import { BeTravelLogo } from './BeTravelLogo';

interface InvoiceDocumentProps {
  invoice: InvoiceData;
  scale?: number;
  id?: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  scale = 1,
  id = 'invoice-print-area',
}) => {
  const {
    numero,
    valor,
    valorExtenso,
    dataEmissao,
    dataVencimento,
    client,
    agencyInfo,
  } = invoice;

  const formattedValor = valor > 0 ? formatCurrencyBRL(valor).replace(/\s/g, '') : '';
  const formattedEmissao = formatIsoToBr(dataEmissao);
  const formattedVencimento = formatIsoToBr(dataVencimento);

  // Normalize items to FlightItem[]
  const flightItems: FlightItem[] = (
    invoice.itens && invoice.itens.length > 0
      ? invoice.itens
      : [
          {
            id: 'legacy-item',
            localizador: invoice.localizador || '',
            passageiro: (invoice.passageiros || []).filter(Boolean).join(', '),
            rotaIda: (invoice.rotas && invoice.rotas[0]?.rota) || '',
            rotaVolta: (invoice.rotas && invoice.rotas[1]?.rota) || '',
            dataIda: (invoice.rotas && invoice.rotas[0]?.data) || '',
            dataVolta: (invoice.rotas && invoice.rotas[1]?.data) || '',
            rota: (invoice.rotas || []).map((r) => r.rota).filter(Boolean).join(' / '),
            data: (invoice.rotas || []).map((r) => r.data).filter(Boolean).join(' / '),
          },
        ]
  ).map((it) => {
    let rIda = it.rotaIda || '';
    let rVolta = it.rotaVolta || '';
    if (!rIda && it.rota) {
      if (it.rota.includes(' / ')) {
        const parts = it.rota.split(' / ');
        rIda = parts[0]?.trim() || '';
        rVolta = parts[1]?.trim() || '';
      } else {
        rIda = it.rota;
      }
    }

    let dIda = it.dataIda || '';
    let dVolta = it.dataVolta || '';
    if (!dIda && it.data) {
      if (it.data.includes(' a ')) {
        const parts = it.data.split(' a ');
        dIda = parts[0]?.trim() || '';
        dVolta = parts[1]?.trim() || '';
      } else if (it.data.includes(' / ')) {
        const parts = it.data.split(' / ');
        dIda = parts[0]?.trim() || '';
        dVolta = parts[1]?.trim() || '';
      } else {
        dIda = it.data;
      }
    }

    return {
      ...it,
      rotaIda: rIda,
      rotaVolta: rVolta,
      dataIda: dIda,
      dataVolta: dVolta,
    };
  });

  return (
    <div
      id={id}
      className="invoice-page bg-white text-gray-900 shadow-2xl mx-auto relative flex flex-col justify-between"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: '297mm',
        padding: '36mm 24mm 32mm 24mm',
        boxSizing: 'border-box',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top Main Section */}
      <div>
        {/* Header: Logo | Title | Agency Details */}
        <div className="flex items-start justify-between mb-8">
          <div className="w-[32%]">
            <BeTravelLogo
              size="md"
              customLogoUrl={agencyInfo.customLogoUrl}
              color="#111827"
            />
          </div>

          <div className="w-[38%] text-center pt-1">
            <h1 className="text-xl font-extrabold text-gray-950 tracking-tight">
              {agencyInfo.nome}
            </h1>
            <p className="text-[13px] font-semibold text-gray-700 tracking-wide mt-0.5">
              {agencyInfo.subtitulo}
            </p>
          </div>

          <div className="w-[30%] text-right text-[10.5px] leading-[1.45] text-gray-800 font-normal">
            <p>{agencyInfo.endereco}</p>
            <p>{agencyInfo.cidadeEstadoCep}</p>
            <p>CNPJ - {agencyInfo.cnpj}</p>
            <p>{agencyInfo.telefone}</p>
          </div>
        </div>

        {/* 4 Summary Boxes: NÚMERO | VALOR | EMISSÃO | VENCIMENTO */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {/* NÚMERO */}
          <div>
            <div className="text-center text-[10.5px] font-bold text-gray-900 tracking-wider uppercase mb-1.5">
              NÚMERO
            </div>
            <div className="bg-[#ebedf0] py-2 px-3 text-center text-[12px] font-bold text-gray-900 rounded-[3px] min-h-[34px] flex items-center justify-center">
              {numero || ''}
            </div>
          </div>

          {/* VALOR */}
          <div>
            <div className="text-center text-[10.5px] font-bold text-gray-900 tracking-wider uppercase mb-1.5">
              VALOR
            </div>
            <div className="bg-[#ebedf0] py-2 px-3 text-center text-[12px] font-bold text-gray-900 rounded-[3px] min-h-[34px] flex items-center justify-center">
              {formattedValor || ''}
            </div>
          </div>

          {/* EMISSÃO */}
          <div>
            <div className="text-center text-[10.5px] font-bold text-gray-900 tracking-wider uppercase mb-1.5">
              EMISSÃO
            </div>
            <div className="bg-[#ebedf0] py-2 px-3 text-center text-[12px] font-bold text-gray-900 rounded-[3px] min-h-[34px] flex items-center justify-center">
              {formattedEmissao || ''}
            </div>
          </div>

          {/* VENCIMENTO */}
          <div>
            <div className="text-center text-[10.5px] font-bold text-gray-900 tracking-wider uppercase mb-1.5">
              VENCIMENTO
            </div>
            <div className="bg-[#ebedf0] py-2 px-3 text-center text-[12px] font-bold text-gray-900 rounded-[3px] min-h-[34px] flex items-center justify-center">
              {formattedVencimento || ''}
            </div>
          </div>
        </div>

        {/* Thin Divider Line */}
        <div className="border-t border-gray-300 my-6"></div>

        {/* Sacado Box */}
        <div className="border border-gray-400 bg-white">
          <div className="grid grid-cols-[130px_1fr]">
            {/* Left Labels Column */}
            <div className="border-r border-gray-400 px-3.5 py-3 space-y-2 text-[10.5px] font-bold text-gray-950 uppercase tracking-wide">
              <div>SACADO</div>
              <div>ENDEREÇO</div>
              <div>MUNICÍPIO</div>
              <div>UF</div>
              <div>CNPJ</div>
            </div>

            {/* Right Values Column */}
            <div className="px-4 py-3 space-y-2 text-[10.5px] font-semibold text-gray-900 uppercase">
              <div className="truncate min-h-[16px]">{client.sacado || ''}</div>
              <div className="truncate min-h-[16px]">{client.endereco || ''}</div>
              <div className="truncate min-h-[16px]">{client.municipio || ''}</div>
              <div className="truncate min-h-[16px]">{client.uf || ''}</div>
              <div className="truncate min-h-[16px]">{client.cnpj || ''}</div>
            </div>
          </div>
        </div>

        {/* Valor Por Extenso Box */}
        <div className="border border-gray-400 bg-white mt-5">
          <div className="grid grid-cols-[130px_1fr]">
            <div className="border-r border-gray-400 px-3 py-2 text-center flex flex-col justify-center text-[9.5px] font-bold text-gray-950 uppercase leading-tight">
              <span>VALOR POR</span>
              <span>EXTENSO</span>
            </div>
            <div className="px-4 py-2 flex items-center text-[11px] text-gray-900 lowercase font-medium min-h-[32px]">
              {valorExtenso || ''}
            </div>
          </div>
        </div>

        {/* Legal acknowledgment disclaimer */}
        <p className="text-[10.5px] text-gray-800 mt-2 font-normal">
          Reconhecemos a exatidão desta DUPLICATA de Prestação de Serviços, na importância acima que pagaremos a BE Travel.
        </p>

        {/* Itinerary / Flight Table (Supports Multiple Locators) */}
        <div className="mt-7">
          {/* Table Header Bar */}
          <div className="bg-[#ebedf0] py-2 px-3 rounded-[3px] flex items-center text-[10.5px] font-bold text-gray-950 uppercase tracking-wider">
            <div className="w-[18%]">LOCALIZADOR</div>
            <div className="w-[32%]">PASSAGEIRO</div>
            <div className="w-[22%]">ROTA</div>
            <div className="w-[14%]">DATA</div>
            <div className="w-[14%] text-right">VALOR</div>
          </div>

          {/* Table Rows for Each Flight Item */}
          <div className="divide-y divide-gray-100">
            {flightItems.map((item, index) => {
              const itemFormattedValor =
                item.valor && item.valor > 0
                  ? formatCurrencyBRL(item.valor).replace(/\s/g, '')
                  : flightItems.length === 1
                  ? formattedValor
                  : '';

              return (
                <div
                  key={item.id || index}
                  className="px-3 py-2.5 flex items-start text-[11px] text-gray-900"
                >
                  {/* Localizador */}
                  <div className="w-[18%] font-bold tracking-wider uppercase pr-2 break-all">
                    {item.localizador || ''}
                  </div>

                  {/* Passageiro */}
                  <div className="w-[32%] font-medium uppercase pr-2 leading-snug break-words">
                    {item.passageiro || ''}
                  </div>

                  {/* Rota (2 linhas: Ida em cima e Volta em baixo) */}
                  <div className="w-[22%] font-medium uppercase pr-2 leading-tight">
                    <div>{item.rotaIda || item.rota || ''}</div>
                    {item.rotaVolta ? (
                      <div className="mt-1">{item.rotaVolta}</div>
                    ) : null}
                  </div>

                  {/* Data (2 linhas: Data Ida em cima e Data Volta em baixo) */}
                  <div className="w-[14%] font-medium leading-tight">
                    <div>{item.dataIda || item.data || ''}</div>
                    {item.dataVolta ? (
                      <div className="mt-1">{item.dataVolta}</div>
                    ) : null}
                  </div>

                  {/* Valor */}
                  <div className="w-[14%] text-right font-bold text-gray-950">
                    {itemFormattedValor}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="pt-8">
        <div className="text-[10.5px] leading-[1.5] text-gray-900 font-medium">
          <p>{agencyInfo.instrucaoPagamento}</p>
          <p>CNPJ - {agencyInfo.cnpj}</p>
          <p>{agencyInfo.nome}</p>
        </div>
      </div>
    </div>
  );
};

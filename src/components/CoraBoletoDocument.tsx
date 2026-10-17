import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { InvoiceData } from '../types';
import { formatIsoToBr } from '../utils/dateUtils';
import { formatCurrencyBRL } from '../utils/numberToWordsPtBr';

interface CoraBoletoProps {
  invoice: InvoiceData;
  scale?: number;
}

export const CoraBoletoDocument: React.FC<CoraBoletoProps> = ({ invoice, scale = 1 }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const { numero, valor, dataEmissao, dataVencimento, client, agencyInfo } = invoice;

  const formattedValor = formatCurrencyBRL(valor);
  const formattedEmissao = formatIsoToBr(dataEmissao);
  const formattedVencimento = formatIsoToBr(dataVencimento);
  const cleanNumero = numero.replace(/[^0-9]/g, '') || '453426';

  // Construct a realistic Cora linha digitável
  const valString = Math.round(valor * 100)
    .toString()
    .padStart(10, '0');
  const linhaDigitavel = `40390.00007 58474.217021 04764.${cleanNumero.slice(-3).padStart(3, '0')}017 8 1599${valString}`;

  const pixPayload = `00020126580014br.gov.bcb.pix013658474217000113520400005303986540${valor.toFixed(2)}5802BR5909BE TRAVEL6008SAO JOSE62070503***6304`;

  useEffect(() => {
    QRCode.toDataURL(pixPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR code error', err));
  }, [pixPayload]);

  return (
    <div
      className="invoice-page bg-white text-gray-900 shadow-2xl mx-auto relative flex flex-col justify-between"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: '297mm',
        padding: '24mm 22mm 20mm 22mm',
        boxSizing: 'border-box',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div>
        {/* Cora Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <p className="text-[12px] font-medium text-gray-600">
              Um banco exclusivo para empresas.
            </p>
            <p className="text-[12px] font-semibold text-rose-600">
              Acesse ou clique: cora.com.br
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white font-black text-xs">
              c
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-lg tracking-tight text-gray-900">
                cora
              </span>
              <p className="text-[10px] text-gray-500 font-medium">
                A parte simples do seu negócio.
              </p>
            </div>
          </div>
        </div>

        {/* 2 Big Action Cards: Valor & Vencimento */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-[#fbf7f8] rounded-xl p-4 flex items-center gap-3.5 border border-rose-100/60">
            <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              $
            </div>
            <div>
              <span className="text-[11px] font-medium text-gray-500">Valor</span>
              <div className="text-xl font-bold text-gray-900">{formattedValor}</div>
            </div>
          </div>

          <div className="bg-[#fbf7f8] rounded-xl p-4 flex items-center gap-3.5 border border-rose-100/60">
            <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white text-xs shrink-0">
              📅
            </div>
            <div>
              <span className="text-[11px] font-medium text-gray-500">Vencimento</span>
              <div className="text-xl font-bold text-gray-900">{formattedVencimento}</div>
            </div>
          </div>
        </div>

        {/* 2 Columns: Details on Left, QR Code and Barcode on Right */}
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-6 mt-6">
          {/* Left Details */}
          <div className="space-y-4 text-[11px] text-gray-800">
            <div>
              <span className="font-semibold text-rose-600 block text-[12px] mb-0.5">
                Beneficiário
              </span>
              <p className="font-bold text-gray-950 text-[12px]">{agencyInfo.nome}</p>
              <p className="text-gray-600">CNPJ {agencyInfo.cnpj}</p>
            </div>

            <div>
              <span className="font-semibold text-rose-600 block text-[12px] mb-0.5">
                Descrição
              </span>
              <p className="font-medium text-gray-900">
                Passagens Aéreas - {numero}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
              <div>
                <span className="font-semibold text-rose-600 block text-[11px]">
                  Antes do vencimento
                </span>
                <p className="font-bold text-gray-900">R$ 0,00</p>
                <p className="text-[10px] text-gray-500">desconto</p>
              </div>

              <div>
                <span className="font-semibold text-rose-600 block text-[11px]">
                  Após o vencimento
                </span>
                <div className="flex gap-4">
                  <div>
                    <p className="font-bold text-gray-900">R$ 0,00</p>
                    <p className="text-[10px] text-gray-500">multa</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">0,00%</p>
                    <p className="text-[10px] text-gray-500">juros</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-gray-500">
              <p>Intermediado por: Cora SCFI</p>
              <p>CNPJ 37.880.206/0001-63</p>
            </div>
          </div>

          {/* Right QR Code & Linha Digitável */}
          <div className="flex flex-col items-center bg-gray-50/70 p-4 rounded-xl border border-gray-200">
            <span className="text-[10.5px] font-medium text-gray-600 mb-2 text-center">
              Pague esse boleto via Pix com o QR code abaixo:
            </span>

            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code Pix"
                className="w-32 h-32 border border-gray-200 rounded p-1 bg-white shadow-xs"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                Gerando QR Code...
              </div>
            )}

            <div className="mt-3 text-center w-full">
              <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                Linha Digitável:
              </span>
              <p className="font-mono text-[9.5px] font-semibold text-gray-900 bg-white p-1.5 rounded border border-gray-200 select-all tracking-tight break-all">
                {linhaDigitavel}
              </p>
            </div>
          </div>
        </div>

        {/* Promo Bar */}
        <div className="bg-[#f0f2f5] py-2 px-4 rounded-lg text-center text-[11px] font-medium text-gray-700 mt-6">
          Tudo na Cora é tão simples quanto emitir este boleto. Abra sua conta grátis.
        </div>
      </div>

      {/* Bottom Banking Slip (Ficha de Compensação) */}
      <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-6">
        {/* Slip Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-tight">cora</span>
            <span className="font-bold text-sm border-l-2 border-r-2 border-black px-2">
              403-9
            </span>
          </div>
          <div className="font-mono font-bold text-[11px] tracking-tight">
            {linhaDigitavel}
          </div>
        </div>

        {/* Slip Grid Fields */}
        <div className="border border-black text-[9px]">
          <div className="grid grid-cols-[3fr_1fr] border-b border-black">
            <div className="p-1 border-r border-black">
              <div className="text-gray-600 font-semibold text-[8px]">Local de Pagamento</div>
              <div className="font-bold text-gray-900">Pagável em qualquer agência bancária</div>
            </div>
            <div className="p-1 bg-gray-50">
              <div className="text-gray-600 font-semibold text-[8px]">Vencimento</div>
              <div className="font-bold text-gray-900 text-right">{formattedVencimento}</div>
            </div>
          </div>

          <div className="grid grid-cols-[3fr_1fr] border-b border-black">
            <div className="p-1 border-r border-black">
              <div className="text-gray-600 font-semibold text-[8px]">Beneficiário</div>
              <div className="font-bold text-gray-900">{agencyInfo.nome} - CNPJ {agencyInfo.cnpj}</div>
            </div>
            <div className="p-1">
              <div className="text-gray-600 font-semibold text-[8px]">Agência / Código Beneficiário</div>
              <div className="font-bold text-gray-900 text-right">0001 / 58474217</div>
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] border-b border-black">
            <div className="p-1 border-r border-black">
              <div className="text-gray-600 font-semibold text-[8px]">Data do Documento</div>
              <div className="font-medium text-gray-900">{formattedEmissao}</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-gray-600 font-semibold text-[8px]">Nr. do Documento</div>
              <div className="font-medium text-gray-900">{cleanNumero}</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-gray-600 font-semibold text-[8px]">Espécie Doc</div>
              <div className="font-medium text-gray-900">DV</div>
            </div>
            <div className="p-1 bg-gray-50">
              <div className="text-gray-600 font-semibold text-[8px]">(=) Valor do Documento</div>
              <div className="font-bold text-gray-900 text-right">{formattedValor}</div>
            </div>
          </div>

          <div className="p-1 border-b border-black">
            <div className="text-gray-600 font-semibold text-[8px]">Pagador</div>
            <div className="font-bold text-gray-900 uppercase">
              {client.sacado || '—'} - CNPJ {client.cnpj || '—'}
            </div>
            <div className="text-gray-700 uppercase text-[8px]">
              {client.endereco}, {client.municipio} - {client.uf}
            </div>
          </div>
        </div>

        {/* Barcode Strip Vector Replica */}
        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-[2px] h-10 overflow-hidden">
            {[4, 1, 3, 2, 4, 1, 2, 4, 2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 3, 1, 2, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 4, 2, 1, 3].map(
              (width, i) => (
                <div
                  key={i}
                  className="bg-black h-10"
                  style={{ width: `${width}px` }}
                />
              )
            )}
          </div>
          <span className="text-[8.5px] text-gray-500 font-mono">
            Autenticação Mecânica - Ficha de Compensação
          </span>
        </div>
      </div>
    </div>
  );
};

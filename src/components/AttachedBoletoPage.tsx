import React, { useMemo } from 'react';
import { AttachedBoleto } from '../types';
import { FileText, Eye, CheckCircle2, Download, ExternalLink } from 'lucide-react';

interface AttachedBoletoPageProps {
  boleto: AttachedBoleto;
  scale?: number;
}

export const AttachedBoletoPage: React.FC<AttachedBoletoPageProps> = ({
  boleto,
  scale = 1,
}) => {
  // Convert base64 dataUrl to Blob URL so Chrome does NOT block it as a data: iframe
  const blobUrl = useMemo(() => {
    if (!boleto.dataUrl) return '';
    try {
      const parts = boleto.dataUrl.split(',');
      const base64 = parts[1] || parts[0];
      const binaryString = atob(base64.replace(/[^A-Za-z0-9+/=]/g, ''));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const mime = boleto.fileType === 'pdf' ? 'application/pdf' : 'image/png';
      const blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      return boleto.dataUrl;
    }
  }, [boleto.dataUrl, boleto.fileType]);



  return (
    <div
      id="boleto-print-area"
      className="invoice-page bg-white text-gray-900 shadow-2xl mx-auto relative flex flex-col justify-between print:break-before-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: '297mm',
        padding: '16mm 16mm 16mm 16mm',
        boxSizing: 'border-box',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
        pageBreakBefore: 'always',
        breakBefore: 'page',
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4 print:mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">
              Página 2: Boleto Bancário / Documento de Cobrança
            </h2>
            <p className="text-[10px] text-gray-500">
              Arquivo: {boleto.fileName} · Anexado para quitação
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
              title="Abrir arquivo do boleto em nova aba"
            >
              <ExternalLink className="w-3 h-3 text-slate-600" />
              <span>Abrir Arquivo</span>
            </a>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>2ª Página Pronta</span>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden bg-slate-50/70 rounded-xl border border-slate-200 p-4">
        {boleto.fileType === 'image' ? (
          <img
            src={boleto.dataUrl}
            alt="Boleto Bancário"
            className="max-h-[240mm] max-w-full object-contain mx-auto shadow-2xs rounded"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg border border-slate-200/90 shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 shadow-xs">
              <FileText className="w-9 h-9" />
            </div>

            <h3 className="text-sm font-extrabold text-slate-900 uppercase">
              Boleto Bancário em PDF Anexado
            </h3>
            <p className="text-xs text-slate-600 font-mono font-bold mt-1">
              {boleto.fileName}
            </p>
            {boleto.fileSize && (
              <span className="text-[11px] text-slate-400 mt-0.5">
                Tamanho: {(boleto.fileSize / 1024).toFixed(0)} KB
              </span>
            )}

            <div className="mt-5 max-w-md bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Arquivo PDF pronto para mesclagem de 2 páginas</span>
              </div>
              <p className="text-[11.5px] text-emerald-700">
                Ao clicar em <strong>"Baixar PDF Oficial (.pdf)"</strong>, este boleto é incorporado diretamente com qualidade vetorial original (código de barras 100% nítido e legível).
              </p>
            </div>

            {blobUrl && (
              <div className="mt-5 flex items-center gap-3 print:hidden">
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visualizar / Conferir Boleto</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="pt-3 text-center border-t border-gray-200 mt-3 text-[10px] text-gray-500">
        <span>Documento anexo à fatura principal · Pagamento sujeito às condições expressas no boleto bancário</span>
      </div>
    </div>
  );
};

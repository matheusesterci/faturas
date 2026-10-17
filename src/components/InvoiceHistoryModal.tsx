import React, { useState } from 'react';
import { InvoiceData } from '../types';
import { formatIsoToBr } from '../utils/dateUtils';
import { formatCurrencyBRL } from '../utils/numberToWordsPtBr';
import { History, X, Search, FileText, Trash2, ArrowRight } from 'lucide-react';

interface InvoiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: InvoiceData[];
  onLoadInvoice: (invoice: InvoiceData) => void;
  onDeleteInvoice: (id: string) => void;
}

export const InvoiceHistoryModal: React.FC<InvoiceHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onLoadInvoice,
  onDeleteInvoice,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter((inv) => {
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      (inv.numero && inv.numero.toLowerCase().includes(s)) ||
      (inv.client.sacado && inv.client.sacado.toLowerCase().includes(s)) ||
      (inv.client.cnpj && inv.client.cnpj.includes(s)) ||
      (inv.localizador && inv.localizador.toLowerCase().includes(s)) ||
      (inv.passageiros && inv.passageiros.some((p) => p.toLowerCase().includes(s))) ||
      (inv.rotas && inv.rotas.some((r) => r.rota.toLowerCase().includes(s))) ||
      (inv.itens &&
        inv.itens.some(
          (it) =>
            (it.localizador && it.localizador.toLowerCase().includes(s)) ||
            (it.passageiro && it.passageiro.toLowerCase().includes(s)) ||
            (it.rotaIda && it.rotaIda.toLowerCase().includes(s)) ||
            (it.rotaVolta && it.rotaVolta.toLowerCase().includes(s)) ||
            (it.rota && it.rota.toLowerCase().includes(s)) ||
            (it.dataIda && it.dataIda.toLowerCase().includes(s)) ||
            (it.dataVolta && it.dataVolta.toLowerCase().includes(s)) ||
            (it.data && it.data.toLowerCase().includes(s))
        ))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Histórico de Faturas Emitidas</h2>
              <p className="text-xs text-slate-500">
                Acesse ou recupere faturas geradas anteriormente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por número da fatura, sacado, localizador ou passageiro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhuma fatura encontrada no histórico.</p>
              <p className="text-xs text-slate-400 mt-1">
                Ao emitir ou clicar em "Salvar no Histórico", suas faturas ficam salvas aqui.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white transition-all flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded">
                      Nº {item.numero}
                    </span>
                    <span className="font-bold text-xs text-slate-900">
                      {formatCurrencyBRL(item.valor)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Emissão: {formatIsoToBr(item.dataEmissao)} · Vencimento: {formatIsoToBr(item.dataVencimento)}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 mt-1.5 uppercase truncate">
                    {item.client.sacado}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                    {item.itens && item.itens.length > 0 ? (
                      <>
                        <span>
                          {item.itens.length} {item.itens.length === 1 ? 'voo / localizador' : 'voos / localizadores'}:
                        </span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {item.itens.map((it) => it.localizador || 'S/LOC').join(', ')}
                        </span>
                        <span>·</span>
                        <span>
                          Passageiros: <strong className="text-slate-700">{item.itens.map((it) => it.passageiro).filter(Boolean).join(', ') || '—'}</strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          Loc: <strong className="text-slate-700">{item.localizador || '—'}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Passageiro: <strong className="text-slate-700">{(item.passageiros || []).join(', ') || '—'}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Rotas: {(item.rotas || []).map((r) => r.rota).join(' / ') || '—'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onLoadInvoice(item);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <span>Carregar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteInvoice(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir do Histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{history.length} fatura(s) salvas no navegador</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

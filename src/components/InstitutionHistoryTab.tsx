import React, { useState, useMemo } from 'react';
import { FlightItem, InvoiceData } from '../types';
import { formatIsoToBr } from '../utils/dateUtils';
import { formatCurrencyBRL } from '../utils/numberToWordsPtBr';
import {
  Building2,
  Search,
  Printer,
  Edit3,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Plane,
  User,
  Plus,
  CheckCircle2,
  FileDown,
} from 'lucide-react';

interface InstitutionHistoryTabProps {
  history: InvoiceData[];
  onEditInvoice: (invoice: InvoiceData) => void;
  onPrintInvoice: (invoice: InvoiceData) => void;
  onDownloadInvoicePdf?: (invoice: InvoiceData) => Promise<void> | void;
  onDeleteInvoice: (id: string) => void;
  onGoToNewInvoice: () => void;
}

export const InstitutionHistoryTab: React.FC<InstitutionHistoryTabProps> = ({
  history,
  onEditInvoice,
  onPrintInvoice,
  onDownloadInvoicePdf,
  onDeleteInvoice,
  onGoToNewInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [expandedInstitutions, setExpandedInstitutions] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group invoices by institution (sacado)
  const groupedData = useMemo(() => {
    const map = new Map<
      string,
      {
        institutionName: string;
        cnpj: string;
        endereco: string;
        municipio: string;
        uf: string;
        invoices: InvoiceData[];
        totalValue: number;
      }
    >();

    history.forEach((inv) => {
      const key = inv.client.sacado ? inv.client.sacado.trim().toUpperCase() : 'SEM INSTITUIÇÃO DEFINIDA';
      if (!map.has(key)) {
        map.set(key, {
          institutionName: key,
          cnpj: inv.client.cnpj || '—',
          endereco: inv.client.endereco || '—',
          municipio: inv.client.municipio || '—',
          uf: inv.client.uf || '—',
          invoices: [],
          totalValue: 0,
        });
      }
      const entry = map.get(key)!;
      entry.invoices.push(inv);
      entry.totalValue += inv.valor || 0;
    });

    return Array.from(map.values()).sort((a, b) => b.invoices.length - a.invoices.length);
  }, [history]);

  // Filtered by search and institution dropdown
  const filteredGroups = useMemo(() => {
    return groupedData
      .filter((group) => {
        if (selectedInstitution !== 'all' && group.institutionName !== selectedInstitution) {
          return false;
        }
        return true;
      })
      .map((group) => {
        const matchingInvoices = group.invoices.filter((inv) => {
          if (!searchTerm.trim()) return true;
          const s = searchTerm.toLowerCase();
          return (
            group.institutionName.toLowerCase().includes(s) ||
            group.cnpj.includes(s) ||
            inv.numero.toLowerCase().includes(s) ||
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
        return {
          ...group,
          invoices: matchingInvoices,
        };
      })
      .filter((group) => group.invoices.length > 0);
  }, [groupedData, selectedInstitution, searchTerm]);

  const toggleExpand = (institutionName: string) => {
    setExpandedInstitutions((prev) => ({
      ...prev,
      [institutionName]: prev[institutionName] === undefined ? false : !prev[institutionName],
    }));
  };

  const isExpanded = (institutionName: string) => {
    return expandedInstitutions[institutionName] !== false;
  };

  const handleCopySummary = (inv: InvoiceData) => {
    const formattedValor = inv.valor > 0 ? `R$ ${inv.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
    const itemsList =
      inv.itens && inv.itens.length > 0
        ? inv.itens
        : [
            {
              id: '1',
              localizador: inv.localizador || '',
              passageiro: (inv.passageiros || []).join(', '),
              rotaIda: (inv.rotas && inv.rotas[0]?.rota) || '',
              rotaVolta: (inv.rotas && inv.rotas[1]?.rota) || '',
              dataIda: (inv.rotas && inv.rotas[0]?.data) || '',
              dataVolta: (inv.rotas && inv.rotas[1]?.data) || '',
              rota: (inv.rotas || []).map((r) => r.rota).join(' / '),
              data: (inv.rotas || []).map((r) => r.data).join(' / '),
            },
          ];

    const flightsText = itemsList
      .map((it) => {
        const rotaDesc = it.rotaVolta ? `${it.rotaIda || it.rota} / ${it.rotaVolta}` : (it.rotaIda || it.rota || '—');
        const dataDesc = it.dataVolta ? `${it.dataIda || it.data} a ${it.dataVolta}` : (it.dataIda || it.data || '—');
        return `• Loc: *${it.localizador || '—'}* | Passageiro: *${it.passageiro || '—'}* | Rota: *${rotaDesc}* | Data: *${dataDesc}*`;
      })
      .join('\n');

    const text = `*FATURA / DUPLICATA - BE TRAVEL*
*Nº:* ${inv.numero}
*Sacado:* ${inv.client.sacado}
*CNPJ:* ${inv.client.cnpj}
*Valor:* ${formattedValor}
*Vencimento:* ${formatIsoToBr(inv.dataVencimento)}

*VOOS / LOCALIZADORES:*
${flightsText}`;

    navigator.clipboard.writeText(text);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const totalInvoicesCount = history.length;
  const totalBilledValue = history.reduce((sum, i) => sum + (i.valor || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-800" />
              <span>Histórico de Faturas por Instituição / Cliente</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consulte, baixe em PDF ou edite faturas salvas automaticamente ao emitir
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToNewInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Emitir Nova Fatura</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Instituições com Faturas
            </span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {groupedData.length}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Faturas Emitidas
            </span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {totalInvoicesCount}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Valor Total Faturado
            </span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block font-mono">
              {formatCurrencyBRL(totalBilledValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por instituição, número da fatura, passageiro, localizador ou rota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="w-full sm:w-auto min-w-[240px]">
          <select
            value={selectedInstitution}
            onChange={(e) => setSelectedInstitution(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="all">Todas as Instituições ({groupedData.length})</option>
            {groupedData.map((g) => (
              <option key={g.institutionName} value={g.institutionName}>
                {g.institutionName} ({g.invoices.length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Institutions and Invoices List */}
      <div className="space-y-5">
        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <h3 className="text-sm font-bold text-slate-700">Nenhuma fatura encontrada</h3>
            <p className="text-xs text-slate-500 mt-1">
              {history.length === 0
                ? 'Emita uma fatura no "Emissor de Faturas" e clique em "Baixar / Imprimir PDF" para que ela seja salva automaticamente aqui.'
                : 'Nenhum resultado corresponde à sua busca atual.'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const open = isExpanded(group.institutionName);
            return (
              <div
                key={group.institutionName}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
              >
                {/* Institution Group Header */}
                <div
                  onClick={() => toggleExpand(group.institutionName)}
                  className="p-5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                        {group.institutionName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span>CNPJ: <strong className="text-slate-700 font-mono">{group.cnpj}</strong></span>
                        <span>·</span>
                        <span>{group.municipio} / {group.uf}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        {group.invoices.length} fatura(s)
                      </span>
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        {formatCurrencyBRL(group.totalValue)}
                      </span>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400">
                      {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Invoices List under this Institution */}
                {open && (
                  <div className="divide-y divide-slate-100 p-2 sm:p-4 bg-white">
                    {group.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 hover:bg-slate-50/80 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Invoice Info */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
                              Nº {inv.numero || 'S/N'}
                            </span>
                            <span className="font-bold text-sm text-slate-950 font-mono">
                              {inv.valor > 0 ? formatCurrencyBRL(inv.valor) : 'R$ 0,00'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Emissão: <strong>{formatIsoToBr(inv.dataEmissao)}</strong> · Vencimento: <strong>{formatIsoToBr(inv.dataVencimento)}</strong>
                            </span>
                          </div>

                          {/* Flight & Passenger details */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
                            {(() => {
                              const itemsList: FlightItem[] =
                                inv.itens && inv.itens.length > 0
                                  ? inv.itens
                                  : [
                                      {
                                        id: '1',
                                        localizador: inv.localizador || '',
                                        passageiro: (inv.passageiros || []).join(', '),
                                        rotaIda: (inv.rotas && inv.rotas[0]?.rota) || '',
                                        rotaVolta: (inv.rotas && inv.rotas[1]?.rota) || '',
                                        dataIda: (inv.rotas && inv.rotas[0]?.data) || '',
                                        dataVolta: (inv.rotas && inv.rotas[1]?.data) || '',
                                        rota: (inv.rotas || []).map((r) => r.rota).join(' / '),
                                        data: (inv.rotas || []).map((r) => r.data).join(' / '),
                                      },
                                    ];

                              const locs = itemsList.map((i) => i.localizador).filter(Boolean).join(', ') || '—';
                              const passengers = itemsList.map((i) => i.passageiro).filter(Boolean).join(', ') || 'Sem passageiro';
                              const routes =
                                itemsList
                                  .map((i) => {
                                    const r = i.rotaVolta
                                      ? `${i.rotaIda || i.rota} / ${i.rotaVolta}`
                                      : i.rotaIda || i.rota || '';
                                    const d = i.dataVolta
                                      ? `${i.dataIda || i.data} a ${i.dataVolta}`
                                      : i.dataIda || i.data || '';
                                    return `${r}${d ? ` (${d})` : ''}`;
                                  })
                                  .filter((r) => r.trim() !== '')
                                  .join(' | ') || 'Sem trecho';

                              return (
                                <>
                                  <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                                    <span className="text-slate-400 font-normal">Loc(s):</span>
                                    <span>{locs}</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-800 font-medium uppercase truncate max-w-xs">
                                      {passengers}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Plane className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-800 font-medium truncate max-w-sm">
                                      {routes}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Action Buttons for this Invoice */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {/* Baixar PDF Oficial (.pdf) */}
                          <button
                            type="button"
                            onClick={() => (onDownloadInvoicePdf ? onDownloadInvoicePdf(inv) : onPrintInvoice(inv))}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs"
                            title="Baixar arquivo PDF oficial desta fatura diretamente"
                          >
                            <FileDown className="w-3.5 h-3.5 text-white" />
                            <span>Baixar PDF</span>
                          </button>

                          {/* Acessar / Editar */}
                          <button
                            type="button"
                            onClick={() => onEditInvoice(inv)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                            title="Abrir esta fatura no editor para modificar ou visualizar"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Editar</span>
                          </button>

                          {/* Imprimir */}
                          <button
                            type="button"
                            onClick={() => onPrintInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            title="Imprimir fatura (Ctrl+P)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Copiar WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleCopySummary(inv)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Copiar resumo do texto para WhatsApp"
                          >
                            {copiedId === inv.id ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir do histórico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

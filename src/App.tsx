import React, { useState, useEffect } from 'react';
import { ClientProfile, InvoiceData, AgencyInfo } from './types';
import {
  DEFAULT_AGENCY,
  DEFAULT_PROFILES,
  createBlankInvoice,
} from './data/defaultProfiles';
import { InvoiceDocument } from './components/InvoiceDocument';
import { AttachedBoletoPage } from './components/AttachedBoletoPage';
import { InvoiceForm } from './components/InvoiceForm';
import { InstitutionHistoryTab } from './components/InstitutionHistoryTab';
import { ProfileModal } from './components/ProfileModal';
import { AgencyConfigModal } from './components/AgencyConfigModal';
import { BeTravelLogo } from './components/BeTravelLogo';
import { downloadInvoicePdf } from './utils/pdfGenerator';
import {
  safeLocalStorageSet,
  sanitizeInvoiceForStorage,
  getBoletoFromIDB,
} from './utils/safeStorage';
import {
  FileText,
  Users,
  Building2,
  Settings,
  Printer,
  ZoomIn,
  ZoomOut,
  Eye,
  Sliders,
  Sparkles,
  RotateCcw,
  FileDown,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

const STORAGE_KEYS = {
  CUSTOM_LOGO: 'be_travel_custom_logo',
  PROFILES: 'be_travel_profiles_v3',
  CURRENT_INVOICE: 'be_travel_current_invoice_v3',
  LAST_INVOICE_NUMBER: 'be_travel_last_invoice_number',
  HISTORY: 'be_travel_history_v3',
  AGENCY: 'be_travel_agency_v3',
};

// Search all previous keys to recover user's uploaded logo
function findSavedCustomLogo(): string | null {
  try {
    const direct = localStorage.getItem(STORAGE_KEYS.CUSTOM_LOGO);
    if (direct) return direct;

    const agencyKeys = [
      'be_travel_agency_v3',
      'be_travel_agency_v2',
      'be_travel_agency_v1',
      'be_travel_agency',
    ];
    for (const key of agencyKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.customLogoUrl) return parsed.customLogoUrl;
        } catch {}
      }
    }

    const invoiceKeys = [
      'be_travel_current_invoice_v3',
      'be_travel_current_invoice_v2',
      'be_travel_current_invoice_v1',
      'be_travel_current_invoice',
    ];
    for (const key of invoiceKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.agencyInfo?.customLogoUrl) return parsed.agencyInfo.customLogoUrl;
        } catch {}
      }
    }

    const historyKeys = [
      'be_travel_history_v3',
      'be_travel_history_v2',
      'be_travel_history_v1',
      'be_travel_history',
    ];
    for (const key of historyKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item?.agencyInfo?.customLogoUrl) return item.agencyInfo.customLogoUrl;
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('Error finding saved custom logo', err);
  }
  return null;
}

export default function App() {
  // Agency info
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo>(() => {
    const recoveredLogo = findSavedCustomLogo();
    let baseAgency = DEFAULT_AGENCY;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AGENCY);
      if (saved) {
        baseAgency = JSON.parse(saved);
      }
    } catch {}

    if (recoveredLogo) {
      baseAgency = { ...baseAgency, customLogoUrl: recoveredLogo };
    }
    return baseAgency;
  });

  // Profiles - strictly the 2 models initially
  const [profiles, setProfiles] = useState<ClientProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_PROFILES;
  });

  // Last invoice number
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.LAST_INVOICE_NUMBER) || '4534/26';
  });

  // Active Invoice - starts with blank data, keeping only last invoice number
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_INVOICE);
      if (saved) {
        const parsed = JSON.parse(saved);
        const recoveredLogo = findSavedCustomLogo();
        if (recoveredLogo && parsed.agencyInfo) {
          parsed.agencyInfo.customLogoUrl = recoveredLogo;
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    const initialNum = localStorage.getItem(STORAGE_KEYS.LAST_INVOICE_NUMBER) || '4534/26';
    return createBlankInvoice(initialNum, agencyInfo);
  });

  // Invoices History
  const [history, setHistory] = useState<InvoiceData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Active Tab: 'emitter' | 'history'
  const [activeNavTab, setActiveNavTab] = useState<'emitter' | 'history'>('emitter');

  // UI States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'form' | 'preview'>('form');
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync to localStorage safely
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.AGENCY, JSON.stringify(agencyInfo));
    if (agencyInfo.customLogoUrl) {
      safeLocalStorageSet(STORAGE_KEYS.CUSTOM_LOGO, agencyInfo.customLogoUrl);
    }
  }, [agencyInfo]);

  useEffect(() => {
    const sanitized = sanitizeInvoiceForStorage(invoice);
    safeLocalStorageSet(STORAGE_KEYS.CURRENT_INVOICE, JSON.stringify(sanitized));
    if (invoice.numero) {
      safeLocalStorageSet(STORAGE_KEYS.LAST_INVOICE_NUMBER, invoice.numero);
      setLastInvoiceNumber(invoice.numero);
    }
  }, [invoice]);

  useEffect(() => {
    const sanitizedHistory = history.map(sanitizeInvoiceForStorage);
    safeLocalStorageSet(STORAGE_KEYS.HISTORY, JSON.stringify(sanitizedHistory));
  }, [history]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Profile Handlers
  const handleSaveProfile = (newOrUpdated: ClientProfile) => {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === newOrUpdated.id);
      if (exists) {
        return prev.map((p) => (p.id === newOrUpdated.id ? newOrUpdated : p));
      }
      return [newOrUpdated, ...prev];
    });

    if (invoice.client.id === newOrUpdated.id) {
      setInvoice((prev) => ({ ...prev, client: newOrUpdated }));
    }
    showNotification('Perfil do cliente salvo com sucesso!');
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    showNotification('Perfil excluído.');
  };

  const handleSaveAgencyInfo = (info: AgencyInfo) => {
    setAgencyInfo(info);
    setInvoice((prev) => ({ ...prev, agencyInfo: info }));
    if (info.customLogoUrl) {
      safeLocalStorageSet(STORAGE_KEYS.CUSTOM_LOGO, info.customLogoUrl);
    }
    showNotification('Dados da agência salvos com sucesso!');
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [invoiceForOffscreen, setInvoiceForOffscreen] = useState<InvoiceData | null>(null);
  const [downloadedPdfInfo, setDownloadedPdfInfo] = useState<{
    url: string;
    serverDownloadUrl?: string;
    serverViewUrl?: string;
    filename: string;
    invoiceNum: string;
    base64: string;
  } | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Trigger file download via backend route to bypass iframe restrictions
  const handleDownloadViaServer = () => {
    if (!downloadedPdfInfo) return;
    if (downloadedPdfInfo.serverDownloadUrl) {
      window.location.assign(downloadedPdfInfo.serverDownloadUrl);
      return;
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/download-pdf';
    form.target = '_blank';

    const inputData = document.createElement('input');
    inputData.type = 'hidden';
    inputData.name = 'base64Pdf';
    inputData.value = downloadedPdfInfo.base64;
    form.appendChild(inputData);

    const inputName = document.createElement('input');
    inputName.type = 'hidden';
    inputName.name = 'filename';
    inputName.value = downloadedPdfInfo.filename;
    form.appendChild(inputName);

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 1000);
  };

  // Download official PDF file (with Page 1 and Page 2 Boleto if attached)
  const handleDownloadPdf = async (targetInvoice?: InvoiceData) => {
    const invToSave = targetInvoice || invoice;
    setIsDownloadingPdf(true);

    try {
      // If invoice has a boleto in IDB without dataUrl in state, load it
      if (invToSave.attachedBoleto && !invToSave.attachedBoleto.dataUrl) {
        const idbData = await getBoletoFromIDB(invToSave.id);
        if (idbData) {
          invToSave.attachedBoleto.dataUrl = idbData;
        }
      }

      setInvoiceForOffscreen(invToSave);
      // Give browser a moment to render offscreen element
      await new Promise((resolve) => setTimeout(resolve, 80));

      const result = await downloadInvoicePdf(invToSave);

      let serverDownloadUrl = '';
      let serverViewUrl = '';
      try {
        const storeRes = await fetch('/api/store-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Pdf: result.base64,
            filename: result.filename,
          }),
        });
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          if (storeData.success) {
            serverDownloadUrl = storeData.downloadUrl;
            serverViewUrl = storeData.viewUrl;
          }
        }
      } catch (e) {
        console.warn('Erro ao registrar PDF temporário no servidor:', e);
      }

      setDownloadedPdfInfo({
        url: result.blobUrl,
        serverDownloadUrl,
        serverViewUrl,
        filename: result.filename,
        invoiceNum: invToSave.numero || 'S/N',
        base64: result.base64,
      });
      setIsDownloadModalOpen(true);

      // Auto-trigger direct file download via server URL
      if (serverDownloadUrl) {
        try {
          const dlFrame = document.createElement('iframe');
          dlFrame.style.display = 'none';
          dlFrame.src = serverDownloadUrl;
          document.body.appendChild(dlFrame);
          setTimeout(() => {
            if (document.body.contains(dlFrame)) document.body.removeChild(dlFrame);
          }, 6000);
        } catch {}
      }

      // Auto-save to history
      if (invToSave.numero || invToSave.client.sacado) {
        setHistory((prev) => {
          const existsIndex = prev.findIndex((item) => item.id === invToSave.id);
          if (existsIndex >= 0) {
            const copy = [...prev];
            copy[existsIndex] = invToSave;
            return copy;
          }
          return [invToSave, ...prev];
        });
      }
      showNotification(`PDF da Fatura Nº ${invToSave.numero || 'S/N'} pronto para baixar!`);
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      showNotification('Erro ao gerar PDF. Verifique os dados ou tente novamente.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Automatically save to history whenever invoice is printed!
  const handlePrintAndSave = (targetInvoice?: InvoiceData) => {
    const invToSave = targetInvoice || invoice;
    if (invToSave.numero || invToSave.client.sacado) {
      setHistory((prev) => {
        const existsIndex = prev.findIndex((item) => item.id === invToSave.id);
        if (existsIndex >= 0) {
          const copy = [...prev];
          copy[existsIndex] = invToSave;
          return copy;
        }
        return [invToSave, ...prev];
      });
      showNotification(`Fatura Nº ${invToSave.numero || 'S/N'} salva no histórico!`);
    }

    if (targetInvoice && targetInvoice.id !== invoice.id) {
      setInvoice(targetInvoice);
      setActiveNavTab('emitter');
    }

    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleDeleteInvoice = (id: string) => {
    setHistory((prev) => prev.filter((inv) => inv.id !== id));
    showNotification('Fatura removida do histórico.');
  };

  // Reset to blank keeping only last invoice number
  const handleResetToBlank = () => {
    const fresh = createBlankInvoice(lastInvoiceNumber, agencyInfo);
    setInvoice(fresh);
    showNotification('Formulário limpo para nova digitação!');
  };

  // Edit from history tab
  const handleEditFromHistory = (targetInvoice: InvoiceData) => {
    setInvoice(targetInvoice);
    setActiveNavTab('emitter');
    showNotification(`Fatura Nº ${targetInvoice.numero} carregada no emissor!`);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans">
      {/* Top Bar with Official BE Travel Logo */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Official BE Travel Brand Logo */}
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <BeTravelLogo
              size="sm"
              customLogoUrl={agencyInfo.customLogoUrl}
              color="#4e5d8a"
            />
          </div>

          {/* Zone 2: Navigation Links (Emissor vs Histórico por Instituição) */}
          <nav className="flex items-center gap-2 sm:gap-3 text-xs font-semibold">
            {/* Tab 1: Emissor */}
            <button
              onClick={() => setActiveNavTab('emitter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeNavTab === 'emitter'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Emissor de Faturas</span>
            </button>

            {/* Tab 2: Histórico por Instituição */}
            <button
              onClick={() => setActiveNavTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeNavTab === 'history'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Histórico por Instituição ({history.length})</span>
            </button>

            {/* Clients Modal Trigger */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clientes ({profiles.length})</span>
            </button>

            {/* Agency Modal Trigger */}
            <button
              onClick={() => setIsAgencyModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action - Baixar PDF Oficial (.pdf) and Imprimir */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isDownloadingPdf}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-xs whitespace-nowrap shrink-0 disabled:opacity-50"
              title="Baixar arquivo PDF oficial com 1 ou 2 páginas (se tiver boleto anexado)"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-white" />
                  <span>
                    Baixar PDF {invoice.attachedBoleto ? '(2 Pág)' : ''}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={() => handlePrintAndSave()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs whitespace-nowrap shrink-0"
              title="Abrir diálogo de impressão do navegador"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeNavTab === 'history' ? (
          /* TAB 2: HISTÓRICO POR INSTITUIÇÃO / CLIENTE */
          <InstitutionHistoryTab
            history={history}
            onEditInvoice={handleEditFromHistory}
            onPrintInvoice={(inv) => handlePrintAndSave(inv)}
            onDownloadInvoicePdf={(inv) => handleDownloadPdf(inv)}
            onDeleteInvoice={handleDeleteInvoice}
            onGoToNewInvoice={() => {
              handleResetToBlank();
              setActiveNavTab('emitter');
            }}
          />
        ) : (
          /* TAB 1: EMISSOR DE FATURAS */
          <>
            {/* Mobile / Tablet Tab Switcher - Sticky Freeze when scrolling down */}
            <div className="lg:hidden sticky top-16 z-30 bg-white/95 backdrop-blur-md py-2.5 px-2 mb-4 rounded-xl border border-slate-200/90 shadow-md print:hidden">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTabMobile('form');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTabMobile === 'form' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Preenchimento</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTabMobile('preview');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTabMobile === 'preview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visualizar Documento</span>
                </button>
              </div>
            </div>

            {/* 2-Column Split: Form and Live A4 Document Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form Editor (5 cols on lg) */}
              <div
                className={`lg:col-span-5 ${
                  activeTabMobile === 'form' ? 'block' : 'hidden lg:block'
                }`}
              >
                <InvoiceForm
                  invoice={invoice}
                  onChangeInvoice={setInvoice}
                  profiles={profiles}
                  onOpenProfileModal={() => setIsProfileModalOpen(true)}
                  onOpenHistoryModal={() => setActiveNavTab('history')}
                  onResetToBlank={handleResetToBlank}
                  onPrintAndSave={() => handlePrintAndSave()}
                  onSaveProfile={handleSaveProfile}
                  onDownloadPdf={() => handleDownloadPdf()}
                  isDownloadingPdf={isDownloadingPdf}
                />
              </div>

              {/* Right Column: Live A4 Document Canvas Preview (7 cols on lg) - Frozen / Sticky on scroll */}
              <div
                className={`lg:col-span-7 flex flex-col items-center lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overflow-x-hidden rounded-2xl ${
                  activeTabMobile === 'preview' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* Preview Toolbar - Sticky at top of preview panel */}
                <div className="w-full flex items-center justify-between pb-3 px-2 sticky top-0 bg-slate-100/95 backdrop-blur-md z-20 print:hidden border-b border-slate-200/60 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>
                        Pré-visualização Oficial A4{' '}
                        {invoice.attachedBoleto ? '(2 Páginas)' : '(1 Página)'}
                      </span>
                    </span>
                    {invoice.attachedBoleto && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                        Boleto Anexado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Direct Download in Preview Toolbar */}
                    <button
                      type="button"
                      disabled={isDownloadingPdf}
                      onClick={() => handleDownloadPdf()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
                      title="Baixar arquivo PDF desta fatura"
                    >
                      {isDownloadingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                      <span>Baixar PDF</span>
                    </button>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((z) => Math.max(0.6, z - 0.1))}
                        className="p-1 text-slate-500 hover:text-slate-900"
                        title="Diminuir zoom"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-mono font-semibold text-slate-600 px-1">
                        {Math.round(previewZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((z) => Math.min(1.2, z + 0.1))}
                        className="p-1 text-slate-500 hover:text-slate-900"
                        title="Aumentar zoom"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(0.85)}
                        className="p-1 text-slate-500 hover:text-slate-900 ml-1"
                        title="Resetar zoom"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document Printable View Container */}
                <div
                  id="invoice-print-container"
                  className="w-full flex flex-col items-center justify-center overflow-x-auto pb-12 pt-2"
                >
                  <div
                    className="transition-transform duration-150 origin-top flex flex-col gap-8"
                    style={{ transform: `scale(${previewZoom})` }}
                  >
                    {/* Page 1: Fatura/Duplicata */}
                    <InvoiceDocument invoice={invoice} />

                    {/* Page 2: Attached Boleto (if present) */}
                    {invoice.attachedBoleto && (
                      <AttachedBoletoPage boleto={invoice.attachedBoleto} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profiles={profiles}
        onSelectProfile={(p) => setInvoice((prev) => ({ ...prev, client: p }))}
        onSaveProfile={handleSaveProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      <AgencyConfigModal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        agencyInfo={agencyInfo}
        onSaveAgencyInfo={handleSaveAgencyInfo}
      />

      {/* Off-screen container positioned safely for reliable rendering */}
      <div
        id="invoice-offscreen-render"
        className="fixed left-[-9999px] top-0 pointer-events-none bg-white overflow-hidden"
        style={{ width: '210mm', minHeight: '297mm', display: 'block' }}
      >
        <InvoiceDocument id="invoice-offscreen-doc" invoice={invoiceForOffscreen || invoice} />
      </div>

      {/* Floating Download Success Banner with direct user-clickable download link */}
      {downloadedPdfInfo && (
        <div className="fixed bottom-5 right-5 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                PDF da Fatura Nº {downloadedPdfInfo.invoiceNum} Pronto!
              </div>
              <div className="text-[11px] text-slate-400">
                Baixe diretamente ou salve pelo navegador:
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadedPdfInfo.serverDownloadUrl || downloadedPdfInfo.url}
              download={downloadedPdfInfo.filename}
              onClick={() => {
                showNotification('Download iniciado!');
                if (downloadedPdfInfo.serverDownloadUrl) {
                  window.location.assign(downloadedPdfInfo.serverDownloadUrl);
                }
              }}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Baixar (.pdf)</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setDownloadedPdfInfo(null);
                window.print();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={() => setDownloadedPdfInfo(null)}
              className="p-1 text-slate-400 hover:text-white transition-colors ml-1"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Download Modal - 100% Guaranteed File Saving Dialog */}
      {isDownloadModalOpen && downloadedPdfInfo && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    PDF da Fatura Nº {downloadedPdfInfo.invoiceNum} Pronto!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Documento gerado com sucesso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3 text-center">
              <div>
                <p className="text-xs text-emerald-950 font-bold">
                  Escolha como prefere salvar o arquivo no seu computador:
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Clique no botão verde para download direto do arquivo .pdf
                </p>
              </div>

              {/* Primary Direct Download Link */}
              <a
                href={downloadedPdfInfo.serverDownloadUrl || downloadedPdfInfo.url}
                download={downloadedPdfInfo.filename}
                onClick={() => {
                  showNotification('Download do PDF iniciado!');
                  if (downloadedPdfInfo.serverDownloadUrl) {
                    try {
                      const hiddenIframe = document.createElement('iframe');
                      hiddenIframe.style.display = 'none';
                      hiddenIframe.src = downloadedPdfInfo.serverDownloadUrl;
                      document.body.appendChild(hiddenIframe);
                      setTimeout(() => {
                        if (document.body.contains(hiddenIframe)) document.body.removeChild(hiddenIframe);
                      }, 5000);
                    } catch {}
                  }
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <FileDown className="w-5 h-5" />
                <span>1. Baixar Arquivo PDF (.pdf) Agora</span>
              </a>

              {/* Native Print / Save to PDF */}
              <button
                type="button"
                onClick={() => {
                  setIsDownloadModalOpen(false);
                  window.print();
                }}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-300 shadow-2xs hover:border-slate-400 transition-all"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>2. Salvar como PDF Oficial (Ctrl+P)</span>
              </button>

              <div className="text-[11px] text-emerald-800 font-mono break-all">
                {downloadedPdfInfo.filename}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Direct Server Download Fallback */}
              <button
                type="button"
                onClick={handleDownloadViaServer}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Download direto via servidor HTTP"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Direto</span>
              </button>

              {/* View in new tab */}
              <a
                href={downloadedPdfInfo.serverViewUrl || downloadedPdfInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span>Visualizar no Navegador</span>
              </a>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Fatura gravada automaticamente no histórico
              </span>

              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

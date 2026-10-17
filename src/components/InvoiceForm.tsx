import React, { useState, useEffect, useRef } from 'react';
import { ClientProfile, DueDatePreset, FlightItem, InvoiceData } from '../types';
import { addDaysToIsoDate, formatIsoToBr, getTodayIsoDate } from '../utils/dateUtils';
import { numberToWordsPtBr } from '../utils/numberToWordsPtBr';
import { saveBoletoToIDB } from '../utils/safeStorage';
import {
  Building2,
  Plus,
  Trash2,
  Copy,
  Printer,
  Sparkles,
  Plane,
  Hash,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Upload,
  Loader2,
  FileText,
  UserPlus,
  FileUp,
  FileDown,
  X,
  Check,
  Edit2,
  AlertCircle,
} from 'lucide-react';

interface InvoiceFormProps {
  invoice: InvoiceData;
  onChangeInvoice: (invoice: InvoiceData) => void;
  profiles: ClientProfile[];
  onOpenProfileModal: () => void;
  onOpenHistoryModal: () => void;
  onResetToBlank: () => void;
  onPrintAndSave: () => void;
  onSaveProfile?: (profile: ClientProfile) => void;
  onDownloadPdf?: () => Promise<void>;
  isDownloadingPdf?: boolean;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  onChangeInvoice,
  profiles,
  onOpenProfileModal,
  onOpenHistoryModal,
  onResetToBlank,
  onPrintAndSave,
  onSaveProfile,
  onDownloadPdf,
  isDownloadingPdf = false,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [rawValorString, setRawValorString] = useState(
    invoice.valor > 0 ? invoice.valor.toFixed(2).replace('.', ',') : ''
  );
  const [customDaysInput, setCustomDaysInput] = useState<string>(
    invoice.customDiasVencimento ? String(invoice.customDiasVencimento) : '15'
  );
  const [isParsingTicket, setIsParsingTicket] = useState(false);
  const [ticketParseError, setTicketParseError] = useState<string | null>(null);
  const [ticketParseSuccess, setTicketParseSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-passenger ticket value inputs state
  const [itemValorInputs, setItemValorInputs] = useState<Record<string, string>>({});

  // Quick Inline Client Registration State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientData, setNewClientData] = useState<ClientProfile>({
    id: '',
    sacado: '',
    cnpj: '',
    endereco: '',
    municipio: '',
    uf: '',
  });

  // Boleto Attachment State
  const [isUploadingBoleto, setIsUploadingBoleto] = useState(false);
  const [boletoError, setBoletoError] = useState<string | null>(null);
  const boletoInputRef = useRef<HTMLInputElement>(null);

  // Normalize items array with rotaIda, rotaVolta, dataIda, dataVolta
  const items: FlightItem[] = (
    invoice.itens && invoice.itens.length > 0
      ? invoice.itens
      : [
          {
            id: `item-${Date.now()}`,
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

  // Sync raw value string if invoice changes from external source (like history load)
  useEffect(() => {
    if (invoice.valor > 0) {
      setRawValorString(invoice.valor.toFixed(2).replace('.', ','));
    } else {
      setRawValorString('');
    }

    // Populate itemValorInputs from items
    const newInputs: Record<string, string> = {};
    if (invoice.itens && invoice.itens.length > 0) {
      invoice.itens.forEach((it) => {
        if (typeof it.valor === 'number' && it.valor > 0) {
          newInputs[it.id] = it.valor.toFixed(2).replace('.', ',');
        }
      });
    }
    setItemValorInputs(newInputs);
  }, [invoice.id]);

  // Update client when selection changes
  const handleClientSelect = (clientId: string) => {
    if (!clientId) {
      onChangeInvoice({
        ...invoice,
        client: { id: '', sacado: '', endereco: '', municipio: '', uf: '', cnpj: '' },
      });
      return;
    }
    const selected = profiles.find((p) => p.id === clientId);
    if (selected) {
      onChangeInvoice({
        ...invoice,
        client: selected,
      });
    }
  };

  // Quick Inline Save New Client
  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.sacado.trim()) return;

    const newProfile: ClientProfile = {
      id: `client-${Date.now()}`,
      sacado: newClientData.sacado.trim().toUpperCase(),
      cnpj: newClientData.cnpj.trim(),
      endereco: newClientData.endereco.trim().toUpperCase(),
      municipio: newClientData.municipio.trim().toUpperCase(),
      uf: newClientData.uf.trim().toUpperCase(),
    };

    if (onSaveProfile) {
      onSaveProfile(newProfile);
    }

    onChangeInvoice({
      ...invoice,
      client: newProfile,
    });

    setIsAddingClient(false);
    setNewClientData({
      id: '',
      sacado: '',
      cnpj: '',
      endereco: '',
      municipio: '',
      uf: '',
    });
  };

  // Update fields of the active client directly
  const handleDirectClientFieldChange = (field: keyof ClientProfile, value: string) => {
    onChangeInvoice({
      ...invoice,
      client: {
        ...invoice.client,
        [field]: value.toUpperCase(),
      },
    });
  };

  // Handle invoice number and auto-increment
  const handleNumeroChange = (val: string) => {
    const uppercaseVal = val.toUpperCase();
    localStorage.setItem('be_travel_last_invoice_number', uppercaseVal);
    onChangeInvoice({
      ...invoice,
      numero: uppercaseVal,
    });
  };

  const handleIncrementNumero = () => {
    const match = invoice.numero.match(/^(\d+)(\/.*)?$/);
    if (match) {
      const currentNum = parseInt(match[1], 10);
      const suffix = match[2] || '';
      const nextNum = currentNum + 1;
      const newNumero = `${nextNum}${suffix}`;
      localStorage.setItem('be_travel_last_invoice_number', newNumero);
      onChangeInvoice({
        ...invoice,
        numero: newNumero,
      });
    } else if (invoice.numero) {
      const newNumero = `${invoice.numero}-1`;
      localStorage.setItem('be_travel_last_invoice_number', newNumero);
      onChangeInvoice({
        ...invoice,
        numero: newNumero,
      });
    }
  };

  // Handle individual ticket value change and auto-sum
  const handleItemValorChange = (itemId: string, rawVal: string) => {
    setItemValorInputs((prev) => ({ ...prev, [itemId]: rawVal }));

    let numericVal: number | undefined = undefined;
    if (rawVal.trim() !== '') {
      const cleaned = rawVal.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed >= 0) {
        numericVal = parsed;
      }
    }

    const updatedItens = items.map((it) => {
      if (it.id === itemId) {
        return { ...it, valor: numericVal };
      }
      return it;
    });

    // Auto-sum all individual ticket prices to calculate invoice total
    const sum = updatedItens.reduce((acc, it) => acc + (it.valor || 0), 0);
    const updatedInvoice: InvoiceData = {
      ...invoice,
      itens: updatedItens,
    };

    if (sum > 0) {
      updatedInvoice.valor = sum;
      updatedInvoice.valorExtenso = numberToWordsPtBr(sum);
      setRawValorString(sum.toFixed(2).replace('.', ','));
    }

    onChangeInvoice(updatedInvoice);
  };

  // Distribute total invoice price equally among all passengers
  const handleDistributeTotalEqually = () => {
    if (items.length === 0 || invoice.valor <= 0) return;
    const share = parseFloat((invoice.valor / items.length).toFixed(2));
    const nextInputs: Record<string, string> = {};
    const updatedItens = items.map((it) => {
      nextInputs[it.id] = share.toFixed(2).replace('.', ',');
      return { ...it, valor: share };
    });
    setItemValorInputs(nextInputs);
    onChangeInvoice({
      ...invoice,
      itens: updatedItens,
    });
  };

  // Recalculate total sum from all individual ticket items
  const handleSumItemsToTotal = () => {
    const sum = items.reduce((acc, it) => acc + (it.valor || 0), 0);
    if (sum > 0) {
      onChangeInvoice({
        ...invoice,
        valor: sum,
        valorExtenso: numberToWordsPtBr(sum),
      });
      setRawValorString(sum.toFixed(2).replace('.', ','));
    }
  };

  // Handle main total value input change
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setRawValorString(rawVal);

    if (rawVal.trim() === '') {
      onChangeInvoice({
        ...invoice,
        valor: 0,
        valorExtenso: '',
      });
      return;
    }

    const cleaned = rawVal.replace(/\./g, '').replace(',', '.');
    const numeric = parseFloat(cleaned);

    if (!isNaN(numeric) && numeric >= 0) {
      const extenso = numberToWordsPtBr(numeric);
      onChangeInvoice({
        ...invoice,
        valor: numeric,
        valorExtenso: extenso,
      });
    }
  };

  // Handle emission date change
  const handleEmissaoChange = (newDate: string) => {
    let days = 7;
    if (invoice.diasVencimentoPreset === '7d') days = 7;
    else if (invoice.diasVencimentoPreset === 'outro') {
      days = invoice.customDiasVencimento || 15;
    }

    const newVencimento = addDaysToIsoDate(newDate, days);
    onChangeInvoice({
      ...invoice,
      dataEmissao: newDate,
      dataVencimento: newVencimento,
    });
  };

  // Handle preset change: strictly 7 dias or Outro prazo
  const handlePresetSelect = (preset: DueDatePreset) => {
    let days = 7;
    if (preset === '7d') days = 7;
    else if (preset === 'outro') {
      const parsed = parseInt(customDaysInput, 10);
      days = isNaN(parsed) || parsed <= 0 ? 15 : parsed;
    }

    const newVencimento = addDaysToIsoDate(invoice.dataEmissao, days);
    onChangeInvoice({
      ...invoice,
      diasVencimentoPreset: preset,
      customDiasVencimento: days,
      dataVencimento: newVencimento,
    });
  };

  // Boleto file attachment handlers
  const processBoletoFile = async (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setBoletoError('O arquivo do boleto é maior que o limite de 25MB.');
      return;
    }

    setIsUploadingBoleto(true);
    setBoletoError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
        reader.readAsDataURL(file);
      });

      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      // Persist heavy binary to IndexedDB
      await saveBoletoToIDB(invoice.id, dataUrl);

      onChangeInvoice({
        ...invoice,
        attachedBoleto: {
          fileName: file.name,
          fileType: isPdf ? 'pdf' : 'image',
          dataUrl,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('Erro ao anexar boleto:', err);
      setBoletoError('Erro ao processar o arquivo do boleto. Verifique o arquivo.');
    } finally {
      setIsUploadingBoleto(false);
    }
  };

  const handleRemoveBoleto = () => {
    onChangeInvoice({
      ...invoice,
      attachedBoleto: null,
    });
  };

  const handleCustomDaysChange = (valStr: string) => {
    setCustomDaysInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const newVencimento = addDaysToIsoDate(invoice.dataEmissao, parsed);
      onChangeInvoice({
        ...invoice,
        diasVencimentoPreset: 'outro',
        customDiasVencimento: parsed,
        dataVencimento: newVencimento,
      });
    }
  };

  // Route input formatter: e.g. "FLN BPS" -> "FLN - BPS", "fln bps" -> "FLN - BPS", "VCP FLN" -> "VCP - FLN"
  const formatRouteInput = (val: string): string => {
    let upper = val.toUpperCase().trim();
    // 6 letters without space, e.g. "FLNBPS" -> "FLN - BPS"
    if (/^[A-Z]{6}$/.test(upper)) {
      upper = `${upper.slice(0, 3)} - ${upper.slice(3)}`;
    }
    // 2 3-letter codes with spaces, e.g. "FLN BPS" -> "FLN - BPS"
    upper = upper.replace(/^([A-Z]{3})\s+([A-Z]{3})$/, '$1 - $2');
    // Hyphen without spaces or extra spaces, e.g. "FLN-BPS" -> "FLN - BPS"
    upper = upper.replace(/^([A-Z]{3})\s*-\s*([A-Z]{3})$/, '$1 - $2');
    return upper;
  };

  // MULTI-LOCATOR ITEMS MANAGEMENT
  const handleAddItem = () => {
    const newItem: FlightItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      localizador: '',
      passageiro: '',
      rotaIda: '',
      rotaVolta: '',
      dataIda: '',
      dataVolta: '',
      rota: '',
      data: '',
    };
    onChangeInvoice({
      ...invoice,
      itens: [...items, newItem],
    });
  };

  // Duplicate entire item
  const handleDuplicateItem = (itemToClone: FlightItem) => {
    const duplicated: FlightItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      localizador: itemToClone.localizador,
      passageiro: itemToClone.passageiro,
      rotaIda: itemToClone.rotaIda,
      rotaVolta: itemToClone.rotaVolta,
      dataIda: itemToClone.dataIda,
      dataVolta: itemToClone.dataVolta,
      rota: itemToClone.rota,
      data: itemToClone.data,
      valor: itemToClone.valor,
    };
    onChangeInvoice({
      ...invoice,
      itens: [...items, duplicated],
    });
  };

  // Add another passenger on the same locator/flights (keeps locator, routes, dates, leaves passenger blank)
  const handleDuplicateSameLocatorNewPax = (itemToClone: FlightItem) => {
    const duplicated: FlightItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      localizador: itemToClone.localizador,
      passageiro: '',
      rotaIda: itemToClone.rotaIda,
      rotaVolta: itemToClone.rotaVolta,
      dataIda: itemToClone.dataIda,
      dataVolta: itemToClone.dataVolta,
      rota: itemToClone.rota,
      data: itemToClone.data,
      valor: itemToClone.valor,
    };
    onChangeInvoice({
      ...invoice,
      itens: [...items, duplicated],
    });
  };

  const handleClearAllItems = () => {
    const blankItem: FlightItem = {
      id: `item-${Date.now()}-1`,
      localizador: '',
      passageiro: '',
      rotaIda: '',
      rotaVolta: '',
      dataIda: '',
      dataVolta: '',
      rota: '',
      data: '',
    };
    onChangeInvoice({
      ...invoice,
      itens: [blankItem],
      valor: 0,
      valorExtenso: 'Zero reais',
    });
    setRawValorString('');
  };

  const handleUpdateItem = (id: string, field: keyof FlightItem, value: any) => {
    const updated = items.map((it) => {
      if (it.id === id) {
        let finalVal = value;
        if (typeof value === 'string') {
          finalVal = value.toUpperCase();
          if (field === 'rotaIda' || field === 'rotaVolta') {
            finalVal = formatRouteInput(finalVal);
          }
        }

        const updatedItem = {
          ...it,
          [field]: finalVal,
        };

        const rIda = field === 'rotaIda' ? finalVal : it.rotaIda;
        const rVolta = field === 'rotaVolta' ? finalVal : it.rotaVolta;
        const dIda = field === 'dataIda' ? finalVal : it.dataIda;
        const dVolta = field === 'dataVolta' ? finalVal : it.dataVolta;

        updatedItem.rota = rVolta ? `${rIda} / ${rVolta}` : rIda;
        updatedItem.data = dVolta ? `${dIda} a ${dVolta}` : dIda;

        return updatedItem;
      }
      return it;
    });

    onChangeInvoice({
      ...invoice,
      itens: updated,
    });
  };

  const handleRemoveItem = (id: string) => {
    const filtered = items.filter((it) => it.id !== id);
    onChangeInvoice({
      ...invoice,
      itens:
        filtered.length > 0
          ? filtered
          : [
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
    });
  };

  // Known airport codes for intelligent line parsing
  const KNOWN_AIRPORTS = new Set([
    'GRU', 'CGH', 'VCP', 'BSB', 'SDU', 'GIG', 'CNF', 'SSA', 'REC', 'FOR',
    'CWB', 'POA', 'FLN', 'NVT', 'XAP', 'IGU', 'GYN', 'VIX', 'MAO', 'BEL',
    'SLZ', 'MCZ', 'NAT', 'JPA', 'AJU', 'THE', 'CGB', 'CGR', 'PMW', 'BVB',
    'RBR', 'MCP', 'PVH', 'UDI', 'RAO', 'SJP', 'LDB', 'MGF', 'CXJ', 'PET',
    'URG', 'JOI', 'BNU', 'PFB', 'RIA', 'GEL', 'BPS', 'IOS', 'VDC', 'JDO',
    'CPV', 'PNZ', 'PAV', 'MIA', 'MCO', 'LIS', 'EZE'
  ]);

  // State for Drag & Drop and Progress
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingBoletoOver, setIsDraggingBoletoOver] = useState(false);
  const [parsingProgressText, setParsingProgressText] = useState<string>('');

  // Prevent default browser drag & drop behavior anywhere in the window
  // so dragging a PDF into the browser doesn't accidentally navigate away
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // Handle PDF / Ticket File Upload and Auto-Extraction with Gemini (supports 1, 2, 3+ passengers and multi-file)
  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsParsingTicket(true);
    setTicketParseError(null);
    setTicketParseSuccess(null);

    const newlyCreatedItems: FlightItem[] = [];
    let failureCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setParsingProgressText(
        files.length > 1
          ? `Lendo bilhete ${i + 1} de ${files.length} (${file.name})...`
          : `Lendo bilhete com IA (${file.name})...`
      );

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const resStr = reader.result as string;
            resolve(resStr.includes(',') ? resStr.split(',')[1] : resStr);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let mimeType = 'application/pdf';
        const lowerName = file.name.toLowerCase();
        if (base64Data.startsWith('JVBERi0')) {
          mimeType = 'application/pdf';
        } else if (base64Data.startsWith('iVBORw0KGgo')) {
          mimeType = 'image/png';
        } else if (base64Data.startsWith('/9j/')) {
          mimeType = 'image/jpeg';
        } else if (file.type && file.type.includes('pdf')) {
          mimeType = 'application/pdf';
        } else if (file.type && file.type.startsWith('image/')) {
          mimeType = file.type;
        } else if (lowerName.endsWith('.png')) {
          mimeType = 'image/png';
        } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
          mimeType = 'image/jpeg';
        } else {
          mimeType = 'application/pdf';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('/api/parse-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, mimeType }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          failureCount++;
          continue;
        }

        const data = await response.json();
        const rawTickets = data.tickets || (data.ticket ? [data.ticket] : []);

        if (data.success && Array.isArray(rawTickets) && rawTickets.length > 0) {
          for (const t of rawTickets) {
            const rIda = formatRouteInput(t.rotaIda || '');
            const rVolta = t.rotaVolta ? formatRouteInput(t.rotaVolta) : '';
            const dIda = (t.dataIda || '').trim();
            const dVolta = (t.dataVolta || '').trim();

            newlyCreatedItems.push({
              id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              localizador: (t.localizador || '').toUpperCase().trim(),
              passageiro: (t.passageiro || '').toUpperCase().trim(),
              rotaIda: rIda,
              rotaVolta: rVolta,
              dataIda: dIda,
              dataVolta: dVolta,
              rota: rVolta ? `${rIda} / ${rVolta}` : rIda,
              data: dVolta ? `${dIda} a ${dVolta}` : dIda,
              valor: typeof t.valor === 'number' && !isNaN(t.valor) ? t.valor : undefined,
            });
          }
        } else {
          failureCount++;
        }
      } catch (err: any) {
        console.error('Erro ao ler bilhete:', file.name, err);
        failureCount++;
      }
    }

    setIsParsingTicket(false);
    setParsingProgressText('');

    if (newlyCreatedItems.length > 0) {
      let updatedList: FlightItem[];
      // If current list only has 1 blank item, replace it
      if (
        items.length === 1 &&
        !items[0].localizador &&
        !items[0].passageiro &&
        !items[0].rotaIda
      ) {
        updatedList = newlyCreatedItems;
      } else {
        // APPEND new items to existing items
        updatedList = [...items, ...newlyCreatedItems];
      }

      const updatedInvoice = {
        ...invoice,
        itens: updatedList,
      };

      // Sum individual item values if invoice total is currently 0
      const sumValues = newlyCreatedItems.reduce((acc, it) => acc + (it.valor || 0), 0);
      if (sumValues > 0 && invoice.valor === 0) {
        updatedInvoice.valor = sumValues;
        updatedInvoice.valorExtenso = numberToWordsPtBr(sumValues);
        setRawValorString(sumValues.toFixed(2).replace('.', ','));
      }

      onChangeInvoice(updatedInvoice);

      if (newlyCreatedItems.length === 1) {
        setTicketParseSuccess(
          `Bilhete importado com sucesso: Localizador ${newlyCreatedItems[0].localizador || 'OK'} · ${newlyCreatedItems[0].passageiro || 'Passageiro'}`
        );
      } else {
        const paxSummary = newlyCreatedItems
          .map((p) => p.passageiro || p.localizador)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ');
        setTicketParseSuccess(
          `${newlyCreatedItems.length} passageiros/voos importados com sucesso! (${paxSummary}${newlyCreatedItems.length > 3 ? '...' : ''})`
        );
      }
      setTimeout(() => setTicketParseSuccess(null), 5000);
    } else if (failureCount > 0) {
      setTicketParseError(
        'Não foi possível extrair dados dos arquivos enviados. Preencha os campos dos voos manualmente.'
      );
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset file input value to allow selecting the same file again if desired
    e.target.value = '';
  };

  // Copy WhatsApp summary
  const handleCopyWhatsApp = () => {
    const formattedValor =
      invoice.valor > 0
        ? `R$ ${invoice.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '—';

    const itemsSummary = items
      .map((it) => {
        const rotaDesc = it.rotaVolta ? `${it.rotaIda} | Volta: ${it.rotaVolta}` : it.rotaIda;
        const dataDesc = it.dataVolta ? `${it.dataIda} | Volta: ${it.dataVolta}` : it.dataIda;
        return `• Loc: *${it.localizador || '—'}* | Passageiro: *${it.passageiro || '—'}* | Rota: *${rotaDesc || '—'}* | Data: *${dataDesc || '—'}*${it.valor ? ` (R$ ${it.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}`;
      })
      .join('\n');

    const text = `*FATURA / DUPLICATA - BE TRAVEL*
*Nº:* ${invoice.numero || '—'}
*Sacado:* ${invoice.client.sacado || '—'}
*CNPJ:* ${invoice.client.cnpj || '—'}
*Valor Total:* ${formattedValor}
*Vencimento:* ${formatIsoToBr(invoice.dataVencimento) || '—'}

*VOOS / LOCALIZADORES:*
${itemsSummary}

_Boleto Tradicional ou QR Code Pix_
BE Travel - CNPJ: ${invoice.agencyInfo.cnpj}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
      {/* Top Header Bar - Sticky Freeze when scrolling form */}
      <div className="p-5 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-16 z-20 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-700" />
              <span>Emissão de Fatura / Duplicata</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecione o cliente e adicione os localizadores e voos correspondentes
            </p>
          </div>

          {/* Quick Clear / Reset Button */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onResetToBlank}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 bg-white border border-slate-300 hover:border-slate-500 rounded-lg font-semibold transition-colors shadow-2xs"
              title="Limpa todos os dados mantendo apenas o último número de fatura"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Nova Fatura (Limpar)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* SECTION 1: Client Profile Selector */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                1. Selecionar Perfil do Cliente (Sacado)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingClient(!isAddingClient)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs ${
                  isAddingClient
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cadastrar Novo Cliente (CPF / CNPJ)</span>
              </button>

              <button
                type="button"
                onClick={onOpenProfileModal}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1.5 hover:bg-slate-200/60 rounded-lg transition-colors"
                title="Abrir gerenciador completo de clientes"
              >
                <span>Gerenciar ({profiles.length})</span>
              </button>
            </div>
          </div>

          {/* Quick Inline Add Client Form */}
          {isAddingClient && (
            <div className="mb-4 p-4 bg-white rounded-xl border-2 border-slate-900 shadow-sm transition-all animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-slate-900" />
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    Novo Cadastro de Cliente (Salva na lista para sempre)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingClient(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewClient} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      RAZÃO SOCIAL OU NOME DO CLIENTE (SACADO) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientData.sacado}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, sacado: e.target.value.toUpperCase() })
                      }
                      placeholder="Ex: TRIBUNAL DE JUSTIÇA / EMPRESA LTDA / JOÃO SILVA"
                      className="w-full px-2.5 py-1.5 text-xs font-medium uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      CPF OU CNPJ *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientData.cnpj}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, cnpj: e.target.value })
                      }
                      placeholder="00.000.000/0000-00 ou CPF"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      ENDEREÇO (RUA, NÚMERO, BAIRRO)
                    </label>
                    <input
                      type="text"
                      value={newClientData.endereco}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, endereco: e.target.value.toUpperCase() })
                      }
                      placeholder="Ex: AV. BRASIL, 1500 - SALA 402"
                      className="w-full px-2.5 py-1.5 text-xs font-medium uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      MUNICÍPIO / CIDADE
                    </label>
                    <input
                      type="text"
                      value={newClientData.municipio}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, municipio: e.target.value.toUpperCase() })
                      }
                      placeholder="Ex: MANAUS, PORTO VELHO"
                      className="w-full px-2.5 py-1.5 text-xs font-medium uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      UF (ESTADO)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={newClientData.uf}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, uf: e.target.value.toUpperCase() })
                      }
                      placeholder="AM, RO"
                      className="w-full px-2.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingClient(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar e Selecionar Cliente</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Client Select Dropdown */}
          <div className="relative">
            <select
              value={invoice.client.id || ''}
              onChange={(e) => handleClientSelect(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">
                -- Selecione um cliente salvo ({profiles.length} disponíveis) ou cadastre acima --
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sacado} — {p.municipio}/{p.uf} (CNPJ/CPF: {p.cnpj || 'S/N'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Auto-filled client summary cards with direct editing support */}
          <div className="mt-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Dados Atuais do Cliente nesta Fatura:</span>
              <span className="text-slate-400 font-normal">Edição direta permitida</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block text-[10px] mb-0.5">SACADO:</label>
                <input
                  type="text"
                  value={invoice.client.sacado || ''}
                  onChange={(e) => handleDirectClientFieldChange('sacado', e.target.value)}
                  placeholder="Nome ou Razão Social do cliente..."
                  className="w-full px-2 py-1 text-xs font-bold uppercase rounded border border-slate-200 focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block text-[10px] mb-0.5">CNPJ OU CPF:</label>
                <input
                  type="text"
                  value={invoice.client.cnpj || ''}
                  onChange={(e) => handleDirectClientFieldChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00..."
                  className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-slate-200 focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block text-[10px] mb-0.5">ENDEREÇO:</label>
                <input
                  type="text"
                  value={invoice.client.endereco || ''}
                  onChange={(e) => handleDirectClientFieldChange('endereco', e.target.value)}
                  placeholder="Endereço completo..."
                  className="w-full px-2 py-1 text-xs font-medium uppercase rounded border border-slate-200 focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-slate-400 font-semibold block text-[10px] mb-0.5">MUNICÍPIO:</label>
                  <input
                    type="text"
                    value={invoice.client.municipio || ''}
                    onChange={(e) => handleDirectClientFieldChange('municipio', e.target.value)}
                    placeholder="Cidade..."
                    className="w-full px-2 py-1 text-xs font-medium uppercase rounded border border-slate-200 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block text-[10px] mb-0.5">UF:</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={invoice.client.uf || ''}
                    onChange={(e) => handleDirectClientFieldChange('uf', e.target.value)}
                    placeholder="UF..."
                    className="w-full px-2 py-1 text-xs font-bold uppercase rounded border border-slate-200 focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Invoice Numbers & Dates */}
        <div>
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-slate-700" />
            <span>2. Número da Fatura, Valor e Prazos</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Número da Fatura */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">NÚMERO DA FATURA *</label>
                <button
                  type="button"
                  onClick={handleIncrementNumero}
                  title="Incrementar número da fatura (+1)"
                  className="text-[10px] font-bold text-slate-700 hover:text-slate-950 underline"
                >
                  +1 Próximo
                </button>
              </div>
              <input
                type="text"
                value={invoice.numero}
                onChange={(e) => handleNumeroChange(e.target.value)}
                placeholder="Ex: 4534/26"
                className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Último número lembrado automaticamente
              </span>
            </div>

            {/* Valor (R$) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  VALOR TOTAL (R$) *
                </label>
                <div className="flex items-center gap-1.5">
                  {items.length > 1 && invoice.valor > 0 && (
                    <button
                      type="button"
                      onClick={handleDistributeTotalEqually}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline"
                      title="Dividir o valor total igualmente entre os passageiros"
                    >
                      Dividir =
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  value={rawValorString}
                  onChange={handleValorChange}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-950"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {items.some((i) => (i.valor || 0) > 0)
                  ? 'Soma calculada automaticamente das passagens'
                  : 'Calcula por extenso automaticamente'}
              </span>
            </div>

            {/* Data de Emissão */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">DATA DE EMISSÃO *</label>
                <button
                  type="button"
                  onClick={() => handleEmissaoChange(getTodayIsoDate())}
                  className="text-[10px] font-semibold text-slate-600 hover:underline"
                >
                  Hoje
                </button>
              </div>
              <input
                type="date"
                value={invoice.dataEmissao}
                onChange={(e) => handleEmissaoChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">VENCIMENTO</label>
                <span className="text-[10px] font-semibold text-slate-500">
                  {formatIsoToBr(invoice.dataVencimento) || '—'}
                </span>
              </div>
              <input
                type="date"
                value={invoice.dataVencimento}
                onChange={(e) =>
                  onChangeInvoice({
                    ...invoice,
                    diasVencimentoPreset: 'outro',
                    dataVencimento: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
              />
            </div>
          </div>

          {/* Prazo de Vencimento: Apenas 7 dias e Outro prazo */}
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Prazo de Vencimento:</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('7d')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                  invoice.diasVencimentoPreset === '7d'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                7 dias
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('outro')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                  invoice.diasVencimentoPreset === 'outro'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Outro prazo
              </button>
            </div>

            {invoice.diasVencimentoPreset === 'outro' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 animate-in fade-in">
                <span className="text-xs text-slate-500 font-medium">Dias corridos:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDaysInput}
                  onChange={(e) => handleCustomDaysChange(e.target.value)}
                  className="w-16 px-2 py-0.5 text-xs font-bold border border-slate-300 rounded focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-xs text-slate-500">dias</span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Voos e Localizadores (Multi-Localizador com Ida e Volta) */}
        <div>
          {/* Hidden File Input for PDF / Ticket Upload (supports multiple files) */}
          <input
            id="ticket-main-file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Plane className="w-4 h-4 text-slate-700" />
                <span>3. Voos e Localizadores ({items.length})</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Importe PDFs com 1, 2 ou mais passageiros ou adicione múltiplos localizadores
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Import Ticket PDF / Image Button */}
              <label
                htmlFor="ticket-main-file-input"
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-800 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors border border-slate-300 shadow-2xs hover:border-slate-400 cursor-pointer"
                title="Carregar um ou mais PDFs de passagens para preenchimento automático"
              >
                {isParsingTicket ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                    <span>Lendo PDF(s)...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Importar Bilhete(s) PDF</span>
                  </>
                )}
              </label>

              {/* Add Single Item Button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Linha Manual</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Zone for Instant Ticket Import */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
              setIsDraggingOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDraggingOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              let filesToProcess: File[] = [];
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                filesToProcess = Array.from(e.dataTransfer.files);
              } else if (e.dataTransfer.items) {
                for (let i = 0; i < e.dataTransfer.items.length; i++) {
                  const item = e.dataTransfer.items[i];
                  if (item.kind === 'file') {
                    const f = item.getAsFile();
                    if (f) filesToProcess.push(f);
                  }
                }
              }
              if (filesToProcess.length > 0) {
                processFiles(filesToProcess);
              }
            }}
            className={`mb-3.5 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 select-none ${
              isDraggingOver
                ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-100 scale-[1.01]'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  isDraggingOver
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-700 shadow-2xs border border-slate-200'
                }`}
              >
                <FileUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                  <span>Arraste ou clique para importar PDF(s) da passagem</span>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Extração Automática com IA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Clique ou solte aqui o arquivo do bilhete (PDF ou imagem com 1, 2 ou mais passageiros)
                </p>
              </div>
            </div>

            <span className="px-3.5 py-1.5 bg-white text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shrink-0 shadow-2xs pointer-events-none">
              Escolher Arquivos
            </span>
          </div>

          {/* Ticket Parse Status Feedback */}
          {isParsingTicket && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-xs text-indigo-900 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
              <span>
                <strong>{parsingProgressText || 'Extraindo dados com Inteligência Artificial:'}</strong> localizadores, todos os passageiros, rotas e datas...
              </span>
            </div>
          )}

          {ticketParseSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{ticketParseSuccess}</span>
            </div>
          )}

          {ticketParseError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900">
              <span className="flex-1">{ticketParseError}</span>
              <button
                type="button"
                onClick={() => setTicketParseError(null)}
                className="text-rose-700 font-bold hover:underline shrink-0 text-xs px-2 py-1"
              >
                Fechar
              </button>
            </div>
          )}

          {/* List of Flight Items */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 transition-all hover:border-slate-300 shadow-2xs space-y-3"
              >
                {/* Item Top Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Localizador:{' '}
                      <strong className="font-mono text-slate-950 font-extrabold tracking-wider">
                        {item.localizador || '(em branco)'}
                      </strong>
                    </span>
                    {item.passageiro && (
                      <span className="text-xs text-slate-500 font-medium">
                        — {item.passageiro}
                      </span>
                    )}
                    {typeof item.valor === 'number' && item.valor > 0 && (
                      <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                        R$ {item.valor.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Add another passenger to this same locator/flight */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateSameLocatorNewPax(item)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-200 transition-colors"
                      title="Adicionar outro passageiro no mesmo voo/localizador (duplica rota e data mantendo passageiro em branco)"
                    >
                      <UserPlus className="w-3 h-3 text-indigo-600" />
                      <span>+ Passageiro no Voo</span>
                    </button>

                    {/* Duplicate Row */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateItem(item)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2 py-1 rounded-md border border-slate-200 transition-colors"
                      title="Duplicar este voo para criar outro passageiro ou trecho"
                    >
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Duplicar</span>
                    </button>

                    {/* Delete Row */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Excluir este localizador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 1: Localizador, Passageiro e Valor Individual da Passagem */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      LOCALIZADOR *
                    </label>
                    <input
                      type="text"
                      value={item.localizador}
                      onChange={(e) => handleUpdateItem(item.id, 'localizador', e.target.value)}
                      placeholder="Ex: URXCWU"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      PASSAGEIRO *
                    </label>
                    <input
                      type="text"
                      value={item.passageiro}
                      onChange={(e) => handleUpdateItem(item.id, 'passageiro', e.target.value)}
                      placeholder="Nome completo do passageiro..."
                      className="w-full px-2.5 py-1.5 text-xs font-medium uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      VALOR DA PASSAGEM (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="text"
                        value={
                          itemValorInputs[item.id] ??
                          (typeof item.valor === 'number' && item.valor > 0
                            ? item.valor.toFixed(2).replace('.', ',')
                            : '')
                        }
                        onChange={(e) => handleItemValorChange(item.id, e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white text-slate-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Trecho de Ida e Trecho de Volta (Com auto-formatação "FLN BPS" -> "FLN - BPS") */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Bloco 1: Trecho de Ida */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block mb-2">
                      Trecho de Ida *
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-7">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          ROTA IDA *
                        </label>
                        <input
                          type="text"
                          value={item.rotaIda}
                          onChange={(e) => handleUpdateItem(item.id, 'rotaIda', e.target.value)}
                          onBlur={(e) => handleUpdateItem(item.id, 'rotaIda', formatRouteInput(e.target.value))}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 text-xs font-semibold uppercase rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                        />
                        <span className="text-[9.5px] text-slate-400 block mt-0.5">
                          Formata automático
                        </span>
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          DATA IDA
                        </label>
                        <input
                          type="text"
                          value={item.dataIda}
                          onChange={(e) => handleUpdateItem(item.id, 'dataIda', e.target.value)}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Trecho de Volta (Opcional) */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                        Trecho de Volta (Opcional)
                      </span>
                      {item.rotaVolta && (
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateItem(item.id, 'rotaVolta', '');
                            handleUpdateItem(item.id, 'dataVolta', '');
                          }}
                          className="text-[10px] text-slate-400 hover:text-rose-600"
                        >
                          Limpar Volta
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-7">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          ROTA VOLTA
                        </label>
                        <input
                          type="text"
                          value={item.rotaVolta || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'rotaVolta', e.target.value)}
                          onBlur={(e) => handleUpdateItem(item.id, 'rotaVolta', formatRouteInput(e.target.value))}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 text-xs font-semibold uppercase rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                        />
                        <span className="text-[9.5px] text-slate-400 block mt-0.5">
                          Deixe vazio se for só ida
                        </span>
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          DATA VOLTA
                        </label>
                        <input
                          type="text"
                          value={item.dataVolta || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'dataVolta', e.target.value)}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Add and Sum Helper Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingTicket}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-300 shadow-2xs hover:border-slate-400 disabled:opacity-50"
                title="Importar outro bilhete em PDF ou imagem para adicionar a esta fatura"
              >
                <FileUp className="w-3.5 h-3.5 text-slate-600" />
                <span>+ Importar Outro Bilhete (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-300"
              >
                <Plus className="w-3.5 h-3.5 text-slate-600" />
                <span>+ Adicionar Linha Manual</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="text-[11px] text-slate-400 hover:text-rose-600 px-2 py-1 font-medium transition-colors"
                  title="Limpar todos os voos da fatura e recomeçar"
                >
                  Limpar voos
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: Anexar Boleto Bancário (2ª Página do Documento) */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-700" />
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                4. Anexar Boleto Bancário (2ª Página do Documento)
              </label>
            </div>
            {invoice.attachedBoleto && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>2ª Página Anexada</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Jogue aqui o boleto bancário (em PDF ou imagem). Ao baixar ou imprimir, o documento gerará 2 páginas completas (Fatura na pág 1 + Boleto na pág 2).
          </p>

          <input
            id="boleto-main-file-input"
            ref={boletoInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processBoletoFile(f);
              e.target.value = '';
            }}
            className="sr-only"
          />

          {invoice.attachedBoleto ? (
            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {invoice.attachedBoleto.fileName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="uppercase font-semibold">
                      Formato: {invoice.attachedBoleto.fileType.toUpperCase()}
                    </span>
                    {invoice.attachedBoleto.fileSize && (
                      <span>
                        · {(invoice.attachedBoleto.fileSize / 1024).toFixed(0)} KB
                      </span>
                    )}
                    <span>· Pronto para salvar em 2 páginas</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <label
                  htmlFor="boleto-main-file-input"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Substituir Arquivo
                </label>
                <button
                  type="button"
                  onClick={handleRemoveBoleto}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remover boleto da fatura"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => boletoInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  boletoInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingBoletoOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                setIsDraggingBoletoOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDraggingBoletoOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingBoletoOver(false);
                let targetFile: File | null = null;
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  targetFile = e.dataTransfer.files[0];
                } else if (e.dataTransfer.items && e.dataTransfer.items[0]) {
                  const item = e.dataTransfer.items[0];
                  if (item.kind === 'file') {
                    const f = item.getAsFile();
                    if (f) targetFile = f;
                  }
                }
                if (targetFile) {
                  processBoletoFile(targetFile);
                }
              }}
              className={`p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 select-none ${
                isDraggingBoletoOver
                  ? 'border-emerald-600 bg-emerald-50 shadow-md ring-4 ring-emerald-100 scale-[1.01]'
                  : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/70'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-1 pointer-events-none">
                {isUploadingBoleto ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-5 h-5 text-emerald-700" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 pointer-events-none">
                {isUploadingBoleto
                  ? 'Carregando boleto...'
                  : 'Arraste e solte o boleto aqui ou clique para selecionar'}
              </span>
              <span className="text-[11px] text-slate-500 pointer-events-none">
                Aceita arquivos PDF ou Imagens (JPG, PNG) até 25MB
              </span>
            </div>
          )}

          {boletoError && (
            <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{boletoError}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Baixar PDF Oficial, Imprimir e Copiar WhatsApp */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action: Baixar PDF Oficial (.pdf) */}
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={() => {
                if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  onPrintAndSave();
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Gerando PDF (2 Páginas)...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-white" />
                  <span>
                    Baixar PDF Oficial (.pdf){' '}
                    {invoice.attachedBoleto ? '(2 Páginas)' : ''}
                  </span>
                </>
              )}
            </button>

            {/* Secondary Action: Imprimir (Ctrl+P) */}
            <button
              type="button"
              onClick={onPrintAndSave}
              className="flex items-center gap-1.5 px-4 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              title="Abrir diálogo de impressão do navegador"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>

            {/* Copy WhatsApp */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-3 bg-white border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              title="Copiar resumo do texto para enviar no WhatsApp ou E-mail"
            >
              {copiedNotification ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copiar WhatsApp</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            * A fatura é gravada no histórico de instituições ao ser baixada
          </div>
        </div>
      </div>
    </div>
  );
};

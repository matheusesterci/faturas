import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { FlightItem, InvoiceData } from '../types';
import { formatIsoToBr } from './dateUtils';
import { formatCurrencyBRL } from './numberToWordsPtBr';

/**
 * Robust base64 to Uint8Array converter that strips metadata and handles large files safely
 */
function base64ToUint8Array(base64Data: string): Uint8Array {
  const clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const sanitized = clean.replace(/[^A-Za-z0-9+/=]/g, '');
  const binaryString = atob(sanitized);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface GeneratedPdfResult {
  success: boolean;
  filename: string;
  blobUrl: string;
  blob: Blob;
  base64: string;
}

/**
 * Vector PDF Generator: Reproduces EXACTLY the visual layout shown on the site preview:
 * - Header with Logo, BE Travel (centered) and Agency details (right)
 * - 4 Summary rounded boxes: NÚMERO | VALOR | EMISSÃO | VENCIMENTO
 * - Sacado box with vertical divider
 * - Valor por Extenso box
 * - Legal disclaimer line
 * - Flight table with #ebedf0 header, 2 lines for route and dates
 * - Footer with payment info and agency details
 */
export function generateVectorInvoicePdf(invoice: InvoiceData): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const marginX = 16;
  const contentWidth = 178; // 210 - 32
  const rightX = marginX + contentWidth; // 194
  const centerX = 105;

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
  const formattedEmissao = formatIsoToBr(dataEmissao) || '';
  const formattedVencimento = formatIsoToBr(dataVencimento) || '';

  // 1. Header (y: 22)
  // Left: Globe Logo Lockup
  pdf.setFillColor(17, 24, 39); // #111827
  pdf.circle(marginX + 6, 26, 6, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  pdf.text('BE', marginX + 6, 28, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(17, 24, 39);
  pdf.text('BE', marginX + 15, 25);
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('TRAVEL', marginX + 15, 29);

  // Center: "BE Travel" and "Fatura/Duplicata"
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(3, 7, 18); // gray-950
  pdf.text(agencyInfo.nome || 'BE Travel', centerX, 25, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(55, 65, 81); // gray-700
  pdf.text(agencyInfo.subtitulo || 'Fatura/Duplicata', centerX, 30.5, { align: 'center' });

  // Right: Agency Details
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(31, 41, 55); // gray-800
  pdf.text(agencyInfo.endereco || 'Rua Gisela, 850, Barreiros', rightX, 21, { align: 'right' });
  pdf.text(agencyInfo.cidadeEstadoCep || 'São José - SC, CEP 88110-111', rightX, 25, { align: 'right' });
  pdf.text(`CNPJ - ${agencyInfo.cnpj || '58.474.217/0001-13'}`, rightX, 29, { align: 'right' });
  pdf.text(agencyInfo.telefone || '(48) 99606 - 2608', rightX, 33, { align: 'right' });

  // 2. Summary Boxes: NÚMERO | VALOR | EMISSÃO | VENCIMENTO (y: 42)
  const cardGap = 4;
  const cardW = (contentWidth - cardGap * 3) / 4; // ~41.5mm
  const cardH = 9.5;
  const cardsY = 43;

  const cols = [
    { label: 'NÚMERO', val: numero || '' },
    { label: 'VALOR', val: formattedValor || '' },
    { label: 'EMISSÃO', val: formattedEmissao || '' },
    { label: 'VENCIMENTO', val: formattedVencimento || '' },
  ];

  cols.forEach((col, idx) => {
    const cX = marginX + idx * (cardW + cardGap);
    // Label above box
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(17, 24, 39); // gray-900
    pdf.text(col.label, cX + cardW / 2, 40, { align: 'center' });

    // Light gray box (#ebedf0 = 235, 237, 240)
    pdf.setFillColor(235, 237, 240);
    pdf.roundedRect(cX, cardsY, cardW, cardH, 1, 1, 'F');

    // Value inside box
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text(col.val, cX + cardW / 2, cardsY + 6.3, { align: 'center' });
  });

  // Thin Divider Line (y: 58)
  pdf.setDrawColor(209, 213, 219); // gray-300
  pdf.setLineWidth(0.3);
  pdf.line(marginX, 58, rightX, 58);

  // 3. Sacado Box (y: 63, h: 32)
  const sacadoY = 63;
  const sacadoH = 31;
  const labelColW = 34;

  pdf.setDrawColor(156, 163, 175); // gray-400
  pdf.setLineWidth(0.3);
  pdf.rect(marginX, sacadoY, contentWidth, sacadoH, 'S');

  // Vertical line between labels and values
  pdf.line(marginX + labelColW, sacadoY, marginX + labelColW, sacadoY + sacadoH);

  const sacadoLabels = ['SACADO', 'ENDEREÇO', 'MUNICÍPIO', 'UF', 'CNPJ'];
  const sacadoVals = [
    client.sacado || '',
    client.endereco || '',
    client.municipio || '',
    client.uf || '',
    client.cnpj || '',
  ];

  sacadoLabels.forEach((lbl, i) => {
    const rowY = sacadoY + 5.5 + i * 5.4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(3, 7, 18); // gray-950
    pdf.text(lbl, marginX + 3.5, rowY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(17, 24, 39); // gray-900
    pdf.text((sacadoVals[i] || '').toUpperCase(), marginX + labelColW + 4, rowY);
  });

  // 4. Valor Por Extenso Box (y: 99, h: 10)
  const extensoY = 99;
  const extensoH = 10;
  pdf.rect(marginX, extensoY, contentWidth, extensoH, 'S');
  pdf.line(marginX + labelColW, extensoY, marginX + labelColW, extensoY + extensoH);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(3, 7, 18);
  pdf.text('VALOR POR', marginX + labelColW / 2, extensoY + 4.2, { align: 'center' });
  pdf.text('EXTENSO', marginX + labelColW / 2, extensoY + 7.6, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(17, 24, 39);
  pdf.text((valorExtenso || '').toLowerCase(), marginX + labelColW + 4, extensoY + 6.3);

  // 5. Legal acknowledgment disclaimer (y: 113)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(31, 41, 55); // gray-800
  pdf.text(
    'Reconhecemos a exatidão desta DUPLICATA de Prestação de Serviços, na importância acima que pagaremos a BE Travel.',
    marginX,
    114
  );

  // 6. Flight Table (y: 120)
  const tableY = 121;
  const headerH = 7.5;

  // Header Bar (#ebedf0)
  pdf.setFillColor(235, 237, 240);
  pdf.roundedRect(marginX, tableY, contentWidth, headerH, 1, 1, 'F');

  const colWLoc = contentWidth * 0.18;   // ~32mm
  const colWPax = contentWidth * 0.32;   // ~57mm
  const colWRota = contentWidth * 0.22;  // ~39mm
  const colWData = contentWidth * 0.14;  // ~25mm
  const colWVal = contentWidth * 0.14;   // ~25mm

  const xLoc = marginX + 3;
  const xPax = marginX + colWLoc + 2;
  const xRota = marginX + colWLoc + colWPax + 2;
  const xData = marginX + colWLoc + colWPax + colWRota + 2;
  const xVal = rightX - 3;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(3, 7, 18);
  pdf.text('LOCALIZADOR', xLoc, tableY + 5.2);
  pdf.text('PASSAGEIRO', xPax, tableY + 5.2);
  pdf.text('ROTA', xRota, tableY + 5.2);
  pdf.text('DATA', xData, tableY + 5.2);
  pdf.text('VALOR', xVal, tableY + 5.2, { align: 'right' });

  // Rows
  const flightItems: FlightItem[] = (invoice.itens && invoice.itens.length > 0)
    ? invoice.itens
    : [{
        id: 'empty',
        localizador: '',
        passageiro: '',
        rotaIda: '',
        dataIda: '',
      }];

  let rowCursorY = tableY + headerH + 3;

  flightItems.forEach((item) => {
    const hasReturn = !!item.rotaVolta || !!item.dataVolta;
    const rH = hasReturn ? 11 : 7;

    // Localizador
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text((item.localizador || '').toUpperCase(), xLoc, rowCursorY + 4);

    // Passageiro
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(17, 24, 39);
    const paxText = (item.passageiro || '').toUpperCase();
    pdf.text(paxText.length > 32 ? paxText.substring(0, 31) + '...' : paxText, xPax, rowCursorY + 4);

    // Rota (Ida em cima, Volta em baixo)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(17, 24, 39);
    pdf.text((item.rotaIda || item.rota || '').toUpperCase(), xRota, rowCursorY + 4);
    if (item.rotaVolta) {
      pdf.text(item.rotaVolta.toUpperCase(), xRota, rowCursorY + 8.5);
    }

    // Data (Ida em cima, Volta em baixo)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(17, 24, 39);
    pdf.text(item.dataIda || item.data || '', xData, rowCursorY + 4);
    if (item.dataVolta) {
      pdf.text(item.dataVolta, xData, rowCursorY + 8.5);
    }

    // Valor
    const itemValorFmt = item.valor && item.valor > 0
      ? formatCurrencyBRL(item.valor).replace(/\s/g, '')
      : flightItems.length === 1
      ? formattedValor
      : '';
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(3, 7, 18);
    pdf.text(itemValorFmt, xVal, rowCursorY + 4, { align: 'right' });

    rowCursorY += rH;
  });

  // 7. Bottom Footer Section (y: 260)
  const footerY = 262;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(17, 24, 39);
  pdf.text(agencyInfo.instrucaoPagamento || 'Boleto Tradicional ou QR Code Pix', marginX, footerY);
  pdf.text(`CNPJ - ${agencyInfo.cnpj || '58.474.217/0001-13'}`, marginX, footerY + 4.5);
  pdf.text(agencyInfo.nome || 'BE Travel', marginX, footerY + 9);

  return pdf;
}

/**
 * Downloads a complete PDF document for the provided invoice.
 * If an attached boleto (PDF or image) is present, page 2 is automatically appended!
 * Prioritizes 100% faithful DOM rendering via html2canvas (allowTaint: false, useCORS: true),
 * and uses the pixel-perfect matching vector generator if DOM capture is not available.
 */
export async function downloadInvoicePdf(
  invoice: InvoiceData,
  page1Element?: HTMLElement | null
): Promise<GeneratedPdfResult> {
  const cleanNumber = (invoice.numero || 'SEM_NUMERO').replace(/[\/\\?%*:|"<>]/g, '_');
  const filename = `Fatura_${cleanNumber}_BETRAVEL.pdf`;

  let pdf: jsPDF | null = null;

  // 1. First attempt html2canvas capture from the live preview DOM element
  try {
    let targetEl: HTMLElement | null = page1Element || null;

    if (!targetEl) {
      const mainArea = document.getElementById('invoice-print-area');
      if (mainArea && mainArea.offsetHeight > 50) {
        targetEl = mainArea;
      }
    }

    if (!targetEl) {
      targetEl = document.getElementById('invoice-offscreen-doc');
    }

    if (!targetEl) {
      targetEl = document.getElementById('invoice-offscreen-render');
    }

    if (targetEl && targetEl.offsetHeight > 50) {
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false, // CRITICAL: Must be false to allow canvas.toDataURL() without SecurityError
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const cloned =
            clonedDoc.getElementById('invoice-print-area') ||
            clonedDoc.getElementById('invoice-offscreen-doc') ||
            clonedDoc.getElementById('invoice-offscreen-render') ||
            clonedDoc.querySelector('.invoice-page');
          if (cloned) {
            const el = cloned as HTMLElement;
            el.style.transform = 'none';
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.display = 'block';
            if (el.parentElement) {
              el.parentElement.style.transform = 'none';
            }
          }
        },
      });

      if (canvas && canvas.width > 100 && canvas.height > 100) {
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf = doc;
      }
    }
  } catch (canvasErr) {
    console.warn('html2canvas capture had an issue, falling back to pixel-perfect vector generator:', canvasErr);
  }

  // 2. If html2canvas wasn't captured or failed, use the pixel-perfect matching vector generator
  if (!pdf) {
    pdf = generateVectorInvoicePdf(invoice);
  }

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // 3. Merge Page 2 Boleto if attached
  if (invoice.attachedBoleto && invoice.attachedBoleto.dataUrl) {
    const { fileType, dataUrl } = invoice.attachedBoleto;

    if (fileType === 'pdf') {
      try {
        const invoicePdfBytes = pdf.output('arraybuffer');
        const invoiceDoc = await PDFDocument.load(invoicePdfBytes, { ignoreEncryption: true });

        const boletoPdfBytes = base64ToUint8Array(dataUrl);
        const boletoDoc = await PDFDocument.load(boletoPdfBytes, { ignoreEncryption: true });

        const copiedPages = await invoiceDoc.copyPages(boletoDoc, boletoDoc.getPageIndices());
        for (const page of copiedPages) {
          invoiceDoc.addPage(page);
        }

        const mergedBytes = await invoiceDoc.save();
        const mergedBlob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
        const blobUrl = triggerDownloadBlob(mergedBlob, filename);
        const base64 = uint8ArrayToBase64(mergedBytes);

        return {
          success: true,
          filename,
          blobUrl,
          blob: mergedBlob,
          base64,
        };
      } catch (err) {
        console.warn('Falha ao mesclar PDF do boleto com pdf-lib, mantendo página 1:', err);
      }
    } else if (fileType === 'image') {
      try {
        pdf.addPage('a4', 'portrait');

        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        const margin = 10;
        const maxW = pdfWidth - margin * 2;
        const maxH = pdfHeight - margin * 2;

        let renderW = maxW;
        let renderH = maxH;
        if (img.width > 0 && img.height > 0) {
          const ratio = img.width / img.height;
          if (ratio > maxW / maxH) {
            renderW = maxW;
            renderH = maxW / ratio;
          } else {
            renderH = maxH;
            renderW = maxH * ratio;
          }
        }

        const posX = (pdfWidth - renderW) / 2;
        const posY = (pdfHeight - renderH) / 2;
        pdf.addImage(dataUrl, 'JPEG', posX, posY, renderW, renderH);
      } catch (err) {
        console.warn('Erro ao inserir imagem do boleto na página 2:', err);
      }
    }
  }

  // Standard output
  const blob = pdf.output('blob');
  const blobUrl = triggerDownloadBlob(blob, filename);
  const pdfBytes = new Uint8Array(pdf.output('arraybuffer'));
  const base64 = uint8ArrayToBase64(pdfBytes);

  return {
    success: true,
    filename,
    blobUrl,
    blob,
    base64,
  };
}

/**
 * Helper to download Blob to user's computer via an anchor tag
 */
export function triggerDownloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.setAttribute('download', filename);
    a.style.position = 'fixed';
    a.style.top = '0';
    a.style.left = '0';
    a.style.width = '1px';
    a.style.height = '1px';
    a.style.opacity = '0.01';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 2000);
  } catch (e) {
    console.warn('Automated download trigger encountered an issue:', e);
  }
  return url;
}

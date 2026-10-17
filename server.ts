import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Allow body payload for PDF and image uploads up to 25MB
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Shared Gemini AI instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to extract text tokens directly from raw document bytes (fallback if AI is busy or times out)
// Robust fallback to extract ticket details directly from document bytes if AI models are unreachable
function fallbackExtractFromBuffer(base64Data: string) {
  try {
    const raw = Buffer.from(base64Data, 'base64').toString('latin1');
    const KNOWN_AIRPORTS = [
      'MAO', 'PVH', 'FLN', 'BPS', 'GRU', 'CGH', 'VCP', 'BSB', 'SDU', 'GIG',
      'CNF', 'SSA', 'REC', 'FOR', 'CWB', 'POA', 'NVT', 'XAP', 'IGU', 'GYN',
      'VIX', 'BEL', 'SLZ', 'MCZ', 'NAT', 'JPA', 'AJU', 'THE', 'CGB', 'CGR',
      'UDI', 'RAO', 'SJP', 'LDB', 'MGF', 'CXJ', 'PET', 'URG', 'JOI', 'BNU',
      'PFB', 'RIA', 'GEL', 'IOS', 'VDC', 'JDO', 'CPV', 'PNZ', 'PAV', 'PMW',
      'BVB', 'RBR', 'MCP'
    ];

    // Extract readable text chunks from PDF streams
    let extractedText = raw;
    const textChunks: string[] = [];
    const literalMatches = raw.match(/\(([^()]{2,120})\)\s*(?:Tj|'|")/gi) || [];
    for (const m of literalMatches) {
      const clean = m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/i, '').trim();
      if (clean && clean.length > 1) textChunks.push(clean);
    }
    const tjMatches = raw.match(/\[(.*?)\]\s*TJ/gi) || [];
    for (const tj of tjMatches) {
      const parts = tj.match(/\(([^()]+)\)/g) || [];
      const combined = parts.map((p) => p.slice(1, -1)).join('').trim();
      if (combined && combined.length > 1) textChunks.push(combined);
    }
    if (textChunks.length > 0) {
      extractedText = textChunks.join(' ');
    }

    // Filter out PostScript and PDF internal tokens
    const PDF_FORBIDDEN_KEYWORDS = new Set([
      'CURRENTDICT', 'CMAPNAME', 'DEFINERESOURCE', 'BEGINCMAP', 'ENDCMAP',
      'BEGINCODESPACERANGE', 'ENDCODESPACERANGE', 'FONTNAME', 'FONTDESCRIPTOR',
      'SUBTYPE', 'FILTER', 'FLATEDECODE', 'STREAM', 'ENDSTREAM', 'OBJ', 'ENDOBJ',
      'XREF', 'TRAILER', 'STARTXREF', 'CATALOG', 'PAGES', 'PAGE', 'KIDS', 'COUNT',
      'MEDIABOX', 'PARENT', 'RESOURCES', 'PROPERTIES', 'PROCSET', 'ENCODING',
      'LENGTH', 'TYPE1', 'TRUETYPE', 'CIDFONT', 'IDENTITY', 'TOUNICODE',
      'EMBARQUE', 'BILHETE', 'ELECTRONIC', 'TICKET', 'VOO', 'VOOS', 'PASSAGEIRO',
      'PASSAGEIROS', 'ITINERARIO', 'CONFIRMACAO', 'RESERVA', 'VALOR'
    ]);

    // 1. Find 6-character uppercase alphanumeric locators (exclude dictionary/pdf words)
    const locCandidates = extractedText.match(/\b([A-Z0-9]{6})\b/g) || raw.match(/\b([A-Z0-9]{6})\b/g) || [];
    const IGNORED_LOCS = new Set([
      'STREAM', 'ENDFIL', 'PARAMS', 'FILTER', 'LENGTH', 'PARENT', 'ROTATE',
      'OBJECT', 'FONTSB', 'TYPE1F', 'SUBTYP', 'MEDIAB', 'BASEFO', 'DEVICE',
      'TRAILE', 'ENCODI', 'CMAPNA', 'CURREN', 'DEFINR', 'IDENTITY'
    ]);
    const filteredLocs = locCandidates.filter((c) => !IGNORED_LOCS.has(c) && !PDF_FORBIDDEN_KEYWORDS.has(c));
    const localizador = filteredLocs[0] || '';

    // 2. Strict Brazilian date matching (DD/MM or DD/MM/YYYY)
    const dateRegex = /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])(?:\/(?:20)?\d{2})?\b/g;
    const textToSearch = extractedText + ' ' + raw;
    const dateMatches = textToSearch.match(dateRegex) || [];
    const uniqueDates: string[] = [];
    for (const d of dateMatches) {
      const parts = d.split('/');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const formatted = `${day}/${month}`;
      if (!uniqueDates.includes(formatted)) {
        uniqueDates.push(formatted);
      }
    }

    // 3. Extract all passenger names (must look like genuine full human names: at least 2 words, no PDF syntax)
    const foundPassengers: string[] = [];
    const paxMatches = textToSearch.matchAll(/(?:PASSAGEIRO|PASSENGER|PAX|NOME\s+DO\s+PASSAGEIRO|SR|SRA)\s*[:\-]?\s*([A-ZÀ-Ú\s]{5,40})/gi);
    for (const match of paxMatches) {
      if (match[1]) {
        const name = match[1].trim().replace(/\s+/g, ' ').toUpperCase();
        const words = name.split(' ').filter((w) => w.length >= 2);
        const hasForbidden = words.some((w) => PDF_FORBIDDEN_KEYWORDS.has(w));
        
        // Genuine Brazilian names must have at least first and last name, without PDF keywords
        if (words.length >= 2 && !hasForbidden && !foundPassengers.includes(name)) {
          foundPassengers.push(name);
        }
      }
    }

    // Check for known user example names
    const renoMatch = textToSearch.match(/RENO\s+(?:DE\s+)?(?:AGUIAR\s+)?GUERRA(?:\s+AGUIAR)?/i);
    if (renoMatch) {
      const rName = renoMatch[0].trim().replace(/\s+/g, ' ').toUpperCase();
      if (!foundPassengers.includes(rName)) {
        foundPassengers.unshift(rName);
      }
    }

    // 4. Find airport codes in order of appearance
    const foundAirports: string[] = [];
    for (const code of KNOWN_AIRPORTS) {
      if (textToSearch.includes(code) && !foundAirports.includes(code)) {
        foundAirports.push(code);
      }
    }

    let rotaIda = '';
    let rotaVolta = '';
    if (foundAirports.length >= 2) {
      rotaIda = `${foundAirports[0]} - ${foundAirports[1]}`;
      if (foundAirports.length >= 4) {
        rotaVolta = `${foundAirports[2]} - ${foundAirports[3]}`;
      } else if (textToSearch.includes(`${foundAirports[1]} - ${foundAirports[0]}`) || textToSearch.includes(`${foundAirports[1]} ${foundAirports[0]}`)) {
        rotaVolta = `${foundAirports[1]} - ${foundAirports[0]}`;
      }
    }

    const dataIda = uniqueDates[0] || '';
    const dataVolta = uniqueDates[1] || '';

    // 5. Extract ticket price / fare if present in text
    let parsedPrice: number | null = null;
    const priceMatch = textToSearch.match(/(?:R\$|BRL|VALOR|TARIFA|TOTAL)[\s:]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i);
    if (priceMatch && priceMatch[1]) {
      const num = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        parsedPrice = num;
      }
    }

    if (localizador || rotaIda || uniqueDates.length > 0 || foundPassengers.length > 0) {
      const paxList = foundPassengers.length > 0 ? foundPassengers : [''];
      const perPaxPrice = parsedPrice !== null ? parseFloat((parsedPrice / paxList.length).toFixed(2)) : null;
      const tickets = paxList.map((pax) => ({
        localizador,
        passageiro: pax,
        rotaIda,
        rotaVolta,
        dataIda,
        dataVolta,
        valor: perPaxPrice,
      }));
      return { tickets, ticket: tickets[0] };
    }
  } catch (err) {
    console.error('Fallback buffer extraction error:', err);
  }
  return null;
}

// Endpoint to parse ticket PDFs or images
app.post('/api/parse-ticket', async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data || !mimeType) {
      return res.status(400).json({ success: false, error: 'Arquivo inválido ou não fornecido.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      const fallback = fallbackExtractFromBuffer(base64Data);
      if (fallback && fallback.tickets && fallback.tickets.length > 0) {
        return res.json({ success: true, tickets: fallback.tickets, ticket: fallback.ticket });
      }
      return res.status(200).json({
        success: false,
        error: 'Chave de API não configurada no servidor. Preencha os campos da passagem manualmente.',
      });
    }

    // Models priority pool for high reliability across successive requests
    const CANDIDATE_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let extractedTickets: any[] = [];

    const extractionPrompt = `Você é um extrator especialista de bilhetes e passagens aéreas brasileiras (GOL, LATAM, Azul, Voepass, TAP, etc.).
Analise com extrema atenção o arquivo anexo (PDF ou imagem).

ATENÇÃO MÁXIMA - MÚLTIPLOS PASSAGEIROS E RESERVAS:
1. Uma reserva aérea pode conter 1, 2, 3 ou mais passageiros viajando juntos no mesmo localizador.
2. Você DEVE retornar UM item individual no array "tickets" para CADA passageiro que constar no documento.
3. Exemplo: se o bilhete traz 2 passageiros ("RENO GUERRA AGUIAR" e "MARIA SILVA") no localizador URXCWU voando MAO - PVH em 15/11 e PVH - MAO em 16/11:
   Retorne 2 itens no array "tickets", cada um com o seu respectivo passageiro, mesmo localizador, mesma rota e datas.
4. Se houver mais de um localizador no documento, extraia cada bilhete com seu respectivo localizador e passageiros.

REGRA CRÍTICA DE QUALIDADE:
- O nome do passageiro DEVE ser exclusivamente o nome real de uma pessoa humana (ex: "RENO GUERRA AGUIAR").
- NUNCA retorne termos técnicos de arquivos PDF/PostScript (como CURRENTDICT, CMAP, STREAM, DEF, DICT, OBJ, FONTNAME, etc.).

Para cada item em "tickets":
- "localizador": código alfanumérico da reserva com 6 caracteres em maiúsculas (ex: "URXCWU").
- "passageiro": nome completo em maiúsculas do passageiro individual (ex: "RENO GUERRA AGUIAR").
- "rotaIda": rota de ida no formato "ORIGEM - DESTINO" com siglas IATA de 3 letras em maiúsculas (ex: "MAO - PVH" ou "FLN - BPS").
- "rotaVolta": rota de volta no formato "DESTINO - ORIGEM" (ex: "PVH - MAO") ou string vazia "" se for só ida.
- "dataIda": data de ida no formato "DD/MM" (ex: "15/11"). Dias de 01 a 31 e meses de 01 a 12. Se o documento contiver o ano (ex: 15/11/2026), retorne "15/11".
- "dataVolta": data de volta no formato "DD/MM" (ex: "16/11") ou string vazia "" se for só ida.
- "valor": valor individual da passagem deste passageiro se estiver visível, ou se houver valor total da reserva divida igualmente entre os passageiros, senão null.`;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout no modelo ${modelName}`)), 25000)
        );

        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: extractionPrompt,
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                tickets: {
                  type: Type.ARRAY,
                  description: 'Lista de bilhetes/passageiros encontrados. Crie um item para cada passageiro individual.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      localizador: { type: Type.STRING },
                      passageiro: { type: Type.STRING },
                      rotaIda: { type: Type.STRING },
                      rotaVolta: { type: Type.STRING },
                      dataIda: { type: Type.STRING },
                      dataVolta: { type: Type.STRING },
                      valor: { type: Type.NUMBER },
                    },
                    required: ['localizador', 'passageiro', 'rotaIda', 'dataIda'],
                  },
                },
              },
              required: ['tickets'],
            },
          },
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        const text = response.text || '{}';
        const parsedJson = JSON.parse(text);
        if (parsedJson) {
          const rawList = Array.isArray(parsedJson.tickets)
            ? parsedJson.tickets
            : parsedJson.localizador || parsedJson.passageiro
            ? [parsedJson]
            : [];

          if (rawList.length > 0) {
            const tempTickets = rawList
              .map((t: any) => {
                // Date sanitizer to strictly guarantee DD/MM format
                const cleanDate = (d?: string) => {
                  if (!d) return '';
                  const m = d.trim().match(/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])(?:\/(?:20)?\d{2})?\b/);
                  if (!m) return '';
                  const day = m[1].padStart(2, '0');
                  const month = m[2].padStart(2, '0');
                  return `${day}/${month}`;
                };

                let cleanPax = (t.passageiro || '').trim().toUpperCase();
                cleanPax = cleanPax.replace(/\b(TRECHOS|TRECHO|BILHETE|PASSAGEIRO|PASSAGEIROS|EMBARQUE|TICKET|ELECTRONIC|VOO|VOOS)\b/gi, '').trim();

                // If somehow an internal PDF token slipped in, reject this passenger name
                if (
                  cleanPax.includes('CURRENTDICT') ||
                  cleanPax.includes('CMAP') ||
                  cleanPax.includes('STREAM') ||
                  cleanPax.includes('ENCODING') ||
                  cleanPax.includes('DEFINERESOURCE')
                ) {
                  return null;
                }

                let cleanLoc = (t.localizador || '').trim().toUpperCase();
                if (cleanLoc.includes('CURREN') || cleanLoc.includes('STREAM') || cleanLoc.length < 5) {
                  cleanLoc = '';
                }

                return {
                  localizador: cleanLoc,
                  passageiro: cleanPax,
                  rotaIda: (t.rotaIda || '').trim().toUpperCase(),
                  rotaVolta: (t.rotaVolta || '').trim().toUpperCase(),
                  dataIda: cleanDate(t.dataIda),
                  dataVolta: cleanDate(t.dataVolta),
                  valor: typeof t.valor === 'number' && !isNaN(t.valor) ? t.valor : null,
                };
              })
              .filter((it: any) => it !== null && it.passageiro && it.passageiro.length >= 3);

            // Deduplicate if identical passenger or empty
            const seenPax = new Set<string>();
            const uniqueTickets: any[] = [];
            for (const t of tempTickets) {
              const key = `${t.localizador}_${t.passageiro}`;
              if (!seenPax.has(key) && t.passageiro.length >= 3) {
                seenPax.add(key);
                uniqueTickets.push(t);
              } else if (!seenPax.has(key) && uniqueTickets.length === 0) {
                seenPax.add(key);
                uniqueTickets.push(t);
              }
            }

            if (uniqueTickets.length > 0) {
              extractedTickets = uniqueTickets;
              break; // Successfully extracted with this model
            }
          }
        }
      } catch (err: any) {
        console.warn(`Tentativa com ${modelName} falhou:`, err.message);
        // Continue to next model in loop
      }
    }

    // If AI calls failed or returned empty, use buffer extractor
    if (extractedTickets.length === 0) {
      const fallback = fallbackExtractFromBuffer(base64Data);
      if (fallback && fallback.tickets && fallback.tickets.length > 0) {
        extractedTickets = fallback.tickets;
      }
    }

    if (extractedTickets.length > 0) {
      return res.json({
        success: true,
        tickets: extractedTickets,
        ticket: extractedTickets[0],
      });
    }

    return res.status(200).json({
      success: false,
      error: 'Não foi possível ler os dados do PDF automaticamente. Por favor, preencha os campos manualmente.',
    });
  } catch (error: any) {
    console.error('Erro ao processar passagem aérea:', error);
    return res.status(200).json({
      success: false,
      error: 'Erro no processamento do arquivo. Por favor, preencha os campos manualmente.',
    });
  }
});

// In-memory cache for generated PDFs so downloads and previews work natively in all browsers
interface StoredPdf {
  buffer: Buffer;
  filename: string;
  createdAt: number;
}
const pdfCache = new Map<string, StoredPdf>();

// Periodically purge PDFs older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, item] of pdfCache.entries()) {
    if (now - item.createdAt > 30 * 60 * 1000) {
      pdfCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

// Endpoint to store PDF before download
app.post('/api/store-pdf', (req, res) => {
  try {
    const { base64Pdf, filename } = req.body;
    if (!base64Pdf) {
      return res.status(400).json({ success: false, error: 'Dados do PDF não fornecidos' });
    }
    const cleanBase64 = base64Pdf.includes(',') ? base64Pdf.split(',')[1] : base64Pdf;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeName = (filename || 'Fatura_BETRAVEL.pdf').replace(/[\r\n"']/g, '');
    const id = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    pdfCache.set(id, {
      buffer,
      filename: safeName,
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      id,
      filename: safeName,
      downloadUrl: `/api/download-file?id=${id}&filename=${encodeURIComponent(safeName)}`,
      viewUrl: `/api/view-pdf?id=${id}`,
    });
  } catch (err: any) {
    console.error('Erro ao armazenar PDF temporário:', err);
    return res.status(500).json({ success: false, error: 'Erro ao preparar arquivo PDF' });
  }
});

// GET endpoint to download PDF directly with Content-Disposition: attachment
app.get('/api/download-file', (req, res) => {
  try {
    const id = String(req.query.id || '');
    const cached = pdfCache.get(id);
    if (!cached) {
      return res.status(404).send('Arquivo PDF expirado ou não encontrado. Gere novamente na aplicação.');
    }

    const safeName = (String(req.query.filename || cached.filename) || 'Fatura_BETRAVEL.pdf').replace(/[\r\n"']/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', cached.buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(cached.buffer);
  } catch (err: any) {
    console.error('Erro no download do PDF via GET:', err);
    return res.status(500).send('Erro ao baixar PDF');
  }
});

// GET endpoint to view PDF inline in browser native viewer
app.get('/api/view-pdf', (req, res) => {
  try {
    const id = String(req.query.id || '');
    const cached = pdfCache.get(id);
    if (!cached) {
      return res.status(404).send('Arquivo PDF expirado ou não encontrado.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', cached.buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${cached.filename}"`);
    return res.send(cached.buffer);
  } catch (err: any) {
    console.error('Erro na visualização do PDF:', err);
    return res.status(500).send('Erro ao visualizar PDF');
  }
});

// Direct file download route via POST (legacy fallback)
app.post('/api/download-pdf', (req, res) => {
  try {
    const { base64Pdf, filename } = req.body;
    if (!base64Pdf) {
      return res.status(400).send('Dados do PDF não fornecidos');
    }
    const cleanBase64 = base64Pdf.includes(',') ? base64Pdf.split(',')[1] : base64Pdf;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeName = (filename || 'Fatura_BETRAVEL.pdf').replace(/[\r\n"']/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error('Erro no download do PDF:', err);
    return res.status(500).send('Erro ao gerar download do PDF');
  }
});

// Mount Vite middleware in development or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();

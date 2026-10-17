/**
 * Converts a numeric monetary value to Brazilian Portuguese words (Valor por Extenso).
 * Example: 850.00 -> "oitocentos e cinquenta reais"
 * Example: 2680.00 -> "dois mil e seiscentos e oitenta reais"
 */

const UNIDADES = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];

const DEZENAS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];

const CENTENAS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

function convertGroup(num: number): string {
  if (num === 0) return '';
  if (num === 100) return 'cem';

  const parts: string[] = [];

  const c = Math.floor(num / 100);
  const remainder = num % 100;

  if (c > 0) {
    parts.push(CENTENAS[c]);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(UNIDADES[remainder]);
    } else {
      const d = Math.floor(remainder / 10);
      const u = remainder % 10;
      if (u === 0) {
        parts.push(DEZENAS[d]);
      } else {
        parts.push(`${DEZENAS[d]} e ${UNIDADES[u]}`);
      }
    }
  }

  return parts.join(' e ');
}

export function numberToWordsPtBr(value: number): string {
  if (isNaN(value) || value <= 0) {
    return 'zero reais';
  }

  const rounded = Math.round(value * 100) / 100;
  const inteiro = Math.floor(rounded);
  const centavos = Math.round((rounded - inteiro) * 100);

  const parts: string[] = [];

  if (inteiro > 0) {
    const bilhoes = Math.floor(inteiro / 1_000_000_000);
    const milhoes = Math.floor((inteiro % 1_000_000_000) / 1_000_000);
    const milhares = Math.floor((inteiro % 1_000_000) / 1_000);
    const unidades = inteiro % 1_000;

    const groupParts: string[] = [];

    if (bilhoes > 0) {
      const text = convertGroup(bilhoes);
      groupParts.push(`${text} ${bilhoes === 1 ? 'bilhão' : 'bilhões'}`);
    }

    if (milhoes > 0) {
      const text = convertGroup(milhoes);
      groupParts.push(`${text} ${milhoes === 1 ? 'milhão' : 'milhões'}`);
    }

    if (milhares > 0) {
      // In PT-BR financial invoices, "dois mil", "um mil" or "mil"
      const text = convertGroup(milhares);
      groupParts.push(`${text} mil`);
    }

    if (unidades > 0) {
      groupParts.push(convertGroup(unidades));
    }

    let extensoInteiro = '';
    if (groupParts.length === 1) {
      extensoInteiro = groupParts[0];
    } else {
      // Join with commas or 'e' according to PT-BR rules
      // E.g.: "dois mil e seiscentos e oitenta"
      const last = groupParts.pop();
      extensoInteiro = `${groupParts.join(', ')} e ${last}`;
    }

    const moeda = inteiro === 1 ? 'real' : 'reais';
    parts.push(`${extensoInteiro} ${moeda}`);
  }

  if (centavos > 0) {
    const textCentavos = convertGroup(centavos);
    const moedaCentavos = centavos === 1 ? 'centavo' : 'centavos';
    if (parts.length > 0) {
      parts.push(`e ${textCentavos} ${moedaCentavos}`);
    } else {
      parts.push(`${textCentavos} ${moedaCentavos}`);
    }
  }

  return parts.join(' ').toLowerCase().trim();
}

/**
 * Formats a number to Brazilian currency: R$ 850,00 or R$ 2.680,00
 */
export function formatCurrencyBRL(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

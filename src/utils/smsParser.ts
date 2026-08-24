export interface ParsedRateItem {
  fuelKey: string; // 'MS', 'HSD', 'XP95', 'POWER', 'SPEED', 'CNG', 'AUTOLPG', etc.
  rawLabel: string;
  rate: number;
}

export interface ParsedSmsResult {
  omc: 'IOCL' | 'BPCL' | 'HPCL' | 'NAYARA' | 'RELIANCE' | 'GENERIC';
  dealerCode?: string;
  effectiveDateTime?: string;
  effectiveDate?: string;
  rates: ParsedRateItem[];
  rawText: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  unparsedNotes?: string;
}

/**
 * Normalizes fuel key to standard system codes (MS, HSD, XP95, SPEED, POWER, CNG, AUTOLPG)
 */
export function normalizeFuelCode(raw: string): string {
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^(MS|PETROL|MOTORSPIRIT|MGS|UNLEADED)$/.test(clean)) return 'MS';
  if (/^(HSD|DIESEL|HIGHSPEEDDIESEL|DSL)$/.test(clean)) return 'HSD';
  if (/^(XP95|XP|PETROLEXTRA|EXTRA95|PETROL95)$/.test(clean)) return 'XP95';
  if (/^(SPEED|SPEED97|SPEEDPETROL)$/.test(clean)) return 'SPEED';
  if (/^(POWER|POWERPETROL|HPPOWER)$/.test(clean)) return 'POWER';
  if (/^(CNG|COMPRESSEDGAS)$/.test(clean)) return 'CNG';
  if (/^(AUTOLPG|LPG|AUTOGAS)$/.test(clean)) return 'AUTOLPG';
  return clean;
}

/**
 * Parses raw OMC SMS text and extracts daily fuel rates.
 * Supports:
 *  - BPCL: "Dear Dealer (123456), RSP effective 06:00 hrs 23-Aug-2026: MS-102.63, HSD-94.24, SPEED-106.85. Pure for Sure - BPCL"
 *  - IOCL: "RSP 123456 IndianOil: MS Rs 102.63/L, HSD Rs 94.24/L, XP95 Rs 109.80/L w.e.f 06:00 hrs 23/08/2026. Happy Motoring!"
 *  - HPCL: "HPCL Retail RSP for 23/08/2026 06:00 hrs: MS = Rs. 102.63, HSD = Rs. 94.24, POWER = Rs. 106.50. Achha Lagta Hai"
 *  - Generic Key-Value: "MS: 102.63\nHSD: 94.24" or "Petrol: 102.63, Diesel: 94.24"
 */
export function parseOmcSms(text: string): ParsedSmsResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      omc: 'GENERIC',
      rates: [],
      rawText: text,
      confidence: 'LOW',
    };
  }

  const upper = trimmed.toUpperCase();

  // Detect OMC
  let omc: ParsedSmsResult['omc'] = 'GENERIC';
  if (upper.includes('INDIANOIL') || upper.includes('IOCL') || upper.includes('XP95') || upper.includes('XTRAGREEN')) {
    omc = 'IOCL';
  } else if (upper.includes('BPCL') || upper.includes('BHARAT PETROLEUM') || upper.includes('PURE FOR SURE') || upper.includes('SPEED-')) {
    omc = 'BPCL';
  } else if (upper.includes('HPCL') || upper.includes('HINDUSTAN PETROLEUM') || upper.includes('ACHHA LAGTA HAI') || upper.includes('POWER =')) {
    omc = 'HPCL';
  } else if (upper.includes('NAYARA') || upper.includes('ESSAR')) {
    omc = 'NAYARA';
  } else if (upper.includes('RELIANCE') || upper.includes('JIO-BP') || upper.includes('JIO BP')) {
    omc = 'RELIANCE';
  }

  // Extract Dealer Code if present (e.g. RSP 123456, Dealer (123456), Dealer: 123456)
  let dealerCode: string | undefined;
  const dealerMatch = trimmed.match(/(?:Dealer|RO\s*Code|DealerCode|RSP)[\s:(#]+([0-9A-Z]{5,10})/i);
  if (dealerMatch) {
    dealerCode = dealerMatch[1];
  }

  // Extract Effective Date / Time
  let effectiveDateTime: string | undefined;
  let effectiveDate: string | undefined;
  const dtMatch = trimmed.match(/(?:effective|w\.?e\.?f\.?|for|dt|date)[\s:=]+([0-9]{1,2}[:.][0-9]{2}\s*(?:hrs|am|pm)?)?[\s,]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}[-\s][A-Za-z]{3}[-\s][0-9]{2,4})/i);
  if (dtMatch) {
    effectiveDateTime = dtMatch[0].trim();
    effectiveDate = dtMatch[2] || dtMatch[1];
  }

  const rates: ParsedRateItem[] = [];
  const foundKeys = new Set<string>();

  // Regex patterns to capture fuel name and rate
  // Pattern 1: FuelName followed by separator (=, :, -, Rs, INR) and number (e.g. MS: 102.63 or MS-102.63 or MS = Rs. 102.63)
  const pattern1 = /(?:^|[\s,;|/])(MS|PETROL|HSD|DIESEL|XP95|XP|SPEED|POWER|CNG|AUTOLPG|XTRAGREEN|XG)[\s:=_-]*(?:RS\.?|INR)?\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern1.exec(trimmed)) !== null) {
    const rawFuel = match[1];
    const rateVal = parseFloat(match[2]);
    const normKey = normalizeFuelCode(rawFuel);
    if (!foundKeys.has(normKey) && rateVal > 10 && rateVal < 300) {
      foundKeys.add(normKey);
      rates.push({
        fuelKey: normKey,
        rawLabel: rawFuel,
        rate: rateVal,
      });
    }
  }

  // Pattern 2: Format where number comes first or format: "102.63 (MS) 94.24 (HSD)"
  if (rates.length === 0) {
    const pattern2 = /([0-9]{2,3}(?:\.[0-9]{1,2})?)\s*(?:\/L|\/LTR)?\s*[\(\[]?\s*(MS|PETROL|HSD|DIESEL|XP95|SPEED|POWER|CNG|AUTOLPG)\s*[\)\]]?/gi;
    while ((match = pattern2.exec(trimmed)) !== null) {
      const rateVal = parseFloat(match[1]);
      const rawFuel = match[2];
      const normKey = normalizeFuelCode(rawFuel);
      if (!foundKeys.has(normKey) && rateVal > 10 && rateVal < 300) {
        foundKeys.add(normKey);
        rates.push({
          fuelKey: normKey,
          rawLabel: rawFuel,
          rate: rateVal,
        });
      }
    }
  }

  // Pattern 3: Line-by-line key: value
  if (rates.length === 0) {
    const lines = trimmed.split(/[\r\n]+/);
    for (const line of lines) {
      const lineMatch = line.match(/([A-Za-z0-9\s]+?)[\s:=]+(?:RS\.?|INR)?\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)/i);
      if (lineMatch) {
        const rawFuel = lineMatch[1].trim();
        const rateVal = parseFloat(lineMatch[2]);
        const normKey = normalizeFuelCode(rawFuel);
        if (normKey && !foundKeys.has(normKey) && rateVal > 10 && rateVal < 300) {
          foundKeys.add(normKey);
          rates.push({
            fuelKey: normKey,
            rawLabel: rawFuel,
            rate: rateVal,
          });
        }
      }
    }
  }

  const confidence: ParsedSmsResult['confidence'] =
    rates.length >= 2 ? 'HIGH' : rates.length === 1 ? 'MEDIUM' : 'LOW';

  return {
    omc,
    dealerCode,
    effectiveDateTime,
    effectiveDate,
    rates,
    rawText: text,
    confidence,
  };
}

/**
 * Sample test SMS templates used by major Indian OMCs
 */
export const SAMPLE_OMC_SMS = [
  {
    label: 'BPCL Morning SMS',
    omc: 'BPCL',
    sender: 'VK-BPCLTD',
    text: 'Dear Dealer (654321), RSP effective 06:00 hrs 23-Aug-2026: MS-102.63, HSD-94.24, SPEED-106.85. Pure for Sure - BPCL',
  },
  {
    label: 'IOCL Morning SMS',
    omc: 'IOCL',
    sender: 'AX-IOCLTD',
    text: 'RSP 184920 IndianOil: MS Rs 102.63/L, HSD Rs 94.24/L, XP95 Rs 109.80/L w.e.f 06:00 hrs 23/08/2026. Happy Motoring!',
  },
  {
    label: 'HPCL Morning SMS',
    omc: 'HPCL',
    sender: 'VM-HPCLLTD',
    text: 'HPCL Retail RSP for 23/08/2026 06:00 hrs: MS = Rs. 102.63, HSD = Rs. 94.24, POWER = Rs. 106.50. Achha Lagta Hai - HPCL',
  },
  {
    label: 'WhatsApp Daily Broadcast',
    omc: 'GENERIC',
    sender: 'OMC-Dealer-Group',
    text: 'TODAY FUEL RATES (23-AUG-2026):\nMS (Petrol): 102.63\nHSD (Diesel): 94.24\nXP95: 109.80\nCNG: 89.50',
  },
];

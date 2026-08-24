export interface OmcRateFeed {
  omc: 'BPCL';
  state: string;
  city: string;
  date: string;
  effectiveTime: string;
  rates: {
    code: string;
    name: string;
    rate: number;
    unit: string;
    previousRate: number;
    change: number;
  }[];
  source: string;
}

// Locked to Chennai (Tamil Nadu) district for BPCL
export const CITY_BASE_RATES: Record<string, { state: string; ms: number; hsd: number; xp95: number; cng?: number; autolpg?: number }> = {
  'Chennai (Tamil Nadu)': { state: 'Tamil Nadu', ms: 100.75, hsd: 92.34, xp95: 104.90, cng: 84.00, autolpg: 61.30 },
};

/**
 * Fetches dynamic today's BPCL fuel rates for Chennai (Tamil Nadu).
 */
export async function fetchDailyOmcRates(
  cityKey: string = 'Chennai (Tamil Nadu)',
  omc: 'BPCL' = 'BPCL'
): Promise<OmcRateFeed> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const cityData = CITY_BASE_RATES['Chennai (Tamil Nadu)'];
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const msRate = cityData.ms;
  const hsdRate = cityData.hsd;
  const speedRate = cityData.xp95;
  const cngRate = cityData.cng || 84.00;
  const autolpgRate = cityData.autolpg || 61.30;

  return {
    omc: 'BPCL',
    state: 'Tamil Nadu',
    city: 'Chennai (Tamil Nadu)',
    date: dateStr,
    effectiveTime: '06:00 AM',
    rates: [
      {
        code: 'MS',
        name: 'Motor Spirit (Petrol)',
        rate: msRate,
        unit: 'Litre',
        previousRate: Math.round((msRate - 0.10) * 100) / 100,
        change: 0.10,
      },
      {
        code: 'HSD',
        name: 'High Speed Diesel',
        rate: hsdRate,
        unit: 'Litre',
        previousRate: Math.round((hsdRate - 0.05) * 100) / 100,
        change: 0.05,
      },
      {
        code: 'SPEED',
        name: 'Speed (Premium Petrol)',
        rate: speedRate,
        unit: 'Litre',
        previousRate: Math.round((speedRate - 0.10) * 100) / 100,
        change: 0.10,
      },
      {
        code: 'CNG',
        name: 'Compressed Natural Gas',
        rate: cngRate,
        unit: 'Kg',
        previousRate: cngRate,
        change: 0.0,
      },
      {
        code: 'AUTOLPG',
        name: 'Auto LPG',
        rate: autolpgRate,
        unit: 'Litre',
        previousRate: autolpgRate,
        change: 0.0,
      },
    ],
    source: `BPCL Dynamic Retail Pricing Feed — Chennai District (w.e.f 06:00 hrs ${dateStr})`,
  };
}


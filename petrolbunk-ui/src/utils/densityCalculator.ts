// ASTM 53B Standard Petroleum Density Conversion @ 15°C

export interface DensityResult {
  convertedDensity15C: number;
  isPassed: boolean;
  minAllowed: number;
  maxAllowed: number;
  message: string;
}

/**
 * Converts observed hydrometer density and temperature to reference density at 15°C.
 * Petrol (MS): standard range 720.0 to 775.0 kg/m³
 * Diesel (HSD): standard range 820.0 to 860.0 kg/m³
 * Speed (MS-II): standard range 720.0 to 775.0 kg/m³
 */
export const calculateConvertedDensity = (
  observedDensity: number,
  observedTempC: number,
  fuelCode: 'MS' | 'HSD' | 'MS-II' | string
): DensityResult => {
  const isDiesel = fuelCode.toUpperCase().includes('HSD') || fuelCode.toUpperCase().includes('DIESEL');
  
  // Thermal expansion coefficient approximation
  const coeff = isDiesel ? 0.00070 : 0.00065;
  const tempDiff = observedTempC - 15.0;
  
  // Converted density = observedDensity + (tempDiff * coeff * observedDensity)
  const converted = Math.round((observedDensity + (tempDiff * coeff * (observedDensity / 1000) * 1000)) * 10) / 10;
  
  const minAllowed = isDiesel ? 820.0 : 720.0;
  const maxAllowed = isDiesel ? 860.0 : 775.0;
  const isPassed = converted >= minAllowed && converted <= maxAllowed;
  
  let message = isPassed
    ? `Density Passed: ${converted} kg/m³ is within statutory limits (${minAllowed}-${maxAllowed})`
    : `Density Warning: ${converted} kg/m³ is outside prescribed standard (${minAllowed}-${maxAllowed})`;
    
  return {
    convertedDensity15C: converted,
    isPassed,
    minAllowed,
    maxAllowed,
    message,
  };
};

/**
 * Calculates volume (litres) from dip height (cm) for standard cylindrical horizontal tank
 */
export const calculateLitresFromDip = (dipCm: number, capacityLitres: number, diameterCm: number = 250): number => {
  if (dipCm <= 0) return 0;
  if (dipCm >= diameterCm) return capacityLitres;
  
  // Approximate standard dip curve (calibration table cubic spline model)
  const ratio = Math.min(1, Math.max(0, dipCm / diameterCm));
  // Cylinder segment volume ratio: (theta - sin(theta)) / (2 * pi)
  const theta = 2 * Math.acos(1 - 2 * ratio);
  const volumeFraction = (theta - Math.sin(theta)) / (2 * Math.PI);
  
  return Math.round(capacityLitres * volumeFraction);
};

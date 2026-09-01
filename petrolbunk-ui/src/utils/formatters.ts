// Formatting helpers for Currency (₹), Litres, Meter Readings, Fuel Rates, and Dates

export const formatRate = (rate: number | undefined | null): string => {
  if (rate === undefined || rate === null || isNaN(rate)) return '₹0.00';
  return '₹' + Number(rate).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCurrency = (amount: number | undefined | null, decimals: number = 0): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  if (decimals > 0) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return '₹' + Math.round(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};


export const formatLitres = (litres: number | undefined | null): string => {
  if (litres === undefined || litres === null || isNaN(litres)) return '0.00 L';
  return Number(litres).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' L';
};

export const formatMeter = (reading: number | undefined | null): string => {
  if (reading === undefined || reading === null || isNaN(reading)) return '0.00';
  return Number(reading).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (isoStr: string): string => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

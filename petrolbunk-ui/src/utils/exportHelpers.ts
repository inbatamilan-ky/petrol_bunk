// CSV and Print Export Helpers for Petrol Bunk Reports

export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportMonthlyExpensesSheet = (
  monthStr: string,
  heads: string[],
  dates: string[],
  dataMatrix: { [date: string]: { [head: string]: number } }
) => {
  const headers = ['Date', ...heads, 'Total'];
  const colTotals: { [head: string]: number } = {};
  heads.forEach((h) => (colTotals[h] = 0));
  let grandTotal = 0;

  const rows: (string | number)[][] = dates.map((date) => {
    let rowTotal = 0;
    const rowValues = heads.map((head) => {
      const amt = dataMatrix[date]?.[head] || 0;
      rowTotal += amt;
      colTotals[head] = (colTotals[head] || 0) + amt;
      return amt > 0 ? amt : '';
    });
    grandTotal += rowTotal;
    return [date, ...rowValues, rowTotal > 0 ? rowTotal : ''];
  });

  // Total summary row at bottom
  const totalRow: (string | number)[] = [
    'TOTAL',
    ...heads.map((h) => (colTotals[h] > 0 ? colTotals[h] : '')),
    grandTotal,
  ];
  rows.push(totalRow);

  exportToCSV(`Daily_Expenses_${monthStr}`, headers, rows);
};

export const printDocument = () => {
  window.print();
};

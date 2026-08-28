import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from 'react-native-svg';
import {
  FileSpreadsheet,
  Printer,
  Search,
  ChevronDown,
  Layers,
  CreditCard,
  Banknote,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  LineChart,
  PieChart,
  Activity,
  Sliders,
  Calendar,
  Filter,
  DollarSign,
  Droplets,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Award,
  BarChart2,
  CalendarDays,
  Percent,
} from 'lucide-react';
import { useReportsContext } from '../context/ReportsContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatLitres, formatDate, getTodayDateString } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';
import { DatePickerInput } from '../components/DatePickerInput';
import { NoDataView } from '../components/NoDataView';
import { useReportTypes } from '../hooks/useMasters';

type ReportCategory =
  | 'bi_analytics'
  | 'all_parties'
  | 'sale'
  | 'purchase'
  | 'all_transactions'
  | 'cashflow'
  | 'pnl';

type TimeRangeFilter = 'ALL' | '7DAYS' | 'MONTH';

interface GenericLineSeries {
  id: string;
  name: string;
  color: string;
  dashed?: boolean;
  values: number[];
}

interface GenericLineGraphProps {
  title: string;
  subtitle: string;
  labels: string[]; // e.g. ['20-Aug', '21-Aug']
  fullDates?: string[];
  series: GenericLineSeries[];
  isCurrency?: boolean;
  onExportExcel: () => void;
  exportBtnLabel?: string;
  gradientColor?: string;
}

// ── Reusable Interactive SVG Line Graph Component ───────────────────────────
const GenericLineGraph: React.FC<GenericLineGraphProps> = ({
  title,
  subtitle,
  labels,
  fullDates,
  series,
  isCurrency = false,
  onExportExcel,
  exportBtnLabel = 'Export Graph to Excel (.csv)',
  gradientColor = colors.primary,
}) => {
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    series.forEach((s) => (init[s.id] = true));
    return init;
  });

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const svgWidth = 520;
  const svgHeight = 220;
  const paddingX = 42;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  // Max value calculation
  const allValues = series.flatMap((s) => s.values);
  const maxVal = Math.max(...allValues, 10) * 1.15;
  const minVal = Math.min(0, ...allValues);

  const pointsCount = labels.length;
  const getX = (index: number) => {
    if (pointsCount <= 1) return paddingX + chartW / 2;
    return paddingX + (index / (pointsCount - 1)) * chartW;
  };

  const getY = (val: number) => {
    const norm = (val - minVal) / (maxVal - minVal || 1);
    return svgHeight - paddingY - norm * chartH;
  };

  const buildLinePath = (vals: number[]) => {
    if (vals.length === 0) return '';
    return vals.reduce((acc, val, i) => {
      const x = getX(i);
      const y = getY(val);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  const buildAreaPath = (vals: number[]) => {
    if (vals.length === 0) return '';
    const lineP = buildLinePath(vals);
    const lastX = getX(vals.length - 1);
    const firstX = getX(0);
    const bottomY = svgHeight - paddingY;
    return `${lineP} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const toggleSeries = (id: string) => {
    setActiveSeries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const gradId = `areaGrad_${title.replace(/\s+/g, '')}`;

  return (
    <View style={styles.lineChartCard}>
      {/* Header & Controls */}
      <View style={styles.lineChartHeader}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={styles.chartTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.seriesLegendRow}>
          {series.map((s) => {
            const isVisible = activeSeries[s.id] !== false;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.legendToggleBtn, isVisible && styles.legendToggleBtnActive]}
                onPress={() => toggleSeries(s.id)}
              >
                <View style={[styles.legendLineMarker, { backgroundColor: s.color }]} />
                <Text style={[styles.legendToggleText, isVisible && { color: colors.textPrimary, fontWeight: '700' }]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.miniExcelBtn} onPress={onExportExcel}>
            <FileSpreadsheet size={13} color="#16A34A" />
            <Text style={styles.miniExcelBtnText}>Export Excel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SVG Line Canvas */}
      <View style={styles.svgCanvasWrapper}>
        <Svg width="100%" height={230} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={gradientColor} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={gradientColor} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = svgHeight - paddingY - ratio * chartH;
            const val = minVal + ratio * (maxVal - minVal);
            return (
              <G key={ratio}>
                <Line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <SvgText
                  x={paddingX - 6}
                  y={y + 4}
                  fontSize="9"
                  fill="#94A3B8"
                  textAnchor="end"
                  fontFamily={typography.monoFont}
                >
                  {isCurrency ? (val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${Math.round(val)}`) : `${Math.round(val)}`}
                </SvgText>
              </G>
            );
          })}

          {/* Area Fill for First Visible Series */}
          {series.length > 0 && activeSeries[series[0].id] !== false && (
            <Path d={buildAreaPath(series[0].values)} fill={`url(#${gradId})`} />
          )}

          {/* Render Lines */}
          {series.map((s) => {
            if (activeSeries[s.id] === false) return null;
            return (
              <Path
                key={s.id}
                d={buildLinePath(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? '2.5' : '3'}
                strokeDasharray={s.dashed ? '6 3' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Nodes & Labels */}
          {labels.map((lbl, idx) => {
            const x = getX(idx);
            const isSel = selectedIdx === idx;

            return (
              <G key={lbl + idx}>
                {isSel && (
                  <Line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={svgHeight - paddingY}
                    stroke="#0F172A"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {series.map((s) => {
                  if (activeSeries[s.id] === false) return null;
                  const y = getY(s.values[idx] || 0);
                  return (
                    <Circle
                      key={s.id}
                      cx={x}
                      cy={y}
                      r={isSel ? 5.5 : 4}
                      fill="#FFFFFF"
                      stroke={s.color}
                      strokeWidth="2"
                    />
                  );
                })}

                <SvgText
                  x={x}
                  y={svgHeight - 8}
                  fontSize="9"
                  fill={isSel ? '#0F172A' : '#64748B'}
                  fontWeight={isSel ? 'bold' : 'normal'}
                  textAnchor="middle"
                  fontFamily={typography.monoFont}
                >
                  {lbl}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Clickable Hit Areas */}
        <View style={styles.pointSelectorOverlay}>
          {labels.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.pointHitArea}
              onPress={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
            />
          ))}
        </View>

        {/* Selected Data Tooltip */}
        {selectedIdx !== null && (
          <View style={styles.pointTooltipCard}>
            <View style={styles.pointTooltipHeader}>
              <Text style={styles.pointTooltipDate}>
                {fullDates && fullDates[selectedIdx] ? formatDate(fullDates[selectedIdx]) : labels[selectedIdx]}
              </Text>
              <TouchableOpacity onPress={() => setSelectedIdx(null)}>
                <Text style={styles.pointTooltipClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pointTooltipGrid}>
              {series.map((s) => (
                <View key={s.id} style={styles.pointTooltipItem}>
                  <Text style={[styles.pointTooltipVal, { color: s.color }]}>
                    {isCurrency ? formatCurrency(s.values[selectedIdx] || 0) : s.id.includes('litres') || s.name.includes('Litres') ? formatLitres(s.values[selectedIdx] || 0) : formatCurrency(s.values[selectedIdx] || 0)}
                  </Text>
                  <Text style={styles.pointTooltipLabel}>{s.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export const ReportsScreen: React.FC = () => {
  const { shifts, customers, expenses, products, creditTransactions, creditPayments } = useReportsContext();
  const { options: reportTypeOptions } = useReportTypes();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeReport, setActiveReport] = useState<ReportCategory>('bi_analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  const todayStr = getTodayDateString();
  const currentMonthStr = todayStr.substring(0, 7);

  // Time-filtered shifts
  const filteredShifts = useMemo(() => {
    if (selectedDateFilter) {
      return shifts.filter((s) => s.shiftDate === selectedDateFilter);
    }
    if (timeRange === '7DAYS') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return shifts.filter((s) => s.shiftDate >= sevenDaysAgo);
    }
    if (timeRange === 'MONTH') {
      return shifts.filter((s) => s.shiftDate.startsWith(currentMonthStr));
    }
    return shifts;
  }, [shifts, selectedDateFilter, timeRange, currentMonthStr]);

  // Aggregates
  const totalFuelSales = filteredShifts.reduce((sum, s) => sum + s.totalSalesAmount, 0);
  const totalFuelLitres = filteredShifts.reduce((sum, s) => sum + s.totalLitresSold, 0);
  const totalCash = filteredShifts.reduce((sum, s) => sum + s.collections.cash, 0);
  const totalUPI = filteredShifts.reduce((sum, s) => sum + s.collections.upiGpay, 0);
  const totalCard = filteredShifts.reduce((sum, s) => sum + s.collections.card, 0);
  const totalFleetCard = filteredShifts.reduce((sum, s) => sum + s.collections.fleetCard, 0);
  const totalCreditSales = filteredShifts.reduce((sum, s) => sum + s.collections.creditSales, 0);
  const totalExpenses = expenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0);
  const totalReceivable = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalCreditTxAmount = creditTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalCreditTxLitres = creditTransactions.reduce((sum, tx) => sum + tx.litres, 0);

  const totalNonZeroSales = totalFuelSales || 1;
  const estimatedFuelMargin = totalFuelLitres * 3.50;
  const netOperatingProfit = estimatedFuelMargin - totalExpenses;

  // ── 1. Daily Sales Time Series ─────────────────────────────────────────────
  const salesTimeSeries = useMemo(() => {
    const map = new Map<string, { date: string; display: string; msL: number; hsdL: number; totalL: number; rev: number }>();
    const sorted = [...filteredShifts].sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));

    sorted.forEach((s) => {
      const d = s.shiftDate;
      if (!map.has(d)) {
        map.set(d, { date: d, display: d.substring(5), msL: 0, hsdL: 0, totalL: 0, rev: 0 });
      }
      const item = map.get(d)!;
      item.totalL += s.totalLitresSold;
      item.rev += s.totalSalesAmount;
      s.meterReadings.forEach((m) => {
        if (m.fuelCode === 'MS' || m.productName.includes('Petrol')) item.msL += m.litresSold || 0;
        else if (m.fuelCode === 'HSD' || m.productName.includes('Diesel')) item.hsdL += m.litresSold || 0;
      });
    });

    return Array.from(map.values());
  }, [filteredShifts]);

  // ── 2. Daily Expenses Time Series ──────────────────────────────────────────
  const expensesTimeSeries = useMemo(() => {
    const map = new Map<string, { date: string; display: string; amount: number; count: number }>();
    const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach((e) => {
      const d = e.date;
      if (!map.has(d)) {
        map.set(d, { date: d, display: d.substring(5), amount: 0, count: 0 });
      }
      const item = map.get(d)!;
      item.amount += e.isCreditNote ? -e.amount : e.amount;
      item.count += 1;
    });

    return Array.from(map.values());
  }, [expenses]);

  // ── 3. Daily Credit Chits Time Series ──────────────────────────────────────
  const creditTimeSeries = useMemo(() => {
    const map = new Map<string, { date: string; display: string; amount: number; litres: number; count: number }>();
    const sorted = [...creditTransactions].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach((tx) => {
      const d = tx.date;
      if (!map.has(d)) {
        map.set(d, { date: d, display: d.substring(5), amount: 0, litres: 0, count: 0 });
      }
      const item = map.get(d)!;
      item.amount += tx.amount;
      item.litres += tx.litres;
      item.count += 1;
    });

    return Array.from(map.values());
  }, [creditTransactions]);

  // ── 4. Daily Payment Collections Time Series ───────────────────────────────
  const cashflowTimeSeries = useMemo(() => {
    const map = new Map<string, { date: string; display: string; cash: number; upi: number; card: number; credit: number }>();
    const sorted = [...filteredShifts].sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));

    sorted.forEach((s) => {
      const d = s.shiftDate;
      if (!map.has(d)) {
        map.set(d, { date: d, display: d.substring(5), cash: 0, upi: 0, card: 0, credit: 0 });
      }
      const item = map.get(d)!;
      item.cash += s.collections.cash;
      item.upi += s.collections.upiGpay;
      item.card += s.collections.card;
      item.credit += s.collections.creditSales;
    });

    return Array.from(map.values());
  }, [filteredShifts]);

  // ── 5. Daily Profit & Loss Time Series (Net Profit per Day) ────────────────
  const pnlTimeSeries = useMemo(() => {
    const allDates = Array.from(
      new Set([...filteredShifts.map((s) => s.shiftDate), ...expenses.map((e) => e.date)])
    ).sort();

    return allDates.map((d) => {
      const dayShifts = filteredShifts.filter((s) => s.shiftDate === d);
      const dayExpenses = expenses.filter((e) => e.date === d);

      const dayLitres = dayShifts.reduce((sum, s) => sum + s.totalLitresSold, 0);
      const dayRevenue = dayShifts.reduce((sum, s) => sum + s.totalSalesAmount, 0);
      const dayMargin = dayLitres * 3.50;
      const dayExp = dayExpenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0);
      const dayNetProfit = dayMargin - dayExp;

      return {
        date: d,
        display: d.substring(5),
        revenue: dayRevenue,
        dealerMargin: dayMargin,
        expenses: dayExp,
        netProfit: dayNetProfit,
      };
    });
  }, [filteredShifts, expenses]);

  // ── Dedicated Excel Export Handlers for All 5 Registers ───────────────────
  const exportSalesExcel = () => {
    const headers = ['Date', 'MS Petrol (L)', 'HSD Diesel (L)', 'Total Dispensed (L)', 'Gross Revenue (₹)'];
    const rows = salesTimeSeries.map((s) => [s.date, s.msL, s.hsdL, s.totalL, s.rev]);
    exportToCSV(`Daily_Sales_LineGraph_${getTodayDateString()}`, headers, rows);
  };

  const exportExpensesExcel = () => {
    const headers = ['Date', 'Total Expenses (₹)', 'Vouchers Count'];
    const rows = expensesTimeSeries.map((e) => [e.date, e.amount, e.count]);
    exportToCSV(`Daily_Expenses_LineGraph_${getTodayDateString()}`, headers, rows);
  };

  const exportCreditExcel = () => {
    const headers = ['Date', 'Credit Amount (₹)', 'Credit Litres (L)', 'Chits Count'];
    const rows = creditTimeSeries.map((c) => [c.date, c.amount, c.litres, c.count]);
    exportToCSV(`Daily_Credit_LineGraph_${getTodayDateString()}`, headers, rows);
  };

  const exportCashflowExcel = () => {
    const headers = ['Date', 'Cash Collections (₹)', 'UPI / QR (₹)', 'POS Card (₹)', 'Credit Chits (₹)'];
    const rows = cashflowTimeSeries.map((c) => [c.date, c.cash, c.upi, c.card, c.credit]);
    exportToCSV(`Daily_Collections_LineGraph_${getTodayDateString()}`, headers, rows);
  };

  const exportPnLExcel = () => {
    const headers = ['Date', 'Gross Turnover (₹)', 'Dealer Margin @ ₹3.50/L (₹)', 'Expenses (₹)', 'Net Operating Profit (₹)'];
    const rows = pnlTimeSeries.map((p) => [p.date, p.revenue, p.dealerMargin, p.expenses, p.netProfit]);
    exportToCSV(`Daily_NetProfit_PnL_LineGraph_${getTodayDateString()}`, headers, rows);
  };

  // Filtered party list for "all_parties"
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const match =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      return match;
    });
  }, [customers, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const match =
        e.expenseTypeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(searchQuery.toLowerCase()));
      return match;
    });
  }, [expenses, searchQuery]);

  const filteredTransactions = useMemo(() => {
    return creditTransactions.filter((tx) => {
      const match =
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.slipNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.vehicleNo && tx.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()));
      return match;
    });
  }, [creditTransactions, searchQuery]);

  const handlePrint = () => window.print();

  const renderSubSidebar = () => {
    interface ReportItem {
      id: string;
      label: string;
      icon: any;
      badge?: string;
    }

    interface ReportGroup {
      title: string;
      items: ReportItem[];
    }

    const reportGroups: ReportGroup[] = [
      {
        title: 'Executive BI & Dashboards',
        items: [
          { id: 'bi_analytics', label: 'Power BI Multi-Line Dashboard', icon: LineChart, badge: 'PRO BI' },
        ],
      },
      {
        title: 'Party & Ledger Reports',
        items: [
          { id: 'all_parties', label: 'All Parties & Balances', icon: Users },
        ],
      },
      {
        title: 'Transaction Registers (With Line Graphs)',
        items: [
          { id: 'sale', label: '1. Daily Sales Sheet', icon: Layers, badge: 'GRAPH' },
          { id: 'purchase', label: '2. Expenses & Purchases', icon: Receipt, badge: 'GRAPH' },
          { id: 'all_transactions', label: '3. Credit Transactions', icon: CreditCard, badge: 'GRAPH' },
          { id: 'cashflow', label: '4. Payment Modes Split', icon: Banknote, badge: 'GRAPH' },
          { id: 'pnl', label: '5. Daily Profit & Loss', icon: TrendingUp, badge: 'GRAPH' },
        ],
      },
    ];

    return (
      <View style={[styles.subSidebar, isMobile && { width: '100%', maxHeight: 200, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {reportGroups.map((grp) => (
            <View key={grp.title} style={styles.groupContainer}>
              <Text style={styles.groupHeader}>{grp.title}</Text>
              {grp.items.map((item) => {
                const isActive = activeReport === item.id;
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.subNavItem, isActive && styles.subNavItemActive]}
                    onPress={() => {
                      setActiveReport(item.id as ReportCategory);
                      setSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <IconComponent size={15} color={isActive ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.subNavText, isActive && styles.subNavTextActive]}>
                      {item.label}
                    </Text>
                    {item.badge && (
                      <View style={[styles.proBadge, item.badge === 'GRAPH' && { backgroundColor: '#10B981' }]}>
                        <Text style={styles.proBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeReport) {
      // ── 0. EXECUTIVE POWER BI DASHBOARD ────────────────────────────────────
      case 'bi_analytics':
        return (
          <View style={styles.registerPageContainer}>
            <View style={styles.biHeaderRibbon}>
              <View style={{ flex: 1, minWidth: 260 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.biScreenTitle}>Power BI Executive Multi-Line Dashboard</Text>
                  <View style={styles.liveStreamPill}>
                    <Activity size={12} color={colors.success} />
                    <Text style={styles.liveStreamText}>Time Series Active</Text>
                  </View>
                </View>
                 
              </View>
              <TouchableOpacity style={styles.excelExportBtn} onPress={exportSalesExcel}>
                <FileSpreadsheet size={15} color="#16A34A" />
                <Text style={styles.excelExportBtnText}>Export All to Excel (.csv)</Text>
              </TouchableOpacity>
            </View>

            {/* Sales Line Graph */}
            <GenericLineGraph
              title="Daily Fuel Volume Trajectory (Litres)"
              subtitle=""             labels={salesTimeSeries.map((s) => s.display)}
              fullDates={salesTimeSeries.map((s) => s.date)}
              series={[
                { id: 'total', name: 'Total Volume', color: colors.primary, values: salesTimeSeries.map((s) => s.totalL) },
                { id: 'ms', name: 'MS (Petrol)', color: colors.petrol, values: salesTimeSeries.map((s) => s.msL) },
                { id: 'hsd', name: 'HSD (Diesel)', color: colors.diesel, dashed: true, values: salesTimeSeries.map((s) => s.hsdL) },
              ]}
              onExportExcel={exportSalesExcel}
              gradientColor={colors.primary}
            />

            {/* Net Profit Line Graph */}
            <GenericLineGraph
              title="Daily Net Profit & Dealer Commission Trajectory"
              subtitle=""
              labels={pnlTimeSeries.map((p) => p.display)}
              fullDates={pnlTimeSeries.map((p) => p.date)}
              series={[
                { id: 'netprofit', name: 'Net Profit per Day', color: colors.cashGreen, values: pnlTimeSeries.map((p) => p.netProfit) },
                { id: 'margin', name: 'Dealer Commission', color: colors.primary, values: pnlTimeSeries.map((p) => p.dealerMargin) },
                { id: 'expenses', name: 'Expenses Deducted', color: colors.danger, dashed: true, values: pnlTimeSeries.map((p) => p.expenses) },
              ]}
              isCurrency={true}
              onExportExcel={exportPnLExcel}
              gradientColor={colors.cashGreen}
            />
          </View>
        );

      // ── 1. DAILY SALES SHEET (REGISTER 1) ──────────────────────────────────
      case 'sale':
        return (
          <View style={styles.registerPageContainer}>
            {/* Sales Line Graph */}
            <GenericLineGraph
              title="Daily Fuel Sales & Volume Trajectory"
              subtitle=""
              labels={salesTimeSeries.map((s) => s.display)}
              fullDates={salesTimeSeries.map((s) => s.date)}
              series={[
                { id: 'totalL', name: 'Total Litres Sold', color: colors.primary, values: salesTimeSeries.map((s) => s.totalL) },
                { id: 'msL', name: 'MS Petrol (L)', color: colors.petrol, values: salesTimeSeries.map((s) => s.msL) },
                { id: 'hsdL', name: 'HSD Diesel (L)', color: colors.diesel, dashed: true, values: salesTimeSeries.map((s) => s.hsdL) },
              ]}
              onExportExcel={exportSalesExcel}
              gradientColor={colors.primary}
            />

            {/* Sales Register Table */}
            <View style={styles.reportMainCard}>
              <View style={styles.tableActionBar}>
                <Text style={styles.sectionHeading}>Daily Shift Sales Register</Text>
                <View style={styles.actionRight}>
                  <View style={{ minWidth: 160 }}>
                    <DatePickerInput
                      value={selectedDateFilter}
                      onChange={(d) => setSelectedDateFilter(d)}
                      placeholder="Filter by date..."
                      maxDate={getTodayDateString()}
                      allowClear
                      onClear={() => setSelectedDateFilter('')}
                    />
                  </View>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={exportSalesExcel} activeOpacity={0.7}>
                    <FileSpreadsheet size={15} color="#16A34A" />
                    <Text style={styles.actionPillText}>Export Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                    <Printer size={15} color="#3B82F6" />
                    <Text style={styles.actionPillText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tableWrapper}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, { width: 90 }]}>DATE</Text>
                  <Text style={[styles.thText, { width: 100 }]}>SHIFT NO</Text>
                  <Text style={[styles.thText, { width: 80 }]}>PUMP</Text>
                  <Text style={[styles.thText, { flex: 1.5 }]}>OPERATOR</Text>
                  <Text style={[styles.thText, { width: 110, textAlign: 'right' }]}>VOLUME (L)</Text>
                  <Text style={[styles.thText, { width: 130, textAlign: 'right' }]}>GROSS SALES</Text>
                  <Text style={[styles.thText, { width: 90, textAlign: 'right' }]}>STATUS</Text>
                </View>

                {filteredShifts.length === 0 ? (
                  <NoDataView
                    title="No Shifts Recorded"
                    selectedDate={selectedDateFilter || undefined}
                    message={
                      selectedDateFilter
                        ? `No shift records found for ${formatDate(selectedDateFilter)}.`
                        : 'No shift records found.'
                    }
                    onResetDate={selectedDateFilter ? () => setSelectedDateFilter('') : undefined}
                  />
                ) : (
                  <ScrollView style={{ maxHeight: 380 }}>
                    {filteredShifts.map((s) => (
                      <View key={s.id} style={styles.tableRow}>
                        <Text style={[styles.tdText, { width: 90 }]}>{formatDate(s.shiftDate)}</Text>
                        <Text style={[styles.tdTextMono, { width: 100, color: '#3B82F6' }]}>{s.shiftNo}</Text>
                        <Text style={[styles.tdText, { width: 80 }]}>Pump {s.pumpNo}</Text>
                        <Text style={[styles.tdTextBold, { flex: 1.5 }]}>{s.operatorName}</Text>
                        <Text style={[styles.tdTextMono, { width: 110, textAlign: 'right', color: '#0284C7' }]}>
                          {formatLitres(s.totalLitresSold)}
                        </Text>
                        <Text style={[styles.tdTextMono, { width: 130, textAlign: 'right', color: '#16A34A', fontWeight: '700' }]}>
                          {formatCurrency(s.totalSalesAmount)}
                        </Text>
                        <Text style={[styles.tdText, { width: 90, textAlign: 'right', color: '#64748B' }]}>{s.status}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.summaryFooterBar}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Volume Sold:</Text>
                  <Text style={[styles.summaryVal, { color: '#0284C7' }]}>{formatLitres(totalFuelLitres)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Gross Sales:</Text>
                  <Text style={[styles.summaryVal, { color: '#16A34A' }]}>{formatCurrency(totalFuelSales)}</Text>
                </View>
              </View>
            </View>
          </View>
        );

      // ── 2. EXPENSES & PURCHASES (REGISTER 2) ───────────────────────────────
      case 'purchase':
        return (
          <View style={styles.registerPageContainer}>
            {/* Expenses Line Graph */}
            <GenericLineGraph
              title="Daily Expenses Trend Curve (₹)"
              subtitle=""
              labels={expensesTimeSeries.map((e) => e.display)}
              fullDates={expensesTimeSeries.map((e) => e.date)}
              series={[
                { id: 'exp', name: 'Expenses Paid (₹)', color: colors.danger, values: expensesTimeSeries.map((e) => e.amount) },
              ]}
              isCurrency={true}
              onExportExcel={exportExpensesExcel}
              gradientColor={colors.danger}
            />

            {/* Expenses Table */}
            <View style={styles.reportMainCard}>
              <View style={styles.tableActionBar}>
                <Text style={styles.sectionHeading}>Daily Bunk Expenses & Purchases</Text>
                <View style={styles.actionRight}>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={exportExpensesExcel} activeOpacity={0.7}>
                    <FileSpreadsheet size={15} color="#16A34A" />
                    <Text style={styles.actionPillText}>Export Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                    <Printer size={15} color="#3B82F6" />
                    <Text style={styles.actionPillText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.searchRow}>
                <View style={styles.searchFieldWrap}>
                  <Search size={14} color="#64748B" />
                  <TextInput
                    style={styles.tableSearchInput}
                    placeholder="Search expense category, voucher or payee..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>

              <View style={styles.tableWrapper}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, { width: 90 }]}>DATE</Text>
                  <Text style={[styles.thText, { width: 100 }]}>VOUCHER NO</Text>
                  <Text style={[styles.thText, { flex: 1.5 }]}>EXPENSE CATEGORY</Text>
                  <Text style={[styles.thText, { width: 120 }]}>PAID TO</Text>
                  <Text style={[styles.thText, { width: 100 }]}>PAID BY</Text>
                  <Text style={[styles.thText, { width: 120, textAlign: 'right' }]}>AMOUNT</Text>
                </View>

                <ScrollView style={{ maxHeight: 380 }}>
                  {filteredExpenses.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No expense vouchers found.</Text>
                    </View>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <View key={exp.id} style={styles.tableRow}>
                        <Text style={[styles.tdText, { width: 90 }]}>{formatDate(exp.date)}</Text>
                        <Text style={[styles.tdTextMono, { width: 100, color: '#3B82F6' }]}>{exp.voucherNo}</Text>
                        <Text style={[styles.tdTextBold, { flex: 1.5 }]}>{exp.expenseTypeName}</Text>
                        <Text style={[styles.tdText, { width: 120, color: '#64748B' }]}>{exp.paidTo || '-'}</Text>
                        <Text style={[styles.tdText, { width: 100, color: '#64748B' }]}>{exp.paidBy || '-'}</Text>
                        <Text style={[styles.tdTextMono, { width: 120, textAlign: 'right', color: '#EF4444', fontWeight: '700' }]}>
                          {formatCurrency(exp.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>

              <View style={styles.summaryFooterBar}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Vouchers:</Text>
                  <Text style={[styles.summaryVal, { color: '#64748B' }]}>{expenses.length}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Expenses:</Text>
                  <Text style={[styles.summaryVal, { color: '#EF4444' }]}>{formatCurrency(totalExpenses)}</Text>
                </View>
              </View>
            </View>
          </View>
        );

      // ── 3. CREDIT TRANSACTIONS (REGISTER 3) ─────────────────────────────────
      case 'all_transactions':
        return (
          <View style={styles.registerPageContainer}>
            {/* Credit Line Graph */}
            <GenericLineGraph
              title="Daily Credit Sales & Chits Curve"
              subtitle=""              labels={creditTimeSeries.map((c) => c.display)}
              fullDates={creditTimeSeries.map((c) => c.date)}
              series={[
                { id: 'creditAmt', name: 'Credit Amount (₹)', color: colors.creditOrange, values: creditTimeSeries.map((c) => c.amount) },
                { id: 'creditLitres', name: 'Credit Litres (L)', color: colors.accent, dashed: true, values: creditTimeSeries.map((c) => c.litres) },
              ]}
              isCurrency={true}
              onExportExcel={exportCreditExcel}
              gradientColor={colors.creditOrange}
            />

            {/* Credit Transactions Table */}
            <View style={styles.reportMainCard}>
              <View style={styles.tableActionBar}>
                <Text style={styles.sectionHeading}>Credit Sale Chits & Transactions</Text>
                <View style={styles.actionRight}>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={exportCreditExcel} activeOpacity={0.7}>
                    <FileSpreadsheet size={15} color="#16A34A" />
                    <Text style={styles.actionPillText}>Export Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                    <Printer size={15} color="#3B82F6" />
                    <Text style={styles.actionPillText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.searchRow}>
                <View style={styles.searchFieldWrap}>
                  <Search size={14} color="#64748B" />
                  <TextInput
                    style={styles.tableSearchInput}
                    placeholder="Search by customer, slip no, vehicle or fuel..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>

              <View style={styles.tableWrapper}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, { width: 85 }]}>DATE</Text>
                  <Text style={[styles.thText, { width: 95 }]}>SLIP NO</Text>
                  <Text style={[styles.thText, { flex: 1.5 }]}>CUSTOMER</Text>
                  <Text style={[styles.thText, { width: 100 }]}>VEHICLE</Text>
                  <Text style={[styles.thText, { width: 80 }]}>PRODUCT</Text>
                  <Text style={[styles.thText, { width: 80, textAlign: 'right' }]}>LITRES</Text>
                  <Text style={[styles.thText, { width: 110, textAlign: 'right' }]}>AMOUNT</Text>
                </View>

                <ScrollView style={{ maxHeight: 380 }}>
                  {filteredTransactions.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No credit transactions found.</Text>
                    </View>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <View key={tx.id} style={styles.tableRow}>
                        <Text style={[styles.tdText, { width: 85 }]}>{formatDate(tx.date)}</Text>
                        <Text style={[styles.tdTextMono, { width: 95, color: '#3B82F6' }]}>{tx.slipNo}</Text>
                        <Text style={[styles.tdTextBold, { flex: 1.5 }]}>{tx.customerName}</Text>
                        <Text style={[styles.tdTextMono, { width: 100, color: '#64748B' }]}>{tx.vehicleNo || '-'}</Text>
                        <Text style={[styles.tdText, { width: 80 }]}>{tx.productName}</Text>
                        <Text style={[styles.tdTextMono, { width: 80, textAlign: 'right', color: '#0284C7' }]}>
                          {formatLitres(tx.litres)}
                        </Text>
                        <Text style={[styles.tdTextMono, { width: 110, textAlign: 'right', color: '#EA580C', fontWeight: '700' }]}>
                          {formatCurrency(tx.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>

              <View style={styles.summaryFooterBar}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Credit Litres:</Text>
                  <Text style={[styles.summaryVal, { color: '#0284C7' }]}>{formatLitres(totalCreditTxLitres)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Credit Amount:</Text>
                  <Text style={[styles.summaryVal, { color: '#EA580C' }]}>{formatCurrency(totalCreditTxAmount)}</Text>
                </View>
              </View>
            </View>
          </View>
        );

      // ── 4. PAYMENT MODES SPLIT (REGISTER 4) ────────────────────────────────
      case 'cashflow':
        return (
          <View style={styles.registerPageContainer}>
            {/* Multi-Channel Line Graph */}
            <GenericLineGraph
              title="Daily Multi-Channel Settlement Trajectory"
              subtitle=""
              labels={cashflowTimeSeries.map((c) => c.display)}
              fullDates={cashflowTimeSeries.map((c) => c.date)}
              series={[
                { id: 'cash', name: 'Cash Collections', color: colors.cashGreen, values: cashflowTimeSeries.map((c) => c.cash) },
                { id: 'upi', name: 'UPI / QR', color: colors.upiPurple, values: cashflowTimeSeries.map((c) => c.upi) },
                { id: 'card', name: 'POS Cards', color: colors.cardBlue, values: cashflowTimeSeries.map((c) => c.card) },
                { id: 'credit', name: 'Credit Chits', color: colors.creditOrange, dashed: true, values: cashflowTimeSeries.map((c) => c.credit) },
              ]}
              isCurrency={true}
              onExportExcel={exportCashflowExcel}
              gradientColor={colors.upiPurple}
            />

            {/* Mode Cards Summary */}
            <View style={styles.reportMainCard}>
              <View style={styles.tableActionBar}>
                <Text style={styles.sectionHeading}>Payment Collections Summary</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={exportCashflowExcel}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Export Excel</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modesSummaryGrid}>
                <View style={[styles.modeCard, { borderLeftColor: '#16A34A' }]}>
                  <Text style={styles.modeCardLabel}>PHYSICAL CASH</Text>
                  <Text style={styles.modeCardVal}>{formatCurrency(totalCash)}</Text>
                  <Text style={styles.modeCardPct}>{Math.round((totalCash / totalNonZeroSales) * 100)}% of total sales</Text>
                </View>

                <View style={[styles.modeCard, { borderLeftColor: '#7C3AED' }]}>
                  <Text style={styles.modeCardLabel}>UPI / QR</Text>
                  <Text style={styles.modeCardVal}>{formatCurrency(totalUPI)}</Text>
                  <Text style={styles.modeCardPct}>{Math.round((totalUPI / totalNonZeroSales) * 100)}% of total sales</Text>
                </View>

                <View style={[styles.modeCard, { borderLeftColor: '#3B82F6' }]}>
                  <Text style={styles.modeCardLabel}>POS CARDS</Text>
                  <Text style={styles.modeCardVal}>{formatCurrency(totalCard)}</Text>
                  <Text style={styles.modeCardPct}>{Math.round((totalCard / totalNonZeroSales) * 100)}% of total sales</Text>
                </View>

                <View style={[styles.modeCard, { borderLeftColor: '#EA580C' }]}>
                  <Text style={styles.modeCardLabel}>CREDIT CHITS</Text>
                  <Text style={styles.modeCardVal}>{formatCurrency(totalCreditSales)}</Text>
                  <Text style={styles.modeCardPct}>{Math.round((totalCreditSales / totalNonZeroSales) * 100)}% of total sales</Text>
                </View>
              </View>
            </View>
          </View>
        );

      // ── 5. PROFIT & LOSS / NET PROFIT (REGISTER 5) ─────────────────────────
      case 'pnl':
        return (
          <View style={styles.registerPageContainer}>
            {/* Daily Net Profit Line Graph */}
            <GenericLineGraph
              title="Daily Net Operating Profit & Dealer Commission Trajectory"
              subtitle=""
              labels={pnlTimeSeries.map((p) => p.display)}
              fullDates={pnlTimeSeries.map((p) => p.date)}
              series={[
                { id: 'netprofit', name: 'Net Profit per Day (₹)', color: colors.cashGreen, values: pnlTimeSeries.map((p) => p.netProfit) },
                { id: 'margin', name: 'Dealer Commission (₹)', color: colors.primary, values: pnlTimeSeries.map((p) => p.dealerMargin) },
                { id: 'expenses', name: 'Expenses (₹)', color: colors.danger, dashed: true, values: pnlTimeSeries.map((p) => p.expenses) },
              ]}
              isCurrency={true}
              onExportExcel={exportPnLExcel}
              gradientColor={colors.cashGreen}
            />

            {/* P&L Statement Table */}
            <View style={styles.reportMainCard}>
              <View style={styles.tableActionBar}>
                <Text style={styles.sectionHeading}>Station Operating Profit & Loss Statement</Text>
                <View style={styles.actionRight}>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={exportPnLExcel} activeOpacity={0.7}>
                    <FileSpreadsheet size={15} color="#16A34A" />
                    <Text style={styles.actionPillText}>Export Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                    <Printer size={15} color="#3B82F6" />
                    <Text style={styles.actionPillText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.pnlTable}>
                <View style={styles.pnlRow}>
                  <Text style={styles.pnlLabelBold}>GROSS FUEL TURNOVER</Text>
                  <Text style={[styles.pnlValBold, { color: '#16A34A' }]}>{formatCurrency(totalFuelSales)}</Text>
                </View>
                <View style={styles.pnlRowSub}>
                  <Text style={styles.pnlLabelSub}>Total Dispensed Volume</Text>
                  <Text style={styles.pnlValSub}>{formatLitres(totalFuelLitres)}</Text>
                </View>

                <View style={styles.pnlDivider} />

                <View style={styles.pnlRow}>
                  <Text style={styles.pnlLabelBold}>ESTIMATED DEALER COMMISSION (@ ₹3.50/L)</Text>
                  <Text style={[styles.pnlValBold, { color: '#3B82F6' }]}>{formatCurrency(estimatedFuelMargin)}</Text>
                </View>

                <View style={styles.pnlDivider} />

                <View style={styles.pnlRow}>
                  <Text style={styles.pnlLabelBold}>LESS: TOTAL OPERATING EXPENSES</Text>
                  <Text style={[styles.pnlValBold, { color: '#EF4444' }]}>-{formatCurrency(totalExpenses)}</Text>
                </View>

                <View style={styles.pnlDividerThick} />

                <View style={styles.pnlRowTotal}>
                  <Text style={styles.pnlTotalLabel}>NET ESTIMATED OPERATING PROFIT</Text>
                  <Text style={[styles.pnlTotalVal, { color: netOperatingProfit >= 0 ? '#16A34A' : '#EF4444' }]}>
                    {formatCurrency(netOperatingProfit)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      // ── ALL PARTIES ────────────────────────────────────────────────────────
      case 'all_parties':
        return (
          <View style={styles.reportMainCard}>
            <View style={styles.tableActionBar}>
              <View style={styles.filterLeft}>
                <View style={styles.dropdownButton}>
                  <Text style={styles.dropdownText}>All Parties ({customers.length})</Text>
                  <ChevronDown size={14} color="#64748B" />
                </View>
              </View>

              <View style={styles.actionRight}>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Excel Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                  <Printer size={15} color="#3B82F6" />
                  <Text style={styles.actionPillText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchFieldWrap}>
                <Search size={14} color="#64748B" />
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search party by name, code or phone..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.tableWrapper}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { width: 50 }]}>S.NO</Text>
                <Text style={[styles.thText, { flex: 1.5 }]}>PARTY NAME</Text>
                <Text style={[styles.thText, { width: 100 }]}>CODE</Text>
                <Text style={[styles.thText, { width: 120 }]}>PHONE</Text>
                <Text style={[styles.thText, { width: 150, textAlign: 'right' }]}>RECEIVABLE BAL</Text>
                <Text style={[styles.thText, { width: 130, textAlign: 'right' }]}>CREDIT LIMIT</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {filteredCustomers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No parties found matching "{searchQuery}".</Text>
                  </View>
                ) : (
                  filteredCustomers.map((cust, index) => (
                    <View key={cust.id} style={styles.tableRow}>
                      <Text style={[styles.tdTextMuted, { width: 50 }]}>{index + 1}</Text>
                      <Text style={[styles.tdTextBold, { flex: 1.5 }]}>{cust.name}</Text>
                      <Text style={[styles.tdTextMono, { width: 100, color: '#3B82F6' }]}>{cust.code}</Text>
                      <Text style={[styles.tdText, { width: 120, color: '#64748B' }]}>{cust.phone || '-'}</Text>
                      <Text style={[styles.tdTextMono, { width: 150, textAlign: 'right', color: cust.outstandingBalance > 0 ? '#EA580C' : '#16A34A', fontWeight: '700' }]}>
                        {formatCurrency(cust.outstandingBalance)}
                      </Text>
                      <Text style={[styles.tdTextMono, { width: 130, textAlign: 'right', color: '#64748B' }]}>
                        {formatCurrency(cust.creditLimit)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={styles.summaryFooterBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Receivable:</Text>
                <Text style={[styles.summaryVal, { color: '#EA580C' }]}>{formatCurrency(totalReceivable)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Credit Limit:</Text>
                <Text style={[styles.summaryVal, { color: '#3B82F6' }]}>{formatCurrency(totalCreditLimit)}</Text>
              </View>
            </View>
          </View>
        );
    }
  };

  const handleExportExcel = () => {
    const headers = ['S.NO', 'PARTY NAME', 'CODE', 'PHONE', 'RECEIVABLE BALANCE (₹)', 'CREDIT LIMIT (₹)', 'UTILIZATION %'];
    const rows = filteredCustomers.map((c, i) => [
      i + 1,
      c.name,
      c.code,
      c.phone || '-',
      c.outstandingBalance,
      c.creditLimit,
      `${Math.round((c.outstandingBalance / (c.creditLimit || 1)) * 100)}%`,
    ]);
    exportToCSV(`Party_Ledger_Report_${getTodayDateString()}`, headers, rows);
  };

  return (
    <View style={[styles.container, isMobile && { flexDirection: 'column' }]}>
      {renderSubSidebar()}
      <View style={styles.contentArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  subSidebar: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  subNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 2,
  },
  subNavItemActive: {
    backgroundColor: '#2563EB15',
  },
  subNavText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  subNavTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  proBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  registerPageContainer: {
    gap: 16,
  },

  // ── Executive Header Ribbon ────────────────────────────────────────────────
  biHeaderRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  biScreenTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  biScreenSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  liveStreamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98118',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveStreamText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  excelExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  excelExportBtnText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Reusable Line Chart Card Styles ────────────────────────────────────────
  lineChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  lineChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  chartTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  chartSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  seriesLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  legendToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  legendLineMarker: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendToggleText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  miniExcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A15',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  miniExcelBtnText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },

  // ── SVG Canvas & Tooltip ───────────────────────────────────────────────────
  svgCanvasWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 8,
    paddingBottom: 4,
    position: 'relative',
  },
  pointSelectorOverlay: {
    position: 'absolute',
    top: 25,
    left: 42,
    right: 42,
    bottom: 25,
    flexDirection: 'row',
  },
  pointHitArea: {
    flex: 1,
    height: '100%',
  },
  pointTooltipCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pointTooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  pointTooltipDate: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  pointTooltipClose: {
    color: '#94A3B8',
    fontSize: 12,
    paddingHorizontal: 4,
  },
  pointTooltipGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  pointTooltipItem: {
    flex: 1,
  },
  pointTooltipVal: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  pointTooltipLabel: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 1,
  },

  // ── Standard Report Styles ─────────────────────────────────────────────────
  reportMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  dropdownText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  actionRight: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  actionPillText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  searchRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  tableSearchInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  tableWrapper: {
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdText: {
    color: '#0F172A',
    fontSize: 11,
  },
  tdTextMuted: {
    color: '#94A3B8',
    fontSize: 11,
  },
  tdTextBold: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  tdTextMono: {
    fontSize: 11,
    fontFamily: typography.monoFont,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  summaryFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  summaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
  },
  modesSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
  },
  modeCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 12,
    gap: 4,
  },
  modeCardLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  modeCardVal: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  modeCardPct: {
    color: '#94A3B8',
    fontSize: 10,
  },
  pnlTable: {
    padding: 16,
    gap: 10,
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnlRowSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 10,
  },
  pnlLabelBold: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  pnlValBold: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  pnlLabelSub: {
    color: '#64748B',
    fontSize: 11,
  },
  pnlValSub: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: typography.monoFont,
  },
  pnlDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  pnlDividerThick: {
    height: 2,
    backgroundColor: '#CBD5E1',
    marginVertical: 6,
  },
  pnlRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
  },
  pnlTotalLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  pnlTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
});

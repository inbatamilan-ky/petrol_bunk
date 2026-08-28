import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  Gauge,
  Fuel,
  Calculator,
  FileSpreadsheet,
  Printer,
  Droplets,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Filter,
  Zap,
  IndianRupee,
} from 'lucide-react';
import { useTankDipContext } from '../context/TankDipContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatLitres, formatDate, getTodayDateString } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';
import { DatePickerInput } from '../components/DatePickerInput';
import { NoDataView } from '../components/NoDataView';
import { useDipTypes, useTankStatuses } from '../hooks/useMasters';

export const TankDipScreen: React.FC = () => {
  const { products, pumps, shifts, role, dailyNozzleMeters, saveBatchNozzleMeters } = useTankDipContext();

  const { options: dipTypeOptions } = useDipTypes();
  const { options: tankStatusOptions, items: tankStatusItems } = useTankStatuses();

  const [selectedPumpFilter, setSelectedPumpFilter] = useState<string>('ALL');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Full-Day Nozzle Readings State (Starting morning value & ending closing value per nozzle)
  const [dailyNozzleReadings, setDailyNozzleReadings] = useState<
    Record<
      string,
      {
        startingMeter: string;
        endingMeter: string;
        testingLitres: string;
      }
    >
  >({});

  // Helper to get or compute default starting/ending readings for a nozzle
  const getNozzleReadingValues = (noz: (typeof pumps)[0]['nozzles'][0]) => {
    if (dailyNozzleReadings[noz.id]) {
      return dailyNozzleReadings[noz.id];
    }
    
    // Check if reading exists in database
    const dbReading = dailyNozzleMeters.find(
      (m) => m.nozzleId === noz.id && m.readingDate === selectedDate
    );
    if (dbReading) {
      return {
        startingMeter: String(dbReading.openingMeter),
        endingMeter: String(dbReading.closingMeter),
        testingLitres: String(dbReading.testingLitres),
      };
    }

    const todayShifts = shifts.filter((s) => s.shiftDate === selectedDate);
    const shiftEntries = todayShifts
      .flatMap((s) => s.meterReadings)
      .filter((r) => r.nozzleId === noz.id);

    let start = noz.currentMeterReading;
    let end = noz.currentMeterReading;
    let testing = 0;

    if (shiftEntries.length > 0) {
      start = shiftEntries[shiftEntries.length - 1].openingReading;
      end = shiftEntries[0].closingReading ?? shiftEntries[0].openingReading;
      testing = shiftEntries.reduce((sum, r) => sum + (r.testingLitres || 0), 0);
    } else {
      start = Math.max(0, noz.currentMeterReading - 280);
      end = noz.currentMeterReading;
    }

    return {
      startingMeter: String(start),
      endingMeter: String(end),
      testingLitres: String(testing),
    };
  };

  const updateNozzleReading = (
    nozzleId: string,
    field: 'startingMeter' | 'endingMeter' | 'testingLitres',
    val: string,
    defaultVals: { startingMeter: string; endingMeter: string; testingLitres: string }
  ) => {
    setDailyNozzleReadings((prev) => {
      const existing = prev[nozzleId] || defaultVals;
      return {
        ...prev,
        [nozzleId]: {
          ...existing,
          [field]: val,
        },
      };
    });
  };

  // Aggregates & Product Breakdown
  const {
    stationTotalLitres,
    stationTotalAmount,
    stationTotalTesting,
    productBreakdown,
    totalNozzlesCount,
  } = useMemo(() => {
    let totLitres = 0;
    let totAmount = 0;
    let totTest = 0;
    let nozCount = 0;

    const prodMap = new Map<string, { name: string; code: string; color: string; litres: number; amount: number }>();
    products.forEach((p) => {
      prodMap.set(p.id, { name: p.name, code: p.code, color: p.color, litres: 0, amount: 0 });
    });

    pumps.forEach((pump) => {
      pump.nozzles.forEach((noz) => {
        nozCount += 1;
        const p = products.find((prodItem) => prodItem.id === noz.productId);
        const rate = p?.currentRate || 94.5;
        const vals = getNozzleReadingValues(noz);
        const start = parseFloat(vals.startingMeter) || 0;
        const end = parseFloat(vals.endingMeter) || 0;
        const test = parseFloat(vals.testingLitres) || 0;
        const sold = Math.max(0, end - start - test);
        const gross = sold * rate;

        totLitres += sold;
        totAmount += gross;
        totTest += test;

        if (p && prodMap.has(p.id)) {
          const entry = prodMap.get(p.id)!;
          entry.litres += sold;
          entry.amount += gross;
        }
      });
    });

    return {
      stationTotalLitres: totLitres,
      stationTotalAmount: totAmount,
      stationTotalTesting: totTest,
      productBreakdown: Array.from(prodMap.values()).filter((item) => item.litres > 0 || item.amount > 0),
      totalNozzlesCount: nozCount,
    };
  }, [pumps, products, dailyNozzleReadings, shifts, selectedDate]);

  // Filtered Pumps based on filter
  const filteredPumps = useMemo(() => {
    return pumps.filter((pump) => {
      if (selectedPumpFilter !== 'ALL' && String(pump.pumpNo) !== selectedPumpFilter) {
        return false;
      }
      if (selectedProductFilter !== 'ALL') {
        const hasProduct = pump.nozzles.some((noz) => {
          const prod = products.find((p) => p.id === noz.productId);
          return prod?.code === selectedProductFilter;
        });
        if (!hasProduct) return false;
      }
      return true;
    });
  }, [pumps, products, selectedPumpFilter, selectedProductFilter]);

  // Export to Excel
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Pump',
      'Nozzle Number',
      'Product Name',
      'Fuel Code',
      'Morning Starting Meter (L)',
      'Evening Ending Meter (L)',
      'Quality Testing Deducted (L)',
      'Net Litres Sold (L)',
      'Selling Rate (₹/L)',
      'Gross Sales Amount (₹)',
    ];

    const nozzleRows: any[] = [];
    pumps.forEach((pump) => {
      pump.nozzles.forEach((noz) => {
        const p = products.find((prodItem) => prodItem.id === noz.productId);
        const rate = p?.currentRate || 94.5;
        const vals = getNozzleReadingValues(noz);
        const start = parseFloat(vals.startingMeter) || 0;
        const end = parseFloat(vals.endingMeter) || 0;
        const test = parseFloat(vals.testingLitres) || 0;
        const sold = Math.max(0, end - start - test);
        const amt = sold * rate;

        nozzleRows.push([
          selectedDate,
          `Pump ${pump.pumpNo}`,
          `Nozzle ${noz.nozzleNo}`,
          noz.productName,
          noz.fuelCode,
          String(Math.round(start)),
          String(Math.round(end)),
          String(Math.round(test)),
          String(Math.round(sold)),
          `₹${Math.round(rate)}`,
          `₹${Math.round(amt)}`,
        ]);
      });
    });

    exportToCSV(`Nozzle_Totalizers_Meter_Log_${selectedDate}`, headers, nozzleRows);
  };

  const handleSaveToDatabase = async () => {
    try {
      setIsSaving(true);
      const readingsToSave: Array<{
        nozzleId: string;
        pumpId: string;
        productId: string;
        openingMeter: number;
        closingMeter: number;
        testingLitres: number;
        sellingRate: number;
      }> = [];

      pumps.forEach((pump) => {
        pump.nozzles.forEach((noz) => {
          const p = products.find((prodItem) => prodItem.id === noz.productId);
          const rate = p?.currentRate || 94.5;
          const vals = getNozzleReadingValues(noz);
          readingsToSave.push({
            nozzleId: noz.id,
            pumpId: pump.id,
            productId: noz.productId,
            openingMeter: parseFloat(vals.startingMeter) || 0,
            closingMeter: parseFloat(vals.endingMeter) || 0,
            testingLitres: parseFloat(vals.testingLitres) || 0,
            sellingRate: rate,
          });
        });
      });

      await saveBatchNozzleMeters(readingsToSave, selectedDate);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      alert(`Error saving meter readings to database: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.screenTitle}>Daily Nozzle Meter Readings</Text>
          </View>
           
        </View>

        {/* Top Actions */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={[
              styles.actionPillBtn,
              { backgroundColor: savedSuccess ? colors.success + '20' : colors.primary, borderColor: colors.primary },
            ]}
            onPress={handleSaveToDatabase}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <CheckCircle2 size={15} color={savedSuccess ? colors.success : '#FFFFFF'} />
            <Text style={[styles.actionPillText, { color: savedSuccess ? colors.success : '#FFFFFF', fontWeight: '700' }]}>
              {isSaving ? 'Saving...' : savedSuccess ? 'Saved..!' : 'Save Readings'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.8}>
            <Printer size={15} color={colors.textPrimary} />
            <Text style={styles.actionPillText}>Print Log</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} activeOpacity={0.8}>
            <FileSpreadsheet size={15} color="#16A34A" />
            <Text style={styles.exportBtnText}>Export Excel Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Executive Meter KPI Summary Matrix (4 High-Impact Cards) ────────── */}
      <View style={styles.kpiGrid}>
        {/* Card 1: Total Volume Dispensed */}
        <View style={[styles.kpiCard, { borderLeftColor: colors.primary }]}>
          <View style={styles.kpiCardTop}>
            <Text style={styles.kpiLabel}>TOTAL DISPENSED VOLUME</Text>
            <Droplets size={16} color={colors.primary} />
          </View>
          <Text style={styles.kpiValue}>{formatLitres(stationTotalLitres)}</Text>
        </View>

        {/* Card 2: Total Gross Fuel Revenue */}
        <View style={[styles.kpiCard, { borderLeftColor: colors.cashGreen }]}>
          <View style={styles.kpiCardTop}>
            <Text style={styles.kpiLabel}>TOTAL GROSS FUEL TURNOVER</Text>
            <IndianRupee size={16} color={colors.cashGreen} />
          </View>
          <Text style={[styles.kpiValue, { color: colors.cashGreen }]}>{formatCurrency(stationTotalAmount)}</Text>
        </View>

        {/* Card 3: Quality Testing Litres */}
        <View style={[styles.kpiCard, { borderLeftColor: colors.warning }]}>
          <View style={styles.kpiCardTop}>
            <Text style={styles.kpiLabel}>QUALITY TESTING DEDUCTED</Text>
            <Fuel size={16} color={colors.warning} />
          </View>
          <Text style={[styles.kpiValue, { color: colors.warning }]}>{formatLitres(stationTotalTesting)}</Text>
        </View>

        {/* Card 4: Active Pumps */}
        <View style={[styles.kpiCard, { borderLeftColor: colors.upiPurple }]}>
          <View style={styles.kpiCardTop}>
            <Text style={styles.kpiLabel}>PUMP STATION</Text>
            <Gauge size={16} color={colors.upiPurple} />
          </View>
          <Text style={[styles.kpiValue, { color: colors.upiPurple }]}>{pumps.length} Pump Station</Text>
        </View>
      </View>

      {/* ── Product-wise Fuel Dispensed Ribbon ─────────────────────────────── */}
      <View style={styles.productMixCard}>
        <View style={styles.productMixHeader}>
          <Text style={styles.productMixTitle}>Product-Wise Fuel Dispensed Summary</Text>
          <View style={{ minWidth: 170 }}>
            <DatePickerInput
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              maxDate={getTodayDateString()}
            />
          </View>
        </View>

        {productBreakdown.length === 0 ? (
          <NoDataView
            title="No Meter Readings Found"
            selectedDate={selectedDate}
            message={`No fuel nozzle sales or readings recorded for ${formatDate(selectedDate)}.`}
            onResetDate={() => setSelectedDate(getTodayDateString())}
          />
        ) : (
          <View style={styles.productChipsRow}>
            {productBreakdown.map((item) => (
              <View key={item.code} style={[styles.productChip, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.prodDot, { backgroundColor: item.color }]} />
                  <Text style={styles.prodNameText}>{item.name}</Text>
                </View>
                <View style={styles.prodStatsCol}>
                  <Text style={styles.prodLitresVal}>{formatLitres(item.litres)}</Text>
                  <Text style={styles.prodAmtVal}>{formatCurrency(item.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <View style={styles.filterBar}>
        {/* Pump Filter Pills */}
        <View style={styles.filterPillsGroup}>
          <Text style={styles.filterLabel}>PUMP:</Text>
          <TouchableOpacity
            style={[styles.filterPill, selectedPumpFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setSelectedPumpFilter('ALL')}
          >
            <Text style={[styles.filterPillText, selectedPumpFilter === 'ALL' && styles.filterPillTextActive]}>
              All Pumps
            </Text>
          </TouchableOpacity>

          {pumps.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.filterPill, selectedPumpFilter === String(p.pumpNo) && styles.filterPillActive]}
              onPress={() => setSelectedPumpFilter(String(p.pumpNo))}
            >
              <Text style={[styles.filterPillText, selectedPumpFilter === String(p.pumpNo) && styles.filterPillTextActive]}>
                Pump {p.pumpNo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Product Filter Pills */}
        <View style={styles.filterPillsGroup}>
          <Text style={styles.filterLabel}>FUEL:</Text>
          {/* {['ALL', 'MS', 'HSD'].map((f) => ( */}
          {['ALL'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, selectedProductFilter === f && styles.filterPillActive]}
              onPress={() => setSelectedProductFilter(f)}
            >
              <Text style={[styles.filterPillText, selectedProductFilter === f && styles.filterPillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Pumps & Nozzle Totalizers Grid ─────────────────────────── */}
      <View style={styles.pumpsContainer}>
        {filteredPumps.map((pump) => {
          let pumpTotalLitres = 0;
          let pumpTotalAmount = 0;
          let pumpTotalTest = 0;

          return (
            <View key={pump.id} style={styles.pumpCard}>
              {/* Pump Header */}
              <View style={styles.pumpCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.pumpBadgeIcon}>
                    <Gauge size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.pumpCardTitle}>Pump {pump.pumpNo}</Text>
                    <Text style={styles.pumpCardSub}>{pump.nozzles.length} Electronic Nozzle</Text>
                  </View>
                </View>

              </View>

              {/* Nozzles Table Container */}
              <View style={styles.nozzlesTableWrapper}>
                <View style={styles.nozzlesTableHeader}>
                  <Text style={[styles.nozzleColHead, { width: 140 }]}>NOZZLE & FUEL</Text>
                  <Text style={[styles.nozzleColHead, { flex: 1.2, minWidth: 120 }]}>MORNING OPENING (L)</Text>
                  <Text style={[styles.nozzleColHead, { flex: 1.2, minWidth: 120 }]}>EVENING CLOSING (L)</Text>
                  <Text style={[styles.nozzleColHead, { width: 90, textAlign: 'center' }]}>TEST (L)</Text>
                  <Text style={[styles.nozzleColHead, { width: 110, textAlign: 'right' }]}>DISPENSED (L)</Text>
                  <Text style={[styles.nozzleColHead, { width: 120, textAlign: 'right' }]}>GROSS SALES</Text>
                </View>

                {pump.nozzles.map((noz) => {
                  const p = products.find((prodItem) => prodItem.id === noz.productId);
                  const rate = p?.currentRate || 94.5;
                  const vals = getNozzleReadingValues(noz);
                  const startNum = parseFloat(vals.startingMeter) || 0;
                  const endNum = parseFloat(vals.endingMeter) || 0;
                  const testNum = parseFloat(vals.testingLitres) || 0;
                  const sold = Math.max(0, endNum - startNum - testNum);
                  const gross = sold * rate;

                  const isNozInactive = pump.status === 'INACTIVE' || pump.status === 'MAINTENANCE' || p?.active === false;

                  pumpTotalLitres += sold;
                  pumpTotalAmount += gross;
                  pumpTotalTest += testNum;

                  return (
                    <View key={noz.id} style={[styles.nozzleTableRow, isNozInactive && { opacity: 0.7, backgroundColor: '#FEF2F2' }]}>
                      {/* Nozzle Badge & Fuel Tag */}
                      <View style={{ width: 140 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.fuelDot, { backgroundColor: noz.color || colors.primary }]} />
                          <Text style={styles.nozzleNumberText}>Noz {noz.nozzleNo}</Text>
                          <View style={[styles.fuelPill, { backgroundColor: (noz.color || colors.primary) + '18' }]}>
                            <Text style={[styles.fuelPillText, { color: noz.color || colors.primary }]}>
                              {noz.fuelCode}
                            </Text>
                          </View>
                          {isNozInactive && (
                            <View style={{ backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderWidth: 1, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ fontSize: 8, fontWeight: '800', color: '#475569' }}>INACTIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.nozzleProdSub} numberOfLines={1}>
                          {noz.productName} • ₹{Math.round(rate)}/L
                        </Text>
                      </View>

                      {/* Starting Morning Value Input */}
                      <View style={{ flex: 1.2, minWidth: 120 }}>
                        <TextInput
                          style={[styles.meterInput, isNozInactive && { backgroundColor: '#F1F5F9', color: '#94A3B8', borderColor: '#E2E8F0' }]}
                          value={vals.startingMeter}
                          editable={!isNozInactive}
                          onChangeText={(v) => updateNozzleReading(noz.id, 'startingMeter', v, vals)}
                          keyboardType="numeric"
                          placeholder="0.00"
                        />
                      </View>

                      {/* Ending Closing Value Input */}
                      <View style={{ flex: 1.2, minWidth: 120 }}>
                        <TextInput
                          style={[
                            styles.meterInput,
                            { borderColor: isNozInactive ? '#E2E8F0' : colors.primary, borderWidth: 1.5 },
                            isNozInactive && { backgroundColor: '#F1F5F9', color: '#94A3B8' },
                          ]}
                          value={vals.endingMeter}
                          editable={!isNozInactive}
                          onChangeText={(v) => updateNozzleReading(noz.id, 'endingMeter', v, vals)}
                          keyboardType="numeric"
                          placeholder="0.00"
                        />
                      </View>

                      {/* Quality Testing Litres */}
                      <View style={{ width: 90 }}>
                        <TextInput
                          style={[
                            styles.meterInput,
                            { textAlign: 'center' },
                            isNozInactive && { backgroundColor: '#F1F5F9', color: '#94A3B8', borderColor: '#E2E8F0' },
                          ]}
                          value={vals.testingLitres}
                          editable={!isNozInactive}
                          onChangeText={(v) => updateNozzleReading(noz.id, 'testingLitres', v, vals)}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>

                      {/* Net Litres Sold */}
                      <View style={{ width: 110, alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={styles.litresSoldText}>{formatLitres(sold)}</Text>
                      </View>

                      {/* Gross Fuel Amount */}
                      <View style={{ width: 120, alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={styles.grossAmountText}>{formatCurrency(gross)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Pump Subtotal Footer */}
              <View style={styles.pumpTotalFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.pumpTotalLabel}>PUMP {pump.pumpNo} PUMP STATION TOTAL:</Text>
                  {pumpTotalTest > 0 && (
                    <Text style={styles.pumpTotalTestText}>(Testing: {formatLitres(pumpTotalTest)})</Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={styles.pumpFooterSub}>Vol:</Text>
                    <Text style={styles.pumpTotalLitres}>{formatLitres(pumpTotalLitres)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={styles.pumpFooterSub}>Sales:</Text>
                    <Text style={styles.pumpTotalAmount}>{formatCurrency(pumpTotalAmount)}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 50,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveTagText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPillText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportBtnText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── KPI Grid Styles ────────────────────────────────────────────────────────
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: 14,
    gap: 4,
  },
  kpiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  kpiSub: {
    color: colors.textSecondary,
    fontSize: 10,
  },

  // ── Product-wise Fuel Dispensed Ribbon ─────────────────────────────────────
  productMixCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  productMixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productMixTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  dateBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: typography.monoFont,
  },
  productChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productChip: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  prodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  prodNameText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  prodStatsCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  prodLitresVal: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  prodAmtVal: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: typography.monoFont,
  },

  // ── Filter Bar ─────────────────────────────────────────────────────────────
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  filterPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // ── Pumps & Nozzle Tables ───────────────────────────────────────────
  pumpsContainer: {
    gap: 16,
  },
  pumpCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pumpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pumpBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pumpCardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  pumpCardSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  activeTag: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  nozzlesTableWrapper: {
    padding: 12,
    gap: 8,
  },
  nozzlesTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nozzleColHead: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nozzleTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  fuelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nozzleNumberText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  fuelPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fuelPillText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  nozzleProdSub: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  meterInput: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.monoFont,
    borderWidth: 1,
    borderColor: colors.border,
  },
  litresSoldText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  grossAmountText: {
    color: colors.cashGreen,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  pumpTotalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  pumpTotalLabel: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  pumpTotalTestText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  pumpFooterSub: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  pumpTotalLitres: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  pumpTotalAmount: {
    color: colors.cashGreen,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
});

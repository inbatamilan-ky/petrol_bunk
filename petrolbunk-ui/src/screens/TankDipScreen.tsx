import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';

import {
  Gauge,
  Calendar,
  Save,
  Fuel,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useTankDipContext } from '../context/TankDipContext';
import { useMasters } from '../context/MastersContext';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';

interface NozzleReadingInput {
  pumpId: string;
  pumpNo: number;
  nozzleId: string;
  nozzleNo: number;
  productId: string;
  productName: string;
  productCode: string;
  rate: number;
  openingMeter: string;
  closingMeter: string;
}

export const TankDipScreen: React.FC = () => {
  const { dailyNozzleMeters, saveBatchNozzleMeters, syncDailyNozzleMeters } = useTankDipContext();
  const { pumps, products } = useMasters();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [readingsState, setReadingsState] = useState<{ [nozzleId: string]: { opening: string; closing: string } }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync daily nozzle meters when selectedDate changes
  useEffect(() => {
    syncDailyNozzleMeters(selectedDate);
  }, [selectedDate, syncDailyNozzleMeters]);

  // Map existing daily nozzle meters into form state
  useEffect(() => {
    const map: { [nozzleId: string]: { opening: string; closing: string } } = {};
    dailyNozzleMeters.forEach(m => {
      map[m.nozzleId] = {
        opening: String(m.openingMeter || '0'),
        closing: String(m.closingMeter || '0'),
      };
    });
    setReadingsState(map);
  }, [dailyNozzleMeters]);

  // Build nozzle rows grouped by pump
  const pumpNozzleRows = useMemo(() => {
    const prodMap = new Map(products.map(p => [p.id, p]));

    return pumps.map(pump => {
      const nozzlesWithDetails: NozzleReadingInput[] = (pump.nozzles || []).map(noz => {
        const prod = prodMap.get(noz.productId);
        const st = readingsState[noz.id] || {
          opening: String(noz.currentMeterReading || '0'),
          closing: '0',
        };
        return {
          pumpId: pump.id,
          pumpNo: pump.pumpNo,
          nozzleId: noz.id,
          nozzleNo: noz.nozzleNo,
          productId: noz.productId,
          productName: prod?.name || noz.productName || 'Fuel',
          productCode: prod?.code || 'FUEL',
          rate: prod?.currentRate || 0,
          openingMeter: st.opening,
          closingMeter: st.closing,
        };
      });

      return {
        pump,
        nozzles: nozzlesWithDetails,
      };
    });
  }, [pumps, products, readingsState]);

  // Computations for nozzle row
  const computeRow = (r: NozzleReadingInput) => {
    const op = parseFloat(r.openingMeter) || 0;
    const cl = parseFloat(r.closingMeter) || 0;
    const litres = Math.max(0, cl - op);
    const amount = litres * r.rate;
    return { op, cl, litres, amount };
  };

  // Block G: Product Totals Summary
  const productTotals = useMemo(() => {
    const totals: { [code: string]: { name: string; litres: number; rate: number; amount: number } } = {};

    pumpNozzleRows.forEach(pGroup => {
      pGroup.nozzles.forEach(noz => {
        const { litres, amount } = computeRow(noz);
        if (!totals[noz.productCode]) {
          totals[noz.productCode] = {
            name: noz.productName,
            litres: 0,
            rate: noz.rate,
            amount: 0,
          };
        }
        totals[noz.productCode].litres += litres;
        totals[noz.productCode].amount += amount;
      });
    });

    return Object.entries(totals);
  }, [pumpNozzleRows]);

  const grandTotalLitres = useMemo(() => {
    return productTotals.reduce((sum, [_, item]) => sum + item.litres, 0);
  }, [productTotals]);

  const grandTotalAmount = useMemo(() => {
    return productTotals.reduce((sum, [_, item]) => sum + item.amount, 0);
  }, [productTotals]);

  // Update a single nozzle opening or closing meter
  const handleMeterChange = (nozzleId: string, field: 'opening' | 'closing', value: string) => {
    setReadingsState(prev => ({
      ...prev,
      [nozzleId]: {
        ...(prev[nozzleId] || { opening: '0', closing: '0' }),
        [field]: value,
      },
    }));
  };

  // Save all nozzle meters
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const batchPayload: Array<{
        nozzleId: string;
        pumpId: string;
        productId: string;
        openingMeter: number;
        closingMeter: number;
        sellingRate: number;
      }> = [];

      pumpNozzleRows.forEach(pGroup => {
        pGroup.nozzles.forEach(noz => {
          const { op, cl } = computeRow(noz);
          batchPayload.push({
            nozzleId: noz.nozzleId,
            pumpId: noz.pumpId,
            productId: noz.productId,
            openingMeter: op,
            closingMeter: cl,
            sellingRate: noz.rate,
          });
        });
      });

      await saveBatchNozzleMeters(batchPayload, selectedDate);
      Alert.alert('Success', `Daily meter readings for ${selectedDate} saved!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save nozzle meter readings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daily Nozzle Meter Readings</Text>
          <Text style={styles.headerSubtitle}>
            Block B (Meters: Opening → Closing → Litres → Amount) & Block G (Product Totals)
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.dateSelectorRow}>
            <Calendar size={16} color={colors.primary} />
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSaveAll}
            disabled={isSaving}
          >
            <Save size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>
              {isSaving ? 'Saving...' : 'Save All Readings'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Top Strip — Product Totals (Block G) */}
      <View style={styles.kpiStrip}>
        {productTotals.map(([code, item]) => (
          <View key={code} style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{item.name}</Text>
            <Text style={styles.kpiValue}>{item.litres.toFixed(2)} L</Text>
            <Text style={styles.kpiSub}>
              @ ₹{item.rate.toFixed(2)} = {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}

        <View style={[styles.kpiCard, { borderColor: '#10B981', backgroundColor: '#064E3B' }]}>
          <Text style={[styles.kpiLabel, { color: '#6EE7B7' }]}>Grand Total Sales</Text>
          <Text style={[styles.kpiValue, { color: '#FFF' }]}>{formatCurrency(grandTotalAmount)}</Text>
          <Text style={[styles.kpiSub, { color: '#A7F3D0' }]}>
            {grandTotalLitres.toFixed(2)} Total Litres
          </Text>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {pumpNozzleRows.map(({ pump, nozzles }) => (
          <View key={pump.id} style={styles.pumpCard}>
            <View style={styles.pumpHeader}>
              <View style={styles.pumpHeaderLeft}>
                <Gauge size={20} color={colors.primary} />
                <Text style={styles.pumpTitle}>{pump.name}</Text>
                <View style={styles.pumpBadge}>
                  <Text style={styles.pumpBadgeText}>{nozzles.length} Nozzles</Text>
                </View>
              </View>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thText, { flex: 1.5 }]}>Nozzle & Fuel</Text>
              <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Rate (₹)</Text>
              <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Opening Meter</Text>
              <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Closing Meter</Text>
              <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Litres Sold</Text>
              <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Amount (₹)</Text>
            </View>

            {/* Nozzle Data Rows */}
            {nozzles.map(noz => {
              const { op, cl, litres, amount } = computeRow(noz);
              return (
                <View key={noz.nozzleId} style={styles.tableDataRow}>
                  {/* Nozzle Info */}
                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.fuelChip, { backgroundColor: noz.productCode === 'HSD' ? '#D97706' : '#059669' }]}>
                      <Text style={styles.fuelChipText}>N{noz.nozzleNo}</Text>
                    </View>
                    <View>
                      <Text style={styles.nozzleName}>Nozzle {noz.nozzleNo}</Text>
                      <Text style={styles.nozzleFuel}>{noz.productName}</Text>
                    </View>
                  </View>

                  {/* Rate */}
                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    <Text style={styles.rateText}>₹{noz.rate.toFixed(2)}</Text>
                  </View>

                  {/* Opening Meter Input */}
                  <View style={{ flex: 1.5, alignItems: 'flex-end', paddingHorizontal: 4 }}>
                    <TextInput
                      style={styles.meterInput}
                      keyboardType="numeric"
                      value={noz.openingMeter}
                      onChangeText={val => handleMeterChange(noz.nozzleId, 'opening', val)}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Closing Meter Input */}
                  <View style={{ flex: 1.5, alignItems: 'flex-end', paddingHorizontal: 4 }}>
                    <TextInput
                      style={[styles.meterInput, { borderColor: colors.primary }]}
                      keyboardType="numeric"
                      value={noz.closingMeter}
                      onChangeText={val => handleMeterChange(noz.nozzleId, 'closing', val)}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Litres Sold (Computed) */}
                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    <Text style={[styles.computedLitres, litres > 0 && { color: '#10B981' }]}>
                      {litres.toFixed(2)} L
                    </Text>
                  </View>

                  {/* Amount (Computed) */}
                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={[styles.computedAmount, amount > 0 && { color: '#10B981' }]}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#7F9FE0',
    ...(Platform.OS === 'web'
      ? { backgroundImage: 'linear-gradient(90deg, #7F9FE0 0%, #8FD3C9 100%)' }
      : {}),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  dateInput: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    minWidth: 95,
    padding: 0,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryBtnText: {
    color: '#6F7BF5',
    fontSize: 13,
    fontWeight: '600',
  },
  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#9AA5B1',
    marginTop: 2,
  },
  contentScroll: {
    flex: 1,
    padding: 16,
  },
  pumpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  pumpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#7F9FE0',
    ...(Platform.OS === 'web'
      ? { backgroundImage: 'linear-gradient(90deg, #7F9FE0 0%, #8FD3C9 100%)' }
      : {}),
  },
  pumpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pumpTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  pumpBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pumpBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },

  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fuelChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fuelChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  nozzleName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  nozzleFuel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  meterInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    width: '100%',
    maxWidth: 130,
  },
  computedLitres: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  computedAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});

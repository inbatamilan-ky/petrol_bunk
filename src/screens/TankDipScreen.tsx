import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import {
  Database,
  PlusCircle,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Gauge,
  Truck,
  Sparkles,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { DropdownPicker, DropdownOption } from '../components/DropdownPicker';
import { colors, typography } from '../theme/colors';
import { formatLitres, formatDate, getTodayDateString } from '../utils/formatters';
import {
  calculateConvertedDensity,
  calculateLitresFromDip,
} from '../utils/densityCalculator';
import { exportToCSV } from '../utils/exportHelpers';

export const TankDipScreen: React.FC = () => {
  const { tanks, products, dips, recordTankDip, role } = useBunk();

  const [showDipModal, setShowDipModal] = useState(false);
  const [selectedTankId, setSelectedTankId] = useState<string>(tanks[0]?.id || '');
  const [dipType, setDipType] = useState<'Morning' | 'Evening' | 'After Decantation'>('Morning');
  const [fuelDipCm, setFuelDipCm] = useState('185.0');
  const [waterDipCm, setWaterDipCm] = useState('0.0');
  const [observedDensity, setObservedDensity] = useState('830.0');
  const [observedTemp, setObservedTemp] = useState('29.0');
  const [testedBy, setTestedBy] = useState('Manager');

  const selectedTank = tanks.find((t) => t.id === selectedTankId) || tanks[0];
  const prod = products.find((p) => p.id === selectedTank?.productId);

  // Live Density Calculation
  const densityResult = calculateConvertedDensity(
    parseFloat(observedDensity) || 0,
    parseFloat(observedTemp) || 0,
    prod?.code || 'HSD'
  );

  // Live Litres from Dip
  const computedLitres = calculateLitresFromDip(
    parseFloat(fuelDipCm) || 0,
    selectedTank?.capacityLitres || 20000,
    selectedTank?.diameterCm || 250
  );

  const handleSaveDip = () => {
    if (!selectedTank) return;
    const dipCmNum = parseFloat(fuelDipCm) || 0;
    const waterCmNum = parseFloat(waterDipCm) || 0;
    const obsDensityNum = parseFloat(observedDensity) || 0;
    const obsTempNum = parseFloat(observedTemp) || 0;

    const bookStock = selectedTank.currentStockLitres;
    const physicalStock = computedLitres;
    const variance = physicalStock - bookStock;

    recordTankDip({
      tankId: selectedTank.id,
      tankName: selectedTank.name,
      productName: selectedTank.productName,
      dipDate: getTodayDateString(),
      dipType,
      fuelDipCm: dipCmNum,
      fuelDipLitres: physicalStock,
      waterDipCm: waterCmNum,
      observedDensity: obsDensityNum,
      observedTemp: obsTempNum,
      convertedDensity: densityResult.convertedDensity15C,
      bookStockLitres: bookStock,
      variance,
      testedBy: testedBy || 'Manager',
    });

    setShowDipModal(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Tank Name',
      'Dip Type',
      'Dip (cm)',
      'Physical Volume (L)',
      'Water Dip (cm)',
      'Obs Density',
      'Obs Temp (°C)',
      '15°C Converted Density',
      'Tested By',
    ];
    const rows = dips.map((d) => [
      d.dipDate,
      d.tankName,
      d.dipType,
      d.fuelDipCm,
      d.fuelDipLitres,
      d.waterDipCm,
      d.observedDensity,
      d.observedTemp,
      d.convertedDensity,
      d.testedBy,
    ]);
    exportToCSV(`Tank_Dip_Density_Log_${getTodayDateString()}`, headers, rows);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Underground Tanks & Density Quality Log</Text>
          <Text style={styles.screenSubtitle}>
            Daily dip measurement, ASTM 53B density conversion @ 15°C & water detection
          </Text>
        </View>

        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={styles.addDipBtn}
            onPress={() => setShowDipModal(true)}
            activeOpacity={0.8}
          >
            <PlusCircle size={15} color="#000" />
            <Text style={styles.addDipBtnText}>Record Daily Dip / Density</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} activeOpacity={0.8}>
            <FileSpreadsheet size={15} color="#000" />
            <Text style={styles.exportBtnText}>Export Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tanks Capacity & Live Inventory Matrix */}
      <View style={styles.tanksGrid}>
        {tanks.map((tank) => {
          const p = products.find((prodItem) => prodItem.id === tank.productId);
          const fillPct = Math.min(100, Math.round((tank.currentStockLitres / tank.capacityLitres) * 100));
          const isLow = tank.currentStockLitres <= tank.capacityLitres * 0.2;

          return (
            <View key={tank.id} style={[styles.tankCard, { borderTopColor: p?.color || colors.primary }]}>
              <View style={styles.tankCardHeader}>
                <View>
                  <Text style={styles.tankTitle}>{tank.name}</Text>
                  <Text style={styles.tankProductSubtitle}>{tank.productName}</Text>
                </View>
              </View>

              {/* Visual Tank Graphic */}
              <View style={styles.tankGraphic}>
                <View style={styles.tankGraphicTrack}>
                  <View
                    style={[
                      styles.tankGraphicFill,
                      {
                        height: `${fillPct}%` as any,
                        backgroundColor: p?.color || colors.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.tankMetricsRight}>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricBlockLabel}>CURRENT PHYSICAL STOCK</Text>
                    <Text style={[styles.metricBlockVal, isLow && { color: colors.danger }]}>{formatLitres(tank.currentStockLitres)}</Text>
                  </View>

                  <View style={styles.metricBlock}>
                    <Text style={styles.metricBlockLabel}>TOTAL CAPACITY</Text>
                    <Text style={styles.metricBlockSubVal}>{formatLitres(tank.capacityLitres)}</Text>
                  </View>

                  <View style={styles.metricBlock}>
                    <Text style={styles.metricBlockLabel}>ULLAGE / FREE SPACE</Text>
                    <Text style={styles.metricBlockSubVal}>
                      {formatLitres(Math.max(0, tank.capacityLitres - tank.currentStockLitres))} free
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Historical Dip & Density Test Log Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableTitleRow}>
          <Gauge size={18} color={colors.primary} />
          <Text style={styles.tableTitle}>Dip Readings & ASTM 53B Density Quality Log</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.tableScroll}
          contentContainerStyle={{ minWidth: '100%' }}
        >
          <View style={{ width: '100%', minWidth: 560 }}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColHeader, { width: 90 }]}>DATE</Text>
              <Text style={[styles.tableColHeader, { flex: 1.5, minWidth: 150 }]}>TANK NAME</Text>
              <Text style={[styles.tableColHeader, { width: 100, textAlign: 'right' }]}>DIP (CM)</Text>
              <Text style={[styles.tableColHeader, { width: 120, textAlign: 'right' }]}>VOLUME (L)</Text>
              <Text style={[styles.tableColHeader, { width: 130, textAlign: 'right' }]}>DENSITY @15°C</Text>
            </View>

            {dips.map((d) => (
              <View key={d.id} style={styles.tableDataRow}>
                <Text style={[styles.tableCell, { width: 90 }]}>{formatDate(d.dipDate)}</Text>
                <View style={{ flex: 1.5, minWidth: 150 }}>
                  <Text style={styles.tableCellName}>{d.tankName}</Text>
                  <Text style={styles.tableCellSub}>{d.dipType} Dip • {d.testedBy}</Text>
                </View>
                <Text style={[styles.tableCellMono, { width: 100, textAlign: 'right' }]}>{d.fuelDipCm} cm</Text>
                <Text style={[styles.tableCellMono, { width: 120, textAlign: 'right', color: '#38BDF8' }]}>
                  {formatLitres(d.fuelDipLitres)}
                </Text>
                <Text style={[styles.tableCellMono, { width: 130, textAlign: 'right', color: colors.cashGreen }]}>
                  {d.convertedDensity} kg/m³
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Record Dip Modal */}
      <Modal visible={showDipModal} transparent animationType="slide" onRequestClose={() => setShowDipModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Daily Dip & Density Reading</Text>
              <TouchableOpacity onPress={() => setShowDipModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                {/* Select Tank */}
                <DropdownPicker
                  label="Select Underground Tank *"
                  placeholder="Select Underground Tank..."
                  options={tanks.map((t) => {
                    const p = products.find((prod) => prod.id === t.productId);
                    return {
                      label: t.name,
                      value: t.id,
                      subtitle: `${t.productName} • Current: ${formatLitres(t.currentStockLitres)}`,
                      color: p?.color,
                    };
                  })}
                  value={selectedTankId}
                  onChange={(v) => setSelectedTankId(v)}
                />

                {/* Dip Type */}
                <DropdownPicker
                  label="Dip Type *"
                  placeholder="Select Dip Timing / Type..."
                  options={[
                    { label: 'Morning Dip (Opening)', value: 'Morning', subtitle: 'Start of day physical dip' },
                    { label: 'Evening Dip (Closing)', value: 'Evening', subtitle: 'End of day shift handover' },
                    { label: 'After Decantation Dip', value: 'After Decantation', subtitle: 'Post-tanker unloading check' },
                  ]}
                  value={dipType}
                  onChange={(v) => setDipType(v as 'Morning' | 'Evening' | 'After Decantation')}
                  allowOther
                  onSaveNew={(v) => setDipType(v as 'Morning' | 'Evening' | 'After Decantation')}
                />

                {/* Fuel Dip & Water Dip */}
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Fuel Dip Height (cm) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={fuelDipCm}
                      onChangeText={setFuelDipCm}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Water Dip (cm)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={waterDipCm}
                      onChangeText={setWaterDipCm}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Observed Density & Temp */}
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Observed Hydrometer Density *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={observedDensity}
                      onChangeText={setObservedDensity}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Observed Temp (°C) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={observedTemp}
                      onChangeText={setObservedTemp}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Converted Density Result Preview */}
                <View style={styles.densityPreviewBox}>
                  <View style={styles.densityPreviewRow}>
                    <Text style={styles.densityPreviewLabel}>Converted Density @ 15°C:</Text>
                    <Text style={styles.densityPreviewVal}>
                      {densityResult.convertedDensity15C} kg/m³
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.densityStatusText,
                      { color: densityResult.isPassed ? colors.success : colors.danger },
                    ]}
                  >
                    {densityResult.message}
                  </Text>
                </View>

                <View style={styles.volumePreviewBox}>
                  <Text style={styles.volumePreviewLabel}>CALCULATED TANK VOLUME:</Text>
                  <Text style={styles.volumePreviewVal}>{formatLitres(computedLitres)}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveDip} activeOpacity={0.8}>
                <CheckCircle2 size={16} color="#000" />
                <Text style={styles.modalSubmitBtnText}>Save Dip Log & Update Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addDipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addDipBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  tanksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  tankCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    padding: 16,
    gap: 14,
  },
  tankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tankTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  tankProductSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tankGraphic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tankGraphicTrack: {
    width: 48,
    height: 110,
    backgroundColor: '#070A12',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 3,
  },
  tankGraphicFill: {
    width: '100%',
    borderRadius: 20,
  },
  tankMetricsRight: {
    flex: 1,
    gap: 8,
  },
  metricBlock: {
    gap: 2,
  },
  metricBlockLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricBlockVal: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  metricBlockSubVal: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: typography.monoFont,
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  tableScroll: {
    width: '100%',
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tableTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  tableColHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tableCell: {
    color: colors.textPrimary,
    fontSize: 11,
  },
  tableCellName: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  tableCellSub: {
    color: colors.textMuted,
    fontSize: 10,
  },
  tableCellMono: {
    color: colors.textPrimary,
    fontSize: 11,
    fontFamily: typography.monoFont,
    fontWeight: '600',
  },
  passBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  passBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBody: {
    gap: 12,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillOption: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillOptionText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pillOptionTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  dualFormRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    backgroundColor: '#070A12',
    color: '#000',
    fontSize: 13,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  densityPreviewBox: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  densityPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  densityPreviewLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  densityPreviewVal: {
    color: colors.cashGreen,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  densityStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  volumePreviewBox: {
    backgroundColor: '#070A12',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  volumePreviewLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  volumePreviewVal: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: typography.monoFont,
    marginTop: 2,
  },
  modalFooter: {
    marginTop: 4,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  modalSubmitBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});

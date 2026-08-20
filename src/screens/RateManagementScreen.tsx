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
import { TrendingUp, CheckCircle2, History, AlertCircle, Sparkles } from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const RateManagementScreen: React.FC = () => {
  const { products, updateFuelRate, role } = useBunk();

  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [newRateInput, setNewRateInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleStartEdit = (prodId: string, currentRate: number) => {
    setEditingProdId(prodId);
    setNewRateInput(String(currentRate));
    setSavedSuccess(false);
  };

  const handleSaveRate = (prodId: string) => {
    const rateNum = parseFloat(newRateInput) || 0;
    if (rateNum > 0) {
      updateFuelRate(prodId, rateNum);
      setEditingProdId(null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const isOwnerOrManager = role === 'Owner' || role === 'Manager';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Daily Fuel Rates & Pricing Broadcast</Text>
          <Text style={styles.screenSubtitle}>
            Update daily retail selling prices (RSP) across all pumps and shifts
          </Text>
        </View>
      </View>

      {savedSuccess && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={16} color={colors.success} />
          <Text style={styles.successText}>
            Fuel rate updated and broadcasted to active shifts & nozzle calculations!
          </Text>
        </View>
      )}

      {/* Product Rates Grid */}
      <View style={styles.cardsGrid}>
        {products.map((prod) => {
          const isEditing = editingProdId === prod.id;

          return (
            <View key={prod.id} style={[styles.rateCard, { borderTopColor: prod.color }]}>
              <View style={styles.cardTop}>
                <View style={styles.prodInfo}>
                  <View style={[styles.colorDot, { backgroundColor: prod.color }]} />
                  <View>
                    <Text style={styles.prodName}>{prod.name}</Text>
                    <Text style={styles.prodCode}>
                      {prod.code} • {prod.unit}
                    </Text>
                  </View>
                </View>
                <View style={[styles.densityTag, { backgroundColor: prod.color + '20' }]}>
                  <Text style={[styles.densityTagText, { color: prod.color }]}>
                    {prod.standardDensityRange.min}-{prod.standardDensityRange.max} kg/m³
                  </Text>
                </View>
              </View>

              {/* Price Display / Edit Form */}
              <View style={styles.rateDisplayArea}>
                <Text style={styles.rateLabel}>RETAIL SELLING PRICE (RSP)</Text>
                {isEditing ? (
                  <View style={styles.editRow}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.rateInput}
                      value={newRateInput}
                      onChangeText={setNewRateInput}
                      keyboardType="numeric"
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.saveRateBtn}
                      onPress={() => handleSaveRate(prod.id)}
                    >
                      <Text style={styles.saveRateText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelRateBtn}
                      onPress={() => setEditingProdId(null)}
                    >
                      <Text style={styles.cancelRateText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={styles.currentRateVal}>{formatCurrency(prod.currentRate)}</Text>
                    <Text style={styles.unitLabel}>/ {prod.unit}</Text>
                  </View>
                )}
              </View>

              {/* Bottom Edit Trigger */}
              {!isEditing && isOwnerOrManager && (
                <TouchableOpacity
                  style={styles.editTriggerBtn}
                  onPress={() => handleStartEdit(prod.id, prod.currentRate)}
                  activeOpacity={0.7}
                >
                  <TrendingUp size={14} color={colors.accent} />
                  <Text style={styles.editTriggerText}>Update Today's Rate</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Statutory Guidelines Card */}
      <View style={styles.guidelineCard}>
        <View style={styles.guidelineHeader}>
          <AlertCircle size={18} color={colors.accent} />
          <Text style={styles.guidelineTitle}>Daily Dynamic Fuel Pricing Rules</Text>
        </View>
        <Text style={styles.guidelineBody}>
          • Rates updated here take effect immediately for new shift openings and meter calculations.{'\n'}
          • Statutory Density testing must be performed whenever a new tanker delivery decantation is completed.{'\n'}
          • Past historical shifts retain the specific rate active at the time the shift was opened.
        </Text>
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
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    gap: 2,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  successText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  rateCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    padding: 16,
    gap: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  prodName: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  prodCode: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  densityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  densityTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rateDisplayArea: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  rateLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentRateVal: {
    color: '#000',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  unitLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  currencyPrefix: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  rateInput: {
    backgroundColor: '#070A12',
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 90,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveRateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveRateText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelRateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelRateText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  editTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editTriggerText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  guidelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidelineTitle: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  guidelineBody: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },
});

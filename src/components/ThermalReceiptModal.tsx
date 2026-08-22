import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Printer, X, CheckCircle, Share2 } from 'lucide-react';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatLitres, formatDateTime } from '../utils/formatters';

export interface ThermalReceiptData {
  title: string; // e.g. "CREDIT FUEL CHIT" | "SHIFT SETTLEMENT SUMMARY"
  receiptNo: string;
  dateStr: string;
  operatorName?: string;
  pumpNo?: number;
  customerName?: string;
  vehicleNo?: string;
  driverName?: string;
  items: {
    name: string;
    qty?: string;
    rate?: string;
    amount: number;
  }[];
  subtotal: number;
  expensesDeducted?: number;
  netPayable: number;
  paymentMode?: string;
  remarks?: string;
  footerNote?: string;
}

interface ThermalReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  data: ThermalReceiptData | null;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  visible,
  onClose,
  data,
}) => {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Top Actions */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Printer size={18} color={colors.primary} />
              <Text style={styles.modalHeaderTitle}>Thermal Receipt Preview</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Thermal Paper Container */}
          <ScrollView
            style={styles.paperScroll}
            contentContainerStyle={styles.paperContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.thermalPaper}>
              {/* Station Header */}
              <Text style={styles.receiptBrand}>SRI MURUGAN AGENCIES</Text>
              <Text style={styles.receiptSub}>Indian Oil Corporation Ltd. Dealer</Text>
              <Text style={styles.receiptAddress}>NH-45 Bypass, Thiruvarur - 610001</Text>
              <Text style={styles.receiptAddress}>GSTIN: 33AAAAA0000A1Z5 | Ph: 04366-242800</Text>

              <View style={styles.dashedDivider} />

              {/* Title & Metadata */}
              <Text style={styles.receiptDocTitle}>{data.title.toUpperCase()}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Receipt #:</Text>
                <Text style={styles.metaVal}>{data.receiptNo}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date / Time:</Text>
                <Text style={styles.metaVal}>{formatDateTime(data.dateStr) || data.dateStr}</Text>
              </View>
              {data.pumpNo && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Pump Station:</Text>
                  <Text style={styles.metaVal}>Pump {data.pumpNo}</Text>
                </View>
              )}
              {data.operatorName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Operator:</Text>
                  <Text style={styles.metaVal}>{data.operatorName}</Text>
                </View>
              )}

              {/* Customer / Vehicle Details */}
              {(data.customerName || data.vehicleNo) && (
                <>
                  <View style={styles.dashedDivider} />
                  {data.customerName && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Customer:</Text>
                      <Text style={[styles.metaVal, { fontWeight: '700' }]}>{data.customerName}</Text>
                    </View>
                  )}
                  {data.vehicleNo && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Vehicle No:</Text>
                      <Text style={[styles.metaVal, { fontWeight: '700' }]}>{data.vehicleNo}</Text>
                    </View>
                  )}
                  {data.driverName && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Driver Name:</Text>
                      <Text style={styles.metaVal}>{data.driverName}</Text>
                    </View>
                  )}
                </>
              )}

              <View style={styles.dashedDivider} />

              {/* Items Table */}
              <View style={styles.itemHeaderRow}>
                <Text style={[styles.itemHeaderCol, { flex: 2 }]}>ITEM</Text>
                <Text style={[styles.itemHeaderCol, { flex: 1, textAlign: 'right' }]}>QTY/RATE</Text>
                <Text style={[styles.itemHeaderCol, { flex: 1.2, textAlign: 'right' }]}>AMOUNT (₹)</Text>
              </View>
              <View style={styles.dottedDivider} />

              {data.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.itemQtyRate}>{item.qty || ''}</Text>
                    {item.rate && <Text style={styles.itemQtyRate}>@{item.rate}</Text>}
                  </View>
                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.dashedDivider} />

              {/* Totals */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Gross Subtotal:</Text>
                <Text style={styles.totalVal}>{formatCurrency(data.subtotal)}</Text>
              </View>

              {data.expensesDeducted !== undefined && data.expensesDeducted > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Expenses Deducted:</Text>
                  <Text style={styles.totalVal}>- {formatCurrency(data.expensesDeducted)}</Text>
                </View>
              )}

              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>NET AMOUNT:</Text>
                <Text style={styles.grandTotalVal}>{formatCurrency(data.netPayable)}</Text>
              </View>

              {data.paymentMode && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Payment Mode:</Text>
                  <Text style={[styles.metaVal, { fontWeight: '700' }]}>{data.paymentMode}</Text>
                </View>
              )}

              {data.remarks && (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.remarksLabel}>Remarks: {data.remarks}</Text>
                </View>
              )}

              {/* Signatures */}
              <View style={styles.signatureRow}>
                <View style={styles.signatureBox}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigText}>Driver / Cust Sign</Text>
                </View>
                <View style={styles.signatureBox}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigText}>Authorized Cashier</Text>
                </View>
              </View>

              {/* Footer Note */}
              <Text style={styles.footerThanks}>
                {data.footerNote || 'THANK YOU FOR FUELLING WITH US! • VISIT AGAIN'}
              </Text>
              <Text style={styles.footerSoftware}>FuelPulse POS • Software Generated Slip</Text>
            </View>
          </ScrollView>

          {/* Bottom Print Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint} activeOpacity={0.8}>
              <Printer size={16} color="#000" />
              <Text style={styles.printBtnText}>Print Thermal Slip (POS)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  paperScroll: {
    maxHeight: 520,
    flexShrink: 1,
    backgroundColor: '#E2E8F0',
  },
  paperContent: {
    padding: 16,
  },
  thermalPaper: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  receiptBrand: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    color: '#111827',
    letterSpacing: 0.5,
  },
  receiptSub: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    color: '#374151',
    marginTop: 2,
  },
  receiptAddress: {
    fontSize: 10,
    textAlign: 'center',
    color: '#4B5563',
    marginTop: 1,
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#9CA3AF',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  dottedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    marginVertical: 4,
  },
  receiptDocTitle: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    color: '#111827',
    letterSpacing: 1,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1.5,
  },
  metaLabel: {
    fontSize: 10,
    color: '#4B5563',
  },
  metaVal: {
    fontSize: 10,
    color: '#111827',
    fontFamily: typography.monoFont,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  itemHeaderCol: {
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
  },
  itemRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  itemName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111827',
  },
  itemQtyRate: {
    fontSize: 9,
    color: '#4B5563',
    fontFamily: typography.monoFont,
  },
  itemAmount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    fontFamily: typography.monoFont,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 11,
    color: '#374151',
  },
  totalVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    fontFamily: typography.monoFont,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    paddingVertical: 4,
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },
  grandTotalVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    fontFamily: typography.monoFont,
  },
  remarksLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  signatureBox: {
    width: '45%',
    alignItems: 'center',
  },
  sigLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#6B7280',
    marginBottom: 4,
  },
  sigText: {
    fontSize: 9,
    color: '#4B5563',
  },
  footerThanks: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    color: '#374151',
    marginTop: 10,
  },
  footerSoftware: {
    fontSize: 8,
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  printBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  printBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});

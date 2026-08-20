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
  PlusCircle,
  Fuel,
  Users,
  Tag,
  CheckCircle2,
  X,
  Gauge,
  Truck,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { ExpenseType } from '../types';

type TabId = 'products' | 'pumps' | 'staff' | 'expenses' | 'customers';

export const MastersScreen: React.FC = () => {
  const {
    products, pumps, operators, expenseTypes, customers,
    addOperator, addPump, addProduct, addExpenseType, addCustomer, role,
  } = useBunk();

  const [activeTab, setActiveTab] = useState<TabId>('products');

  // ─── New Operator Modal ────────────────────────────────────────────────────
  const [showOpModal, setShowOpModal] = useState(false);
  const [opName, setOpName] = useState('');
  const [opPhone, setOpPhone] = useState('');
  const [opBata, setOpBata] = useState('350');

  // ─── New Pump Modal ────────────────────────────────────────────────────────
  const [showPumpModal, setShowPumpModal] = useState(false);
  const [pumpNoInput, setPumpNoInput] = useState(String(pumps.length + 1));
  const [pumpNameInput, setPumpNameInput] = useState(`Pump ${pumps.length + 1} (Island)`);
  const [pumpStatus, setPumpStatus] = useState<'ACTIVE' | 'IDLE' | 'MAINTENANCE'>('ACTIVE');
  // Nozzles for new pump
  const [pumpNozzles, setPumpNozzles] = useState([
    { productId: products[0]?.id || '', nozzleNo: 1, opening: '0' },
  ]);

  const addNozzleRow = () =>
    setPumpNozzles((prev) => [...prev, { productId: products[0]?.id || '', nozzleNo: prev.length + 1, opening: '0' }]);
  const removeNozzleRow = (i: number) =>
    setPumpNozzles((prev) => prev.filter((_, idx) => idx !== i));

  // ─── New Product Modal ─────────────────────────────────────────────────────
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodUnit, setProdUnit] = useState<'Litre' | 'Can'>('Litre');
  const [prodCategory, setProdCategory] = useState<'FUEL' | 'LUBRICANT'>('FUEL');
  const [prodRate, setProdRate] = useState('');
  const [prodColor, setProdColor] = useState('#F59E0B');
  const [prodDensityMin, setProdDensityMin] = useState('820');
  const [prodDensityMax, setProdDensityMax] = useState('845');

  // ─── New Expense Type Modal ────────────────────────────────────────────────
  const [showEtModal, setShowEtModal] = useState(false);
  const [etName, setEtName] = useState('');
  const [etCategory, setEtCategory] = useState<ExpenseType['category']>('OPERATIONAL');

  // ─── New Customer Modal ────────────────────────────────────────────────────
  const [showCustModal, setShowCustModal] = useState(false);
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custPerson, setCustPerson] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custLimit, setCustLimit] = useState('500000');
  const [custOpening, setCustOpening] = useState('0');
  const [custVehicles, setCustVehicles] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveOperator = () => {
    if (!opName) return;
    addOperator({ name: opName, phone: opPhone || '+91 98421 00000', dailyBata: parseFloat(opBata) || 350, active: true });
    setShowOpModal(false); setOpName(''); setOpPhone(''); setOpBata('350');
  };

  const handleSavePump = () => {
    const pNo = parseInt(pumpNoInput, 10) || pumps.length + 1;
    const pId = `pump-${Date.now()}`;
    addPump({
      pumpNo: pNo,
      name: pumpNameInput,
      status: pumpStatus,
      nozzles: pumpNozzles.map((n, idx) => {
        const prod = products.find((p) => p.id === n.productId);
        return {
          id: `noz-${pId}-${idx + 1}`,
          pumpId: pId,
          nozzleNo: n.nozzleNo,
          productId: n.productId,
          productName: prod?.name || 'Unknown',
          fuelCode: prod?.code || 'UNK',
          color: prod?.color || '#6B7280',
          currentMeterReading: parseFloat(n.opening) || 0,
        };
      }),
    });
    setShowPumpModal(false);
    setPumpNozzles([{ productId: products[0]?.id || '', nozzleNo: 1, opening: '0' }]);
  };

  const handleSaveProduct = () => {
    if (!prodName || !prodCode || !prodRate) return;
    addProduct({
      code: prodCode.toUpperCase(),
      name: prodName,
      category: prodCategory,
      unit: prodUnit,
      color: prodColor,
      currentRate: parseFloat(prodRate) || 0,
      standardDensityRange: { min: parseInt(prodDensityMin) || 820, max: parseInt(prodDensityMax) || 845 },
    });
    setShowProdModal(false);
    setProdName(''); setProdCode(''); setProdRate('');
  };

  const handleSaveExpenseType = () => {
    if (!etName) return;
    addExpenseType({ name: etName, category: etCategory });
    setShowEtModal(false); setEtName('');
  };

  const handleSaveCustomer = () => {
    if (!custName) return;
    addCustomer({
      code: custCode || custName.slice(0, 4).toUpperCase(),
      name: custName,
      contactPerson: custPerson || custName,
      phone: custPhone || '+91 98421 00000',
      vehicleNumbers: custVehicles.split(',').map((v) => v.trim()).filter(Boolean),
      creditLimit: parseFloat(custLimit) || 500000,
      openingBalance: parseFloat(custOpening) || 0,
      status: 'ACTIVE',
      address: custAddress,
    });
    setShowCustModal(false);
    setCustCode(''); setCustName(''); setCustPerson(''); setCustPhone('');
    setCustLimit('500000'); setCustOpening('0'); setCustVehicles(''); setCustAddress('');
  };

  const tabs: { id: TabId; label: string; icon: any; count: number }[] = [
    { id: 'products', label: 'Products', icon: Fuel, count: products.length },
    { id: 'pumps', label: 'Pumps & Nozzles', icon: Gauge, count: pumps.length },
    { id: 'staff', label: 'Staff / Operators', icon: Users, count: operators.length },
    { id: 'expenses', label: 'Expense Heads', icon: Tag, count: expenseTypes.length },
    { id: 'customers', label: 'Credit Customers', icon: Truck, count: customers.length },
  ];

  const PROD_COLORS = ['#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#3B82F6', '#6B7280', '#F97316'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Station Masters & Configuration</Text>
          <Text style={styles.screenSubtitle}>
            Manage fuel products, dispensers, nozzles, staff & credit customers
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Icon size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                <Text style={[styles.countText, isActive && styles.countTextActive]}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Products Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Fuel & Lubricant Products</Text>
              <Text style={styles.sectionSub}>Manage daily selling rates and density bands</Text>
            </View>
            {role === 'Owner' || role === 'Admin' ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowProdModal(true)}>
                <PlusCircle size={14} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Product</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {products.map((prod) => (
            <View key={prod.id} style={[styles.itemCard, { borderLeftColor: prod.color, borderLeftWidth: 4 }]}>
              <View style={styles.itemTop}>
                <View style={styles.itemLeft}>
                  <View style={[styles.colorDot, { backgroundColor: prod.color }]} />
                  <View>
                    <Text style={styles.itemTitle}>{prod.name}</Text>
                    <Text style={styles.itemSub}>{prod.code} • {prod.category} • per {prod.unit}</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.bigRate}>{formatCurrency(prod.currentRate)}</Text>
                  <Text style={styles.perUnit}>/ {prod.unit}</Text>
                </View>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.densityText}>
                  Density: {prod.standardDensityRange?.min}–{prod.standardDensityRange?.max} kg/m³
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ─── Pumps Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'pumps' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Pump Dispensers & Nozzle Config</Text>
              <Text style={styles.sectionSub}>Each pump has one or more product nozzles</Text>
            </View>
            {(role === 'Owner' || role === 'Admin') && (
              <TouchableOpacity style={styles.addBtn} onPress={() => {
                setPumpNoInput(String(pumps.length + 1));
                setPumpNameInput(`Pump ${pumps.length + 1} (Island)`);
                setShowPumpModal(true);
              }}>
                <PlusCircle size={14} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Pump</Text>
              </TouchableOpacity>
            )}
          </View>

          {pumps.map((pump) => (
            <View key={pump.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={styles.itemLeft}>
                  <Gauge size={18} color={colors.primary} />
                  <View>
                    <Text style={styles.itemTitle}>{pump.name}</Text>
                    <Text style={styles.itemSub}>Pump #{pump.pumpNo} • {pump.nozzles.length} nozzle(s)</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: pump.status === 'ACTIVE' ? colors.success + '20' : colors.warning + '20' }]}>
                  <Text style={[styles.statusPillText, { color: pump.status === 'ACTIVE' ? colors.success : colors.warning }]}>
                    {pump.status}
                  </Text>
                </View>
              </View>
              <View style={styles.nozzleList}>
                {pump.nozzles.map((noz) => (
                  <View key={noz.id} style={styles.nozzleRow}>
                    <View style={[styles.nozzleDot, { backgroundColor: noz.color }]} />
                    <Text style={styles.nozzleText}>
                      Nozzle #{noz.nozzleNo} — {noz.productName}
                    </Text>
                    <Text style={styles.nozzleMeter}>
                      {noz.currentMeterReading.toLocaleString('en-IN')} L
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ─── Staff Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Operators & Staff Register</Text>
              <Text style={styles.sectionSub}>Pump operators with daily bata allocation</Text>
            </View>
            {(role === 'Owner' || role === 'Admin' || role === 'Manager') && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowOpModal(true)}>
                <PlusCircle size={14} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Operator</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colHead, { flex: 1.5 }]}>NAME</Text>
            <Text style={[styles.colHead, { flex: 1.5 }]}>PHONE</Text>
            <Text style={[styles.colHead, { width: 100, textAlign: 'right' }]}>DAILY BATA</Text>
            <Text style={[styles.colHead, { width: 80, textAlign: 'center' }]}>STATUS</Text>
          </View>

          {operators.map((op) => (
            <View key={op.id} style={styles.tableRow}>
              <View style={[styles.avatarCircle, { marginRight: 8 }]}>
                <Text style={styles.avatarText}>{op.name.charAt(0)}</Text>
              </View>
              <Text style={[styles.cellPrimary, { flex: 1.5 }]}>{op.name}</Text>
              <Text style={[styles.cellSecondary, { flex: 1.5 }]}>{op.phone}</Text>
              <Text style={[styles.cellMono, { width: 100, textAlign: 'right', color: colors.cashGreen }]}>
                {formatCurrency(op.dailyBata)}
              </Text>
              <View style={[styles.statusPill, { width: 80, alignItems: 'center', backgroundColor: op.active ? colors.success + '20' : colors.danger + '20' }]}>
                <Text style={[styles.statusPillText, { color: op.active ? colors.success : colors.danger }]}>
                  {op.active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ─── Expense Types Tab ────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Expense Heads & Categories</Text>
              <Text style={styles.sectionSub}>Add custom expense types for daily petty cash vouchers</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowEtModal(true)}>
              <PlusCircle size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Head</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipGrid}>
            {expenseTypes.map((et) => {
              const catColors: Record<string, string> = {
                STAFF: colors.primary,
                OPERATIONAL: colors.accent,
                FINANCIAL: colors.cashGreen,
                MAINTENANCE: colors.warning,
              };
              const col = catColors[et.category] || colors.textMuted;
              return (
                <View key={et.id} style={[styles.etChip, { borderColor: col + '60' }]}>
                  <View style={[styles.etChipDot, { backgroundColor: col }]} />
                  <View>
                    <Text style={styles.etChipName}>{et.name}</Text>
                    <Text style={[styles.etChipCat, { color: col }]}>{et.category}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ─── Customers Tab ────────────────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Credit Customer Register</Text>
              <Text style={styles.sectionSub}>{customers.length} customers loaded from ledger data</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCustModal(true)}>
              <PlusCircle size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>

          {/* Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ minWidth: 620 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHead, { width: 65 }]}>CODE</Text>
                <Text style={[styles.colHead, { width: 160 }]}>NAME</Text>
                <Text style={[styles.colHead, { width: 130 }]}>CONTACT</Text>
                <Text style={[styles.colHead, { width: 100, textAlign: 'right' }]}>LIMIT (₹)</Text>
                <Text style={[styles.colHead, { width: 120, textAlign: 'right' }]}>OUTSTANDING (₹)</Text>
                <Text style={[styles.colHead, { width: 70, textAlign: 'center' }]}>STATUS</Text>
              </View>

              {customers.map((c) => {
                const usedPct = c.creditLimit > 0 ? Math.round((c.outstandingBalance / c.creditLimit) * 100) : 0;
                const isWarning = usedPct >= 80;
                return (
                  <View key={c.id} style={styles.tableRow}>
                    <Text style={[styles.cellMono, { width: 65, color: colors.accent }]}>{c.code}</Text>
                    <View style={{ width: 160 }}>
                      <Text style={styles.cellPrimary}>{c.name}</Text>
                      {c.contactPerson !== c.name && (
                        <Text style={styles.cellSecondarySmall}>{c.contactPerson}</Text>
                      )}
                    </View>
                    <Text style={[styles.cellSecondary, { width: 130 }]}>{c.phone}</Text>
                    <Text style={[styles.cellMono, { width: 100, textAlign: 'right' }]}>
                      {formatCurrency(c.creditLimit)}
                    </Text>
                    <View style={{ width: 120, alignItems: 'flex-end' }}>
                      <Text style={[styles.cellMono, { color: isWarning ? colors.danger : colors.creditOrange, fontWeight: '800' }]}>
                        {formatCurrency(c.outstandingBalance)}
                      </Text>
                      <Text style={[styles.cellSecondarySmall, { color: isWarning ? colors.danger : colors.textMuted }]}>
                        {usedPct}% used
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { width: 70, alignItems: 'center', backgroundColor: c.status === 'ACTIVE' ? colors.success + '20' : colors.danger + '20' }]}>
                      <Text style={[styles.statusPillText, { color: c.status === 'ACTIVE' ? colors.success : colors.danger, fontSize: 9 }]}>
                        {c.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Modals
      ═══════════════════════════════════════════════════════════════ */}

      {/* Add Product Modal */}
      <Modal visible={showProdModal} transparent animationType="slide" onRequestClose={() => setShowProdModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Fuel / Lubricant Product</Text>
              <TouchableOpacity onPress={() => setShowProdModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.dualRow}>
                  <View style={[styles.formGroup, { flex: 1.5 }]}>
                    <Text style={styles.formLabel}>Product Name</Text>
                    <TextInput style={styles.textInput} value={prodName} onChangeText={setProdName} placeholder="e.g. HSD (Diesel)" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Short Code</Text>
                    <TextInput style={styles.textInput} value={prodCode} onChangeText={setProdCode} placeholder="e.g. HSD" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>
                <View style={styles.dualRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Category</Text>
                    <View style={styles.segmentRow}>
                      {(['FUEL', 'LUBRICANT'] as const).map((c) => (
                        <TouchableOpacity key={c} style={[styles.segBtn, prodCategory === c && styles.segBtnActive]} onPress={() => setProdCategory(c)}>
                          <Text style={[styles.segBtnText, prodCategory === c && styles.segBtnTextActive]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Unit</Text>
                    <View style={styles.segmentRow}>
                      {(['Litre', 'Can'] as const).map((u) => (
                        <TouchableOpacity key={u} style={[styles.segBtn, prodUnit === u && styles.segBtnActive]} onPress={() => setProdUnit(u)}>
                          <Text style={[styles.segBtnText, prodUnit === u && styles.segBtnTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Selling Rate (₹ per {prodUnit})</Text>
                  <TextInput style={styles.textInput} value={prodRate} onChangeText={setProdRate} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.dualRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Density Min (kg/m³)</Text>
                    <TextInput style={styles.textInput} value={prodDensityMin} onChangeText={setProdDensityMin} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Density Max (kg/m³)</Text>
                    <TextInput style={styles.textInput} value={prodDensityMax} onChangeText={setProdDensityMax} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Display Color</Text>
                  <View style={styles.colorPicker}>
                    {PROD_COLORS.map((c) => (
                      <TouchableOpacity key={c} onPress={() => setProdColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, prodColor === c && styles.colorSwatchActive]} />
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProduct}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Save Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Pump Modal */}
      <Modal visible={showPumpModal} transparent animationType="slide" onRequestClose={() => setShowPumpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Pump Dispenser</Text>
              <TouchableOpacity onPress={() => setShowPumpModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.dualRow}>
                  <View style={[styles.formGroup, { width: 80 }]}>
                    <Text style={styles.formLabel}>Pump #</Text>
                    <TextInput style={styles.textInput} value={pumpNoInput} onChangeText={setPumpNoInput} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Pump Name</Text>
                    <TextInput style={styles.textInput} value={pumpNameInput} onChangeText={setPumpNameInput} placeholder="e.g. Pump 4 (Back Island)" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Status</Text>
                  <View style={styles.segmentRow}>
                    {(['ACTIVE', 'IDLE', 'MAINTENANCE'] as const).map((s) => (
                      <TouchableOpacity key={s} style={[styles.segBtn, pumpStatus === s && styles.segBtnActive]} onPress={() => setPumpStatus(s)}>
                        <Text style={[styles.segBtnText, pumpStatus === s && styles.segBtnTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Nozzles */}
                <View style={styles.formGroup}>
                  <View style={styles.nozzleHeaderRow}>
                    <Text style={styles.formLabel}>Nozzles</Text>
                    <TouchableOpacity style={styles.addNozzleBtn} onPress={addNozzleRow}>
                      <PlusCircle size={13} color={colors.accent} />
                      <Text style={styles.addNozzleBtnText}>Add Nozzle</Text>
                    </TouchableOpacity>
                  </View>
                  {pumpNozzles.map((noz, idx) => (
                    <View key={idx} style={styles.nozzleFormRow}>
                      <Text style={styles.nozzleFormLabel}>#{noz.nozzleNo}</Text>
                      <View style={styles.nozzleProductPicker}>
                        <Text style={styles.formLabel}>Product</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: 'row' }}>
                          {products.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={[styles.productPill, noz.productId === p.id && { borderColor: p.color, backgroundColor: p.color + '20' }]}
                              onPress={() => setPumpNozzles((prev) => prev.map((n, i) => i === idx ? { ...n, productId: p.id } : n))}
                            >
                              <Text style={[styles.productPillText, noz.productId === p.id && { color: p.color, fontWeight: '700' }]}>{p.code}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                      <View style={[styles.formGroup, { width: 100 }]}>
                        <Text style={styles.formLabel}>Opening Meter</Text>
                        <TextInput style={styles.textInput} value={noz.opening} onChangeText={(v) => setPumpNozzles((prev) => prev.map((n, i) => i === idx ? { ...n, opening: v } : n))} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                      </View>
                      {pumpNozzles.length > 1 && (
                        <TouchableOpacity onPress={() => removeNozzleRow(idx)} style={{ padding: 6 }}>
                          <X size={16} color={colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSavePump}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Save Pump</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Operator Modal */}
      <Modal visible={showOpModal} transparent animationType="slide" onRequestClose={() => setShowOpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Staff / Operator</Text>
              <TouchableOpacity onPress={() => setShowOpModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name</Text>
                <TextInput style={styles.textInput} value={opName} onChangeText={setOpName} placeholder="Operator Name" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.dualRow}>
                <View style={[styles.formGroup, { flex: 1.5 }]}>
                  <Text style={styles.formLabel}>Phone Number</Text>
                  <TextInput style={styles.textInput} value={opPhone} onChangeText={setOpPhone} placeholder="+91 98421 00000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Daily Bata (₹)</Text>
                  <TextInput style={styles.textInput} value={opBata} onChangeText={setOpBata} keyboardType="numeric" placeholder="350" placeholderTextColor={colors.textMuted} />
                </View>
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveOperator}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Save Operator</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Expense Type Modal */}
      <Modal visible={showEtModal} transparent animationType="slide" onRequestClose={() => setShowEtModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense Head</Text>
              <TouchableOpacity onPress={() => setShowEtModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Expense Head Name</Text>
                <TextInput style={styles.textInput} value={etName} onChangeText={setEtName} placeholder="e.g. Generator Diesel, Water Bill" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.chipPickerRow}>
                  {(['OPERATIONAL', 'STAFF', 'FINANCIAL', 'MAINTENANCE'] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, etCategory === cat && styles.categoryChipActive]}
                      onPress={() => setEtCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, etCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveExpenseType}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Save Expense Head</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal */}
      <Modal visible={showCustModal} transparent animationType="slide" onRequestClose={() => setShowCustModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Credit Customer</Text>
              <TouchableOpacity onPress={() => setShowCustModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.dualRow}>
                  <View style={[styles.formGroup, { width: 90 }]}>
                    <Text style={styles.formLabel}>Code</Text>
                    <TextInput style={styles.textInput} value={custCode} onChangeText={setCustCode} placeholder="ABC" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Company / Customer Name *</Text>
                    <TextInput style={styles.textInput} value={custName} onChangeText={setCustName} placeholder="Customer Name" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>
                <View style={styles.dualRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Contact Person</Text>
                    <TextInput style={styles.textInput} value={custPerson} onChangeText={setCustPerson} placeholder="Contact Name" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Phone</Text>
                    <TextInput style={styles.textInput} value={custPhone} onChangeText={setCustPhone} placeholder="+91 98421 00000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
                  </View>
                </View>
                <View style={styles.dualRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Credit Limit (₹)</Text>
                    <TextInput style={styles.textInput} value={custLimit} onChangeText={setCustLimit} keyboardType="numeric" placeholder="500000" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Opening Balance (₹)</Text>
                    <TextInput style={styles.textInput} value={custOpening} onChangeText={setCustOpening} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Vehicle Numbers (comma separated)</Text>
                  <TextInput style={styles.textInput} value={custVehicles} onChangeText={setCustVehicles} placeholder="TN01AB1234, TN02CD5678" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Address</Text>
                  <TextInput style={styles.textInput} value={custAddress} onChangeText={setCustAddress} placeholder="City, State" placeholderTextColor={colors.textMuted} />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveCustomer}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Save Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: 16, paddingBottom: 40, gap: 16 },
  topBar: { gap: 4 },
  screenTitle: { color: '#000', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  screenSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Tabs
  tabBarScroll: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  countBadge: {
    backgroundColor: colors.surfaceCard, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  countBadgeActive: { backgroundColor: '#FFFFFF30' },
  countText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  countTextActive: { color: '#FFFFFF', fontWeight: '800' },

  // Cards
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionTitle: { color: '#000', fontSize: 14, fontWeight: '700' },
  sectionSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 7,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Item cards
  itemCard: {
    backgroundColor: colors.surfaceCard, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemRight: { alignItems: 'flex-end' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  itemTitle: { color: '#000', fontSize: 13, fontWeight: '700' },
  itemSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  bigRate: { color: '#000', fontSize: 20, fontWeight: '900', fontFamily: typography.monoFont },
  perUnit: { color: colors.textMuted, fontSize: 11 },
  itemFooter: { flexDirection: 'row', gap: 12 },
  densityText: { color: colors.textMuted, fontSize: 10 },

  // Pump nozzle list
  nozzleList: { gap: 6 },
  nozzleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceElevated, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  nozzleDot: { width: 8, height: 8, borderRadius: 4 },
  nozzleText: { flex: 1, color: colors.textPrimary, fontSize: 12 },
  nozzleMeter: { color: colors.textMuted, fontSize: 11, fontFamily: typography.monoFont },

  // Status pills
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  // Table
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, paddingHorizontal: 4,
  },
  colHead: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  avatarCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  cellPrimary: { color: '#000', fontSize: 12, fontWeight: '600' },
  cellSecondary: { color: colors.textSecondary, fontSize: 11 },
  cellSecondarySmall: { color: colors.textMuted, fontSize: 10 },
  cellMono: { fontSize: 11, fontFamily: typography.monoFont, fontWeight: '600', color: colors.textPrimary },

  // Expense type chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  etChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1,
  },
  etChipDot: { width: 8, height: 8, borderRadius: 4 },
  etChipName: { color: '#000', fontSize: 12, fontWeight: '600' },
  etChipCat: { fontSize: 9, fontWeight: '700', marginTop: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: {
    width: '100%', maxWidth: 520, backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 14,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10,
  },
  modalTitle: { color: '#000', fontSize: 15, fontWeight: '700' },
  modalBody: { gap: 12 },
  modalFooter: { marginTop: 4 },

  formGroup: { gap: 6 },
  formLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  textInput: {
    backgroundColor: colors.surfaceCard, color: '#000', fontSize: 13,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  dualRow: { flexDirection: 'row', gap: 10 },
  segmentRow: {
    flexDirection: 'row', backgroundColor: colors.surfaceCard,
    borderRadius: 8, padding: 3, borderWidth: 1, borderColor: colors.border, gap: 3,
  },
  segBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  segBtnActive: { backgroundColor: colors.primary },
  segBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  segBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },

  colorPicker: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  colorSwatchActive: { borderWidth: 3, borderColor: '#000' },

  // Pump nozzle form
  nozzleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addNozzleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addNozzleBtnText: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  nozzleFormRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: colors.surfaceCard, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  nozzleFormLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800', marginBottom: 6, width: 24 },
  nozzleProductPicker: { flex: 1, gap: 6 },
  productPill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated,
  },
  productPillText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },

  // Category chips in expense modal
  chipPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  categoryChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  submitBtn: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 11, borderRadius: 8, gap: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
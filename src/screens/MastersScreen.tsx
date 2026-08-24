import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
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
  Power,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  Sliders,
  AlertTriangle,
  Layers,
  Phone,
  Car,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { ExpenseType, Product, Pump, Operator, CreditCustomer } from '../types';
import { DropdownPicker, DropdownOption } from '../components/DropdownPicker';
import {
  useProductCategories,
  useExpenseCategories,
  usePumpStatuses,
  useCustomerStatuses,
} from '../hooks/useMasters';

type TabId = 'products' | 'pumps' | 'staff' | 'expenses' | 'customers';

export const MastersScreen: React.FC = () => {
  const {
    products, pumps, operators, expenseTypes, customers,
    addOperator, updateOperator, deleteOperator,
    addPump, updatePump, deletePump,
    addProduct, updateProduct, deleteProduct,
    addExpenseType, updateExpenseType, deleteExpenseType,
    addCustomer, updateCustomer, deleteCustomer,
    role,
  } = useBunk();

  // ── Master table lookups (API-backed dropdowns) ───────────────────
  const { options: productCategoryOptions } = useProductCategories();
  const { options: expenseCategoryOptions } = useExpenseCategories();
  const { options: pumpStatusOptions } = usePumpStatuses();
  const { options: customerStatusOptions } = useCustomerStatuses();

  const [activeTab, setActiveTab] = useState<TabId>('products');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Delete Confirmation Modal State ───────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const promptDelete = (title: string, message: string, onConfirm: () => void) => {
    setDeleteConfirm({
      visible: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setDeleteConfirm((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  // ─── Status Toggle Helpers ────────────────────────────────────────────────
  const toggleProductActive = (prod: Product) => {
    updateProduct({ ...prod, active: prod.active === false ? true : false });
  };

  const cyclePumpStatus = (pump: Pump) => {
    const sequence = pumpStatusOptions.length > 0
      ? pumpStatusOptions.map((o) => o.value as Pump['status'])
      : (['ACTIVE', 'IDLE', 'MAINTENANCE', 'INACTIVE'] as Pump['status'][]);
    const currIdx = sequence.indexOf(pump.status);
    const nextStatus = sequence[(currIdx + 1) % sequence.length];
    updatePump({ ...pump, status: nextStatus });
  };

  const toggleOperatorActive = (op: Operator) => {
    updateOperator({ ...op, active: !op.active });
  };

  const toggleExpenseTypeActive = (et: ExpenseType) => {
    updateExpenseType({ ...et, active: et.active === false ? true : false });
  };

  const cycleCustomerStatus = (c: CreditCustomer) => {
    const sequence = customerStatusOptions.length > 0
      ? customerStatusOptions.map((o) => o.value as CreditCustomer['status'])
      : (['ACTIVE', 'HOLD', 'BLOCKED', 'INACTIVE'] as CreditCustomer['status'][]);
    const currIdx = sequence.indexOf(c.status);
    const nextStatus = sequence[(currIdx + 1) % sequence.length];
    updateCustomer({ ...c, status: nextStatus });
  };

  // ─── 1. PRODUCT MODAL STATE (ADD & EDIT) ──────────────────────────────────
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodUnit, setProdUnit] = useState<'Litre' | 'Can'>('Litre');
  const [prodCategory, setProdCategory] = useState<'FUEL' | 'LUBRICANT'>('FUEL');
  const [prodRate, setProdRate] = useState('');
  const [prodColor, setProdColor] = useState('#F59E0B');
  const [prodDensityMin, setProdDensityMin] = useState('820');
  const [prodDensityMax, setProdDensityMax] = useState('845');
  const [prodActive, setProdActive] = useState(true);

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCode('');
    setProdUnit('Litre');
    setProdCategory('FUEL');
    setProdRate('');
    setProdColor('#F59E0B');
    setProdDensityMin('820');
    setProdDensityMax('845');
    setProdActive(true);
    setShowProdModal(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCode(prod.code);
    setProdUnit(prod.unit);
    setProdCategory(prod.category);
    setProdRate(String(prod.currentRate));
    setProdColor(prod.color || '#F59E0B');
    setProdDensityMin(String(prod.standardDensityRange?.min || 820));
    setProdDensityMax(String(prod.standardDensityRange?.max || 845));
    setProdActive(prod.active !== false);
    setShowProdModal(true);
  };

  const handleSaveProduct = () => {
    if (!prodName || !prodCode || !prodRate) return;
    const rateNum = parseFloat(prodRate) || 0;
    const minD = parseInt(prodDensityMin, 10) || 820;
    const maxD = parseInt(prodDensityMax, 10) || 845;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: prodName,
        code: prodCode.toUpperCase(),
        unit: prodUnit,
        category: prodCategory,
        currentRate: rateNum,
        color: prodColor,
        standardDensityRange: { min: minD, max: maxD },
        active: prodActive,
      });
    } else {
      addProduct({
        name: prodName,
        code: prodCode.toUpperCase(),
        unit: prodUnit,
        category: prodCategory,
        currentRate: rateNum,
        color: prodColor,
        standardDensityRange: { min: minD, max: maxD },
        active: prodActive,
      });
    }
    setShowProdModal(false);
  };

  // ─── 2. PUMP & NOZZLES MODAL STATE (ADD & EDIT) ───────────────────────────
  const [showPumpModal, setShowPumpModal] = useState(false);
  const [editingPump, setEditingPump] = useState<Pump | null>(null);
  const [pumpNoInput, setPumpNoInput] = useState(String(pumps.length + 1));
  const [pumpNameInput, setPumpNameInput] = useState(`Pump ${pumps.length + 1} (Island)`);
  const [pumpStatus, setPumpStatus] = useState<'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'INACTIVE'>('ACTIVE');
  const [pumpNozzles, setPumpNozzles] = useState<{ id?: string; productId: string; nozzleNo: number; opening: string }[]>([
    { productId: products[0]?.id || '', nozzleNo: 1, opening: '0' },
  ]);

  const openAddPump = () => {
    setEditingPump(null);
    setPumpNoInput(String(pumps.length + 1));
    setPumpNameInput(`Pump ${pumps.length + 1} (Island)`);
    setPumpStatus('ACTIVE');
    setPumpNozzles([{ productId: products[0]?.id || '', nozzleNo: 1, opening: '0' }]);
    setShowPumpModal(true);
  };

  const openEditPump = (pump: Pump) => {
    setEditingPump(pump);
    setPumpNoInput(String(pump.pumpNo));
    setPumpNameInput(pump.name);
    setPumpStatus(pump.status);
    setPumpNozzles(
      pump.nozzles.map((n) => ({
        id: n.id,
        productId: n.productId,
        nozzleNo: n.nozzleNo,
        opening: String(n.currentMeterReading || 0),
      }))
    );
    setShowPumpModal(true);
  };

  const addNozzleRow = () =>
    setPumpNozzles((prev) => [...prev, { productId: products[0]?.id || '', nozzleNo: prev.length + 1, opening: '0' }]);

  const removeNozzleRow = (i: number) =>
    setPumpNozzles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSavePump = () => {
    const pNo = parseInt(pumpNoInput, 10) || pumps.length + 1;
    const pId = editingPump?.id || `pump-${Date.now()}`;

    const mappedNozzles = pumpNozzles.map((n, idx) => {
      const prod = products.find((p) => p.id === n.productId);
      return {
        id: n.id || `noz-${pId}-${idx + 1}`,
        pumpId: pId,
        nozzleNo: n.nozzleNo || idx + 1,
        productId: n.productId,
        productName: prod?.name || 'Unknown',
        fuelCode: prod?.code || 'UNK',
        color: prod?.color || '#6B7280',
        currentMeterReading: parseFloat(n.opening) || 0,
      };
    });

    if (editingPump) {
      updatePump({
        ...editingPump,
        pumpNo: pNo,
        name: pumpNameInput,
        status: pumpStatus,
        nozzles: mappedNozzles,
      });
    } else {
      addPump({
        pumpNo: pNo,
        name: pumpNameInput,
        status: pumpStatus,
        nozzles: mappedNozzles,
      });
    }
    setShowPumpModal(false);
  };

  // ─── 3. OPERATOR / STAFF MODAL STATE (ADD & EDIT) ─────────────────────────
  const [showOpModal, setShowOpModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [opName, setOpName] = useState('');
  const [opPhone, setOpPhone] = useState('');
  const [opActive, setOpActive] = useState(true);

  const openAddOperator = () => {
    setEditingOperator(null);
    setOpName('');
    setOpPhone('');
    setOpActive(true);
    setShowOpModal(true);
  };

  const openEditOperator = (op: Operator) => {
    setEditingOperator(op);
    setOpName(op.name);
    setOpPhone(op.phone);
    setOpActive(op.active);
    setShowOpModal(true);
  };

  const handleSaveOperator = () => {
    if (!opName) return;

    if (editingOperator) {
      updateOperator({
        ...editingOperator,
        name: opName,
        phone: opPhone || '+91 98421 00000',
        dailyBata: editingOperator.dailyBata || 0,
        active: opActive,
      });
    } else {
      addOperator({
        name: opName,
        phone: opPhone || '+91 98421 00000',
        dailyBata: 0,
        active: opActive,
      });
    }
    setShowOpModal(false);
  };

  // ─── 4. EXPENSE TYPE MODAL STATE (ADD & EDIT) ─────────────────────────────
  const [showEtModal, setShowEtModal] = useState(false);
  const [editingExpenseType, setEditingExpenseType] = useState<ExpenseType | null>(null);
  const [etName, setEtName] = useState('');
  const [etCategory, setEtCategory] = useState<ExpenseType['category']>('OPERATIONAL');
  const [etActive, setEtActive] = useState(true);

  const openAddExpenseType = () => {
    setEditingExpenseType(null);
    setEtName('');
    setEtCategory('OPERATIONAL');
    setEtActive(true);
    setShowEtModal(true);
  };

  const openEditExpenseType = (et: ExpenseType) => {
    setEditingExpenseType(et);
    setEtName(et.name);
    setEtCategory(et.category);
    setEtActive(et.active !== false);
    setShowEtModal(true);
  };

  const handleSaveExpenseType = () => {
    if (!etName) return;

    if (editingExpenseType) {
      updateExpenseType({
        ...editingExpenseType,
        name: etName,
        category: etCategory,
        active: etActive,
      });
    } else {
      addExpenseType({
        name: etName,
        category: etCategory,
        active: etActive,
      });
    }
    setShowEtModal(false);
  };

  // ─── 5. CREDIT CUSTOMER MODAL STATE (ADD & EDIT) ──────────────────────────
  const [showCustModal, setShowCustModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CreditCustomer | null>(null);
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custPerson, setCustPerson] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custLimit, setCustLimit] = useState('500000');
  const [custOpening, setCustOpening] = useState('0');
  const [custVehicles, setCustVehicles] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custStatus, setCustStatus] = useState<CreditCustomer['status']>('ACTIVE');

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setCustCode('');
    setCustName('');
    setCustPerson('');
    setCustPhone('');
    setCustLimit('500000');
    setCustOpening('0');
    setCustVehicles('');
    setCustAddress('');
    setCustStatus('ACTIVE');
    setShowCustModal(true);
  };

  const openEditCustomer = (cust: CreditCustomer) => {
    setEditingCustomer(cust);
    setCustCode(cust.code);
    setCustName(cust.name);
    setCustPerson(cust.contactPerson || cust.name);
    setCustPhone(cust.phone || '');
    setCustLimit(String(cust.creditLimit));
    setCustOpening(String(cust.openingBalance || 0));
    setCustVehicles(cust.vehicleNumbers.join(', '));
    setCustAddress(cust.address || '');
    setCustStatus(cust.status);
    setShowCustModal(true);
  };

  const handleSaveCustomer = () => {
    if (!custName) return;
    const vList = custVehicles.split(',').map((v) => v.trim()).filter(Boolean);
    const limitNum = parseFloat(custLimit) || 500000;
    const openNum = parseFloat(custOpening) || 0;

    if (editingCustomer) {
      updateCustomer({
        ...editingCustomer,
        code: custCode || custName.slice(0, 4).toUpperCase(),
        name: custName,
        contactPerson: custPerson || custName,
        phone: custPhone || '+91 98421 00000',
        vehicleNumbers: vList,
        creditLimit: limitNum,
        openingBalance: openNum,
        status: custStatus,
        address: custAddress,
      });
    } else {
      addCustomer({
        code: custCode || custName.slice(0, 4).toUpperCase(),
        name: custName,
        contactPerson: custPerson || custName,
        phone: custPhone || '+91 98421 00000',
        vehicleNumbers: vList,
        creditLimit: limitNum,
        openingBalance: openNum,
        status: custStatus,
        address: custAddress,
      });
    }
    setShowCustModal(false);
  };

  // ─── Filtered Lists Based on Search ───────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const filteredPumps = useMemo(() => {
    return pumps.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.pumpNo).includes(searchQuery)
    );
  }, [pumps, searchQuery]);

  const filteredOperators = useMemo(() => {
    return operators.filter(
      (op) =>
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [operators, searchQuery]);

  const filteredExpenseTypes = useMemo(() => {
    return expenseTypes.filter(
      (et) =>
        et.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        et.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [expenseTypes, searchQuery]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );
  }, [customers, searchQuery]);

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
      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Station Masters & Configuration</Text>
           
        </View>
      </View>

      {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
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

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <Search size={15} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 1. PRODUCTS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Fuel & Lubricant Products ({filteredProducts.length})</Text>
               
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openAddProduct}>
              <PlusCircle size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No products found matching "{searchQuery}".</Text>
            </View>
          ) : (
            filteredProducts.map((prod) => {
              const isActive = prod.active !== false;
              return (
                <View key={prod.id} style={[styles.itemCard, { borderLeftColor: prod.color || colors.primary, borderLeftWidth: 4 }]}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemLeft}>
                      <View>
                        <Text style={styles.itemTitle}>{prod.name}</Text>
                        <Text style={styles.itemSub}>{prod.code} • {prod.category} • per {prod.unit}</Text>
                      </View>
                    </View>

                    {/* Right Price & Actions */}
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.statusPill, { backgroundColor: isActive ? colors.success + '20' : colors.inactiveBg, borderWidth: 1, borderColor: isActive ? colors.success + '40' : colors.inactiveBorder }]}>
                          <Text style={[styles.statusPillText, { color: isActive ? colors.success : colors.inactiveText }]}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.statusToggleBtn, { backgroundColor: isActive ? '#EF444415' : '#10B98115' }]}
                          onPress={() => toggleProductActive(prod)}
                          activeOpacity={0.7}
                        >
                          <Power size={11} color={isActive ? colors.danger : colors.success} />
                          <Text style={[styles.statusToggleText, { color: isActive ? colors.danger : colors.success }]}>
                            {isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>

                        {/* Edit Button */}
                        <TouchableOpacity style={styles.editActionBtn} onPress={() => openEditProduct(prod)}>
                          <Edit2 size={12} color={colors.primary} />
                          <Text style={styles.editActionBtnText}>Edit</Text>
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity
                          style={styles.deleteActionBtn}
                          onPress={() =>
                            promptDelete('Delete Product', `Are you sure you want to delete ${prod.name} (${prod.code})?`, () =>
                              deleteProduct(prod.id)
                            )
                          }
                        >
                          <Trash2 size={12} color={colors.danger} />
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                        <Text style={styles.bigRate}>{formatCurrency(prod.currentRate)}</Text>
                        <Text style={styles.perUnit}>/ {prod.unit}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.itemFooter}>
                    <Text style={styles.densityText}>
                      Density: {prod.standardDensityRange?.min}–{prod.standardDensityRange?.max} kg/m³
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ── 2. PUMPS & NOZZLES TAB ────────────────────────────────────────── */}
      {activeTab === 'pumps' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Pump Dispensers & Nozzle Config ({filteredPumps.length})</Text>
              <Text style={styles.sectionSub}>Manage multi-nozzle islands, electronic meter counters & statuses</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openAddPump}>
              <PlusCircle size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Pump</Text>
            </TouchableOpacity>
          </View>

          {filteredPumps.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No pumps found matching "{searchQuery}".</Text>
            </View>
          ) : (
            filteredPumps.map((pump) => {
              const statusBg =
                pump.status === 'ACTIVE'
                  ? colors.success + '20'
                  : pump.status === 'IDLE'
                  ? colors.warning + '20'
                  : pump.status === 'MAINTENANCE'
                  ? colors.upiPurple + '20'
                  : colors.inactiveBg;
              const statusColor =
                pump.status === 'ACTIVE'
                  ? colors.success
                  : pump.status === 'IDLE'
                  ? colors.warning
                  : pump.status === 'MAINTENANCE'
                  ? colors.upiPurple
                  : colors.inactiveText;

              return (
                <View key={pump.id} style={styles.itemCard}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemLeft}>
                      <Gauge size={18} color={colors.primary} />
                      <View>
                        <Text style={styles.itemTitle}>{pump.name}</Text>
                        <Text style={styles.itemSub}>Pump #{pump.pumpNo} • {pump.nozzles.length} nozzle(s)</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.statusPill, { backgroundColor: statusBg, borderWidth: 1, borderColor: statusColor + '40' }]}>
                        <Text style={[styles.statusPillText, { color: statusColor }]}>{pump.status}</Text>
                      </View>

                      <TouchableOpacity style={styles.statusToggleBtn} onPress={() => cyclePumpStatus(pump)} activeOpacity={0.7}>
                        <RefreshCw size={11} color={colors.accent} />
                        <Text style={[styles.statusToggleText, { color: colors.accent }]}>Cycle</Text>
                      </TouchableOpacity>

                      {/* Edit Pump Button */}
                      <TouchableOpacity style={styles.editActionBtn} onPress={() => openEditPump(pump)}>
                        <Edit2 size={12} color={colors.primary} />
                        <Text style={styles.editActionBtnText}>Edit</Text>
                      </TouchableOpacity>

                      {/* Delete Pump Button */}
                      <TouchableOpacity
                        style={styles.deleteActionBtn}
                        onPress={() =>
                          promptDelete('Delete Pump', `Are you sure you want to delete ${pump.name}?`, () =>
                            deletePump(pump.id)
                          )
                        }
                      >
                        <Trash2 size={12} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.nozzleList}>
                    {pump.nozzles.map((noz) => (
                      <View key={noz.id} style={styles.nozzleRow}>
                        <Text style={styles.nozzleText}>
                          Nozzle #{noz.nozzleNo} — {noz.productName} ({noz.fuelCode})
                        </Text>
                        <Text style={styles.nozzleMeter}>
                          {noz.currentMeterReading.toLocaleString('en-IN')} L
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ── 3. STAFF / OPERATORS TAB ──────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Operators & Staff Register ({filteredOperators.length})</Text>
              <Text style={styles.sectionSub}>Manage staff profiles and shift permissions</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openAddOperator}>
              <PlusCircle size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Operator</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ width: '100%', minWidth: 600 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHead, { flex: 2, minWidth: 160 }]}>NAME</Text>
                <Text style={[styles.colHead, { flex: 2, minWidth: 160 }]}>PHONE</Text>
                <Text style={[styles.colHead, { width: 100, textAlign: 'center' }]}>STATUS</Text>
                <Text style={[styles.colHead, { width: 140, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {filteredOperators.map((op) => (
                <View key={op.id} style={styles.tableRow}>
                  <View style={[styles.avatarCircle, { marginRight: 8, backgroundColor: op.active ? colors.primary + '30' : colors.inactiveBg }]}>
                    <Text style={[styles.avatarText, { color: op.active ? colors.primary : colors.inactiveText }]}>{op.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.cellPrimary, { flex: 2, minWidth: 160 }]}>{op.name}</Text>
                  <Text style={[styles.cellSecondary, { flex: 2, minWidth: 160 }]}>{op.phone}</Text>
                  <View style={{ width: 100, alignItems: 'center' }}>
                    <View style={[styles.statusPill, { width: 68, alignItems: 'center', backgroundColor: op.active ? colors.success + '20' : colors.inactiveBg, borderWidth: 1, borderColor: op.active ? colors.success + '40' : colors.inactiveBorder }]}>
                      <Text style={[styles.statusPillText, { color: op.active ? colors.success : colors.inactiveText }]}>
                        {op.active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ width: 140, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, { backgroundColor: op.active ? '#EF444415' : '#10B98115' }]}
                      onPress={() => toggleOperatorActive(op)}
                    >
                      <Power size={11} color={op.active ? colors.danger : colors.success} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.editActionBtn} onPress={() => openEditOperator(op)}>
                      <Edit2 size={12} color={colors.primary} />
                      <Text style={styles.editActionBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteActionBtn}
                      onPress={() =>
                        promptDelete('Delete Operator', `Are you sure you want to delete ${op.name}?`, () =>
                          deleteOperator(op.id)
                        )
                      }
                    >
                      <Trash2 size={12} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── 4. EXPENSE HEADS TAB ──────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Expense Heads & Categories ({filteredExpenseTypes.length})</Text>
              <Text style={styles.sectionSub}>Custom  cash voucher heads and active billing accounts</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openAddExpenseType}>
              <PlusCircle size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Head</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipGrid}>
            {filteredExpenseTypes.map((et) => {
              const isActive = et.active !== false;
              const catColors: Record<string, string> = {
                STAFF: colors.primary,
                OPERATIONAL: colors.accent,
                FINANCIAL: colors.cashGreen,
                MAINTENANCE: colors.warning,
              };
              const col = catColors[et.category] || colors.textMuted;
              return (
                <View key={et.id} style={[styles.etChip, { borderColor: isActive ? col + '60' : colors.inactiveBorder, backgroundColor: isActive ? colors.surfaceCard : colors.inactiveBg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.etChipName, !isActive && { color: colors.inactiveText }]}>{et.name}</Text>
                    <Text style={[styles.etChipCat, { color: isActive ? col : colors.inactiveMuted }]}>{et.category}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity onPress={() => toggleExpenseTypeActive(et)} style={{ padding: 4 }}>
                        <Power size={11} color={isActive ? colors.danger : colors.success} />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.editActionMiniBtn} onPress={() => openEditExpenseType(et)}>
                        <Edit2 size={11} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteActionMiniBtn}
                        onPress={() =>
                          promptDelete('Delete Expense Head', `Are you sure you want to delete ${et.name}?`, () =>
                            deleteExpenseType(et.id)
                          )
                        }
                      >
                        <Trash2 size={11} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.statusPill, { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: isActive ? colors.success + '20' : colors.inactiveBg }]}>
                      <Text style={[styles.statusPillText, { fontSize: 8, color: isActive ? colors.success : colors.inactiveText }]}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── 5. CREDIT CUSTOMERS TAB ───────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Credit Customer Accounts ({filteredCustomers.length})</Text>
              <Text style={styles.sectionSub}>Registered credit parties, sanctioned limits, vehicle fleets and statuses</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openAddCustomer}>
              <PlusCircle size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ width: '100%', minWidth: 780 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHead, { width: 70 }]}>CODE</Text>
                <Text style={[styles.colHead, { width: 170 }]}>NAME</Text>
                <Text style={[styles.colHead, { width: 120 }]}>PHONE</Text>
                <Text style={[styles.colHead, { width: 120, textAlign: 'right' }]}>CREDIT LIMIT</Text>
                <Text style={[styles.colHead, { width: 120, textAlign: 'right' }]}>OUTSTANDING</Text>
                <Text style={[styles.colHead, { width: 80, textAlign: 'center' }]}>STATUS</Text>
                <Text style={[styles.colHead, { width: 140, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {filteredCustomers.map((c) => (
                <View key={c.id} style={styles.tableRow}>
                  <Text style={[styles.cellMono, { width: 70, color: colors.primary }]}>{c.code}</Text>
                  <View style={{ width: 170 }}>
                    <Text style={styles.cellPrimary}>{c.name}</Text>
                    <Text style={styles.cellSub}>{c.vehicleNumbers.length} vehicle(s)</Text>
                  </View>
                  <Text style={[styles.cellSecondary, { width: 120 }]}>{c.phone || '-'}</Text>
                  <Text style={[styles.cellMono, { width: 120, textAlign: 'right' }]}>
                    {formatCurrency(c.creditLimit)}
                  </Text>
                  <Text
                    style={[
                      styles.cellMono,
                      {
                        width: 120,
                        textAlign: 'right',
                        color: c.outstandingBalance > 0 ? colors.danger : colors.cashGreen,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {formatCurrency(c.outstandingBalance)}
                  </Text>

                  <View style={{ width: 80, alignItems: 'center' }}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          width: 68,
                          alignItems: 'center',
                          backgroundColor:
                            c.status === 'ACTIVE'
                              ? colors.success + '20'
                              : c.status === 'HOLD'
                              ? colors.warning + '20'
                              : colors.danger + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              c.status === 'ACTIVE'
                                ? colors.success
                                : c.status === 'HOLD'
                                ? colors.warning
                                : colors.danger,
                          },
                        ]}
                      >
                        {c.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ width: 140, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    <TouchableOpacity style={styles.statusToggleBtn} onPress={() => cycleCustomerStatus(c)}>
                      <RefreshCw size={11} color={colors.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.editActionBtn} onPress={() => openEditCustomer(c)}>
                      <Edit2 size={12} color={colors.primary} />
                      <Text style={styles.editActionBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteActionBtn}
                      onPress={() =>
                        promptDelete('Delete Customer', `Are you sure you want to delete ${c.name} (${c.code})?`, () =>
                          deleteCustomer(c.id)
                        )
                      }
                    >
                      <Trash2 size={12} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── MODAL 1: PRODUCT (ADD & EDIT) ─────────────────────────────────── */}
      <Modal visible={showProdModal} transparent animationType="slide" onRequestClose={() => setShowProdModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity onPress={() => setShowProdModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Product Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={prodName}
                    onChangeText={setProdName}
                    placeholder="e.g. Motor Spirit (Petrol)"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Short Code *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={prodCode}
                      onChangeText={setProdCode}
                      placeholder="e.g. MS"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Selling Rate (₹/L) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={prodRate}
                      onChangeText={setProdRate}
                      placeholder="e.g. 102.50"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <DropdownPicker
                      label="Category"
                      placeholder="Select Category..."
                      options={productCategoryOptions.length > 0 ? productCategoryOptions : [
                        { label: 'Fuel', value: 'FUEL' },
                        { label: 'Lubricant', value: 'LUBRICANT' },
                      ]}
                      value={prodCategory}
                      onChange={(v) => setProdCategory(v as 'FUEL' | 'LUBRICANT')}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Unit</Text>
                    <View style={styles.radioRow}>
                      {(['Litre', 'Can'] as const).map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.radioBtn, prodUnit === u && styles.radioBtnActive]}
                          onPress={() => setProdUnit(u)}
                        >
                          <Text style={[styles.radioBtnText, prodUnit === u && styles.radioBtnTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Min Density (kg/m³)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={prodDensityMin}
                      onChangeText={setProdDensityMin}
                      placeholder="820"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Max Density (kg/m³)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={prodDensityMax}
                      onChangeText={setProdDensityMax}
                      placeholder="845"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Badge Color</Text>
                  <View style={styles.colorPickerRow}>
                    {PROD_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.colorCircle, { backgroundColor: c }, prodColor === c && styles.colorCircleActive]}
                        onPress={() => setProdColor(c)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProdModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                <CheckCircle2 size={15} color="#000" />
                <Text style={styles.saveBtnText}>{editingProduct ? 'Update Product' : 'Save Product'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: PUMP (ADD & EDIT) ────────────────────────────────────── */}
      <Modal visible={showPumpModal} transparent animationType="slide" onRequestClose={() => setShowPumpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPump ? 'Edit Dispenser Island' : 'Add Pump Dispenser'}</Text>
              <TouchableOpacity onPress={() => setShowPumpModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Pump Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={pumpNoInput}
                      onChangeText={setPumpNoInput}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 2 }]}>
                    <Text style={styles.formLabel}>Dispenser Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={pumpNameInput}
                      onChangeText={setPumpNameInput}
                      placeholder="Pump 1 (Front Island)"
                    />
                  </View>
                </View>

                {/* Nozzle Setup */}
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.formLabel}>Assigned Nozzles ({pumpNozzles.length})</Text>
                    <TouchableOpacity onPress={addNozzleRow}>
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>+ Add Nozzle</Text>
                    </TouchableOpacity>
                  </View>

                  {pumpNozzles.map((noz, idx) => (
                    <View key={idx} style={styles.nozzleInputRow}>
                      <Text style={styles.nozzleInputIdx}>#{idx + 1}</Text>
                      <View style={{ flex: 2 }}>
                        <DropdownPicker
                          placeholder="Select Fuel Product..."
                          options={products.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))}
                          value={noz.productId}
                          onChange={(v) => {
                            const updated = [...pumpNozzles];
                            updated[idx].productId = v;
                            setPumpNozzles(updated);
                          }}
                        />
                      </View>
                      <View style={{ flex: 1.5 }}>
                        <TextInput
                          style={styles.textInput}
                          value={noz.opening}
                          onChangeText={(txt) => {
                            const updated = [...pumpNozzles];
                            updated[idx].opening = txt;
                            setPumpNozzles(updated);
                          }}
                          placeholder="Meter (L)"
                          keyboardType="numeric"
                        />
                      </View>
                      {pumpNozzles.length > 1 && (
                        <TouchableOpacity onPress={() => removeNozzleRow(idx)} style={{ padding: 4 }}>
                          <X size={15} color={colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPumpModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePump}>
                <CheckCircle2 size={15} color="#000" />
                <Text style={styles.saveBtnText}>{editingPump ? 'Update Pump' : 'Save Pump'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: OPERATOR (ADD & EDIT) ────────────────────────────────── */}
      <Modal visible={showOpModal} transparent animationType="slide" onRequestClose={() => setShowOpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingOperator ? 'Edit Staff Profile' : 'Add New Operator'}</Text>
              <TouchableOpacity onPress={() => setShowOpModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Staff Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={opName}
                  onChangeText={setOpName}
                  placeholder="e.g. Ramesh Kumar"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={opPhone}
                  onChangeText={setOpPhone}
                  placeholder="+91 98421 00000"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowOpModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveOperator}>
                <CheckCircle2 size={15} color="#000" />
                <Text style={styles.saveBtnText}>{editingOperator ? 'Update Staff' : 'Save Staff'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: EXPENSE HEAD (ADD & EDIT) ────────────────────────────── */}
      <Modal visible={showEtModal} transparent animationType="slide" onRequestClose={() => setShowEtModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingExpenseType ? 'Edit Expense Head' : 'Add Expense Head'}</Text>
              <TouchableOpacity onPress={() => setShowEtModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Expense Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={etName}
                  onChangeText={setEtName}
                  placeholder="e.g. Generator Diesel"
                />
              </View>

              <View style={styles.formGroup}>
                <DropdownPicker
                  label="Category"
                  placeholder="Select Category..."
                  options={expenseCategoryOptions.length > 0 ? expenseCategoryOptions : [
                    { label: 'Operational', value: 'OPERATIONAL' },
                    { label: 'Staff', value: 'STAFF' },
                    { label: 'Financial', value: 'FINANCIAL' },
                    { label: 'Maintenance', value: 'MAINTENANCE' },
                  ]}
                  value={etCategory}
                  onChange={(v) => setEtCategory(v as ExpenseType['category'])}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEtModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveExpenseType}>
                <CheckCircle2 size={15} color="#000" />
                <Text style={styles.saveBtnText}>{editingExpenseType ? 'Update Head' : 'Save Head'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 5: CUSTOMER (ADD & EDIT) ────────────────────────────────── */}
      <Modal visible={showCustModal} transparent animationType="slide" onRequestClose={() => setShowCustModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCustomer ? 'Edit Credit Customer' : 'Add Credit Customer'}</Text>
              <TouchableOpacity onPress={() => setShowCustModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Customer Code</Text>
                    <TextInput
                      style={styles.textInput}
                      value={custCode}
                      onChangeText={setCustCode}
                      placeholder="e.g. CUST-01"
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 2 }]}>
                    <Text style={styles.formLabel}>Party / Company Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={custName}
                      onChangeText={setCustName}
                      placeholder="e.g. SRS Logistics Pvt Ltd"
                    />
                  </View>
                </View>

                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={custPhone}
                      onChangeText={setCustPhone}
                      placeholder="+91 98421 00000"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Credit Limit (₹) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={custLimit}
                      onChangeText={setCustLimit}
                      placeholder="500000"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Vehicle Numbers (Comma separated)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={custVehicles}
                    onChangeText={setCustVehicles}
                    placeholder="KA-01-AB-1234, KA-01-CD-5678"
                  />
                </View>

                <View style={styles.formGroup}>
                  <DropdownPicker
                    label="Account Status"
                    placeholder="Select Status..."
                    options={customerStatusOptions.length > 0 ? customerStatusOptions : [
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'On Hold', value: 'HOLD' },
                      { label: 'Blocked', value: 'BLOCKED' },
                      { label: 'Inactive', value: 'INACTIVE' },
                    ]}
                    value={custStatus}
                    onChange={(v) => setCustStatus(v as CreditCustomer['status'])}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCustModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomer}>
                <CheckCircle2 size={15} color="#000" />
                <Text style={styles.saveBtnText}>{editingCustomer ? 'Update Party' : 'Save Party'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── GLOBAL DELETE CONFIRMATION MODAL ──────────────────────────────── */}
      <Modal visible={deleteConfirm.visible} transparent animationType="fade" onRequestClose={() => setDeleteConfirm((p) => ({ ...p, visible: false }))}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.deleteWarningIconBox}>
                <AlertTriangle size={20} color={colors.danger} />
              </View>
              <Text style={styles.modalTitle}>{deleteConfirm.title}</Text>
            </View>

            <Text style={styles.deleteConfirmMessage}>{deleteConfirm.message}</Text>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteConfirm((p) => ({ ...p, visible: false }))}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={deleteConfirm.onConfirm}>
                <Trash2 size={14} color="#FFF" />
                <Text style={styles.deleteConfirmBtnText}>Delete Permanently</Text>
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
    paddingBottom: 50,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  screenTitle: {
    color: '#000',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // ── Tabs ───────────────────────────────────────────────────────────────────
  tabBarScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  tabBtn: {
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
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: '#00000025',
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  countTextActive: {
    color: '#000',
  },

  // ── Search Bar ─────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: '#000',
  },

  // ── Section Card ───────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Item Card (Products & Pumps) ───────────────────────────────────────────
  itemCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  itemTitle: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  itemSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  bigRate: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  perUnit: {
    color: colors.textMuted,
    fontSize: 10,
  },
  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border + '60',
    paddingTop: 6,
  },
  densityText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: typography.monoFont,
  },

  // ── Action Buttons (Edit / Delete / Toggle) ────────────────────────────────
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  editActionBtnText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  deleteActionBtn: {
    backgroundColor: colors.danger + '15',
    padding: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionMiniBtn: {
    backgroundColor: colors.primary + '15',
    padding: 4,
    borderRadius: 4,
  },
  deleteActionMiniBtn: {
    backgroundColor: colors.danger + '15',
    padding: 4,
    borderRadius: 4,
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusToggleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // ── Nozzle Rows in Pump Card ───────────────────────────────────────────────
  nozzleList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  nozzleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  nozzleText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  nozzleMeter: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: typography.monoFont,
  },

  // ── Table Styles (Staff & Customers) ───────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  colHead: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cellPrimary: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  cellSecondary: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  cellSub: {
    color: colors.textMuted,
    fontSize: 10,
  },
  cellMono: {
    fontSize: 11,
    fontFamily: typography.monoFont,
  },

  // ── Expense Chips Grid ─────────────────────────────────────────────────────
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  etChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 180,
    flex: 1,
  },
  etChipName: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  etChipCat: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },

  // ── Modal Styles ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: 14,
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
    fontWeight: '800',
  },
  modalBody: {
    gap: 10,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: '#000',
    fontSize: 12,
  },
  dualFormRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  radioBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  radioBtnTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: '#000',
  },
  nozzleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  nozzleInputIdx: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    width: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Delete Confirmation Styles ─────────────────────────────────────────────
  deleteWarningIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmMessage: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  deleteConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  deleteConfirmBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
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
  MoreVertical,
  Search,
  Building,
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
  Hash,
  Layers,
  Percent,
  Calendar,
  AlertCircle,
  Briefcase,
  CreditCard,
  Droplets,
} from 'lucide-react';
import { useMastersContext } from '../context/MastersContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatRate } from '../utils/formatters';
import { ExpenseType, Product, Pump, Operator, CreditCustomer, Branch } from '../types';

import { DropdownPicker } from '../components/DropdownPicker';
import { StatusDropdownBadge } from '../components/StatusDropdownBadge';
import {
  useProductCategories,
  useExpenseCategories,
  usePumpStatuses,
  useCustomerStatuses,
  useStaffStatuses,
  useStaffRoles,
  useUnitsOfMeasure,
  useBranchStatuses,
  useProductStatuses,
  useExpenseStatuses,
} from '../hooks/useMasters';

type TabId = 'branches' | 'products' | 'pumps' | 'staff' | 'expenses' | 'customers';

export const MastersScreen: React.FC = () => {
  const {
    branches, addBranch, updateBranch, deleteBranch, products, pumps, operators, expenseTypes, customers,
    addOperator, updateOperator, deleteOperator,
    addPump, updatePump, deletePump,
    addProduct, updateProduct, deleteProduct,
    addExpenseType, updateExpenseType, deleteExpenseType,
    addCustomer, updateCustomer, deleteCustomer,
    role,
  } = useMastersContext();

  // ── Master table lookups (API-backed dropdowns) ───────────────────
  const { options: productCategoryOptions } = useProductCategories();
  const { options: expenseCategoryOptions } = useExpenseCategories();
  const { options: pumpStatusOptions } = usePumpStatuses();
  const { options: customerStatusOptions } = useCustomerStatuses();
  const { options: staffStatusOptions } = useStaffStatuses();
  const { options: staffRoleOptions } = useStaffRoles();
  const { options: unitOfMeasureOptions } = useUnitsOfMeasure();
  const { options: branchStatusOptions } = useBranchStatuses();
  const { options: productStatusOptions } = useProductStatuses();
  const { options: expenseStatusOptions } = useExpenseStatuses();

  const [activeTab, setActiveTab] = useState<TabId>('branches');
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
  const toggleBranchActive = (b: Branch) => {
    updateBranch({ ...b, is_active: !b.is_active });
  };

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

  const getAutoProductColor = (name: string, code: string, category?: string, index?: number): string => {
    const n = (name + ' ' + code).toUpperCase();
    if (n.includes('PETROL') || n.includes('MS') || n.includes('MOTOR SPIRIT') || n.includes('GASOLINE')) return '#EF4444'; // Red
    if (n.includes('DIESEL') || n.includes('HSD') || n.includes('HIGH SPEED')) return '#3B82F6'; // Blue
    if (n.includes('SPEED') || n.includes('XP') || n.includes('POWER') || n.includes('PREMIUM') || n.includes('V-POWER')) return '#10B981'; // Emerald
    if (n.includes('CNG') || n.includes('GAS')) return '#F59E0B'; // Amber
    if (n.includes('LPG') || n.includes('AUTOLPG')) return '#8B5CF6'; // Purple
    if (category === 'LUBRICANT' || n.includes('LUBE') || n.includes('OIL') || n.includes('MAK') || n.includes('SERVO')) return '#EC4899'; // Pink/Rose
    
    const palette = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6'];
    const idx = typeof index === 'number' ? index : Math.abs((name + code).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return palette[idx % palette.length];
  };

  // ─── 0. BRANCH MODAL STATE ────────────────────────────────────────────────
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchForm, setBranchForm] = useState<{
    name: string;
    location: string;
    dealer_code: string;
    omc_brand: 'IOCL' | 'BPCL' | 'HPCL' | 'NAYARA' | 'RELIANCE';
    gstin?: string;
    operating_hours?: string;
    contact_email?: string;
    address_street?: string;
    pincode?: string;
    manager_name?: string;
    manager_phone?: string;
    manager_email?: string;
    manager_access?: string;
  }>({
    name: '',
    location: '',
    dealer_code: '',
    omc_brand: 'BPCL',
    gstin: '',
    operating_hours: '',
    contact_email: '',
    address_street: '',
    pincode: '',
    manager_name: '',
    manager_phone: '',
    manager_email: '',
    manager_access: 'Full Operational Access',
  });

  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      location: '',
      dealer_code: '',
      omc_brand: 'BPCL',
      gstin: '',
      operating_hours: '',
      contact_email: '',
      address_street: '',
      pincode: '',
      manager_name: '',
      manager_phone: '',
      manager_email: '',
      manager_access: 'Full Operational Access',
    });
    setShowBranchModal(true);
  };

  const openEditBranch = (b: any) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name || '',
      location: b.location || '',
      dealer_code: b.dealer_code || '',
      omc_brand: b.omc_brand || 'BPCL',
      gstin: b.gstin || '',
      operating_hours: b.operating_hours || '',
      contact_email: b.contact_email || '',
      address_street: b.address_street || '',
      pincode: b.pincode || '',
      manager_name: b.manager_name || '',
      manager_phone: b.manager_phone || '',
      manager_email: b.manager_email || '',
      manager_access: b.manager_access || 'Full Operational Access',
    });
    setShowBranchModal(true);
  };

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) {
      Alert.alert('Validation', 'Please enter a branch name.');
      return;
    }
    try {
      if (editingBranch) {
        await updateBranch({ ...editingBranch, ...branchForm });
      } else {
        await addBranch(branchForm);
      }
      setShowBranchModal(false);
    } catch {
      Alert.alert('Error', 'Could not save branch.');
    }
  };

  // ─── 1. PRODUCT MODAL STATE (ADD & EDIT) ──────────────────────────────────
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodUnit, setProdUnit] = useState<'Litre' | 'Can' | 'Kg' | 'Piece'>('Litre');
  const [prodCategory, setProdCategory] = useState<'FUEL' | 'LUBRICANT'>('FUEL');
  const [prodRate, setProdRate] = useState('');
  const [prodHsnCode, setProdHsnCode] = useState('2710');
  const [prodGstRate, setProdGstRate] = useState('0');
  const [prodTankCapacity, setProdTankCapacity] = useState('20000');
  const [prodDensityStd, setProdDensityStd] = useState('750');
  const [prodDensityMin, setProdDensityMin] = useState('720');
  const [prodDensityMax, setProdDensityMax] = useState('775');
  const [prodActive, setProdActive] = useState(true);

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCode('');
    setProdUnit('Litre');
    setProdCategory('FUEL');
    setProdRate('');
    setProdHsnCode('2710');
    setProdGstRate('0');
    setProdTankCapacity('20000');
    setProdDensityStd('750');
    setProdDensityMin('720');
    setProdDensityMax('775');
    setProdActive(true);
    setShowProdModal(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCode(prod.code);
    setProdUnit((prod.unit as any) || 'Litre');
    setProdCategory((prod.category as any) || 'FUEL');
    setProdRate(String(prod.currentRate || ''));
    setProdHsnCode(prod.hsnCode || '2710');
    setProdGstRate(String(prod.gstRate ?? 0));
    setProdTankCapacity(String(prod.tankCapacity || 20000));
    setProdDensityStd(String(prod.densityStandardAt15C || 750));
    setProdDensityMin(String(prod.standardDensityRange?.min || 720));
    setProdDensityMax(String(prod.standardDensityRange?.max || 775));
    setProdActive(prod.active !== false);
    setShowProdModal(true);
  };

  const handleSaveProduct = () => {
    if (!prodName.trim() || !prodCode.trim() || !prodRate.trim()) {
      Alert.alert('Validation', 'Please enter Product Name, Code, and Selling Rate.');
      return;
    }
    const rateNum = parseFloat(prodRate) || 0;
    const gstNum = parseFloat(prodGstRate) || 0;
    const capNum = parseFloat(prodTankCapacity) || 0;
    const stdDensityNum = parseFloat(prodDensityStd) || 750;
    const minD = parseInt(prodDensityMin, 10) || 720;
    const maxD = parseInt(prodDensityMax, 10) || 775;

    const autoColor = editingProduct?.color || getAutoProductColor(prodName.trim(), prodCode.trim(), prodCategory, products.length);

    const payload = {
      name: prodName.trim(),
      code: prodCode.trim().toUpperCase(),
      unit: prodUnit,
      category: prodCategory,
      currentRate: rateNum,
      hsnCode: prodHsnCode.trim(),
      gstRate: gstNum,
      tankCapacity: capNum,
      densityStandardAt15C: stdDensityNum,
      color: autoColor,
      standardDensityRange: { min: minD, max: maxD },
      active: prodActive,
    };

    if (editingProduct) {
      updateProduct({ ...editingProduct, ...payload });
    } else {
      addProduct(payload);
    }
    setShowProdModal(false);
  };

  // ─── 2. PUMP & NOZZLES MODAL STATE (ADD & EDIT) ───────────────────────────
  const [showPumpModal, setShowPumpModal] = useState(false);
  const [editingPump, setEditingPump] = useState<Pump | null>(null);
  const [pumpNoInput, setPumpNoInput] = useState(String(pumps.length + 1));
  const [pumpNameInput, setPumpNameInput] = useState(`Pump ${pumps.length + 1}`);
  const [pumpModel, setPumpModel] = useState('Midco MPD Duo Plus');
  const [pumpSerialNo, setPumpSerialNo] = useState('');
  const [pumpMake, setPumpMake] = useState('Midco');
  const [pumpInstallDate, setPumpInstallDate] = useState('2023-01-15');
  const [pumpTankLink, setPumpTankLink] = useState('Tank 1 (HSD) / Tank 2 (MS)');
  const [pumpSide, setPumpSide] = useState('Dual Side');
  const [pumpStatus, setPumpStatus] = useState<'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'INACTIVE'>('ACTIVE');
  const [pumpNozzles, setPumpNozzles] = useState<{ id?: string; productId: string; nozzleNo: number; opening: string }[]>([
    { productId: products[0]?.id || '', nozzleNo: 1, opening: '0' },
  ]);

  const openAddPump = () => {
    setEditingPump(null);
    setPumpNoInput(String(pumps.length + 1));
    setPumpNameInput(`Pump ${pumps.length + 1}`);
    setPumpModel('Midco MPD Duo Plus');
    setPumpSerialNo(`SN-MDC-${Date.now().toString().slice(-4)}`);
    setPumpMake('Midco');
    setPumpInstallDate('2023-01-15');
    setPumpTankLink('Tank 1 (HSD) / Tank 2 (MS)');
    setPumpSide('Dual Side');
    setPumpStatus('ACTIVE');
    setPumpNozzles([{ productId: products[0]?.id || '', nozzleNo: 1, opening: '0' }]);
    setShowPumpModal(true);
  };

  const openEditPump = (pump: Pump) => {
    setEditingPump(pump);
    setPumpNoInput(String(pump.pumpNo));
    setPumpNameInput(pump.name);
    setPumpModel(pump.model || 'Midco MPD Duo Plus');
    setPumpSerialNo(pump.serialNumber || '');
    setPumpMake(pump.makeModel || 'Midco');
    setPumpInstallDate(pump.installationDate || '2023-01-15');
    setPumpTankLink(pump.tankId || 'Tank 1');
    setPumpSide(pump.side || 'Dual Side');
    setPumpStatus((pump.status as any) || 'ACTIVE');
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
        color: prod?.color || '#3B82F6',
        currentMeterReading: parseFloat(n.opening) || 0,
        status: 'ACTIVE' as const,
      };
    });

    const payload = {
      pumpNo: pNo,
      name: pumpNameInput.trim(),
      model: pumpModel.trim(),
      serialNumber: pumpSerialNo.trim(),
      makeModel: pumpMake.trim(),
      installationDate: pumpInstallDate,
      tankId: pumpTankLink.trim(),
      side: pumpSide.trim(),
      status: pumpStatus as any,
      nozzles: mappedNozzles,
    };

    if (editingPump) {
      updatePump({ ...editingPump, ...payload });
    } else {
      addPump(payload);
    }
    setShowPumpModal(false);
  };

  // ─── 3. OPERATOR / STAFF MODAL STATE (ADD & EDIT) ─────────────────────────
  const [showOpModal, setShowOpModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [opName, setOpName] = useState('');
  const [opPhone, setOpPhone] = useState('');
  const [opCode, setOpCode] = useState('');
  const [opAadhaar, setOpAadhaar] = useState('');
  const [opSalary, setOpSalary] = useState('18000');
  const [opJoinDate, setOpJoinDate] = useState('2023-06-01');
  const [opEmergency, setOpEmergency] = useState('');
  const [opShift, setOpShift] = useState('Morning');
  const [opActive, setOpActive] = useState(true);

  const openAddOperator = () => {
    setEditingOperator(null);
    setOpName('');
    setOpPhone('');
    setOpCode(`EMP-${operators.length + 101}`);
    setOpAadhaar('');
    setOpSalary('18000');
    setOpJoinDate('2023-06-01');
    setOpEmergency('');
    setOpShift('Morning');
    setOpActive(true);
    setShowOpModal(true);
  };

  const openEditOperator = (op: Operator) => {
    setEditingOperator(op);
    setOpName(op.name);
    setOpPhone(op.phone || '');
    setOpCode(op.employeeCode || `EMP-${op.id.slice(-3)}`);
    setOpAadhaar(op.aadhaarNo || '');
    setOpSalary(String(op.monthlySalary || 18000));
    setOpJoinDate(op.joiningDate || '2023-06-01');
    setOpEmergency(op.emergencyContact || '');
    setOpShift(op.assignedShift || 'Morning');
    setOpActive(op.active);
    setShowOpModal(true);
  };

  const handleSaveOperator = () => {
    if (!opName.trim()) {
      Alert.alert('Validation', 'Please enter Staff Name.');
      return;
    }

    const payload = {
      name: opName.trim(),
      phone: opPhone.trim() || '+91 98421 00000',
      employeeCode: opCode.trim(),
      aadhaarNo: opAadhaar.trim(),
      monthlySalary: parseFloat(opSalary) || 18000,
      joiningDate: opJoinDate,
      emergencyContact: opEmergency.trim(),
      assignedShift: opShift,
      active: opActive,
    };

    if (editingOperator) {
      updateOperator({ ...editingOperator, ...payload });
    } else {
      addOperator(payload);
    }
    setShowOpModal(false);
  };

  // ─── 4. EXPENSE HEAD (ADD & EDIT) ─────────────────────────────────────────
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
    if (!etName.trim()) {
      Alert.alert('Validation', 'Please enter Expense Head Name.');
      return;
    }

    if (editingExpenseType) {
      updateExpenseType({
        ...editingExpenseType,
        name: etName.trim(),
        category: etCategory,
        active: etActive,
      });
    } else {
      addExpenseType({
        name: etName.trim(),
        category: etCategory,
        active: etActive,
      });
    }
    setShowEtModal(false);
  };

  // ─── 5. CREDIT CUSTOMER (ADD & EDIT) ──────────────────────────────────────
  const [showCustModal, setShowCustModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CreditCustomer | null>(null);
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custPerson, setCustPerson] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [custPan, setCustPan] = useState('');
  const [custLimit, setCustLimit] = useState('500000');
  const [custOpening, setCustOpening] = useState('0');
  const [custPeriodDays, setCustPeriodDays] = useState('15');
  const [custDiscount, setCustDiscount] = useState('0');
  const [custMaxVehicles, setCustMaxVehicles] = useState('10');
  const [custVehicles, setCustVehicles] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custBillingAddress, setCustBillingAddress] = useState('');
  const [custStatus, setCustStatus] = useState<CreditCustomer['status']>('ACTIVE');

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setCustCode(`CUST-${customers.length + 101}`);
    setCustName('');
    setCustPerson('');
    setCustPhone('');
    setCustEmail('');
    setCustGstin('');
    setCustPan('');
    setCustLimit('500000');
    setCustOpening('0');
    setCustPeriodDays('15');
    setCustDiscount('0');
    setCustMaxVehicles('10');
    setCustVehicles('');
    setCustAddress('');
    setCustBillingAddress('');
    setCustStatus('ACTIVE');
    setShowCustModal(true);
  };

  const openEditCustomer = (cust: CreditCustomer) => {
    setEditingCustomer(cust);
    setCustCode(cust.code || '');
    setCustName(cust.name);
    setCustPerson(cust.contactPerson || cust.name);
    setCustPhone(cust.phone || '');
    setCustEmail(cust.email || '');
    setCustGstin(cust.gstin || '');
    setCustPan(cust.panNumber || '');
    setCustLimit(String(cust.creditLimit || 500000));
    setCustOpening(String(cust.openingBalance || 0));
    setCustPeriodDays(String(cust.creditPeriodDays || 15));
    setCustDiscount(String(cust.discountPerLitre || 0));
    setCustMaxVehicles(String(cust.maxVehiclesAllowed || 10));
    setCustVehicles((cust.vehicleNumbers || []).join(', '));
    setCustAddress(cust.address || '');
    setCustBillingAddress(cust.billingAddress || cust.address || '');
    setCustStatus((cust.status as any) || 'ACTIVE');
    setShowCustModal(true);
  };

  const handleSaveCustomer = () => {
    if (!custName.trim()) {
      Alert.alert('Validation', 'Please enter Party / Company Name.');
      return;
    }
    const vList = custVehicles.split(',').map((v) => v.trim()).filter(Boolean);
    const limitNum = parseFloat(custLimit) || 500000;
    const openNum = parseFloat(custOpening) || 0;
    const daysNum = parseInt(custPeriodDays, 10) || 15;
    const discNum = parseFloat(custDiscount) || 0;
    const maxVNum = parseInt(custMaxVehicles, 10) || 10;

    const payload = {
      code: custCode.trim() || custName.slice(0, 4).toUpperCase(),
      name: custName.trim(),
      contactPerson: custPerson.trim() || custName.trim(),
      phone: custPhone.trim() || '+91 98421 00000',
      email: custEmail.trim(),
      gstin: custGstin.trim(),
      panNumber: custPan.trim().toUpperCase(),
      creditPeriodDays: daysNum,
      discountPerLitre: discNum,
      maxVehiclesAllowed: maxVNum,
      vehicleNumbers: vList,
      creditLimit: limitNum,
      openingBalance: openNum,
      status: custStatus,
      address: custAddress.trim(),
      billingAddress: custBillingAddress.trim() || custAddress.trim(),
    };

    if (editingCustomer) {
      updateCustomer({ ...editingCustomer, ...payload });
    } else {
      addCustomer(payload);
    }
    setShowCustModal(false);
  };

  // ─── Filtered Lists Based on Search ───────────────────────────────────────
  const filteredBranches = useMemo(() => {
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.dealer_code && b.dealer_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.location && b.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.manager_name && b.manager_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [branches, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.hsnCode && p.hsnCode.includes(searchQuery))
    );
  }, [products, searchQuery]);

  const filteredPumps = useMemo(() => {
    return pumps.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.pumpNo).includes(searchQuery) ||
        (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.serialNumber && p.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [pumps, searchQuery]);

  const filteredOperators = useMemo(() => {
    return operators.filter(
      (op) =>
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (op.phone && op.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (op.employeeCode && op.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [operators, searchQuery]);

  const filteredExpenseTypes = useMemo(() => {
    return expenseTypes.filter(
      (et) =>
        et.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (et.category && et.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [expenseTypes, searchQuery]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [customers, searchQuery]);

  const tabs: { id: TabId; label: string; icon: any; count: number }[] = [
    { id: 'branches', label: 'Stations & Outlets', icon: Building, count: branches.length },
    { id: 'products', label: 'Fuel & Products', icon: Fuel, count: products.length },
    { id: 'pumps', label: 'Dispensers & Nozzles', icon: Gauge, count: pumps.length },
    { id: 'staff', label: 'Staff & Operators', icon: Users, count: operators.length },
    { id: 'expenses', label: 'Expense Heads', icon: Tag, count: expenseTypes.length },
    { id: 'customers', label: 'Credit Parties', icon: Truck, count: customers.length },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* ── Header Toolbar ─────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.titleWrap}>
          <Text style={styles.screenTitle}>Station Masters</Text>
        </View>

        <View style={styles.topActionsRow}>
          {activeTab === 'branches' && (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={openAddBranch} activeOpacity={0.85}>
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Station</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'products' && (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={openAddProduct} activeOpacity={0.85}>
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Product</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'pumps' && (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={openAddPump} activeOpacity={0.85}>
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Dispenser</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'staff' && (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={openAddOperator} activeOpacity={0.85}>
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Staff</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'expenses' && (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={openAddExpenseType} activeOpacity={0.85}>
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Expense Head</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'customers' && (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={openAddCustomer} activeOpacity={0.85}>
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Customer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Modern Segmented Tabs Bar ─────────────────────────────────────── */}
      <View style={styles.tabContainer}>
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
                activeOpacity={0.75}
              >
                <Icon size={14} color={isActive ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>{tab.count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Search & Filter Controls ──────────────────────────────────────── */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search across ${tabs.find((t) => t.id === activeTab)?.label.toLowerCase()}...`}
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
      </View>

      {/* ── 0. BRANCHES / STATIONS TAB ────────────────────────────────────── */}
      {activeTab === 'branches' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Station Outlets ({filteredBranches.length})</Text>
          </View>

          {filteredBranches.length === 0 ? (
            <View style={styles.emptyBox}>
              <AlertCircle size={24} color={colors.textMuted} />
              <Text style={styles.emptyText}>No station outlets found.</Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {filteredBranches.map((b) => (
                <View key={b.id} style={[styles.branchCard, !b.is_active && { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', opacity: 0.85 }]}>
                  <View style={styles.branchCardTop}>
                    <View style={styles.branchCardHeaderLeft}>
                      <View style={[styles.brandBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                        <Text style={styles.brandBadgeText}>{b.omc_brand}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.branchName} numberOfLines={1}>{b.name}</Text>
                        <Text style={styles.branchLocation} numberOfLines={1}>
                          {b.location} {b.dealer_code ? `· RO: ${b.dealer_code}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.branchActionsRight}>
                      <StatusDropdownBadge
                        currentStatus={b.is_active ? 'ACTIVE' : 'INACTIVE'}
                        options={branchStatusOptions}
                        onSelect={(newStatus) => {
                          const isAct = newStatus === 'ACTIVE';
                          updateBranch({ ...b, is_active: isAct });
                        }}
                      />

                      <TouchableOpacity
                        style={styles.actionBtnIcon}
                        onPress={() => openEditBranch(b)}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={13} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnIcon}
                        onPress={() => promptDelete('Delete Station Outlet', `Are you sure you want to delete station "${b.name}"? This action cannot be undone.`, () => deleteBranch(b.id))}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={13} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Regulatory & Operating Meta */}
                  <View style={styles.branchMetaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>GSTIN</Text>
                      <Text style={styles.metaValue}>{b.gstin || '33AAAAA0000A1Z5'}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Operating Hours</Text>
                      <Text style={styles.metaValue}>{b.operating_hours || '24 Hours'}</Text>
                    </View>
                  </View>

                  {/* Manager Access Bottom Row */}
                  <View style={styles.branchManagerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <User size={13} color={colors.primary} />
                      <Text style={styles.managerNameText} numberOfLines={1}>
                        {b.manager_name || 'Station Manager'}
                        {b.manager_phone ? ` (${b.manager_phone})` : ''}
                      </Text>
                    </View>
                    <View style={styles.accessLevelBadge}>
                      <Text style={styles.accessLevelText}>{b.manager_access || 'Full Operational'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── 1. PRODUCTS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}> Products ({filteredProducts.length})</Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <AlertCircle size={24} color={colors.textMuted} />
              <Text style={styles.emptyText}>No products found matching "{searchQuery}".</Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {filteredProducts.map((prod) => {
                const isActive = prod.active !== false;
                return (
                  <View
                    key={prod.id}
                    style={[
                      styles.productCard,
                      { borderTopColor: isActive ? (prod.color || colors.primary) : '#94A3B8' },
                      !isActive && { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.prodCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.prodColorCircle, { backgroundColor: prod.color || colors.primary }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.prodName}>{prod.name}</Text>
                          <Text style={styles.prodMeta}>{prod.code} · HSN: {prod.hsnCode || '2710'} · {prod.category}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <StatusDropdownBadge
                          currentStatus={isActive ? 'ACTIVE' : 'INACTIVE'}
                          options={productStatusOptions}
                          onSelect={(newStatus) => {
                            const isAct = newStatus === 'ACTIVE';
                            updateProduct({ ...prod, active: isAct });
                          }}
                        />

                        <TouchableOpacity
                          style={styles.actionBtnIcon}
                          onPress={() => openEditProduct(prod)}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={13} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnIcon}
                          onPress={() => promptDelete('Delete Product', `Delete ${prod.name}?`, () => deleteProduct(prod.id))}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={13} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Pricing & Stock Specs */}
                    <View style={styles.prodMetricsRow}>
                      <View style={styles.prodMetricBox}>
                        <Text style={styles.prodMetricLbl}>SELLING RSP</Text>
                        <Text style={styles.prodMetricVal}>{formatRate(prod.currentRate)}/{prod.unit}</Text>
                      </View>

                      <View style={styles.prodMetricBox}>
                        <Text style={styles.prodMetricLbl}>STORAGE CAP</Text>
                        <Text style={styles.prodMetricVal}>{prod.tankCapacity ? `${prod.tankCapacity.toLocaleString()} L` : '—'}</Text>
                      </View>
                    </View>

                    <View style={styles.prodCardFooter}>
                      <Text style={styles.prodDensityTxt}>
                        Standard Density (15°C): {prod.densityStandardAt15C || 750} kg/m³ ({prod.standardDensityRange?.min}–{prod.standardDensityRange?.max})
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── 2. PUMPS & NOZZLES TAB ────────────────────────────────────────── */}
      {activeTab === 'pumps' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Pumps & Nozzles ({filteredPumps.length})</Text>
          </View>

          {filteredPumps.length === 0 ? (
            <View style={styles.emptyBox}>
              <AlertCircle size={24} color={colors.textMuted} />
              <Text style={styles.emptyText}>No dispensers found.</Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {filteredPumps.map((pump) => {
                const isActive = pump.status === 'ACTIVE';
                const statusColor = pump.status === 'ACTIVE' ? colors.success : pump.status === 'MAINTENANCE' ? colors.warning : colors.inactiveGrey;
                return (
                  <View
                    key={pump.id}
                    style={[styles.pumpCard, pump.status === 'INACTIVE' && { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', opacity: 0.85 }]}
                  >
                    <View style={styles.pumpCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.pumpIconCircle, { backgroundColor: colors.primaryLight }]}>
                          <Gauge size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pumpTitle}>{pump.name}</Text>
                          <Text style={styles.pumpSubtitle}>{pump.model || 'Midco MPD Multi-Product'} · SN: {pump.serialNumber || 'SN-001'}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <StatusDropdownBadge
                          currentStatus={pump.status || 'ACTIVE'}
                          options={pumpStatusOptions}
                          onSelect={(newStatus) => {
                            updatePump({ ...pump, status: newStatus as any });
                          }}
                        />

                        <TouchableOpacity
                          style={styles.actionBtnIcon}
                          onPress={() => openEditPump(pump)}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={13} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnIcon}
                          onPress={() => promptDelete('Delete Pump', `Delete dispenser ${pump.name}?`, () => deletePump(pump.id))}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={13} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Hardware Specifications */}
                    <View style={styles.pumpSpecsRow}>
                      <View style={styles.specItem}>
                        <Text style={styles.specLbl}>Make</Text>
                        <Text style={styles.specVal}>{pump.makeModel || 'Midco'}</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLbl}>Installation Date</Text>
                        <Text style={styles.specVal}>{pump.installationDate || '2023-01-15'}</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLbl}>Assigned Tank</Text>
                        <Text style={styles.specVal}>{pump.tankId || 'Tank 1'}</Text>
                      </View>
                    </View>

                    {/* Nozzle Chips */}
                    <View style={styles.nozzlesRow}>
                      {pump.nozzles?.map((noz) => {
                        const prod = products.find((p) => p.id === noz.productId);
                        const prodCol = prod?.color || colors.primary;
                        return (
                          <View key={noz.id} style={[styles.nozChip, { borderColor: prodCol + '40', backgroundColor: prodCol + '10' }]}>
                            <View style={[styles.nozDot, { backgroundColor: prodCol }]} />
                            <Text style={styles.nozNum}>Nozzle {noz.nozzleNo}</Text>
                            <Text style={[styles.nozCode, { color: prodCol }]}>{prod?.code || 'FUEL'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── 3. STAFF / OPERATORS TAB ──────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Operators & Staff ({filteredOperators.length})</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHead, { width: 100 }]}>EMP ID</Text>
                <Text style={[styles.colHead, { flex: 2, minWidth: 160 }]}>NAME</Text>
                <Text style={[styles.colHead, { width: 130 }]}>PHONE</Text>
                <Text style={[styles.colHead, { width: 130, textAlign: 'right' }]}>BASE SALARY</Text>
                <Text style={[styles.colHead, { width: 100, textAlign: 'center' }]}>SHIFT</Text>
                <Text style={[styles.colHead, { width: 180, textAlign: 'right' }]}>STATUS & ACTIONS</Text>
              </View>

              {filteredOperators.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No operators registered.</Text>
                </View>
              ) : (
                filteredOperators.map((op, idx) => {
                  const isActive = op.status === 'ACTIVE' || (op.active !== false && op.status !== 'INACTIVE');
                  return (
                    <View key={op.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt, !isActive && { opacity: 0.8 }]}>
                      <Text style={[styles.cellTextMono, { width: 100 }]}>{op.employeeCode || `EMP-${op.id.slice(-3)}`}</Text>
                      <View style={{ flex: 2, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>{op.name.charAt(0)}</Text>
                        </View>
                        <Text style={styles.cellBoldText}>{op.name}</Text>
                      </View>
                      <Text style={[styles.cellText, { width: 130 }]}>{op.phone || '—'}</Text>
                      <Text style={[styles.cellTextMono, { width: 130, textAlign: 'right' }]}>{formatCurrency(op.monthlySalary || 18000)}</Text>
                      <Text style={[styles.cellText, { width: 100, textAlign: 'center' }]}>{op.assignedShift || 'Morning'}</Text>
                      <View style={{ width: 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <StatusDropdownBadge
                          currentStatus={(op.status as any) || (isActive ? 'ACTIVE' : 'INACTIVE')}
                          options={staffStatusOptions}
                          onSelect={(newStatus) => {
                            updateOperator({ ...op, status: newStatus as any, active: newStatus === 'ACTIVE' });
                          }}
                          size="sm"
                        />

                        <TouchableOpacity style={styles.actionBtnIcon} onPress={() => openEditOperator(op)} activeOpacity={0.7}>
                          <Edit2 size={13} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnIcon} onPress={() => promptDelete('Delete Staff', `Delete ${op.name}?`, () => deleteOperator(op.id))} activeOpacity={0.7}>
                          <Trash2 size={13} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── 4. EXPENSE HEADS TAB ──────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Expense Heads & Categories ({filteredExpenseTypes.length})</Text>
          </View>

          <View style={styles.expenseGrid}>
            {filteredExpenseTypes.map((et) => {
              const isActive = et.active !== false;
              const catColors: Record<string, string> = {
                STAFF: colors.primary,
                OPERATIONAL: colors.accent,
                FINANCIAL: colors.cashGreen,
                MAINTENANCE: colors.warning,
              };
              const col = (et.category && catColors[et.category]) ? catColors[et.category] : colors.textMuted;
              return (
                <View key={et.id} style={[styles.expenseCard, { borderLeftColor: col }, !isActive && { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', opacity: 0.85 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseName}>{et.name}</Text>
                    <View style={[styles.catPill, { backgroundColor: col + '15' }]}>
                      <Text style={[styles.catPillText, { color: col }]}>{et.category || 'General'}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <StatusDropdownBadge
                      currentStatus={isActive ? 'ACTIVE' : 'INACTIVE'}
                      options={expenseStatusOptions}
                      onSelect={(newStatus) => {
                        const isAct = newStatus === 'ACTIVE';
                        updateExpenseType({ ...et, active: isAct });
                      }}
                      size="sm"
                    />

                    <TouchableOpacity style={styles.actionBtnIcon} onPress={() => openEditExpenseType(et)} activeOpacity={0.7}>
                      <Edit2 size={13} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnIcon} onPress={() => promptDelete('Delete Head', `Delete ${et.name}?`, () => deleteExpenseType(et.id))} activeOpacity={0.7}>
                      <Trash2 size={13} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── 5. CREDIT CUSTOMERS TAB ───────────────────────────────── */}
      {activeTab === 'customers' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Credit Parties & Corporate Accounts ({filteredCustomers.length})</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHead, { width: 90 }]}>CODE</Text>
                <Text style={[styles.colHead, { width: 200 }]}>PARTY NAME</Text>
                <Text style={[styles.colHead, { width: 140 }]}>GSTIN / PAN</Text>
                <Text style={[styles.colHead, { width: 130 }]}>CONTACT PERSON</Text>
                <Text style={[styles.colHead, { width: 120, textAlign: 'right' }]}>CREDIT LIMIT</Text>
                <Text style={[styles.colHead, { width: 120, textAlign: 'right' }]}>OUTSTANDING</Text>
                <Text style={[styles.colHead, { width: 80, textAlign: 'center' }]}>TERMS</Text>
                <Text style={[styles.colHead, { width: 180, textAlign: 'right' }]}>STATUS & ACTIONS</Text>
              </View>

              {filteredCustomers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No credit accounts found.</Text>
                </View>
              ) : (
                filteredCustomers.map((c, idx) => (
                  <View key={c.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt, c.status === 'INACTIVE' && { opacity: 0.8 }]}>
                    <Text style={[styles.cellTextMono, { width: 90 }]}>{c.code || `CUST-${idx + 1}`}</Text>
                    <View style={{ width: 200 }}>
                      <Text style={styles.cellBoldText} numberOfLines={1}>{c.name}</Text>
                      <Text style={styles.cellSubText} numberOfLines={1}>{c.phone || 'No phone'}</Text>
                    </View>
                    <View style={{ width: 140 }}>
                      <Text style={styles.cellTextMono} numberOfLines={1}>{c.gstin || '33AAAAA0000A1Z5'}</Text>
                      <Text style={styles.cellSubText}>{c.panNumber || 'AAAAA0000A'}</Text>
                    </View>
                    <Text style={[styles.cellText, { width: 130 }]} numberOfLines={1}>{c.contactPerson || c.name}</Text>
                    <Text style={[styles.cellTextMono, { width: 120, textAlign: 'right' }]}>{formatCurrency(c.creditLimit || 500000)}</Text>
                    <Text style={[styles.cellTextMono, { width: 120, textAlign: 'right', color: c.outstandingBalance > 0 ? colors.danger : colors.textPrimary }]}>
                      {formatCurrency(c.outstandingBalance)}
                    </Text>
                    <Text style={[styles.cellText, { width: 80, textAlign: 'center' }]}>{c.creditPeriodDays || 15}d</Text>
                    <View style={{ width: 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <StatusDropdownBadge
                        currentStatus={c.status || 'ACTIVE'}
                        options={customerStatusOptions}
                        onSelect={(newStatus) => {
                          updateCustomer({ ...c, status: newStatus as any });
                        }}
                        size="sm"
                      />

                      <TouchableOpacity style={styles.actionBtnIcon} onPress={() => openEditCustomer(c)} activeOpacity={0.7}>
                        <Edit2 size={13} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtnIcon} onPress={() => promptDelete('Delete Customer', `Delete ${c.name}?`, () => deleteCustomer(c.id))} activeOpacity={0.7}>
                        <Trash2 size={13} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── MODAL 0: BRANCH (ADD & EDIT) ─────────────────────────────────── */}
      <Modal visible={showBranchModal} transparent animationType="fade" onRequestClose={() => setShowBranchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingBranch ? 'Edit Station Outlet' : 'Register New Station Outlet'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBranchModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 540 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>

                <Text style={styles.formSectionHeading}>1. STATION DETAILS</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Station / Bunk Name *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={branchForm.name}
                    onChangeText={(t) => setBranchForm({ ...branchForm, name: t })}
                    placeholder="Bunk Name"
                  />
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>OMC Brand *</Text>
                    <View style={styles.brandRowOptions}>
                      {(['IOCL', 'BPCL', 'HPCL', 'NAYARA', 'RELIANCE'] as const).map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.brandOptionPill, branchForm.omc_brand === b && styles.brandOptionPillActive]}
                          onPress={() => setBranchForm({ ...branchForm, omc_brand: b })}
                        >
                          <Text style={[styles.brandOptionPillText, branchForm.omc_brand === b && styles.brandOptionPillTextActive]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Dealer / RO Code *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchForm.dealer_code}
                      onChangeText={(t) => setBranchForm({ ...branchForm, dealer_code: t })}
                      placeholder=""
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>City / Location *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchForm.location}
                      onChangeText={(t) => setBranchForm({ ...branchForm, location: t })}
                      placeholder=" "
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Pincode</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchForm.pincode}
                      onChangeText={(t) => setBranchForm({ ...branchForm, pincode: (t.replace(/[^0-9]/g, '')) })}
                      keyboardType="numeric"
                       maxLength={7}
                    />
                  </View>
                </View>

                <Text style={styles.formSectionHeading}>2. REGULATORY & OPERATING SPECS</Text>
                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Station GSTIN</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchForm.gstin}
                      onChangeText={(t) => setBranchForm({ ...branchForm, gstin: t.toUpperCase() })}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Operating Timings</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchForm.operating_hours}
                      onChangeText={(t) => setBranchForm({ ...branchForm, operating_hours: t })}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Station Official Email</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={branchForm.contact_email}
                    onChangeText={(t) => setBranchForm({ ...branchForm, contact_email: t })}
                    placeholder="email"
                    keyboardType="email-address"
                  />
                </View>

                <Text style={styles.formSectionHeading}>3. ASSIGNED MANAGER ACCESS</Text>
                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Manager Name</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchForm.manager_name}
                      onChangeText={(t) => setBranchForm({ ...branchForm, manager_name: t })}
                      placeholder="name"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Manager Phone</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchForm.manager_phone}
                      onChangeText={(t) => setBranchForm({ ...branchForm, manager_phone: t })}
                      placeholder="number"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Manager Access Permission Policy</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={branchForm.manager_access}
                    onChangeText={(t) => setBranchForm({ ...branchForm, manager_access: t })}
                    placeholder="e.g. Full Operational Access"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBranchModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBranch}>
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingBranch ? 'Update Station' : 'Register Station'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 1: PRODUCT (ADD & EDIT) ─────────────────────────────────── */}
      <Modal visible={showProdModal} transparent animationType="fade" onRequestClose={() => setShowProdModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Fuel size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProdModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 540 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>

                <Text style={styles.formSectionHeading}>1. PRODUCT IDENTIFICATION</Text>
                
                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Product Name *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={prodName}
                      onChangeText={setProdName}
                      placeholder="name"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Short Code *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={prodCode}
                      onChangeText={setProdCode}
                      placeholder=""
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
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
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Unit of Measure</Text>
                    <View style={styles.brandRowOptions}>
                      {(['Litre', 'Can', 'Kg', 'Piece'] as const).map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.brandOptionPill, prodUnit === u && styles.brandOptionPillActive]}
                          onPress={() => setProdUnit(u)}
                        >
                          <Text style={[styles.brandOptionPillText, prodUnit === u && styles.brandOptionPillTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={styles.formSectionHeading}>2. PRICING, TAX & INVENTORY</Text>
                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Selling RSP (₹/Unit) *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={prodRate}
                      onChangeText={setProdRate}
                      placeholder=""
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>GST Rate(%) </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={prodGstRate}
                      onChangeText={setProdGstRate}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>HSN Code (%)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={prodGstRate}
                      onChangeText={setProdGstRate}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Dedicated Tank Capacity (L)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={prodTankCapacity}
                      onChangeText={setProdTankCapacity}
                      placeholder="e.g. 30000"
                      keyboardType="numeric"
                    />
                  </View>
                </View> */}

                <Text style={styles.formSectionHeading}>3. QUALITY & DENSITY LIMITS</Text>
                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Standard 15°C Density (kg/m³)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={prodDensityStd}
                      onChangeText={setProdDensityStd}
                      placeholder="750"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Density Range (Min - Max)</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        style={[styles.fieldInput, { flex: 1 }]}
                        value={prodDensityMin}
                        onChangeText={setProdDensityMin}
                        placeholder="Min"
                        keyboardType="numeric"
                      />
                      {/* <TextInput
                        style={[styles.fieldInput, { flex: 1 }]}
                        value={prodDensityMax}
                        onChangeText={setProdDensityMax}
                        placeholder="Max"
                        keyboardType="numeric"
                      /> */}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProdModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingProduct ? 'Update Product' : 'Save Product'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: PUMP (ADD & EDIT) ────────────────────────────────────── */}
      <Modal visible={showPumpModal} transparent animationType="fade" onRequestClose={() => setShowPumpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Gauge size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingPump ? 'Edit Pump Dispenser' : 'Add Pump Dispenser'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPumpModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 540 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>

                <Text style={styles.formSectionHeading}>1. DISPENSER DETAILS</Text>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Pump Number *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpNoInput}
                      onChangeText={setPumpNoInput}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Dispenser Title *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpNameInput}
                      onChangeText={setPumpNameInput}
                      placeholder="e.g. Main Forecourt Pump 1"
                    />
                  </View>
                </View>

                {/* <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Make / Manufacturer</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpMake}
                      onChangeText={setPumpMake}
                      placeholder="e.g. Midco / Tokheim / Gilbarco"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Model</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpModel}
                      onChangeText={setPumpModel}
                      placeholder="e.g. MPD Duo Plus"
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Machine Serial No</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpSerialNo}
                      onChangeText={setPumpSerialNo}
                      placeholder="e.g. MDC-2023-8821"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Installation Date</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpInstallDate}
                      onChangeText={setPumpInstallDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Assigned Tank Pipeline</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpTankLink}
                      onChangeText={setPumpTankLink}
                      placeholder="e.g. Tank 1 (HSD) / Tank 2 (MS)"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Lane / Dispenser Side</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pumpSide}
                      onChangeText={setPumpSide}
                      placeholder="e.g. Dual Side / Lane 1"
                    />
                  </View>
                </View> */}

                <Text style={styles.formSectionHeading}>2. NOZZLE CONFIGURATION</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.fieldLabel}>Configured Nozzles ({pumpNozzles.length})</Text>
                  <TouchableOpacity onPress={addNozzleRow}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Add Nozzle</Text>
                  </TouchableOpacity>
                </View>

                {pumpNozzles.map((noz, idx) => (
                  <View key={idx} style={styles.nozzleConfigRow}>
                    <Text style={styles.nozzleIdxBadge}>#{idx + 1}</Text>
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
                        style={styles.fieldInput}
                        value={noz.opening}
                        onChangeText={(txt) => {
                          const updated = [...pumpNozzles];
                          updated[idx].opening = txt;
                          setPumpNozzles(updated);
                        }}
                        placeholder="Opening Meter (L)"
                        keyboardType="numeric"
                      />
                    </View>
                    {pumpNozzles.length > 1 && (
                      <TouchableOpacity onPress={() => removeNozzleRow(idx)} style={styles.removeNozBtn}>
                        <X size={14} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPumpModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePump}>
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingPump ? 'Update Dispenser' : 'Save Dispenser'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: OPERATOR (ADD & EDIT) ────────────────────────────────── */}
      <Modal visible={showOpModal} transparent animationType="fade" onRequestClose={() => setShowOpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingOperator ? 'Edit Staff Profile' : 'Register New Staff Member'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOpModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 540 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>

                <Text style={styles.formSectionHeading}>1. PERSONAL & CONTACT DETAILS</Text>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Staff Full Name *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={opName}
                      onChangeText={setOpName}
                      placeholder="name"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Employee Code</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={opCode}
                      onChangeText={setOpCode}
                      placeholder=""
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Mobile Phone *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={opPhone}
                      onChangeText={(t) => setOpPhone(t.replace(/[^0-9+ ]/g, ''))}
                      placeholder="number"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Aadhaar / Gov ID No</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={opAadhaar}
                      onChangeText={setOpAadhaar}
                      placeholder="Gov ID No"
                    />
                  </View>
                </View>

                <Text style={styles.formSectionHeading}>2. COMPENSATION & SHIFT PREFERENCES</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Base Monthly Salary (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={opSalary}
                    onChangeText={setOpSalary}
                    placeholder=" "
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Assigned Shift Type</Text>
                    <View style={styles.brandRowOptions}>
                      {['Morning', 'Evening', 'Night', 'Rotating'].map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.brandOptionPill, opShift === s && styles.brandOptionPillActive]}
                          onPress={() => setOpShift(s)}
                        >
                          <Text style={[styles.brandOptionPillText, opShift === s && styles.brandOptionPillTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Emergency Phone</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={opEmergency}
                      onChangeText={setOpEmergency}
                      placeholder="Emergency number"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowOpModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveOperator}>
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingOperator ? 'Update Staff' : 'Save Staff'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: EXPENSE HEAD (ADD & EDIT) ────────────────────────────── */}
      <Modal visible={showEtModal} transparent animationType="fade" onRequestClose={() => setShowEtModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Tag size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingExpenseType ? 'Edit Expense Head' : 'Add Expense Head'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEtModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 540 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Expense Head Name *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={etName}
                    onChangeText={setEtName}
                    placeholder=" "
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
                    value={etCategory || 'OPERATIONAL'}
                    onChange={(v) => setEtCategory(v as any)}
                  />
                </View>
              </View>
            </ScrollView>


            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEtModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveExpenseType}>
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingExpenseType ? 'Update Head' : 'Save Head'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 5: CUSTOMER (ADD & EDIT) ────────────────────────────────── */}
      <Modal visible={showCustModal} transparent animationType="fade" onRequestClose={() => setShowCustModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Truck size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingCustomer ? 'Edit Credit Party' : 'Add Credit Customer Account'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCustModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 540 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>

                <Text style={styles.formSectionHeading}>1. PARTY IDENTIFICATION</Text>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Party / Company Name *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custName}
                      onChangeText={setCustName}
                      placeholder="company name"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Customer Code</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custCode}
                      onChangeText={setCustCode}
                      placeholder=""
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Contact Person</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custPerson}
                      onChangeText={setCustPerson}
                      placeholder=""
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Mobile Phone *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custPhone}
                      onChangeText={(t) => setCustPhone(t.replace(/[^0-9+ ]/g, ''))}
                      placeholder="number"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <Text style={styles.formSectionHeading}>2. TAX & CREDIT LIMIT TERMS</Text>
                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Party GSTIN</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custGstin}
                      onChangeText={(t) => setCustGstin(t.toUpperCase())}
                      placeholder=" "
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>PAN Number</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custPan}
                      onChangeText={(t) => setCustPan(t.toUpperCase())}
                      placeholder=" "
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Sanctioned Credit Limit (₹) *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custLimit}
                      onChangeText={setCustLimit}
                      placeholder=" "
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Payment Term (Days)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custPeriodDays}
                      onChangeText={setCustPeriodDays}
                      placeholder="15"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Special Fuel Concession (₹/L)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custDiscount}
                      onChangeText={setCustDiscount}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Max Fleet Vehicles Allowed</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={custMaxVehicles}
                      onChangeText={setCustMaxVehicles}
                      placeholder="10"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.formSectionHeading}>3. FLEET VEHICLES & BILLING ADDRESS</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Registered Vehicle Numbers (Comma-separated)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={custVehicles}
                    onChangeText={setCustVehicles}
                    placeholder=" "
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Billing / Invoicing Address</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={custBillingAddress}
                    onChangeText={setCustBillingAddress}
                    placeholder=""
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
                    value={custStatus || 'ACTIVE'}
                    onChange={(v) => setCustStatus(v as any)}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCustModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomer}>
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingCustomer ? 'Update Party' : 'Save Party'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE CONFIRMATION DIALOG ────────────────────────────────────── */}
      <Modal visible={deleteConfirm.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 380 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.deleteWarningCircle}>
                <Trash2 size={22} color={colors.danger} />
              </View>
              <Text style={styles.deleteConfirmTitle}>{deleteConfirm.title}</Text>
              <Text style={styles.deleteConfirmMsg}>{deleteConfirm.message}</Text>
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteConfirm((p) => ({ ...p, visible: false }))}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={deleteConfirm.onConfirm}
              >
                <Text style={styles.deleteConfirmBtnText}>Confirm Delete</Text>
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
    paddingBottom: 60,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
  },

  // ── Header Toolbar ────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#6F7BF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 4,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#6F7BF5',
    shadowColor: '#6F7BF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  countTextActive: {
    color: '#6F7BF5',
  },

  // ── Search Bar ────────────────────────────────────────────────────────────
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DCE6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },

  // ── Section Cards & Grids ─────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardsGrid: {
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // ── Branch Card ───────────────────────────────────────────────────────────
  branchCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    overflow: 'visible',
    position: 'relative',
  },
  branchCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  branchCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  brandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  branchName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  branchLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  branchActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  deleteIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  branchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 16,
  },
  metaCol: {
    minWidth: 100,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  branchManagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  managerNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  accessLevelBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  accessLevelText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Product Card ──────────────────────────────────────────────────────────
  productCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    overflow: 'visible',
    position: 'relative',
  },
  prodCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prodColorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  prodMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  prodMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prodMetricBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    padding: 8,
  },
  prodMetricLbl: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  prodMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  prodCardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
  },
  prodDensityTxt: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // ── Pump Card ─────────────────────────────────────────────────────────────
  pumpCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    overflow: 'visible',
    position: 'relative',
  },
  pumpCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pumpIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pumpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pumpSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  pumpSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    padding: 8,
    gap: 16,
    flexWrap: 'wrap',
  },
  specItem: {
    minWidth: 90,
  },
  specLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  specVal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  nozzlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  nozChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nozDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nozNum: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  nozCode: {
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Expense Grid ──────────────────────────────────────────────────────────
  expenseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  expenseCard: {
    width: '48%',
    minWidth: 220,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Tables ────────────────────────────────────────────────────────────────
  tableContainer: {
    width: '100%',
    minWidth: 800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colHead: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  tableRowAlt: {
    backgroundColor: '#FAFCFE',
  },
  cellBoldText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cellText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cellSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  cellTextMono: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.monoFont,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  actionBtnIcon: {
    padding: 5,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
  },

  // ── Status Badges & Dropdowns ─────────────────────────────────────────────
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  moreActionBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
  },
  actionDropdown: {
    position: 'absolute',
    right: 0,
    top: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 99999,
    zIndex: 99999,
  },
  actionDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 4,
  },
  actionDropText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  // ── Modals & Forms ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalCardWide: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 18,
    gap: 10,
  },
  formSectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 4,
  },
  formGrid2: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  brandRowOptions: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  brandOptionPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  brandOptionPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  brandOptionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  brandOptionPillTextActive: {
    color: colors.primary,
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  colorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  nozzleConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  nozzleIdxBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    width: 20,
  },
  removeNozBtn: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
    backgroundColor: colors.surfaceElevated,
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 40,
    borderWidth: 0,
    backgroundColor: '#6C757D',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#0D63B8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // ── Delete Confirmation Dialog ────────────────────────────────────────────
  deleteWarningCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1E4E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  deleteConfirmTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  deleteConfirmMsg: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  deleteConfirmBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 40,
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
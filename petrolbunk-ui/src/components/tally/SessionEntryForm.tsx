import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Operator, Pump } from "../../types";

type ShiftType = "MORNING" | "EVENING" | "NIGHT";

interface FormData {
  operatorId: string;
  pumpId: string;
  shiftType: ShiftType;
  timeIn: string;
  timeOut: string;
  cash: string;
  card: string;
  gpay: string;
  phonepe: string;
  paytm: string;
  fleet: string;
  creditSales: string;
  advanceAmount: string;
  actualCashHandover: string;
  notes: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  operators: Operator[];
  pumps: Pump[];
  businessDate: string;
  initialData?: Partial<FormData>;
  sessionId?: string;
}

const SHIFT_OPTIONS: ShiftType[] = ["MORNING", "EVENING", "NIGHT"];
const SHIFT_LABELS: Record<ShiftType, string> = {
  MORNING: "Morning",
  EVENING: "Evening",
  NIGHT: "Night",
};



function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  hint,
  readonly = false,
}: any) {
  return (
    <View style={fStyles.field}>
      <Text style={fStyles.label}>{label}</Text>
      {hint && <Text style={fStyles.hint}>{hint}</Text>}
      <TextInput
        style={[fStyles.input, readonly && fStyles.readonlyInput]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        editable={!readonly}
        placeholderTextColor="#475569"
      />
    </View>
  );
}

const fStyles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { color: "#475569", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  hint: { color: "#94A3B8", fontSize: 10, marginBottom: 3 },
  input: {
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  readonlyInput: { backgroundColor: "#F8FAFC", color: "#64748B", borderColor: "#E2E8F0" },
});


export default function SessionEntryForm({
  visible,
  onClose,
  onSave,
  operators,
  pumps,
  businessDate,
  initialData,
  sessionId,
}: Props) {
  const [form, setForm] = useState<FormData>({
    operatorId: "",
    pumpId: "",
    shiftType: "MORNING",
    timeIn: "",
    timeOut: "",
    cash: "",
    card: "",
    gpay: "",
    phonepe: "",
    paytm: "",
    fleet: "",
    creditSales: "",
    advanceAmount: "",
    actualCashHandover: "",
    notes: "",
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => parseFloat(s || "0") || 0;
  const totalSales =
    num(form.cash) +
    num(form.card) +
    num(form.gpay) +
    num(form.phonepe) +
    num(form.paytm) +
    num(form.fleet) +
    num(form.creditSales);
  const expectedCash = num(form.cash) - num(form.advanceAmount);
  const cashVariance = form.actualCashHandover
    ? num(form.actualCashHandover) - expectedCash
    : null;

  function set(key: keyof FormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.operatorId) {
      setError("Select an operator");
      return;
    }
    if (!form.pumpId) {
      setError("Select a pump");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSave({
        attribution_date: businessDate,
        operator_id: form.operatorId,
        pump_id: form.pumpId,
        shift_type: form.shiftType,
        time_in: form.timeIn || null,
        time_out: form.timeOut || null,
        cash_collected: num(form.cash),
        card_collected: num(form.card),
        gpay_collected: num(form.gpay),
        phone_pay_collected: num(form.phonepe),
        paytm_collected: num(form.paytm),
        fleet_card_collected: num(form.fleet),
        credit_sales: num(form.creditSales),
        advance_amount: num(form.advanceAmount),
        actual_cash_handover: form.actualCashHandover
          ? num(form.actualCashHandover)
          : null,
        notes: form.notes || null,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>
            {sessionId ? "Edit Session" : "+ New Operator Session"}
          </Text>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >

            {/* Operator picker */}
            <Text style={fStyles.label}>Operator</Text>
            <ScrollView horizontal style={styles.chipRow} showsHorizontalScrollIndicator={false}>
              {operators.map((op) => (
                <TouchableOpacity
                  key={op.id}
                  style={[styles.chip, form.operatorId === op.id && styles.chipActive]}
                  onPress={() => set("operatorId", op.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.operatorId === op.id && styles.chipTextActive,
                    ]}
                  >
                    {op.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Pump picker */}
            <Text style={[fStyles.label, { marginTop: 8 }]}>Pump</Text>
            <ScrollView horizontal style={styles.chipRow} showsHorizontalScrollIndicator={false}>
              {pumps.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, form.pumpId === p.id && styles.chipActive]}
                  onPress={() => set("pumpId", p.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.pumpId === p.id && styles.chipTextActive,
                    ]}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Shift picker */}
            <Text style={[fStyles.label, { marginTop: 8 }]}>Shift</Text>
            <View style={styles.chipRow}>
              {SHIFT_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, form.shiftType === s && styles.chipActive]}
                  onPress={() => set("shiftType", s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.shiftType === s && styles.chipTextActive,
                    ]}
                  >
                    {SHIFT_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Time In"
                  value={form.timeIn}
                  onChangeText={(v: string) => set("timeIn", v)}
                  hint="e.g. 06:00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Time Out"
                  value={form.timeOut}
                  onChangeText={(v: string) => set("timeOut", v)}
                  hint="e.g. 14:00"
                />
              </View>
            </View>

            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>TYPE A — ENTER MANUALLY</Text>
            </View>
            <Field
              label="Cash (₹)"
              value={form.cash}
              onChangeText={(v: string) => set("cash", v)}
              keyboardType="numeric"
            />
            <Field
              label="Card / Swipe (₹)"
              value={form.card}
              onChangeText={(v: string) => set("card", v)}
              keyboardType="numeric"
            />
            <Field
              label="GPay (₹)"
              value={form.gpay}
              onChangeText={(v: string) => set("gpay", v)}
              keyboardType="numeric"
            />
            <Field
              label="PhonePe (₹)"
              value={form.phonepe}
              onChangeText={(v: string) => set("phonepe", v)}
              keyboardType="numeric"
            />
            <Field
              label="Paytm (₹)"
              value={form.paytm}
              onChangeText={(v: string) => set("paytm", v)}
              keyboardType="numeric"
            />
            <Field
              label="Fleet Card (₹)"
              value={form.fleet}
              onChangeText={(v: string) => set("fleet", v)}
              keyboardType="numeric"
            />
            <Field
              label="Advance Given (₹)"
              value={form.advanceAmount}
              onChangeText={(v: string) => set("advanceAmount", v)}
              keyboardType="numeric"
            />
            <Field
              label="Actual Cash Handover (₹)"
              value={form.actualCashHandover}
              onChangeText={(v: string) => set("actualCashHandover", v)}
              keyboardType="numeric"
            />

            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>TYPE B — AUTO-FETCHED / ENTER</Text>
            </View>
            <Field
              label="Credit Sales (₹)"
              value={form.creditSales}
              onChangeText={(v: string) => set("creditSales", v)}
              keyboardType="numeric"
              hint="Auto-fetched from credit ledger if linked"
            />

            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>TYPE C — AUTO-CALCULATED</Text>
            </View>

            <Field
              label="Total Sales (₹)"
              value={totalSales.toFixed(2)}
              readonly
              hint="= Cash + Card + UPI + Fleet + Credit"
            />
            <Field
              label="Expected Cash Handover (₹)"
              value={expectedCash.toFixed(2)}
              readonly
              hint="= Cash − Advance"
            />
            {cashVariance !== null && (
              <Field
                label="Cash Variance (₹)"
                value={cashVariance.toFixed(2)}
                readonly
                hint="= Actual − Expected"
              />
            )}

            <Field
              label="Notes"
              value={form.notes}
              onChangeText={(v: string) => set("notes", v)}
            />

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>

              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    padding: 16,
    paddingBottom: 8,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  row2: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", marginBottom: 12, flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: "#3B82F6", borderColor: "#2563EB" },
  chipText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  sectionLabel: { backgroundColor: "#EFF6FF", borderRadius: 8, padding: 8, marginVertical: 10, borderWidth: 1, borderColor: "#BFDBFE" },
  sectionLabelText: { color: "#1E40AF", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelText: { color: "#475569", fontWeight: "600" },
  saveBtn: {
    flex: 2,
    padding: 14,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  error: { color: "#EF4444", textAlign: "center", marginVertical: 8, fontSize: 13 },
});


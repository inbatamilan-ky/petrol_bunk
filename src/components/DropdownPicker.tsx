import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { ChevronDown, ChevronUp, Check, Plus } from 'lucide-react';
import { colors, typography } from '../theme/colors';

export interface DropdownOption {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
  inactive?: boolean;
  disabled?: boolean;
}

export interface DropdownPickerProps {
  label?: string;
  options: DropdownOption[];
  value: string;          // currently selected value
  onChange: (value: string, label: string) => void;
  placeholder?: string;
  searchable?: boolean;
  allowOther?: boolean;   // show "Other — type custom" option
  onSaveNew?: (newLabel: string) => void; // called when user confirms a custom "Other" entry; parent saves to master
  accentColor?: string;
  maxListHeight?: number;
}

export const DropdownPicker: React.FC<DropdownPickerProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select or type…',
  allowOther = true,
  onSaveNew,
  accentColor = colors.primary,
  maxListHeight = 260,
}) => {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Sync internal display text when prop value changes
  useEffect(() => {
    if (!isTyping) {
      const match = options.find((o) => o.value === value || o.label === value);
      if (match) {
        setInputText(match.label);
      } else {
        const safeValue = typeof value === 'string' ? value : '';
        const clean = safeValue.startsWith('__other__:') ? safeValue.replace('__other__:', '') : safeValue;
        setInputText(clean);
      }
    }
  }, [value, options, isTyping]);

  const selectedOption = options.find(
    (o) => o.value === value || o.label === value || o.label.toLowerCase() === inputText.trim().toLowerCase()
  );

  // Filter options based on what is typed, or show all if match or empty
  const filteredOptions = options.filter((o) => {
    if (!inputText.trim()) return true;
    // If the input text is exactly the currently selected option, show all options
    if (selectedOption && inputText.trim().toLowerCase() === selectedOption.label.toLowerCase()) return true;
    
    return (
      o.label.toLowerCase().includes(inputText.trim().toLowerCase()) ||
      (o.subtitle ?? '').toLowerCase().includes(inputText.trim().toLowerCase())
    );
  });

  const handleSelect = (opt: DropdownOption) => {
    setIsTyping(false);
    setInputText(opt.label);
    onChange(opt.value, opt.label);
    setOpen(false);
  };

  const handleInputChange = (text: string) => {
    setIsTyping(true);
    setInputText(text);
    if (!open) setOpen(true);
    // Find exact match or pass typed string
    const match = options.find((o) => o.label.toLowerCase() === text.trim().toLowerCase());
    if (match) {
      onChange(match.value, match.label);
    } else {
      onChange(text, text);
    }
  };

  const handleInputBlur = () => {
    setIsTyping(false);
    if (inputText.trim()) {
      const match = options.find((o) => o.label.toLowerCase() === inputText.trim().toLowerCase());
      if (match) {
        setInputText(match.label);
        onChange(match.value, match.label);
      } else {
        if (onSaveNew) onSaveNew(inputText.trim());
        onChange(inputText.trim(), inputText.trim());
      }
    }
  };

  const handleOtherConfirm = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (onSaveNew) onSaveNew(trimmed);
    onChange('__other__:' + trimmed, trimmed);
    setOpen(false);
    setIsTyping(false);
  };

  const isRequired = label ? label.includes('*') : false;
  const cleanLabel = label ? label.replace('*', '').trim() : '';

  return (
    <View style={styles.wrapper}>
      {/* Label */}
      {label ? (
        <Text style={styles.label}>
          {cleanLabel}
          {isRequired ? <Text style={styles.requiredAsterisk}> *</Text> : null}
        </Text>
      ) : null}

      {/* Typable Input Box with Dropdown Toggle */}
      <View
        style={[
          styles.triggerContainer,
          open && { borderColor: accentColor, borderWidth: 1.5 },
        ]}
      >
        {selectedOption?.color ? (
          <View style={[styles.colorDot, { backgroundColor: selectedOption.color }]} />
        ) : null}

        <TextInput
          style={styles.typableInput}
          value={inputText}
          onChangeText={handleInputChange}
          onFocus={() => {
            setOpen(true);
            setIsTyping(true);
          }}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => setOpen(false)}
        />

        <TouchableOpacity
          style={styles.chevronButton}
          onPress={() => setOpen((prev) => !prev)}
          activeOpacity={0.7}
        >
          {open ? (
            <ChevronUp size={16} color={accentColor} />
          ) : (
            <ChevronDown size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Expanded Dropdown Box */}
      {open && (
        <View style={[styles.dropdownBox, { maxHeight: maxListHeight }]}>
          {/* Header prompt */}
          <View style={styles.dropdownHeaderRow}>
            <Text style={styles.dropdownHeaderText}>
              {label ? `Select ${cleanLabel}` : 'Options'}
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: maxListHeight - 40 }}
          >
            {filteredOptions.map((opt) => {
              const isSelected =
                opt.value === value ||
                opt.label === value ||
                opt.label.toLowerCase() === inputText.trim().toLowerCase();
              const isInactive = opt.inactive || opt.disabled;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowActive,
                    isInactive && { backgroundColor: '#F1F5F9', opacity: 0.75 },
                  ]}
                  onPress={() => handleSelect(opt)}
                  activeOpacity={0.7}
                >
                  {opt.color ? (
                    <View style={[styles.colorDot, { backgroundColor: isInactive ? '#64748B' : opt.color, marginRight: 8 }]} />
                  ) : null}
                  <View style={styles.optionTexts}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && { color: accentColor, fontWeight: '700' },
                        isInactive && { color: '#475569', fontWeight: '500' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {opt.subtitle ? (
                      <Text style={[styles.optionSubtitle, isInactive && { color: '#64748B' }]}>{opt.subtitle}</Text>
                    ) : null}
                  </View>
                  {isSelected && <Check size={14} color={isInactive ? '#64748B' : accentColor} />}
                </TouchableOpacity>
              );
            })}

            {/* Custom Typed Value Row if not matched in list */}
            {inputText.trim().length > 0 &&
              !options.some(
                (o) => o.label.toLowerCase() === inputText.trim().toLowerCase()
              ) && (
                <TouchableOpacity
                  style={styles.customTypedRow}
                  onPress={handleOtherConfirm}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color="#2563EB" />
                  <Text style={styles.customTypedText}>
                    Use custom value: <Text style={{ fontWeight: '700' }}>"{inputText.trim()}"</Text>
                  </Text>
                </TouchableOpacity>
              )}

            {filteredOptions.length === 0 && inputText.trim().length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No options available.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
    width: '100%',
  },
  label: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  requiredAsterisk: {
    color: '#E11D48',
    fontWeight: '700',
  },
  triggerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 40,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 8,
  },
  typableInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 9,
    paddingHorizontal: 0,
    outlineStyle: 'none' as any,
  },
  chevronButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    flexShrink: 0,
  },
  dropdownBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginTop: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  dropdownHeaderRow: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  optionRowActive: {
    backgroundColor: '#EFF6FF',
  },
  optionTexts: {
    flex: 1,
  },
  optionLabel: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '500',
  },
  optionSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  customTypedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },
  customTypedText: {
    color: '#1D4ED8',
    fontSize: 12,
  },
  emptyRow: {
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 11,
    fontStyle: 'italic',
  },
});

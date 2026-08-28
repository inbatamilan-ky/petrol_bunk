import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Check, ChevronDown } from 'lucide-react';
import { DropdownOption } from '../components/DropdownPicker';
import { colors } from '../theme/colors';

interface StatusDropdownBadgeProps {
  currentStatus: string;
  options: DropdownOption[];
  onSelect: (newStatus: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  showChevron?: boolean;
  align?: 'left' | 'right';
}

const DEFAULT_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  active:        { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' },
  inactive:      { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', dot: '#475569' },
  maintenance:   { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  idle:          { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  temp_closed:   { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', dot: '#64748B' },
  hold:          { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
  blocked:       { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', dot: '#475569' },
  open:          { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', dot: '#3B82F6' },
  completed:     { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' },
  pending_audit: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  settled:       { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' },
  pending:       { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  failed:        { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  refunded:      { bg: '#F3E8FF', text: '#7C3AED', border: '#DDD6FE', dot: '#8B5CF6' },
  confirmed:     { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' },
  in_transit:    { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  rejected:      { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  normal:        { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' },
  low_stock:     { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  critical:      { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  on_duty:       { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' },
  on_leave:      { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  suspended:     { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', dot: '#475569' },
  out_of_stock:  { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  discontinued:  { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', dot: '#475569' },
  archived:      { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', dot: '#475569' },
};

function getStatusStyle(code: string, rawColor?: string) {
  const norm = (code || '').toLowerCase().replace(/-/g, '_');
  if (norm === 'inactive' || norm === 'discontinued' || norm === 'archived') {
    return {
      bg: '#F1F5F9',
      text: '#334155',
      border: '#CBD5E1',
      dot: '#475569',
    };
  }
  if (DEFAULT_STATUS_COLORS[norm]) {
    return DEFAULT_STATUS_COLORS[norm];
  }
  if (rawColor) {
    return {
      bg: `${rawColor}15`,
      text: rawColor,
      border: `${rawColor}40`,
      dot: rawColor,
    };
  }
  return {
    bg: '#F8FAFC',
    text: '#475569',
    border: '#E2E8F0',
    dot: '#94A3B8',
  };
}

function formatStatusText(code: string): string {
  if (!code) return 'Active';
  const c = code.toUpperCase();
  if (c === 'ACTIVE') return 'Active';
  if (c === 'INACTIVE') return 'Inactive';
  if (c === 'MAINTENANCE') return 'Maintenance';
  if (c === 'IDLE') return 'Idle';
  if (c === 'HOLD') return 'Hold';
  if (c === 'BLOCKED') return 'Blocked';
  if (c === 'OPEN' || c === 'IN_PROGRESS') return 'In Progress';
  if (c === 'COMPLETED' || c === 'CLOSED') return 'Closed';
  return code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
}

const DEFAULT_STATUS_FALLBACK_OPTIONS: DropdownOption[] = [
  { label: 'Active', value: 'ACTIVE', color: '#10B981' },
  { label: 'Inactive', value: 'INACTIVE', color: '#64748B' },
];

export const StatusDropdownBadge: React.FC<StatusDropdownBadgeProps> = ({
  currentStatus,
  options,
  onSelect,
  disabled = false,
  size = 'md',
  showChevron = true,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<View>(null);

  const activeOptions = options && options.length > 0 ? options : DEFAULT_STATUS_FALLBACK_OPTIONS;

  const matchedOpt = activeOptions.find(
    (o) => o.value.toLowerCase() === (currentStatus || '').toLowerCase()
  );
  const displayLabel = matchedOpt ? matchedOpt.label : formatStatusText(currentStatus);
  const currentStyle = getStatusStyle(currentStatus, matchedOpt?.color);

  const handleOpen = () => {
    if (disabled) return;
    if (buttonRef.current && typeof buttonRef.current.measureInWindow === 'function') {
      buttonRef.current.measureInWindow((x, y, w, h) => {
        setDropdownPos({
          top: y + h + 4,
          left: align === 'right' ? Math.max(10, x + w - 160) : Math.max(10, x),
          width: 160,
        });
        setIsOpen(true);
      });
    } else {
      setIsOpen(true);
    }
  };

  const isSmall = size === 'sm';

  return (
    <View style={styles.container} ref={buttonRef} collapsable={false}>
      <TouchableOpacity
        style={[
          styles.badge,
          isSmall ? styles.badgeSm : styles.badgeMd,
          {
            backgroundColor: currentStyle.bg,
            borderColor: currentStyle.border,
          },
          disabled && styles.badgeDisabled,
        ]}
        onPress={handleOpen}
        activeOpacity={disabled ? 1 : 0.75}
        disabled={disabled}
      >
        <View style={[styles.dot, { backgroundColor: currentStyle.dot }]} />
        <Text
          style={[
            styles.badgeText,
            isSmall ? styles.badgeTextSm : styles.badgeTextMd,
            { color: currentStyle.text },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        {showChevron && !disabled && (
          <ChevronDown
            size={isSmall ? 10 : 12}
            color={currentStyle.text}
            style={{ marginLeft: 2, opacity: 0.8 }}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdownMenu,
                  dropdownPos.top > 0
                    ? {
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                      }
                    : styles.centeredMenu,
                ]}
              >
                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                  {activeOptions.map((opt) => {
                    const isSelected =
                      opt.value.toLowerCase() === (currentStatus || '').toLowerCase();
                    const optStyle = getStatusStyle(opt.value, opt.color);

                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.menuItem,
                          isSelected && styles.menuItemSelected,
                        ]}
                        onPress={() => {
                          onSelect(opt.value);
                          setIsOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.menuItemLeft}>
                          <View
                            style={[
                              styles.itemDot,
                              { backgroundColor: optStyle.dot },
                            ]}
                          />
                          <Text
                            style={[
                              styles.menuItemLabel,
                              isSelected && styles.menuItemLabelSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </View>
                        {isSelected && (
                          <Check size={14} color={colors.primary} style={{ marginLeft: 6 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    gap: 4,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    gap: 5,
  },
  badgeDisabled: {
    opacity: 0.8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontWeight: '700',
  },
  badgeTextSm: {
    fontSize: 10.5,
  },
  badgeTextMd: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  centeredMenu: {
    alignSelf: 'center',
    marginTop: '30%',
    width: 160,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 99999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginVertical: 1,
  },
  menuItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  menuItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  menuItemLabelSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
});

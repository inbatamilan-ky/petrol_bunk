/**
 * src/components/ErrorLogModal.tsx
 *
 * Dedicated, clean SaaS Error Log Viewer modal.
 * Displays all quietly caught errors, warnings, and system events
 * with stack traces, search, filter, copy, and clear controls.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  FileText,
  X,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  ErrorLogEntry,
  ErrorLogLevel,
  getErrorLogs,
  clearErrorLogs,
  subscribeErrorLogs,
} from '../services/errorLogger';
import { colors } from '../theme/colors';

interface ErrorLogModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ErrorLogModal: React.FC<ErrorLogModalProps> = ({ visible, onClose }) => {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | ErrorLogLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setLogs(getErrorLogs());
      const unsub = subscribeErrorLogs((updatedLogs) => {
        setLogs(updatedLogs);
      });
      return unsub;
    }
  }, [visible]);

  const filteredLogs = logs.filter((log) => {
    if (selectedFilter !== 'ALL' && log.level !== selectedFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSource = (log.source || '').toLowerCase().includes(q);
      const matchMsg = (log.message || '').toLowerCase().includes(q);
      const matchStack = (log.stack || '').toLowerCase().includes(q);
      return matchSource || matchMsg || matchStack;
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;
  const infoCount = logs.filter((l) => l.level === 'info').length;

  const handleCopyAll = () => {
    try {
      const textToCopy = JSON.stringify(logs, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleClear = () => {
    clearErrorLogs();
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderLevelIcon = (level: ErrorLogLevel) => {
    switch (level) {
      case 'error':
        return <AlertCircle size={15} color="#475569" />;
      case 'warn':
        return <AlertTriangle size={15} color={colors.warning} />;
      case 'info':
        return <Info size={15} color={colors.primary} />;
    }
  };

  const getLevelBadgeStyle = (level: ErrorLogLevel) => {
    switch (level) {
      case 'error':
        return { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' };
      case 'warn':
        return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
      case 'info':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.headerIconCircle}>
                <FileText size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>System Error & Event Log</Text>
                <Text style={styles.modalSubtitle}>
                  All errors are caught quietly and recorded here instead of breaking UI screens.
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Action & Filter Toolbar */}
          <View style={styles.toolbar}>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <Search size={14} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search log by source, message, stack..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textMuted}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                style={[styles.filterPill, selectedFilter === 'ALL' && styles.filterPillActive]}
                onPress={() => setSelectedFilter('ALL')}
              >
                <Text style={[styles.filterPillText, selectedFilter === 'ALL' && styles.filterPillTextActive]}>
                  All ({logs.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, selectedFilter === 'error' && styles.filterPillActive]}
                onPress={() => setSelectedFilter('error')}
              >
                <Text style={[styles.filterPillText, selectedFilter === 'error' && styles.filterPillTextActive]}>
                  Errors ({errorCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, selectedFilter === 'warn' && styles.filterPillActive]}
                onPress={() => setSelectedFilter('warn')}
              >
                <Text style={[styles.filterPillText, selectedFilter === 'warn' && styles.filterPillTextActive]}>
                  Warnings ({warnCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, selectedFilter === 'info' && styles.filterPillActive]}
                onPress={() => setSelectedFilter('info')}
              >
                <Text style={[styles.filterPillText, selectedFilter === 'info' && styles.filterPillTextActive]}>
                  Info ({infoCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.toolbarActions}>
              <TouchableOpacity
                style={styles.toolActionBtn}
                onPress={handleCopyAll}
                activeOpacity={0.7}
                disabled={logs.length === 0}
              >
                {copied ? <Check size={13} color={colors.success} /> : <Copy size={13} color={colors.textSecondary} />}
                <Text style={styles.toolActionText}>{copied ? 'Copied!' : 'Copy Logs'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolActionBtn, { borderColor: '#CBD5E1' }]}
                onPress={handleClear}
                activeOpacity={0.7}
                disabled={logs.length === 0}
              >
                <Trash2 size={13} color={colors.textSecondary} />
                <Text style={styles.toolActionText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Logs List Area */}
          <ScrollView style={styles.logListScroll} contentContainerStyle={styles.logListContent}>
            {filteredLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Check size={24} color={colors.success} />
                </View>
                <Text style={styles.emptyTitle}>Log is Clean</Text>
                <Text style={styles.emptySub}>
                  {logs.length === 0
                    ? 'No runtime errors or warnings recorded. All operations running smoothly.'
                    : 'No matching log entries found for the selected filter or search term.'}
                </Text>
              </View>
            ) : (
              filteredLogs.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const badge = getLevelBadgeStyle(entry.level);

                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.logItemCard, isExpanded && styles.logItemCardExpanded]}
                    onPress={() => toggleExpand(entry.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.logItemTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        {renderLevelIcon(entry.level)}
                        <View style={[styles.levelBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.levelBadgeText, { color: badge.text }]}>
                            {entry.level.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.sourcePill}>
                          <Text style={styles.sourcePillText}>{entry.source}</Text>
                        </View>
                        <Text style={styles.timestampText}>{entry.timestamp}</Text>
                      </View>

                      {isExpanded ? (
                        <ChevronDown size={15} color={colors.textMuted} />
                      ) : (
                        <ChevronRight size={15} color={colors.textMuted} />
                      )}
                    </View>

                    <Text style={styles.logMessageText} numberOfLines={isExpanded ? undefined : 2}>
                      {entry.message}
                    </Text>

                    {isExpanded && (
                      <View style={styles.expandedDetailsArea}>
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <View style={styles.metaSection}>
                            <Text style={styles.metaTitle}>Context Metadata:</Text>
                            <Text style={styles.codeTextMono}>
                              {JSON.stringify(entry.metadata, null, 2)}
                            </Text>
                          </View>
                        )}

                        {entry.stack && (
                          <View style={styles.metaSection}>
                            <Text style={styles.metaTitle}>Stack Trace:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <Text style={styles.codeTextMono}>{entry.stack}</Text>
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Text style={styles.footerNote}>
              Logged errors are retained locally in memory and localStorage for debugging.
            </Text>
            <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.footerCloseBtnText}>Close Log</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 820,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: colors.primaryHover,
    fontWeight: '700',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  toolActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  logListScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  logListContent: {
    padding: 16,
    gap: 8,
  },
  logItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  logItemCardExpanded: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  logItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sourcePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourcePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  timestampText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  logMessageText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 17,
    fontWeight: '500',
  },
  expandedDetailsArea: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  metaSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    gap: 4,
  },
  metaTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  codeTextMono: {
    fontFamily: 'monospace',
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 360,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  footerNote: {
    fontSize: 11,
    color: '#64748B',
  },
  footerCloseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  footerCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

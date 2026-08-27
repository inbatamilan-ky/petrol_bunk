import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Smartphone, Monitor, Database, Wifi } from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors } from '../theme/colors';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { isMobileView, toggleMobileView, apiConnected } = useBunk();

  return (
    <View style={styles.outerContainer}>
      {/* Top Viewport Control Bar */}
      <View style={styles.controlBar}>
        <View style={styles.brandBadge}>
          <View style={[styles.pulseDot, { backgroundColor: apiConnected ? colors.success : colors.warning }]} />
          <Text style={styles.brandTitle}>petrol bunk</Text>
          <Text style={styles.brandSubtitle}>React Native Web • PostgreSQL 17</Text>
          <View style={[styles.apiBadge, { backgroundColor: apiConnected ? '#DCFCE7' : '#FEF3C7' }]}>
            <Text style={[styles.apiBadgeText, { color: apiConnected ? '#166534' : '#92400E' }]}>
              {apiConnected ? 'Flask API: Online' : 'Local Engine Ready'}
            </Text>
          </View>
        </View>

        <View style={styles.viewToggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, !isMobileView && styles.toggleBtnActive]}
            onPress={() => isMobileView && toggleMobileView()}
            activeOpacity={0.8}
          >
            <Monitor size={15} color={!isMobileView ? '#000' : colors.textSecondary} />
            <Text style={[styles.toggleBtnText, !isMobileView && styles.toggleBtnTextActive]}>
              Desktop / POS Wide
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, isMobileView && styles.toggleBtnActive]}
            onPress={() => !isMobileView && toggleMobileView()}
            activeOpacity={0.8}
          >
            <Smartphone size={15} color={isMobileView ? '#000' : colors.textSecondary} />
            <Text style={[styles.toggleBtnText, isMobileView && styles.toggleBtnTextActive]}>
              Handheld POS Mobile
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body */}
      <View style={styles.contentWrapper}>
        {isMobileView ? (
          <View style={styles.mobileDeviceOuter}>
            {/* Phone Speaker & Camera Notch */}
            <View style={styles.phoneNotch}>
              <View style={styles.speakerGrill} />
              <View style={styles.cameraLens} />
            </View>
            <View style={styles.phoneScreen}>{children}</View>
            {/* Bottom Home Indicator */}
            <View style={styles.homeBar} />
          </View>
        ) : (
          <View style={styles.desktopContainer}>{children}</View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    minHeight: '100vh' as any,
  },
  controlBar: {
    height: 48,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginLeft: 6,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  apiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  apiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#000',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  desktopContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
  },
  mobileDeviceOuter: {
    width: 412,
    height: 860,
    maxHeight: '92vh' as any,
    backgroundColor: '#0F172A',
    borderRadius: 44,
    borderWidth: 8,
    borderColor: '#334155',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 6,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  phoneNotch: {
    height: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  speakerGrill: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
  },
  cameraLens: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 32,
    overflow: 'hidden',
  },
  homeBar: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginTop: 6,
  },
});

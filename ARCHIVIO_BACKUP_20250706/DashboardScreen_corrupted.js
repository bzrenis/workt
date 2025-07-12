import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { formatDate, formatCurrency } from '../utils';
import { useSettings, useCalculationService } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { PressableAnimated, FadeInCard, CardSkeleton } from '../components/AnimatedComponents';
import { calculateQuickNet } from '../services/NetEarningsCalculator';

const { width } = Dimensions.get('window');

// Helper functions (identical to TimeEntryForm)
const formatSafeAmount = (amount) => {
  if (amount === undefined || amount === null) return '0,00 â‚¬';
  return `${amount.toFixed(2).replace('.', ',')} â‚¬`;
};

const formatSafeHours = (hours) => {
  if (hours === undefined || hours === null) return '0:00';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

// Helper functions per calcoli netto/detrazioni
const calculateNetFromGross = (grossAmount, settings = null) => {
  if (!grossAmount || grossAmount <= 0) return 0;
  const { RealPayslipCalculator } = require('../services/RealPayslipCalculator');
  // Passa solo la sezione netCalculation delle impostazioni
  const netSettings = settings?.netCalculation || null;
  return RealPayslipCalculator.calculateNetFromGross(grossAmount, netSettings);
};

const calculateDeductions = (grossAmount, settings = null) => {
  if (!grossAmount || grossAmount <= 0) return 0;
  const { RealPayslipCalculator } = require('../services/RealPayslipCalculator');
  // Passa solo la sezione netCalculation delle impostazioni
  const netSettings = settings?.netCalculation || null;
  const calculation = RealPayslipCalculator.calculateNetFromGross(grossAmount, netSettings);
  return calculation.totalDeductions;
};

const getDeductionPercentage = (grossAmount, settings = null) => {
  if (!grossAmount || grossAmount <= 0) return '0.0';
  const { RealPayslipCalculator } = require('../services/RealPayslipCalculator');
  // Passa solo la sezione netCalculation delle impostazioni
  const netSettings = settings?.netCalculation || null;
  const calculation = RealPayslipCalculator.calculateNetFromGross(grossAmount, netSettings);
  return (calculation.deductionRate * 100).toFixed(1);
};

// Modern Card Component following TimeEntryScreen design
const ModernCard = ({ children, style, onPress, ...props }) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePress = () => {
    if (onPress) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
      onPress();
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.modernCard, style]}
        onPress={handlePress}
        activeOpacity={onPress ? 0.9 : 1}
        disabled={!onPress}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Modern Badge Component
const ModernBadge = ({ icon, label, value, color = '#2196F3', backgroundColor, onPress, size = 'medium' }) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePress = () => {
    if (onPress) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
      onPress();
    }
  };

  const badgeStyle = size === 'large' ? styles.largeBadge : styles.modernBadge;
  const iconSize = size === 'large' ? 24 : 18;

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[badgeStyle, { backgroundColor: backgroundColor || `${color}15` }]}
        onPress={handlePress}
        activeOpacity={onPress ? 0.8 : 1}
        disabled={!onPress}
      >
        <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
        <View style={styles.badgeContent}>
          <Text style={[styles.badgeValue, { color }]}>{value}</Text>
          <Text style={styles.badgeLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color = '#2196F3', subtitle, onPress }) => {
  return (
    <ModernCard style={styles.statCard} onPress={onPress}>
      <View style={styles.statCardHeader}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
    </ModernCard>
  );
};

// Earnings Summary Component
const EarningsSummary = ({ monthlyStats, settings, onPress }) => {
  const netAmount = monthlyStats.netTotalEarnings || 
    calculateNetFromGross(monthlyStats.totalEarnings, settings);
  const deductions = calculateDeductions(monthlyStats.totalEarnings, settings);
  const deductionRate = getDeductionPercentage(monthlyStats.totalEarnings, settings);

  return (
    <ModernCard style={styles.earningsSummaryCard} onPress={onPress}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <View style={styles.earningsHeader}>
          <MaterialCommunityIcons name="cash-multiple" size={28} color="white" />
          <Text style={styles.earningsTitle}>Guadagni Mensili</Text>
        </View>
        
        <Text style={styles.grossAmount}>{formatSafeAmount(monthlyStats.totalEarnings)}</Text>
        <Text style={styles.grossLabel}>Lordo Totale</Text>
        
        <View style={styles.netSection}>
          <View style={styles.deductionsRow}>
            <Text style={styles.deductionsLabel}>Trattenute ({deductionRate}%)</Text>
            <Text style={styles.deductionsAmount}>-{formatSafeAmount(deductions)}</Text>
          </View>
          
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Netto Stimato</Text>
            <Text style={styles.netAmount}>{formatSafeAmount(netAmount)}</Text>
          </View>
        </View>
      </LinearGradient>
    </ModernCard>
  );
};

// Month Navigation Header Component
const MonthNavigationHeader = ({ selectedMonth, selectedYear, onNavigate }) => {
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => onNavigate('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.monthTitleContainer}>
          <Text style={styles.monthTitle}>{monthNames[selectedMonth]}</Text>
          <Text style={styles.yearTitle}>{selectedYear}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => onNavigate('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

// Componente breakdown dettagliato simile al TimeEntryForm
const DetailedEarningsBreakdown = ({ breakdown, expanded, onToggle, settings }) => {
  // Gestione sicurezza: Se breakdown Ã¨ undefined o null, usa valori vuoti
  if (!breakdown) {
    return (
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownTitle}>Dettaglio Guadagni Mensili</Text>
          <Text style={styles.breakdownTotal}>Nessun dato disponibile</Text>
        </View>
      </View>
    );
  }

  const formatSafeAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 â‚¬';
    return `${amount.toFixed(2).replace('.', ',')} â‚¬`;
  };

  const formatSafeHours = (hours) => {
    if (hours === undefined || hours === null) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.breakdownCard}>
      <PressableAnimated onPress={onToggle} style={styles.breakdownHeader}>
        <View style={styles.breakdownHeaderLeft}>
          <MaterialCommunityIcons 
            name="cash-multiple" 
            size={24} 
            color="#2196F3" 
            style={styles.breakdownIcon}
          />
          <Text style={styles.breakdownTitle}>Dettaglio Guadagni Mensili</Text>
        </View>
        <View style={styles.breakdownHeaderRight}>
          <Text style={styles.breakdownTotal}>
            {formatSafeAmount(breakdown?.totalEarnings || 0)}
          </Text>
          <MaterialCommunityIcons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </PressableAnimated>
      
      {expanded && (
        <FadeInCard style={styles.breakdownContent}>
          
          {/* Sezione Lavoro Ordinario */}
          {breakdown?.ordinary && (
            <View style={styles.detailBreakdownSection}>
              <Text style={styles.detailBreakdownSubtitle}>AttivitÃ  Ordinarie</Text>
              
              {/* Ore giornaliere */}
              {(breakdown.ordinary.hours?.lavoro_giornaliera > 0 || breakdown.ordinary.hours?.viaggio_giornaliera > 0) && (
                <View style={styles.detailBreakdownItem}>
                  <View style={styles.detailBreakdownRow}>
                    <Text style={styles.detailBreakdownLabel}>Ore ordinarie</Text>
                    <Text style={styles.detailBreakdownValue}>
                      {formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0))}
                    </Text>
                  </View>
                  {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                    <Text style={styles.detailBreakdownDetail}>
                      - Lavoro: {formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}
                    </Text>
                  )}
                  {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                    <Text style={styles.detailBreakdownDetail}>
                      - Viaggio: {formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}
                    </Text>
                  )}
                  {breakdown.ordinary.earnings?.giornaliera > 0 && (
                    <Text style={styles.detailRateCalc}>
                      {formatSafeAmount(breakdown.ordinary.earnings.giornaliera)}
                    </Text>
                  )}
                </View>
              )}

              {/* Ore straordinarie */}
              {(breakdown.ordinary.hours?.lavoro_extra > 0 || breakdown.ordinary.hours?.viaggio_extra > 0) && (
                <View style={styles.detailBreakdownItem}>
                  <View style={styles.detailBreakdownRow}>
                    <Text style={styles.detailBreakdownLabel}>Ore straordinarie</Text>
                    <Text style={styles.detailBreakdownValue}>
                      {formatSafeHours((breakdown.ordinary.hours.lavoro_extra || 0) + (breakdown.ordinary.hours.viaggio_extra || 0))}
                    </Text>
                  </View>
                  {breakdown.ordinary.hours.lavoro_extra > 0 && (
                    <Text style={styles.detailBreakdownDetail}>
                      - Lavoro extra: {formatSafeHours(breakdown.ordinary.hours.lavoro_extra)}
                    </Text>
                  )}
                  {breakdown.ordinary.hours.viaggio_extra > 0 && (
                    <Text style={styles.detailBreakdownDetail}>
                      - Viaggio extra: {formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}
                    </Text>
                  )}
                  {(breakdown.ordinary.earnings?.straordinario_giorno > 0 || 
                    breakdown.ordinary.earnings?.straordinario_notte_22 > 0 || 
                    breakdown.ordinary.earnings?.straordinario_notte_dopo22 > 0) && (
                    <Text style={styles.detailRateCalc}>
                      {formatSafeAmount((breakdown.ordinary.earnings.straordinario_giorno || 0) + 
                                      (breakdown.ordinary.earnings.straordinario_notte_22 || 0) + 
                                      (breakdown.ordinary.earnings.straordinario_notte_dopo22 || 0))}
                    </Text>
                  )}
                </View>
              )}

              {/* Maggiorazioni weekend e festivi */}
              {(breakdown.ordinary.earnings?.sabato_bonus > 0 || breakdown.ordinary.earnings?.domenica_bonus > 0 || breakdown.ordinary.earnings?.festivo_bonus > 0) && (
                <>
                  {breakdown.ordinary.earnings.sabato_bonus > 0 && (
                    <View style={styles.detailBreakdownItem}>
                      <View style={styles.detailBreakdownRow}>
                        <Text style={styles.detailBreakdownLabel}>Maggiorazione sabato (+25%)</Text>
                        <Text style={styles.detailRateCalc}>{formatSafeAmount(breakdown.ordinary.earnings.sabato_bonus)}</Text>
                      </View>
                    </View>
                  )}
                  {breakdown.ordinary.earnings.domenica_bonus > 0 && (
                    <View style={styles.detailBreakdownItem}>
                      <View style={styles.detailBreakdownRow}>
                        <Text style={styles.detailBreakdownLabel}>Maggiorazione domenica (+30%)</Text>
                        <Text style={styles.detailRateCalc}>{formatSafeAmount(breakdown.ordinary.earnings.domenica_bonus)}</Text>
                      </View>
                    </View>
                  )}
                  {breakdown.ordinary.earnings.festivo_bonus > 0 && (
                    <View style={styles.detailBreakdownItem}>
                      <View style={styles.detailBreakdownRow}>
                        <Text style={styles.detailBreakdownLabel}>Maggiorazione festivo (+30%)</Text>
                        <Text style={styles.detailRateCalc}>{formatSafeAmount(breakdown.ordinary.earnings.festivo_bonus)}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              <View style={[styles.detailBreakdownRow, styles.detailTotalRow]}>
                <Text style={styles.detailBreakdownLabel}>Totale ordinario</Text>
                <Text style={styles.detailBreakdownTotal}>{formatSafeAmount(breakdown.ordinary.total || 0)}</Text>
              </View>
            </View>
          )}

          {/* Sezione ReperibilitÃ  */}
          {breakdown?.standby && breakdown.standby.totalEarnings > 0 && (
            <View style={styles.detailBreakdownSection}>
              <Text style={styles.detailBreakdownSubtitle}>Interventi ReperibilitÃ </Text>
              
              {/* Lavoro reperibilitÃ  - mostra solo le voci con valori > 0 */}
              {Object.entries(breakdown.standby.workHours || {}).map(([type, hours]) => {
                if (hours <= 0) return null;
                const earnings = breakdown.standby.workEarnings?.[type] || 0;
                const labels = {
                  'ordinary': 'Lavoro diurno',
                  'night': 'Lavoro notturno (+25%)',
                  'saturday': 'Lavoro sabato (+25%)',
                  'holiday': 'Lavoro festivo (+30%)',
                  'saturday_night': 'Lavoro sabato notturno (+50%)',
                  'night_holiday': 'Lavoro festivo notturno (+60%)'
                };
                
                return (
                  <View key={type} style={styles.detailBreakdownItem}>
                    <View style={styles.detailBreakdownRow}>
                      <Text style={styles.detailBreakdownLabel}>{labels[type] || `Lavoro ${type}`}</Text>
                      <Text style={styles.detailBreakdownValue}>{formatSafeHours(hours)}</Text>
                    </View>
                    {earnings > 0 && (
                      <Text style={styles.detailRateCalc}>
                        {formatSafeAmount(earnings)}
                      </Text>
                    )}
                  </View>
                );
              })}

              {/* Viaggio reperibilitÃ  - mostra solo le voci con valori > 0 */}
              {Object.entries(breakdown.standby.travelHours || {}).map(([type, hours]) => {
                if (hours <= 0) return null;
                const earnings = breakdown.standby.travelEarnings?.[type] || 0;
                const labels = {
                  'ordinary': 'Viaggio diurno',
                  'night': 'Viaggio notturno (+25%)',
                  'saturday': 'Viaggio sabato (+25%)',
                  'holiday': 'Viaggio festivo (+30%)',
                  'saturday_night': 'Viaggio sabato notturno (+50%)',
                  'night_holiday': 'Viaggio festivo notturno (+60%)'
                };
                
                return (
                  <View key={`travel_${type}`} style={styles.detailBreakdownItem}>
                    <View style={styles.detailBreakdownRow}>
                      <Text style={styles.detailBreakdownLabel}>{labels[type] || `Viaggio ${type}`}</Text>
                      <Text style={styles.detailBreakdownValue}>{formatSafeHours(hours)}</Text>
                    </View>
                    {earnings > 0 && (
                      <Text style={styles.detailRateCalc}>
                        {formatSafeAmount(earnings)}
                      </Text>
                    )}
                  </View>
                );
              })}

              <View style={[styles.detailBreakdownRow, styles.detailTotalRow]}>
                <Text style={styles.detailBreakdownLabel}>Totale reperibilitÃ </Text>
                <Text style={styles.detailBreakdownTotal}>
                  {formatSafeAmount((breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0))}
                </Text>
              </View>
            </View>
          )}

          {/* Sezione IndennitÃ  */}
          {breakdown?.allowances && (breakdown.allowances.travel > 0 || breakdown.allowances.standby > 0 || breakdown.allowances.meal > 0) && (
            <View style={styles.detailBreakdownSection}>
              <Text style={styles.detailBreakdownSubtitle}>IndennitÃ  e Buoni</Text>
              
              {breakdown.allowances.travel > 0 && (
                <View style={styles.detailBreakdownItem}>
                  <View style={styles.detailBreakdownRow}>
                    <Text style={styles.detailBreakdownLabel}>IndennitÃ  trasferta</Text>
                    <Text style={styles.detailBreakdownValue}>{formatSafeAmount(breakdown.allowances.travel)}</Text>
                  </View>
                  <Text style={styles.detailBreakdownDetail}>
                    CCNL trasferta mensile
                  </Text>
                </View>
              )}

              {breakdown.allowances.standby > 0 && (
                <View style={styles.detailBreakdownItem}>
                  <View style={styles.detailBreakdownRow}>
                    <Text style={styles.detailBreakdownLabel}>IndennitÃ  reperibilitÃ </Text>
                    <Text style={styles.detailBreakdownValue}>{formatSafeAmount(breakdown.allowances.standby)}</Text>
                  </View>
                  <Text style={styles.detailBreakdownDetail}>
                    CCNL per giorni di reperibilitÃ 
                  </Text>
                </View>
              )}

              {breakdown.allowances.meal > 0 && (
                <View style={styles.detailBreakdownItem}>
                  <View style={styles.detailBreakdownRow}>
                    <Text style={styles.detailBreakdownLabel}>Rimborso pasti</Text>
                    <Text style={styles.detailBreakdownValue}>{formatSafeAmount(breakdown.allowances.meal)}</Text>
                  </View>
                  <Text style={styles.detailBreakdownDetail}>
                    Non incluso nel totale (voce non tassabile)
                  </Text>
                </View>
              )}

              <View style={[styles.detailBreakdownRow, styles.detailTotalRow]}>
                <Text style={styles.detailBreakdownLabel}>Totale indennitÃ </Text>
                <Text style={styles.detailBreakdownTotal}>
                  {formatSafeAmount((breakdown.allowances?.travel || 0) + (breakdown.allowances?.standby || 0))}
                </Text>
              </View>
            </View>
          )}

          {/* Riepilogo finale */}
          <View style={styles.detailBreakdownSection}>
            <View style={[styles.detailBreakdownRow, styles.detailGrandTotalRow]}>
              <Text style={styles.detailGrandTotalLabel}>TOTALE GUADAGNI MENSILI</Text>
              <Text style={styles.detailGrandTotalValue}>
                {formatSafeAmount(breakdown?.totalEarnings || 0)}
              </Text>
            </View>
            <Text style={styles.detailBreakdownDetail}>
              + Rimborso pasti: {formatSafeAmount(breakdown?.allowances?.meal || 0)} (non tassabile)
            </Text>
          </View>
        </FadeInCard>
      )}
    </View>
  );
};

// Modern Detailed Breakdown Component
const ModernDetailedBreakdown = ({ breakdown, expanded, onToggle }) => {
  if (!breakdown) return null;

  return (
    <ModernCard style={styles.breakdownCard}>
      <TouchableOpacity onPress={onToggle} style={styles.breakdownHeader}>
        <View style={styles.breakdownHeaderLeft}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#2196F3" />
          <Text style={styles.breakdownTitle}>Dettaglio Guadagni</Text>
        </View>
        <View style={styles.breakdownHeaderRight}>
          <Text style={styles.breakdownTotal}>{formatSafeAmount(breakdown?.totalEarnings || 0)}</Text>
          <MaterialCommunityIcons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>
      
      {expanded && breakdown && (
        <View style={styles.breakdownContent}>
          {/* Ordinary Work Section */}
          {breakdown.ordinary && breakdown.ordinary.total > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>Lavoro Ordinario</Text>
              
              {/* Ordinary Hours */}
              {((breakdown.ordinary.hours?.lavoro_giornaliera || 0) + (breakdown.ordinary.hours?.viaggio_giornaliera || 0)) > 0 && (
                <View style={styles.breakdownItem}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemLabel}>Ore ordinarie</Text>
                    <Text style={styles.itemValue}>
                      {formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0))}
                    </Text>
                  </View>
                  <View style={styles.itemDetails}>
                    {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                      <Text style={styles.itemDetail}>â€¢ Lavoro: {formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}</Text>
                    )}
                    {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                      <Text style={styles.itemDetail}>â€¢ Viaggio: {formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}</Text>
                    )}
                  </View>
                  {breakdown.ordinary.earnings?.giornaliera > 0 && (
                    <Text style={styles.itemAmount}>{formatSafeAmount(breakdown.ordinary.earnings.giornaliera)}</Text>
                  )}
                </View>
              )}

              {/* Overtime Hours */}
              {(breakdown.ordinary.hours?.lavoro_extra > 0 || breakdown.ordinary.hours?.viaggio_extra > 0) && (
                <View style={styles.breakdownItem}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemLabel}>Ore straordinarie</Text>
                    <Text style={styles.itemValue}>
                      {formatSafeHours((breakdown.ordinary.hours.lavoro_extra || 0) + (breakdown.ordinary.hours.viaggio_extra || 0))}
                    </Text>
                  </View>
                  <View style={styles.itemDetails}>
                    {breakdown.ordinary.hours.lavoro_extra > 0 && (
                      <Text style={styles.itemDetail}>â€¢ Lavoro extra: {formatSafeHours(breakdown.ordinary.hours.lavoro_extra)}</Text>
                    )}
                    {breakdown.ordinary.hours.viaggio_extra > 0 && (
                      <Text style={styles.itemDetail}>â€¢ Viaggio extra: {formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}</Text>
                    )}
                  </View>
                  {(breakdown.ordinary.earnings?.straordinario_giorno > 0 || 
                    breakdown.ordinary.earnings?.straordinario_notte_22 > 0 || 
                    breakdown.ordinary.earnings?.straordinario_notte_dopo22 > 0) && (
                    <Text style={styles.itemAmount}>
                      {formatSafeAmount((breakdown.ordinary.earnings.straordinario_giorno || 0) + 
                                      (breakdown.ordinary.earnings.straordinario_notte_22 || 0) + 
                                      (breakdown.ordinary.earnings.straordinario_notte_dopo22 || 0))}
                    </Text>
                  )}
                </View>
              )}

              {/* Weekend/Holiday Bonuses */}
              {(breakdown.ordinary.earnings?.sabato_bonus > 0 || 
                breakdown.ordinary.earnings?.domenica_bonus > 0 || 
                breakdown.ordinary.earnings?.festivo_bonus > 0) && (
                <View style={styles.breakdownItem}>
                  <Text style={styles.itemLabel}>Maggiorazioni</Text>
                  <View style={styles.itemDetails}>
                    {breakdown.ordinary.earnings.sabato_bonus > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={styles.itemDetail}>â€¢ Sabato (+25%)</Text>
                        <Text style={styles.bonusAmount}>{formatSafeAmount(breakdown.ordinary.earnings.sabato_bonus)}</Text>
                      </View>
                    )}
                    {breakdown.ordinary.earnings.domenica_bonus > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={styles.itemDetail}>â€¢ Domenica (+30%)</Text>
                        <Text style={styles.bonusAmount}>{formatSafeAmount(breakdown.ordinary.earnings.domenica_bonus)}</Text>
                      </View>
                    )}
                    {breakdown.ordinary.earnings.festivo_bonus > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={styles.itemDetail}>â€¢ Festivo (+30%)</Text>
                        <Text style={styles.bonusAmount}>{formatSafeAmount(breakdown.ordinary.earnings.festivo_bonus)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.sectionTotal}>
                <Text style={styles.sectionTotalLabel}>Totale ordinario</Text>
                <Text style={styles.sectionTotalValue}>{formatSafeAmount(breakdown.ordinary.total)}</Text>
              </View>
            </View>
          )}

          {/* Standby Section */}
          {breakdown.standby && breakdown.standby.totalEarnings > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>ReperibilitÃ </Text>
              
              {/* Standby Work */}
              {Object.entries(breakdown.standby.workHours || {}).some(([_, hours]) => hours > 0) && (
                <View style={styles.breakdownItem}>
                  <Text style={styles.itemLabel}>Interventi lavoro</Text>
                  <View style={styles.itemDetails}>
                    {Object.entries(breakdown.standby.workHours || {}).map(([type, hours]) => {
                      if (hours <= 0) return null;
                      const earnings = breakdown.standby.workEarnings?.[type] || 0;
                      const labels = {
                        'ordinary': 'Diurno',
                        'night': 'Notturno (+25%)',
                        'saturday': 'Sabato (+25%)',
                        'holiday': 'Festivo (+30%)',
                        'saturday_night': 'Sabato notturno (+50%)',
                        'night_holiday': 'Festivo notturno (+60%)'
                      };
                      
                      return (
                        <View key={type} style={styles.bonusRow}>
                          <Text style={styles.itemDetail}>â€¢ {labels[type] || type}: {formatSafeHours(hours)}</Text>
                          {earnings > 0 && <Text style={styles.bonusAmount}>{formatSafeAmount(earnings)}</Text>}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Standby Travel */}
              {Object.entries(breakdown.standby.travelHours || {}).some(([_, hours]) => hours > 0) && (
                <View style={styles.breakdownItem}>
                  <Text style={styles.itemLabel}>Viaggi reperibilitÃ </Text>
                  <View style={styles.itemDetails}>
                    {Object.entries(breakdown.standby.travelHours || {}).map(([type, hours]) => {
                      if (hours <= 0) return null;
                      const earnings = breakdown.standby.travelEarnings?.[type] || 0;
                      const labels = {
                        'ordinary': 'Diurno',
                        'night': 'Notturno (+25%)',
                        'saturday': 'Sabato (+25%)',
                        'holiday': 'Festivo (+30%)',
                        'saturday_night': 'Sabato notturno (+50%)',
                        'night_holiday': 'Festivo notturno (+60%)'
                      };
                      
                      return (
                        <View key={type} style={styles.bonusRow}>
                          <Text style={styles.itemDetail}>â€¢ {labels[type] || type}: {formatSafeHours(hours)}</Text>
                          {earnings > 0 && <Text style={styles.bonusAmount}>{formatSafeAmount(earnings)}</Text>}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.sectionTotal}>
                <Text style={styles.sectionTotalLabel}>Totale reperibilitÃ </Text>
                <Text style={styles.sectionTotalValue}>{formatSafeAmount(breakdown.standby.totalEarnings)}</Text>
              </View>
            </View>
          )}

          {/* Allowances Section */}
          {breakdown.allowances && 
           (breakdown.allowances.travel > 0 || breakdown.allowances.standby > 0 || breakdown.allowances.meal > 0) && (
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>IndennitÃ  e Rimborsi</Text>
              
              {breakdown.allowances.travel > 0 && (
                <View style={styles.allowanceRow}>
                  <Text style={styles.allowanceLabel}>IndennitÃ  trasferta</Text>
                  <Text style={styles.allowanceAmount}>{formatSafeAmount(breakdown.allowances.travel)}</Text>
                </View>
              )}
              
              {breakdown.allowances.standby > 0 && (
                <View style={styles.allowanceRow}>
                  <Text style={styles.allowanceLabel}>IndennitÃ  reperibilitÃ </Text>
                  <Text style={styles.allowanceAmount}>{formatSafeAmount(breakdown.allowances.standby)}</Text>
                </View>
              )}
              
              {breakdown.allowances.meal > 0 && (
                <View style={styles.allowanceRow}>
                  <Text style={styles.allowanceLabel}>Rimborsi pasti</Text>
                  <Text style={styles.allowanceAmount}>{formatSafeAmount(breakdown.allowances.meal)}</Text>
                  <Text style={styles.allowanceNote}>(non tassabile)</Text>
                </View>
              )}

              <View style={styles.sectionTotal}>
                <Text style={styles.sectionTotalLabel}>Totale indennitÃ </Text>
                <Text style={styles.sectionTotalValue}>
                  {formatSafeAmount((breakdown.allowances?.travel || 0) + (breakdown.allowances?.standby || 0))}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ModernCard>
  );
};

const DetailSection = ({ title, icon, children, expanded, onToggle, totalValue, color = "#4CAF50" }) => {
  return (
    <ModernCard style={styles.detailSectionCard}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionHeaderRight}>
          {totalValue && (
            <Text style={styles.sectionTotal}>{totalValue}</Text>
          )}
          <MaterialCommunityIcons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </ModernCard>
  );
};

const DetailRow = ({ icon, label, value, color = "#666", valueColor = "#007AFF" }) => (
  <View style={styles.detailRowContainer}>
    {icon && <MaterialCommunityIcons name={icon} size={16} color={color} style={styles.detailRowIcon} />}
    <Text style={[styles.detailRowLabel, { color }]}>{label}</Text>
    <Text style={[styles.detailRowValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const [workEntries, setWorkEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { settings } = useSettings();
  const calculationService = useCalculationService();
  
  // Stati per le sezioni espandibili
  const [expandedSections, setExpandedSections] = useState({
    hours: true,
    earnings: true,
    days: false,
    overtime: false,
    allowances: false,
    meals: false
  });
  
  // Animated values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Funzione per inserire dati di test
  const insertTestData = async () => {
    try {
      console.log('ðŸ”„ Inserimento dati di test...');
      
      const testEntries = [
        // Gennaio 2025
        {
          date: '2025-01-15',
          site_name: 'Ufficio Principale',
          work_start_1: '08:00',
          work_end_1: '17:00',
          total_earnings: 131.29,
          notes: 'Giornata normale'
        },
        {
          date: '2025-01-16',
          site_name: 'Cliente A - Milano',
          work_start_1: '08:00',
          work_end_1: '19:00',
          meal_lunch_voucher: 1,
          travel_allowance: 32.82,
          total_earnings: 190.45,
          notes: 'Trasferta con straordinario'
        },
        {
          date: '2025-01-17',
          site_name: 'Cliente B - Torino',
          work_start_1: '09:00',
          work_end_1: '18:00',
          travel_allowance: 16.41,
          total_earnings: 147.70,
          notes: 'Installazione'
        },
        // Luglio 2025 (mese corrente)
        {
          date: '2025-07-01',
          site_name: 'Ufficio Principale',
          work_start_1: '08:00',
          work_end_1: '17:00',
          total_earnings: 131.29,
          notes: 'Primo giorno mese'
        },
        {
          date: '2025-07-02',
          site_name: 'Cliente C - Roma',
          work_start_1: '08:00',
          work_end_1: '18:00',
          meal_lunch_voucher: 1,
          travel_allowance: 16.41,
          total_earnings: 163.11,
          notes: 'Trasferta'
        },
        {
          date: '2025-07-03',
          site_name: 'Ufficio Principale',
          work_start_1: '08:30',
          work_end_1: '17:30',
          total_earnings: 131.29,
          notes: 'Lavoro normale'
        },
        {
          date: '2025-07-04',
          site_name: 'Cliente D - Venezia',
          work_start_1: '07:00',
          work_end_1: '19:00',
          meal_lunch_voucher: 1,
          travel_allowance: 49.23,
          total_earnings: 212.34,
          notes: 'Giornata lunga con trasferta'
        }
      ];

      for (const entryData of testEntries) {
        await DatabaseService.addWorkEntry(entryData);
        console.log(`âœ… Inserita entry per: ${entryData.date}`);
      }
      
      console.log('âœ… Tutti i dati di test inseriti con successo');
    } catch (error) {
      console.error('âŒ Errore inserimento dati di test:', error);
    }
  };

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load work entries
  const loadWorkEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // DEBUG: Log per debugging del bug giorni lavorati
      console.log(`ðŸ” Dashboard loadWorkEntries - Caricamento per: ${selectedMonth + 1}/${selectedYear}`);
      
      // CLEAR PREVIOUS ENTRIES per evitare race conditions
      setWorkEntries([]);
      
      // STEP 1: Verifica totale entries nel database
      try {
        const allEntries = await DatabaseService.getAllWorkEntries();
        console.log(`ðŸ” Dashboard loadWorkEntries - Totale entries in DB: ${allEntries.length}`);
        
        if (allEntries.length > 0) {
          console.log('ðŸ” Dashboard loadWorkEntries - Prime 3 entries nel DB:');
          allEntries.slice(0, 3).forEach((entry, idx) => {
            console.log(`   ${idx + 1}. Date: ${entry.date}, Work: ${entry.workHours}h (ID: ${entry.id})`);
          });
        } else {
          console.log('âš ï¸  Dashboard loadWorkEntries - Database Ã¨ vuoto!');
          console.log('ðŸ”„ Inserimento dati di test...');
          await insertTestData();
          console.log('âœ… Dati di test inseriti');
        }
      } catch (dbError) {
        console.error('âŒ Errore accesso database completo:', dbError);
      }
      
      // STEP 2: Use the correct DatabaseService method: getWorkEntries(year, month)
      // Note: DatabaseService expects 1-based month (1-12), JavaScript Date uses 0-based (0-11)
      const entries = await DatabaseService.getWorkEntries(selectedYear, selectedMonth + 1);
      
      console.log(`ðŸ” Dashboard loadWorkEntries - Entries per ${selectedMonth + 1}/${selectedYear}: ${entries.length}`);
      if (entries.length > 0) {
        console.log('ðŸ” Dashboard loadWorkEntries - Date delle entries caricate:');
        entries.forEach((entry, idx) => {
          const date = new Date(entry.date);
          console.log(`   ${idx + 1}. ${date.toDateString()} (ID: ${entry.id})`);
        });
      } else {
        console.log(`âš ï¸  Nessuna entry trovata per ${selectedMonth + 1}/${selectedYear}`);
        console.log('ðŸ’¡ Suggerimenti:');
        console.log('   - Verifica di aver inserito orari per questo mese');
        console.log('   - Controlla il formato delle date nel database');
        console.log('   - Verifica che il range di date sia corretto');
      }
      
      setWorkEntries(entries);
    } catch (error) {
      console.error('Error loading work entries:', error);
      setError('Impossibile caricare i dati');
      Alert.alert('Errore', 'Impossibile caricare i dati');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkEntries();
  }, [selectedMonth, selectedYear]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkEntries();
  };

  const retryButton = () => {
    setError(null);
    loadWorkEntries();
  };

  // Calculate monthly statistics using the same logic as TimeEntryForm
  const monthlyStats = useMemo(() => {
    const entries = workEntries; // For test compatibility
    
    // DEBUG: Log per debugging del bug giorni lavorati
    console.log(`ðŸ” Dashboard monthlyStats - Mese: ${selectedMonth + 1}/${selectedYear}`);
    console.log(`ðŸ” Dashboard monthlyStats - Entries ricevute: ${entries.length}`);
    console.log(`ðŸ” Dashboard monthlyStats - workEntries state:`, entries.map(e => ({ id: e.id, date: e.date })));
    
    // FILTRO SICUREZZA: Verifica che le entries appartengano al mese selezionato
    const filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const entryMonth = entryDate.getMonth(); // 0-based
      const entryYear = entryDate.getFullYear();
      const belongsToMonth = entryMonth === selectedMonth && entryYear === selectedYear;
      
      console.log(`ðŸ” Entry ${entry.id}: ${entry.date} -> mese ${entryMonth + 1}/${entryYear} vs selezionato ${selectedMonth + 1}/${selectedYear} = ${belongsToMonth}`);
      
      if (!belongsToMonth) {
        console.warn(`âš ï¸  Entry filtrata - Data: ${entry.date}, Mese entry: ${entryMonth + 1}/${entryYear}, Mese selezionato: ${selectedMonth + 1}/${selectedYear}`);
      }
      
      return belongsToMonth;
    });
    
    console.log(`ðŸ” Dashboard monthlyStats - Entries dopo filtro: ${filteredEntries.length}`);
    if (filteredEntries.length > 0) {
      console.log('ðŸ” Dashboard monthlyStats - Date delle entries filtrate:');
      filteredEntries.forEach((entry, idx) => {
        const date = new Date(entry.date);
        console.log(`   ${idx + 1}. ${date.toDateString()} (ID: ${entry.id})`);
      });
    }
    
    if (!settings || filteredEntries.length === 0) {
      return {
        totalDays: 0,
        dailyRateDays: 0,
        weekendDays: 0,
        holidayDays: 0,
        ordinaryTravelHours: 0,
        extraTravelHours: 0,
        ordinaryWorkHours: 0,
        extraWorkHours: 0,
        standbyWorkHours: 0,
        standbyTravelHours: 0,
        totalHours: 0,
        travelAllowanceDays: 0,
        standbyAllowanceDays: 0,
        mealVoucherDays: 0,
        mealCashDays: 0,
        totalEarnings: 0, // Lordo totale
        // ðŸ’° NUOVI CAMPI NETTO
        grossTotalEarnings: 0, // Alias per chiarezza
        netTotalEarnings: 0, // Netto totale  
        totalDeductions: 0, // Trattenute totali
        deductionRate: 0, // Percentuale trattenute
        overtimeBreakdown: {
          day: { hours: 0, earnings: 0 },
          nightUntil22: { hours: 0, earnings: 0 },
          nightAfter22: { hours: 0, earnings: 0 },
          saturday: { hours: 0, earnings: 0 },
          sunday: { hours: 0, earnings: 0 },
          holiday: { hours: 0, earnings: 0 }
        },
        breakdownSummary: {
          ordinary: 0,
          standby: 0,
          allowances: 0,
          meals: 0
        },
        // ðŸ”¥ NUOVO: Breakdown aggregato vuoto
        aggregatedBreakdown: {
          totalEarnings: 0,
          ordinary: {
            hours: {
              lavoro_giornaliera: 0,
              viaggio_giornaliera: 0,
              lavoro_extra: 0,
              viaggio_extra: 0
            },
            earnings: {
              giornaliera: 0,
              straordinario_giorno: 0,
              straordinario_notte_22: 0,
              straordinario_notte_dopo22: 0,
              sabato_bonus: 0,
              domenica_bonus: 0,
              festivo_bonus: 0
            },
            total: 0
          },
          standby: {
            workHours: {
              ordinary: 0,
              night: 0,
              saturday: 0,
              holiday: 0,
              saturday_night: 0,
              night_holiday: 0
            },
            workEarnings: {
              ordinary: 0,
              night: 0,
              saturday: 0,
              holiday: 0,
              saturday_night: 0,
              night_holiday: 0
            },
            travelHours: {
              ordinary: 0,
              night: 0,
              saturday: 0,
              holiday: 0,
              saturday_night: 0,
              night_holiday: 0
            },
            travelEarnings: {
              ordinary: 0,
              night: 0,
              saturday: 0,
              holiday: 0,
              saturday_night: 0,
              night_holiday: 0
            },
            dailyIndemnity: 0,
            totalEarnings: 0
          },
          allowances: {
            travel: 0,
            standby: 0,
            meal: 0
          }
        }
      };
    }

    // Default settings (identical to TimeEntryForm)
    const defaultSettings = {
      contract: { 
        dailyRate: 109.19,
        hourlyRate: 16.41,
        overtimeRates: {
          day: 1.2,
          nightUntil22: 1.25,
          nightAfter22: 1.35,
          holiday: 1.3,
          nightHoliday: 1.5
        }
      },
      travelCompensationRate: 1.0,
      standbySettings: {
        dailyAllowance: 7.5,
        dailyIndemnity: 7.5,
        travelWithBonus: false
      },
      mealAllowances: {
        lunch: { voucherAmount: 5.29 },
        dinner: { voucherAmount: 5.29 }
      }
    };

    const safeSettings = {
      ...defaultSettings,
      ...(settings || {}),
      contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
    };

    let stats = {
      totalDays: 0,
      dailyRateDays: 0,
      weekendDays: 0,
      holidayDays: 0,
      ordinaryTravelHours: 0,
      extraTravelHours: 0,
      ordinaryWorkHours: 0,
      extraWorkHours: 0,
      standbyWorkHours: 0,
      standbyTravelHours: 0,
      totalHours: 0,
      travelAllowanceDays: 0,
      standbyAllowanceDays: 0,
      mealVoucherDays: 0,
      mealCashDays: 0,
      totalEarnings: 0,
      overtimeBreakdown: {
        day: { hours: 0, earnings: 0 },
        nightUntil22: { hours: 0, earnings: 0 },
        nightAfter22: { hours: 0, earnings: 0 },
        saturday: { hours: 0, earnings: 0 },
        sunday: { hours: 0, earnings: 0 },
        holiday: { hours: 0, earnings: 0 }
      },
      breakdownSummary: {
        ordinary: 0,
        standby: 0,
        allowances: 0,
        meals: 0
      },
      // ðŸ”¥ NUOVO: Breakdown aggregato mensile per DetailedEarningsBreakdown
      aggregatedBreakdown: {
        totalEarnings: 0,
        ordinary: {
          hours: {
            lavoro_giornaliera: 0,
            viaggio_giornaliera: 0,
            lavoro_extra: 0,
            viaggio_extra: 0
          },
          earnings: {
            giornaliera: 0,
            straordinario_giorno: 0,
            straordinario_notte_22: 0,
            straordinario_notte_dopo22: 0,
            sabato_bonus: 0,
            domenica_bonus: 0,
            festivo_bonus: 0
          },
          total: 0
        },
        standby: {
          workHours: {
            ordinary: 0,
            night: 0,
            saturday: 0,
            holiday: 0,
            saturday_night: 0,
            night_holiday: 0
          },
          workEarnings: {
            ordinary: 0,
            night: 0,
            saturday: 0,
            holiday: 0,
            saturday_night: 0,
            night_holiday: 0
          },
          travelHours: {
            ordinary: 0,
            night: 0,
            saturday: 0,
            holiday: 0,
            saturday_night: 0,
            night_holiday: 0
          },
          travelEarnings: {
            ordinary: 0,
            night: 0,
            saturday: 0,
            holiday: 0,
            saturday_night: 0,
            night_holiday: 0
          },
          dailyIndemnity: 0,
          totalEarnings: 0
        },
        allowances: {
          travel: 0,
          standby: 0,
          meal: 0
        }
      }
    };

    filteredEntries.forEach(entry => {
      try {
        // Create work entry object manually (identical to TimeEntryForm)
        const workEntry = createWorkEntryFromData(entry, calculationService);
        
        // Calculate breakdown using the same service
        let breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
        
        // Fallback to safe settings if needed
        if (!breakdown && safeSettings) {
          breakdown = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
        }
        
        if (!breakdown) return;

        stats.totalDays++;
        stats.totalEarnings += breakdown.totalEarnings || 0;
        
        // ðŸ’° AGGIUNGI CALCOLI NETTO SE DISPONIBILI
        if (breakdown.netTotal) {
          stats.netTotalEarnings += breakdown.netTotal;
          stats.totalDeductions += breakdown.totalDeductions || 0;
        }
        stats.grossTotalEarnings = stats.totalEarnings; // Alias per chiarezza

        // Test compatibility mappings
        const totalWorkDays = stats.totalDays;
        const totalDailyRateDays = stats.dailyRateDays;
        const specialDays = stats.weekendDays + stats.holidayDays;
        const totalTravel = stats.ordinaryTravelHours + stats.extraTravelHours;
        const travelExtra = stats.extraTravelHours;
        const overtime = stats.overtimeBreakdown;
        const standbyTravel = stats.standbyTravelHours;
        const standbyWork = stats.standbyWorkHours;
        const totalStandby = stats.standbyWorkHours + stats.standbyTravelHours;
        const totalWorkAndTravel = stats.totalHours;
        const travelDays = stats.travelAllowanceDays;
        const standbyDays = stats.standbyAllowanceDays;
        const meals = stats.mealVoucherDays + stats.mealCashDays;

        // Aggregate ordinary hours
        if (breakdown.ordinary?.hours) {
          stats.ordinaryWorkHours += breakdown.ordinary.hours.lavoro_giornaliera || 0;
          stats.ordinaryTravelHours += breakdown.ordinary.hours.viaggio_giornaliera || 0;
          stats.extraWorkHours += breakdown.ordinary.hours.lavoro_extra || 0;
          stats.extraTravelHours += breakdown.ordinary.hours.viaggio_extra || 0;
        }

        // Check if daily rate was used
        if (breakdown.ordinary?.earnings?.giornaliera > 0) {
          stats.dailyRateDays++;
        }

        // Aggregate standby hours
        if (breakdown.standby?.workHours) {
          Object.values(breakdown.standby.workHours).forEach(h => {
            stats.standbyWorkHours += h || 0;
          });
        }
        if (breakdown.standby?.travelHours) {
          Object.values(breakdown.standby.travelHours).forEach(h => {
            stats.standbyTravelHours += h || 0;
          });
        }

        // Count weekend/holiday days
        const date = new Date(workEntry.date);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 6) { // Saturday
          stats.weekendDays++;
          if (breakdown.ordinary?.earnings?.sabato_bonus > 0) {
            stats.overtimeBreakdown.saturday.hours += 1;
    
    // Il useEffect si triggererÃ  automaticamente e caricherÃ  i nuovi dati
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Header component per navigazione mesi - VERSIONE SICURA SENZA GRADIENTS
  const MonthNavigationHeader = () => (
    <View style={styles.headerGradientFallback}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.monthTitleContainer}>
          <Text style={styles.monthTitle}>
            {monthNames[selectedMonth]}
          </Text>
          <Text style={styles.yearTitle}>
            {selectedYear}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <MonthNavigationHeader />
          <View style={[styles.centerContent, { flex: 1 }]}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <MonthNavigationHeader />
          <View style={[styles.centerContent, { flex: 1 }]}>
            <Ionicons name="alert-circle" size={64} color="#FF3B30" />
            <Text style={styles.errorTitle}>Errore</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryButton}>
              <Text style={styles.retryButtonText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (workEntries.length === 0) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <MonthNavigationHeader />
          <View style={[styles.centerContent, { flex: 1 }]}>
            <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>Nessun dato</Text>
            <Text style={styles.emptyMessage}>
              Non ci sono orari per {monthNames[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('TimeEntry')}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.actionButtonText}>Aggiungi Orario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.backgroundGradientFallback}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
        <MonthNavigationHeader />
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >

        {/* ðŸ’° Gross vs Net Earnings Card - Opzione D: Layout Verticale con Icone Grandi */}
        <ModernCard style={styles.salaryCard}>
          {/* Header */}
          <View style={styles.salaryHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={22} color="#1a73e8" />
            <Text style={styles.salaryTitle}>Guadagno Mensile</Text>
          </View>

          {/* Main Content - Layout Verticale */}
          <View style={styles.salaryContent}>
            
            {/* Lordo Section */}
            <View style={styles.salarySection}>
              <View style={styles.salaryIconContainer}>
                <MaterialCommunityIcons name="trending-up" size={26} color="#22c55e" />
              </View>
              <Text style={styles.salaryLabel}>Lordo Totale</Text>
              <Text style={styles.salaryValueGross}>{formatSafeAmount(monthlyStats.totalEarnings)}</Text>
            </View>

            {/* Arrow Down */}
            <View style={styles.salaryArrow}>
              <MaterialCommunityIcons name="arrow-down" size={18} color="#94a3b8" />
            </View>

            {/* Deduzioni Section */}
            <View style={styles.salarySection}>
              <View style={styles.salaryIconContainer}>
                <MaterialCommunityIcons name="trending-down" size={26} color="#ef4444" />
              </View>
              <Text style={styles.salaryLabel}>Trattenute ({getDeductionPercentage(monthlyStats.totalEarnings, settings)}%)</Text>
              <Text style={styles.salaryValueDeduction}>-{formatSafeAmount(calculateDeductions(monthlyStats.totalEarnings, settings))}</Text>
            </View>

            {/* Arrow Down */}
            <View style={styles.salaryArrow}>
              <MaterialCommunityIcons name="equal" size={18} color="#1a73e8" />
            </View>

            {/* Netto Section - Highlighted */}
            <View style={[styles.salarySection, styles.salarySectionHighlight]}>
              <View style={styles.salaryIconContainer}>
                <MaterialCommunityIcons name="wallet" size={28} color="#1a73e8" />
              </View>
              <Text style={styles.salaryLabelHighlight}>Netto in Busta</Text>
              <Text style={styles.salaryValueNet}>
                {formatSafeAmount(monthlyStats.netTotalEarnings || calculateNetFromGross(monthlyStats.totalEarnings, 
                  settings?.netCalculation || { method: 'irpef', customDeductionRate: 25 }
                ).net)}
              </Text>
              <View style={styles.salaryBadge}>
                <Text style={styles.salaryBadgeText}>FINALE</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.salaryFooter}>
            <MaterialCommunityIcons name="shield-check" size={12} color="#64748b" />
            <Text style={styles.salaryFooterText}>
              CCNL Metalmeccanico PMI - Livello 5
            </Text>
          </View>
        </ModernCard>

        {/* Stats Summary Card - Compact Version */}
        <ModernCard 
          style={styles.statsCard} 
          gradient={false}
        >
          <View style={styles.statsContent}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.totalDays}</Text>
                <Text style={styles.statLabel}>Giorni Lavorati</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatSafeHours(monthlyStats.totalHours)}</Text>
                <Text style={styles.statLabel}>Ore Totali</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {monthlyStats.totalDays > 0 ? formatSafeAmount(monthlyStats.totalEarnings / monthlyStats.totalDays) : '0,00 â‚¬'}
                </Text>
                <Text style={styles.statLabel}>Media Giornaliera</Text>
              </View>
            </View>
            <Text style={styles.statsSubtext}>
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
          </View>
        </ModernCard>

        {/* Quick Stats Grid - VERSIONE SICURA */}
        <View style={styles.quickStatsGrid}>
          <QuickStat
            icon="calendar-check"
            label="Giorni Totali"
            value={monthlyStats.totalDays.toString()}
            color="#4CAF50"
            backgroundColor="#E8F5E8"
          />
          <QuickStat
            icon="cash-multiple"
            label="Diaria Giornaliera"
            value={monthlyStats.dailyRateDays.toString()}
            color="#2196F3"
            backgroundColor="#E3F2FD"
          />
          <QuickStat
            icon="star"
            label="Weekend/Festivi"
            value={(monthlyStats.weekendDays + monthlyStats.holidayDays).toString()}
            color="#FF9800"
            backgroundColor="#FFF3E0"
          />
          <QuickStat
            icon="clock"
            label="Ore Totali"
            value={formatSafeHours(monthlyStats.totalHours)}
            color="#9C27B0"
            backgroundColor="#F3E5F5"
          />
        </View>

        {/* Hours Detail Section */}
        <DetailSection
          title="Dettaglio Ore"
          icon="clock-outline"
          expanded={expandedSections.hours}
          onToggle={() => toggleSection('hours')}
          totalValue={formatSafeHours(monthlyStats.totalHours)}
          color="#4CAF50"
        >
          <DetailRow
            icon="car"
            label="Ore Viaggio Ordinarie"
            value={formatSafeHours(monthlyStats.ordinaryTravelHours)}
          />
          <DetailRow
            icon="car-multiple"
            label="Ore Viaggio Extra"
            value={formatSafeHours(monthlyStats.extraTravelHours)}
          />
          <DetailRow
            icon="briefcase"
            label="Ore Lavoro Ordinarie"
            value={formatSafeHours(monthlyStats.ordinaryWorkHours)}
          />
          <DetailRow
            icon="briefcase-outline"
            label="Ore Lavoro Extra"
            value={formatSafeHours(monthlyStats.extraWorkHours)}
          />
          <DetailRow
            icon="shield-check"
            label="Ore ReperibilitÃ  Lavoro"
            value={formatSafeHours(monthlyStats.standbyWorkHours)}
            color="#FF9800"
          />
          <DetailRow
            icon="shield-car"
            label="Ore ReperibilitÃ  Viaggio"
            value={formatSafeHours(monthlyStats.standbyTravelHours)}
            color="#FF9800"
          />
        </DetailSection>

        {/* Detailed Earnings Breakdown - come TimeEntryForm */}
        <DetailedEarningsBreakdown
          breakdown={monthlyStats.aggregatedBreakdown}
          expanded={expandedSections.earnings}
          onToggle={() => toggleSection('earnings')}
          settings={settings}
        />

        {/* Overtime Detail Section */}
        <DetailSection
          title="Maggiorazioni Straordinari"
          icon="clock-fast"
          expanded={expandedSections.overtime}
          onToggle={() => toggleSection('overtime')}
          color="#FF5722"
        >
          {monthlyStats.overtimeBreakdown.day.earnings > 0 && (
            <DetailRow
              icon="weather-sunny"
              label="Straordinario Giorno (+20%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.day.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.nightUntil22.earnings > 0 && (
            <DetailRow
              icon="weather-night"
              label="Notte fino 22h (+25%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.nightUntil22.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.nightAfter22.earnings > 0 && (
            <DetailRow
              icon="sleep"
              label="Notte dopo 22h (+35%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.nightAfter22.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.saturday.earnings > 0 && (
            <DetailRow
              icon="calendar-weekend"
              label="Bonus Sabato"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.saturday.earnings)}
              valueColor="#FF9800"
            />
          )}
          {monthlyStats.overtimeBreakdown.sunday.earnings > 0 && (
            <DetailRow
              icon="calendar-star"
              label="Bonus Domenica"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.sunday.earnings)}
              valueColor="#FF9800"
            />
          )}
          {monthlyStats.overtimeBreakdown.holiday.earnings > 0 && (
            <DetailRow
              icon="party-popper"
              label="Bonus Festivo"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.holiday.earnings)}
              valueColor="#FF9800"
            />
          )}
        </DetailSection>

        {/* Allowances Section */}
        <DetailSection
          title="IndennitÃ "
          icon="gift-outline"
          expanded={expandedSections.allowances}
          onToggle={() => toggleSection('allowances')}
          color="#9C27B0"
        >
          <DetailRow
            icon="airplane"
            label="Giorni IndennitÃ  Trasferta"
            value={monthlyStats.travelAllowanceDays.toString()}
            valueColor="#2196F3"
          />
          <DetailRow
            icon="shield-check"
            label="Giorni IndennitÃ  ReperibilitÃ "
            value={monthlyStats.standbyAllowanceDays.toString()}
            valueColor="#FF9800"
          />
        </DetailSection>

        {/* Meals Section */}
        <DetailSection
          title="Rimborsi Pasti"
          icon="food"
          expanded={expandedSections.meals}
          onToggle={() => toggleSection('meals')}
          totalValue={formatSafeAmount(monthlyStats.breakdownSummary.meals)}
          color="#795548"
        >
          <DetailRow
            icon="ticket"
            label="Giorni Buoni Pasto"
            value={monthlyStats.mealVoucherDays.toString()}
            valueColor="#4CAF50"
          />
          <DetailRow
            icon="cash"
            label="Giorni Rimborso Contanti"
            value={monthlyStats.mealCashDays.toString()}
            valueColor="#2196F3"
          />
          <View style={styles.mealNote}>
            <MaterialCommunityIcons name="information" size={14} color="#666" />
            <Text style={styles.mealNoteText}>
              Rimborsi non tassabili - PrioritÃ : contanti specifici &gt; impostazioni
            </Text>
          </View>
        </DetailSection>

        {/* Quick Actions - VERSIONE SICURA */}
        <ModernCard style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Azioni Rapide</Text>
          <View style={styles.quickActionButtons}>
            <TouchableOpacity 
              style={[styles.quickActionWrapper, styles.primaryActionFallback]}
              onPress={() => navigation.navigate('TimeEntry')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionButton}>
                <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
                <Text style={styles.quickActionText}>Nuovo Orario</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionWrapper, styles.secondaryActionFallback]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionButton}>
                <MaterialCommunityIcons name="cog" size={24} color="white" />
                <Text style={styles.quickActionText}>Impostazioni</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ModernCard>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </Animated.View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundGradient: {
    flex: 1,
  },
  backgroundGradientFallback: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 0,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerGradientFallback: {
    backgroundColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  navButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  yearTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  
  // Modern UI Components
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  
  gradientCard: {
    borderRadius: 16,
    padding: 0,
    margin: -20,
  },
  
  gradientCardFallback: {
    borderRadius: 16,
    padding: 0,
    margin: -20,
    backgroundColor: 'transparent',
  },
  
  // Hero Card
  heroCard: {
    marginTop: 24,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  heroContent: {
    alignItems: 'center',
    padding: 24,
  },
  heroContentFallback: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    margin: -20,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  heroSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  
  // Quick Stats Grid
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  
  // Modern Badge
  modernBadge: {
    width: (width - 48) / 2,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  
  badgeGradient: {
    borderRadius: 16,
    padding: 16,
  },
  
  badgeContent: {
    alignItems: 'center',
  },
  
  badgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  
  badgeText: {
    alignItems: 'center',
  },
  
  badgeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  badgeLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Detail Sections  
  detailSectionCard: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  sectionContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  
  // Detail Rows
  detailRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 32,
  },
  detailRowIcon: {
    marginRight: 8,
    width: 16,
  },
  detailRowLabel: {
    flex: 1,
    fontSize: 14,
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Meal Note
  mealNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  mealNoteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  
  // Quick Actions
  quickActionsCard: {
    marginTop: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quickActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionWrapper: {
    flex: 0.48,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  
  // Bottom spacing
  bottomSpacing: {
    height: 100, // Aumentato per fare spazio al floating button
  },
  
  // Floating Action Button
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 28,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Fallback styles per azioni senza gradients
  primaryActionFallback: {
    backgroundColor: '#4CAF50',
  },
  
  secondaryActionFallback: {
    backgroundColor: '#2196F3',
  },
  

  
  // ï¿½ Stili per Salary Card - Opzione D: Layout Verticale con Icone Grandi
  salaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  salaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  
  salaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  
  salaryContent: {
    alignItems: 'center',
  },
  
  salarySection: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  
  salarySectionHighlight: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  
  salaryIconContainer: {
    marginBottom: 6,
  },
  
  salaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  salaryLabelHighlight: {
    fontSize: 14,
    color: '#1a73e8',
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '700',
  },
  
  salaryValueGross: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
    textAlign: 'center',
  },
  
  salaryValueDeduction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
  
  salaryValueNet: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a73e8',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  salaryArrow: {
    paddingVertical: 4,
  },
  
  salaryBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  salaryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  
  salaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  
  salaryFooterText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // ðŸ“Š Stili per Stats Summary Card
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statsContent: {
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e9ecef',
    marginHorizontal: 16,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default DashboardScreen;
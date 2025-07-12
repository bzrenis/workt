import { useMemo } from 'react';
import CalculationService from '../services/CalculationService';

export const useCalculationService = () => {
  return useMemo(() => {
    const service = new CalculationService();
    return {
      calculateMonthlyStandbyAllowances: (year, month, settings) => 
        service.calculateMonthlyStandbyAllowances(year, month, settings),
      calculateEarningsBreakdown: (entry, settings) => 
        service.calculateEarningsBreakdown(entry, settings),
      calculateDailyEarnings: (entry, settings) =>
        service.calculateDailyEarnings(entry, settings),
      calculateMonthlySummary: (entries, settings) =>
        service.calculateMonthlySummary(entries, settings),
      calculateIntegratedBreakdown: (entry, settings) =>
        service.calculateIntegratedBreakdown(entry, settings),
      calculateStandbyAllowanceForDate: (date, settings) =>
        service.calculateStandbyAllowanceForDate(date, settings)
    };
  }, []);
};

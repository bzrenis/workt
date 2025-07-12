import { 
  CCNL_CONTRACTS, 
  getWorkDayHours
} from '../constants';
import { isItalianHoliday } from '../constants/holidays';

/**
 * Gestisce i calcoli delle retribuzioni base (giornaliera, straordinari, maggiorazioni)
 */
export class EarningsCalculator {
  
  constructor(timeCalculator) {
    this.timeCalculator = timeCalculator;
    this.defaultContract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  }

  /**
   * Calcola le maggiorazioni orarie in base alle condizioni di lavoro
   */
  getHourlyRateWithBonus({
    baseRate,
    isOvertime = false,
    isNight = false,
    isHoliday = false,
    isSunday = false,
    contract = this.defaultContract
  }) {
    let multiplier = 1.0;
    
    if (isOvertime) {
      if (isNight) {
        multiplier = contract.overtimeRates?.nightAfter22 || 1.35;
      } else if (isHoliday || isSunday) {
        multiplier = contract.overtimeRates?.holiday || 1.35;
      } else {
        multiplier = contract.overtimeRates?.day || 1.2;
      }
    } else {
      if (isNight) {
        multiplier = contract.overtimeRates?.nightUntil22 || 1.25;
      } else if (isHoliday || isSunday) {
        multiplier = contract.overtimeRates?.holiday || 1.3;
      } else if (isSunday) {
        multiplier = contract.overtimeRates?.saturday || 1.25;
      }
    }
    
    return baseRate * multiplier;
  }

  /**
   * Calcola la retribuzione per giorni fissi (ferie, permessi, malattia, etc.)
   */
  calculateFixedDayEarnings(workEntry, settings) {
    const dayType = workEntry.dayType || 'lavorativa';
    const isFixedDay = workEntry.isFixedDay || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType);
    
    if (isFixedDay && dayType !== 'lavorativa') {
      console.log(`[EarningsCalculator] Giorno fisso rilevato (${dayType}) per ${workEntry.date}, applicazione retribuzione giornaliera standard`);
      
      // Per i giorni fissi, viene corrisposta la retribuzione giornaliera standard
      const dailyRate = settings.contract?.dailyRate || 109.19;
      
      return {
        isFixedDay: true,
        dayType: dayType,
        earnings: {
          regularPay: dailyRate,
          overtimePay: 0,
          ordinaryBonusPay: 0,
          travelPay: 0,
          standbyWorkPay: 0,
          standbyTravelPay: 0,
          standbyAllowance: 0,
          travelAllowance: 0,
          total: dailyRate,
          // Aggiunta compatibilità Dashboard
          breakdown: {
            workHours: 0,
            travelHours: 0,
            standbyWorkHours: 0,
            standbyTravelHours: 0,
            regularHours: 8, // Ore standard giornaliera per giorno fisso
            overtimeHours: 0,
            isStandbyDay: false,
            isFixedDay: true,
            dayType: dayType
          },
          mealAllowances: {
            lunch: { voucher: 0, cash: 0 },
            dinner: { voucher: 0, cash: 0 }
          }
        }
      };
    }
    
    return null; // Non è un giorno fisso
  }

  /**
   * Calcola la retribuzione base per una giornata lavorativa
   */
  calculateBasicEarnings(workEntry, settings, workHours, travelHours) {
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate || (contract.monthlySalary / 173);
    const dailyRate = contract.dailyRate || (contract.monthlySalary / 26);
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    const travelHoursSetting = settings.travelHoursSetting || 'EXCESS_AS_TRAVEL';
    
    // Determina se il giorno è festivo o domenica
    const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSunday = dateObj.getDay() === 0;
    const isSaturday = dateObj.getDay() === 6;
    const isHoliday = isItalianHoliday(workEntry.date);
    
    // Calcolo straordinari
    let overtimePay = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let regularHours = 0;
    let travelPay = 0;

    // LOGICA CCNL: gestione modalità viaggio
    const standardWorkDay = getWorkDayHours();
    console.log(`[EarningsCalculator] Applicazione modalità viaggio: ${travelHoursSetting}`, {
      workHours,
      travelHours,
      standardWorkDay,
      totalHours: workHours + travelHours
    });
    
    if (travelHoursSetting === 'TRAVEL_SEPARATE') {
      console.log(`[EarningsCalculator] Applicando modalità TRAVEL_SEPARATE`);
      // NUOVA MODALITÀ: Viaggio sempre pagato separatamente con tariffa viaggio
      travelPay = travelHours * baseRate * travelCompensationRate;
      
      // Per il lavoro, verifica se completare con diaria o ore effettive
      if (workHours >= standardWorkDay) {
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const extraWorkHours = workHours - standardWorkDay;
        if (extraWorkHours > 0) {
          let overtimeBonusRate = this.getHourlyRateWithBonus({
            baseRate,
            isOvertime: true,
            isNight: workEntry.isNight || false,
            isHoliday,
            isSunday,
            contract
          });
          overtimePay = extraWorkHours * overtimeBonusRate;
          overtimeHours = extraWorkHours;
        }
      } else {
        regularPay = baseRate * workHours;
        regularHours = workHours;
        overtimeHours = 0;
      }
    } else {
      console.log(`[EarningsCalculator] Applicando modalità ${travelHoursSetting} (logica esistente)`);
      // LOGICHE ESISTENTI: considera viaggio + lavoro insieme
      const totalRegularHours = workHours + travelHours;
      if (totalRegularHours >= standardWorkDay) {
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const extraHours = totalRegularHours - standardWorkDay;
        if (extraHours > 0) {
          if (travelHoursSetting === 'EXCESS_AS_TRAVEL') {
            console.log(`[EarningsCalculator] Ore extra (${extraHours}h) pagate come viaggio`);
            // Le ore oltre 8h sono pagate come viaggio
            travelPay = extraHours * baseRate * travelCompensationRate;
            overtimeHours = 0;
          } else if (travelHoursSetting === 'EXCESS_AS_OVERTIME') {
            console.log(`[EarningsCalculator] Ore extra (${extraHours}h) pagate come straordinario`);
            // Le ore oltre 8h sono pagate come straordinario
            let overtimeBonusRate = this.getHourlyRateWithBonus({
              baseRate,
              isOvertime: true,
              isNight: workEntry.isNight || false,
              isHoliday,
              isSunday,
              contract
            });
            overtimePay = extraHours * overtimeBonusRate;
            overtimeHours = extraHours;
          } else {
            console.log(`[EarningsCalculator] Modalità AS_WORK: ore extra incluse nel normale lavoro`);
            // AS_WORK: Default nessun extra, tutto come lavoro normale
            overtimeHours = 0;
          }
        }
      } else {
        console.log(`[EarningsCalculator] Totale ore (${totalRegularHours}h) < giornata standard: calcolo proporzionale`);
        // Se meno di 8h, paga solo le ore effettive
        if (travelHoursSetting === 'AS_WORK') {
          console.log(`[EarningsCalculator] Modalità AS_WORK: tutto come lavoro normale`);
          // Tutto come lavoro normale
          regularPay = baseRate * totalRegularHours;
          regularHours = totalRegularHours;
        } else {
          console.log(`[EarningsCalculator] Altre modalità: pagamento ore effettive`);
          // Per altre modalità, ancora paga tutto come ore effettive
          regularPay = baseRate * totalRegularHours;
          regularHours = totalRegularHours;
        }
        overtimeHours = 0;
      }
    }

    // Lavoro ordinario notturno/festivo/domenicale
    let ordinaryBonusPay = 0;
    const totalRegularHours = workHours + travelHours;
    if (!overtimeHours && (workEntry.isNight || isHoliday || isSunday)) {
      let ordinaryBonusRate = this.getHourlyRateWithBonus({
        baseRate,
        isOvertime: false,
        isNight: workEntry.isNight || false,
        isHoliday,
        isSunday,
        contract
      });
      ordinaryBonusPay = totalRegularHours * (ordinaryBonusRate - baseRate);
    }

    return {
      regularPay,
      overtimePay,
      ordinaryBonusPay,
      travelPay,
      regularHours,
      overtimeHours,
      baseRate,
      contract
    };
  }
}

export default EarningsCalculator;

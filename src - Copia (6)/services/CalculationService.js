import { 
  CCNL_CONTRACTS, 
  calculateOvertimeRate, 
  isNightWork, 
  getWorkDayHours,
  MEAL_TIMES 
} from '../constants';
import { isItalianHoliday } from '../constants/holidays';

class CalculationService {
  constructor() {
    this.defaultContract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  }

  // Parse time string to minutes from midnight
  parseTime(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes to hours
  minutesToHours(minutes) {
    return minutes / 60;
  }

  // Calculate time difference in minutes
  calculateTimeDifference(startTime, endTime) {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    
    if (start === null || end === null) return 0;
    
    // Handle overnight work (end time next day)
    if (end < start) {
      return (24 * 60 - start) + end;
    }
    
    return end - start;
  }

  // Calculate work hours from work entry
  calculateWorkHours(workEntry) {
    let totalWorkMinutes = 0;
    
    // First work shift
    if (workEntry.workStart1 && workEntry.workEnd1) {
      totalWorkMinutes += this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1);
    }
    
    // Second work shift
    if (workEntry.workStart2 && workEntry.workEnd2) {
      totalWorkMinutes += this.calculateTimeDifference(workEntry.workStart2, workEntry.workEnd2);
    }
    
    return this.minutesToHours(totalWorkMinutes);
  }

  // Calculate travel hours
  calculateTravelHours(workEntry) {
    let totalTravelMinutes = 0;
    
    // Outbound travel
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      totalTravelMinutes += this.calculateTimeDifference(workEntry.departureCompany, workEntry.arrivalSite);
    }
    
    // Return travel
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      totalTravelMinutes += this.calculateTimeDifference(workEntry.departureReturn, workEntry.arrivalCompany);
    }
    
    return this.minutesToHours(totalTravelMinutes);
  }

  // Calculate standby work hours
  calculateStandbyWorkHours(workEntry) {
    let totalStandbyMinutes = 0;
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      workEntry.interventi.forEach(intervento => {
        if (intervento.work_start_1 && intervento.work_end_1) {
          totalStandbyMinutes += this.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
        }
        if (intervento.work_start_2 && intervento.work_end_2) {
          totalStandbyMinutes += this.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
        }
      });
    } else {
      // Fallback per la vecchia struttura dati
      if (workEntry.standbyWorkStart1 && workEntry.standbyWorkEnd1) {
        totalStandbyMinutes += this.calculateTimeDifference(workEntry.standbyWorkStart1, workEntry.standbyWorkEnd1);
      }
      if (workEntry.standbyWorkStart2 && workEntry.standbyWorkEnd2) {
        totalStandbyMinutes += this.calculateTimeDifference(workEntry.standbyWorkStart2, workEntry.standbyWorkEnd2);
      }
    }
    return this.minutesToHours(totalStandbyMinutes);
  }

  // Calculate standby travel hours
  calculateStandbyTravelHours(workEntry) {
    let totalStandbyTravelMinutes = 0;
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      workEntry.interventi.forEach(intervento => {
        if (intervento.departure_company && intervento.arrival_site) {
          totalStandbyTravelMinutes += this.calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
        }
        if (intervento.departure_return && intervento.arrival_company) {
          totalStandbyTravelMinutes += this.calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
        }
      });
    } else {
      // Fallback per la vecchia struttura dati
      if (workEntry.standbyDeparture && workEntry.standbyArrival) {
        totalStandbyTravelMinutes += this.calculateTimeDifference(workEntry.standbyDeparture, workEntry.standbyArrival);
      }
      if (workEntry.standbyReturnDeparture && workEntry.standbyReturnArrival) {
        totalStandbyTravelMinutes += this.calculateTimeDifference(workEntry.standbyReturnDeparture, workEntry.standbyReturnArrival);
      }
    }
    return this.minutesToHours(totalStandbyTravelMinutes);
  }

  // Calculate overtime hours based on work time and contract
  calculateOvertimeDetails(workHours, travelHours, contract = this.defaultContract) {
    const standardWorkDay = getWorkDayHours();
    const totalHours = workHours + travelHours;
    
    let regularHours = 0;
    let overtimeHours = 0;
    
    if (totalHours <= standardWorkDay) {
      regularHours = totalHours;
    } else {
      regularHours = standardWorkDay;
      overtimeHours = totalHours - standardWorkDay;
    }
    
    return {
      regularHours,
      overtimeHours,
      totalHours
    };
  }

  // Calcola la retribuzione giornaliera con tutte le maggiorazioni CCNL
  calculateDailyEarnings(workEntry, settings) {
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate || (contract.monthlySalary / 173);
    const dailyRate = contract.dailyRate || (contract.monthlySalary / 26);
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    const travelHoursSetting = settings.travelHoursSetting || 'EXCESS_AS_TRAVEL';
    const standbySettings = settings.standbySettings || {};
    const standbyDays = standbySettings.standbyDays || {};
    const dailyAllowance = parseFloat(standbySettings.dailyAllowance) || 0;

    // Calcolo ore base
    const workHours = this.calculateWorkHours(workEntry);
    const travelHours = this.calculateTravelHours(workEntry);
    const standbyWorkHours = this.calculateStandbyWorkHours(workEntry);
    const standbyTravelHours = this.calculateStandbyTravelHours(workEntry);

    // Determina se il giorno è festivo o domenica
    const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSunday = dateObj.getDay() === 0;
    const isHoliday = isItalianHoliday(dateObj);
    
    // Verifica se il giorno è segnato come reperibile sia tramite calendario impostazioni che flag manuale
    // Log di debug per verificare la data e le impostazioni di reperibilità
    const dateStr = workEntry.date; // Data in formato YYYY-MM-DD
    
    console.log(`[CalculationService] calculateDailyEarnings - Verifica reperibilità per ${dateStr}:`, {
        manualFlag: workEntry.isStandbyDay === true || workEntry.isStandbyDay === 1 || 
                  workEntry.standbyAllowance === true || workEntry.standbyAllowance === 1,
        settingsFlag: standbySettings.enabled && standbyDays && standbyDays[dateStr]?.selected,
        standbyEnabled: standbySettings.enabled,
        standbyDays: standbyDays ? Object.keys(standbyDays).length : 0
    });
    
    // Corretto: considera sia il flag manuale dal form che le impostazioni configurate
    const isStandbyDay = (standbySettings.enabled && standbyDays && standbyDays[dateStr]?.selected) || 
                        workEntry.isStandbyDay === true || 
                        workEntry.isStandbyDay === 1 || 
                        workEntry.standbyAllowance === true || 
                        workEntry.standbyAllowance === 1;

    // Calcolo straordinari
    let overtimePay = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let regularHours = 0;
    let travelPay = 0;

    // LOGICA CCNL: paga base giornaliera se lavoro+viaggio >= 8h
    const standardWorkDay = getWorkDayHours();
    const totalRegularHours = workHours + travelHours;
    if (totalRegularHours >= standardWorkDay) {
      regularPay = dailyRate;
      regularHours = standardWorkDay;
      const extraHours = totalRegularHours - standardWorkDay;
      if (extraHours > 0) {
        if (travelHoursSetting === 'EXCESS_AS_TRAVEL') {
          // Le ore oltre 8h sono pagate come viaggio
          travelPay = extraHours * baseRate * travelCompensationRate;
          overtimeHours = 0;
        } else if (travelHoursSetting === 'EXCESS_AS_OVERTIME') {
          // Le ore oltre 8h sono pagate come straordinario
          let overtimeBonusRate = this.getHourlyRateWithBonus({
            baseRate,
            isOvertime: true,
            isNight: workEntry.isNight || false,
            isHoliday,
            isSunday
          });
          overtimePay = extraHours * overtimeBonusRate;
          overtimeHours = extraHours;
        } else {
          // Default: nessun extra
          overtimeHours = 0;
        }
      }
    } else {
      // Se meno di 8h, paga solo le ore effettive
      regularPay = baseRate * totalRegularHours;
      regularHours = totalRegularHours;
      overtimeHours = 0;
    }

    // Lavoro ordinario notturno/festivo/domenicale
    let ordinaryBonusPay = 0;
    if (!overtimeHours && (workEntry.isNight || isHoliday || isSunday)) {
      let ordinaryBonusRate = this.getHourlyRateWithBonus({
        baseRate,
        isOvertime: false,
        isNight: workEntry.isNight || false,
        isHoliday,
        isSunday
      });
      ordinaryBonusPay = totalRegularHours * (ordinaryBonusRate - baseRate);
    }

    // --- CALCOLO INTERVENTI DURANTE REPERIBILITÀ ---
    let standbyWorkPay = 0;
    if (standbyWorkHours > 0) {
      standbyWorkPay = this.calculateStandbyWorkEarnings(
        workEntry.standbyWorkStart1,
        workEntry.standbyWorkEnd1,
        workEntry.standbyWorkStart2,
        workEntry.standbyWorkEnd2,
        contract
      );
    }
    let standbyTravelPay = 0;
    if (standbyTravelHours > 0) {
      standbyTravelPay = standbyTravelHours * baseRate * travelCompensationRate;
    }

    // --- INDENNITÀ GIORNALIERA REPERIBILITÀ ---
    let standbyAllowance = this.calculateStandbyAllowanceForDate(workEntry.date, settings);
    
    // Verifica anche il flag manuale di reperibilità
    const manualStandbyFlag = workEntry.isStandbyDay === true || 
                             workEntry.isStandbyDay === 1 || 
                             workEntry.standbyAllowance === true ||
                             workEntry.standbyAllowance === 1;
    
    // Se il flag manuale è attivo ma non è stata calcolata l'indennità dalle impostazioni
    if (manualStandbyFlag && standbyAllowance === 0 && settings?.standbySettings?.enabled) {
      standbyAllowance = parseFloat(settings.standbySettings.dailyAllowance) || 7.50;
      console.log(`[CalculationService] Attivata indennità reperibilità da flag manuale per ${workEntry.date}: ${standbyAllowance}€`);
    }
    
    console.log(`[CalculationService] Indennità reperibilità per ${workEntry.date}: ${standbyAllowance}€ (manuale: ${manualStandbyFlag}, dalle impostazioni: ${this.calculateStandbyAllowanceForDate(workEntry.date, settings) > 0})`);

    // --- INDENNITÀ TRASFERTA ---
    let travelAllowance = 0;
    const travelAllowanceSettings = settings.travelAllowance || {};
    const travelAllowanceEnabled = travelAllowanceSettings.enabled;
    const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
    const travelAllowanceOption = travelAllowanceSettings.option || 'WITH_TRAVEL';
    const autoActivate = travelAllowanceSettings.autoActivate;
    let travelAllowancePercent = 1.0;
    if (typeof workEntry.travelAllowancePercent === 'number') {
      travelAllowancePercent = workEntry.travelAllowancePercent;
    }
    if (travelAllowanceEnabled && travelAllowanceAmount > 0) {
      let attiva = false;
      const totalWorked = workHours + travelHours;
      const isFullDay = totalWorked >= 8;
      const isHalfDay = totalWorked > 0 && totalWorked < 8;
      const isStandbyNonLavorativo = isStandbyDay && standbyWorkHours > 0 && totalWorked === 0;
      switch (travelAllowanceOption) {
        case 'WITH_TRAVEL':
          attiva = travelHours > 0;
          break;
        case 'ALWAYS':
          attiva = true;
          break;
        case 'FULL_DAY_ONLY':
          attiva = isFullDay;
          break;
        case 'ALSO_ON_STANDBY':
          attiva = travelHours > 0 || isStandbyNonLavorativo;
          break;
        case 'FULL_ALLOWANCE_HALF_DAY':
          attiva = totalWorked > 0;
          break;
        case 'HALF_ALLOWANCE_HALF_DAY':
          attiva = totalWorked > 0;
          break;
        default:
          attiva = travelHours > 0;
      }
      if (attiva) {
        if (travelAllowanceOption === 'HALF_ALLOWANCE_HALF_DAY' && isHalfDay) {
          travelAllowance = travelAllowanceAmount / 2;
        } else {
          travelAllowance = travelAllowanceAmount * travelAllowancePercent;
        }
      }
    }

    // Gestione ferie e permessi: se il giorno è ferie o permesso, escludi dal calcolo retribuzione
    if (workEntry.ferie) {
      return {
        regularPay: 0,
        overtimePay: 0,
        ordinaryBonusPay: 0,
        travelPay: 0,
        standbyWorkPay: 0,
        standbyTravelPay: 0,
        standbyAllowance: 0,
        total: 0,
        breakdown: {
          ferie: true,
          permesso: false
        }
      };
    }
    if (workEntry.permesso) {
      return {
        regularPay: 0,
        overtimePay: 0,
        ordinaryBonusPay: 0,
        travelPay: 0,
        standbyWorkPay: 0,
        standbyTravelPay: 0,
        standbyAllowance: 0,
        total: 0,
        breakdown: {
          ferie: false,
          permesso: true
        }
      };
    }

    // Totale
    const total = regularPay + overtimePay + ordinaryBonusPay + travelPay + standbyWorkPay + standbyTravelPay + standbyAllowance + travelAllowance;
    
    // Alla fine di calculateDailyEarnings, prima del return
    const mealAllowances = {};
    if (workEntry.mealLunchVoucher === 1) mealAllowances.lunch = { type: 'voucher', amount: settings.mealAllowances?.lunch?.voucherAmount || 0 };
    if (workEntry.mealLunchCash > 0) mealAllowances.lunch = { type: 'cash', amount: workEntry.mealLunchCash };
    if (workEntry.mealDinnerVoucher === 1) mealAllowances.dinner = { type: 'voucher', amount: settings.mealAllowances?.dinner?.voucherAmount || 0 };
    if (workEntry.mealDinnerCash > 0) mealAllowances.dinner = { type: 'cash', amount: workEntry.mealDinnerCash };

    return {
      regularPay,
      overtimePay,
      ordinaryBonusPay,
      travelPay,
      standbyWorkPay,
      standbyTravelPay,
      standbyAllowance,
      travelAllowance,
      total,
      breakdown: {
        workHours,
        travelHours,
        standbyWorkHours,
        standbyTravelHours,
        regularHours,
        overtimeHours,
        isStandbyDay
      },
      note: workEntry.isStandbyDay ? 'Indennità reperibilità inclusa. Il CCNL Metalmeccanico PMI non prevede una retribuzione aggiuntiva per la prima uscita: ogni intervento è retribuito secondo le maggiorazioni orarie.' : undefined,
      mealAllowances,
    };
  }

  // Esempio di utilizzo nei calcoli (da applicare in calculateDailyEarnings e simili):
  // const bonusRate = this.getHourlyRateWithBonus({
  //   baseRate: contract.hourlyRate,
  //   isOvertime: true,
  //   isNight: isNightWork(hour),
  //   isHoliday: isHolidayDay,
  //   isSunday: isSundayDay
  // });
  // earnings.overtimePay = overtimeHours * bonusRate;

  /**
   * @typedef {Object} EarningsBreakdown
   * @property {Object.<string, number>} hours - Ore suddivise per categoria (es. ordinary_day, overtime_night)
   * @property {Object.<string, number>} earnings - Guadagni suddivisi per categoria
   * @property {Object.<string, number>} allowances - Indennità (es. travel, standby)
   * @property {number} totalEarnings - Guadagno totale
   * @property {Object} details - Dettagli aggiuntivi (isHoliday, isSunday, etc.)
   */

  /**
   * Calcola la retribuzione giornaliera con un'analisi dettagliata di ogni fascia oraria e breakdown reperibilità.
   * @param {object} workEntry - L'oggetto con i dati di lavoro.
   * @param {object} settings - Le impostazioni dell'utente.
   * @returns {EarningsBreakdown} - Il dettaglio dei guadagni.
   */
  calculateEarningsBreakdown(workEntry, settings) {
    // Inizializza le strutture di base per il calcolo
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate || 16.41;
    const date = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSaturday = date.getDay() === 6;
    const isSunday = date.getDay() === 0;
    const isHoliday = isItalianHoliday(date);
    const isSpecialDay = isSaturday || isSunday || isHoliday;
    
    // Calcolo ore di lavoro e viaggio
    const workHours = this.calculateWorkHours(workEntry) || 0;
    const travelHours = this.calculateTravelHours(workEntry) || 0;
    const totalOrdinaryHours = workHours + travelHours;
    
    // Calcola dettagli di ore ordinarie/straordinarie
    const standardWorkDay = getWorkDayHours();
    let regularHours = Math.min(totalOrdinaryHours, standardWorkDay);
    let extraHours = Math.max(0, totalOrdinaryHours - standardWorkDay);
    
    // Struttura per il breakdown
    const result = {
      ordinary: {
        hours: {
          lavoro_giornaliera: Math.min(workHours, standardWorkDay),
          viaggio_giornaliera: Math.min(travelHours, Math.max(0, standardWorkDay - workHours)),
          lavoro_extra: Math.max(0, workHours - standardWorkDay),
          viaggio_extra: Math.max(0, travelHours - Math.max(0, standardWorkDay - workHours))
        },
        earnings: {
          giornaliera: 0,
          viaggio_extra: 0,
          lavoro_extra: 0
        },
        total: 0
      },
      standby: null,
      allowances: {
        travel: 0,
        meal: 0,
        standby: 0
      },
      totalEarnings: 0,
      details: {
        isSaturday,
        isSunday,
        isHoliday,
        isSpecialDay,
        regularHours,
        extraHours,
        totalOrdinaryHours,
        corrected: false
      }
    };
    
    // Calcola gli earnings per le ore ordinarie
    if (isSpecialDay) {
      // Calcola con maggiorazione CCNL per tutte le ore in giorni speciali
      const ccnlMultiplier = isHoliday || isSunday 
        ? (contract.overtimeRates?.holiday || 1.3)  // Maggiorazione festivo/domenica
        : (contract.overtimeRates?.saturday || 1.15); // Maggiorazione sabato
      
      // Calcola tutte le ore lavorate + viaggio con maggiorazione
      result.ordinary.earnings.giornaliera = result.ordinary.hours.lavoro_giornaliera * baseRate * ccnlMultiplier;
      result.ordinary.earnings.viaggio_giornaliera = result.ordinary.hours.viaggio_giornaliera * baseRate * ccnlMultiplier;
      result.ordinary.earnings.lavoro_extra = result.ordinary.hours.lavoro_extra * baseRate * ccnlMultiplier;
      result.ordinary.earnings.viaggio_extra = result.ordinary.hours.viaggio_extra * baseRate * ccnlMultiplier;
      
      // Calcola il totale con maggiorazione per tutte le ore
      result.ordinary.total = (result.ordinary.hours.lavoro_giornaliera + 
                              result.ordinary.hours.viaggio_giornaliera +
                              result.ordinary.hours.lavoro_extra +
                              result.ordinary.hours.viaggio_extra) * baseRate * ccnlMultiplier;
                              
      // Marca come corretto
      result.details.corrected = true;
    } else {
      // Giorni feriali: calcolo standard
      if (totalOrdinaryHours >= standardWorkDay) {
        // Giornata piena: paga giornaliera + extra
        result.ordinary.earnings.giornaliera = contract.dailyRate || 109.19;
        result.ordinary.earnings.viaggio_extra = result.ordinary.hours.viaggio_extra * baseRate * (settings.travelCompensationRate || 1.0);
        result.ordinary.earnings.lavoro_extra = result.ordinary.hours.lavoro_extra * baseRate * (contract.overtimeRates?.day || 1.2);
        
        // Giornata completa: non necessita completamento
        result.details.isPartialDay = false;
        result.details.missingHours = 0;
        result.details.completamentoTipo = workEntry.completamentoGiornata || 'nessuno';
      } else {
        // Giornata parziale: proporzionale alle ore
        result.ordinary.earnings.giornaliera = (result.ordinary.hours.lavoro_giornaliera + 
                                              result.ordinary.hours.viaggio_giornaliera) * baseRate;
        
        // Per giorni feriali: calcola le ore mancanti e imposta isPartialDay
        result.details.isPartialDay = true;
        result.details.missingHours = standardWorkDay - totalOrdinaryHours;
        result.details.completamentoTipo = workEntry.completamentoGiornata || 'nessuno';
        
        // Se il completamento è specificato, considera la giornata come completa ai fini del calcolo
        if (workEntry.completamentoGiornata && workEntry.completamentoGiornata !== 'nessuno') {
          result.ordinary.earnings.giornaliera = contract.dailyRate || 109.19;
        }
      }
      
      result.ordinary.total = result.ordinary.earnings.giornaliera + 
                             result.ordinary.earnings.viaggio_extra + 
                             result.ordinary.earnings.lavoro_extra;
    }
    
    // Calcola la reperibilità se attiva
    const isStandbyDay = workEntry.isStandbyDay === true || 
                        workEntry.isStandbyDay === 1 || 
                        workEntry.standbyAllowance === true || 
                        workEntry.standbyAllowance === 1 || 
                        (settings?.standbySettings?.enabled && 
                        settings?.standbySettings?.standbyDays && 
                        settings?.standbySettings?.standbyDays[workEntry.date]?.selected);
    
    if (isStandbyDay) {
      result.standby = this.calculateStandbyBreakdown(workEntry, settings);
      
      // Aggiungi l'indennità giornaliera di reperibilità all'oggetto allowances
      // per visualizzarla nella sezione "Indennità e Buoni" del form
      if (settings?.standbySettings?.enabled) {
        const dailyAllowance = parseFloat(settings.standbySettings.dailyAllowance) || 7.50;
        result.allowances.standby = dailyAllowance;
        console.log(`[CalculationService] Aggiunta indennità reperibilità di ${dailyAllowance}€ alle indennità per ${workEntry.date}`);
      }
    }
    
    // Calcola le indennità (trasferta, pasti, etc.)
    const travelAllowanceSettings = settings.travelAllowance || {};
    const travelAllowanceEnabled = travelAllowanceSettings.enabled;
    const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
    let travelAllowancePercent = workEntry.travelAllowancePercent || 1.0;
    
    // Calcola indennità trasferta in base alle regole
    if (travelAllowanceEnabled && travelAllowanceAmount > 0 && workEntry.travelAllowance) {
      // Verifica se l'indennità può essere applicata in giorni speciali
      const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;
      // Verifica se l'utente ha fatto un override manuale
      const manualOverride = workEntry.trasfertaManualOverride || false;
      
      // Applica l'indennità se:
      // - Non è un giorno speciale (domenica/festivo), OPPURE
      // - È abilitata l'impostazione per applicare l'indennità nei giorni speciali, OPPURE
      // - L'utente ha fatto un override manuale attivando l'indennità per questo giorno specifico
      if (!(isSunday || isHoliday) || applyOnSpecialDays || manualOverride) {
        result.allowances.travel = travelAllowanceAmount * travelAllowancePercent;
      }
    }
    
    // Calcola rimborsi pasti
    // Pranzo: valori specifici nel form hanno priorità sui valori dalle impostazioni
    if (workEntry.mealLunchCash > 0) {
      // Se c'è un valore specifico nel form, usa solo quello
      result.allowances.meal += workEntry.mealLunchCash;
    } else if (workEntry.mealLunchVoucher === 1) {
      // Altrimenti usa i valori standard dalle impostazioni (sia buono che contanti)
      result.allowances.meal += settings.mealAllowances?.lunch?.voucherAmount || 0;
      result.allowances.meal += settings.mealAllowances?.lunch?.cashAmount || 0;
    }
    
    // Cena: stesso approccio del pranzo
    if (workEntry.mealDinnerCash > 0) {
      // Se c'è un valore specifico nel form, usa solo quello
      result.allowances.meal += workEntry.mealDinnerCash;
    } else if (workEntry.mealDinnerVoucher === 1) {
      // Altrimenti usa i valori standard dalle impostazioni (sia buono che contanti)
      result.allowances.meal += settings.mealAllowances?.dinner?.voucherAmount || 0;
      result.allowances.meal += settings.mealAllowances?.dinner?.cashAmount || 0;
    }
    
    // Imposta che per i giorni speciali non è richiesto il completamento delle 8 ore
    if (isSaturday || isSunday || isHoliday) {
      result.details.isPartialDay = false;
      result.details.completamentoTipo = 'nessuno';
      result.details.missingHours = 0;
      // Assicuriamoci che il completamentoGiornata sia impostato su 'nessuno'
      workEntry.completamentoGiornata = 'nessuno';
    }
    
    // Calcola il totale guadagno giornaliero (esclusi rimborsi pasti)
    result.totalEarnings = result.ordinary.total + 
                          (result.allowances.travel || 0) + 
                          (result.allowances.standby || 0) + 
                          (result.standby ? (result.standby.totalEarnings || 0) : 0);
    
    // Logging per giorni speciali
    if (isSpecialDay) {
      console.log("[CalculationService] Calcolo totale guadagno per " + workEntry.date + ":", {
        isHoliday,
        isSaturday, 
        isSunday,
        totalAllowances: result.allowances.travel,
        totalEarnings: result.totalEarnings,
        totalOrdinaryEarnings: result.ordinary.total,
        totalStandbyEarnings: result.standby?.totalEarnings || 0,
        // Dettagli per debug
        regularHours,
        extraHours,
        totalHours: (result.ordinary.hours.lavoro_giornaliera || 0) +
                   (result.ordinary.hours.viaggio_giornaliera || 0) +
                   (result.ordinary.hours.lavoro_extra || 0) +
                   (result.ordinary.hours.viaggio_extra || 0),
        baseRate: baseRate,
        appliedMultiplier: isHoliday || isSunday 
          ? (contract.overtimeRates?.holiday || 1.3)
          : (contract.overtimeRates?.saturday || 1.15),
        // Dettagli completamento giornata
        isPartialDay: result.details.isPartialDay,
        completamentoTipo: result.details.completamentoTipo,
        missingHours: result.details.missingHours
      });
      
      console.log("[CalculationService] Nei giorni speciali (sabato/domenica/festivi) non è richiesto effettuare 8 ore lavorative. Il completamento giornata è stato disattivato.");
    }
    
    return result;

    // Log per debug - per tutti i giorni speciali
    if (isSpecialDay) {
      console.log("[CalculationService] Calcolo totale guadagno per " + workEntry.date + ":", {
        isHoliday: result.details.isHoliday,
        isSaturday: result.details.isSaturday,
        isSunday: result.details.isSunday,
        totalAllowances: result.allowances.travel || 0,
        totalEarnings: result.totalEarnings,
        totalOrdinaryEarnings: result.ordinary.total,
        totalStandbyEarnings: result.standby?.totalEarnings || 0,
        // Dettagli per debug
        regularHours: result.details.regularHours,
        extraHours: result.details.extraHours,
        totalHours: (result.ordinary.hours.lavoro_giornaliera || 0) +
                   (result.ordinary.hours.viaggio_giornaliera || 0) +
                   (result.ordinary.hours.lavoro_extra || 0) +
                   (result.ordinary.hours.viaggio_extra || 0),
        baseRate: settings.contract?.hourlyRate || 16.41,
        appliedMultiplier: isHoliday || isSunday 
          ? (settings.contract?.overtimeRates?.holiday || 1.3)
          : (settings.contract?.overtimeRates?.saturday || 1.15)
      });
    }
    
    return result;
  }

  /**
   * @typedef {Object} StandbyBreakdown
   * @property {number} dailyIndemnity - Indennità giornaliera per reperibilità
   * @property {Object} workHours - Ore di lavoro suddivise per fascia (es. ordinary, night, holiday)
   * @property {Object} travelHours - Ore di viaggio suddivise per fascia (es. ordinary, night, holiday)
   * @property {Object} workEarnings - Guadagni per il lavoro suddivisi per fascia
   * @property {Object} travelEarnings - Guadagni per il viaggio suddivisi per fascia
   * @property {number} totalEarnings - Guadagno totale per reperibilità (inclusa indennità)
   */

  /**
   * Calcola la suddivisione dettagliata della reperibilità per indennità, ore viaggio e ore lavoro, con fasce orarie e guadagni.
   * @param {object} workEntry - L'oggetto con i dati di lavoro.
   * @param {object} settings - Le impostazioni dell'utente.
   * @returns {StandbyBreakdown} - Il dettaglio della reperibilità.
   */
  calculateStandbyBreakdown(workEntry, settings) {
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate;
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    const standbySettings = settings.standbySettings || {};
    const standbyDays = standbySettings.standbyDays || {};
    const dailyAllowance = parseFloat(standbySettings.dailyAllowance) || 0;
    // Verifica reperibilità dall'impostazione calendario e/o flag manuale
    const dateStr = workEntry.date;
    
    // Flag manuale: ha priorità su tutto (sia per attivare che per disattivare)
    const hasManualFlag = workEntry.isStandbyDay !== undefined || 
                         workEntry.standbyAllowance !== undefined;
    
    // Se il flag manuale è presente (true o false), ha priorità
    // Altrimenti, controlla le impostazioni del calendario
    const isStandbyDay = hasManualFlag 
        ? (workEntry.isStandbyDay === true || 
           workEntry.isStandbyDay === 1 || 
           workEntry.standbyAllowance === true || 
           workEntry.standbyAllowance === 1)
        : (standbySettings.enabled && standbyDays && standbyDays[dateStr]?.selected);
    
    // Log dettagliato per debug reperibilità
    console.log(`[CalculationService] calculateStandbyBreakdown - Verifica reperibilità per ${dateStr}:`, {
      manualFlag: workEntry.isStandbyDay === true || workEntry.isStandbyDay === 1 || 
                workEntry.standbyAllowance === true || workEntry.standbyAllowance === 1,
      settingsFlag: standbySettings.enabled && standbyDays && standbyDays[dateStr]?.selected,
      standbyEnabled: standbySettings.enabled,
      standbyDays: standbyDays ? Object.keys(standbyDays).length : 0,
      result: isStandbyDay
    });

    const parsedDate = this.safeParseDate(workEntry.date);
    if (!parsedDate) {
      return {
        dailyIndemnity: 0,
        workHours: {},
        travelHours: {},
        workEarnings: {},
        travelEarnings: {},
        totalEarnings: 0
      };
    }
    const isHoliday = isItalianHoliday(parsedDate);
    const isSunday = parsedDate.getDay() === 0;

    // Segmenti di intervento reperibilità (inclusi tutti i viaggi di partenza e ritorno)
    const segments = [];
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      workEntry.interventi.forEach(iv => {
        // Viaggio di partenza (azienda -> luogo intervento)
        if (iv.departure_company && iv.arrival_site) {
          segments.push({ start: iv.departure_company, end: iv.arrival_site, type: 'standby_travel' });
        }
        // Primo turno lavoro
        if (iv.work_start_1 && iv.work_end_1) {
          segments.push({ start: iv.work_start_1, end: iv.work_end_1, type: 'standby_work' });
        }
        // Secondo turno lavoro
        if (iv.work_start_2 && iv.work_end_2) {
          segments.push({ start: iv.work_start_2, end: iv.work_end_2, type: 'standby_work' });
        }
        // Viaggio di ritorno (luogo intervento -> azienda)
        if (iv.departure_return && iv.arrival_company) {
          segments.push({ start: iv.departure_return, end: iv.arrival_company, type: 'standby_travel' });
        }
      });
    }

    // Suddivisione minuti per fascia oraria
    const minuteDetails = {
      work: { ordinary: 0, night: 0, holiday: 0, night_holiday: 0 },
      travel: { ordinary: 0, night: 0, holiday: 0, night_holiday: 0 }
    };

    for (const segment of segments) {
      const startMinutes = this.parseTime(segment.start);
      const duration = this.calculateTimeDifference(segment.start, segment.end);
      for (let i = 0; i < duration; i++) {
        const currentMinute = (startMinutes + i) % 1440;
        const hour = Math.floor(currentMinute / 60);
        const night = isNightWork(hour);
        let key = 'ordinary';
        if ((isHoliday || isSunday) && night) key = 'night_holiday';
        else if (isHoliday || isSunday) key = 'holiday';
        else if (night) key = 'night';
        // Somma minuti
        if (segment.type === 'standby_work') minuteDetails.work[key]++;
        if (segment.type === 'standby_travel') minuteDetails.travel[key]++;
      }
    }

    // Conversione minuti in ore
    const hours = {
      work: {},
      travel: {}
    };
    Object.keys(minuteDetails.work).forEach(k => {
      hours.work[k] = this.minutesToHours(minuteDetails.work[k]);
      hours.travel[k] = this.minutesToHours(minuteDetails.travel[k]);
    });

    // Calcolo guadagni per fascia oraria
    const earnings = {
      work: {},
      travel: {}
    };
    // Maggiorazioni CCNL
    const ccnlRates = contract.overtimeRates || {};
    const multipliers = {
      ordinary: 1.0,
      night: ccnlRates.nightUntil22 || 1.2,
      holiday: ccnlRates.holiday || 1.3,
      night_holiday: ccnlRates.nightHoliday || 1.5
    };
    Object.keys(hours.work).forEach(k => {
      earnings.work[k] = hours.work[k] * baseRate * (multipliers[k] || 1.0);
      earnings.travel[k] = hours.travel[k] * baseRate * travelCompensationRate * (multipliers[k] || 1.0);
    });

    // Guadagno totale reperibilità (inclusa indennità)
    const isStandbyActive = (workEntry.isStandbyDay === true || workEntry.isStandbyDay === 1);
    
    const totalEarnings = Object.values(earnings.work).reduce((a, b) => a + b, 0)
      + Object.values(earnings.travel).reduce((a, b) => a + b, 0)
      + (isStandbyActive ? dailyAllowance : 0);

    // Calcolo indennità giornaliera
    const dailyIndemnity = isStandbyActive ? dailyAllowance : 0;

    return {
      dailyIndemnity, // Indennità giornaliera
      workHours: hours.work, // Ore lavoro per fascia
      travelHours: hours.travel, // Ore viaggio per fascia
      workEarnings: earnings.work, // Guadagni lavoro per fascia
      travelEarnings: earnings.travel, // Guadagni viaggio per fascia
      totalEarnings // Guadagno totale reperibilità (inclusa indennità)
    };
  }

  getRateMultiplierForCategory(category, contract) {
    const ccnlRates = contract.overtimeRates; // Assumendo che le maggiorazioni siano qui
    if (category.includes('standby')) {
        // La reperibilità segue le stesse maggiorazioni del lavoro normale/straordinario
        category = category.replace('standby_', '');
    }

    if (category === 'overtime_night_holiday') return ccnlRates.nightHolidayOvertime || 1.55; // Esempio
    if (category === 'overtime_holiday') return ccnlRates.holiday || 1.55;
    if (category === 'overtime_night') return ccnlRates.nightAfter22 || 1.50;
    if (category === 'overtime') return ccnlRates.day || 1.30;
    if (category === 'ordinary_night_holiday') return ccnlRates.nightHoliday || 1.50;
    if (category === 'ordinary_holiday') return ccnlRates.holiday || 1.40;
    if (category === 'ordinary_night') return ccnlRates.nightUntil22 || 1.20;
    
    return 1.0; // ordinary
  }

  calculateAllowances(workEntry, settings, hoursBreakdown) {
      const allowances = {
          travel: 0,
          standby: 0,
          meal: 0,
      };

      // Logica Indennità di Trasferta
      const travelSettings = settings.travelAllowance || {};
      if (travelSettings.enabled) {
          // Verifica se ci sono ore di viaggio
          const travelHours = (hoursBreakdown.viaggio_giornaliera || 0) + (hoursBreakdown.viaggio_extra || 0);
          
          // Attiva l'indennità solo se:
          // 1) ci sono ore di viaggio, OPPURE
          // 2) il flag travelAllowance è stato attivato manualmente nel form
          if (travelHours > 0 || (workEntry.travelAllowance === 1 || workEntry.travelAllowance === true)) {
              // Applica percentuale se presente (per mezza giornata)
              const percentuale = workEntry.travelAllowancePercent || 1.0;
              allowances.travel = (parseFloat(travelSettings.dailyAmount) || 0) * percentuale;
          }
      }

      // Logica Indennità di Reperibilità
      // NOTA: Questo valore viene usato per mostrare l'indennità nel riepilogo
      const standbySettings = settings.standbySettings || {};
      const dateStr = workEntry.date; // Data in formato YYYY-MM-DD
      
      // Log di debug per verificare la data e le impostazioni di reperibilità
      console.log(`[CalculationService] Verifica reperibilità per ${dateStr}:`, {
          manualFlag: workEntry.isStandbyDay === true || workEntry.isStandbyDay === 1 || 
                    workEntry.standbyAllowance === true || workEntry.standbyAllowance === 1,
          settingsFlag: standbySettings.standbyDays && standbySettings.standbyDays[dateStr]?.selected,
          standbyEnabled: standbySettings.enabled,
          standbyDays: standbySettings.standbyDays ? Object.keys(standbySettings.standbyDays).length : 0
      });
      
      // Flag manuale: ha priorità su tutto (sia per attivare che per disattivare)
      const hasManualFlag = workEntry.isStandbyDay !== undefined || 
                          workEntry.standbyAllowance !== undefined;
      
      // Se il flag manuale è presente (true o false), ha priorità
      // Altrimenti, controlla le impostazioni del calendario
      const isStandbyDay = hasManualFlag 
          ? (workEntry.isStandbyDay === true || 
             workEntry.isStandbyDay === 1 || 
             workEntry.standbyAllowance === true || 
             workEntry.standbyAllowance === 1)
          : (standbySettings.enabled && standbySettings.standbyDays && 
             standbySettings.standbyDays[dateStr]?.selected);
      
      if (isStandbyDay) {
          // Assegna il valore dell'indennità giornaliera di reperibilità
          allowances.standby = parseFloat(standbySettings.dailyAllowance) || 
                               parseFloat(standbySettings.dailyIndemnity) || 
                               7.50; // Valore predefinito CCNL
      }
      
      // Logica Buoni Pasto (aggiornata)
      // Gestisce correttamente i casi con valori specifici nel form (priorità) e quelli dalle impostazioni
      
      // Pranzo: valori specifici nel form hanno priorità sui valori dalle impostazioni
      if(workEntry.mealLunchCash > 0) {
        // Se c'è un valore specifico nel form, usa solo quello
        allowances.meal += workEntry.mealLunchCash;
      } else if (workEntry.mealLunchVoucher) {
        // Altrimenti usa i valori standard dalle impostazioni
        allowances.meal += settings.mealAllowances?.lunch?.voucherAmount || 0;
        allowances.meal += settings.mealAllowances?.lunch?.cashAmount || 0;
      }
      
      // Cena: stesso approccio del pranzo
      if(workEntry.mealDinnerCash > 0) {
        // Se c'è un valore specifico nel form, usa solo quello
        allowances.meal += workEntry.mealDinnerCash;
      } else if (workEntry.mealDinnerVoucher) {
        // Altrimenti usa i valori standard dalle impostazioni
        allowances.meal += settings.mealAllowances?.dinner?.voucherAmount || 0;
        allowances.meal += settings.mealAllowances?.dinner?.cashAmount || 0;
      }

      return allowances;
  }


  // Calcolo della tariffa oraria maggiorata in base al tipo di lavoro e giorno
  getHourlyRateWithBonus({
    baseRate,
    isOvertime = false,
    isNight = false,
    isHoliday = false,
    isSunday = false
  }) {
    if (isOvertime && isNight) return baseRate * 1.5; // Straordinario notturno +50%
    if (isOvertime && (isHoliday || isSunday)) return baseRate * 1.5; // Straordinario festivo/domenicale +50%
    if (isOvertime) return baseRate * 1.2; // Straordinario diurno +20%
    if (isNight && isHoliday) return baseRate * 1.6; // Lavoro ordinario notturno festivo +60%
    if (isNight) return baseRate * 1.25; // Lavoro ordinario notturno +25%
    if (isHoliday || isSunday) return baseRate * 1.3; // Lavoro ordinario festivo/domenicale +30%
    return baseRate;
  }

  // Calculate standby work earnings with night work considerations
  calculateStandbyWorkEarnings(start1, end1, start2, end2, contract) {
    let totalEarnings = 0;
    
    const shifts = [
      { start: start1, end: end1 },
      { start: start2, end: end2 }
    ];
    
    shifts.forEach(shift => {
      if (!shift.start || !shift.end) return;
      
      const startHour = parseInt(shift.start.split(':')[0]);
      const endHour = parseInt(shift.end.split(':')[0]);
      const shiftMinutes = this.calculateTimeDifference(shift.start, shift.end);
      const shiftHours = this.minutesToHours(shiftMinutes);
      
      // Simplified calculation - could be more sophisticated to handle mixed rates within shift
      let rate = contract.hourlyRate;
      
      if (endHour > 22 || endHour < 6) {
        rate = contract.hourlyRate * contract.overtimeRates.nightAfter22;
      } else if (startHour >= 22 || endHour >= 22) {
        rate = contract.hourlyRate * contract.overtimeRates.nightUntil22;
      } else {
        rate = contract.hourlyRate * contract.overtimeRates.day;
      }
      
      totalEarnings += shiftHours * rate;
    });
    
    return totalEarnings;
  }

  // Calculate monthly summary
  calculateMonthlySummary(workEntries, settings, month, year) {
    const summary = {
      totalHours: 0,
      workHours: 0,
      travelHours: 0,
      travelExtraHours: 0,
      overtimeHours: 0,
      standbyWorkHours: 0,
      standbyTravelHours: 0,
      regularDays: 0,
      weekendHolidayDays: 0,
      standbyDays: 0,
      travelAllowanceDays: 0,
      mealVoucherDays: 0,
      mealCashDays: 0,
      lunchCount: 0,
      dinnerCount: 0,
      mealVoucherAmount: 0,
      mealCashAmount: 0,
      totalEarnings: 0,
      regularPay: 0,
      overtimePay: 0,
      travelPay: 0,
      standbyPay: 0,
      allowances: 0,
      mealAllowances: 0,
      overtimeDetail: {
        day: 0,
        nightUntil22: 0,
        nightAfter22: 0
      },
      dailyBreakdown: []
    };
    
    // Protezione contro workEntries nullo o non array
    if (!workEntries || !Array.isArray(workEntries)) {
      console.error('calculateMonthlySummary: workEntries non valido', workEntries);
      return summary;
    }
    
    // Determina mese e anno dalle entry o dai parametri
    let targetMonth, targetYear;
    
    // Usa i parametri se forniti
    if (month !== undefined && year !== undefined) {
      targetMonth = month;
      targetYear = year;
    }
    // Altrimenti, prendi la prima entry valida per determinare mese/anno
    else if (workEntries.length > 0 && workEntries[0].date) {
      const firstEntryDate = new Date(workEntries[0].date);
      targetYear = firstEntryDate.getFullYear();
      targetMonth = firstEntryDate.getMonth() + 1; // getMonth() restituisce 0-11
    } else {
      // Se non ci sono entry e nessun parametro, usa il mese/anno corrente
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }
    
    // Aggiungiamo un'analisi iniziale del mese/anno per trovare i giorni di reperibilità dalle impostazioni
    // In caso di assenza di inserimenti normali per quei giorni
    if (settings?.standbySettings?.enabled && settings?.standbySettings?.standbyDays) {
      const standbyDays = settings.standbySettings.standbyDays;
      // Filtriamo le date di reperibilità che corrispondono al mese/anno richiesto
      const standbyDatesOfMonth = Object.keys(standbyDays).filter(date => {
        if (!standbyDays[date]?.selected) return false;
        
        const [y, m] = date.split('-');
        return parseInt(y) === parseInt(targetYear) && parseInt(m) === parseInt(targetMonth);
      });
      
      console.log(`[CalculationService] Trovati ${standbyDatesOfMonth.length} giorni di reperibilità nel mese ${targetYear}-${targetMonth} dalle impostazioni`);
    }
    
    workEntries.forEach(entry => {
      const dailyEarnings = this.calculateDailyEarnings(entry, settings);
      const workHours = this.calculateWorkHours(entry);
      const travelHours = this.calculateTravelHours(entry);
      const travelExtraHours = this.calculateExtraTravelHours ? this.calculateExtraTravelHours(entry) : 0;
      const standbyWorkHours = this.calculateStandbyWorkHours(entry);
      const standbyTravelHours = this.calculateStandbyTravelHours(entry);
      
      // Ore totali e per categoria
      summary.totalHours += workHours + travelHours + standbyWorkHours + standbyTravelHours;
      summary.workHours += workHours;
      summary.travelHours += travelHours;
      summary.travelExtraHours += travelExtraHours;
      summary.overtimeHours += dailyEarnings.breakdown?.overtimeHours || 0;
      summary.standbyWorkHours += standbyWorkHours;
      summary.standbyTravelHours += standbyTravelHours;
      
      // Dettaglio ore straordinarie per tipo di maggiorazione
      if (dailyEarnings.breakdown?.overtimeDetail) {
        summary.overtimeDetail.day += dailyEarnings.breakdown.overtimeDetail.day || 0;
        summary.overtimeDetail.nightUntil22 += dailyEarnings.breakdown.overtimeDetail.nightUntil22 || 0;
        summary.overtimeDetail.nightAfter22 += dailyEarnings.breakdown.overtimeDetail.nightAfter22 || 0;
      }
      
      // Conteggio giorni per tipo di reperibilità
      // Considera sia il flag manuale (isStandbyDay/standbyAllowance) che le impostazioni
      const isStandbyDayManual = entry.isStandbyDay === 1 || entry.standbyAllowance === 1;
      const isStandbyDayFromSettings = settings?.standbySettings?.enabled && 
        settings?.standbySettings?.standbyDays && 
        settings?.standbySettings?.standbyDays[entry.date]?.selected;
        
      if (isStandbyDayManual || isStandbyDayFromSettings) {
        summary.standbyDays++;
        console.log(`[CalculationService] Conteggio giorni reperibilità: ${entry.date} conteggiato. Fonte: ${isStandbyDayManual ? 'Flag manuale' : 'Impostazioni'}`);
      }
      
      // Giorni ordinari vs festivi/weekend
      const entryDate = new Date(entry.date);
      const isWeekend = entryDate.getDay() === 0 || entryDate.getDay() === 6; // domenica = 0, sabato = 6
      const isHoliday = this.isHoliday ? this.isHoliday(entryDate) : false;
      
      if (isWeekend || isHoliday) {
        summary.weekendHolidayDays++;
      } else {
        summary.regularDays++;
      }
      
      // Conteggio giorni con trasferta
      if (entry.travelAllowance === 1) {
        summary.travelAllowanceDays++;
      }
      
      // Conteggio giorni con pasti e dettaglio pasti
      let hasMealVoucher = false;
      let hasMealCash = false;
      
      if (entry.mealLunchVoucher === 1) {
        summary.lunchCount++;
        hasMealVoucher = true;
        summary.mealVoucherAmount += settings?.mealAllowances?.lunch?.voucherAmount || 0;
      }
      
      if (entry.mealDinnerVoucher === 1) {
        summary.dinnerCount++;
        hasMealVoucher = true;
        summary.mealVoucherAmount += settings?.mealAllowances?.dinner?.voucherAmount || 0;
      }
      
      if (entry.mealLunchCash > 0) {
        summary.lunchCount++;
        hasMealCash = true;
        summary.mealCashAmount += entry.mealLunchCash || 0;
      }
      
      if (entry.mealDinnerCash > 0) {
        summary.dinnerCount++;
        hasMealCash = true;
        summary.mealCashAmount += entry.mealDinnerCash || 0;
      }
      
      if (hasMealVoucher) summary.mealVoucherDays++;
      if (hasMealCash) summary.mealCashDays++;
      
      // Importi totali
      summary.totalEarnings += dailyEarnings.total;
      summary.regularPay += dailyEarnings.regularPay;
      summary.overtimePay += dailyEarnings.overtimePay;
      summary.travelPay += dailyEarnings.travelPay;
      
      // Somma indennità di reperibilità per lavoro e viaggio + indennità giornaliera
      summary.standbyPay += dailyEarnings.standbyWorkPay + dailyEarnings.standbyTravelPay + dailyEarnings.standbyAllowance;
      
      // Le altre indennità (trasferta)
      summary.allowances += dailyEarnings.travelAllowance;
      
      // Rimborsi pasto
      summary.mealAllowances += dailyEarnings.mealAllowances;
      
      // Determina se è un giorno di reperibilità (da flag manuale o impostazioni)
      const isStandbyDay = entry.isStandbyDay === 1 || entry.standbyAllowance === 1 ||
        (settings?.standbySettings?.enabled && 
          settings?.standbySettings?.standbyDays && 
          settings?.standbySettings?.standbyDays[entry.date]?.selected);

      summary.dailyBreakdown.push({
        date: entry.date,
        workHours,
        travelHours,
        standbyWorkHours,
        standbyTravelHours,
        earnings: dailyEarnings.total,
        isStandbyDay: isStandbyDay ? 1 : 0, // Normalizzato a 1/0 per consistenza
        // Aggiungi dettaglio indennità giornaliera di reperibilità per dashboard
        standbyAllowance: isStandbyDay ? dailyEarnings.standbyAllowance : 0
      });
    });
    
    return summary;
  }

  /**
   * Safe date parsing utility
   */
  safeParseDate(dateValue) {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
  }

  // Calcola l'indennità di reperibilità per un giorno specifico
  calculateStandbyAllowanceForDate(date, settings) {
    if (!settings?.standbySettings?.enabled) return 0;
    
    const standbyDays = settings.standbySettings.standbyDays || {};
    const dailyAllowance = parseFloat(settings.standbySettings.dailyAllowance) || 0;
    const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : date;

    // Controlla se il giorno è marcato come reperibilità nel calendario
    if (standbyDays[dateStr]?.selected && dailyAllowance > 0) {
      // Controlla le impostazioni per weekend e festivi
      const dateObj = new Date(dateStr);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isHoliday = isItalianHoliday(dateStr);

      if ((isWeekend && !settings.standbySettings.includeWeekends) ||
          (isHoliday && !settings.standbySettings.includeHolidays)) {
        return 0;
      }

      return dailyAllowance;
    }

    return 0;
  }

  // Calcola tutte le indennità di reperibilità per un mese specifico
  calculateMonthlyStandbyAllowances(year, month, settings) {
    if (!settings?.standbySettings?.enabled) return [];

    const results = [];
    const date = new Date(year, month - 1, 1); // Mese è 1-based
    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
      date.setDate(day);
      const dateStr = date.toISOString().slice(0, 10);
      const allowance = this.calculateStandbyAllowanceForDate(dateStr, settings);
      
      if (allowance > 0) {
        results.push({
          date: dateStr,
          allowance: allowance,
          type: 'standby'
        });
      }
    }

    return results;
  }
}

// --- FINE CLASSE ---

export default CalculationService;

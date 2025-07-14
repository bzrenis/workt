import { getWorkDayHours } from '../constants/index.js';

/**
 * Gestisce tutti i calcoli di tempo e ore
 */
export class TimeCalculator {
  
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
      const minutes = this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1);
      totalWorkMinutes += minutes;
      console.log(`[TimeCalculator] Main shift 1: ${workEntry.workStart1}-${workEntry.workEnd1} = ${minutes/60}h`);
    }
    
    // Second work shift
    if (workEntry.workStart2 && workEntry.workEnd2) {
      const minutes = this.calculateTimeDifference(workEntry.workStart2, workEntry.workEnd2);
      totalWorkMinutes += minutes;
      console.log(`[TimeCalculator] Main shift 2: ${workEntry.workStart2}-${workEntry.workEnd2} = ${minutes/60}h`);
    }

    // Additional work shifts from viaggi array
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      console.log(`[TimeCalculator] 🔥 PROCESSING ${workEntry.viaggi.length} VIAGGI:`, workEntry.viaggi);
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.work_start_1 && viaggio.work_end_1) {
          const minutes = this.calculateTimeDifference(viaggio.work_start_1, viaggio.work_end_1);
          totalWorkMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} shift 1: ${viaggio.work_start_1}-${viaggio.work_end_1} = ${minutes/60}h`);
        }
        if (viaggio.work_start_2 && viaggio.work_end_2) {
          const minutes = this.calculateTimeDifference(viaggio.work_start_2, viaggio.work_end_2);
          totalWorkMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} shift 2: ${viaggio.work_start_2}-${viaggio.work_end_2} = ${minutes/60}h`);
        }
      });
    } else {
      console.log(`[TimeCalculator] ❌ No viaggi found or empty array:`, workEntry.viaggi);
    }
    
    const totalHours = this.minutesToHours(totalWorkMinutes);
    console.log(`[TimeCalculator] 📊 TOTAL WORK HOURS: ${totalHours}h (${totalWorkMinutes} minutes)`);
    return totalHours;
  }

  // Calculate travel hours
  calculateTravelHours(workEntry) {
    let totalTravelMinutes = 0;
    
    // Main entry travel
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      const minutes = this.calculateTimeDifference(workEntry.departureCompany, workEntry.arrivalSite);
      totalTravelMinutes += minutes;
      console.log(`[TimeCalculator] Main travel outbound: ${workEntry.departureCompany}-${workEntry.arrivalSite} = ${minutes/60}h`);
    }
    
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      const minutes = this.calculateTimeDifference(workEntry.departureReturn, workEntry.arrivalCompany);
      totalTravelMinutes += minutes;
      console.log(`[TimeCalculator] Main travel return: ${workEntry.departureReturn}-${workEntry.arrivalCompany} = ${minutes/60}h`);
    }

    // Additional travel from viaggi array
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      console.log(`[TimeCalculator] 🔥 PROCESSING TRAVEL FOR ${workEntry.viaggi.length} VIAGGI:`);
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.departure_company && viaggio.arrival_site) {
          const minutes = this.calculateTimeDifference(viaggio.departure_company, viaggio.arrival_site);
          totalTravelMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} outbound: ${viaggio.departure_company}-${viaggio.arrival_site} = ${minutes/60}h`);
        }
        if (viaggio.departure_return && viaggio.arrival_company) {
          const minutes = this.calculateTimeDifference(viaggio.departure_return, viaggio.arrival_company);
          totalTravelMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} return: ${viaggio.departure_return}-${viaggio.arrival_company} = ${minutes/60}h`);
        }
      });
    }
    
    const totalHours = this.minutesToHours(totalTravelMinutes);
    console.log(`[TimeCalculator] 📊 TOTAL TRAVEL HOURS: ${totalHours}h (${totalTravelMinutes} minutes)`);
    return totalHours;
  }

  // Calculate travel hours with distinction between external and internal travel
  // NUOVO METODO per modalità MULTI_SHIFT_OPTIMIZED
  calculateTravelHoursWithTypes(workEntry) {
    let externalTravelMinutes = 0; // Viaggi partenza azienda + arrivo azienda
    let internalTravelMinutes = 0;  // Viaggi tra turni
    
    console.log(`[TimeCalculator] 🎯 CALCULATING TYPED TRAVEL HOURS for MULTI_SHIFT_OPTIMIZED mode`);
    
    // 1. VIAGGI ESTERNI - Solo primo viaggio (partenza azienda) del turno principale
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      const minutes = this.calculateTimeDifference(workEntry.departureCompany, workEntry.arrivalSite);
      externalTravelMinutes += minutes;
      console.log(`[TimeCalculator] 🚗 EXTERNAL travel (main outbound): ${workEntry.departureCompany}-${workEntry.arrivalSite} = ${minutes/60}h`);
    }
    
    // 2. VIAGGI ESTERNI - Solo ultimo viaggio (arrivo azienda) dell'ultimo turno
    // Determiniamo qual è l'ultimo turno con dati di ritorno
    let lastReturnTravel = null;
    
    // Controlla se il turno principale ha viaggio di ritorno
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      lastReturnTravel = {
        departure: workEntry.departureReturn,
        arrival: workEntry.arrivalCompany,
        source: 'main'
      };
    }
    
    // Controlla tutti i viaggi aggiuntivi per trovare l'ultimo con viaggio di ritorno
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      for (let i = workEntry.viaggi.length - 1; i >= 0; i--) {
        const viaggio = workEntry.viaggi[i];
        if (viaggio.departure_return && viaggio.arrival_company) {
          lastReturnTravel = {
            departure: viaggio.departure_return,
            arrival: viaggio.arrival_company,
            source: `viaggio_${i+1}`
          };
          break; // Prendi solo l'ultimo
        }
      }
    }
    
    // Aggiungi l'ultimo viaggio di ritorno come esterno
    if (lastReturnTravel) {
      const minutes = this.calculateTimeDifference(lastReturnTravel.departure, lastReturnTravel.arrival);
      externalTravelMinutes += minutes;
      console.log(`[TimeCalculator] 🚗 EXTERNAL travel (last return from ${lastReturnTravel.source}): ${lastReturnTravel.departure}-${lastReturnTravel.arrival} = ${minutes/60}h`);
    }
    
    // 3. VIAGGI INTERNI - Tutti gli altri viaggi (tra turni)
    
    // Viaggi di ritorno del turno principale (se non è l'ultimo)
    if (workEntry.departureReturn && workEntry.arrivalCompany && 
        (!lastReturnTravel || lastReturnTravel.source !== 'main')) {
      const minutes = this.calculateTimeDifference(workEntry.departureReturn, workEntry.arrivalCompany);
      internalTravelMinutes += minutes;
      console.log(`[TimeCalculator] 🔄 INTERNAL travel (main return): ${workEntry.departureReturn}-${workEntry.arrivalCompany} = ${minutes/60}h`);
    }
    
    // Viaggi di tutti i turni aggiuntivi (eccetto l'ultimo viaggio di ritorno se è quello finale)
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach((viaggio, index) => {
        // Viaggio di andata (sempre interno, mai il primo)
        if (viaggio.departure_company && viaggio.arrival_site) {
          const minutes = this.calculateTimeDifference(viaggio.departure_company, viaggio.arrival_site);
          internalTravelMinutes += minutes;
          console.log(`[TimeCalculator] 🔄 INTERNAL travel (viaggio ${index+1} outbound): ${viaggio.departure_company}-${viaggio.arrival_site} = ${minutes/60}h`);
        }
        
        // Viaggio di ritorno (interno se non è l'ultimo)
        if (viaggio.departure_return && viaggio.arrival_company &&
            (!lastReturnTravel || lastReturnTravel.source !== `viaggio_${index+1}`)) {
          const minutes = this.calculateTimeDifference(viaggio.departure_return, viaggio.arrival_company);
          internalTravelMinutes += minutes;
          console.log(`[TimeCalculator] 🔄 INTERNAL travel (viaggio ${index+1} return): ${viaggio.departure_return}-${viaggio.arrival_company} = ${minutes/60}h`);
        }
      });
    }
    
    const externalHours = this.minutesToHours(externalTravelMinutes);
    const internalHours = this.minutesToHours(internalTravelMinutes);
    const totalHours = externalHours + internalHours;
    
    console.log(`[TimeCalculator] 📊 TYPED TRAVEL HOURS BREAKDOWN:`, {
      external: `${externalHours}h (${externalTravelMinutes} min)`,
      internal: `${internalHours}h (${internalTravelMinutes} min)`,
      total: `${totalHours}h (${externalTravelMinutes + internalTravelMinutes} min)`
    });
    
    return {
      external: externalHours,
      internal: internalHours,
      total: totalHours
    };
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
  calculateOvertimeDetails(workHours, travelHours, contract) {
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

  // Calculate breaks between shifts for meal allowance calculation
  calculateBreaksBetweenShifts(workEntry) {
    const breaks = [];
    const allShifts = [];

    // Collect all work shifts with their times
    if (workEntry.workStart1 && workEntry.workEnd1) {
      allShifts.push({
        start: this.parseTime(workEntry.workStart1),
        end: this.parseTime(workEntry.workEnd1),
        source: 'main_shift_1'
      });
    }
    
    if (workEntry.workStart2 && workEntry.workEnd2) {
      allShifts.push({
        start: this.parseTime(workEntry.workStart2),
        end: this.parseTime(workEntry.workEnd2),
        source: 'main_shift_2'
      });
    }

    // Add shifts from viaggi array
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.work_start_1 && viaggio.work_end_1) {
          allShifts.push({
            start: this.parseTime(viaggio.work_start_1),
            end: this.parseTime(viaggio.work_end_1),
            source: `viaggio_${index}_shift_1`
          });
        }
        if (viaggio.work_start_2 && viaggio.work_end_2) {
          allShifts.push({
            start: this.parseTime(viaggio.work_start_2),
            end: this.parseTime(viaggio.work_end_2),
            source: `viaggio_${index}_shift_2`
          });
        }
      });
    }

    // Sort shifts by start time
    allShifts.sort((a, b) => a.start - b.start);

    // Calculate breaks between consecutive shifts
    for (let i = 0; i < allShifts.length - 1; i++) {
      const currentShift = allShifts[i];
      const nextShift = allShifts[i + 1];
      
      if (currentShift.end && nextShift.start) {
        const breakMinutes = nextShift.start - currentShift.end;
        if (breakMinutes > 0) {
          breaks.push({
            startTime: currentShift.end,
            endTime: nextShift.start,
            durationMinutes: breakMinutes,
            durationHours: this.minutesToHours(breakMinutes),
            fromShift: currentShift.source,
            toShift: nextShift.source
          });
        }
      }
    }

    return breaks;
  }

  // Calculate automatic meal allowances based on breaks between all shifts
  calculateAutomaticMeals(workEntry, settings = {}) {
    const breaks = this.calculateBreaksBetweenShifts(workEntry);
    const mealSettings = settings.mealSettings || {
      minBreakForLunch: 60, // 1 ora minima per pranzo
      minBreakForDinner: 60, // 1 ora minima per cena  
      lunchTimeStart: 12 * 60, // 12:00 in minuti
      lunchTimeEnd: 14 * 60,   // 14:00 in minuti
      dinnerTimeStart: 19 * 60, // 19:00 in minuti
      dinnerTimeEnd: 21 * 60,   // 21:00 in minuti
    };

    let automaticMeals = {
      lunch: false,
      dinner: false,
      lunchBreak: null,
      dinnerBreak: null
    };

    console.log(`[TimeCalculator] 🍽️ Analyzing ${breaks.length} breaks for automatic meals:`, breaks);

    breaks.forEach((breakInfo, index) => {
      const breakStart = breakInfo.startTime;
      const breakEnd = breakInfo.endTime;
      const breakDuration = breakInfo.durationMinutes;

      console.log(`[TimeCalculator] 🍽️ Break ${index + 1}: ${Math.floor(breakStart/60)}:${String(breakStart%60).padStart(2,'0')} - ${Math.floor(breakEnd/60)}:${String(breakEnd%60).padStart(2,'0')} (${breakDuration} min)`);

      // Verifica se la pausa è abbastanza lunga
      if (breakDuration < mealSettings.minBreakForLunch) {
        console.log(`[TimeCalculator] 🍽️ Break ${index + 1}: troppo corta per pasto (${breakDuration} < ${mealSettings.minBreakForLunch} min)`);
        return;
      }

      // Verifica se la pausa cade nell'orario pranzo
      const isLunchTime = (breakStart >= mealSettings.lunchTimeStart && breakStart <= mealSettings.lunchTimeEnd) ||
                         (breakEnd >= mealSettings.lunchTimeStart && breakEnd <= mealSettings.lunchTimeEnd) ||
                         (breakStart < mealSettings.lunchTimeStart && breakEnd > mealSettings.lunchTimeEnd);

      // Verifica se la pausa cade nell'orario cena
      const isDinnerTime = (breakStart >= mealSettings.dinnerTimeStart && breakStart <= mealSettings.dinnerTimeEnd) ||
                          (breakEnd >= mealSettings.dinnerTimeStart && breakEnd <= mealSettings.dinnerTimeEnd) ||
                          (breakStart < mealSettings.dinnerTimeStart && breakEnd > mealSettings.dinnerTimeEnd);

      if (isLunchTime && !automaticMeals.lunch) {
        automaticMeals.lunch = true;
        automaticMeals.lunchBreak = breakInfo;
        console.log(`[TimeCalculator] 🍽️ ✅ PRANZO automatico - Break ${index + 1} nell'orario pranzo`);
      }

      if (isDinnerTime && !automaticMeals.dinner) {
        automaticMeals.dinner = true;
        automaticMeals.dinnerBreak = breakInfo;
        console.log(`[TimeCalculator] 🍽️ ✅ CENA automatica - Break ${index + 1} nell'orario cena`);
      }
    });

    console.log(`[TimeCalculator] 🍽️ Risultato pasti automatici:`, {
      lunch: automaticMeals.lunch,
      dinner: automaticMeals.dinner,
      totalBreaks: breaks.length
    });

    return automaticMeals;
  }
}

export default TimeCalculator;

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
      totalWorkMinutes += this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1);
    }
    
    // Second work shift
    if (workEntry.workStart2 && workEntry.workEnd2) {
      totalWorkMinutes += this.calculateTimeDifference(workEntry.workStart2, workEntry.workEnd2);
    }

    // Additional work shifts from viaggi array
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach(viaggio => {
        if (viaggio.work_start_1 && viaggio.work_end_1) {
          totalWorkMinutes += this.calculateTimeDifference(viaggio.work_start_1, viaggio.work_end_1);
        }
        if (viaggio.work_start_2 && viaggio.work_end_2) {
          totalWorkMinutes += this.calculateTimeDifference(viaggio.work_start_2, viaggio.work_end_2);
        }
      });
    }
    
    return this.minutesToHours(totalWorkMinutes);
  }

  // Calculate travel hours
  calculateTravelHours(workEntry) {
    let totalTravelMinutes = 0;
    
    // Main entry travel
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      totalTravelMinutes += this.calculateTimeDifference(workEntry.departureCompany, workEntry.arrivalSite);
    }
    
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      totalTravelMinutes += this.calculateTimeDifference(workEntry.departureReturn, workEntry.arrivalCompany);
    }

    // Additional travel from viaggi array
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach(viaggio => {
        if (viaggio.departure_company && viaggio.arrival_site) {
          totalTravelMinutes += this.calculateTimeDifference(viaggio.departure_company, viaggio.arrival_site);
        }
        if (viaggio.departure_return && viaggio.arrival_company) {
          totalTravelMinutes += this.calculateTimeDifference(viaggio.departure_return, viaggio.arrival_company);
        }
      });
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
}

export default TimeCalculator;

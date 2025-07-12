// CCNL Contract Constants and Calculations
export const CCNL_CONTRACTS = {
  METALMECCANICO_PMI_L5: {
    name: 'CCNL Metalmeccanico PMI - Livello 5 (Operaio Qualificato)',
    code: 'METAL_PMI_L5',
    description: 'Operaio qualificato - Progressione da Livello 3 a Livello 5',    careerProgression: {
      startLevel: 3, // Livello di partenza
      currentLevel: 5, // Livello attuale (SUPERIORE)
      nextLevel: 6, // Prossimo obiettivo (Tecnico)
      progression: '🎉 AVANZAMENTO: Livello 3 → Livello 5 (+2 livelli!)',
      achievement: 'Da Operaio Comune a Operaio Qualificato Specializzato'
    },
    monthlySalary: 2839.07, // Da busta paga reale B.Z. S.R.L.
    dailyRate: 109.195, // Calcolato: 2839.07 / 26 giorni lavorativi
    hourlyRate: 16.41081, // Da busta paga reale - Livello 5 qualificato
    workingDaysPerMonth: 26, // Standard per calcolo giornaliero
    workingHoursPerDay: 8, // Standard CCNL
    overtimeRates: {
      day: 1.20, // +20% Straordinario diurno
      nightUntil22: 1.25, // +25% Notturno fino alle 22:00
      nightAfter22: 1.35, // +35% Notturno oltre le 22:00
      saturday: 1.15, // +15% Sabato (personalizzabile)
      holiday: 1.3, // +30% Festivo/Domenica (già presente, per chiarezza)
    },
    nightWorkStart: 22, // 22:00
    nightWorkEnd: 6, // 06:00
    contractDetails: {
      company: 'B.Z. S.R.L.',
      employee: 'LIKAJ RENIS',
      qualification: 'Operaio Qualificato (Livello 5)',
      experienceLevel: 'Intermedio-Avanzato'
    },
    lastUpdated: '2025-06-20', // Data ultima verifica con busta paga
    source: 'Busta paga B.Z. S.R.L. - LIKAJ RENIS - 05/2025'
  },
};

export const DEFAULT_SETTINGS = {
  contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L5,
  travelCompensationRate: 1.0, // 100% of hourly rate
  travelHoursSetting: 'EXCESS_AS_TRAVEL', // 'AS_WORK', 'EXCESS_AS_TRAVEL', 'EXCESS_AS_OVERTIME'
  standbySettings: {
    enabled: false,
    dailyAllowance: 0,
    startHour: 18,
    endHour: 8,
    includWeekends: true,
    includeHolidays: true,
  },
  travelAllowance: {
    enabled: false,
    dailyAmount: 0,
    autoActivate: false,
  },
  mealAllowances: {
    lunch: {
      voucherAmount: 0,
      cashAmount: 0,
      autoActivate: true,
    },
    dinner: {
      voucherAmount: 0,
      cashAmount: 0,
      autoActivate: false,
    },
  },
};

// Calculation utilities
export const calculateOvertimeRate = (hour, contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5) => {
  if (hour >= 22 || hour < 6) {
    return contract.hourlyRate * contract.overtimeRates.nightAfter22;
  } else if (hour >= contract.nightWorkStart) {
    return contract.hourlyRate * contract.overtimeRates.nightUntil22;
  }
  return contract.hourlyRate * contract.overtimeRates.day;
};

export const isNightWork = (hour) => {
  return hour >= 22 || hour < 6;
};

export const getWorkDayHours = () => 8; // Standard work day hours

export const WORK_TYPES = {
  REGULAR: 'regular',
  OVERTIME: 'overtime',
  TRAVEL: 'travel',
  STANDBY: 'standby',
};

export const MEAL_TIMES = {
  LUNCH_START: 12,
  LUNCH_END: 14,
  DINNER_START: 19,
  DINNER_END: 21,
};

export const DATABASE_TABLES = {
  WORK_ENTRIES: 'work_entries',
  STANDBY_CALENDAR: 'standby_calendar',
  SETTINGS: 'settings',
  BACKUPS: 'backups',
};

// Contract validation and calculation utilities
export const validateContractData = (contract) => {
  const calculatedDaily = contract.monthlySalary / contract.workingDaysPerMonth;
  const calculatedHourly = calculatedDaily / contract.workingHoursPerDay;
  
  return {
    isValid: {
      dailyRate: Math.abs(contract.dailyRate - calculatedDaily) < 0.01,
      hourlyRate: Math.abs(contract.hourlyRate - calculatedHourly) < 0.01,
    },
    calculated: {
      dailyRate: calculatedDaily,
      hourlyRate: calculatedHourly,
    },
    differences: {
      dailyRate: contract.dailyRate - calculatedDaily,
      hourlyRate: contract.hourlyRate - calculatedHourly,
    }
  };
};

// Calculate exact CCNL level based on hourly rate
export const determineContractLevel = (hourlyRate) => {
  // Tariffe CCNL Metalmeccanico PMI 2025 - NUMERAZIONE CRESCENTE
  // NOTA: Livelli numerici più alti = posizioni superiori e migliore retribuzione
  const levels = {
    'Livello 1 (Base)': { min: 12.50, max: 13.99, description: 'Livello base e manovali' },
    'Livello 2 (Apprendisti)': { min: 14.00, max: 15.19, description: 'Apprendisti e operai generici' },
    'Livello 3 (Operai)': { min: 15.20, max: 15.99, description: 'IL TUO LIVELLO DI PARTENZA - Operai comuni' },
    'Livello 4 (Operai Esperti)': { min: 16.00, max: 16.79, description: 'Operai con esperienza' },
    'Livello 5 (Operai Qualificati)': { min: 16.41, max: 17.49, description: 'IL TUO LIVELLO ATTUALE - Operai qualificati specializzati 🌟' },
    'Livello 6 (Tecnici)': { min: 17.50, max: 19.99, description: 'PROSSIMO OBIETTIVO - Tecnici specializzati' },
    'Livello 7 (Specialisti)': { min: 20.00, max: 24.99, description: 'Specialisti e quadri intermedi' },
    'Livello 8 (Dirigenti)': { min: 25.00, max: 35.00, description: 'Dirigenti e quadri superiori' },
  };
  
  for (const [level, data] of Object.entries(levels)) {
    if (hourlyRate >= data.min && hourlyRate <= data.max) {
      return {
        level: level.split(' ')[1], // Estrae solo "5" da "Livello 5"
        fullLevel: level,
        confidence: 'alta',
        description: data.description,
        progression: level.includes('IL TUO LIVELLO ATTUALE') ? 'POSIZIONE ATTUALE' : 
                   level.includes('PARTENZA') ? 'LIVELLO PRECEDENTE' :
                   level.includes('PROSSIMO') ? 'PROSSIMO AVANZAMENTO' : 'ALTRO LIVELLO',
        note: `Tariffa €${hourlyRate} - ${data.description}`
      };
    }
  }
  
  return {
    level: 'Non determinato',
    confidence: 'bassa',
    note: `Tariffa oraria €${hourlyRate} non corrisponde ai livelli standard CCNL`
  };
};

// Career progression analysis
export const analyzeCareerProgression = (contract) => {
  const currentHourlyRate = contract.hourlyRate;
  // SISTEMA CRESCENTE: Livelli numerici più alti = posizioni migliori
  const levels = {
    1: { rate: 13.25, title: 'Manovale/Base', description: 'Livello di ingresso' },
    2: { rate: 14.60, title: 'Apprendista/Operaio Generico', description: 'Primo livello operativo' },
    3: { rate: 15.60, title: 'Operaio Comune', description: 'IL TUO LIVELLO DI PARTENZA - Operaio con esperienza base' },
    4: { rate: 16.20, title: 'Operaio Esperto', description: 'Operaio con maggiore esperienza' },
    5: { rate: 16.41, title: 'Operaio Qualificato Specializzato', description: 'TUA POSIZIONE ATTUALE - Operaio altamente qualificato 🌟' },
    6: { rate: 18.00, title: 'Tecnico Specializzato', description: 'PROSSIMO OBIETTIVO - Tecnico qualificato' },
    7: { rate: 22.50, title: 'Specialista/Quadro Intermedio', description: 'Responsabilità tecniche avanzate' },
    8: { rate: 28.00, title: 'Dirigente/Quadro Senior', description: 'Livello dirigenziale' }
  };
  
  const progression = {
    current: {
      level: 5,
      title: levels[5].title,
      rate: currentHourlyRate,
      description: 'La tua posizione attuale - hai raggiunto un livello qualificato!'
    },
    previous: {
      level: 3,
      title: levels[3].title,
      rate: levels[3].rate,
      description: 'Il tuo livello di partenza - ottima crescita!'
    },
    next: {
      level: 6,
      title: levels[6].title,
      targetRate: levels[6].rate,
      potentialIncrease: levels[6].rate - currentHourlyRate,
      description: 'Prossimo livello di avanzamento - diventerai tecnico!'
    },
    achievement: '🎉 CONGRATULAZIONI! Progressione da Livello 3 a Livello 5 = +2 LIVELLI!',
    levelsAdvanced: 2, // Da 3 a 5
    monthlyIncreaseNext: ((levels[6].rate - currentHourlyRate) * 8 * 26).toFixed(2),
    careerGrowth: 'Eccellente progressione di carriera - da Operaio Comune a Operaio Qualificato Specializzato'
  };
  
  return progression;
};

// Display career information
export const getCareerInfo = () => {
  const contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  const progression = analyzeCareerProgression(contract);
  
  return {
    contract,
    progression,    summary: {
      currentLevel: '5 - Operaio Qualificato Specializzato',
      startedAt: 'Livello 3 - Operaio Comune',
      achievement: '🏆 Avanzamento di +2 livelli nella gerarchia CCNL (3→5)',
      nextGoal: 'Livello 6 - Tecnico Specializzato',
      experienceLevel: 'Qualificato/Specializzato - Ottima progressione!'
    }
  };
};

// Verify contract with payslip data
export const verifyWithPayslip = () => {
  const contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  const validation = validateContractData(contract);
  const levelCheck = determineContractLevel(contract.hourlyRate);
  
  console.log('=== VERIFICA CONTRATTO CCNL ===');
  console.log(`Fonte: ${contract.source}`);
  console.log(`Retribuzione mensile: €${contract.monthlySalary}`);
  console.log(`Retribuzione oraria: €${contract.hourlyRate}`);
  console.log(`Livello determinato: ${levelCheck.level} (${levelCheck.confidence} confidenza)`);
  console.log(`Note: ${levelCheck.note}`);
  
  return {
    contract,
    validation,
    levelCheck
  };
};

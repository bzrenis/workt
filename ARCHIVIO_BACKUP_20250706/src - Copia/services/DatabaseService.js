import * as SQLite from 'expo-sqlite';
import { DATABASE_TABLES } from '../constants';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.maxRetries = 3;
  }

  async ensureInitialized() {
    if (this.isInitialized && this.db) {
      try {
        // Liveness check: Esegue una query leggera per verificare che la connessione sia ancora attiva.
        await this.db.getFirstAsync('SELECT 1');
        return; // La connessione è valida.
      } catch (error) {
        console.warn(`Controllo di vitalità del database fallito: ${error.message}. Reinicializzazione forzata.`);
        
        const oldDb = this.db; // Mantiene un riferimento al db potenzialmente corrotto
        this.isInitialized = false;
        this.db = null;
        this.initializationPromise = null; // Resetta il promise per permettere una nuova inizializzazione.
        
        // Tenta di chiudere la vecchia connessione in modo sicuro.
        if (oldDb) {
            try {
                await oldDb.closeAsync();
                console.log('Vecchia connessione DB chiusa dopo fallimento del controllo di vitalità.');
            } catch (closeError) {
                console.error('Impossibile chiudere la vecchia connessione al database:', closeError);
            }
        }
        // Prosegue con la logica di reinizializzazione sottostante.
      }
    }

    // Anti-race condition: solo il primo chiamante crea il promise, gli altri lo attendono.
    if (!this.initializationPromise) {
      console.log('Avvio di una nuova inizializzazione del database.');
      this.initializationPromise = this.initDatabase().catch(err => {
          // Se initDatabase fallisce in modo definitivo, resetta il promise.
          // Questo permette al prossimo tentativo di riprovare da capo.
          this.initializationPromise = null;
          // Propaga l'errore per notificare il chiamante.
          return Promise.reject(err);
      });
    } else {
      console.log('In attesa di una inizializzazione del database già in corso...');
    }

    return this.initializationPromise;
  }

  async initDatabase() {
    let attempts = 0;
    const maxAttempts = 3;
    let db = null; // Definisci db qui per poterlo usare nel blocco catch

    while (attempts < maxAttempts) {
      try {
        console.log(`Tentativo di inizializzazione DB ${attempts + 1}/${maxAttempts}`);
        
        db = await SQLite.openDatabaseAsync('worktracker.db');
        console.log('Oggetto database aperto:', db ? 'OK' : 'null');

        // Test and setup tables on the new connection before making it "live"
        await this.testDatabaseConnection(db);
        console.log('Test di connessione al database superato.');

        await this.createTables(db);
        console.log('Tabelle create/verificate.');
        
        // If successful, update the service state
        this.db = db;
        this.isInitialized = true;
        console.log('Database inizializzato con successo.');
        return; // Successo, esce dal ciclo e risolve il promise.
        
      } catch (error) {
        attempts++;
        console.error(`Tentativo di inizializzazione DB ${attempts} fallito:`, error);

        // Se l'apertura ha restituito un oggetto db ma le operazioni successive sono fallite,
        // la connessione potrebbe essere corrotta. Tentiamo di chiuderla esplicitamente.
        if (db) {
          try {
            console.log('Tentativo di chiudere la connessione al database potenzialmente corrotta...');
            await db.closeAsync();
            console.log('Connessione al database corrotta chiusa con successo.');
          } catch (closeError) {
            console.error('Impossibile chiudere la connessione al database corrotta:', closeError);
          } finally {
            db = null; // Assicurati che non venga riutilizzato.
          }
        }
        
        if (attempts >= maxAttempts) {
          // Dopo tutti i tentativi, lancia l'errore finale.
          throw new Error(`Inizializzazione DB fallita dopo ${maxAttempts} tentativi: ${error.message}`);
        }

        const delay = 1000 * Math.pow(2, attempts - 1); // Backoff esponenziale
        console.log(`In attesa di ${delay}ms prima del prossimo tentativo...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async testDatabaseConnection(dbInstance) {
    const db = dbInstance || this.db;
    try {
      // Simple test query
      await db.getFirstAsync('SELECT 1');
    } catch (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }
  async createTables(dbInstance) {
    const db = dbInstance || this.db;
    try {
      // Work entries table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.WORK_ENTRIES} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          site_name TEXT,
          vehicle_driven TEXT,
          departure_company TEXT,
          arrival_site TEXT,
          work_start_1 TEXT,
          work_end_1 TEXT,
          work_start_2 TEXT,
          work_end_2 TEXT,
          departure_return TEXT,
          arrival_company TEXT,
          interventi TEXT DEFAULT '[]',
          meal_lunch_voucher REAL DEFAULT 0,
          meal_lunch_cash REAL DEFAULT 0,
          meal_dinner_voucher REAL DEFAULT 0,
          meal_dinner_cash REAL DEFAULT 0,
          travel_allowance REAL DEFAULT 0,
          standby_allowance REAL DEFAULT 0,
          is_standby_day INTEGER DEFAULT 0,
          total_earnings REAL DEFAULT 0,
          notes TEXT,
          day_type TEXT DEFAULT 'lavorativa',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Funzione helper per verificare l'esistenza di una colonna
      const columnExists = async (tableName, columnName) => {
        const columns = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
        return columns.some(col => col.name === columnName);
      };

      // Migrazione robusta: aggiungi colonna day_type se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'day_type')) {
        console.log(`Migrazione: la colonna 'day_type' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN day_type TEXT DEFAULT 'lavorativa'`);
        console.log("Migrazione 'day_type' completata.");
      }

      // Migrazione robusta: aggiungi colonna interventi se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'interventi')) {
        console.log(`Migrazione: la colonna 'interventi' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN interventi TEXT DEFAULT '[]'`);
        console.log("Migrazione 'interventi' completata.");
      }

      // NOTA: Le vecchie colonne standby_* non vengono rimosse per retrocompatibilità,
      // ma non verranno più popolate dalle nuove versioni dell'app.

      // Standby calendar table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.STANDBY_CALENDAR} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          is_standby INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Settings table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.SETTINGS} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Backups table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.BACKUPS} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          backup_name TEXT NOT NULL,
          backup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          backup_type TEXT NOT NULL,  -- 'local' or 'cloud'
          file_path TEXT,
          status TEXT DEFAULT 'completed',
          notes TEXT
        );
      `);
    } catch (error) {
      throw new Error(`Failed to create tables: ${error.message}`);
    }
  }

  async safeExecute(operation, operationName = 'Database operation') {
    let attempts = 0;
    const maxAttempts = this.maxRetries || 3;

    while (attempts < maxAttempts) {
      try {
        await this.ensureInitialized();
        
        if (!this.db) {
          throw new Error('La connessione al database non è disponibile dopo l\'inizializzazione.');
        }
        
        return await operation();

      } catch (error) {
        attempts++;
        const errorMessage = `${operationName} fallito (tentativo ${attempts}/${maxAttempts}): ${error.message}`;
        console.error(errorMessage, error);

        const isCriticalDbError = 
          error.message.includes('database') || 
          error.message.includes('sqlite') || 
          error.message.includes('null') || 
          error.message.includes('closed') ||
          (error.cause && typeof error.cause.message === 'string' && error.cause.message.includes('code 14')); // SQLITE_CANTOPEN

        if (isCriticalDbError) {
          console.log(`Errore critico del database rilevato. Tentativo di recupero n. ${attempts}.`);
          
          // NON chiudere esplicitamente la connessione qui (es. con closeAsync).
          // Se la connessione è in uno stato non valido, tentare di chiuderla può causare
          // ulteriori errori. È più sicuro scartare il riferimento e reinizializzare.
          this.isInitialized = false;
          this.db = null;
          this.initializationPromise = null; // RESETTA IL PROMISE per permettere una nuova inizializzazione completa.

          if (attempts >= maxAttempts) {
            const finalErrorMsg = `${operationName} fallito definitivamente dopo ${maxAttempts} tentativi. Ultimo errore: ${error.message}`;
            console.error(finalErrorMsg);
            throw new Error(finalErrorMsg);
          }

          const delay = 1000 * Math.pow(2, attempts - 1);
          console.log(`In attesa di ${delay}ms prima del prossimo tentativo...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } else {
          // Not a critical DB error, propagate immediately.
          throw new Error(errorMessage);
        }
      }
    }
  }

  // Work entry methods
  async insertWorkEntry(workEntry) {
    return await this.safeExecute(async () => {
      const {
        date, siteName, vehicleDriven, departureCompany, arrivalSite,
        workStart1, workEnd1, workStart2, workEnd2, departureReturn, arrivalCompany,
        interventi, // Nuovo campo array
        mealLunchVoucher, mealLunchCash, mealDinnerVoucher, mealDinnerCash,
        travelAllowance, standbyAllowance, isStandbyDay, totalEarnings, notes, dayType
      } = workEntry;

      await this.db.runAsync(`
        INSERT INTO ${DATABASE_TABLES.WORK_ENTRIES} (
          date, site_name, vehicle_driven, departure_company, arrival_site,
          work_start_1, work_end_1, work_start_2, work_end_2,
          departure_return, arrival_company,
          interventi,
          meal_lunch_voucher, meal_lunch_cash, meal_dinner_voucher, meal_dinner_cash,
          travel_allowance, standby_allowance, is_standby_day, total_earnings, notes, day_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        date, siteName || '', vehicleDriven || '', departureCompany || '', arrivalSite || '',
        workStart1 || '', workEnd1 || '', workStart2 || '', workEnd2 || '',
        departureReturn || '', arrivalCompany || '',
        JSON.stringify(interventi || []), // Serializza l'array di interventi
        mealLunchVoucher || 0, mealLunchCash || 0, mealDinnerVoucher || 0, mealDinnerCash || 0,
        travelAllowance || 0, standbyAllowance || 0, isStandbyDay || 0, totalEarnings || 0, notes || '',
        dayType || 'lavorativa'
      ]);
    }, 'Insert work entry');
  }

  async getWorkEntries(year, month) {
    await this.ensureInitialized();
    
    try {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      const query = 
        `SELECT * FROM work_entries 
         WHERE date >= ? AND date <= ? 
         ORDER BY date DESC`;
      
      const result = await this.db.getAllAsync(query, [startDate, endDate]);
      return result || [];
    } catch (error) {
      console.error('Error getting work entries:', error);
      throw error;
    }
  }
  
  async getAllWorkEntries() {
    await this.ensureInitialized();
    
    try {
      const query = 
        `SELECT * FROM work_entries 
         ORDER BY date DESC`;
      
      const result = await this.db.getAllAsync(query);
      return result || [];
    } catch (error) {
      console.error('Error getting all work entries:', error);
      throw error;
    }
  }

  async getWorkEntriesMultiMonth(year, month) {
    return await this.safeExecute(async () => {
      // Calcola il mese precedente e l'anno corrispondente
      let prevMonth = month - 1;
      let prevYear = year;
      
      // Gestisce il cambio di anno
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
      }
      
      // Formatta il mese corrente e il mese precedente
      const currentYearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      const prevYearMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
      
      // Query per selezionare gli inserimenti di entrambi i mesi
      const result = await this.db.getAllAsync(`
        SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}
        WHERE strftime('%Y-%m', date) = ? OR strftime('%Y-%m', date) = ?
        ORDER BY date DESC
      `, [currentYearMonth, prevYearMonth]);

      // Parsa il campo `interventi` per ogni entry
      if (result && result.length > 0) {
        return result.map(entry => {
          try {
            entry.interventi = entry.interventi ? JSON.parse(entry.interventi) : [];
          } catch (e) {
            console.warn(`Impossibile parsare JSON per interventi per l'entry id ${entry.id}:`, entry.interventi);
            entry.interventi = [];
          }
          return entry;
        });
      }
      
      return result || [];
    }, 'Get work entries multi month');
  }
  
  // Get all work entries regardless of month (for showing complete history)
  async getAllWorkEntries() {
    return await this.safeExecute(async () => {
      const result = await this.db.getAllAsync(`
        SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}
        ORDER BY date DESC
      `);

      // Parsa il campo `interventi` per ogni entry
      if (result && result.length > 0) {
        return result.map(entry => {
          try {
            entry.interventi = entry.interventi ? JSON.parse(entry.interventi) : [];
          } catch (e) {
            console.warn(`Impossibile parsare JSON per interventi per l'entry id ${entry.id}:`, entry.interventi);
            entry.interventi = [];
          }
          return entry;
        });
      }
      
      return result || [];
    }, 'Get all work entries');
  }

  async getWorkEntryById(id) {
    return await this.safeExecute(async () => {
      const result = await this.db.getFirstAsync(`
        SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}
        WHERE id = ?
      `, [id]);
      
      if (result) {
        try {
          // Prova a parsare `interventi`. Se è null, vuoto o invalido, usa un array vuoto.
          result.interventi = result.interventi ? JSON.parse(result.interventi) : [];
        } catch (e) {
          console.warn(`Impossibile parsare JSON per interventi per l'entry id ${id}:`, result.interventi);
          result.interventi = []; // Fallback a array vuoto
        }
      }
      
      return result;
    }, 'Get work entry by ID');
  }

  async updateWorkEntry(id, workEntry) {
    return await this.safeExecute(async () => {
      const {
        date, siteName, vehicleDriven, departureCompany, arrivalSite,
        workStart1, workEnd1, workStart2, workEnd2, departureReturn, arrivalCompany,
        interventi,
        mealLunchVoucher, mealLunchCash, mealDinnerVoucher, mealDinnerCash,
        travelAllowance, standbyAllowance, isStandbyDay, totalEarnings, notes, dayType
      } = workEntry;

      await this.db.runAsync(`
        UPDATE ${DATABASE_TABLES.WORK_ENTRIES}
        SET date = ?, site_name = ?, vehicle_driven = ?, departure_company = ?, arrival_site = ?,
            work_start_1 = ?, work_end_1 = ?, work_start_2 = ?, work_end_2 = ?,
            departure_return = ?, arrival_company = ?,
            interventi = ?,
            meal_lunch_voucher = ?, meal_lunch_cash = ?, meal_dinner_voucher = ?, meal_dinner_cash = ?,
            travel_allowance = ?, standby_allowance = ?, is_standby_day = ?, total_earnings = ?, notes = ?,
            day_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        date, siteName || '', vehicleDriven || '', departureCompany || '', arrivalSite || '',
        workStart1 || '', workEnd1 || '', workStart2 || '', workEnd2 || '',
        departureReturn || '', arrivalCompany || '',
        JSON.stringify(interventi || []),
        mealLunchVoucher || 0, mealLunchCash || 0, mealDinnerVoucher || 0, mealDinnerCash || 0,
        travelAllowance || 0, standbyAllowance || 0, isStandbyDay || 0, totalEarnings || 0, notes || '',
        dayType || 'lavorativa',
        id
      ]);
    }, 'Update work entry');
  }

  async deleteWorkEntry(id) {
    return await this.safeExecute(async () => {
      await this.db.runAsync(`
        DELETE FROM ${DATABASE_TABLES.WORK_ENTRIES} WHERE id = ?
      `, [id]);
    }, 'Delete work entry');
  }
  // Standby calendar methods
  async setStandbyDay(date, isStandby) {
    return await this.safeExecute(async () => {
      await this.db.runAsync(`
        INSERT OR REPLACE INTO ${DATABASE_TABLES.STANDBY_CALENDAR} (date, is_standby)
        VALUES (?, ?)
      `, [date, isStandby ? 1 : 0]);
    }, 'Set standby day');
  }

  async getStandbyDays(year, month) {
    return await this.safeExecute(async () => {
      const result = await this.db.getAllAsync(`
        SELECT * FROM ${DATABASE_TABLES.STANDBY_CALENDAR}
        WHERE strftime('%Y-%m', date) = ? AND is_standby = 1
      `, [`${year}-${month.toString().padStart(2, '0')}`]);
      return result || [];
    }, 'Get standby days');
  }

  // Settings methods
  async setSetting(key, value) {
    return await this.safeExecute(async () => {
      await this.db.runAsync(`
        INSERT OR REPLACE INTO ${DATABASE_TABLES.SETTINGS} (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [key, JSON.stringify(value)]);
    }, 'Set setting');
  }

  async getSetting(key, defaultValue = null) {
    return await this.safeExecute(async () => {
      const result = await this.db.getFirstAsync(`
        SELECT value FROM ${DATABASE_TABLES.SETTINGS} WHERE key = ?
      `, [key]);
      return result ? JSON.parse(result.value) : defaultValue;
    }, 'Get setting');
  }  // Backup methods
  async getAllData() {
    return await this.safeExecute(async () => {
      const workEntries = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}`);
      const standbyDays = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.STANDBY_CALENDAR}`);
      const settings = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.SETTINGS}`);
      
      return {
        workEntries: workEntries || [],
        standbyDays: standbyDays || [],
        settings: settings || [],
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
    }, 'Get all data for backup');
  }

  async restoreData(data) {
    return await this.safeExecute(async () => {
      // Clear existing data
      await this.db.execAsync(`DELETE FROM ${DATABASE_TABLES.WORK_ENTRIES}`);
      await this.db.execAsync(`DELETE FROM ${DATABASE_TABLES.STANDBY_CALENDAR}`);
      await this.db.execAsync(`DELETE FROM ${DATABASE_TABLES.SETTINGS}`);
      
      // Restore work entries
      for (const entry of data.workEntries || []) {
        await this.insertWorkEntry(entry);
      }
      
      // Restore standby days
      for (const day of data.standbyDays || []) {
        await this.setStandbyDay(day.date, day.is_standby);
      }
      
      // Restore settings
      for (const setting of data.settings || []) {
        await this.setSetting(setting.key, JSON.parse(setting.value));
      }
      
      console.log('Data restored successfully');
    }, 'Restore data');
  }

  async recordBackup(backupInfo) {
    return await this.safeExecute(async () => {
      const { backup_name, backup_type, file_path, status, notes } = backupInfo;
      await this.db.runAsync(`
        INSERT INTO ${DATABASE_TABLES.BACKUPS} (backup_name, backup_type, file_path, status, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [
        backup_name,
        backup_type,
        file_path || null,
        status || 'completed',
        notes || null
      ]);
    }, 'Record backup');
  }

  // Health monitoring methods
  async isDatabaseHealthy() {
    try {
      // Check if database connection exists
      if (!this.db || !this.isInitialized) {
        return false;
      }
      
      // Perform a simple test query
      await this.db.getFirstAsync('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close() {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
        this.isInitialized = false;
        console.log('Database connection closed');
      }
    } catch (error) {
      console.error('Error closing database:', error);
      throw error;
    }
  }

  async getConnectionStatus() {
    return {
      isConnected: this.db !== null,
      isInitialized: this.isInitialized,
      hasError: false
    };
  }
}

// Crea e esporta una singola istanza (Singleton Pattern)
const DatabaseServiceInstance = new DatabaseService();
export default DatabaseServiceInstance;

// Debug script per contare gli interventi di reperibilità
// Da eseguire nella console del browser quando l'app è avviata

console.log('=== DEBUG CONTEGGIO INTERVENTI DI REPERIBILITÀ ===');

// Simula la logica di conteggio nella dashboard
const testInterventionCounting = () => {
  // Questa funzione dovrebbe essere eseguita nel browser/app con accesso al database
  console.log('Per testare il conteggio degli interventi:');
  console.log('1. Avvia l\'app Expo');
  console.log('2. Apri la console del browser');
  console.log('3. Incolla questo codice:');
  
  const codeToTest = `
// Test conteggio interventi
import DatabaseService from './src/services/DatabaseService';

const testInterventions = async () => {
  const databaseService = new DatabaseService();
  
  try {
    const entries = await databaseService.getWorkEntries();
    
    let totalInterventions = 0;
    let daysWithInterventions = 0;
    
    entries.forEach(entry => {
      if (entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0) {
        daysWithInterventions++;
        totalInterventions += entry.interventi.length;
        console.log(\`\${entry.date}: \${entry.interventi.length} interventi\`);
      }
    });
    
    console.log(\`Giorni con interventi: \${daysWithInterventions}\`);
    console.log(\`Totale interventi: \${totalInterventions}\`);
    
    return { totalInterventions, daysWithInterventions };
  } catch (error) {
    console.error('Errore nel test:', error);
  }
};

testInterventions();
  `;
  
  console.log(codeToTest);
};

testInterventionCounting();

// Per ora, aggiungiamo dei log direttamente nella dashboard per verificare
console.log('Aggiungendo log di debug nella DashboardScreen...');

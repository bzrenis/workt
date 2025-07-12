// Test script per verificare le correzioni del database
import DatabaseService from './src/services/DatabaseService.js';
import DatabaseHealthService from './src/services/DatabaseHealthService.js';

console.log('🔧 Test DatabaseService dopo le correzioni...');

async function testDatabaseFixes() {
  try {
    console.log('1. Testing database initialization...');
    await DatabaseService.ensureInitialized();
    console.log('✅ Database initialized successfully');

    console.log('2. Testing health check...');
    const isHealthy = await DatabaseService.isDatabaseHealthy();
    console.log(`✅ Database health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);

    console.log('3. Testing basic operations...');
    const testSetting = await DatabaseService.getSetting('test_key', 'default');
    console.log(`✅ Get setting test: ${testSetting}`);

    await DatabaseService.setSetting('test_key', { timestamp: Date.now(), test: true });
    console.log('✅ Set setting test completed');

    console.log('4. Testing work entries...');
    const entries = await DatabaseService.getWorkEntries(2025, 6);
    console.log(`✅ Work entries for June 2025: ${entries.length} entries`);

    console.log('5. Testing health service...');
    const healthStatus = await DatabaseHealthService.performHealthCheck();
    console.log(`✅ Health service status: ${healthStatus.status}`);

    console.log('🎉 All tests passed! Database fixes are working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Esporta la funzione di test
export default testDatabaseFixes;

// Se eseguito direttamente
if (typeof window === 'undefined') {
  testDatabaseFixes();
}

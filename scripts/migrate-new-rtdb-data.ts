import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyDdNLa9sgFztIE90i9B7F8aHKtksJLaA-I",
  authDomain: "roda-bem-turismo.firebaseapp.com",
  databaseURL: "https://roda-bem-turismo-default-rtdb.firebaseio.com",
  projectId: "roda-bem-turismo",
  storageBucket: "roda-bem-turismo.firebasestorage.app",
  messagingSenderId: "732861766010",
  appId: "1:732861766010:web:a268ba64b148ac09a99ec3",
  measurementId: "G-0Y9ZPTWPWZ"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

const DATA_DIR = path.join(process.cwd(), 'data');
const MAIN_DB_PATH = path.join(DATA_DIR, 'database.json');
const RH_DB_PATH = path.join(DATA_DIR, 'rh-database.json');

interface MigrationResult {
  collection: string;
  newRecords: number;
  existingRecords: number;
  totalAfter: number;
}

async function loadLocalDatabase(): Promise<Record<string, any>> {
  try {
    const data = fs.readFileSync(MAIN_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading local database:', error);
    return {};
  }
}

async function loadRHDatabase(): Promise<Record<string, any>> {
  try {
    const data = fs.readFileSync(RH_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading RH database:', error);
    return {};
  }
}

async function saveLocalDatabase(data: Record<string, any>): Promise<void> {
  fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(data, null, 2));
  console.log('Main database saved');
}

async function saveRHDatabase(data: Record<string, any>): Promise<void> {
  fs.writeFileSync(RH_DB_PATH, JSON.stringify(data, null, 2));
  console.log('RH database saved');
}

function generateId(): string {
  return `rtdb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function fetchRTDBCollection(collectionName: string): Promise<Record<string, any>> {
  try {
    const snapshot = await get(ref(rtdb, collectionName));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return {};
  }
}

async function migrateCollection(
  localDb: Record<string, any>,
  rtdbData: Record<string, any>,
  collectionName: string,
  localCollectionName?: string
): Promise<MigrationResult> {
  const targetCollection = localCollectionName || collectionName;
  
  if (!localDb[targetCollection]) {
    localDb[targetCollection] = {};
  }
  
  const existingIds = new Set(Object.keys(localDb[targetCollection]));
  let newRecords = 0;
  
  for (const [rtdbId, record] of Object.entries(rtdbData)) {
    const localId = `rtdb_${rtdbId}`;
    
    if (!existingIds.has(rtdbId) && !existingIds.has(localId)) {
      const newId = localId.startsWith('rtdb_') ? localId : `rtdb_${rtdbId}`;
      localDb[targetCollection][newId] = {
        ...record,
        id: newId,
        migratedAt: new Date().toISOString()
      };
      newRecords++;
    }
  }
  
  return {
    collection: targetCollection,
    newRecords,
    existingRecords: existingIds.size,
    totalAfter: Object.keys(localDb[targetCollection]).length
  };
}

async function main() {
  console.log('Starting Firebase RTDB migration...\n');
  
  const localDb = await loadLocalDatabase();
  const rhDb = await loadRHDatabase();
  
  const collections = [
    'clients',
    'destinations', 
    'children',
    'receipts',
    'parcelas',
    'seatReservations',
    'prospects',
    'financial_transactions',
    'inactive_clients',
    'activities',
    'buses',
    'notifications',
    'bills',
    'crmTasks',
    'cancelledClientCredits',
    'timeRecords',
    'departments',
    'discountApprovalRequests',
    'invitationLinks',
    'facialVerificationSessions',
    'monthly_reports'
  ];
  
  const rhCollections = [
    'funcionarios',
    'proposals'
  ];
  
  const results: MigrationResult[] = [];
  
  console.log('Fetching data from Firebase RTDB...\n');
  
  for (const collection of collections) {
    console.log(`Checking ${collection}...`);
    const rtdbData = await fetchRTDBCollection(collection);
    const rtdbCount = Object.keys(rtdbData).length;
    
    if (rtdbCount > 0) {
      const result = await migrateCollection(localDb, rtdbData, collection);
      results.push(result);
      console.log(`  RTDB: ${rtdbCount}, Existing: ${result.existingRecords}, New: ${result.newRecords}`);
    } else {
      console.log(`  No data in RTDB`);
    }
  }
  
  for (const collection of rhCollections) {
    console.log(`Checking RH ${collection}...`);
    const rtdbData = await fetchRTDBCollection(collection);
    const rtdbCount = Object.keys(rtdbData).length;
    
    if (rtdbCount > 0) {
      const result = await migrateCollection(rhDb, rtdbData, collection);
      results.push(result);
      console.log(`  RTDB: ${rtdbCount}, Existing: ${result.existingRecords}, New: ${result.newRecords}`);
    } else {
      console.log(`  No data in RTDB`);
    }
  }
  
  const totalNew = results.reduce((sum, r) => sum + r.newRecords, 0);
  
  if (totalNew > 0) {
    console.log('\nSaving databases...');
    await saveLocalDatabase(localDb);
    await saveRHDatabase(rhDb);
    
    console.log('\n=== Migration Summary ===');
    for (const result of results) {
      if (result.newRecords > 0) {
        console.log(`${result.collection}: +${result.newRecords} new records (total: ${result.totalAfter})`);
      }
    }
    console.log(`\nTotal new records migrated: ${totalNew}`);
  } else {
    console.log('\nNo new records to migrate. Database is up to date.');
  }
  
  console.log('\nMigration complete!');
  process.exit(0);
}

main().catch(console.error);

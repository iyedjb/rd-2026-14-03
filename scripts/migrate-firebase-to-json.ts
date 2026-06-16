import * as fs from 'fs';
import * as path from 'path';

const FIREBASE_MAIN_URL = "https://roda-bem-turismo-default-rtdb.firebaseio.com";
const FIREBASE_RH_URL = "https://cidade-dofuturo-default-rtdb.firebaseio.com";

const DATA_DIR = path.join(process.cwd(), 'data');
const MAIN_DB_PATH = path.join(DATA_DIR, 'database.json');
const RH_DB_PATH = path.join(DATA_DIR, 'rh-database.json');

interface MigrationStats {
  collection: string;
  existing: number;
  newRecords: number;
  total: number;
}

async function fetchFirebaseData(baseUrl: string, collection: string): Promise<Record<string, any>> {
  const url = `${baseUrl}/${collection}.json`;
  console.log(`Fetching ${collection} from ${url}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${collection}: ${response.status} ${response.statusText}`);
      return {};
    }
    const data = await response.json();
    return data || {};
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error);
    return {};
  }
}

function loadLocalDatabase(filePath: string): Record<string, any> {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
  }
  return {};
}

function saveDatabase(filePath: string, data: Record<string, any>): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved database to ${filePath}`);
}

function mergeCollection(
  localCollection: Record<string, any>,
  firebaseCollection: Record<string, any>,
  collectionName: string
): MigrationStats {
  const existingCount = Object.keys(localCollection).length;
  let newCount = 0;

  for (const [key, value] of Object.entries(firebaseCollection)) {
    if (!localCollection[key]) {
      const id = value.id || `rtdb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localCollection[key] = { ...value, id: value.id || id };
      newCount++;
    }
  }

  return {
    collection: collectionName,
    existing: existingCount,
    newRecords: newCount,
    total: Object.keys(localCollection).length
  };
}

async function migrateMainDatabase(): Promise<MigrationStats[]> {
  console.log('\n=== MIGRATING MAIN DATABASE ===\n');
  
  const localDb = loadLocalDatabase(MAIN_DB_PATH);
  const stats: MigrationStats[] = [];

  const collections = [
    'clients',
    'children', 
    'destinations',
    'receipts',
    'parcelas',
    'seatReservations',
    'prospects',
    'bills',
    'notifications',
    'users',
    'activities',
    'agencies',
    'buses',
    'cancelledClientCredits',
    'crmTasks',
    'departments',
    'facialVerificationSessions',
    'financial_transactions',
    'inactive_clients',
    'invitationLinks',
    'timeRecords'
  ];

  for (const collection of collections) {
    const firebaseData = await fetchFirebaseData(FIREBASE_MAIN_URL, collection);
    
    if (!localDb[collection]) {
      localDb[collection] = {};
    }

    const collectionStats = mergeCollection(localDb[collection], firebaseData, collection);
    stats.push(collectionStats);
    
    console.log(`  ${collection}: ${collectionStats.existing} existing, +${collectionStats.newRecords} new = ${collectionStats.total} total`);
  }

  saveDatabase(MAIN_DB_PATH, localDb);
  return stats;
}

async function migrateRHDatabase(): Promise<MigrationStats[]> {
  console.log('\n=== MIGRATING RH DATABASE ===\n');
  
  const localDb = loadLocalDatabase(RH_DB_PATH);
  const stats: MigrationStats[] = [];

  const collections = [
    'funcionarios',
    'proposals'
  ];

  for (const collection of collections) {
    const firebaseData = await fetchFirebaseData(FIREBASE_RH_URL, collection);
    
    if (!localDb[collection]) {
      localDb[collection] = {};
    }

    const collectionStats = mergeCollection(localDb[collection], firebaseData, collection);
    stats.push(collectionStats);
    
    console.log(`  ${collection}: ${collectionStats.existing} existing, +${collectionStats.newRecords} new = ${collectionStats.total} total`);
  }

  saveDatabase(RH_DB_PATH, localDb);
  return stats;
}

async function verifyDataIntegrity(): Promise<void> {
  console.log('\n=== VERIFYING DATA INTEGRITY ===\n');
  
  const mainDb = loadLocalDatabase(MAIN_DB_PATH);
  
  const clients = Object.values(mainDb.clients || {}) as any[];
  const children = Object.values(mainDb.children || {}) as any[];
  
  console.log(`Total clients: ${clients.length}`);
  console.log(`Total children/companions: ${children.length}`);

  let orphanedChildren = 0;
  let clientsWithChildren = new Set<string>();

  for (const child of children) {
    if (child.client_id) {
      const parentExists = clients.some(c => c.id === child.client_id);
      if (parentExists) {
        clientsWithChildren.add(child.client_id);
      } else {
        orphanedChildren++;
        console.log(`  Warning: Orphaned child "${child.name}" with client_id "${child.client_id}"`);
      }
    }
  }

  console.log(`\nClients with companions: ${clientsWithChildren.size}`);
  console.log(`Orphaned children records: ${orphanedChildren}`);

  const receipts = Object.values(mainDb.receipts || {}) as any[];
  let orphanedReceipts = 0;
  for (const receipt of receipts) {
    if (receipt.client_id) {
      const clientExists = clients.some(c => c.id === receipt.client_id);
      if (!clientExists) {
        orphanedReceipts++;
      }
    }
  }
  console.log(`Total receipts: ${receipts.length}`);
  console.log(`Orphaned receipts: ${orphanedReceipts}`);

  const parcelas = Object.values(mainDb.parcelas || {}) as any[];
  console.log(`Total parcelas: ${parcelas.length}`);

  const seatReservations = Object.values(mainDb.seat_reservations || {}) as any[];
  console.log(`Total seat reservations: ${seatReservations.length}`);

  const destinations = Object.values(mainDb.destinations || {}) as any[];
  console.log(`Total destinations: ${destinations.length}`);
}

async function main() {
  console.log('=============================================');
  console.log('   FIREBASE TO JSON MIGRATION SCRIPT');
  console.log('=============================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const mainStats = await migrateMainDatabase();
  const rhStats = await migrateRHDatabase();
  
  await verifyDataIntegrity();

  console.log('\n=== MIGRATION SUMMARY ===\n');
  
  let totalNew = 0;
  for (const stat of [...mainStats, ...rhStats]) {
    if (stat.newRecords > 0) {
      console.log(`  ${stat.collection}: +${stat.newRecords} new records`);
      totalNew += stat.newRecords;
    }
  }

  if (totalNew === 0) {
    console.log('  No new records found - databases are already in sync!');
  } else {
    console.log(`\n  TOTAL NEW RECORDS: ${totalNew}`);
  }

  console.log('\n=============================================');
  console.log('   MIGRATION COMPLETED SUCCESSFULLY');
  console.log('=============================================');
}

main().catch(console.error);

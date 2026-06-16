import { pool } from '../server/db';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function batchInsert(
  table: 'app_data' | 'rh_data',
  records: { collection: string; id: string; data: any }[]
) {
  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const valuePlaceholders: string[] = [];
    const queryParams: any[] = [];
    
    chunk.forEach((rec, idx) => {
      const p1 = idx * 3 + 1;
      const p2 = idx * 3 + 2;
      const p3 = idx * 3 + 3;
      valuePlaceholders.push(`($${p1}, $${p2}, $${p3})`);
      queryParams.push(rec.collection, rec.id, JSON.stringify(rec.data));
    });
    
    const sql = `
      INSERT INTO ${table} (collection, id, data)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (collection, id) 
      DO UPDATE SET data = EXCLUDED.data
    `;
    
    await pool.query(sql, queryParams);
    console.log(`Inserted ${i + chunk.length}/${records.length} records into ${table}...`);
  }
}

async function migrate() {
  const dataPath = path.join(process.cwd(), "data", "database.json");
  const rhDataPath = path.join(process.cwd(), "data", "rh-database.json");

  console.log("Starting migration to PostgreSQL database...");

  try {
    // 1. Migrate main database
    if (fs.existsSync(dataPath)) {
      console.log(`Reading main database from ${dataPath}...`);
      const fileContent = fs.readFileSync(dataPath, "utf-8");
      const parsed = JSON.parse(fileContent);
      
      const recordsToInsert: { collection: string; id: string; data: any }[] = [];
      
      for (const [collectionName, collectionData] of Object.entries(parsed)) {
        if (collectionData && typeof collectionData === 'object') {
          console.log(`Preparing collection '${collectionName}'...`);
          for (const [id, record] of Object.entries(collectionData as Record<string, any>)) {
            recordsToInsert.push({
              collection: collectionName,
              id,
              data: record
            });
          }
        }
      }
      
      if (recordsToInsert.length > 0) {
        console.log(`Total ${recordsToInsert.length} main records to migrate. Inserting...`);
        await batchInsert('app_data', recordsToInsert);
        console.log("Main database migration completed successfully.");
      } else {
        console.log("No main database records found to migrate.");
      }
    } else {
      console.log("No local database.json found to migrate.");
    }

    // 2. Migrate RH database
    if (fs.existsSync(rhDataPath)) {
      console.log(`Reading RH database from ${rhDataPath}...`);
      const fileContent = fs.readFileSync(rhDataPath, "utf-8");
      const parsed = JSON.parse(fileContent);
      
      const recordsToInsert: { collection: string; id: string; data: any }[] = [];
      
      for (const [collectionName, collectionData] of Object.entries(parsed)) {
        if (collectionData && typeof collectionData === 'object') {
          console.log(`Preparing RH collection '${collectionName}'...`);
          for (const [id, record] of Object.entries(collectionData as Record<string, any>)) {
            recordsToInsert.push({
              collection: collectionName,
              id,
              data: record
            });
          }
        }
      }
      
      if (recordsToInsert.length > 0) {
        console.log(`Total ${recordsToInsert.length} RH records to migrate. Inserting...`);
        await batchInsert('rh_data', recordsToInsert);
        console.log("RH database migration completed successfully.");
      } else {
        console.log("No RH database records found to migrate.");
      }
    } else {
      console.log("No local rh-database.json found to migrate.");
    }

    console.log("All migrations finished successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

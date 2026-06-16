import { pool } from '../server/db';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function setup() {
  console.log("Setting up PostgreSQL database tables...");
  
  try {
    // Create app_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        collection VARCHAR(255) NOT NULL,
        id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY (collection, id)
      );
    `);
    console.log("Table 'app_data' created or already exists.");

    // Create rh_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rh_data (
        collection VARCHAR(255) NOT NULL,
        id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY (collection, id)
      );
    `);
    console.log("Table 'rh_data' created or already exists.");

    // Create indexes on collection for faster query speed
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_app_data_collection ON app_data (collection);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rh_data_collection ON rh_data (collection);
    `);
    console.log("Indexes created successfully.");
    
  } catch (error) {
    console.error("Error setting up database tables:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();

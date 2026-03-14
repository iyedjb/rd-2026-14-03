#!/usr/bin/env node

/**
 * Script to manage vadmin users directly in Firebase
 * This script ensures the vadmin emails get proper access and bypasses verification issues
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const serviceAccount = {
        projectId: "roda-bem-turismo",
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      };
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: "roda-bem-turismo",
        databaseURL: "https://roda-bem-turismo-default-rtdb.firebaseio.com"
      });
    } else {
      initializeApp({
        projectId: "roda-bem-turismo",
        databaseURL: "https://roda-bem-turismo-default-rtdb.firebaseio.com"
      });
    }
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    process.exit(1);
  }
}

const auth = getAuth();
const db = getDatabase();

// Vadmin email addresses
const VADMIN_EMAILS = [
  'alda@rodabemturismo.com',
  'daniel@rodabemturismo.com', 
  'rosinha@rodabemturismo.com',
  'iyed@rodabemturismo.com'
];

/**
 * Create or update a user with vadmin role
 */
async function ensureVadminUser(email) {
  try {
    console.log(`\n🔄 Processing user: ${email}`);
    
    let userRecord;
    
    // Try to get existing user
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`   ✅ Found existing user: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user if doesn't exist
        console.log(`   📝 Creating new user for ${email}`);
        userRecord = await auth.createUser({
          email: email,
          emailVerified: true, // Force email verification to true
          disabled: false
        });
        console.log(`   ✅ Created new user: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }
    
    // Update user to ensure email is verified
    if (!userRecord.emailVerified) {
      console.log(`   🔧 Updating email verification for ${email}`);
      await auth.updateUser(userRecord.uid, {
        emailVerified: true
      });
      console.log(`   ✅ Email verification updated`);
    }
    
    // Set custom claims for vadmin
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'vadmin',
      admin: true,
      vadmin: true
    });
    console.log(`   ✅ Custom claims set: role=vadmin`);
    
    // Update user record in Realtime Database
    const now = new Date().toISOString();
    const userDbRef = db.ref(`users/${userRecord.uid}`);
    await userDbRef.set({
      email: email.toLowerCase(),
      role: 'vadmin',
      created_at: now,
      updated_at: now
    });
    console.log(`   ✅ Database record updated`);
    
    return userRecord;
    
  } catch (error) {
    console.error(`   ❌ Error processing ${email}:`, error.message);
    return null;
  }
}

/**
 * List all users and their roles
 */
async function listAllUsers() {
  try {
    console.log('\n📋 Current users in the system:');
    console.log('=' .repeat(50));
    
    const listUsersResult = await auth.listUsers();
    
    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims || {};
      const role = customClaims.role || 'no-role';
      const verified = userRecord.emailVerified ? '✅' : '❌';
      
      console.log(`Email: ${userRecord.email}`);
      console.log(`UID: ${userRecord.uid}`);
      console.log(`Role: ${role}`);
      console.log(`Verified: ${verified}`);
      console.log('-'.repeat(30));
    }
    
    // Also check database records
    console.log('\n📊 Database records:');
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    Object.entries(users).forEach(([uid, userData]) => {
      console.log(`DB - ${userData.email}: ${userData.role} (UID: ${uid})`);
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting vadmin user management script...');
  console.log(`📧 Target vadmin emails: ${VADMIN_EMAILS.join(', ')}`);
  
  // Process each vadmin email
  for (const email of VADMIN_EMAILS) {
    await ensureVadminUser(email);
  }
  
  // List all users to verify
  await listAllUsers();
  
  console.log('\n✅ Script completed successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Vadmin users should now have full access');
  console.log('   2. They may need to sign out and sign in again');
  console.log('   3. Check the application to verify all pages are visible');
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
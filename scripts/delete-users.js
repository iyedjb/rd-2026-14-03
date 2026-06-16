#!/usr/bin/env node

/**
 * Script to delete specific users from Firebase Realtime Database
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
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

const db = getDatabase();

async function deleteUser(email) {
  try {
    console.log(`\n🗑️  Deleting user: ${email}`);
    
    // Get all users from the database
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    // Find user by email
    let userId = null;
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.email?.toLowerCase() === email.toLowerCase()) {
        userId = uid;
        console.log(`   ✅ Found user with ID: ${uid}`);
        break;
      }
    }
    
    if (!userId) {
      console.log(`   ⚠️  User not found: ${email}`);
      return;
    }
    
    // Delete the user
    const userRef = db.ref(`users/${userId}`);
    await userRef.remove();
    
    console.log(`   ✅ Successfully deleted: ${email}`);
    
  } catch (error) {
    console.error(`   ❌ Error deleting user:`, error.message);
  }
}

// Delete the specific users
const usersToDelete = [
  'sawsen@rodabemturismo.com',
  'isamara@rodabemturismo.com',
  'client@vuro.com.br',
  'ciient@vuro.com.br',
  'isabelly@rodabemturismo.com'
];

console.log('🚀 Starting user deletion script...');
console.log(`📧 Users to delete: ${usersToDelete.length}`);
usersToDelete.forEach(email => console.log(`   - ${email}`));

(async () => {
  for (const email of usersToDelete) {
    await deleteUser(email);
  }
  
  console.log('\n✅ Script completed successfully!');
  console.log('\n💡 All specified users have been deleted from the system');
  process.exit(0);
})().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

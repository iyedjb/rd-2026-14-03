#!/usr/bin/env node

/**
 * Script to update a specific user's role in Firebase Realtime Database
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

async function updateUserRole(email, newRole) {
  try {
    console.log(`\n🔄 Looking for user: ${email}`);
    
    // Get all users from the database
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    // Find user by email
    let userId = null;
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.email?.toLowerCase() === email.toLowerCase()) {
        userId = uid;
        console.log(`   ✅ Found user with ID: ${uid}`);
        console.log(`   Current role: ${userData.role}`);
        break;
      }
    }
    
    if (!userId) {
      console.log(`   ❌ User not found: ${email}`);
      return;
    }
    
    // Update the user's role
    const userRef = db.ref(`users/${userId}`);
    await userRef.update({
      role: newRole,
      updated_at: new Date().toISOString()
    });
    
    console.log(`   ✅ Successfully updated role to: ${newRole}`);
    
    // Verify the update
    const updatedSnapshot = await userRef.once('value');
    const updatedUser = updatedSnapshot.val();
    console.log(`   Verified new role: ${updatedUser.role}`);
    
  } catch (error) {
    console.error(`   ❌ Error updating user:`, error.message);
  }
}

// Update the specific user
const targetEmail = 'iyed@rodabemturismo.com';
const targetRole = 'vadmin';

console.log('🚀 Starting user role update script...');
console.log(`📧 Target email: ${targetEmail}`);
console.log(`👤 Target role: ${targetRole}`);

updateUserRole(targetEmail, targetRole)
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. The user should sign out');
    console.log('   2. Sign back in to refresh their session');
    console.log('   3. They will now have full vadmin access');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

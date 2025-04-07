import * as admin from 'firebase-admin';
import { env } from '@/env'; // Import the validated env object

// Initialize Firebase Admin if it hasn't been initialized
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Use validated env var
        clientEmail: env.FIREBASE_CLIENT_EMAIL,        // Use validated env var
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Use validated env var
      }),
    });
  }

  return admin;
}

export const auth = getFirebaseAdmin().auth(); 
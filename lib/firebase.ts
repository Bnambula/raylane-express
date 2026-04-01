// ============================================================
// lib/firebase.ts
// This file connects your website to the Firebase database.
// Import "db" anywhere you need to save or read data.
// ============================================================

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// These values come from your .env.local file
// process.env reads the value of each key you set there
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Only initialise once — Next.js can run this file multiple times
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0]

// db = your database (Firestore)
// storage = your file storage (for hero images, sightseeing photos)
export const db      = getFirestore(app)
export const storage = getStorage(app)

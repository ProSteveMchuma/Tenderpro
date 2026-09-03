/**
 * Public Firebase web app config for project tenderpro-480721.
 * These values are safe to expose in the browser (Firebase client SDK).
 * Server writes still use the Admin SDK and FIREBASE_SERVICE_ACCOUNT_JSON.
 */
export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCV5dz7faG0dnHGjtyVBkH0jKHZiByoUoc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tenderpro-480721.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tenderpro-480721",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tenderpro-480721.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "336800880016",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:336800880016:web:71fd96ae334e0961ab0f15",
} as const;

export function getFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    firebaseWebConfig.projectId
  );
}

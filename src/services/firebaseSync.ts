// Firebase Sync is deprecated in favor of REST API synchronization with MySQL backend.
// This file is kept temporarily to avoid breaking imports, but no longer synchronizes with Firestore.

export function initializeFirebaseSync() {
  console.log('FirebaseSync: Legacy Firestore synchronization disabled. Using MySQL REST API.');
}

// Keep a few exports if any components imported them directly
export const syncMatchToFirebase = async () => {};
export const syncMatchUpdateToFirebase = async () => {};
export const listenForMatches = () => {};
export const syncUserPurchase = async () => {};
export const createFirestoreComment = async () => {};

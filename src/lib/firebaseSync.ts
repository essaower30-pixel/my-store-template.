import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Service to synchronize store state directly with Firebase Firestore in real-time.
 */
export const FirebaseSyncService = {
  /**
   * Save or merge store state into Firestore
   */
  async saveStoreData(storeId: string, payload: any) {
    try {
      const cleanStoreId = storeId && storeId.trim() !== '' ? storeId.trim() : 'main';
      const docRef = doc(db, 'stores', cleanStoreId);
      
      await setDoc(docRef, {
        id: cleanStoreId,
        updatedAt: new Date().toISOString(),
        lastUpdated: Date.now(),
        ...payload
      }, { merge: true });
      
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase Firestore saveStoreData notice:', err?.message || err);
      return { success: false, error: err?.message || 'Sync failed' };
    }
  },

  /**
   * Fetch current store data from Firestore
   */
  async fetchStoreData(storeId: string) {
    try {
      const cleanStoreId = storeId && storeId.trim() !== '' ? storeId.trim() : 'main';
      const docRef = doc(db, 'stores', cleanStoreId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { success: true, data: snapshot.data() };
      }
      return { success: true, data: null };
    } catch (err: any) {
      console.warn('Firebase Firestore fetchStoreData notice:', err?.message || err);
      return { success: false, error: err?.message || 'Fetch failed' };
    }
  },

  /**
   * Listen to real-time updates from Firestore across multiple cashier devices
   */
  subscribeToStoreUpdates(storeId: string, onUpdate: (data: any) => void) {
    try {
      const cleanStoreId = storeId && storeId.trim() !== '' ? storeId.trim() : 'main';
      const docRef = doc(db, 'stores', cleanStoreId);
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data());
        }
      }, (err) => {
        console.warn('Firebase Firestore snapshot notice:', err?.message || err);
      });
      
      return unsubscribe;
    } catch (err) {
      console.warn('Firebase subscribe notice:', err);
      return () => {};
    }
  }
};

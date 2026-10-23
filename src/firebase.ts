import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged, 
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser 
} from "firebase/auth";
import { getFirestore, doc, getDoc, getDocFromServer, collection, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { Transaction, UserPreferences, AuthUser } from "./types";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection on boot as mandated
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase client is currently offline. Operating in resilient offline-preference mode.");
    }
  }
}
testConnection();

// Standard Error Handler per Firebase Integration Skill Requirements
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error Detailed Details: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Resilient Fallback Flags
// If the users run in preview before configuring firestore on Firebase, we gracefully run on simulated store!
const isMockFirebase = firebaseConfig.apiKey.includes("mock_api_key");

// --- PERSISTENCE LAYER BRIDGE ---

export const saveUserPreferences = async (userId: string, preferences: UserPreferences): Promise<void> => {
  if (isMockFirebase) {
    localStorage.setItem(`preferences_${userId}`, JSON.stringify(preferences));
    return;
  }
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, "users", userId), {
      ...preferences,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // If permission or quota is denied, save to local fallback and report
    localStorage.setItem(`preferences_${userId}`, JSON.stringify(preferences));
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  const defaultPrefs: UserPreferences = {
    theme: "light",
    currency: "INR",
    monthlyBudget: 0, // Unset initially for new users
    categoryBudgets: {},
  };

  if (isMockFirebase) {
    const data = localStorage.getItem(`preferences_${userId}`);
    return data ? JSON.parse(data) : defaultPrefs;
  }

  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        theme: data.theme || "light",
        currency: data.currency || "INR",
        monthlyBudget: typeof data.monthlyBudget === "number" ? data.monthlyBudget : 0,
        categoryBudgets: data.categoryBudgets || {},
      };
    }
    return defaultPrefs;
  } catch (error) {
    const data = localStorage.getItem(`preferences_${userId}`);
    if (data) return JSON.parse(data);
    
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch (_) { /* bypass to allow fallback flow */ }
    return defaultPrefs;
  }
};

export const dbAddTransaction = async (userId: string, tx: Omit<Transaction, "id" | "userId">): Promise<Transaction> => {
  const id = "tx_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const newTx: Transaction = {
    ...tx,
    id,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isMockFirebase) {
    const txs = getLocalTransactions(userId);
    txs.push(newTx);
    saveLocalTransactions(userId, txs);
    return newTx;
  }

  const path = `users/${userId}/transactions/${id}`;
  try {
    await setDoc(doc(db, "users", userId, "transactions", id), newTx);
    return newTx;
  } catch (error) {
    // Fallback local save
    const txs = getLocalTransactions(userId);
    txs.push(newTx);
    saveLocalTransactions(userId, txs);
    handleFirestoreError(error, OperationType.WRITE, path);
    return newTx;
  }
};

export const dbUpdateTransaction = async (userId: string, tx: Transaction): Promise<void> => {
  const updatedTx = {
    ...tx,
    updatedAt: new Date().toISOString(),
  };

  if (isMockFirebase) {
    const txs = getLocalTransactions(userId);
    const index = txs.findIndex(t => t.id === tx.id);
    if (index !== -1) {
      txs[index] = updatedTx;
      saveLocalTransactions(userId, txs);
    }
    return;
  }

  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    await updateDoc(doc(db, "users", userId, "transactions", tx.id), updatedTx as any);
  } catch (error) {
    const txs = getLocalTransactions(userId);
    const index = txs.findIndex(t => t.id === tx.id);
    if (index !== -1) {
      txs[index] = updatedTx;
      saveLocalTransactions(userId, txs);
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const dbDeleteTransaction = async (userId: string, txId: string): Promise<void> => {
  if (isMockFirebase) {
    const txs = getLocalTransactions(userId);
    const filtered = txs.filter(t => t.id !== txId);
    saveLocalTransactions(userId, filtered);
    return;
  }

  const path = `users/${userId}/transactions/${txId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "transactions", txId));
  } catch (error) {
    const txs = getLocalTransactions(userId);
    const filtered = txs.filter(t => t.id !== txId);
    saveLocalTransactions(userId, filtered);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const dbGetTransactions = async (userId: string): Promise<Transaction[]> => {
  if (isMockFirebase) {
    return getLocalTransactions(userId);
  }

  const path = `users/${userId}/transactions`;
  try {
    const q = query(collection(db, "users", userId, "transactions"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    const list: Transaction[] = [];
    snap.forEach(doc => {
      list.push(doc.data() as Transaction);
    });
    return list;
  } catch (error) {
    // Return locals as robust coverage
    const locals = getLocalTransactions(userId);
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (_) { /* bypass to allow fallback flow */ }
    return locals;
  }
};

// Local storage helpers - strictly returns authentic user data, no seeded/sample records
function getLocalTransactions(userId: string): Transaction[] {
  const data = localStorage.getItem(`transactions_${userId}`);
  if (!data) return [];
  try {
    const list: Transaction[] = JSON.parse(data);
    // Guarantee that no obsolete development seed records persist
    const cleanList = list.filter((t) => t && !t.id.startsWith("tx_seed_"));
    if (cleanList.length !== list.length) {
      saveLocalTransactions(userId, cleanList);
    }
    return cleanList;
  } catch {
    return [];
  }
}

function saveLocalTransactions(userId: string, txs: Transaction[]) {
  // Ensure no seed transactions are ever saved
  const cleanList = txs.filter((t) => t && !t.id.startsWith("tx_seed_"));
  localStorage.setItem(`transactions_${userId}`, JSON.stringify(cleanList));
}

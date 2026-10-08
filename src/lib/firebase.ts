import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "lunapair-452de",
  appId: "1:1831317939:web:01fee722b1e1ed3a12dbc6",
  storageBucket: "lunapair-452de.firebasestorage.app",
  apiKey: "AIzaSyCgTeZHz3quwXAF13UojqRtA3IncKIMzDg",
  authDomain: "lunapair-452de.firebaseapp.com",
  messagingSenderId: "1831317939",
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = initializeApp(firebaseConfig);
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    _db = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache()
    });
  }
  return _db;
}

export const app = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return Reflect.get(getFirebaseApp(), prop);
  }
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    return Reflect.get(getFirebaseAuth(), prop);
  }
});

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    return Reflect.get(getFirebaseDb(), prop);
  }
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_, prop) {
    if (!_googleProvider) {
      _googleProvider = new GoogleAuthProvider();
    }
    return Reflect.get(_googleProvider, prop);
  }
});

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    if (result.user) {
      localStorage.setItem("lunapair-has-auth", "true");
    }
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(getFirebaseAuth());
    localStorage.removeItem("lunapair-has-auth");
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

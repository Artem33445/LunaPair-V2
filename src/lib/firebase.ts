import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  projectId: "lunapair-452de",
  appId: "1:1831317939:web:01fee722b1e1ed3a12dbc6",
  storageBucket: "lunapair-452de.firebasestorage.app",
  apiKey: "AIzaSyCgTeZHz3quwXAF13UojqRtA3IncKIMzDg",
  authDomain: "lunapair-452de.firebaseapp.com",
  messagingSenderId: "1831317939",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};


// ============================================================
// firebase.js — Shared Firebase config + init
// Imported by ALL pages
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, deleteUser
       } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc,
         deleteDoc, onSnapshot, query, orderBy, limit, where, startAfter,
         arrayUnion, arrayRemove, serverTimestamp, increment, deleteField
       } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL
       } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js';

// ===== CONFIG =====
export const firebaseConfig = {
  apiKey: "AIzaSyA4zw5cZqxLwzkTy2e5NiHz-tGKqk1KGdI",
  authDomain: "newstally-df03c.firebaseapp.com",
  projectId: "newstally-df03c",
  storageBucket: "newstally-df03c.appspot.com",
  messagingSenderId: "506893212961",
  appId: "1:506893212961:web:63882290195da992207260"
};

export const SHEET_ID     = '1Wy6rzaCALqPLFx079nqBCDRP7dk3au5eRO4GuMwQ8Sk';
export const SHEETS_KEY   = 'AIzaSyC8D-4bl3GDyj_--BGG1pPdO5Bz63r5iXI';
export const APP_ID       = 'newstally-social';
export const SHEET_NAME   = 'Sheet1';

// ===== INIT =====
const app            = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// ===== RE-EXPORT FIRESTORE HELPERS =====
export { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc,
         deleteDoc, onSnapshot, query, orderBy, limit, where, startAfter,
         arrayUnion, arrayRemove, serverTimestamp, increment, deleteField,
         signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         updateProfile, deleteUser, ref, uploadBytesResumable, getDownloadURL };

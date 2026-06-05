// ============================================================
// PRIME KITS — Firebase Configuration
// Replace the values below with your own Firebase project.
// Go to: https://console.firebase.google.com → Project Settings
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBHBXk4ewmLeTvdjXBeAy4V0_3jxKvyOIA",
  authDomain: "prime-kits-store.firebaseapp.com",
  projectId: "prime-kits-store",
  storageBucket: "prime-kits-store.firebasestorage.app",
  messagingSenderId: "665596477374",
  appId: "1:665596477374:web:dea185bd9669239b5303ef"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage, collection, getDocs, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp, getDoc, setDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged, ref, uploadBytes, getDownloadURL, deleteObject };

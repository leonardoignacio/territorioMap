// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import Firebase Storage

// Your web app's Firebase configuration read from environment variables
// Vite exposes env variables prefixed with VITE_ on import.meta.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Optional
};

// Validate that essential variables are set
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Erro de configuração do Firebase: Variáveis de ambiente VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID são obrigatórias. Verifique seu arquivo .env.");
  // Optionally, throw an error or display a message to the user
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Initialize Storage
const googleProvider = new GoogleAuthProvider();

// Export Firebase services and potentially the base path for images
const imageBasePath = import.meta.env.VITE_FIREBASE_STORAGE_IMAGE_BASE_PATH || '';

export { auth, db, storage, googleProvider, imageBasePath };


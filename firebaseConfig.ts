
// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
// @ts-ignore
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
export const firebaseConfig = {
  // Use the specific API Key for the p7s-web Firebase project.
  // Do NOT use process.env.API_KEY here, as that is injected for the Gemini API
  // and is not valid for this specific Firebase Authentication project.
  apiKey: "AIzaSyCbDYR-oItdJdED8PaZkZPXjRLvnWh7AuQ",
  authDomain: "p7s-web.firebaseapp.com",
  projectId: "p7s-web",
  storageBucket: "p7s-web.firebasestorage.app",
  messagingSenderId: "498455425578",
  appId: "1:498455425578:web:912932b56e0db607700953",
  measurementId: "G-XY47DGEXBC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);

// Use initializeFirestore with experimentalForceLongPolling to prevent connection timeouts
// This is critical for environments where WebSockets are blocked or unstable
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics
// Disabled to prevent "403 PERMISSION_DENIED" errors related to firebaseinstallations.googleapis.com
// because the API Key restrictions likely block this API.
export const analytics = null;

export default app;

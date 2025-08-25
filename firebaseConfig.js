import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAl668T4QhRqfxJBzIg9aqm9IBeTsyR3W8",
  authDomain: "camera-app-30088.firebaseapp.com",
  projectId: "camera-app-30088",
  storageBucket: "camera-app-30088.firebasestorage.app",
  messagingSenderId: "946671002589",
  appId: "1:946671002589:web:ced78e6c36f77ad9a74c34",
  measurementId: "G-PJSRJHNT9Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

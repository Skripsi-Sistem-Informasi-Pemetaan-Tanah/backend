import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAFB3Xptk4REsy4Pkky4jOwX6HfiCwKvVs",
  authDomain: "pertanahan-651a1.firebaseapp.com",
  projectId: "pertanahan-651a1",
  storageBucket: "pertanahan-651a1.appspot.com",
  messagingSenderId: "963363737329",
  appId: "1:963363737329:web:32d3ae619d2a25453c2350",
  measurementId: "G-GH221H30LR",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const imgDb = getStorage(app);
const textDb = getFirestore(app);
const analytics = getAnalytics(app);

export { imgDb, textDb };

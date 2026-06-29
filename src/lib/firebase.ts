import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDOgG5-3eyjqU4akmLwn8F1q-x8AjWaXL0",
  authDomain: "controle-de-obra-354df.firebaseapp.com",
  projectId: "controle-de-obra-354df",
  storageBucket: "controle-de-obra-354df.firebasestorage.app",
  messagingSenderId: "938853534162",
  appId: "1:938853534162:web:ddc66a006d414b845c600b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Validate connection to Firestore as per critical constraint in firebase integration guidelines
async function testConnection() {
  try {
    // Testing connection to a test collection doc
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.", error);
    }
  }
}

testConnection();

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {isEmulating, isProductionEnv} from './environment.js';

let firebaseConfig;
// console.log('isEmulating: ' + isEmulating);
// console.log('isProductionEnv: ' + isProductionEnv());

if (isProductionEnv()) {
  // Your web app's Prod Firebase configuration
  firebaseConfig = {
    apiKey: "AIzaSyAbq9QugYhv1muMYPtbu7luHV_AMTLak1Q",
    authDomain: "aus-order-form.firebaseapp.com",
    projectId: "aus-order-form",
    storageBucket: "aus-order-form.appspot.com",
    messagingSenderId: "943914175430",
    appId: "1:943914175430:web:bd256bf86aa0279fca80c7"
  };
} else {
  // Your web app's Staging Firebase configuration
  firebaseConfig = {
    apiKey: "AIzaSyBaOrPY98aOjeEWLbzjkADcK5m8hyPJjDY",
    authDomain: "aus-order-app-test.firebaseapp.com",
    projectId: "aus-order-app-test",
    storageBucket: "aus-order-app-test.appspot.com",
    messagingSenderId: "609627588452",
    appId: "1:609627588452:web:813ba06e1db689b8509c71",
    measurementId: "G-HHV0BYQ8YX"
  };
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize firestore
const db = getFirestore(app);
if (isEmulating) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
if (isEmulating) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
}

export {db, auth}

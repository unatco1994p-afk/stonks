import { Firestore } from '@google-cloud/firestore';
import { initializeApp, cert } from 'firebase-admin/app';

const credentials = JSON.parse(process.env.FIRESTORE_CREDENTIALS);

initializeApp({
  credential: cert(credentials),
  projectId: credentials.project_id
});

const db = new Firestore({
  projectId: credentials.project_id,
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
  databaseId: process.env.FIRESTORE_DB
});

export USERS_COLLECTON = db.collection('users');
export INVESTMENT_COLLECTION = db.collection("testInvestments");
export LOGS_COLLECTION = db.collection("testMessages");

export default db;

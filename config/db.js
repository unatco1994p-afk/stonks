import { Firestore, Timestamp } from '@google-cloud/firestore';
import { initializeApp, cert } from 'firebase-admin/app';

const credentials = JSON.parse(process.env.FIRESTORE_CREDENTIALS);

/**
 * Uniwersalny konwerter Firestore → ISO stringi dla Timestamp
 */
const globalConverter = {
  toFirestore: data => data,

  fromFirestore(
    snapshot,
    options
  ) {
    const data = snapshot.data(options);
    return convertTimestamps(data);
  }
};

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

export const USERS_COLLECTION = db.collection('users').withConverter(globalConverter);

export const INVESTMENT_COLLECTION = db.collection('investments').withConverter(globalConverter);
export const INVESTMENT_AGGREGATE_COLLECTION = db.collection('investmentAggregate').withConverter(globalConverter);

export const LOGS_COLLECTION = db.collection('logs').withConverter(globalConverter);

export const PRICES_CACHE_COLLECTION = db.collection('pricesCache').withConverter(globalConverter);

export default db;

/**
 * Rekurencyjnie zamienia Timestamp na ISO string
 */
function convertTimestamps(obj) {
  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  } else if (Array.isArray(obj)) {
    return obj.map(v => convertTimestamps(v));
  } else if (obj !== null && typeof obj === "object") {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      result[key] = convertTimestamps(value);
    });
    return result;
  }
  return obj;
}

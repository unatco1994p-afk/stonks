const express = require('express');
const app = express();

const { Firestore } = require('@google-cloud/firestore');
const { initializeApp, cert } = require('firebase-admin/app');

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
  databaseId: 'stonks-db'
});

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Hello World from Node.js on Google Cloud!');
});

app.get('/log', async (req, res) => {
  const ref = await db.collection('testMessages').add({
    createdAt: new Date()
  });

  res.send('Returned: ' + ref.id);
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

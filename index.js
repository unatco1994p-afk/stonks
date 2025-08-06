const express = require('express');
const app = express();

const admin = require('firebase-admin');

const PORT = process.env.PORT || 8080;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(process.env.FIRESTORE_CREDENTIALS)
  });
}

const db = admin.firestore();

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

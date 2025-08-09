const express = require('express');
const cors = require("cors");
const { Firestore } = require('@google-cloud/firestore');
const { initializeApp, cert } = require('firebase-admin/app');

const app = express();
app.use(cors());
app.use(express.json()); 

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

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Hello World from Node.js on Google Cloud!"
  });
});

app.post("/log", async (req, res) => {
  try {
    const data = {
      createdAt: new Date(),
      ...(req.body || {})
    };

    const ref = await db.collection("testMessages").add(data);

    res.status(201).json({
      success: true,
      id: ref.id
    });
  } catch (err) {
    console.error("Firestore error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/logs", async (req, res) => {
  try {
    const snapshot = await db.collection("testMessages").orderBy("createdAt", "desc").get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      logs
    });
  } catch (err) {
    console.error("Firestore error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

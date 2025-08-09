import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// POST /log
router.post('/', async (req, res) => {
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

// GET /logs
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection("testMessages")
      .orderBy("createdAt", "desc")
      .get();

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

export default router;

import express from 'express';
import db from '../config/db.js';
import { verifyToken } from '../config/auth.js';

const router = express.Router();

// POST /log
router.post('/', verifyToken, async (req, res) => {
  try {
    // Pobieranie IP klienta (uwzględnia proxy)
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip;

    // Dane o przeglądarce / urządzeniu z nagłówka User-Agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Czas serwera
    const timestamp = new Date();

    // Host, metoda, oryginalny URL
    const host = req.headers.host;
    const method = req.method;
    const path = req.originalUrl;

    const content = req.body?.content;

    const data = {
      ip,
      userAgent,
      method,
      host,
      path,
      content,
      createdAt: timestamp,
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
router.get('/', verifyToken, async (req, res) => {
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

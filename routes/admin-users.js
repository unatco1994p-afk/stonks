import db from '../config/db.js';
import { verifyRole, verifyToken } from '../config/auth.js';
import express from 'express';

const router = express.Router();

const USERS_COLLECTION = 'users';

router.get('/users', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
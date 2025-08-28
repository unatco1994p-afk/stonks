import { USERS_COLLECTION } from '../config/db.js';
import { verifyRole, verifyToken } from '../config/auth.js';
import express from 'express';

const router = express.Router();

router.get('/users', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const snapshot = await USERS_COLLECTION.get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// TOOD: add other methods rto manage users

export default router;
import express from 'express';
import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { generateToken, verifyToken } from '../config/auth.js';

const router = express.Router();
const USERS_COLLECTION = 'users';

// Rejestracja
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required!' });
  }

  try {
    // Sprawdź czy użytkownik już istnieje
    const existing = await db.collection(USERS_COLLECTION)
      .where('email', '==', email)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'User already exist' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRef = await db.collection(USERS_COLLECTION).add({
      email,
      password: hashedPassword,
      createdAt: new Date()
    });

    res.status(201).json({ success: true, id: userRef.id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logowanie
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required!' });
  }

  try {
    const snapshot = await db.collection(USERS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid login data' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid login data' });
    }

    const token = generateToken({ uid: userDoc.id, email: userData.email });

    res.json({ success: true, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test – dane użytkownika (wymaga tokenu)
router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;

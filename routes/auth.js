import express from 'express';
import bcrypt from 'bcrypt';
import { USERS_COLLECTION } from '../config/db.js';
import { generateToken, verifyToken } from '../config/auth.js';
import { body, validationResult } from 'express-validator';
import xss from 'xss';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again later.' }
});

router.post('/register',
  [
    // Walidacja i sanityzacja pola email
    body('email')
      .trim()
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    // Walidacja hasła
    // body('password')
    //   .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    //   .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    //   .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    //   .matches(/[0-9]/).withMessage('Password must contain at least one number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = xss(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required!' });
    }

    try {
      const existing = await USERS_COLLECTION
        .where('email', '==', email)
        .get();

      if (!existing.empty) {
        return res.status(400).json({ error: 'User already exist' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userRef = await USERS_COLLECTION.add({
        email,
        password: hashedPassword,
        roles: ['guest'],
        createdAt: new Date()
      });

      res.status(201).json({ success: true, id: userRef.id });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

router.post('/login',
  loginLimiter,
  [
    body('email')
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    // body('password')
    //   .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = xss(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required!' });
    }

    try {
      const snapshot = await USERS_COLLECTION
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

      const token = generateToken({ uid: userDoc.id, email: userData.email, roles: userData.roles });

      res.json({ success: true, token });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

// TODO: add returning of all user specific data
router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;

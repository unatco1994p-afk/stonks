import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecretkey';

const USERS_COLLECTION = 'users';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No Bearer Token found' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function verifyRole(requiredRole) {
  return async (req, res, next) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userDoc = await db.collection(USERS_COLLECTION).doc(req.user.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();

      if (!userData.roles.includes(requiredRole)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  };
}
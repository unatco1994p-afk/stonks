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

router.delete('/users/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.id === id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        const userDoc = await USERS_COLLECTION.doc(id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();

        if (Array.isArray(userData.roles) && userData.roles.includes('admin')) {
            const adminsSnapshot = await USERS_COLLECTION.where('roles', 'array-contains', 'admin').get();
            if (adminsSnapshot.size <= 1) {
                return res.status(400).json({ error: 'You cannot delete the last admin' });
            }
        }

        await USERS_COLLECTION.doc(id).delete();
        res.json({ message: `User ${id} deleted successfully` });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/users/:id', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'Roles must be an array of strings' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot edit your own roles' });
    }

    const userDoc = await USERS_COLLECTION.doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    const userIsAdminNow = Array.isArray(userData.roles) && userData.roles.includes('admin');
    const willBeAdmin = roles.includes('admin');

    if (userIsAdminNow && !willBeAdmin) {
      const adminsSnapshot = await USERS_COLLECTION.where('roles', 'array-contains', 'admin').get();
      if (adminsSnapshot.size <= 1) {
        return res.status(400).json({ error: 'You cannot remove admin role from the last admin' });
      }
    }

    await USERS_COLLECTION.doc(id).update({ roles });
    res.json({ message: `User ${id} roles updated`, roles });

  } catch (err) {
    console.error('Update user roles error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
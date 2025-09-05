import express from 'express';
import logsRouter from './logs.js';
import authRouter from './auth.js';
import adminUsersRouter from './admin-users.js';
import investmentsRouter from './investments.js';
import booksRouter from './books.js';
import preferencesRouter from './preferences.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: "ok",
    message: "Hello World from Node.js on Google Cloud!"
  });
});

router.use('/logs', logsRouter);
router.use('/auth', authRouter);
router.use('/admin-users', adminUsersRouter);
router.use('/investments', investmentsRouter);
router.use('/books', booksRouter);
router.use('/preferences', preferencesRouter);

export default router;

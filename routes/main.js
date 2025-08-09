import express from 'express';
import logsRouter from './logs.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: "ok",
    message: "Hello World from Node.js on Google Cloud!"
  });
});

router.use('/logs', logsRouter);

export default router;

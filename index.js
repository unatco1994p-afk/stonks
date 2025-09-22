import express from 'express';
import cors from 'cors';
import routes from './routes/main.js';
import { verifyToken } from './config/auth.js';
import { scheduleTask } from './services/investments/price-cache.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/', routes);

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
        error: err.message,
        ...(err.details && { details: err.details })
    });
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});

scheduleTask();

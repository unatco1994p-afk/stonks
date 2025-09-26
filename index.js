import express from 'express';
import cors from 'cors';
import routes from './routes/main.js';
import { verifyToken } from './config/auth.js';
import { fetchInvestmentsPrices } from './services/investments/price-cache.js';
import { calculateCurrentValueForAllUsers } from './repository/investments-repository.js';
import { runInvestmentAggregateTask } from './services/investments/aggregate.js';

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

if (process.env.RUN_INIT_TASKS) {
    setTimeout(async () => {
        console.log('[🚀] Running Fetch Investments Prices Task...' )
        await fetchInvestmentsPrices();
        console.log('[✅] Fetch Investments Prices Task done!' );

        console.log('[🚀] Running Investments Current Value Recalculation Task...' )
        await calculateCurrentValueForAllUsers();
        console.log('[✅] Investments Current Value Recalculation Task done!' );

        console.log('[🚀] Running Investments Aggregate Task...' )
        await runInvestmentAggregateTask();
        console.log('[✅] Investments Aggregate Task done!' );
    }, 100);
}

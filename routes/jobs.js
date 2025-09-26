import express from 'express';
import asyncHandler from '../config/async-error-handler.js';
import { calculateCurrentValueForAllUsers } from '../repository/investments-repository.js';
import { fetchInvestmentsPrices } from '../services/investments/price-cache.js';
import { runInvestmentAggregateTask } from '../services/investments/aggregate.js';

const router = express.Router();

// TODO: rebound needed here

router.post('/fetch-investment-prices/',
    asyncHandler(async (req, res) => {
        console.log('[⚙️] Job /fetch-investment-prices/ started...' );

        await fetchInvestmentsPrices();

        console.log('[✅] Job /fetch-investment-prices/ finished!' );
        res.json({ success: true });
    })
);

router.post('/calculate-investment-values/',
    asyncHandler(async (req, res) => {
        console.log('[⚙️] Job /calculate-investment-values/ started...' );

        await calculateCurrentValueForAllUsers();

        console.log('[✅] Job /calculate-investment-values/ finished!' );
        res.json({ success: true });
    })
);

router.post('/aggregate-investments/',
    asyncHandler(async (req, res) => {
        console.log('[⚙️] Job /aggregate-investments/ started...' );

        await runInvestmentAggregateTask();

        console.log('[✅] Job /aggregate-investments/ finished!' );
        res.json({ success: true });
    })
);

export default router;
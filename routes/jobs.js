import express from 'express';
import asyncHandler from '../config/async-error-handler.js';
import { calculateCurrentValueForAllUsers } from '../../repository/investment-repository.js';
import { fetchInvestmentsPrices } from '../services/investments/price-cache.js';

const router = express.Router();

// TODO: rebound needed here

router.post('/fetch-investment-prices/',
    asyncHandler(async (req, res) => {
        await fetchInvestmentsPrices();

        res.json({ success: true });
    })
);

router.post('/calculate-investment-values/',
    asyncHandler(async (req, res) => {
        await calculateCurrentValueForAllUsers();

        res.json({ success: true });
    })
);

router.post('/aggregate-investments/',
    asyncHandler(async (req, res) => {
        await runInvestmentAggregateTask();

        res.json({ success: true });
    })
);

export default router;
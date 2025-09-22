import express from 'express';
import db, { INVESTMENT_COLLECTION } from '../config/db.js';
import { verifyToken } from '../config/auth.js';
import { body } from 'express-validator';
import asyncHandler from '../config/async-error-handler.js';
import validateRequest from '../config/validate-request.js';
import { calculateCurrentBondValue, calculateCurrentDepositValue, calculateCurrentCryptoValue } from '../services/investments/value-calculator.js';
import { getAllCachedPrices } from '../services/investments/price-cache.js';

const validators = {
    required$name: body('name')
        .exists().withMessage('name is required')
        .isLength({ max: 128 }).withMessage('name length is max 128'),
    optional$name: body('name')
        .optional({ checkFalsy: true })
        .isLength({ max: 128 }).withMessage('name length is max 128'),
    required$spot: body('spot')
        .exists().withMessage('spot is required')
        .isLength({ max: 128 }).withMessage('spot length is max 128'),
    optional$spot: body('spot')
        .optional({ checkFalsy: true })
        .isLength({ max: 128 }).withMessage('spot length is max 128'),
    required$description: body('description')
        .exists().withMessage('description is required')
        .isLength({ max: 256 }).withMessage('description length is max 256'),
    optional$description: body('description')
        .optional({ checkFalsy: true })
        .isLength({ max: 256 }).withMessage('description length is max 256'),
    required$value: body('value')
        .exists().withMessage('value is required')
        .isFloat({ min: 0.01 }).withMessage('value must be positive value')
        .toFloat(),
    optional$value: body('value')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0.01 }).withMessage('value must be positive value')
        .toFloat(),
    required$price: body('price')
        .exists().withMessage('price is required')
        .isFloat({ min: 0.01 }).withMessage('price must be positive value')
        .toFloat(),
    optional$price: body('price')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0.01 }).withMessage('price must be positive value')
        .toFloat(),
    required$quantity: body('quantity')
        .exists().withMessage('quantity is required')
        .isFloat().withMessage('quantity must be number')
        .toFloat(),
    optional$quantity: body('quantity')
        .optional({ checkFalsy: true })
        .isFloat().withMessage('quantity must be number')
        .toFloat(),
    required$volume: body('volume')
        .exists().withMessage('volume is required')
        .isInt().withMessage('volume must be integer')
        .toInt(),
    optional$volume: body('volume')
        .optional({ checkFalsy: true })
        .isInt().withMessage('volume must be integer')
        .toInt(),
    required$currency: body('currency')
        .exists().withMessage('currency is required')
        .isIn(['USD', 'EUR', 'PLN']).withMessage('currency must be USD, EUR or PLN'),
    optional$currency: body('currency')
        .optional({ checkFalsy: true })
        .isIn(['USD', 'EUR', 'PLN']).withMessage('currency must be USD, EUR or PLN'),
    required$cryptoSymbol: body('cryptoSymbol')
        .exists().withMessage('cryptoSymbol is required')
        .isLength({ min: 3, max: 10 }).withMessage('cryptoSymbol must be between 3 and 10 characters'),
    optional$cryptoSymbol: body('cryptoSymbol')
        .optional({ checkFalsy: true })
        .isLength({ min: 3, max: 10 }).withMessage('cryptoSymbol must be between 3 and 10 characters'),
    required$interest: body('interest')
        .exists().withMessage('interest is required')
        .isFloat({ min: 0.0001 }).withMessage('interest must be positive value')
        .toFloat(),
    optional$interest: body('interest')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0.0001 }).withMessage('interest must be positive value')
        .toFloat(),
    required$interestsList: body('interestsList')
        .exists().withMessage('interestsList is required')
        .matches(/^(\d+(\.\d+)?)(,(\d+(\.\d+)?))*$/)
        .withMessage('interestsList must be a comma-separated list of positive numbers')
        .customSanitizer(value => value.split(',').map(Number)),
    optional$interestsList: body('interestsList')
        .optional({ checkFalsy: true })
        .matches(/^(\d+(\.\d+)?)(,(\d+(\.\d+)?))*$/)
        .withMessage('interestsList must be a comma-separated list of positive numbers')
        .customSanitizer(value => value.split(',').map(Number)),
    required$stakingInterest: body('stakingInterest')
        .exists().withMessage('stakingInterest is required')
        .isFloat({ min: 0.01 }).withMessage('stakingInterest must be positive value')
        .toFloat(),
    optional$stakingInterest: body('stakingInterest')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0.01 }).withMessage('stakingInterest must be positive value')
        .toFloat(),
    required$startDate: body('startDate')
        .exists().withMessage('startDate is required')
        .isISO8601().withMessage('startDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
        .toDate(),
    optional$startDate: body('startDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('startDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
        .toDate(),
    required$dueDate: body('dueDate')
        .exists().withMessage('dueDate is required')
        .isISO8601().withMessage('dueDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
        .toDate(),
    optional$dueDate: body('dueDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('dueDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
        .toDate(),
    required$priceAtStartDate: body('priceAtStartDate')
        .exists().withMessage('priceAtStartDate is required')
        .isFloat().withMessage('priceAtStartDate must be number')
        .toFloat(),
    optional$priceAtStartDate: body('priceAtStartDate')
        .optional({ checkFalsy: true })
        .isFloat().withMessage('priceAtStartDate must be number')
        .toFloat(),
    required$priceRelativeToCurrency: body('priceRelativeToCurrency')
        .exists().withMessage('priceRelativeToCurrency is required')
        .isIn(['USD', 'EUR', 'PLN']).withMessage('priceRelativeToCurrency must be USD, EUR or PLN'),
    optional$priceRelativeToCurrency: body('priceRelativeToCurrency')
        .optional({ checkFalsy: true })
        .isIn(['USD', 'EUR', 'PLN']).withMessage('priceRelativeToCurrency must be USD, EUR or PLN'),
    required$bondTicker: body('bondTicker')
        .exists().withMessage('bondTicker is required')
        .isLength({ max: 128 }).withMessage('bondTicker length is max 128'),
    optional$bondTicker: body('bondTicker')
        .optional({ checkFalsy: true })
        .isLength({ max: 128 }).withMessage('bondTicker length is max 128'),
    required$stockTicker: body('stockTicker')
        .exists().withMessage('stockTicker is required')
        .isLength({ max: 128 }).withMessage('stockTicker length is max 128'),
    optional$stockTicker: body('stockTicker')
        .optional({ checkFalsy: true })
        .isLength({ max: 128 }).withMessage('stockTicker length is max 128'),
    required$dividend: body('dividend')
        .exists().withMessage('dividend is required')
        .isFloat({ min: 0.0001 }).withMessage('dividend must be positive value')
        .toFloat(),
    optional$dividend: body('dividend')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0.0001 }).withMessage('dividend must be positive value')
        .toFloat()
}

const depositValidators = [
    validators.required$name,
    validators.required$spot,
    validators.optional$description,
    validators.required$value,
    validators.required$currency,
    validators.optional$interest,
    validators.optional$startDate
];

const cryptoValidators = [
    validators.required$name,
    validators.required$spot,
    validators.optional$description,
    validators.required$quantity,
    validators.optional$priceAtStartDate,
    validators.optional$priceRelativeToCurrency,
    validators.required$cryptoSymbol,
    validators.optional$stakingInterest,
    validators.optional$startDate
];

const bondValidators = [
    validators.required$name,
    validators.required$spot,
    validators.optional$description,
    validators.required$volume,
    validators.required$price,
    validators.required$currency,
    validators.required$bondTicker,
    validators.required$interestsList,
    validators.required$startDate,
    validators.required$dueDate
];

const stockValidators = [
    validators.required$name,
    validators.required$spot,
    validators.optional$description,
    validators.required$volume,
    validators.required$price,
    validators.required$priceRelativeToCurrency,
    validators.required$startDate,
    validators.required$stockTicker,
    validators.optional$dividend
];

async function getInvestmentsList(userId, investmentType) {
    let query = INVESTMENT_COLLECTION.where('userId', '==', userId);

    if (investmentType !== null && investmentType !== undefined) {
        query = query.where('investmentType', '==', investmentType);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

const router = express.Router();

router.get('/currencies/', verifyToken,
    asyncHandler(async (req, res) => {
        const cache = await getAllCachedPrices();

        const cachedUsd = cache[`currency_USD`]?.value ?? 0;
        const cachedEur = cache[`currency_EUR`]?.value ?? 0;
        // TODO: more currencies

        res.json({pln: 1, eur: cachedEur, usd: cachedUsd});
    })
);

router.post('/current-values/', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        const all = await getInvestmentsList(userId, null);

        const deposits = all.filter(inv => inv.investmentType === 'deposit');
        const cryptos = all.filter(inv => inv.investmentType === 'crypto');
        const bonds = all.filter(inv => inv.investmentType === 'bond');
        const stocks = all.filter(inv => inv.investmentType === 'stock');

        // pobieramy WSZYSTKO z cache na raz
        const cache = await getAllCachedPrices();

        // --- deposits ---
        const newDeposits = deposits.map(deposit => ({
            ...deposit,
            currentValue: calculateCurrentDepositValue(deposit)
        }));

        // --- cryptos ---
        const newCryptos = cryptos.map(crypto => {
            const cached = cache[`crypto_${crypto.cryptoSymbol}`];
            const price = cached?.value ?? 0;
            return {
                ...crypto,
                currentValue: +calculateCurrentCryptoValue(crypto) * +price,
            };
        });

        // --- bonds ---
        const newBonds = bonds.map(bond => ({
            ...bond,
            currentValue: calculateCurrentBondValue(bond)
        }));

        // --- stocks ---
        const newStocks = stocks.map(stock => {
            const cached = cache[`gpwStock_${stock.stockTicker}`];
            const price = cached?.value ?? 0;
            return {
                ...stock,
                currentValue: +price * stock.volume,
            };
        });

        const allInvestments = [
            ...newDeposits,
            ...newCryptos,
            ...newBonds,
            ...newStocks
        ];

        await commitInBatches(allInvestments);
        res.json({ success: true });
    })
);

async function commitInBatches(investments) {
    const chunkSize = 500;
    const now = new Date();

    for (let i = 0; i < investments.length; i += chunkSize) {
        const batch = db.batch();
        const chunk = investments.slice(i, i + chunkSize);

        chunk.forEach(inv => {
            const ref = INVESTMENT_COLLECTION.doc(inv.id);
            batch.update(ref, {
                currentValue: inv.currentValue,
                lastRecalculationDate: now,
            });
        });

        await batch.commit();
    }
}

/** GET ALL */
router.get('/deposits/', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        res.json(await getInvestmentsList(userId, 'deposit'));
    })
);

router.get('/cryptos/', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        res.json(await getInvestmentsList(userId, 'crypto'));
    })
);

router.get('/bonds/', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        res.json(await getInvestmentsList(userId, 'bond'));
    })
);

router.get('/stocks/', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        res.json(await getInvestmentsList(userId, 'stock'));
    })
)

/** POST NEW */
router.post('/deposits/', verifyToken, depositValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { name, spot, description, value, currency, interest, startDate } = req.body;

        const docRef = await INVESTMENT_COLLECTION.add({
            userId, investmentType: 'deposit', //
            name, spot, description, value, currency, interest, startDate, //
            createdAt: new Date()
        });

        res.status(201).json({
            id: docRef.id,
            name, spot, description, value, currency, interest, startDate
        });
    })
);

router.post('/cryptos/', verifyToken, cryptoValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { name, spot, description, quantity, priceAtStartDate, priceRelativeToCurrency, cryptoSymbol, stakingInterest, startDate } = req.body;

        const docRef = await INVESTMENT_COLLECTION.add({
            userId, investmentType: 'crypto', //
            name, spot, description, quantity, priceAtStartDate, priceRelativeToCurrency, cryptoSymbol, stakingInterest, startDate, //
            createdAt: new Date()
        });

        res.status(201).json({
            id: docRef.id,
            name, spot, description, quantity, priceAtStartDate, priceRelativeToCurrency, cryptoSymbol, stakingInterest, startDate
        });
    })
)

router.post('/bonds/', verifyToken, bondValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { name, spot, description, volume, currency, price, bondTicker, interestsList, startDate, dueDate } = req.body;

        let interestsListVar = interestsList;
        if (interestsList === '') {
            interestsListVar = [];
        }

        const docRef = await INVESTMENT_COLLECTION.add({
            userId, investmentType: 'bond', //
            name, spot, description, volume, currency, price, bondTicker,
            interestsList: interestsListVar,
            startDate, dueDate, //
            createdAt: new Date()
        });

        res.status(201).json({
            id: docRef.id,
            name, spot, description, volume, currency, price, bondTicker,
            interestsList: interestsListVar,
            startDate, dueDate
        });
    })
)

router.post('/stocks/', verifyToken, stockValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { name, spot, description, volume, price, priceRelativeToCurrency, startDate, stockTicker, dividend } = req.body;

        const docRef = await INVESTMENT_COLLECTION.add({
            userId, investmentType: 'stock', //
            name, spot, description, volume, price, priceRelativeToCurrency, startDate, stockTicker, dividend, //
            createdAt: new Date()
        });

        res.status(201).json({
            id: docRef.id,
            name, spot, description, volume, price, priceRelativeToCurrency, startDate, stockTicker, dividend
        });
    })
)

/** PUT EXISTING */
router.put('/deposits/:id', verifyToken, depositValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { id } = req.params;
        const { name, spot, description, value, currency, interest, startDate } = req.body;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'deposit') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.update({
            name, spot, description, value, currency, interest, startDate, //
            updatedAt: new Date()
        });

        res.json({ id, name, spot, description, value, currency, interest, startDate });
    })
);

router.put('/cryptos/:id', verifyToken, cryptoValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { id } = req.params;
        const { name, spot, description, quantity, priceAtStartDate, priceRelativeToCurrency, cryptoSymbol, stakingInterest, startDate } = req.body;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'crypto') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.update({
            name, spot, description, quantity, priceAtStartDate, priceRelativeToCurrency, cryptoSymbol, stakingInterest, startDate, //
            updatedAt: new Date()
        });

        res.json({ name, spot, description, quantity, priceAtStartDate, priceRelativeToCurrency, cryptoSymbol, stakingInterest, startDate });
    })
)

router.put('/bonds/:id', verifyToken, bondValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { id } = req.params;
        const { name, spot, description, volume, price, currency, bondTicker, interestsList, startDate, dueDate } = req.body;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'bond') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        let interestsListVar = interestsList;
        if (interestsList === '') {
            interestsListVar = [];
        }

        await docRef.update({
            name, spot, description, volume, price, currency, bondTicker,
            interestsList: interestsListVar,
            startDate, dueDate, //
            updatedAt: new Date()
        });

        res.json({
            name, spot, description, volume, price, currency, bondTicker,
            interestsList: interestsListVar,
            startDate, dueDate
        });
    })
)

router.put('/stocks/:id', verifyToken, stockValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { id } = req.params;
        const { name, spot, description, volume, price, priceRelativeToCurrency, startDate, stockTicker, dividend } = req.body;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'stock') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.update({
            name, spot, description, volume, price, priceRelativeToCurrency, startDate, stockTicker, dividend, //
            updatedAt: new Date()
        });

        res.json({ name, spot, description, volume, price, priceRelativeToCurrency, startDate, stockTicker, dividend });
    })
)

/** REMOVE EXISTING */
router.delete('/deposits/:id', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        const { id } = req.params;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'deposit') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.delete();

        res.json({ success: true, id });
    })
);

router.delete('/cryptos/:id', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        const { id } = req.params;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'crypto') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.delete();

        res.json({ success: true, id });
    })
)

router.delete('/bonds/:id', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        const { id } = req.params;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'bond') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.delete();

        res.json({ success: true, id });
    })
)

router.delete('/stocks/:id', verifyToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        const { id } = req.params;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'stock') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.delete();

        res.json({ success: true, id });
    })
)

export default router;

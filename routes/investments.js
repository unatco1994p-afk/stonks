import express from 'express';
import INVESTMENT_COLLECTION from '../config/db.js';
import { verifyToken } from '../config/auth.js';
import { getPrice } from '../services/investments/fetch-value.js';
import { body, validationResult } from 'express-validator';
import asyncHandler from '../config/async-error-handler.js';
import validateRequest from '../config/validate-request.js';

const validators = {
    name: body('name')
        .exists().withMessage('name is required')
        .isLength({ max: 128 }).withMessage('name length is max 128'),
    spot: body('spot')
        .exists().withMessage('spot is required')
        .isLength({ max: 128 }).withMessage('spot length is max 128'),
    description: body('description')
        .optional({ checkFalsy: true })
        .isLength({ max: 256 }).withMessage('description length is max 256'),
    value: body('value')
        .exists().withMessage('value is required')
        .isFloat({ min: 0.01 }).withMessage('value must be positive value')
        .toFloat(),
    currency: body('currency')
        .exists().withMessage('currency is required')
        .isIn(['USD', 'EUR', 'PLN']).withMessage('currency must be USD, EUR or PLN'),
    interest: body('interest')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0.01 }).withMessage('interest must be positive value')
        .toFloat()
}

const depositValidators = [
    validators.name,
    validators.spot,
    validators.description,
    validators.value,
    validators.currency,
    validators.interest
];

async function getInvestmentsList(userId, investmentType) {
    const snapshot = await INVESTMENT_COLLECTION
        .where('userId', '==', userId)
        .where('investmentType', '==', investmentType)
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

const router = express.Router();

router.get('/deposits/', verifyToken,
    asyncHandler(async (req, res) => { 
        const userId = req.user.uid;
        res.json(getInvestmentsList(userId, 'deposits'));
    })
);

router.post('/deposits/', verifyToken, depositValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { name, spot, description, value, currency, interest } = req.body;

        const docRef = await INVESTMENT_COLLECTION.add({
            userId,
            investmentType: 'deposits',
            name,
            spot,
            description,
            value,
            currency,
            interest,
            createdAt: new Date()
        });

        res.status(201).json({ id: docRef.id, name, value });
    })
);

router.put('/deposits/:id', verifyToken, depositValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { id } = req.params;
        const { name, spot, description, value, currency, interest } = req.body;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'deposits') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.update({            
            name,
            spot,
            description,
            value,
            currency,
            interest, 
            updatedAt: new Date() 
        });

        res.json({ id, name, spot, description, value, currency, interest });
    })
);

router.delete('/deposits/:id', verifyToken, 
    asyncHandler(async (req, res) => {
        const userId = req.user.uid;
        const { id } = req.params;

        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId || doc.data().investmentType !== 'deposits') {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.delete();

        res.json({ success: true, id });
    })
);



/*
router.post('/', verifyToken, 
    async (req, res) => {
    const userId = req.user.uid;
    const { name, value } = req.body;

    try {
        const docRef = await INVESTMENT_COLLECTION.add({
            userId,
            name,
            value,
            createdAt: new Date()
        });

        res.status(201).json({ id: docRef.id, name, value });
    } catch (err) {
        console.error("Firestore insert error:", err);
        res.status(500).json({ error: "Failed to create item" });
    }
});

router.get("/", verifyToken, async (req, res) => {
    const userId = req.user.uid;

    try {
        const snapshot = await INVESTMENT_COLLECTION.where("userId", "==", userId).get();

        const btcPrice = await getPrice("bitcoin", "usd");
        console.log('fetched from api' + btcPrice);

        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            valueInUSD: btcPrice * doc.data().value
        }));

        res.json(items);
    } catch (err) {
        console.error("Firestore fetch error:", err);
        res.status(500).json({ error: "Failed to fetch items" });
    }
});

router.put("/:id", verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const { id } = req.params;
    const { name, value } = req.body;

    try {
        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId) {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.update({ name, value, updatedAt: new Date() });

        res.json({ id, name, value });
    } catch (err) {
        console.error("Firestore update error:", err);
        res.status(500).json({ error: "Failed to update item" });
    }
});

router.delete("/:id", verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const { id } = req.params;

    try {
        const docRef = INVESTMENT_COLLECTION.doc(id);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().userId !== userId) {
            return res.status(404).json({ error: "Item not found or not yours" });
        }

        await docRef.delete();

        res.json({ success: true, id });
    } catch (err) {
        console.error("Firestore delete error:", err);
        res.status(500).json({ error: "Failed to delete item" });
    }
});
*/


export default router;

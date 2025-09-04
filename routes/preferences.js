import express from 'express';
import db, { USERS_COLLECTION } from '../config/db.js';
import { verifyToken } from '../config/auth.js';
import { body } from 'express-validator';
import asyncHandler from '../config/async-error-handler.js';
import validateRequest from '../config/validate-request.js';

const preferencesValidators = [
    body('showDesktop')
        .exists().withMessage('showDesktop is required')
        .isBoolean().withMessage('showDesktop must be true/false')
        .toBoolean(),
    body('playMenuMusic')
        .exists().withMessage('playMenuMusic is required')
        .isBoolean().withMessage('playMenuMusic must be true/false')
        .toBoolean(),
    body('defaultCurrency')
        .exists().withMessage('defaultCurrency is required')
        .isIn(['USD', 'EUR', 'PLN']).withMessage('defaultCurrency must be USD, EUR or PLN'),
];

const router = express.Router();

router.get('/', verifyToken,
    asyncHandler( async (req, res) => {
        const userId = req.user.uid;
        
        const snapshot = await USERS_COLLECTION
            .where('id', '==', userId)
            .limit(1)
            .get();

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        const preferences = userData.preferences ?? {};

        res.json({
            showDesktop: preferences.showDesktop ?? false,
            playMenuMusic: preferences.playMenuMusic ?? false,
            defaultCurrency: preferences.defaultCurrency ?? 'PLN',
        });
    })
);

router.put('/', verifyToken, preferencesValidators,
    asyncHandler(async (req, res) => {
        validateRequest(req);

        const userId = req.user.uid;
        const { showDesktop, playMenuMusic, defaultCurrency } = req.body;


        const docRef = USERS_COLLECTION.doc(userId);

        await docRef.update({
            'preferences.showDesktop': showDesktop,
            'preferences.playMenuMusic': playMenuMusic,
            'preferences.defaultCurrency': defaultCurrency
        });

        res.json({ showDesktop, playMenuMusic, defaultCurrency });
    })
);

export default router;

import express from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../config/auth.js';
import asyncHandler from '../config/async-error-handler.js';

const validators = {
    optional: {
        title: body('title')
            .optional({ checkFalsy: true })
            .isLength({ max: 256 }).withMessage('title length is max 256'),
        author: body('author')
            .optional({ checkFalsy: true })
            .isLength({ max: 256 }).withMessage('author length is max 256'),
        publishingHouse: body('publishingHouse')
            .optional({ checkFalsy: true })
            .isLength({ max: 256 }).withMessage('publishingHouse length is max 256'),
        language: body('language')
            .optional({ checkFalsy: true })
            .isLength({ max: 64 }).withMessage('language length is max 64'),
        releaseDate: body('releaseDate')
            .optional({ checkFalsy: true })
            .isISO8601().withMessage('releaseDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
            .toDate(),
        pages: body('pages')
            .optional({ checkFalsy: true })
            .isInt().withMessage('pages must be integer')
            .toInt(),
        additionalInfo: body('additionalInfo')
            .optional({ checkFalsy: true })
            .isLength({ max: 2048 }).withMessage('additionalInfo length is max 2048'),
        completionDate: body('completionDate')
            .optional({ checkFalsy: true })
            .isISO8601().withMessage('completionDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
            .toDate(),
        group: body('group')
            .optional({ checkFalsy: true })
            .isLength({ max: 256 }).withMessage('group length is max 256'),
        category: body('category')
            .optional({ checkFalsy: true })
            .isLength({ max: 256 }).withMessage('category length is max 256'),
        genre: body('genre')
            .optional({ checkFalsy: true })
            .isLength({ max: 256 }).withMessage('genre length is max 256'),   
    },
    required: {
        title: body('title')
            .exists().withMessage('title is required')
            .isLength({ max: 256 }).withMessage('title length is max 256'),
        author: body('author')
            .exists().withMessage('author is required')
            .isLength({ max: 256 }).withMessage('author length is max 256'),
        publishingHouse: body('publishingHouse')
            .exists().withMessage('publishingHouse is required')
            .isLength({ max: 256 }).withMessage('publishingHouse length is max 256'),
        language: body('language')
            .exists().withMessage('language is required')
            .isLength({ max: 64 }).withMessage('language length is max 64'),
        releaseDate: body('releaseDate')
            .exists().withMessage('releaseDate is required')
            .isISO8601().withMessage('releaseDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
            .toDate(),
        pages: body('pages')
            .exists().withMessage('pages is required')
            .isInt().withMessage('pages must be integer')
            .toInt(),
        additionalInfo: body('additionalInfo')
            .exists().withMessage('additionalInfo is required')
            .isLength({ max: 2048 }).withMessage('additionalInfo length is max 2048'),
        completionDate: body('completionDate')
            .exists().withMessage('completionDate is required')
            .isISO8601().withMessage('completionDate must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
            .toDate(),
        group: body('group')
            .exists().withMessage('group is required')
            .isLength({ max: 256 }).withMessage('group length is max 256'),
        category: body('category')
            .exists().withMessage('category is required')
            .isLength({ max: 256 }).withMessage('category length is max 256'),
        genre: body('genre')
            .exists().withMessage('genre is required')
            .isLength({ max: 256 }).withMessage('genre length is max 256'),
    }
}

const router = express.Router();

router.get('/', verifyToken,
    asyncHandler(async (req, res) => {
        res.json({ success: true });
    })
);

export default router;

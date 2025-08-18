import express from 'express';
import db from '../config/db.js';
import { verifyToken } from '../config/auth.js';
import { getPrice } from '../services/investments/fetch-value.js';

const router = express.Router();
const itemsCollection = db.collection("testInvestments");

router.post('/', verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const { name, value } = req.body;

    try {
        const docRef = await itemsCollection.add({
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
        const snapshot = await itemsCollection.where("userId", "==", userId).get();

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
        const docRef = itemsCollection.doc(id);
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
        const docRef = itemsCollection.doc(id);
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



export default router;

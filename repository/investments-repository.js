import db, { INVESTMENT_COLLECTION, USERS_COLLECTIONS } from '../config/db.js';

export const DEPOSIT_TYPE = 'deposit';
export const CRYPTO_TYPE = 'crypto';
export const BOND_TYPE = 'bond';
export const STOCK_TYPE = 'stock';

export async function getInvestmentsList(userId, investmentType) {
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

export async function calculateCurrentValueForAllUsers() {
    const users = USERS_COLLECTION.get();
    users.forEach(userDoc => {
        const user = userDoc.data();

        // TODO: check only 'investment' users
        await calculateCurrentValue(user.id);
    });

}

export async function calculateCurrentValue(userId) {
        const all = await getInvestmentsList(userId, null);

        if (all.length === 0) {
            return;
        }

        const deposits = all.filter(inv => inv.investmentType === DEPOSIT_TYPE);
        const cryptos = all.filter(inv => inv.investmentType === CRYPTO_TYPE);
        const bonds = all.filter(inv => inv.investmentType === BOND_TYPE);
        const stocks = all.filter(inv => inv.investmentType === STOCK_TYPE);

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
}

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


// TODO: add separation between db and router
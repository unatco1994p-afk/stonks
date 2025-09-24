import { getAllCachedPrices } from './price-cache.js';
import { getInvestmentsList, DEPOSIT_TYPE, CRYPTO_TYPE, BOND_TYPE, STOCK_TYPE } from '../../repository/investments-repository.js';
import db, { INVESTMENT_AGGREGATE_COLLECTION, USERS_COLLECTION } from '../config/db.js';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export async function getTotalPortfolio(userId) {
    const allInvestments = await getInvestmentsList(userId, null);

    if (allInvestments.length === 0) {
        return null;
    }
   
    const cache = await getAllCachedPrices();

    const rateUsd = cache[`currency_USD`]?.value ?? 1;
    const rateEur = cache[`currency_EUR`]?.value ?? 1;

    const deposits = allInvestments.filter(inv => inv.investmentType === DEPOSIT_TYPE);
    const cryptos = allInvestments.filter(inv => inv.investmentType === CRYPTO_TYPE);
    const bonds = allInvestments.filter(inv => inv.investmentType === BOND_TYPE);
    const stocks = allInvestments.filter(inv => inv.investmentType === STOCK_TYPE);

    const convertToPln = (value, currency) => {
        if (!value) return 0;
        switch (currency) {
            case 'PLN': return value;
            case 'USD': return value * rateUsd;
            case 'EUR': return value * rateEur;
            default: return 0;
        }
    };

    const calculateTotals = (items, currencyField = 'currency') => {
        let totalPln = 0;
        items.forEach(item => {
            const valuePln = convertToPln(item.currentValue, item[currencyField]);
            totalPln += valuePln;
        });
        return {
            pln: totalPln,
            usd: rateUsd ? totalPln / rateUsd : 0,
            eur: rateEur ? totalPln / rateEur : 0,
        };
    };

    const depositsTotals = calculateTotals(deposits);
    const cryptoTotals = calculateTotals(cryptos);
    const bondsTotals = calculateTotals(bonds);
    const stocksTotals = calculateTotals(stocks, 'priceRelativeToCurrency');

    return {
        deposits: depositsTotals,
        crypto: cryptoTotals,
        bond: bondsTotals,
        stock: stocksTotals,
        total: {
            pln: depositsTotals.pln + cryptoTotals.pln + bondsTotals.pln + stocksTotals.pln,
            usd: depositsTotals.usd + cryptoTotals.usd + bondsTotals.usd + stocksTotals.usd,
            eur: depositsTotals.eur + cryptoTotals.eur + bondsTotals.eur + stocksTotals.eur,
        }
    };
}


async function runInvestmentAggregateTask() {
    const now = Date.now();
    console.log('Run investment aggregate task...');

    const users = USERS_COLLECTION.get();
    users.forEach(userDoc => {
        const user = userDoc.data();

        // TODO: check only 'investment' users
        const userPortfolio = await getTotalPortfolio(user.id);

        if (userPortfolio) {
            await INVESTMENT_AGGREGATE_COLLECTION.add({
                userId: user.id,
                calculatedAt: now,
                portfolio: userPortfolio, 
            })
        }
    });
}

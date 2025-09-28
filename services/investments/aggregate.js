import { getAllCachedPrices } from './price-cache.js';
import { getInvestmentsList, DEPOSIT_TYPE, CRYPTO_TYPE, BOND_TYPE, STOCK_TYPE } from '../../repository/investments-repository.js';
import db, { INVESTMENT_AGGREGATE_COLLECTION, USERS_COLLECTION } from '../../config/db.js';

export async function getTotalPortfolioVelocityPerHour(userId) {
    const snapshot = await INVESTMENT_AGGREGATE_COLLECTION
        .where("userId", "==", userId)
        .get();

    if (snapshot.empty) {
        return null;
    }

    // TODO: this will work slower and slower
    const docs = snapshot.docs
        .map(d => d.data())
        .sort((a, b) => new Date(b.calculatedAt) - new Date(a.calculatedAt));

    const latest = docs[0];

    // console.log('docs');
    // console.log(docs);

    // console.log('latest');
    // console.log(latest);

    // console.log('latest.calculatedAt');
    // console.log(latest.calculatedAt);   

    const latestTime = new Date(latest.calculatedAt).getTime();

    // znajdź pierwszy punkt starszy niż 24h
    const second = docs.find(d => {
        const time = new Date(d.calculatedAt).getTime();
        return (latestTime - time) >= 24 * 60 * 60 * 1000;
    });

    if (!second) {
        return null; // brak drugiego punktu starszego niż 24h
    }

    const secondTime = new Date(second.calculatedAt).getTime();
    const hoursDiff = (latestTime - secondTime) / (1000 * 60 * 60);

    const velocity = {};

    for (const group of Object.keys(latest.portfolio)) {
        velocity[group] = {};
        for (const currency of Object.keys(latest.portfolio[group])) {
            const delta =
                (latest.portfolio[group][currency] -
                    second.portfolio[group][currency]) /
                hoursDiff;
            velocity[group][currency] = delta;
        }
    }

    return velocity;
}

export async function getTotalPortfolioInitial(userId) {
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

    const calculateInitialDeposits = (items) => {
        let totalPln = 0;
        items.forEach(item => {
            const valuePln = convertToPln(item.value, item.currency);
            totalPln += valuePln;
        });
        return {
            pln: totalPln,
            usd: rateUsd ? totalPln / rateUsd : 0,
            eur: rateEur ? totalPln / rateEur : 0,
        }
    }

    const calculateInitialCryptos = (items) => {
        let totalPln = 0;
        items.forEach(item => {
            const valuePln = convertToPln(item.quantity * (item.priceAtStartDate ?? 0), 'PLN');
            totalPln += valuePln;
        });
        return {
            pln: totalPln,
            usd: rateUsd ? totalPln / rateUsd : 0,
            eur: rateEur ? totalPln / rateEur : 0,
        }
    }

    const calculateBondsInitial = (items) => {
        let totalPln = 0;
        items.forEach(item => {
            const valuePln = convertToPln(item.volume * item.price, item.currency);
            totalPln += valuePln;
        });
        return {
            pln: totalPln,
            usd: rateUsd ? totalPln / rateUsd : 0,
            eur: rateEur ? totalPln / rateEur : 0,
        }
    }

    const calculateStocksInitial = (items) => {
        let totalPln = 0;
        items.forEach(item => {
            const valuePln = convertToPln(item.volume * item.price, item.priceRelativeToCurrency);
            totalPln += valuePln;
        });
        return {
            pln: totalPln,
            usd: rateUsd ? totalPln / rateUsd : 0,
            eur: rateEur ? totalPln / rateEur : 0,
        }
    }

    const depositsInitial = calculateInitialDeposits(deposits);
    const cryptosInitial = calculateInitialCryptos(cryptos);
    const bondsInitial = calculateBondsInitial(bonds);
    const stocksInitial = calculateStocksInitial(stocks);

    return {
        deposits: depositsInitial,
        cryptos: cryptosInitial,
        bonds: bondsInitial,
        stocks: stocksInitial,
        total: {
            pln: depositsInitial.pln + cryptosInitial.pln + bondsInitial.pln + stocksInitial.pln,
            usd: depositsInitial.usd + cryptosInitial.usd + bondsInitial.usd + stocksInitial.usd,
            eur: depositsInitial.eur + cryptosInitial.eur + bondsInitial.eur + stocksInitial.eur,
        }
    };
}

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
            const valuePln = convertToPln(item.currentValue, currencyField === 'use:PLN' ? 'PLN' : item[currencyField]);
            totalPln += valuePln;
        });
        return {
            pln: totalPln,
            usd: rateUsd ? totalPln / rateUsd : 0,
            eur: rateEur ? totalPln / rateEur : 0,
        };
    };

    const depositsTotal = calculateTotals(deposits);
    const cryptosTotal = calculateTotals(cryptos, 'use:PLN');
    const bondsTotal = calculateTotals(bonds);
    const stocksTotal = calculateTotals(stocks, 'priceRelativeToCurrency');

    return {
        deposits: depositsTotal,
        cryptos: cryptosTotal,
        bonds: bondsTotal,
        stocks: stocksTotal,
        total: {
            pln: depositsTotal.pln + cryptosTotal.pln + bondsTotal.pln + stocksTotal.pln,
            usd: depositsTotal.usd + cryptosTotal.usd + bondsTotal.usd + stocksTotal.usd,
            eur: depositsTotal.eur + cryptosTotal.eur + bondsTotal.eur + stocksTotal.eur,
        }
    };
}


export async function runInvestmentAggregateTask() {
    const now = new Date();

    const snapshot = await USERS_COLLECTION.get();
    for (const userDoc of snapshot.docs) {
        const user = userDoc.data();

        // TODO: check only 'investment' users
        const userPortfolio = await getTotalPortfolio(userDoc.id);

        if (userPortfolio) {
            await INVESTMENT_AGGREGATE_COLLECTION.add({
                userId: userDoc.id,
                calculatedAt: now,
                portfolio: userPortfolio,
            })
        }
    }
}

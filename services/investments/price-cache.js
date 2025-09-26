import db, { PRICES_CACHE_COLLECTION } from '../../config/db.js';
import { fetchCryptoPrices, fetchStockPriceGPW, fetchCurrencyPrice } from './fetch-value.js';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

// Base currency: PLN

const RESOURCES = [
    { type: 'currency', name: 'USD' },
    { type: 'currency', name: 'EUR' },
    { type: 'crypto', name: 'BTC' },
    { type: 'crypto', name: 'ETH' },
    { type: 'crypto', name: 'USDT' },
    { type: 'crypto', name: 'XRP' },
    { type: 'crypto', name: 'BNB' },
    { type: 'crypto', name: 'SOL' },
    { type: 'crypto', name: 'USDC' },
    { type: 'crypto', name: 'STETH' },
    { type: 'crypto', name: 'DOGE' },
    { type: 'crypto', name: 'TRX' },
    { type: 'crypto', name: 'ADA' },
    { type: 'crypto', name: 'WSTETH' },
    { type: 'crypto', name: 'LINK' },
    { type: 'crypto', name: 'WBETH' },
    { type: 'crypto', name: 'WBTC' },
    { type: 'crypto', name: 'USDE' },
    { type: 'crypto', name: 'WEETH' },
    { type: 'crypto', name: 'HYPE' },
    { type: 'crypto', name: 'SUI' },
    { type: 'crypto', name: 'XLM' },
    { type: 'crypto', name: 'BCH' },
    { type: 'crypto', name: 'CRO' },
    { type: 'crypto', name: 'AVAX' },
    { type: 'crypto', name: 'HBAR' },
    { type: 'crypto', name: 'WETH' },
    { type: 'crypto', name: 'SHIB' },
    { type: 'crypto', name: 'UNI' },
    { type: 'crypto', name: 'DOT' },
    { type: 'crypto', name: 'XMR' },
    { type: 'crypto', name: 'AAVE' },
    { type: 'crypto', name: 'ETC' },
    { type: 'crypto', name: 'TLM' },
    { type: 'crypto', name: 'WAXP' },
    { type: 'gpwStock', name: 'KGH' },
    { type: 'gpwStock', name: 'NEU' },
    { type: 'gpwStock', name: 'DBC' },
    { type: 'gpwStock', name: 'ACG' },
    { type: 'gpwStock', name: 'PKO' },
    { type: 'gpwStock', name: 'GPW' },
    { type: 'gpwStock', name: 'DOM' },
    { type: 'gpwStock', name: 'ALE' },
    { type: 'gpwStock', name: 'FRO' },
    { type: 'gpwStock', name: 'PKN' },
    { type: 'gpwStock', name: 'ARL' },
    { type: 'gpwStock', name: 'etfsp500.pl' },
    { type: 'gpwStock', name: 'etfbm40tr.pl' },
    { type: 'gpwStock', name: 'etfbw20tr.pl' },
    { type: 'gpwStock', name: 'eunl.de' },
    { type: 'gpwStock', name: 'ibte.uk'},
    { type: 'gpwStock', name: 'eimi.uk' }

    // TODO: will be completed

];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateDocsBatch(updates) {
  if (updates.length === 0) return;
  const now = Date.now();

  // dzielimy na paczki po 500
  const chunks = [];
  for (let i = 0; i < updates.length; i += 500) {
    chunks.push(updates.slice(i, i + 500));
  }

  for (const [i, chunk] of chunks.entries()) {
    const batch = db.batch();
    for (const { type, name, value, currency } of chunk) {
      const docRef = PRICES_CACHE_COLLECTION.doc(`${type}_${name}`);
      batch.set(docRef, {
        type,
        name,
        price: { value, currency },
        lastCalculated: now,
      });
    }
    await batch.commit();
    console.log(`✅ saved to price cache ${i + 1}/${chunks.length} (${chunk.length} docs)`);
  }
}

export async function fetchInvestmentsPrices() {
    // TODO: generate RESOURCES based on investments

    // grupujemy po typie
    const cryptos = RESOURCES.filter(r => r.type === 'crypto');
    const currencies = RESOURCES.filter(r => r.type === 'currency');
    const gpwStocks = RESOURCES.filter(r => r.type === 'gpwStock');

    const updates = [];

    // === CRYPTO (batch fetch) ===
    if (cryptos.length > 0) {
        const symbols = cryptos.map(c => c.name);
        const prices = await fetchCryptoPrices(symbols, 'pln'); // { BTC: 123, ETH: 456, ... }

        for (const { name } of cryptos) {
            console.log(`➡️ [crypto:${name}] price...`);
            const value = prices[name.toUpperCase()] || 0;
            updates.push({ type: 'crypto', name, value, currency: 'PLN' });
        }
    }

    // === CURRENCIES (batch fetch) ===
    if (currencies.length > 0) {

        for (const { name } of currencies) {
            console.log(`➡️ [currency:${name}] price...`);
            const value = await fetchCurrencyPrice(name, 'PLN') || 0;
            updates.push({ type: 'currency', name, value, currency: 'PLN' });
        }
    }

    // === GPW STOCKS (po kolei, ze sleepem) ===
    for (const { name } of gpwStocks) {
        try {
            console.log(`➡️ [gpwStock:${name}] price...`);
            const value = await fetchStockPriceGPW(name);
            updates.push({ type: 'gpwStock', name, value, currency: 'PLN' });
            await sleep(70); // throttling API
        } catch (err) {
            console.error(`❌ [gpwStock:${name}] błąd:`, err);
        }
    }

    await updateDocsBatch(updates);
}

export async function getAllCachedPrices() {
    const snapshot = await PRICES_CACHE_COLLECTION.get();
    const cache = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        cache[doc.id] = {
            value: data.price?.value ?? 0,
            currency: data.price?.currency ?? 'PLN',
            lastCalculated: data.lastCalculated ?? 0,
        };
    });

    return cache; // np. { "crypto_BTC": {...}, "gpwStock_PKO": {...} }
}

export async function getCachedPrice(type, name) {
    const docRef = db.collection(PRICES_CACHE_COLLECTION).doc(`${type}_${name}`);
    const doc = await docRef.get();

    if (!doc.exists) {
        console.warn(`⚠️ Brak wpisu w cache: ${type}_${name}`);
        return null;
    }

    const data = doc.data();
    return {
        value: data.price?.value ?? 0,
        currency: data.price?.currency ?? 'PLN',
        lastCalculated: data.lastCalculated ?? 0,
    };
}

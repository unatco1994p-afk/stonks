import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coinMapPath = path.resolve(__dirname, '../../config/crypto.json');
const coinMap = JSON.parse(fs.readFileSync(coinMapPath, 'utf-8'));

console.log(coinMap);

// Batch pobierania wielu krypto
async function getPriceBatch(coinIds = [], currency = 'pln') {
    try {
        const idsParam = coinIds.join(','); // np. "bitcoin,ethereum"
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=${currency}`;

        return await new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        return reject(new Error(`HTTP error! status: ${res.statusCode}`));
                    }
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (err) {
                        reject(err);
                    }
                });
            }).on('error', reject);
        });
    } catch (err) {
        console.error('Error fetching prices:', err.message);
        return null;
    }
}

export async function fetchCryptoPrices(symbols, relativeToCurrency = 'pln') {
    const lowerSymbols = symbols.map(s => s.toLowerCase());
    const coins = coinMap.filter(c => lowerSymbols.includes(c.symbol.toLowerCase()));

    // Mapowanie symbol -> id (tylko dla znalezionych)
    const coinIds = coins.map(c => c.id);

    // Pobranie cen
    const prices = coinIds.length > 0
        ? await getPriceBatch(coinIds, relativeToCurrency.toLowerCase())
        : {};

    // Zbudowanie finalnego wyniku dla WSZYSTKICH wejściowych symboli
    const result = {};
    for (const symbol of symbols) {
        const coin = coinMap.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
        if (coin && prices[coin.id]) {
            result[symbol.toUpperCase()] = prices[coin.id][relativeToCurrency.toLowerCase()];
        } else {
            result[symbol.toUpperCase()] = null; // fallback dla brakujących
        }
    }

    return result;
}

/**
 * Pobiera bieżącą cenę akcji GPW ze Stooq
 * @param {string} stockTicker - ticker GPW, np. "PKN"
 * @returns {Promise<number|null>} - aktualna cena akcji lub null
 */
export async function fetchStockPriceGPW(stockTicker) {
    try {
        // Stooq używa małych liter dla tickerów GPW, dodajemy ".WA"
        const ticker = stockTicker.toLowerCase();
        const url = `https://stooq.pl/q/l/?s=${ticker}&f=sd2t2ohlcv&h&e=csv`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const text = await res.text();

        // Parsowanie CSV
        const lines = text.trim().split('\n');
        if (lines.length < 2) return null;

        const values = lines[1].split(',');
        const closingPrice = parseFloat(values[6]); // Zamkniecie w 7 kolumnie

        return closingPrice;
    } catch (err) {
        console.error('Error fetching stock price from Stooq:', err.message);
        return null;
    }
}

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

/**
 * Pobiera cenę kryptowaluty po CoinGecko ID i walucie
 * @param {string} coinId - np. "bitcoin"
 * @param {string} currency - np. "pln"
 * @returns {Promise<number|null>}
 */
async function getPrice(coinId = 'bitcoin', currency = 'usd') {
    try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;

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
                        resolve(json[coinId][currency]);
                    } catch (err) {
                        reject(err);
                    }
                });
            }).on('error', reject);
        });
    } catch (err) {
        console.error('Error fetching price:', err.message);
        return null;
    }
}

/**
 * Pobiera cenę kryptowaluty po tickerze i walucie
 * @param {string} cryptoSymbol - np. "BTC"
 * @param {string} relativeToCurrency - np. "PLN"
 * @returns {Promise<number|null>}
 */
export async function fetchCryptoPrice(cryptoSymbol, relativeToCurrency = 'pln') {
const symbol = cryptoSymbol.toLowerCase();
    const coin = coinMap.find(c => c.symbol.toLowerCase() === symbol);

    console.log(coin);

    if (!coin) {
        console.error(`Symbol ${symbol} not found in crypto.json`);
        return null;
    }

    const price = await getPrice(coin.id, relativeToCurrency.toLowerCase());
    return price;
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

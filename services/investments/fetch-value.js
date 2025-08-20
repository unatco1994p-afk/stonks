export async function getPrice(coin = "bitcoin", currency = "usd") {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=${currency}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data[coin][currency];
  } catch (err) {
    console.error("Error fetching price:", err.message);
    return null;
  }
}

// TODO: implement cache in db

export async function fetchCryptoPrice(cryptoSymbol, relativeToCurrency) {
  // TODO
}


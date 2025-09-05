import { z } from 'zod';

const depositSchema = z.object({
    value: z.number(),
    interest: z.number(),
    startDate: z.coerce.date(),
});

const cryptoSchema = z.object({
    quantity: z.number(),
    stakingInterest: z.number(),
    startDate: z.coerce.date(),
});

const bondSchema = z.object({
    volume: z.number().min(0, 'volume must be non-negative'),
    price: z.number().min(0, 'price must be non-negative'),
    interestsList: z.array(z.number()),
    startDate: z.coerce.date(),
    dueDate: z.coerce.date(),
});

export function calculateCurrentDepositValue(deposit) {
    return calculateDepositValueAtDate(deposit, new Date());
}

export function calculateDepositValueAtDate(deposit, targetDate) {
    // validate input
    const parsedDeposit = depositSchema.parse(deposit); 
    if (!(targetDate instanceof Date)) {
        throw new Error("targetDate must be a Date");
    }
    if (parsedDeposit.startDate >= targetDate) {
        throw new Error("startDate must be before targetDate");
    }

    const start = parsedDeposit.startDate;

    // full years
    let years = targetDate.getFullYear() - start.getFullYear();
    const anniversaryThisYear = new Date(start);
    anniversaryThisYear.setFullYear(start.getFullYear() + years);

    if (targetDate < anniversaryThisYear) {
        years -= 1;
    }

    // after full years
    const base = parsedDeposit.value * Math.pow(1 + parsedDeposit.interest / 100, years);

    // since last annual moment
    const lastAnniversary = new Date(start);
    lastAnniversary.setFullYear(start.getFullYear() + years);
    const nextAnniversary = new Date(start);
    nextAnniversary.setFullYear(start.getFullYear() + years + 1);

    const fractionOfYear = (targetDate - lastAnniversary) / (nextAnniversary - lastAnniversary);

    // proportional increase
    const additional = base * (parsedDeposit.interest / 100) * fractionOfYear;

    return base + additional;
}

export function calculateCurrentCryptoValue(crypto) {
    return calculateCryptoStakeValueAtDate(crypto, new Date());
}

export function calculateCryptoStakeValueAtDate(crypto, targetDate) {
    // validate input
    const parsedCrypto = cryptoSchema.parse(crypto);
    if (!(targetDate instanceof Date)) {
        throw new Error("targetDate must be a Date");
    }
    if (parsedCrypto.startDate >= targetDate) {
        throw new Error("startDate must be before targetDate");
    }

    const tMilliseconds = targetDate.getTime() - parsedCrypto.startDate.getTime();
    const tYears = tMilliseconds / (1000 * 60 * 60 * 24 * 365.25);

    const r = parsedCrypto.stakingInterest / 100;

    return parsedCrypto.quantity * Math.exp(r * tYears);
}

function validateBond(bond) {
    const parsedBond = bondSchema.parse(bond);

    if (parsedBond.startDate > parsedBond.dueDate) {
        throw new Error('startDate must be before dueDate');
    }

    // check min interestsList number of elements
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    const totalYears = Math.floor((parsedBond.dueDate - parsedBond.startDate) / yearMs);

    return parsedBond;
}

export function calculateCurrentBondValue(bond) {
    return calculateBondValueAtDate(bond, new Date());
}

export function calculateBondValueAtDate(bond, targetDate) {
    const parsedBond = validateBond(bond);

    if (!(targetDate instanceof Date)) {
        throw new Error('targetDate must be a Date');
    }
    if (targetDate < parsedBond.startDate) {
        throw new Error('targetDate cannot be before startDate');
    }

    const startTime = parsedBond.startDate.getTime();
    const dueTime = parsedBond.dueDate.getTime();
    const targetTime = Math.min(targetDate.getTime(), dueTime);

    const yearMs = 365 * 24 * 60 * 60 * 1000;
    let value = parsedBond.volume * parsedBond.price;

    const interests = Array.isArray(parsedBond.interestsList) ? parsedBond.interestsList : [];
    const elapsedYears = Math.floor((targetTime - startTime) / yearMs);

    // pomocnicza funkcja do pobierania oprocentowania z fallbackiem
    const getInterest = (yearIndex) => {
        if (yearIndex < 0) return 0;
        if (yearIndex < interests.length && typeof interests[yearIndex] === 'number') {
            return interests[yearIndex];
        }
        return getInterest(yearIndex - 1); // fallback do poprzedniego roku
    };

    // naliczanie całych lat
    for (let i = 0; i < elapsedYears; i++) {
        const interest = getInterest(i) / 100;
        value *= 1 + interest;
    }

    // proporcjonalny wzrost w bieżącym roku
    const interest = getInterest(elapsedYears) / 100;
    const yearStartTime = startTime + elapsedYears * yearMs;
    const elapsedMs = targetTime - yearStartTime;
    value += value * interest * (elapsedMs / yearMs);

    return value;
}

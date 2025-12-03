import fetch from "node-fetch";
import { FX_BASE, FX_SYMBOLS } from "./config";

export interface FxRates {
  usdPerDkk: number;
  eurPerDkk: number;
  gbpPerDkk: number;
}

export async function fetchHistoricalDkkRates(endDate: Date): Promise<FxRates> {
  const dateStr = endDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const symbolsParam = FX_SYMBOLS.join(",");
  const url = `https://api.exchangerate.host/${dateStr}?base=${FX_BASE}&symbols=${symbolsParam}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`FX fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  return {
    usdPerDkk: data.rates.USD,
    eurPerDkk: data.rates.EUR,
    gbpPerDkk: data.rates.GBP,
  };
}

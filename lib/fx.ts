import type { FxRates } from "@/lib/types";

const FX_URL = "https://api.frankfurter.app/latest?from=JPY&to=KRW,USD";

// Sample values used only when frankfurter.app cannot be reached.
const FALLBACK_RATES = { KRW: 9.05, USD: 0.0067 };

interface FrankfurterResponse {
  date?: string;
  rates?: {
    KRW?: number;
    USD?: number;
  };
}

export async function getFxRates(): Promise<FxRates> {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(FX_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = (await response.json()) as FrankfurterResponse;
    const krw = Number(payload.rates?.KRW);
    const usd = Number(payload.rates?.USD);
    if (!Number.isFinite(krw) || krw <= 0 || !Number.isFinite(usd) || usd <= 0) {
      throw new Error("Invalid FX payload");
    }

    return {
      base: "JPY",
      rates: { KRW: krw, USD: usd },
      date: payload.date || fetchedAt.slice(0, 10),
      source: "frankfurter",
      basis: "live",
      fetchedAt,
      sourceUrl: FX_URL
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      base: "JPY",
      rates: FALLBACK_RATES,
      date: fetchedAt.slice(0, 10),
      source: "fallback",
      basis: "fallback",
      fetchedAt,
      sourceUrl: FX_URL,
      note: `frankfurter.app unavailable (${message}); sample fallback rates used. Not a transaction rate.`
    };
  }
}

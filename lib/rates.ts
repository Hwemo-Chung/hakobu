import rateData from "../data/jp_post_rates.json";

import type { Direction, FxRates, RateQuote } from "@/lib/types";

const EASYPOST_URL = "https://api.easypost.com/v2/shipments";

interface PostalRow {
  maxKg: number;
  price: number;
  etaMin: number;
  etaMax: number;
}

interface PostalTable {
  carrier: string;
  service: string;
  currency: "JPY" | "KRW";
  effectiveFrom: string;
  verified: boolean;
  sourceUrl: string;
  note: string;
  rows: PostalRow[];
}

interface PostalFile {
  label: string;
  effectiveFrom: string;
  verified: boolean;
  sourceUrl: string;
  note: string;
  tables: Record<Direction, PostalTable>;
}

interface EasyPostRate {
  id?: string;
  carrier?: string;
  service?: string;
  rate?: string;
  currency?: string;
  delivery_days?: number | null;
  est_delivery_days?: number | null;
}

interface EasyPostResponse {
  rates?: EasyPostRate[];
  error?: { message?: string } | string;
}

export interface CarrierRateResult {
  quotes: RateQuote[];
  mode: "live" | "mock";
  note: string;
}

const postalFile = rateData as unknown as PostalFile;

function pricePair(
  amount: number,
  currency: string,
  fx: FxRates
): { jpy: number; krw: number } | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const unit = currency.toUpperCase();

  if (unit === "JPY") {
    const jpy = Math.round(amount);
    return { jpy, krw: Math.round(jpy * fx.rates.KRW) };
  }
  if (unit === "KRW") {
    const krw = Math.round(amount);
    return { jpy: Math.round(krw / fx.rates.KRW), krw };
  }
  if (unit === "USD") {
    const jpy = Math.round(amount / fx.rates.USD);
    return { jpy, krw: Math.round(jpy * fx.rates.KRW) };
  }
  return null;
}

function mockRates(
  weightKg: number,
  fx: FxRates,
  reason: string
): RateQuote[] {
  const fetchedAt = new Date().toISOString();
  const baseUsd = 18 + weightKg * 13;
  const templates = [
    {
      carrier: "DHL",
      service: "Express Worldwide",
      multiplier: 1.22,
      etaMin: 2,
      etaMax: 4
    },
    {
      carrier: "FedEx",
      service: "International Priority",
      multiplier: 1.08,
      etaMin: 3,
      etaMax: 5
    },
    {
      carrier: "UPS",
      service: "Worldwide Saver",
      multiplier: 0.95,
      etaMin: 4,
      etaMax: 7
    }
  ];

  return templates.flatMap((template) => {
    const usd = Math.round(baseUsd * template.multiplier * 100) / 100;
    const prices = pricePair(usd, "USD", fx);
    if (!prices) return [];

    return [
      {
        id: `mock-${template.carrier.toLowerCase()}`,
        carrier: template.carrier,
        service: `${template.service} (mock)`,
        priceJpy: prices.jpy,
        priceKrw: prices.krw,
        priceOriginal: usd,
        currency: "USD",
        etaDays: { min: template.etaMin, max: template.etaMax },
        basis: "mock",
        source: "EasyPost mock — test mode",
        sourceUrl: "https://www.easypost.com/docs/api",
        fetchedAt,
        note: `${reason} Deterministic demo rate, not a quote.`
      }
    ];
  });
}

function addressPayload(direction: Direction, address: string) {
  const toKorea = direction === "JP->KR";
  const toAddress = {
    name: "Hakobu Test Recipient",
    street1: address.trim().slice(0, 140) || (toKorea ? "Teheran-ro 45" : "Marunouchi 3-1-1"),
    city: toKorea ? "Seoul" : "Tokyo",
    state: toKorea ? "Seoul" : "Tokyo",
    zip: toKorea ? "06132" : "100-0005",
    country: toKorea ? "KR" : "JP"
  };
  const fromAddress = {
    name: "Hakobu Demo Origin",
    street1: toKorea ? "Marunouchi 3-1-1" : "Teheran-ro 45",
    city: toKorea ? "Tokyo" : "Seoul",
    state: toKorea ? "Tokyo" : "Seoul",
    zip: toKorea ? "100-0005" : "06132",
    country: toKorea ? "JP" : "KR"
  };
  return { toAddress, fromAddress, toKorea };
}

export async function getCarrierRates(args: {
  direction: Direction;
  weightKg: number;
  address: string;
  declaredValueJpy: number;
  fx: FxRates;
}): Promise<CarrierRateResult> {
  const apiKey = process.env.EASYPOST_API_KEY?.trim();
  const fetchedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      quotes: mockRates(args.weightKg, args.fx, "EASYPOST_API_KEY is not set."),
      mode: "mock",
      note: "EASYPOST_API_KEY is not set; deterministic mock carrier rates shown."
    };
  }

  try {
    const { toAddress, fromAddress, toKorea } = addressPayload(args.direction, args.address);
    const weightOz = Math.max(1, Math.round(args.weightKg * 35.274 * 100) / 100);
    const declaredUsd =
      Math.round(args.declaredValueJpy * args.fx.rates.USD * 100) / 100;

    const response = await fetch(EASYPOST_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shipment: {
          to_address: toAddress,
          from_address: fromAddress,
          parcel: {
            length: 12,
            width: 9,
            height: 4,
            weight: weightOz
          },
          customs_info: {
            contents_type: "merchandise",
            customs_certify: true,
            customs_signer: "Hakobu Demo",
            customs_items: [
              {
                description: "Synthetic demo shipment",
                quantity: 1,
                weight: weightOz,
                value: Math.max(1, declaredUsd),
                origin_country: toKorea ? "JP" : "KR"
              }
            ]
          }
        }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });

    const payload = (await response.json().catch(() => ({}))) as EasyPostResponse;
    if (!response.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : payload.error?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    const quotes = (payload.rates || []).flatMap((rate) => {
      const amount = Number(rate.rate);
      const currency = (rate.currency || "USD").toUpperCase();
      const prices = pricePair(amount, currency, args.fx);
      if (!prices || !rate.carrier || !rate.service) return [];

      const days = Number(rate.est_delivery_days ?? rate.delivery_days);
      const etaDays =
        Number.isFinite(days) && days > 0
          ? { min: days, max: days }
          : null;

      return [
        {
          id: `live-${rate.id || `${rate.carrier}-${rate.service}`}`,
          carrier: rate.carrier,
          service: rate.service,
          priceJpy: prices.jpy,
          priceKrw: prices.krw,
          priceOriginal: amount,
          currency,
          etaDays,
          basis: "live" as const,
          source: "EasyPost test API",
          sourceUrl: "https://www.easypost.com/docs/api",
          fetchedAt,
          note: "EasyPost test-mode API rate. Not purchasable; surcharges may differ."
        }
      ];
    });

    if (quotes.length === 0) {
      throw new Error("EasyPost returned no usable rates");
    }

    return {
      quotes,
      mode: "live",
      note: "Courier rows are EasyPost test-mode API responses, not purchasable quotes."
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      quotes: mockRates(
        args.weightKg,
        args.fx,
        `EasyPost request failed (${message}).`
      ),
      mode: "mock",
      note: `EasyPost unavailable (${message}); deterministic mock carrier rates shown.`
    };
  }
}

export function getPostalRate(
  direction: Direction,
  weightKg: number,
  fx: FxRates
): RateQuote | null {
  const table = postalFile.tables[direction];
  if (!table || table.rows.length === 0) return null;

  const row =
    table.rows.find((candidate) => weightKg <= candidate.maxKg) ||
    table.rows[table.rows.length - 1];
  const prices = pricePair(row.price, table.currency, fx);
  if (!prices) return null;

  const fetchedAt = new Date().toISOString();
  return {
    id: `table-${direction}-ems`,
    carrier: table.carrier,
    service: table.service,
    priceJpy: prices.jpy,
    priceKrw: prices.krw,
    priceOriginal: row.price,
    currency: table.currency,
    etaDays: { min: row.etaMin, max: row.etaMax },
    basis: "table",
    source: `${table.carrier} EMS — ${postalFile.label}`,
    sourceUrl: table.sourceUrl,
    fetchedAt,
    effectiveFrom: table.effectiveFrom,
    verified: false,
    note: `${postalFile.label}. Table value, not live. Sample rate; verify before use (verified: false).`
  };
}

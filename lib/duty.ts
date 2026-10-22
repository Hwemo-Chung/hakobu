import type {
  Direction,
  DutyEstimate,
  FxRates,
  HSCandidate,
  ItemInput
} from "@/lib/types";

const KR_SOURCE = "https://www.customs.go.kr/english/main.do";
const JP_SOURCE = "https://www.customs.go.jp/english/summary/passenger.htm";
const CONSUMPTION_TAX_PERCENT = 10;

function round(value: number): number {
  return Math.round(value);
}

function dutyRateFor(hsCandidates: HSCandidate[]): number {
  const code = (hsCandidates[0]?.code || "").replace(/\D/g, "");

  if (code.startsWith("8517") || code.startsWith("8471") || code.startsWith("3004")) {
    return 0;
  }
  if (code.startsWith("6109") || code.startsWith("6205")) {
    return 13;
  }
  if (code.startsWith("6911") || code.startsWith("6912")) {
    return 8;
  }
  if (code.startsWith("3304")) {
    return 8;
  }
  if (code.startsWith("1806") || code.startsWith("2106")) {
    return 8;
  }
  return 8;
}

export function estimateDuty(args: {
  direction: Direction;
  items: ItemInput[];
  fx: FxRates;
  hsCandidates: HSCandidate[];
}): DutyEstimate {
  const declaredValueJpy = round(
    args.items.reduce((total, item) => total + Math.max(0, item.valueJpy), 0)
  );
  const declaredValueKrw = round(declaredValueJpy * args.fx.rates.KRW);
  const declaredValueUsd = Math.round(declaredValueJpy * args.fx.rates.USD * 100) / 100;
  const dutyRatePercent = dutyRateFor(args.hsCandidates);

  const isKoreaDestination = args.direction === "JP->KR";
  const threshold = isKoreaDestination
    ? {
        label: "Korea personal-use de minimis (sample USD 150 threshold)",
        amount: 150,
        currency: "USD" as const,
        applied: declaredValueUsd <= 150,
        sourceUrl: KR_SOURCE
      }
    : {
        label: "Japan duty-free allowance (sample ¥10,000 threshold)",
        amount: 10000,
        currency: "JPY" as const,
        applied: declaredValueJpy <= 10000,
        sourceUrl: JP_SOURCE
      };

  const dutyJpy = threshold.applied
    ? 0
    : round((declaredValueJpy * dutyRatePercent) / 100);
  const taxJpy = threshold.applied
    ? 0
    : round(((declaredValueJpy + dutyJpy) * CONSUMPTION_TAX_PERCENT) / 100);
  const totalJpy = dutyJpy + taxJpy;

  return {
    declaredValueJpy,
    declaredValueKrw,
    declaredValueUsd,
    dutyRatePercent,
    dutyJpy,
    taxJpy,
    totalJpy,
    totalKrw: round(totalJpy * args.fx.rates.KRW),
    threshold,
    assumptions: [
      "Declared value is the sum of sender-provided item values in JPY, not a customs valuation.",
      `FX reference from ${args.fx.source} (${args.fx.date}); not a transaction rate.`,
      isKoreaDestination
        ? "Threshold modeled at USD 150 for personal-use goods; eligibility varies by category and buyer."
        : "Allowance modeled at ¥10,000; some categories are excluded and eligibility varies.",
      `Duty rate modeled at ${dutyRatePercent}% from the first HS candidate; actual classification may differ.`,
      "International freight, insurance, and carrier fees are not included.",
      "The simplified threshold rule models zero duty and tax below the threshold."
    ],
    disclaimer: "Estimate only — not a customs assessment or legal advice.",
    sourceUrl: threshold.sourceUrl
  };
}

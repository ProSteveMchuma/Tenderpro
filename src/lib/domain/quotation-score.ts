export type QuotationScoreInput = {
  supplierId: string;
  supplierName: string;
  price: string;
  deliveryDays: number | null;
  warrantyMonths: number | null;
  paymentTermsDays: number | null;
  technicalCompliant: boolean;
  supplierRating: number | null;
  complianceScore: number | null;
};

export type ScoreWeights = {
  price: number;
  compliance: number;
  delivery: number;
  warranty: number;
  paymentTerms: number;
  technical: number;
  supplierRating: number;
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  price: 25,
  compliance: 20,
  delivery: 15,
  warranty: 10,
  paymentTerms: 10,
  technical: 10,
  supplierRating: 10,
};

export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
  const total =
    weights.price +
    weights.compliance +
    weights.delivery +
    weights.warranty +
    weights.paymentTerms +
    weights.technical +
    weights.supplierRating;
  if (total <= 0) return DEFAULT_SCORE_WEIGHTS;
  const scale = 100 / total;
  return {
    price: weights.price * scale,
    compliance: weights.compliance * scale,
    delivery: weights.delivery * scale,
    warranty: weights.warranty * scale,
    paymentTerms: weights.paymentTerms * scale,
    technical: weights.technical * scale,
    supplierRating: weights.supplierRating * scale,
  };
}

function minMaxScore(value: number, min: number, max: number, invert = false): number {
  if (max === min) return 100;
  const raw = ((value - min) / (max - min)) * 100;
  const bounded = Math.max(0, Math.min(100, raw));
  return invert ? 100 - bounded : bounded;
}

export type ScoredQuotation = QuotationScoreInput & {
  totalScore: number;
  breakdown: Record<keyof ScoreWeights, number>;
  reasons: string[];
};

export function scoreQuotations(
  quotations: QuotationScoreInput[],
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): ScoredQuotation[] {
  if (quotations.length === 0) return [];
  const normalized = normalizeWeights(weights);
  const prices = quotations.map((item) => Number(item.price));
  const deliveries = quotations.map((item) => item.deliveryDays ?? 30);
  const warranties = quotations.map((item) => item.warrantyMonths ?? 0);
  const terms = quotations.map((item) => item.paymentTermsDays ?? 0);

  return quotations
    .map((item) => {
      const breakdown = {
        price: minMaxScore(Number(item.price), Math.min(...prices), Math.max(...prices), true),
        compliance: Math.max(0, Math.min(100, item.complianceScore ?? 50)),
        delivery: minMaxScore(item.deliveryDays ?? 30, Math.min(...deliveries), Math.max(...deliveries), true),
        warranty: minMaxScore(item.warrantyMonths ?? 0, Math.min(...warranties), Math.max(...warranties)),
        paymentTerms: minMaxScore(item.paymentTermsDays ?? 0, Math.min(...terms), Math.max(...terms)),
        technical: item.technicalCompliant ? 100 : 0,
        supplierRating: Math.max(0, Math.min(100, ((item.supplierRating ?? 3) / 5) * 100)),
      };
      const totalScore =
        (breakdown.price * normalized.price +
          breakdown.compliance * normalized.compliance +
          breakdown.delivery * normalized.delivery +
          breakdown.warranty * normalized.warranty +
          breakdown.paymentTerms * normalized.paymentTerms +
          breakdown.technical * normalized.technical +
          breakdown.supplierRating * normalized.supplierRating) /
        100;
      const reasons: string[] = [];
      if (breakdown.technical === 0) reasons.push("Failed technical compliance");
      if (breakdown.price >= 80) reasons.push("Competitive price");
      if (breakdown.delivery >= 80) reasons.push("Faster delivery");
      if (breakdown.warranty >= 80) reasons.push("Stronger warranty");
      if (breakdown.compliance >= 80) reasons.push("High compliance score");
      if (breakdown.supplierRating >= 80) reasons.push("Strong supplier rating");
      return { ...item, totalScore: Math.round(totalScore * 10) / 10, breakdown, reasons };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

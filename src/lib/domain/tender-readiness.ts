import { REQUIREMENT_CATEGORIES, REQUIREMENT_STATUSES } from "@/lib/constants";

export type RequirementCategory = (typeof REQUIREMENT_CATEGORIES)[number];
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export type ReadinessRequirement = {
  category: RequirementCategory | string;
  mandatory: boolean;
  status: RequirementStatus | string;
};

export type CategoryScore = {
  category: string;
  complete: number;
  total: number;
  percent: number;
};

export type TenderReadiness = {
  percent: number;
  mandatoryComplete: number;
  mandatoryTotal: number;
  categories: CategoryScore[];
  highDisqualificationRisk: boolean;
  missingMandatory: ReadinessRequirement[];
  warning: string | null;
};

const COMPLETE_STATUSES = new Set(["complete", "not_applicable"]);

export function isRequirementSatisfied(status: string): boolean {
  return COMPLETE_STATUSES.has(status);
}

export function calculateTenderReadiness(requirements: ReadinessRequirement[]): TenderReadiness {
  const applicable = requirements.filter((item) => item.status !== "not_applicable");
  const total = applicable.length;
  const complete = applicable.filter((item) => isRequirementSatisfied(item.status)).length;
  const percent = total === 0 ? 0 : Math.round((complete / total) * 100);

  const mandatory = applicable.filter((item) => item.mandatory);
  const missingMandatory = mandatory.filter((item) => !isRequirementSatisfied(item.status));
  const highDisqualificationRisk = missingMandatory.length > 0;

  const categories = REQUIREMENT_CATEGORIES.map((category) => {
    const items = applicable.filter((item) => item.category === category);
    const catComplete = items.filter((item) => isRequirementSatisfied(item.status)).length;
    return {
      category,
      complete: catComplete,
      total: items.length,
      percent: items.length === 0 ? 0 : Math.round((catComplete / items.length) * 100),
    };
  }).filter((item) => item.total > 0);

  return {
    percent,
    mandatoryComplete: mandatory.length - missingMandatory.length,
    mandatoryTotal: mandatory.length,
    categories,
    highDisqualificationRisk,
    missingMandatory,
    warning: highDisqualificationRisk
      ? "HIGH DISQUALIFICATION RISK"
      : null,
  };
}

export type VaultDocument = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  issueDate?: string | null;
  expiryDate?: string | null;
  coverageYear?: number | null;
};

export type MatchResult = {
  status: RequirementStatus;
  evidenceDocumentId: string | null;
  reason: string;
  confidence: "confident" | "review_required";
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function yearsCovered(documents: VaultDocument[]): number[] {
  const years = new Set<number>();
  for (const doc of documents) {
    if (doc.coverageYear) years.add(doc.coverageYear);
    const match = doc.name.match(/(20\d{2})/g);
    match?.forEach((year) => years.add(Number(year)));
  }
  return [...years].sort();
}

export function matchRequirementToVault(
  requirementText: string,
  documents: VaultDocument[],
  options?: { now?: Date; tenderValidityDate?: string | null },
): MatchResult {
  const text = normalize(requirementText);
  const now = options?.now ?? new Date();

  if (!text) {
    return {
      status: "review_required",
      evidenceDocumentId: null,
      reason: "Requirement text is empty.",
      confidence: "review_required",
    };
  }

  const taxCompliance =
    text.includes("tax compliance") || text.includes("tcc") || text.includes("kra compliance");
  const audited = text.includes("audited") && (text.includes("account") || text.includes("financial"));
  const manufacturer = text.includes("manufacturer authorization") || text.includes("manufacturer authorisation");
  const businessPermit = text.includes("business permit") || text.includes("single business");
  const pin = text.includes("pin certificate") || text.includes("kra pin");
  const cr12 = text.includes("cr12") || text.includes("cr 12");

  const findBy = (predicate: (doc: VaultDocument) => boolean) => documents.find(predicate);

  if (taxCompliance) {
    const doc = findBy(
      (item) =>
        normalize(item.name).includes("tax compliance") ||
        item.tags.some((tag) => normalize(tag).includes("tax compliance")) ||
        item.category === "tax",
    );
    if (!doc) {
      return {
        status: "missing",
        evidenceDocumentId: null,
        reason: "No Tax Compliance Certificate found in Company Vault.",
        confidence: "confident",
      };
    }
    if (doc.expiryDate && new Date(doc.expiryDate) < now) {
      return {
        status: "needs_update",
        evidenceDocumentId: doc.id,
        reason: "Tax Compliance Certificate in the vault has expired.",
        confidence: "confident",
      };
    }
    if (options?.tenderValidityDate && doc.expiryDate && new Date(doc.expiryDate) < new Date(options.tenderValidityDate)) {
      return {
        status: "expiring",
        evidenceDocumentId: doc.id,
        reason: "Certificate expires before the tender validity period.",
        confidence: "confident",
      };
    }
    return {
      status: "complete",
      evidenceDocumentId: doc.id,
      reason: "Valid Tax Compliance Certificate found in Company Vault.",
      confidence: "confident",
    };
  }

  if (audited) {
    const yearMatch = text.match(/last\s+(\d+)\s+years?/);
    const requiredYears = yearMatch ? Number(yearMatch[1]) : 3;
    const currentYear = now.getFullYear();
    const needed = Array.from({ length: requiredYears }, (_, index) => currentYear - requiredYears + index);
    const accounts = documents.filter(
      (doc) =>
        doc.category === "audited_accounts" ||
        normalize(doc.name).includes("audited"),
    );
    const covered = yearsCovered(accounts);
    const missingYears = needed.filter((year) => !covered.includes(year));
    if (missingYears.length === 0 && accounts.length > 0) {
      return {
        status: "complete",
        evidenceDocumentId: accounts[0]?.id ?? null,
        reason: `Audited accounts found for ${needed.join(", ")}.`,
        confidence: "confident",
      };
    }
    if (accounts.length === 0) {
      return {
        status: "missing",
        evidenceDocumentId: null,
        reason: `Audited accounts for the last ${requiredYears} years were not found.`,
        confidence: "confident",
      };
    }
    return {
      status: "missing",
      evidenceDocumentId: accounts[0]?.id ?? null,
      reason: `MISSING — ${missingYears.join(", ")} audited accounts`,
      confidence: "confident",
    };
  }

  if (manufacturer) {
    const doc = findBy(
      (item) =>
        item.category === "manufacturer_authorizations" ||
        normalize(item.name).includes("manufacturer"),
    );
    if (!doc) {
      return {
        status: "missing",
        evidenceDocumentId: null,
        reason: "Manufacturer Authorization Form is mandatory but missing.",
        confidence: "confident",
      };
    }
    return {
      status: "complete",
      evidenceDocumentId: doc.id,
      reason: "Manufacturer authorization found in Company Vault.",
      confidence: "confident",
    };
  }

  if (businessPermit) {
    const doc = findBy((item) => normalize(item.name).includes("business permit") || item.category === "licences");
    if (!doc) {
      return {
        status: "missing",
        evidenceDocumentId: null,
        reason: "Business permit not found in Company Vault.",
        confidence: "confident",
      };
    }
    if (doc.expiryDate && new Date(doc.expiryDate) < now) {
      return {
        status: "needs_update",
        evidenceDocumentId: doc.id,
        reason: "Business permit has expired.",
        confidence: "confident",
      };
    }
    return {
      status: "complete",
      evidenceDocumentId: doc.id,
      reason: "Valid business permit found.",
      confidence: "confident",
    };
  }

  if (pin) {
    const doc = findBy((item) => normalize(item.name).includes("pin") || item.category === "tax");
    return doc
      ? {
          status: "complete",
          evidenceDocumentId: doc.id,
          reason: "PIN certificate found in Company Vault.",
          confidence: "confident",
        }
      : {
          status: "missing",
          evidenceDocumentId: null,
          reason: "PIN certificate not found.",
          confidence: "confident",
        };
  }

  if (cr12) {
    const doc = findBy((item) => normalize(item.name).includes("cr12") || normalize(item.name).includes("cr 12"));
    return doc
      ? {
          status: "complete",
          evidenceDocumentId: doc.id,
          reason: "CR12 found in Company Vault.",
          confidence: "confident",
        }
      : {
          status: "missing",
          evidenceDocumentId: null,
          reason: "CR12 not found.",
          confidence: "confident",
        };
  }

  const fuzzy = documents.find((doc) => {
    const haystack = `${normalize(doc.name)} ${doc.tags.map(normalize).join(" ")}`;
    const tokens = text.split(" ").filter((token) => token.length > 4);
    return tokens.filter((token) => haystack.includes(token)).length >= 2;
  });

  if (fuzzy) {
    return {
      status: "review_required",
      evidenceDocumentId: fuzzy.id,
      reason: "A possible matching vault document was found and needs human review.",
      confidence: "review_required",
    };
  }

  return {
    status: "review_required",
    evidenceDocumentId: null,
    reason: "No confident vault match. Flagged for review.",
    confidence: "review_required",
  };
}

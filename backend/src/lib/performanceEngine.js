/**
 * SPMS Performance Rating Engine
 *
 * Implements the CSC MC No. 6 s. 2012 five-point rating scale
 * and the IPCRF computation model (Annex B).
 *
 * Rating scale (target-ratio based):
 *   5 = Outstanding     (≥130% of target)
 *   4 = Very Satisfactory (115–129%)
 *   3 = Satisfactory      (100–114%)
 *   2 = Unsatisfactory    (51–99%)
 *   1 = Poor               (≤50%)
 */

const ADJECTIVAL_MAP = [
  { min: 4.51, max: 5.00, label: 'OUTSTANDING',        value: 5 },
  { min: 3.51, max: 4.50, label: 'VERY_SATISFACTORY',  value: 4 },
  { min: 2.51, max: 3.50, label: 'SATISFACTORY',       value: 3 },
  { min: 1.51, max: 2.50, label: 'UNSATISFACTORY',     value: 2 },
  { min: 0.00, max: 1.50, label: 'POOR',               value: 1 },
];

/**
 * Convert target-percentage to a 1–5 rating.
 * @param {number} actualPercent - actual/target × 100
 * @returns {number} rating 1.00–5.00
 */
export function computeTargetRating(actualPercent) {
  if (actualPercent == null || isNaN(actualPercent)) return null;
  if (actualPercent >= 130) return 5;
  if (actualPercent >= 115) return 4;
  if (actualPercent >= 100) return 3;
  if (actualPercent >= 51)  return 2;
  return 1;
}

/**
 * Compute per-target actualPercent from targetQuantity and annualActual.
 * Handles string or numeric annualActual.
 */
export function computeActualPercent(targetQuantity, annualActual) {
  if (!targetQuantity || !annualActual) return null;
  const target = Number(targetQuantity);
  const actual = Number(annualActual);
  if (target <= 0 || isNaN(actual)) return null;
  return Math.round((actual / target) * 10000) / 100;
}

/**
 * Average of Q, E, T scores (each 1–5). Skips nulls.
 */
export function computeAverageScore(qualityScore, efficiencyScore, timelinessScore) {
  const scores = [qualityScore, efficiencyScore, timelinessScore].filter(s => s != null && !isNaN(s));
  if (scores.length === 0) return null;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/**
 * Compute Part I (Performance) rating from targets grouped by outputGroup.
 *
 * Each target row has: averageScore (or computed from Q/E/T), weight.
 *
 * Steps:
 * 1. Group targets by outputGroup (CORE, STRATEGIC, SUPPORT)
 * 2. For each group: weighted average of averageScores
 * 3. Part I = sum of (groupAvg × groupWeight%)
 *
 * @param {Array} targets - PerformanceTarget rows with averageScore, weight, outputGroup
 * @param {{ core: number, strategic: number, support: number }} groupWeights - percentages (e.g. { core: 50, strategic: 30, support: 20 })
 * @returns {{ partI: number|null, groupAverages: object }}
 */
export function computePartI(targets, groupWeights = { core: 50, strategic: 30, support: 20 }) {
  const groups = { CORE: [], STRATEGIC: [], SUPPORT: [] };

  for (const t of targets) {
    const score = t.averageScore != null ? Number(t.averageScore) : null;
    const weight = Number(t.weight) || 0;
    if (score == null || weight <= 0) continue;
    const group = t.outputGroup || 'CORE';
    if (groups[group]) groups[group].push({ score, weight });
  }

  const groupAverages = {};
  let partI = 0;
  let totalWeight = 0;

  for (const [groupKey, weightKey] of [['CORE', 'core'], ['STRATEGIC', 'strategic'], ['SUPPORT', 'support']]) {
    const items = groups[groupKey];
    const groupPct = Number(groupWeights[weightKey]) || 0;
    if (items.length === 0 || groupPct <= 0) {
      groupAverages[weightKey] = null;
      continue;
    }
    const weightedSum = items.reduce((sum, i) => sum + i.score * i.weight, 0);
    const weightSum = items.reduce((sum, i) => sum + i.weight, 0);
    const avg = weightSum > 0 ? Math.round((weightedSum / weightSum) * 100) / 100 : null;
    groupAverages[weightKey] = avg;
    if (avg != null) {
      partI += avg * (groupPct / 100);
      totalWeight += groupPct;
    }
  }

  partI = totalWeight > 0 ? Math.round((partI / (totalWeight / 100)) * 100) / 100 : null;
  return { partI, groupAverages };
}

/**
 * Compute Part II (Competency) rating.
 *
 * @param {Array} competencies - PerformanceCompetency rows with score, weight
 * @returns {number|null}
 */
export function computePartII(competencies) {
  const items = competencies.filter(c => c.score != null && Number(c.weight) > 0);
  if (items.length === 0) return null;

  const weightedSum = items.reduce((sum, c) => sum + Number(c.score) * Number(c.weight), 0);
  const weightSum = items.reduce((sum, c) => sum + Number(c.weight), 0);
  return weightSum > 0 ? Math.round((weightedSum / weightSum) * 100) / 100 : null;
}

/**
 * Compute final composite rating.
 *
 * @param {number|null} partI - Performance rating
 * @param {number|null} partII - Competency rating
 * @param {number} competencyWeight - Part II weight % (e.g. 30)
 * @param {number|null} officeRatingCap - Maximum allowed final rating (from OPCR)
 * @returns {{ rating: number|null, adjectival: string|null }}
 */
export function computeFinalRating(partI, partII, competencyWeight = 30, officeRatingCap = null) {
  const cw = Number(competencyWeight) || 30;
  const pw = 100 - cw;

  let final = null;
  if (partI != null && partII != null) {
    final = (partI * pw / 100) + (partII * cw / 100);
    final = Math.round(final * 100) / 100;
  } else if (partI != null) {
    final = partI;
  } else if (partII != null) {
    final = partII;
  }

  if (final == null) return { rating: null, adjectival: null };

  // Office-rating cap enforcement
  if (officeRatingCap != null && final > officeRatingCap) {
    final = officeRatingCap;
  }

  const adjectival = adjectivalLabel(final);
  return { rating: final, adjectival };
}

/**
 * Map a numeric rating (1.00–5.00) to adjectival label.
 * Uses the midpoint scale per CSC MC 6 s. 2012 / MC 13 s. 1999.
 *
 * @param {number} rating
 * @returns {string|null} AdjectivalRating enum value
 */
export function adjectivalLabel(rating) {
  if (rating == null || isNaN(rating)) return null;
  const r = Number(rating);
  if (r >= 4.51) return 'OUTSTANDING';
  if (r >= 3.51) return 'VERY_SATISFACTORY';
  if (r >= 2.51) return 'SATISFACTORY';
  if (r >= 1.51) return 'UNSATISFACTORY';
  return 'POOR';
}

/**
 * Human-readable label for adjectival rating.
 */
export function adjectivalDisplayName(label) {
  const map = {
    OUTSTANDING: 'Outstanding',
    VERY_SATISFACTORY: 'Very Satisfactory',
    SATISFACTORY: 'Satisfactory',
    UNSATISFACTORY: 'Unsatisfactory',
    POOR: 'Poor',
  };
  return map[label] || label || '—';
}

/**
 * Full compute pipeline: takes targets + competencies + review config, returns all computed fields.
 *
 * @param {Array} targets - PerformanceTarget rows
 * @param {Array} competencies - PerformanceCompetency rows
 * @param {object} config - { coreWeight, strategicWeight, supportWeight, competencyWeight, officeRatingCap }
 * @returns {object} { partI, partII, rating, adjectival, groupAverages, targetRatings }
 */
export function computeFullReview(targets, competencies, config = {}) {
  const groupWeights = {
    core: Number(config.coreWeight) || 50,
    strategic: Number(config.strategicWeight) || 30,
    support: Number(config.supportWeight) || 20,
  };
  const competencyWeight = Number(config.competencyWeight) || 30;
  const officeRatingCap = config.officeRatingCap != null ? Number(config.officeRatingCap) : null;

  // Compute per-target ratings if not already set
  const targetRatings = targets.map(t => {
    let avg = t.averageScore != null ? Number(t.averageScore) : null;
    if (avg == null) {
      avg = computeAverageScore(t.qualityScore, t.efficiencyScore, t.timelinessScore);
    }
    return { ...t, averageScore: avg };
  });

  const { partI, groupAverages } = computePartI(targetRatings, groupWeights);
  const partII = computePartII(competencies);
  const { rating, adjectival } = computeFinalRating(partI, partII, competencyWeight, officeRatingCap);

  return {
    partI,
    partII,
    rating,
    adjectival,
    groupAverages,
    targetRatings,
  };
}

/**
 * PBB eligibility check.
 * Employee must be at least Satisfactory for PBB.
 * O/VS eligible for promotion/step increment.
 *
 * @param {string} adjectival - AdjectivalRating enum value
 * @returns {object} { pbb: boolean, promotion: boolean, stepIncrement: string }
 */
export function incentiveFlags(adjectival) {
  return {
    pbb: ['OUTSTANDING', 'VERY_SATISFACTORY', 'SATISFACTORY'].includes(adjectival),
    promotion: ['OUTSTANDING', 'VERY_SATISFACTORY'].includes(adjectival),
    stepIncrement: adjectival === 'OUTSTANDING' ? '2_STEPS' :
                   adjectival === 'VERY_SATISFACTORY' ? '1_STEP' : 'NONE',
  };
}

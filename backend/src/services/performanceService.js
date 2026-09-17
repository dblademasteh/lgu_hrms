import * as repo from '../repositories/performanceRepository.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';
import { computeFullReview, computeTargetRating, computeActualPercent, computeAverageScore } from '../lib/performanceEngine.js';

const ALLOWED_TRANSITIONS = {
  PLANNING: ['MONITORING', 'CANCELLED', 'REVIEW'],
  MONITORING: ['REVIEW', 'PLANNING', 'CANCELLED'],
  REVIEW: ['APPROVED', 'REJECTED', 'MONITORING'],
  APPROVED: [],
  REJECTED: ['MONITORING'],
  CANCELLED: [],
};

const EMPLOYEE_SELECT = { id: true, firstName: true, lastName: true };

function assertStatusTransition(current, next) {
  if (current === next) return;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    const err = new Error(`Invalid status transition: ${current} → ${next}`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
}

function coerceNumber(value, { min = null, max = null, precision = 2 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  let n = Number(value);
  if (isNaN(n)) return null;
  if (min !== null) n = Math.max(min, n);
  if (max !== null) n = Math.min(max, n);
  return Math.round(n * 10 ** precision) / 10 ** precision;
}

function coerceDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Compute and persist all derived rating fields on a review.
 * @returns {object} computed { partI, partII, rating, adjectival }
 */
export async function computeAndPersistReviewRating(req, review) {
  const targets = review.targets || [];
  const competencies = review.competencies || [];

  // Fill per-target derived fields
  const targetUpdates = targets.map(t => {
    const actualPercent = t.actualPercent != null
      ? Number(t.actualPercent)
      : computeActualPercent(t.targetQuantity, t.annualActual);
    const avg = computeAverageScore(t.qualityScore, t.efficiencyScore, t.timelinessScore);
    return { id: t.id, actualPercent, averageScore: avg };
  });

  for (const t of targetUpdates) {
    if (!t.id) continue;
    await prisma.performanceTarget.update({
      where: withTenant(req, { id: t.id }),
      data: {
        actualPercent: t.actualPercent,
        averageScore: t.averageScore,
      },
    });
  }

  const computed = computeFullReview(targets, competencies, {
    coreWeight: review.coreWeight,
    strategicWeight: review.strategicWeight,
    supportWeight: review.supportWeight,
    competencyWeight: review.competencyWeight,
    officeRatingCap: review.officeRatingCap,
  });

  await prisma.performanceReview.update({
    where: withTenant(req, { id: review.id }),
    data: {
      rating: computed.rating,
      adjectivalRating: computed.adjectival,
    },
  });

  return computed;
}

/**
 * All-in-one: compute the full review WITHOUT persisting (for GET/detail views).
 */
export function computeReviewResponseData(review) {
  const targets = review.targets || [];
  const competencies = review.competencies || [];
  const computed = computeFullReview(targets, competencies, {
    coreWeight: review.coreWeight,
    strategicWeight: review.strategicWeight,
    supportWeight: review.supportWeight,
    competencyWeight: review.competencyWeight,
    officeRatingCap: review.officeRatingCap,
  });

  return {
    ...computed,
    weights: {
      core: review.coreWeight,
      strategic: review.strategicWeight,
      support: review.supportWeight,
      competency: review.competencyWeight,
    },
  };
}

export const performanceService = {
  async listPerformanceReviews(req, params) {
    return repo.findPerformanceReviews(req, params);
  },

  async getPerformanceReview(req, id) {
    const review = await repo.findPerformanceReviewById(req, id);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return {
      ...review,
      computed: computeReviewResponseData(review),
    };
  },

  async createPerformanceReview(req, data) {
    const employee = await prisma.employee.findFirst({
      where: { ...withTenant(req), id: data.employeeId },
      select: EMPLOYEE_SELECT,
    });
    if (!employee) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const duplicate = await prisma.performanceReview.findFirst({
      where: withTenant(req, {
        employeeId: data.employeeId,
        reviewYear: data.reviewYear,
        reviewType: data.reviewType || 'IPCR',
      }),
    });
    if (duplicate) {
      const err = new Error('A review already exists for this employee, year, and review type');
      err.status = 409;
      err.code = 'DUPLICATE';
      throw err;
    }

    const initialStatus = data.status || 'PLANNING';
    if (!['PLANNING', 'MONITORING'].includes(initialStatus)) {
      const err = new Error('New review must start as PLANNING or MONITORING');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const payload = {
      employeeId: data.employeeId,
      reviewYear: data.reviewYear,
      reviewType: data.reviewType || 'IPCR',
      periodStart: coerceDate(data.periodStart),
      periodEnd: coerceDate(data.periodEnd),
      planningDate: coerceDate(data.planningDate),
      coreWeight: coerceNumber(data.coreWeight) ?? 50,
      strategicWeight: coerceNumber(data.strategicWeight) ?? 30,
      supportWeight: coerceNumber(data.supportWeight) ?? 20,
      competencyWeight: coerceNumber(data.competencyWeight) ?? 30,
      officeRatingCap: coerceNumber(data.officeRatingCap),
      parentReviewId: data.parentReviewId || null,
      comments: data.comments || null,
      status: initialStatus,
    };

    return repo.createPerformanceReview(req, payload);
  },

  async updatePerformanceReview(req, id, data) {
    const existing = await repo.findPerformanceReviewById(req, id);
    if (!existing) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (data.reviewType && !['IPCR', 'OPCR'].includes(data.reviewType)) {
      const err = new Error('reviewType must be IPCR or OPCR');
      err.status = 400;
      err.code = 'INVALID_TYPE';
      throw err;
    }

    const payload = {};

    if (data.parentReviewId !== undefined) {
      if (data.parentReviewId) {
        const parent = await repo.findPerformanceReviewById(req, data.parentReviewId);
        if (!parent || parent.reviewType !== 'OPCR') {
          const err = new Error('Parent review must be a valid OPCR');
          err.status = 400;
          err.code = 'INVALID_PARENT';
          throw err;
        }
      }
      payload.parentReviewId = data.parentReviewId || null;
    }

    const dateFields = ['periodStart', 'periodEnd', 'planningDate'];
    for (const f of dateFields) {
      if (data[f] !== undefined) payload[f] = coerceDate(data[f]);
    }

    const numFields = ['coreWeight', 'strategicWeight', 'supportWeight', 'competencyWeight', 'officeRatingCap'];
    for (const f of numFields) {
      if (data[f] !== undefined) payload[f] = coerceNumber(data[f]);
    }

    if (data.comments !== undefined) payload.comments = data.comments || null;

    // Status change triggers staging + computation
    if (data.status && data.status !== existing.status) {
      assertStatusTransition(existing.status, data.status);
      payload.status = data.status;

      // Stage 3 → Stage 4: compute final rating on APPROVAL
      if (data.status === 'APPROVED') {
        const computed = await computeAndPersistReviewRating(req, { ...existing, ...payload });
        payload.rating = computed.rating;
        payload.adjectivalRating = computed.adjectival;
        payload.approvedBy = req.user?.id || req.user?.email || null;
        payload.approvedAt = new Date();
      } else if (data.status === 'REVIEW') {
        payload.reviewedBy = req.user?.id || req.user?.email || null;
        payload.reviewedAt = new Date();
      }
    }

    return repo.updatePerformanceReview(req, id, payload);
  },

  async deletePerformanceReview(req, id) {
    const existing = await repo.findPerformanceReviewById(req, id);
    if (!existing) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (existing.status === 'APPROVED') {
      const err = new Error('Cannot delete approved performance review');
      err.status = 400;
      err.code = 'INVALID_STATE';
      throw err;
    }
    await repo.deletePerformanceReview(req, id);
  },

  async computeReview(req, id) {
    const review = await repo.findPerformanceReviewById(req, id);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    const computed = await computeAndPersistReviewRating(req, review);
    return { ...review, computed };
  },

  // ---- Targets ----

  async listTargets(req, reviewId) {
    const review = await repo.findPerformanceReviewById(req, reviewId);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return repo.findTargetsByReview(req, reviewId);
  },

  async addTarget(req, reviewId, data) {
    const review = await repo.findPerformanceReviewById(req, reviewId);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (review.status === 'APPROVED' || review.status === 'REVIEW') {
      const err = new Error('Cannot modify targets after review is underway or approved');
      err.status = 400;
      err.code = 'INVALID_STATE';
      throw err;
    }

    const payload = {
      reviewId,
      kra: data.kra,
      successIndicator: data.successIndicator,
      outputGroup: data.outputGroup || 'CORE',
      weight: coerceNumber(data.weight),
      targetQuantity: coerceNumber(data.targetQuantity, { precision: 2 }) ?? null,
      targetUnit: data.targetUnit || null,
      q1Actual: data.q1Actual || null,
      q2Actual: data.q2Actual || null,
      q3Actual: data.q3Actual || null,
      q4Actual: data.q4Actual || null,
      annualActual: data.annualActual || null,
      qualityScore: coerceNumber(data.qualityScore),
      efficiencyScore: coerceNumber(data.efficiencyScore),
      timelinessScore: coerceNumber(data.timelinessScore),
      meansOfVerification: data.meansOfVerification || null,
      remarks: data.remarks || null,
    };

    const actualPercent = computeActualPercent(payload.targetQuantity, payload.annualActual);
    const averageScore = computeAverageScore(payload.qualityScore, payload.efficiencyScore, payload.timelinessScore);
    payload.actualPercent = actualPercent;
    payload.averageScore = averageScore;

    return repo.createTarget(req, payload);
  },

  async updateTarget(req, reviewId, targetId, data) {
    const review = await repo.findPerformanceReviewById(req, reviewId);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    const target = await prisma.performanceTarget.findFirst({
      where: withTenant(req, { id: targetId, reviewId }),
    });
    if (!target) {
      const err = new Error('Target not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (review.status === 'APPROVED') {
      const err = new Error('Cannot modify targets on an approved review');
      err.status = 400;
      err.code = 'INVALID_STATE';
      throw err;
    }

    const payload = {};
    if (data.kra !== undefined) payload.kra = data.kra;
    if (data.successIndicator !== undefined) payload.successIndicator = data.successIndicator;
    if (data.outputGroup !== undefined) payload.outputGroup = data.outputGroup;
    if (data.weight !== undefined) payload.weight = coerceNumber(data.weight);
    const qtyFields = ['targetQuantity', 'qualityScore', 'efficiencyScore', 'timelinessScore'];
    for (const f of qtyFields) {
      if (data[f] !== undefined) payload[f] = coerceNumber(data[f] ?? null);
    }
    const textFields = ['targetUnit', 'q1Actual', 'q2Actual', 'q3Actual', 'q4Actual', 'annualActual', 'meansOfVerification', 'remarks'];
    for (const f of textFields) {
      if (data[f] !== undefined) payload[f] = data[f] || null;
    }

    // Recompute derived fields
    const merged = { ...target, ...payload };
    const actualPercent = computeActualPercent(merged.targetQuantity, merged.annualActual);
    const averageScore = computeAverageScore(merged.qualityScore, merged.efficiencyScore, merged.timelinessScore);
    payload.actualPercent = actualPercent;
    payload.averageScore = averageScore;

    return repo.updateTarget(req, targetId, payload);
  },

  async removeTarget(req, reviewId, targetId) {
    const review = await repo.findPerformanceReviewById(req, reviewId);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (review.status === 'APPROVED') {
      const err = new Error('Cannot modify targets on an approved review');
      err.status = 400;
      err.code = 'INVALID_STATE';
      throw err;
    }
    const result = await repo.deleteTarget(req, targetId);
    if (!result) {
      const err = new Error('Target not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return result;
  },

  // ---- Competency catalog ----

  async listCompetencies(req, params) {
    return repo.findCompetencies(req, params);
  },

  async getCompetency(req, id) {
    const competency = await repo.findCompetencyById(req, id);
    if (!competency) {
      const err = new Error('Competency not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return competency;
  },

  async createCompetency(req, data) {
    const existing = await prisma.competency.findFirst({
      where: withTenant(req, { code: data.code }),
    });
    if (existing) {
      const err = new Error('Competency code already exists');
      err.status = 409;
      err.code = 'DUPLICATE';
      throw err;
    }
    return repo.createCompetency(req, data);
  },

  async updateCompetency(req, id, data) {
    const existing = await repo.findCompetencyById(req, id);
    if (!existing) {
      const err = new Error('Competency not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (data.code && data.code !== existing.code) {
      const clash = await prisma.competency.findFirst({
        where: withTenant(req, { code: data.code }),
      });
      if (clash) {
        const err = new Error('Competency code already exists');
        err.status = 409;
        err.code = 'DUPLICATE';
        throw err;
      }
    }
    return repo.updateCompetency(req, id, data);
  },

  async deleteCompetency(req, id) {
    const inUse = await prisma.performanceCompetency.findFirst({
      where: { ...withTenant(req), competencyId: id },
    });
    if (inUse) {
      const err = new Error('Competency is in use by performance reviews');
      err.status = 400;
      err.code = 'IN_USE';
      throw err;
    }
    return repo.deleteCompetency(req, id);
  },

  // ---- Review competencies (Part II items) ----

  async listReviewCompetencies(req, reviewId) {
    const review = await repo.findReviewWithCompetencies(req, reviewId);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return {
      review: {
        id: review.id,
        employeeId: review.employeeId,
        reviewYear: review.reviewYear,
        reviewType: review.reviewType,
        status: review.status,
        rating: review.rating,
        adjectivalRating: review.adjectivalRating,
        comments: review.comments,
      },
      competencies: review.competencies.map(c => ({
        id: c.id,
        competencyId: c.competencyId,
        competencyCode: c.competency?.code,
        competencyName: c.competency?.name,
        score: c.score,
        maxScore: c.maxScore,
        weight: c.weight,
        comments: c.comments,
      })),
    };
  },

  async addReviewCompetency(req, reviewId, data) {
    const review = await repo.findReviewWithCompetencies(req, reviewId);
    if (!review) {
      const err = new Error('Performance review not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    const competency = await prisma.competency.findFirst({
      where: withTenant(req, { id: data.competencyId }),
    });
    if (!competency) {
      const err = new Error('Competency not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    const existing = await prisma.performanceCompetency.findFirst({
      where: { ...withTenant(req), reviewId, competencyId: data.competencyId },
    });
    if (existing) {
      const err = new Error('Competency already added to this review');
      err.status = 409;
      err.code = 'DUPLICATE';
      throw err;
    }
    return repo.createPerformanceCompetency(req, {
      reviewId,
      competencyId: data.competencyId,
      score: data.score != null ? coerceNumber(data.score) : null,
      maxScore: coerceNumber(data.maxScore) ?? 5,
      weight: coerceNumber(data.weight) ?? 10,
      comments: data.comments || null,
    });
  },

  async updateReviewCompetency(req, reviewId, competencyItemId, data) {
    const existing = await prisma.performanceCompetency.findFirst({
      where: { ...withTenant(req), id: competencyItemId, reviewId },
    });
    if (!existing) {
      const err = new Error('Competency item not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    const payload = {};
    if (data.score !== undefined) payload.score = data.score != null ? coerceNumber(data.score) : null;
    if (data.maxScore !== undefined) payload.maxScore = coerceNumber(data.maxScore);
    if (data.weight !== undefined) payload.weight = coerceNumber(data.weight);
    if (data.comments !== undefined) payload.comments = data.comments || null;
    return repo.updatePerformanceCompetency(req, competencyItemId, payload);
  },

  async removeReviewCompetency(req, reviewId, competencyItemId) {
    const existing = await prisma.performanceCompetency.findFirst({
      where: { ...withTenant(req), id: competencyItemId, reviewId },
    });
    if (!existing) {
      const err = new Error('Competency item not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return repo.deletePerformanceCompetency(req, competencyItemId);
  },

  // Expose engine helpers for UI display
  ratingHelpers: {
    computeTargetRating,
    computeActualPercent,
    computeAverageScore,
  },
};
import * as repo from '../repositories/performanceRepository.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

const ALLOWED_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['DRAFT'],
};

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
    return review;
  },

  async createPerformanceReview(req, data) {
    const employee = await prisma.employee.findFirst({
      where: { ...withTenant(req), id: data.employeeId },
      select: { id: true },
    });
    if (!employee) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const initialStatus = data.status || 'DRAFT';
    if (initialStatus !== 'DRAFT' && initialStatus !== 'SUBMITTED') {
      const err = new Error('New review must start as DRAFT or SUBMITTED');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const payload = {
      ...data,
      rating: data.rating ? Math.max(1, Math.min(5, Number(data.rating))) : null,
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

    if (data.status && data.status !== existing.status) {
      assertStatusTransition(existing.status, data.status);
    }

    const payload = { ...data };
    if (payload.rating !== undefined) {
      payload.rating = payload.rating ? Math.max(1, Math.min(5, Number(payload.rating))) : null;
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
      where: { competencyId: id },
    });
    if (inUse) {
      const err = new Error('Competency is in use by performance reviews');
      err.status = 400;
      err.code = 'IN_USE';
      throw err;
    }
    return repo.deleteCompetency(req, id);
  },

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
        comments: review.comments,
      },
      competencies: review.competencies.map(c => ({
        id: c.id,
        competencyId: c.competencyId,
        competencyCode: c.competency?.code,
        competencyName: c.competency?.name,
        score: c.score,
        maxScore: c.maxScore,
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
      where: { reviewId, competencyId: data.competencyId },
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
      score: data.score,
      maxScore: data.maxScore || 5,
      comments: data.comments || null,
    });
  },

  async updateReviewCompetency(req, reviewId, competencyItemId, data) {
    const existing = await prisma.performanceCompetency.findFirst({
      where: { id: competencyItemId, reviewId },
    });
    if (!existing) {
      const err = new Error('Competency item not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return repo.updatePerformanceCompetency(req, competencyItemId, data);
  },

  async removeReviewCompetency(req, reviewId, competencyItemId) {
    const existing = await prisma.performanceCompetency.findFirst({
      where: { id: competencyItemId, reviewId },
    });
    if (!existing) {
      const err = new Error('Competency item not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return repo.deletePerformanceCompetency(req, competencyItemId);
  },
};

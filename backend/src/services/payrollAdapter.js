import { payrollRepository } from '../repositories/payrollRepository.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { dispatchWebhooks } from './webhookDispatch.js';
import { Prisma } from '@prisma/client';

const MONEY = value => new Prisma.Decimal(value ?? 0).toNumber();

function toUtcDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  throw new AppError('Expected YYYY-MM-DD date', 400, 'INVALID_DATE');
}

function mapLguPayrollStatus(status) {
  switch (status) {
    case 'DRAFT':
    case 'PROCESSING':
      return 'DRAFT';
    case 'APPROVED':
      return 'APPROVED';
    case 'COMPLETED':
      return 'POSTED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'DRAFT';
  }
}

export const payrollAdapter = {
  async sync(req, since) {
    const tenantId = req.tenantId ?? null;
    const externalSystem = await prisma.externalSystem.findFirst({
      where: { tenantId, type: 'PAYROLL', isActive: true },
    });

    if (!externalSystem?.baseUrl || !externalSystem?.apiKey) {
      throw new AppError('Payroll integration not configured', 400, 'NOT_CONFIGURED');
    }

    const baseUrl = externalSystem.baseUrl.replace(/\/$/, '');
    const apiKey = externalSystem.apiKey;
    const timeoutMs = 15000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/payroll/changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ since: since || undefined }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AppError(`lgu-payroll returned ${response.status}: ${response.statusText}`, 502, 'PAYROLL_ERROR');
      }

      const data = await response.json();
      const records = data.records || [];

      const result = { processed: 0, created: 0, updated: 0, errors: 0 };

      for (const rec of records) {
        try {
          result.processed++;
          switch (rec.entity) {
            case 'period':
              await this._upsertPeriod(req, rec.payload);
              result.updated++;
              break;
            case 'run':
              await this._upsertRun(req, rec.payload);
              result.updated++;
              break;
            case 'record':
              await this._upsertRecord(req, rec.payload);
              result.updated++;
              break;
            default:
              result.errors++;
          }
        } catch (e) {
          console.error('[PayrollAdapter] Failed to process record:', rec.entity, rec.payload?.externalId, e);
          result.errors++;
        }
      }

      await prisma.externalSystem.update({
        where: { id: externalSystem.id },
        data: { lastSyncedAt: new Date() },
      });

      return result;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  },

  async _upsertPeriod(req, payload) {
    const existing = await payrollRepository.findPeriodByExternalId(req, payload.externalId);
    if (existing) {
      await payrollRepository.updatePeriodExternal(req, existing.id, {
        name: payload.name,
        startDate: toUtcDate(payload.startDate),
        endDate: toUtcDate(payload.endDate),
        fiscalYear: payload.fiscalYear,
        status: payload.status === 'CLOSED' ? 'CLOSED' : existing.status,
      });
      if (payload.status === 'CLOSED' && existing.status !== 'CLOSED') {
        // Mirrored from lgu-payroll; notify subscribers that the period closed.
        dispatchWebhooks(req.tenantId, 'payroll.period.closed', {
          periodId: existing.id, externalId: payload.externalId, name: payload.name, status: 'CLOSED',
        }).catch(() => {});
      }
    } else {
      await payrollRepository.createPeriodExternal(req, {
        externalId: payload.externalId,
        name: payload.name,
        startDate: toUtcDate(payload.startDate),
        endDate: toUtcDate(payload.endDate),
        fiscalYear: payload.fiscalYear,
        status: 'OPEN',
      });
      dispatchWebhooks(req.tenantId, 'payroll.period.created', {
        externalId: payload.externalId, name: payload.name, fiscalYear: payload.fiscalYear,
      }).catch(() => {});
    }
  },

  async _upsertRun(req, payload) {
    const period = await payrollRepository.findPeriodByName(req, payload.period);
    if (!period) {
      throw new AppError(`Period ${payload.period} not found for payroll run`, 400, 'PERIOD_NOT_FOUND');
    }

    const existing = await payrollRepository.findRunByExternalId(req, payload.externalId);
    const mappedStatus = mapLguPayrollStatus(payload.status);
    const previousStatus = existing ? existing.status : null;

    if (existing) {
      const updateData = {
        periodId: period.id,
        runDate: toUtcDate(payload.runDate),
        status: mappedStatus,
      };
      if (payload.processedAt) updateData.generatedAt = new Date(payload.processedAt);
      if (payload.approvedAt && mappedStatus === 'APPROVED') updateData.postedAt = new Date(payload.approvedAt);
      await payrollRepository.updateRunExternal(req, existing.id, updateData);
    } else {
      await payrollRepository.createRunExternal(req, {
        externalId: payload.externalId,
        periodId: period.id,
        runDate: toUtcDate(payload.runDate),
        status: mappedStatus,
        createdBy: 'system',
        generatedAt: payload.processedAt ? new Date(payload.processedAt) : undefined,
        postedAt: payload.approvedAt ? new Date(payload.approvedAt) : undefined,
      });
    }

    if (mappedStatus === previousStatus) return;

    const runId = existing ? existing.id : (await payrollRepository.findRunByExternalId(req, payload.externalId)).id;

    // Mirrored lifecycle events: the local engine used to dispatch these on its
    // own writes; the sync is now the only thing that moves a run, so the
    // events fire from here. Transition-only, so an idempotent re-sync that
    // changes nothing dispatches nothing (no webhook loops).
    if (mappedStatus === 'APPROVED') {
      dispatchWebhooks(req.tenantId, 'payroll.run.approved', {
        runId, periodId: period.id, externalId: payload.externalId, status: mappedStatus,
      }).catch(() => {});
    }
    if (mappedStatus === 'POSTED') {
      const summary = await payrollRepository.findRunById(req, runId);
      await this._settleAmortizations(req, period, summary);
      const items = summary?.items ?? [];
      dispatchWebhooks(req.tenantId, 'payroll.run.posted', {
        runId, periodId: period.id, externalId: payload.externalId, status: mappedStatus,
        itemCount: items.length,
        totalNetPay: items.reduce((s, i) => s + Number(i.netPay || 0), 0),
      }).catch(() => {});
    }
  },

  // A posted lgu-payroll run settles the loan amortizations it deducted.
  // Mirrors the old local-engine postRun behaviour: every unpaid amortization
  // that came due within the run's period, for employees in the run, is marked
  // paid. lgu-payroll owns the loan ledger; this keeps HRMS's amortization
  // view truthful without recomputing anything.
  async _settleAmortizations(req, period, run) {
    if (!run?.items?.length) return 0;
    const employeeIds = [...new Set(run.items.map((i) => i.employeeId))];
    const result = await prisma.loanAmortization.updateMany({
      where: withTenant(req, {
        paid: false,
        dueDate: { lte: period.endDate },
        loan: { employeeId: { in: employeeIds } },
      }),
      data: { paid: true },
    });
    return result.count;
  },

  async _upsertRecord(req, payload) {
    const run = await payrollRepository.findRunByExternalId(req, payload.runExternalId);
    if (!run) {
      throw new AppError(`Run ${payload.runExternalId} not found for payroll record`, 400, 'RUN_NOT_FOUND');
    }

    const employee = await prisma.employee.findFirst({
      where: { tenantId: req.tenantId, employeeNumber: payload.employeeNumber },
    });
    if (!employee) {
      throw new AppError(`Employee ${payload.employeeNumber} not found`, 400, 'EMPLOYEE_NOT_FOUND');
    }

    const existingItem = await payrollRepository.findItemByExternalId(req, payload.externalId);
    const basicPay = MONEY(payload.basicSalary);
    const allowances = MONEY(payload.allowances);
    const deductions = MONEY(payload.totalDeductions);
    const netPay = MONEY(payload.netPay);

    if (existingItem) {
      await payrollRepository.updateItemExternal(req, existingItem.id, {
        employeeId: employee.id,
        basicPay,
        allowances,
        deductions,
        netPay,
      });

      await prisma.payrollDeductionLine.deleteMany({
        where: { tenantId: req.tenantId, payrollItemId: existingItem.id },
      });

      if (payload.details?.length) {
        await payrollRepository.createDeductionLinesExternal(req, payload.details.map(d => ({
          payrollItemId: existingItem.id,
          code: d.code,
          description: d.name,
          employeeShare: MONEY(d.computedAmount),
          employerShare: 0,
          quantity: d.quantity ? MONEY(d.quantity) : null,
        })));
      }

      if (payload.payslip?.status) {
        const existingPayslip = await prisma.payslip.findFirst({ where: { tenantId: req.tenantId, payrollItemId: existingItem.id } });
        if (existingPayslip) {
          await payrollRepository.updatePayslipExternal(req, existingPayslip.id, {
            pdfUrl: payload.payslip.pdfUrl,
          });
        } else {
          await payrollRepository.createPayslipExternal(req, {
            externalId: payload.externalId,
            payrollItemId: existingItem.id,
            pdfUrl: payload.payslip.pdfUrl,
          });
        }
      }
    } else {
      const created = await payrollRepository.createItemExternal(req, {
        externalId: payload.externalId,
        runId: run.id,
        employeeId: employee.id,
        basicPay,
        allowances,
        deductions,
        netPay,
      });

      if (payload.details?.length) {
        await payrollRepository.createDeductionLinesExternal(req, payload.details.map(d => ({
          payrollItemId: created.id,
          code: d.code,
          description: d.name,
          employeeShare: MONEY(d.computedAmount),
          employerShare: 0,
          quantity: d.quantity ? MONEY(d.quantity) : null,
        })));
      }

      if (payload.payslip?.status) {
        await payrollRepository.createPayslipExternal(req, {
          externalId: payload.externalId,
          payrollItemId: created.id,
          pdfUrl: payload.payslip.pdfUrl,
        });
      }
    }
  },
};

import { PrismaClient } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';

async function run() {
  const tenant = await prisma.tenant.findFirst({ where: { code: 'DEFAULT' }});
  if (!tenant) { console.log('No tenant'); return; }
  const emp = await prisma.employee.findFirst({ where: { tenantId: tenant.id, employeeNumber: { startsWith: 'EMP-' }}, take: 1 });
  if (!emp) { console.log('No employee'); return; }

  const opcr = await prisma.performanceReview.create({
    data: {
      tenantId: tenant.id,
      employeeId: emp.id,
      reviewYear: 2026,
      reviewType: 'OPCR',
      status: 'APPROVED',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-12-31'),
      coreWeight: 50,
      strategicWeight: 30,
      supportWeight: 20,
      competencyWeight: 30,
      rating: 4.5,
      adjectivalRating: 'VERY_SATISFACTORY',
      officeRatingCap: 4.5,
    },
  });

  const competencies = await prisma.competency.findMany({ where: { tenantId: tenant.id }, take: 2 });
  if (competencies.length < 2) {
    const c1 = await prisma.competency.create({ data: { tenantId: tenant.id, code: 'LEAD', name: 'Leadership', description: '', category: 'BEHAVIORAL' }});
    const c2 = await prisma.competency.create({ data: { tenantId: tenant.id, code: 'COMM', name: 'Communication', description: '', category: 'BEHAVIORAL' }});
    competencies.push(c1, c2);
  }

  const ipcr = await prisma.performanceReview.create({
    data: {
      tenantId: tenant.id,
      employeeId: emp.id,
      reviewYear: 2026,
      reviewType: 'IPCR',
      status: 'PLANNING',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-12-31'),
      coreWeight: 50,
      strategicWeight: 30,
      supportWeight: 20,
      competencyWeight: 30,
      parentReviewId: opcr.id,
      officeRatingCap: 4.5,
      targets: {
        create: [
          {
            kra: 'Increase service delivery',
            successIndicator: 'Average turnaround ≤ 3 days',
            outputGroup: 'CORE',
            weight: 40,
            targetQuantity: 100,
            targetUnit: 'cases',
            annualActual: '115',
            qualityScore: 4.5,
            efficiencyScore: 4.2,
            timelinessScore: 4.0,
            meansOfVerification: 'MIS reports',
          },
          {
            kra: 'Strategic planning',
            successIndicator: '4 plans approved',
            outputGroup: 'STRATEGIC',
            weight: 60,
            targetQuantity: 4,
            targetUnit: 'plans',
            annualActual: '4',
            qualityScore: 4.0,
            efficiencyScore: 4.0,
            timelinessScore: 3.8,
            meansOfVerification: 'Board minutes',
          }
        ]
      },
      competencies: {
        create: [
          { competencyId: compMap.LEAD?.id || competencies[0].id, score: 4.2, weight: 50 },
          { competencyId: compMap.COMM?.id || competencies[1].id, score: 4.0, weight: 50 },
        ]
      }
    }
  });

  console.log('Created OPCR', opcr.id, 'IPCR', ipcr.id);
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req,res,next)=>{
  try{
    const loans = await prisma.loan.findMany({ include:{ employee:true, amortizations:true }});
    res.json({ loans });
  }catch(e){ next(e); }
});

router.post('/', async (req,res,next)=>{
  try{
    const { employeeId, type, amount, termMonths, startDate } = req.body;
    const loan = await prisma.loan.create({ data:{ employeeId, type, amount: Number(amount), termMonths, startDate: new Date(startDate)} });
    res.status(201).json({ loan });
  }catch(e){ next(e); }
});

export default router;

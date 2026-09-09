import { prisma } from '../lib/prisma.js';
export const findBonuses = (where)=> prisma.bonus.findMany({ where, include:{ employee:true }, orderBy:{ createdAt:'desc' } });
export const createBonus = (data)=> prisma.bonus.create({ data, include:{ employee:true } });
export const updateBonus = (id,data)=> prisma.bonus.update({ where:{id}, data });

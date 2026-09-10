import * as service from '../services/payrollDeductionService.js';
export async function getLinesHandler(req,res,next){
  try{ res.json(await service.getLines(req.params.itemId)); }catch(e){next(e);}
}
export async function addLinesHandler(req,res,next){
  try{
    await service.addLines(req.params.itemId, req.body.lines || []);
    const lines = await service.getLines(req.params.itemId);
    res.status(201).json({ lines });
  }catch(e){next(e);}
}
export async function upsertPayslipHandler(req,res,next){
  try{ res.json(await service.upsertPayslip(req.params.itemId, req.body.pdfUrl)); }catch(e){next(e);}
}

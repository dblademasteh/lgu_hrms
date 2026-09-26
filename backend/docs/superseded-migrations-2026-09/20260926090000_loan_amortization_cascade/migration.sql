-- Loan deletion must remove its amortization schedule: a PENDING loan delete
-- previously failed with P2003 because the default required-relation action
-- (Restrict) blocked it. Matches Prisma's referential actions for the
-- `LoanAmortization.loan` relation declared `onDelete: Cascade`.
ALTER TABLE "LoanAmortization" DROP CONSTRAINT "LoanAmortization_loanId_fkey";

ALTER TABLE "LoanAmortization" ADD CONSTRAINT "LoanAmortization_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

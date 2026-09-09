-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_externalId_fkey" FOREIGN KEY ("externalId") REFERENCES "Employee"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

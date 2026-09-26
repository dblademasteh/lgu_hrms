-- Add new values to existing enums (must be committed before use)
ALTER TYPE "VacancyStatus" ADD VALUE 'DRAFT';
ALTER TYPE "VacancyStatus" ADD VALUE 'PUBLISHED';
ALTER TYPE "VacancyStatus" ADD VALUE 'FILLED';
ALTER TYPE "ApplicantStatus" ADD VALUE 'DISQUALIFIED';

import { execSync } from 'child_process';
try {
  const output = execSync('npx prisma generate 2>&1', { 
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  // Print first 30 errors
  const lines = output.split('\n');
  const errorLines = lines.filter(l => l.includes('Error') || l.includes('error') || l.includes('Validation'));
  console.log('Error lines:', errorLines.length);
  errorLines.forEach(l => console.log(l));
  
  // Also print around validation errors
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Error:') || lines[i].includes('error:')) {
      console.log(`Line ${i}:`, lines[i-1], lines[i], lines[i+1]);
    }
  }
} catch(e) {
  console.log('Exit code:', e.status);
  console.log(e.stdout?.substring(0, 3000));
  console.log(e.stderr?.substring(0, 3000));
}

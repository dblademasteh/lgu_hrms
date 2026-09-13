// import 'dotenv/config';

const HRMS_BASE = process.env.HRMS_API_URL || 'http://localhost:4000/api/v1';
const IMS_BASE  = process.env.IMS_API_URL  || 'http://localhost:4001/api/v1';
const HRMS_API_KEY = process.env.HRMS_API_KEY;
const IMS_API_KEY  = process.env.IMS_API_KEY;

if (!HRMS_API_KEY || !IMS_API_KEY) {
  console.error('Set HRMS_API_KEY and IMS_API_KEY in environment');
  process.exit(1);
}

async function fetchAll(urlPath) {
  const items = [];
  let page = 1;
  const limit = 200;
  while (true) {
    const url = new URL(`${HRMS_BASE}${urlPath}`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url, { headers: { 'x-api-key': HRMS_API_KEY } });
    if (!res.ok) throw new Error(`HRMS fetch failed ${res.status}`);
    const data = await res.json();
    const batch = data.items || [];
    items.push(...batch);
    if (batch.length < limit) break;
    page++;
  }
  return items;
}

async function fetchAllEmployees() {
  return fetchAll('/integrations/employees');
}

function mapEmployee(hrmsEmp) {
  return {
    employeeNumber: hrmsEmp.employeeNumber,
    firstName: hrmsEmp.firstName,
    lastName: hrmsEmp.lastName,
    middleName: hrmsEmp.middleName || '',
    fullName: `${hrmsEmp.lastName}, ${hrmsEmp.firstName} ${hrmsEmp.middleName || ''}`.trim(),
    email: hrmsEmp.email || '',
    username: (hrmsEmp.employeeNumber || '').toLowerCase(),
    departmentCode: hrmsEmp.department?.code || null,
    status: hrmsEmp.status,
    hiredDate: hrmsEmp.hiredDate,
  };
}

async function sync() {
  console.log('Fetching departments from HRMS...');
  const departments = await fetchAll('/integrations/departments');
  console.log(`Fetched ${departments.length} departments`);

  console.log('Syncing departments to IMS...');
  const deptPayload = {
    source: 'HRMS-GEN',
    items: departments.map(d => ({ code: d.code, name: d.name })),
    options: { mode: 'upsert', keyField: 'code', validateOnly: false },
  };
  const deptRes = await fetch(`${IMS_BASE}/integrations/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': IMS_API_KEY },
    body: JSON.stringify(deptPayload),
  });
  if (!deptRes.ok) {
    const txt = await deptRes.text();
    throw new Error(`IMS departments sync failed ${deptRes.status}: ${txt}`);
  }
  const deptResult = await deptRes.json();
  console.log('Departments sync result:', deptResult.counts);

  console.log('Fetching employees from HRMS...');
  const employees = await fetchAllEmployees();
  console.log(`Fetched ${employees.length} employees`);

  const payload = {
    source: 'HRMS-GEN',
    employees: employees.map(mapEmployee),
    options: {
      mode: 'upsert',
      keyField: 'employeeNumber',
      validateOnly: false,
    },
  };

  console.log('Pushing to IMS integration endpoint...');
  const res = await fetch(`${IMS_BASE}/integrations/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IMS_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`IMS sync failed ${res.status}: ${txt}`);
  }
  const data = await res.json();
  console.log('IMS sync result:', JSON.stringify(data, null, 2));
}

sync().catch(err => {
  console.error('Sync failed:', err.response?.data || err.message);
  process.exit(1);
});

import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import {
  Database, User, Building, Calendar, BarChart3, Shield, Settings as SettingsIcon,
  FileText, Edit3, Search, ChevronRight, Users, Banknote,
  LayoutGrid, Keyboard
} from 'lucide-react';
import { ROLE_BADGE_TONES } from '../config/permissions.js';

/* ── Quick Links ──────────────────────────────────────────────────────────── */
const quickLinks = [
  { label: 'Dashboard', desc: 'Overview & metrics', icon: LayoutGrid, color: 'text-accent', chip: 'bg-accent/10', target: 'routes' },
  { label: 'Employees', desc: 'People management', icon: Users, color: 'text-success', chip: 'bg-success/10', target: 'modules' },
  { label: 'Payroll', desc: 'Pay runs & payslips', icon: Banknote, color: 'text-accent', chip: 'bg-accent/10', target: 'modules' },
  { label: 'Leave', desc: 'Requests & approvals', icon: Calendar, color: 'text-warning', chip: 'bg-warning/10', target: 'modules' },
  { label: 'Performance', desc: 'IPCR & OPCR', icon: BarChart3, color: 'text-accent', chip: 'bg-accent/10', target: 'modules' },
  { label: 'Multi-Tenant', desc: 'Tenant setup & onboarding', icon: Building, color: 'text-success', chip: 'bg-success/10', target: 'multi-tenancy' },
];

export default function Help() {
  const [openSection, setOpenSection] = useState(null);

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: FileText,
      items: [
        {
          title: 'First Login',
          items: [
            { label: 'Open Browser', description: 'Navigate to the LGU HRMS application URL provided by your administrator' },
            { label: 'Enter Credentials', description: 'Use your assigned username and password to log in — or the PIN tab if you set a sign-in PIN' },
            { label: 'Administrative Account', description: 'First-time admin: initial password is admin123. Please change immediately after login.' },
            { label: 'PIN Sign-In', description: 'Set a 4–6 digit PIN in Settings → Account → Security, then use the PIN tab on the login page. Locked after 8 failed attempts in 15 minutes.' },
            { label: 'Password Rotation', description: 'Passwords expire every 30 days. The login page routes you to Settings when expired; renew in Account → Security.' },
            { label: 'Tenant Selection', description: 'SUPER_ADMIN can pick an LGU via Advanced options on login. Subdomain or X-Tenant-Id auto-detects tenant. Regular users see auto-detect only.' },
          ]
        },
        {
          title: 'Understanding the Interface',
          items: [
            { label: 'Sidebar Menu', description: 'Primary navigation - click items to access modules. Groups: Workforce, RSP, Performance & L&D, Payroll, Compliance, Administration.' },
            { label: 'App Bar', description: 'Global controls: Search (Ctrl/Cmd+K), Help, Notifications, Theme toggle, User menu.' },
            { label: 'Content Area', description: 'Main workspace showing selected module. Cards/tables with actionable data.' },
            { label: 'Breadcrumbs', description: 'Shows your path through the application for easy navigation.' },
          ]
        },
        {
          title: 'Role-Based Access',
          items: [
            { label: 'Your Role', description: 'Access is based on your assigned role (ADMIN, HR_MANAGER, PAYROLL_OFFICER, DEPARTMENT_HEAD, AUDITOR, or EMPLOYEE).' },
            { label: 'Feature Visibility', description: 'Higher roles inherit access to lower role features.' },
            { label: 'Support', description: 'Contact system administrator for role changes or access issues.' },
          ]
        }
      ]
    },
    {
      id: 'multi-tenancy',
      title: 'Multi-Tenancy & Onboarding',
      icon: Building,
      items: [
        {
          title: 'Tenant Concepts',
          items: [
            { label: 'What is a Tenant?', description: 'An LGU instance with isolated data sharing the same HRMS platform.' },
            { label: 'Tenant ID', description: 'All business tables carry tenantId. Data is scoped automatically per logged-in user.' },
            { label: 'Subdomain Access', description: 'Access via <code>lgu.hrms.local</code>. Subdomain maps to tenant in tenant middleware.' },
            { label: 'SUPER_ADMIN Override', description: 'SUPER_ADMIN can switch tenants via X-Tenant-Id header, query param, or login Advanced options.' },
          ]
        },
        {
          title: 'Tenant Registration',
          items: [
            { label: 'Onboarding Portal', description: 'Go to /tenant-register to create a new LGU tenant. Requires platform operator access.' },
            { label: 'Seed Data', description: 'After creation, run seedTenant for DEFAULT/TARLAC to populate initial departments, users, employees, payroll.' },
            { label: 'Provisioning Docs', description: 'See docs/TENANT_PROVISIONING.md for full provisioning steps.' },
          ]
        }
      ]
    },
    {
      id: 'modules',
      title: 'Application Modules',
      icon: SettingsIcon,
      items: [
        {
          title: 'Workforce Management',
          icon: User,
          items: [
            { label: 'Employees - View All', description: 'Navigate to Employees module. Use search box or filters to find specific employees.' },
            { label: 'Employees - Add New', description: 'Click the Plus (+) button. Complete required fields. Submit and verify success message.' },
            { label: 'Employees - Edit', description: 'Click the row to select employee. Click pencil icon (Edit). Make changes. Save.' },
            { label: 'Employees - Deactivate', description: 'Edit employee record. Set Status to INACTIVE. User cannot login afterward.' },
            { label: 'Departments - Create', description: 'Go to Organization module. Click Add Department. Enter name and budget owner.' },
            { label: 'Positions - Define', description: 'Appointments module: Create Plantilla item with grade level, salary range, and budget authorization.' },
            { label: 'Appointments - Issue', description: 'Link employee to position. Select type and date. Submit for CSC issuance.' },
          ]
        },
        {
          title: 'Recruitment & Selection (RSP)',
          icon: Building,
          items: [
            { label: 'Plantilla - Add', description: 'Click Plantilla. Click Plus. Create position with budget authorization.' },
            { label: 'Plantilla - Approve', description: 'Select plantilla item. Click Approve to make it active.' },
            { label: 'Vacancies - Create', description: 'Click Vacancies. Plus button. Select plantilla item to fill.' },
            { label: 'Vacancies - Publish', description: 'Set status to OPEN. Vacancy becomes searchable.' },
            { label: 'Applicant - Apply', description: 'Open vacancy. Click Apply. Fill application form.' },
            { label: 'Eligibility - Upload', description: 'Upload CSC eligibility certificates (Rating, Rating-2, etc.).' },
          ]
        },
        {
          title: 'Performance & Learning',
          icon: BarChart3,
          items: [
            { label: 'IPCR - Create', description: 'Select employee. Choose review year. Rate each competency 1-5. Submit.' },
            { label: 'OPCR - Create', description: 'Organization-wide rating for same competencies.' },
            { label: 'Training - Enroll', description: 'Select program. Click Enroll. Add employee to training.' },
            { label: 'Training - Track', description: 'Mark attendance. Update completion status.' },
          ]
        },
        {
          title: 'Payroll & Benefits',
          icon: Calendar,
          items: [
            { label: 'Payroll - New Period', description: 'Click Payroll. New Period. Set month and pay date.' },
            { label: 'Payroll - Generate Run', description: 'Open period. View employees in run. Generate payslips.' },
            { label: 'Payroll - Approve Run', description: 'Review run. Click Approve. Status becomes APPROVED.' },
            { label: 'Payslips - Download', description: 'Navigate to Payslips page. Download as PDF.' },
            { label: 'Bonuses - Add', description: 'Click Bonuses. Plus button. Select period. Enter amount.' },
            { label: 'Loans - Create', description: 'Click Loans. New loan. Set amount, duration, interest rate.' },
            { label: 'Loans - Repay', description: 'Loan appears on payslip as deduction. Track balance.' },
          ]
        },
        {
          title: 'Compliance & Audit',
          icon: Shield,
          items: [
            { label: 'Audit - View Log', description: 'All changes logged: WHO did WHAT to WHAT and WHEN.' },
            { label: 'Audit - Filter by User', description: 'See all actions performed by a specific user.' },
            { label: 'DIBAR - Disqualification', description: 'Record employee disqualifications. Set status to DISEMPOWERED.' },
            { label: 'Reports - Generate', description: 'Payroll summary, CSV exports, compliance reports.' },
            { label: 'Reports - Preview', description: 'Click Preview to open report viewer modal. Generate uses pdfmake/ExcelJS.' },
          ]
        },
        {
          title: 'Database Management',
          icon: Database,
          items: [
            { label: 'Browse Tables', description: 'Select table from dropdown at top of page. View all records.' },
            { label: 'Filter Records', description: 'Search box filters all columns. Column headers can be sorted.' },
            { label: 'Navigate Pages', description: 'Use paging controls at bottom or dropdown to set entries per page.' },
            { label: 'Add New Record', description: 'Click Plus (+) button. Modal appears. Complete all required fields.' },
            { label: 'Edit Record', description: 'Click on a cell to edit inline. Press Enter or click outside to save.' },
            { label: 'Export Data', description: 'Click download icon. Choose CSV for full table or JSON for single record.' },
            { label: 'Refresh View', description: 'Click refresh button to reload table after making changes.' },
          ]
        }
      ]
    },
    {
      id: 'routes',
      title: 'Main Modules',
      icon: SettingsIcon,
      items: [
        { title: '/dashboard', description: 'Home screen with key metrics, charts, and recent notifications.' },
        { title: '/organization', description: 'Department tree structure. Create, edit, and manage organizational units.' },
        { title: '/employees', description: 'Employee master list with search, column filters, sorting, and export.' },
        { title: '/ess', description: 'Employee Self-Service: View payslips, file leave requests, check attendance.' },
        { title: '/payroll', description: 'Create payroll periods, generate runs, approve, and download payslips.' },
        { title: '/leave', description: 'Submit leave requests, track status, view balances and history.' },
        { title: '/attendance', description: 'Daily Time Record monitoring, overtime tracking, and attendance reports.' },
        { title: '/audit', description: 'Comprehensive audit log of all changes. Filter by user or date range.' },
        { title: '/reports', description: 'Generate payroll summary reports. Export CSV and PDF formats.' },
        { title: '/settings', description: 'Application settings, database management tools, and configuration.' },
        { title: '/help', description: 'This help documentation page with step-by-step instructions.' },
      ]
    },
    {
      id: 'controls',
      title: 'User Interface Controls',
      icon: Edit3,
      items: [
        {
          title: 'Navigation',
          items: [
            { label: 'Sidebar Menu', description: 'Click navigation items on the left. Groups expand automatically. Use breadcrumbs for quick location.' },
            { label: 'Page Navigation', description: 'Breadcrumb trail shows path. Click home icon to return to Dashboard.' },
          ]
        },
        {
          title: 'App Bar Controls',
          items: [
            { label: 'Global Search', description: 'Press Ctrl/Cmd+K. Type query and press Enter to search all modules.' },
            { label: 'Help Link', description: 'Click the Help icon to view this documentation page.' },
            { label: 'Notifications', description: 'Click bell icon. Red badge shows unread count. Click to view and clear.' },
            { label: 'Theme Toggle', description: 'Click sun/moon icon to switch between light and dark mode.' },
            { label: 'User Menu', description: 'Click your avatar/name. Options: Profile, Change Password, Logout.' },
          ]
        },
        {
          title: 'Working with Tables',
          items: [
            { label: 'Add New', description: 'Click Plus (+) button. Complete form with required fields. Submit to save.' },
            { label: 'Edit Existing', description: 'Click row to select. Click pencil icon. Make changes. Click Save.' },
            { label: 'Delete Record', description: 'Select row. Click trash icon. Confirm in dialog. Record is soft-deleted.' },
            { label: 'Export Data', description: 'Click download icon. Choose CSV for full export or JSON for single record.' },
          ]
        }
      ]
    },
    {
      id: 'rbac',
      title: 'Role-Based Access Control',
      icon: Shield,
      items: [
        {
          title: 'Role Permissions',
          items: [
            { label: 'ADMIN', description: 'Full system access including Users, Roles, Settings, and all modules.' },
            { label: 'HR_MANAGER', description: 'Manage employees, payroll, performance, database. No user management.' },
            { label: 'PAYROLL_OFFICER', description: 'Process payroll, manage bonuses, loans, view reports.' },
            { label: 'DEPARTMENT_HEAD', description: 'View employees, process leave/approvals for own department.' },
            { label: 'AUDITOR', description: 'Read-only access to Audit Trail and Reports. Cannot make changes.' },
            { label: 'EMPLOYEE', description: 'Employee self-service: ESS portal, payslips, leave filing, attendance. No admin access.' },
          ]
        },
        {
          title: 'Role Management',
          items: [
            { label: 'Assign Users', description: 'Admin users: Go to Users module to change role assignments.' },
            { label: 'Effective Immediately', description: 'Role changes apply after next login or token refresh.' },
            { label: 'Inactive Status', description: 'Users with INACTIVE status cannot log in. Set to ACTIVE to restore.' },
          ]
        }
      ]
    }
  ];

  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sections.map((section) => ({ section, items: section.items }));
    return sections
      .map((section) => {
        if (section.title.toLowerCase().includes(q)) return { section, items: section.items };
        const items = section.items
          .map((item) => {
            const itemTitle = item.title || item.label || '';
            if (itemTitle.toLowerCase().includes(q)) return item;
            if (item.items) {
              const subs = item.items.filter((sub) =>
                (sub.label || sub.title || '').toLowerCase().includes(q) ||
                (sub.description || '').toLowerCase().includes(q)
              );
              if (subs.length > 0) return { ...item, items: subs };
            } else if ((item.description || '').toLowerCase().includes(q)) {
              return item;
            }
            return null;
          })
          .filter(Boolean);
        return items.length > 0 ? { section, items } : null;
      })
      .filter(Boolean);
  }, [searchQuery]);

  const openIds = searchQuery.trim() ? new Set(filteredSections.map((f) => f.section.id)) : null;
  const isOpen = (id) => (openIds ? openIds.has(id) : openSection === id);

  const renderFlatRoute = (op, key) => (
    <li key={key} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-bg/50 transition group">
      <ChevronRight size={14} className="mt-0.5 shrink-0 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition" />
      <div className="min-w-0">
        <span className="font-mono text-xs font-semibold text-accent">{op.title}</span>
        <p className="text-xs text-muted leading-relaxed mt-0.5">{op.description}</p>
      </div>
    </li>
  );

  const renderStep = (entry, key, stepNo) => (
    <li key={key} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-bg/50 transition">
      <span className="inline-flex items-center justify-center w-5 h-5 mt-px rounded-full bg-accent/10 text-accent text-[10px] font-bold font-mono shrink-0">
        {stepNo}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink leading-snug">
          {entry.label || entry.title}
        </p>
        <p className="text-xs text-muted leading-relaxed mt-0.5">{entry.description}</p>
      </div>
    </li>
  );

  const renderGroup = (item, index) => {
    const GroupIcon = item.icon;
    return (
      <div key={index} className={`${index > 0 ? 'mt-4 pt-4 border-t border-line/40' : ''}`}>
        <div className="flex items-center gap-2 mb-1.5 px-1.5">
          {GroupIcon && <GroupIcon size={14} className="text-accent" />}
          <h4 className="text-[11px] font-bold text-ink uppercase tracking-wider">{item.title}</h4>
        </div>
        <ul className="divide-y divide-line/40">
          {item.items.map((sub, j) => renderStep(sub, j, j + 1))}
        </ul>
      </div>
    );
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* ── Header ── */}
        <div className="relative rounded-2xl bg-surface border border-line shadow-sm overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent to-success" />
          <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <FileText size={24} className="text-accent" />
              </div>
              <div>
                <h1 className="font-display font-bold text-ink text-2xl tracking-tight leading-tight">Help Center</h1>
                <p className="text-muted text-sm mt-0.5">Search topics, follow step-by-step guides, and learn LGU&nbsp;HRMS</p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help topics…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line bg-bg/50 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>
          </div>
        </div>

        {/* ── Quick links ── */}
        {!searchQuery.trim() && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.label}
                  onClick={() => setOpenSection(link.target)}
                  className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-line bg-surface hover:border-accent/40 hover:shadow-sm hover:-translate-y-0.5 transition cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-lg ${link.chip} flex items-center justify-center group-hover:scale-105 transition`}>
                    <Icon size={19} className={link.color} />
                  </div>
                  <span className="text-xs font-semibold text-ink group-hover:text-accent transition">{link.label}</span>
                  <span className="text-[10px] text-muted leading-tight text-center">{link.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── No results ── */}
        {filteredSections.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface/60 text-center py-16 px-6">
            <div className="w-12 h-12 rounded-xl bg-bg flex items-center justify-center mx-auto mb-3">
              <Search size={20} className="text-muted/50" />
            </div>
            <p className="text-sm text-ink font-medium">
              No results for “{searchQuery}”
            </p>
            <p className="text-xs text-muted mt-1">Try different keywords, e.g. “payroll”, “leave”, or “role”.</p>
          </div>
        )}

        {/* ── Section cards ── */}
        {filteredSections.map(({ section, items }) => {
          const open = isOpen(section.id);
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className={`rounded-xl border bg-surface shadow-sm overflow-hidden transition ${
                open ? 'border-accent/25' : 'border-line'
              }`}
            >
              <button
                className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-bg/40 transition"
                onClick={() => setOpenSection(open ? null : section.id)}
                aria-expanded={open}
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon size={19} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-semibold text-ink text-[15px] leading-snug">{section.title}</h2>
                  <p className="text-[11px] text-muted mt-0.5 truncate">{items.length} topic{items.length !== 1 ? 's' : ''}</p>
                </div>
                <span className={`w-8 h-8 flex items-center justify-center rounded-full border shrink-0 transition ${
                  open ? 'bg-accent/10 border-accent/25' : 'bg-bg/50 border-line'
                }`}>
                  <ChevronRight
                    size={15}
                    className={`transition-transform duration-200 ${open ? 'rotate-90 text-accent' : 'text-muted'}`}
                  />
                </span>
              </button>

              {open && (
                <div className="px-4 pb-5 pt-1 border-t border-line/60">
                  {/* ── Modules section: grouped sub-sections with icons ── */}
                  {section.id === 'modules' && items.filter((item) => item.icon && item.items).map((item, i) => renderGroup(item, i))}

                  {/* ── Getting started / Controls: labelled groups ── */}
                  {(section.id === 'getting-started' || section.id === 'controls') && items.filter((item) => item.items).map((item, i) => renderGroup(item, i))}

                  {/* ── Routes: route cards ── */}
                  {section.id === 'routes' && (
                    <ul className="divide-y divide-line/40 mt-1">
                      {items.map((op, j) => renderFlatRoute(op, j))}
                    </ul>
                  )}

                  {/* ── RBAC: role badges + grouped steps ── */}
                  {section.id === 'rbac' && (
                    <>
                      <div className="mt-1.5 mb-4 p-3.5 rounded-lg bg-bg/50 border border-line/50">
                        <div className="flex flex-wrap gap-1.5">
                          {['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR', 'EMPLOYEE'].map((role) => (
                            <span
                              key={role}
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold uppercase tracking-wider ${roleBadgeTones[role]}`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted mt-2 leading-relaxed">
                          Roles are ranked — higher roles inherit permissions of lower roles. ADMIN sees everything.
                        </p>
                      </div>
                      {items.filter((item) => item.items).map((item, i) => renderGroup(item, i))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Keyboard hint footer ── */}
        <div className="flex items-center justify-center gap-2 pt-2 pb-6 text-[11px] text-muted">
          <Keyboard size={13} className="text-muted/70" />
          <span>Press <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface font-mono text-[10px]">Ctrl + K</kbd> anywhere to search the app</span>
        </div>
      </div>
    </Layout>
  );
}
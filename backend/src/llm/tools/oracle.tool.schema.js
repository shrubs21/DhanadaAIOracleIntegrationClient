/**
 * Enhanced Oracle Tool Schema
 * Supports: HCM, ERP with file downloads
 */

export const oracleToolSchema = {
  type: "function",
  function: {
    name: "oracle_fetch",
    description: `Fetch real-time data from Oracle Fusion Cloud (HCM or ERP) and generate downloadable files.

**🎯 SUPPORTED DATA TYPES:**

**HCM (Human Capital Management):**
- Employee Information: profiles, assignments, contacts, hierarchy
- Payroll: salary breakdowns, bonuses, payslips, cost analysis
- Leave & Attendance: balances, applications, reports, absences
- Performance: ratings, reviews, KPIs, appraisals, feedback
- Learning: trainings, certifications, courses, schedules
- Recruitment: requisitions, candidates, interviews, pipeline
- Organization: hierarchy, departments, headcount, structure
- Analytics: attrition, turnover, diversity, performance trends

**ERP (Enterprise Resource Planning):**
- Suppliers: vendor details, performance, spend analysis, status
- Invoices: pending, paid, overdue, aging, payment status
- Purchase Orders: creation, tracking, approvals, receipts
- Payments: history, schedules, reconciliation, forecasts
- Procurement: requisitions, approvals, spend by category
- Financials: GL accounts, budgets, revenue, expenses, cash flow
- Assets: inventory, depreciation, maintenance, tracking
- Analytics: spend optimization, supplier risk, cost savings

**📄 FILE DOWNLOADS:**
- Invoice PDFs: "download invoice #INV-123 as PDF"
- Payslip PDFs: "download my January payslip"
- Excel Reports: "export supplier list to Excel"
- CSV Exports: "export employee data to CSV"
- PO Documents: "download purchase order #PO-456"

**❌ DO NOT USE FOR:**
- General questions: "What is Oracle HCM?"
- Process help: "How do I create a PO?"
- Login issues: "I can't access the system"
- Policy questions: "What's the leave policy?" (unless stored in Oracle)`,

    parameters: {
      type: "object",
      properties: {
        product: {
          type: "string",
          enum: ["HCM", "ERP"],
          description: `Select Oracle product module.

**Choose HCM for:**
👥 PEOPLE & HR QUERIES
- Employees, workers, workforce, staff, personnel
- Payroll, salary, compensation, benefits, bonuses
- Leave, attendance, absences, time off
- Performance, appraisals, reviews, ratings, KPIs
- Training, learning, courses, certifications
- Recruitment, hiring, candidates, interviews
- Departments, managers, hierarchy, organization
- Attrition, turnover, retention, engagement

**Keywords:** employee, worker, person, staff, hire, manager, department, salary, payroll, leave, attendance, performance, training, HR, headcount, attrition

**Choose ERP for:**
💼 FINANCE & OPERATIONS QUERIES  
- Suppliers, vendors, partners
- Invoices, bills, payments, AP, AR
- Purchase Orders (PO), requisitions, procurement
- GL accounts, ledgers, financials
- Budgets, expenses, costs, revenue
- Assets, inventory, stock
- Spending, cost analysis, cash flow

**Keywords:** supplier, vendor, invoice, payment, PO, purchase, procurement, GL, account, budget, expense, cost, revenue, asset, inventory, finance, spend

**Real Examples:**
✅ "employee details" → HCM
✅ "supplier list" → ERP  
✅ "my payslip" → HCM
✅ "pending invoices" → ERP
✅ "leave balance" → HCM
✅ "purchase orders" → ERP
✅ "attrition rate" → HCM
✅ "cash flow" → ERP`
        },
        query: {
          type: "string",
          description: `Detailed natural language query. Be specific about what data is needed.

**📋 QUERY STRUCTURE:**

1. **What**: Specify the data needed
2. **Who/Which**: Add filters (employee ID, supplier name, status)
3. **When**: Time period (this month, last year, Q1 2024)
4. **How**: Format or grouping (by department, top 10, sorted by amount)
5. **Download**: Include if file export needed

**✅ EXCELLENT QUERY EXAMPLES:**

**HCM Queries:**
• "fetch complete employee profile for employee ID 10234 including job title, department, manager, location, salary grade, and contact details"
• "get detailed salary breakdown for current user for January 2024 including base salary, allowances, deductions, taxes, and net pay"
• "retrieve leave balance for current user showing remaining days for each leave type (annual, sick, casual)"
• "list all employees reporting directly to manager Rahul Sharma with their job titles, departments, and hire dates"
• "show top 5 employees by performance rating for 2024 with scores, achievements, and manager feedback"
• "analyze employee attrition for last 12 months by department showing turnover rate, reasons, and high-risk areas"
• "generate and download payslip PDF for current user for January 2024 with all earning and deduction details"
• "fetch all employees whose contracts expire within next 30 days with employee name, end date, and manager"
• "retrieve pending performance reviews for Q1 2024 showing employee names, reviewers, and due dates"
• "list mandatory trainings pending for current user with course names, deadlines, and completion status"

**ERP Queries:**
• "list all active suppliers with supplier number, name, status, primary contact, email, and total lifetime spend"
• "fetch pending invoices over $10,000 showing invoice number, supplier name, amount, invoice date, and due date sorted by amount descending"
• "generate and download invoice PDF for invoice number INV-2024-001 with complete line item details, taxes, and payment terms"
• "retrieve top 10 suppliers by total spend for 2024 ranked highest to lowest with supplier name and spend amount"
• "show all purchase orders created this month with PO number, supplier, amount, status, created date, and approval status"
• "analyze spending by department for Q1 2024 identifying highest spending department with breakdown by category"
• "fetch overdue invoices older than 30 days with supplier name, invoice number, original amount, days overdue, and outstanding balance"
• "export complete supplier list to Excel file including all fields (name, contact, status, spend, performance rating)"
• "retrieve payment history for supplier ABC Corporation for last 6 months showing payment date, invoice number, and amount"
• "generate purchase order aging report showing POs grouped by age ranges (0-30, 31-60, 61-90, 90+ days)"

**📄 FILE DOWNLOAD QUERIES:**
• "download invoice PDF for invoice number INV-2024-001"
• "generate and export my payslip for January 2024 as PDF"
• "export list of all active employees to CSV file with columns: ID, name, department, title, hire date"
• "download purchase order document for PO number PO-2024-456"
• "generate supplier performance report as Excel with ratings and spend data"

**❌ BAD QUERY EXAMPLES (Too Vague):**
• "suppliers" → Should be: "list all active suppliers with names and status"
• "employees" → Should be: "show all employees in Sales department with job titles"  
• "invoices" → Should be: "fetch pending invoices for this month with amounts"
• "data" → Should specify exactly what data
• "report" → Should specify what kind of report and what data to include

**🎯 QUERY BEST PRACTICES:**
✅ Include specific IDs when available (employee ID, invoice number)
✅ Specify time periods (this month, last year, Q1 2024)
✅ Add filters (status: active, amount > $10K, department: Sales)
✅ Request relevant fields only
✅ Specify sorting (top 10, highest first, most recent)
✅ Include grouping if needed (by department, by supplier, by month)
✅ For downloads: mention file format (PDF, Excel, CSV)

**📊 ANALYTICS QUERIES:**
• "predict which employees are at high risk of leaving in next quarter based on historical patterns"
• "identify cost-saving opportunities in procurement by analyzing spend patterns"
• "compare Sales department performance vs targets for Q1 2024"
• "analyze supplier performance metrics and identify underperforming vendors"`
        },
        includeFile: {
          type: "boolean",
          description: `Set to true if user wants to download or export a file (PDF, Excel, CSV). 
          
Examples:
- "download invoice" → true
- "export to Excel" → true  
- "show suppliers" → false
- "list employees" → false`,
          default: false
        },
        fileFormat: {
          type: "string",
          enum: ["PDF", "Excel", "CSV"],
          description: `File format for downloads. Only used when includeFile is true.

- PDF: Invoices, payslips, reports, documents
- Excel: Supplier lists, employee data, analytical reports
- CSV: Raw data exports, bulk employee/supplier lists`,
        }
      },
      required: ["product", "query"],
      additionalProperties: false
    }
  }
};

/**
 * USAGE EXAMPLES FOR REFERENCE:
 */

// Example 1: Employee Details (No File)
const example1 = {
  product: "HCM",
  query: "fetch complete employee details for employee ID 10234",
  includeFile: false
};

// Example 2: Download Payslip (PDF)
const example2 = {
  product: "HCM",
  query: "generate payslip for current user for January 2024",
  includeFile: true,
  fileFormat: "PDF"
};

// Example 3: Supplier List (No File)
const example3 = {
  product: "ERP",
  query: "list all active suppliers with contact information",
  includeFile: false
};

// Example 4: Download Invoice (PDF)
const example4 = {
  product: "ERP",
  query: "generate invoice document for invoice number INV-2024-001",
  includeFile: true,
  fileFormat: "PDF"
};

// Example 5: Export Employee Data (Excel)
const example5 = {
  product: "HCM",
  query: "export all employees in Sales department with job titles and salaries",
  includeFile: true,
  fileFormat: "Excel"
};

// Example 6: Analytics (No File)
const example6 = {
  product: "HCM",
  query: "analyze employee attrition trends for last 12 months by department",
  includeFile: false
};
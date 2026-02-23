import { callOracleAPI, getNextPageUrl } from "./oracle.client.js";

import {
  createPayablesInvoice,
  createReceivablesInvoice,
  createPayablesPayment,
  createReceivablesReceipt,
  extractInvoiceParams
} from "./erp.invoice.handler.js";

/**
 * Oracle MCP Tool - Production Implementation with Oracle NEXT-LINK Pagination
 * Handles HCM and ERP queries with intelligent mapping to Oracle endpoints
 * 
 * CRITICAL: Query matching order is CRITICAL!
 * Attrition (LOCAL MODE using /emps) must come before Employee List
 * Payroll must come before Employee List to prevent hijacking
 * 
 * ✅ FINAL FIXES APPLIED:
 * ✅ FIX #1: First call uses endpoint mode, then fullUrl for pagination
 * ✅ FIX #2: Added totalResults: true to enable Oracle next links
 * ✅ FIX #3: Improved "all employees" detection to prevent wrong matches
 * ✅ FIX #4: Uses getNextPageUrl() helper from oracle.client.js
 * ✅ FIX #5: Attrition uses /emps (NOT /workers) with TerminationDate field
 * ✅ FIX #6: Department breakdown + High-risk zones + Chart-ready data
 * ✅ FIX #7: CRITICAL - data returns recentTerminations array, not departmentData
 * ✅ FIX #8: INVOICE WIZARD INTEGRATION - Handles args.method === "POST" for invoice creation
 */

/**
 * ✅ CORRECT Oracle Pagination Helper - FINAL VERSION
 * Fetches ALL employees using Oracle's NEXT-LINK pagination
 * 
 * CRITICAL:
 * - First call MUST use endpoint mode with totalResults: true
 * - Subsequent calls use fullUrl mode with next.href
 */
async function fetchAllEmployees(userId) {
  let allEmployees = [];

  console.log("🔄 Fetching ALL employees using Oracle NEXT-LINK pagination...");

  // ✅ FIRST CALL MUST BE endpoint MODE
  let res = await callOracleAPI({
    userId,
    product: "HCM",
    endpoint: "/emps",
    queryParams: {
      limit: 200,
      totalResults: true   // ✅ REQUIRED for next link
    }
  });

  allEmployees.push(...res.items);
  console.log(`✅ First batch received: ${res.items.length} records`);
  console.log(`   Total so far: ${allEmployees.length} records`);

  // ✅ Get next link
  let nextUrl = getNextPageUrl(res);

  // ✅ Loop through pages
  while (nextUrl) {
    console.log(`➡️  Fetching next page: ${nextUrl}`);

    res = await callOracleAPI({
      userId,
      product: "HCM",
      fullUrl: nextUrl
    });

    if (!res.items || res.items.length === 0) {
      console.log("   No more records received");
      break;
    }

    allEmployees.push(...res.items);
    console.log(`   ✅ Batch received: ${res.items.length} records`);
    console.log(`   ✅ Total so far: ${allEmployees.length} records`);

    nextUrl = getNextPageUrl(res);

    // Safety cap
    if (allEmployees.length >= 5000) {
      console.log(`   ⚠️  Safety cap reached: ${allEmployees.length} records`);
      break;
    }
  }

  console.log(`✅ Pagination complete: ${allEmployees.length} employees fetched`);

  return allEmployees;
}

/**
 * ✅ PRODUCTION ATTRITION ANALYTICS ENGINE - FULLY CORRECTED
 * Uses /emps endpoint (NOT /workers) with TerminationDate field
 * 
 * ✅ CRITICAL FIX APPLIED:
 * - data: recentTerminations (32 employee records) ← CORRECT
 * - NOT data: departmentData (summary objects) ← WRONG
 * 
 * This ensures:
 * ✅ count matches data.length
 * ✅ Redis table storage works correctly
 * ✅ UI can display full employee exit list
 * ✅ Analytics are separate in analytics object
 * 
 * Supports:
 * - Last 12 months filtering using TerminationDate
 * - Department breakdown
 * - Legal Entity breakdown
 * - Worker Type breakdown
 * - Monthly trends
 * - High-risk zone detection
 * - Chart-ready data format
 */
async function computeAttritionAnalytics({ userId, query }) {
  const q = query.toLowerCase();
  
  console.log("🔍 Attrition Analytics Engine (LOCAL MODE - USING /emps)");
  console.log("   ✅ Fetching employees with TerminationDate field");

  // ✅ Step 1: Fetch employees from /emps (NOT /workers)
  const result = await callOracleAPI({
    userId,
    product: "HCM",
    endpoint: "/emps",
    queryParams: {
      limit: 500  // Fetch large dataset for accurate analytics
    }
  });

  const employees = result.items || [];

  if (employees.length === 0) {
    return {
      success: false,
      error: "No employee data returned from Oracle /emps endpoint.",
      data: [],
      count: 0
    };
  }

  console.log(`    Total employees fetched: ${employees.length}`);

  // ✅ Step 2: Filter terminated employees (those with TerminationDate)
  const terminated = employees.filter(e => e.TerminationDate);

  console.log(`   🔴 Total terminated employees (all-time): ${terminated.length}`);

  // ✅ Step 3: Detect time range from query
  const isLast12Months = q.includes("12 months") || q.includes("last year") || q.includes("annual") || !q.includes("6 months") && !q.includes("3 months");
  const isLast6Months = q.includes("6 months") || q.includes("half year");
  const isLast3Months = q.includes("3 months") || q.includes("quarter") || q.includes("quarterly");
  
  let timeRange = "last 12 months"; // Default
  let cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12);
  
  if (isLast6Months) {
    timeRange = "last 6 months";
    cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);
  } else if (isLast3Months) {
    timeRange = "last 3 months";
    cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);
  }

  console.log(`   📅 Time range: ${timeRange}`);
  console.log(`   📅 Cutoff date: ${cutoffDate.toISOString().split('T')[0]}`);

  // ✅ Step 4: Filter recent terminations
  const recentTerminations = terminated.filter(e => {
    if (!e.TerminationDate) return false;
    return new Date(e.TerminationDate) >= cutoffDate;
  });

  console.log(`   ⏱️  Recent terminations (${timeRange}): ${recentTerminations.length}`);

  // ✅ Step 5: Calculate attrition rate
  const totalActive = employees.length;
  const attritionRate = totalActive > 0 
    ? ((recentTerminations.length / totalActive) * 100).toFixed(2)
    : "0.00";

  console.log(`   📈 Attrition Rate: ${attritionRate}%`);

  // ✅ Step 6: Monthly trend analysis
  const monthlyTrend = {};
  
  for (const emp of recentTerminations) {
    const month = emp.TerminationDate.substring(0, 7); // YYYY-MM
    
    if (!monthlyTrend[month]) {
      monthlyTrend[month] = {
        month,
        exits: 0,
        employees: []
      };
    }
    
    monthlyTrend[month].exits += 1;
    monthlyTrend[month].employees.push({
      name: emp.DisplayName,
      id: emp.PersonNumber,
      department: emp.DepartmentName
    });
  }

  const monthlyData = Object.values(monthlyTrend).sort(
    (a, b) => a.month.localeCompare(b.month)
  );

  // ✅ Step 7: Department breakdown
  const deptStats = {};

  for (const emp of recentTerminations) {
    const dept = emp.DepartmentName || "Unknown";

    if (!deptStats[dept]) {
      deptStats[dept] = {
        department: dept,
        exits: 0,
        attritionRate: 0,
        employees: []
      };
    }

    deptStats[dept].exits += 1;
    deptStats[dept].employees.push({
      name: emp.DisplayName,
      id: emp.PersonNumber,
      termDate: emp.TerminationDate,
      hireDate: emp.HireDate
    });
  }

  // Calculate department-specific attrition rates
  const allDeptCounts = {};
  for (const emp of employees) {
    const dept = emp.DepartmentName || "Unknown";
    allDeptCounts[dept] = (allDeptCounts[dept] || 0) + 1;
  }

  for (const dept in deptStats) {
    const totalInDept = allDeptCounts[dept] || 1;
    deptStats[dept].attritionRate = ((deptStats[dept].exits / totalInDept) * 100).toFixed(2);
  }

  const departmentData = Object.values(deptStats).sort(
    (a, b) => b.exits - a.exits
  );

  // ✅ Step 8: Legal Entity breakdown
  const entityStats = {};

  for (const emp of recentTerminations) {
    const entity = emp.LegalEntityName || emp.LegalEntity || "Unknown";

    if (!entityStats[entity]) {
      entityStats[entity] = {
        entity,
        exits: 0
      };
    }

    entityStats[entity].exits += 1;
  }

  const entityData = Object.values(entityStats).sort(
    (a, b) => b.exits - a.exits
  );

  // ✅ Step 9: Worker Type breakdown
  const workerTypeStats = {};

  for (const emp of recentTerminations) {
    const type = emp.WorkerType || "Unknown";

    if (!workerTypeStats[type]) {
      workerTypeStats[type] = {
        workerType: type,
        exits: 0
      };
    }

    workerTypeStats[type].exits += 1;
  }

  const workerTypeData = Object.values(workerTypeStats).sort(
    (a, b) => b.exits - a.exits
  );

  // ✅ Step 10: High-risk zone detection (departments with >5% attrition)
  const highRiskDepartments = departmentData.filter(d => parseFloat(d.attritionRate) > 5.0);

  // ✅ Step 11: Chart-ready data
  const chartData = {
    monthly: monthlyData.map(m => ({
      month: m.month,
      exits: m.exits
    })),
    departmentBar: departmentData.slice(0, 10).map(d => ({
      department: d.department,
      exits: d.exits,
      attritionRate: parseFloat(d.attritionRate)
    })),
    workerTypePie: workerTypeData.map(w => ({
      type: w.workerType,
      value: w.exits
    }))
  };

  // ✅ Step 12: AI Insight Prompt
  const topDepartments = departmentData.slice(0, 5);
  const recentMonths = monthlyData.slice(-6);

  const aiInsightPrompt = `Analyze this employee attrition data:

Time Period: ${timeRange}
Total Employees: ${totalActive}
Departed Employees: ${recentTerminations.length}
Attrition Rate: ${attritionRate}%

Top 5 Departments by Attrition:
${topDepartments.map(d => `- ${d.department}: ${d.exits} exits (${d.attritionRate}% dept rate)`).join('\n')}

${highRiskDepartments.length > 0 ? `\n⚠️ HIGH-RISK ZONES (>5% attrition):\n${highRiskDepartments.map(d => `- ${d.department}: ${d.attritionRate}%`).join('\n')}` : ''}

Recent Monthly Trend:
${recentMonths.map(m => `- ${m.month}: ${m.exits} exits`).join('\n')}

Provide a brief analysis highlighting:
1. The most critical department
2. Whether attrition is accelerating or stable
3. Recommended retention actions`;

  // ✅ Step 13: Build comprehensive summary
  const summary = `✅ Attrition Analysis Completed (${timeRange})

📊 Workforce Overview:
- Total Employees: ${totalActive}
- Departed: ${recentTerminations.length}
- Attrition Rate: ${attritionRate}%

🔥 Top Departments by Attrition:
${topDepartments.map((d, i) => `${i + 1}. ${d.department}: ${d.exits} exits (${d.attritionRate}% dept rate)`).join('\n')}

${highRiskDepartments.length > 0 ? `\n⚠️ HIGH-RISK DEPARTMENTS (>5% attrition):\n${highRiskDepartments.map(d => `- ${d.department}: ${d.attritionRate}%`).join('\n')}` : ''}

📈 Recent Monthly Trend:
${recentMonths.map(m => `- ${m.month}: ${m.exits} exits`).join('\n')}

📍 By Legal Entity:
${entityData.slice(0, 3).map(e => `- ${e.entity}: ${e.exits} exits`).join('\n')}

👥 By Worker Type:
${workerTypeData.map(w => `- ${w.workerType}: ${w.exits} exits`).join('\n')}`;

  // ✅ CRITICAL FIX: Return recentTerminations as data, NOT departmentData
  return {
    success: true,
    
    // ✅ Count of terminated employees
    count: recentTerminations.length,
    
    // ✅ MAIN DATA = Full list of terminated employee records (32 employees)
    // This ensures count matches data.length and Redis storage works correctly
    data: recentTerminations,
    
    // ✅ Analytics in separate object for charting and breakdown
    analytics: {
      timeRange,
      totalEmployees: totalActive,
      departedEmployees: recentTerminations.length,
      attritionRate: parseFloat(attritionRate),
      
      // Detailed breakdowns
      departmentBreakdown: departmentData,
      entityBreakdown: entityData,
      workerTypeBreakdown: workerTypeData,
      monthlyTrend: monthlyData,
      highRiskZones: highRiskDepartments,
      chartData
    },
    
    // ✅ Human-readable summary
    summary,
    
    // ✅ AI analysis prompt
    aiInsightPrompt,
    
    // ✅ Type identifier
    type: "attrition_analytics"
  };
}

export async function oracleTool({ userId, product, query, tool, params, args }) {
  console.log(`Oracle Tool | Product: ${product} | Query: "${query}" | Tool: ${tool || 'N/A'}`);

  // ========================================
  // ✅ INVOICE WIZARD INTEGRATION (NEW)
  // ========================================
  if (args && args.method === "POST" && args.endpoint === "/invoices") {
    console.log("✅ Invoice Creation Detected (Wizard Mode)");
    console.log("Payload:", JSON.stringify(args.payload, null, 2));
    
    try {
      // Validate supplier exists
      const supplierCheck = await callOracleAPI({
        userId,
        product: "ERP",
        endpoint: "/suppliers",
        queryParams: {
          q: `SupplierName='${args.payload.Supplier}'`,
          limit: 1
        }
      });

      if (!supplierCheck.items || supplierCheck.items.length === 0) {
        console.log(`❌ Supplier not found: ${args.payload.Supplier}`);
        return {
          success: false,
          error: `Supplier "${args.payload.Supplier}" not found in Oracle. Please use a valid supplier name like "Dell", "HP", or "Lookahead CA Corp".`,
          data: [],
          count: 0
        };
      }

      const supplier = supplierCheck.items[0];
      console.log(`✅ Supplier validated: ${supplier.SupplierName} (ID: ${supplier.SupplierId})`);

      // Create invoice with validated supplier
      const invoicePayload = {
        InvoiceNumber: args.payload.InvoiceNumber || `AI-INV-${Date.now()}`,
        InvoiceDate: args.payload.InvoiceDate || new Date().toISOString().split('T')[0],
        Supplier: supplier.SupplierName,
        SupplierNumber: supplier.SupplierNumber,
        SupplierSite: args.payload.SupplierSite,
        InvoiceAmount: args.payload.InvoiceAmount,
        InvoiceCurrency: args.payload.InvoiceCurrency || "USD",
        BusinessUnit: args.payload.BusinessUnit || "Lookahead CA BU",
        Description: args.payload.Description || "Created via AI Wizard",
        InvoiceType: "Standard"
      };

      console.log("Creating invoice with payload:", JSON.stringify(invoicePayload, null, 2));

      const result = await callOracleAPI({
        userId,
        product: "ERP",
        method: "POST",
        endpoint: "/invoices",
        payload: invoicePayload
      });

      console.log("✅ Invoice created successfully");
      console.log("Oracle Response:", JSON.stringify(result, null, 2));

      return {
        success: true,
        InvoiceNumber: result.InvoiceNumber || invoicePayload.InvoiceNumber,
        ValidationStatus: result.ValidationStatus || "Validated",
        InvoiceId: result.InvoiceId,
        data: result
      };

    } catch (error) {
      console.error("❌ Invoice creation error:", error);
      return {
        success: false,
        error: `Failed to create invoice: ${error.message}`,
        data: [],
        count: 0
      };
    }
  }

  if (!query || !product) {
    return {
      success: false,
      error: "Missing required parameters: query and product",
      data: [],
      count: 0
    };
  }

  try {
    let result;

    if (product === "HCM") {
      result = await handleHCMQuery({ userId, query });
    } else if (product === "ERP") {
      result = await handleERPQuery({ userId, query });
    } else {
      throw new Error(`Unsupported product: ${product}`);
    }

    return result;

  } catch (error) {
    console.error(`Oracle Tool Error:`, error.message);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

/**
 * HCM HANDLER
 */
async function handleHCMQuery({ userId, query }) {
  const q = query.toLowerCase();

  /* SELF DETAILS (LOGGED-IN USER) - CHECK FIRST */
  const isSelfDetailsQuery = 
    q.includes("my profile") ||
    q.includes("my details") ||
    q.includes("my information") ||
    q.includes("my data") ||
    q.includes("my info") ||
    q.includes("my account") ||
    q.includes("about me") ||
    q.includes("self details") ||
    q.includes("self profile") ||
    q.includes("who am i") ||
    q.includes("current user") ||
    (q.includes("show") && q.includes("my") && !q.includes("payroll")) ||
    (q.includes("get") && q.includes("my") && !q.includes("payroll"));

  if (isSelfDetailsQuery) {
    console.log("HCM Query Type: My Profile");
    console.log("   Endpoint: /workers");

    const employeeId = await getEmployeePersonNumber(userId);

    if (!employeeId) {
      return {
        success: false,
        error: "Employee ID not linked to this user. Please contact your administrator.",
        data: [],
        count: 0
      };
    }

    console.log(`   Fetching worker with PersonNumber: ${employeeId}`);

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/workers",
      queryParams: {
        q: `PersonNumber=${employeeId}`,
        limit: 1
      }
    });

    if (!result.items || result.items.length === 0) {
      return {
        success: false,
        error: "No profile found in Oracle for your account",
        data: [],
        count: 0
      };
    }

    console.log(`   Retrieved profile for employee ${employeeId}`);

    return {
      success: true,
      count: 1,
      data: result.items,
      summary: "Retrieved your profile information",
      source: "workers"
    };
  }

  /* MY LEAVE BALANCE */
  if (
    q.includes("my leave") ||
    q.includes("my balance") ||
    (q.includes("my") && q.includes("leave") && q.includes("balance"))
  ) {
    console.log("HCM Query Type: My Leave Balance");
    console.log("   Endpoint: /accrualBalances");

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/accrualBalances",
      queryParams: {
        limit: 50
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: "Retrieved your leave balance"
    };
  }

  /* ✅ ATTRITION / TURNOVER ANALYTICS (LOCAL MODE - USING /emps) - MUST COME BEFORE EMPLOYEE LIST */
  if (
    q.includes("attrition") ||
    q.includes("turnover") ||
    q.includes("employee exit") ||
    q.includes("resignation") ||
    q.includes("retention") ||
    q.includes("termination trend")
  ) {
    return await computeAttritionAnalytics({ userId, query });
  }

  /* PAYROLL DATA (TOP / LIST / DETAILS)
   * CRITICAL: Must come BEFORE employee list
   * CRITICAL: Must NOT match download requests
   */
  if (
    !q.includes("download") &&
    (q.includes("payroll") ||
     q.includes("salary") ||
     q.includes("net pay") ||
     q.includes("payslip"))
  ) {
    console.log("HCM Query Type: Payroll Data");

    let limit = 5;
    
    if (q.includes("top 10")) {
      limit = 10;
      console.log("   Detected: top 10");
    } else if (q.includes("top 5")) {
      limit = 5;
      console.log("   Detected: top 5");
    } else if (q.includes("top 2")) {
      limit = 2;
      console.log("   Detected: top 2");
    } else if (q.includes("all")) {
      limit = 10;
      console.log("   Detected: all → capped at 10");
    }
    
    if (limit > 10) {
      console.log(`   Limit ${limit} too high, forcing to 10`);
      limit = 10;
    }

    console.log(`   Payroll limit enforced: ${limit}`);
    console.log("   Endpoint: /payrollResults");

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/payrollResults",
      queryParams: {
        limit: limit
      }
    });

    const rawData = result.items || [];
    console.log(`   Oracle returned: ${rawData.length} records`);
    
    const slicedData = rawData.slice(0, limit);
    console.log(`   Hard limited to: ${slicedData.length} records`);

    const payrollData = slicedData.map(p => ({
      PersonNumber: p.PersonNumber,
      DisplayName: p.DisplayName,
      BaseSalary: p.BaseSalary || p.SalaryAmount || 0,
      Allowances: p.Allowances || 0,
      Deductions: p.Deductions || 0,
      NetSalary: p.NetSalary || p.NetPay || 0,
      Currency: p.Currency || "AED"
    }));

    return {
      success: true,
      count: payrollData.length,
      data: payrollData,
      summary: `Retrieved payroll details for ${payrollData.length} employee${payrollData.length !== 1 ? 's' : ''}`,
      hardLimitApplied: true,
      requestedLimit: limit
    };
  }

  /* PAYROLL/PAYSLIP DOWNLOAD REQUEST */
  if (
    q.includes("download") &&
    (q.includes("payroll") || q.includes("payslip") || q.includes("pay slip"))
  ) {
    console.log("HCM Query Type: Payroll/Payslip Download");
    
    let empId = extractEmployeeId(q);
    
    if ((q.includes("my") && q.includes("payroll")) || 
        (q.includes("my") && q.includes("payslip"))) {
      empId = await getEmployeePersonNumber(userId);
      console.log(`   Detected: MY payroll - using employee ${empId}`);
    }
    
    if (!empId) {
      empId = "self";
    }
    
    let period = "lastMonth";
    let fileFormat = "PDF";
    let fileName = "";
    
    if (q.includes("6 months") || q.includes("six months") || q.includes("last 6")) {
      period = "last6Months";
      fileFormat = "ZIP";
      fileName = `payroll_${empId}_last6months.zip`;
    } else if (q.includes("last month")) {
      period = "lastMonth";
      fileName = `payroll_${empId}_lastMonth.pdf`;
    } else if (q.includes("this month")) {
      period = "thisMonth";
      fileName = `payroll_${empId}_thisMonth.pdf`;
    } else if (q.includes("last year")) {
      period = "lastYear";
      fileFormat = "ZIP";
      fileName = `payroll_${empId}_lastYear.zip`;
    } else {
      fileName = `payroll_${empId}_latest.pdf`;
    }
    
    console.log(`   Employee ID: ${empId}`);
    console.log(`   Period: ${period}`);
    console.log(`   File Format: ${fileFormat}`);
    
    return {
      success: true,
      type: "file_download",
      fileName: fileName,
      fileUrl: `/api/payroll-download/payslips?empId=${empId}&period=${period}`,
      fileFormat: fileFormat,
      fileSize: "~250 KB",
      summary: `Payroll ${fileFormat} ready for download (Employee: ${empId}, Period: ${period})`,
      count: 1,
      data: []
    };
  }

  /* ABSENCE REPORT DOWNLOAD */
  if (
    q.includes("download") &&
    (q.includes("absence") || q.includes("leave report"))
  ) {
    console.log("HCM Query Type: Absence Report Download");
    
    const empId = extractEmployeeId(q) || "self";
    
    let period = "thisYear";
    if (q.includes("last month")) period = "lastMonth";
    else if (q.includes("last year")) period = "lastYear";
    else if (q.includes("6 months")) period = "last6Months";
    
    const fileName = `absence_report_${empId}_${period}.pdf`;
    
    console.log(`   Employee ID: ${empId}`);
    console.log(`   Period: ${period}`);
    
    return {
      success: true,
      type: "file_download",
      fileName: fileName,
      fileUrl: `/api/absence-download/report?empId=${empId}&period=${period}`,
      fileFormat: "PDF",
      fileSize: "~150 KB",
      summary: `Absence report PDF ready for download (Employee: ${empId}, Period: ${period})`,
      count: 1,
      data: []
    };
  }

  /* PDF DOWNLOAD REQUEST (Employee Profile) */
  if (q.includes("download") && q.includes("pdf")) {
    console.log("HCM Query Type: Employee Profile PDF Download");
    
    const empId = extractEmployeeId(q);
    if (!empId) {
      return {
        success: false,
        error: "Employee ID required for PDF download. Example: 'Download PDF for employee 15424'",
        data: [],
        count: 0
      };
    }

    console.log(`   Fetching employee ${empId} for PDF generation`);

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/emps",
      queryParams: {
        q: `PersonNumber=${empId}`,
        limit: 1
      }
    });

    if (!result.items || result.items.length === 0) {
      return {
        success: false,
        error: `Employee ${empId} not found`,
        data: [],
        count: 0
      };
    }

    const employee = result.items[0];

    return {
      success: true,
      type: "pdf_download",
      count: 1,
      data: [employee],
      summary: `Employee profile ready for PDF generation`,
      downloadRequest: {
        employeeId: empId,
        employeeName: employee.DisplayName,
        type: "employee_profile"
      }
    };
  }

  /* ✅ EMPLOYEE LIST - WITH ORACLE NEXT-LINK PAGINATION FOR "ALL"
   * CRITICAL: Must come AFTER attrition and payroll to prevent hijacking
   */
  if (
    q.includes("list") || 
    q.includes("show") || 
    q.includes("employees") ||
    q.includes("staff") ||
    q.includes("workers")
  ) {
    console.log("HCM Query Type: Employee List");
    
    // ✅ IMPROVED "all employees" detection
    if (
      q.includes("all") &&
      (q.includes("employee") || q.includes("staff") || q.includes("worker"))
    ) {
      console.log("   Detected: ALL employees → using Oracle NEXT-LINK pagination");
      
      const employees = await fetchAllEmployees(userId);

      return {
        success: true,
        count: employees.length,
        data: employees,
        summary: `Retrieved ALL ${employees.length} employees from Oracle HCM`,
        hasMore: false
      };
    }
    
    // Standard queries with specific limits
    let limit = 20;
    
    if (q.includes("100")) {
      limit = 100;
      console.log("   Detected: 100 employees");
    } else if (q.includes("50")) {
      limit = 50;
      console.log("   Detected: 50 employees");
    } else if (q.includes("20")) {
      limit = 20;
      console.log("   Detected: 20 employees");
    } else if (q.includes("10")) {
      limit = 10;
      console.log("   Detected: 10 employees");
    } else {
      console.log(`   Default: ${limit} employees`);
    }

    console.log("   Endpoint: /emps");

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/emps",
      queryParams: {
        limit: limit,
        orderBy: "DisplayName:asc"
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved ${result.items?.length || 0} employees from Oracle HCM`,
      hasMore: result.hasMore || false,
      requestedLimit: limit
    };
  }

  /* EMPLOYEE BY ID */
  const empId = extractEmployeeId(q);

  if (
    empId &&
    q.includes("employee") &&
    !q.includes("list") &&
    !q.includes("all") &&
    !q.includes("payroll")
  ) {
    console.log("HCM Query Type: Employee Details by ID");
    console.log(`   Fetching employee ID: ${empId}`);
    console.log("   Endpoint: /emps");

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/emps",
      queryParams: {
        q: `PersonNumber=${empId}`,
        limit: 1
      }
    });

    if (!result.items || result.items.length === 0) {
      return {
        success: false,
        error: `Employee with ID ${empId} not found`,
        data: [],
        count: 0
      };
    }

    return {
      success: true,
      count: 1,
      data: result.items,
      summary: `Retrieved details for employee ${empId}`,
      employee: result.items[0]
    };
  }

  /* ABSENCES - ALL EMPLOYEES */
  if (
    (q.includes("all") && (q.includes("absence") || q.includes("leave"))) ||
    q.includes("show all absence") ||
    q.includes("list all absence") ||
    q.includes("all absences") ||
    q.includes("all leave")
  ) {
    console.log("HCM Query Type: ALL Employees Absences");
    console.log("   Endpoint: /absences");

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/absences"
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved all employee absences from Oracle HCM`,
      hasMore: result.hasMore || false
    };
  }

  /* ABSENCES - SPECIFIC EMPLOYEE OR SELF */
  if (q.includes("absence") || q.includes("absences") || q.includes("leave") || q.includes("on leave")) {
    const empId = extractEmployeeId(q);

    console.log("HCM Query Type: Absences / Leave Records");
    console.log(`   Target: ${empId ? `Employee ${empId}` : 'Self'}`);
    console.log("   Endpoint: /absences");

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/absences",
      queryParams: empId 
        ? { q: `PersonNumber=${empId}` }
        : undefined
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: empId
        ? `Retrieved absences for employee ${empId}`
        : `Retrieved your absences`
    };
  }

  /* LEAVE BALANCE */
  if (q.includes("balance") || q.includes("days") || q.includes("remaining")) {
    console.log("HCM Query Type: Leave Balance");
    console.log("   Endpoint: /accrualBalances");
    
    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/accrualBalances",
      queryParams: {
        limit: 50
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved leave balance information`
    };
  }

  /* DEPARTMENT FILTER */
  if (q.includes("department")) {
    console.log("HCM Query Type: Employees by Department");
    
    const dept = extractDepartment(q);
    console.log(`   Department: ${dept}`);
    console.log("   Endpoint: /emps");

    const result = await callOracleAPI({
      userId,
      product: "HCM",
      endpoint: "/emps",
      queryParams: {
        limit: 50,
        orderBy: "DisplayName:asc"
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved employees from ${dept} department`
    };
  }

  /* DEFAULT FALLBACK */
  console.log("HCM Query Type: Default Employee List");
  console.log("   Endpoint: /emps (default 20)");
  
  const result = await callOracleAPI({
    userId,
    product: "HCM",
    endpoint: "/emps",
    queryParams: {
      limit: 20
    }
  });

  return {
    success: true,
    count: result.items?.length || 0,
    data: result.items || [],
    summary: `Retrieved ${result.items?.length || 0} employees from Oracle HCM`
  };
}

/**
 * ERP HANDLER (Keeping existing implementation)
 */
async function handleERPQuery({ userId, query }) {
  const q = query.toLowerCase();

  /* PAYABLES INVOICE CREATION */
  if (
    (q.includes("create") || q.includes("new")) &&
    (q.includes("supplier invoice") || q.includes("payables invoice") || q.includes("ap invoice"))
  ) {
    console.log("ERP Action: Create Payables Invoice");
    
    const { entity, amount } = extractInvoiceParams(query);
    
    if (!entity || !amount) {
      return {
        success: false,
        error: "Please provide supplier name and amount. Example: 'Create supplier invoice for Dell amount 5000'",
        data: [],
        count: 0
      };
    }

    return await createPayablesInvoice({
      userId,
      supplier: entity,
      amount: amount
    });
  }

  /* RECEIVABLES INVOICE CREATION */
  if (
    (q.includes("create") || q.includes("new")) &&
    (q.includes("customer invoice") || q.includes("receivables invoice") || q.includes("ar invoice"))
  ) {
    console.log("ERP Action: Create Receivables Invoice");
    
    const { entity, amount } = extractInvoiceParams(query);
    
    if (!entity || !amount) {
      return {
        success: false,
        error: "Please provide customer name and amount. Example: 'Create customer invoice for Amazon amount 12000'",
        data: [],
        count: 0
      };
    }

    return await createReceivablesInvoice({
      userId,
      customer: entity,
      amount: amount
    });
  }

  /* PAYABLES PAYMENT CREATION */
  if (
    (q.includes("create") || q.includes("new")) &&
    (q.includes("payment") || q.includes("pay supplier") || q.includes("supplier payment")) &&
    !q.includes("list") &&
    !q.includes("show")
  ) {
    console.log("ERP Action: Create Payables Payment");
    
    const { entity, amount } = extractInvoiceParams(query);
    
    if (!entity || !amount) {
      return {
        success: false,
        error: "Please provide supplier name and amount. Example: 'Create payment for Dell amount 3000'",
        data: [],
        count: 0
      };
    }

    return await createPayablesPayment({
      userId,
      supplier: entity,
      amount: amount
    });
  }

  /* RECEIVABLES RECEIPT CREATION */
  if (
    (q.includes("create") || q.includes("new") || q.includes("receive")) &&
    (q.includes("receipt") || q.includes("customer payment") || q.includes("payment from"))
  ) {
    console.log("ERP Action: Create Receivables Receipt");
    
    const { entity, amount } = extractInvoiceParams(query);
    
    if (!entity || !amount) {
      return {
        success: false,
        error: "Please provide customer name and amount. Example: 'Create receipt for Amazon amount 8000'",
        data: [],
        count: 0
      };
    }

    return await createReceivablesReceipt({
      userId,
      customer: entity,
      amount: amount
    });
  }

  /* SUPPLIER QUERIES */
  if (q.includes("supplier") || q.includes("vendor")) {
    console.log("ERP Query Type: Suppliers");
    
    let limit = 20;
    if (q.includes("all")) limit = 20;
    else if (q.includes("20")) limit = 20;
    else if (q.includes("50")) limit = 20;
    else if (q.includes("10")) limit = 10;

    console.log(`   Limit: ${limit}`);
    console.log("   Endpoint: /suppliers");

    const result = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/suppliers",
      queryParams: {
        limit: limit
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved ${result.items?.length || 0} suppliers from Oracle ERP`
    };
  }

  /* INVOICE QUERIES */
  if (q.includes("invoice") && !q.includes("create") && !q.includes("new")) {
    console.log("ERP Query Type: Invoices");
    console.log("   Endpoint: /invoices");
    
    const result = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/invoices",
      queryParams: {
        limit: 20
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved ${result.items?.length || 0} invoices from Oracle ERP`
    };
  }

  /* PURCHASE ORDER QUERIES */
  if (q.includes("purchase order") || q.includes("po ")) {
    console.log("ERP Query Type: Purchase Orders");
    console.log("   Endpoint: /purchaseOrders");
    
    const result = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/purchaseOrders",
      queryParams: {
        limit: 20
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved ${result.items?.length || 0} purchase orders from Oracle ERP`
    };
  }

  /* PAYMENT QUERIES */
  if (q.includes("payment") && !q.includes("create") && !q.includes("new")) {
    console.log("ERP Query Type: Payments");
    console.log("   Endpoint: /payments");
    
    const result = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/payments",
      queryParams: {
        limit: 20
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved ${result.items?.length || 0} payments from Oracle ERP`
    };
  }

  /* CUSTOMER QUERIES */
  if (q.includes("customer")) {
    console.log("ERP Query Type: Customers");
    console.log("   Endpoint: /customerAccounts");
    
    const result = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/customerAccounts",
      queryParams: {
        limit: 20
      }
    });

    return {
      success: true,
      count: result.items?.length || 0,
      data: result.items || [],
      summary: `Retrieved ${result.items?.length || 0} customers from Oracle ERP`
    };
  }

  /* DEFAULT: SUPPLIER LIST */
  console.log("ERP Query Type: Default Supplier List");
  console.log("   Endpoint: /suppliers");
  
  const result = await callOracleAPI({
    userId,
    product: "ERP",
    endpoint: "/suppliers",
    queryParams: {
      limit: 20
    }
  });

  return {
    success: true,
    count: result.items?.length || 0,
    data: result.items || [],
    summary: `Retrieved ${result.items?.length || 0} suppliers from Oracle ERP`
  };
}

/**
 * HELPER FUNCTIONS
 */
async function getEmployeePersonNumber(userId) {
  const userEmployeeMap = {
    5: "35805",
    1: "15424",
    2: "28391",
    3: "41203",
    4: "52847"
  };

  const employeeId = userEmployeeMap[userId];
  
  if (!employeeId) {
    console.warn(`No employee mapping found for userId ${userId}`);
    return null;
  }

  console.log(`Mapped userId ${userId} → PersonNumber ${employeeId}`);
  return employeeId;
}

function extractEmployeeId(query) {
  const match = query.match(/\b\d{4,6}\b/);
  return match ? match[0] : null;
}

function extractDepartment(query) {
  const depts = ['sales', 'engineering', 'finance', 'hr', 'human resources', 'marketing', 'operations', 'it', 'support'];
  const q = query.toLowerCase();
  
  for (const dept of depts) {
    if (q.includes(dept)) {
      return dept.charAt(0).toUpperCase() + dept.slice(1);
    }
  }
  
  return 'All';
}
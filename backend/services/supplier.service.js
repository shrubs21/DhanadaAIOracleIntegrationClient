import { callOracleAPI } from "../mcp-server/src/tools/oracle.client.js";

export async function validateSupplierSite({
  userId,
  supplierId,
  businessUnitId
}) {

  if (!userId || !supplierId || !businessUnitId) {
    return {
      status: "ERROR",
      message: "userId, supplierId and businessUnitId required"
    };
  }

  try {

    // 🔥 IMPORTANT: expand assignments
    const response = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: `/suppliers/${supplierId}/child/sites`,
      queryParams: {
        expand: "assignments",
        onlyData: true
      }
    });

    const allSites = response?.items || [];

    if (!allSites.length) {
      return { status: "NONE" };
    }

    // ✅ CORRECT ORACLE PAYABLES VALIDATION
    const validSites = allSites.filter(site =>
      site.Status === "ACTIVE" &&
      site.SitePurposePayFlag === true &&
      Array.isArray(site.assignments) &&
      site.assignments.some(a =>
        String(a.BillToBUId) === String(businessUnitId) &&
        a.Status === "ACTIVE"
      )
    );

    if (!validSites.length) {
      return { status: "NONE" };
    }

    return {
      status: "SUCCESS",
      sites: validSites.map(site => ({
        id: site.SupplierSiteId,
        name: site.SupplierSite
      }))
    };

  } catch (error) {

    return {
      status: "ERROR",
      message: error.message
    };
  }
}

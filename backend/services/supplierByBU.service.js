import { callOracleAPI } from "../mcp-server/src/tools/oracle.client.js";

export async function getSuppliersByBusinessUnit({ userId, businessUnitId }) {

  if (!userId || !businessUnitId) {
    return {
      status: "ERROR",
      message: "userId and businessUnitId required"
    };
  }

  try {

    const res = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/suppliers",
      queryParams: {
        expand: "sites",
        onlyData: true,
        limit: 500
      }
    });

    const suppliers = res?.items || [];

    const matchedSuppliers = suppliers
      .filter(supplier =>
        Array.isArray(supplier.sites) &&
        supplier.sites.some(site =>
          String(site.ProcurementBUId) === String(businessUnitId) &&
          site.Status === "ACTIVE" &&
          site.SitePurposePayFlag === true
        )
      )
      .map(supplier => ({
        id: supplier.SupplierId,
        name: supplier.Supplier
      }));

    if (!matchedSuppliers.length) {
      return { status: "NONE" };
    }

    return {
      status: "SUCCESS",
      suppliers: matchedSuppliers
    };

  } catch (error) {

    return {
      status: "ERROR",
      message: error.message
    };
  }
}

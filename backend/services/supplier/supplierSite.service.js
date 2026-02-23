import { callOracleAPI } from "../../mcp-server/src/tools/oracle.client.js";

export async function createSupplierSiteService(data) {

  const {
    userId,
    supplierId,
    procurementBUId,
    partySiteId   // 🔥 REQUIRED
  } = data;

  console.log("SupplierId:", supplierId);
  console.log("ProcurementBUId:", procurementBUId);
  console.log("PartySiteId:", partySiteId);

  const response = await callOracleAPI({
    userId,
    product: "MHI",
    method: "POST",
    endpoint: `/suppliers/${supplierId}/child/sites`,
    payload: {
      SupplierSite: `SITE_${procurementBUId}`,
      ProcurementBUId: procurementBUId,
      PartySiteId: partySiteId,   // 🔥 REQUIRED IN YOUR POD
      PurchasingSiteFlag: true,
      PaySiteFlag: true
    }
  });

  console.log("FULL SITE RESPONSE:", response);

  if (!response.SupplierSiteId) {
    throw new Error("Supplier Site creation failed.");
  }

  return {
    success: true,
    supplierSiteId: response.SupplierSiteId
  };
}
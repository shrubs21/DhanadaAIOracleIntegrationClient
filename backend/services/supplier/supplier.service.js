import { callOracleAPI } from "../../mcp-server/src/tools/oracle.client.js";

export async function createFullSupplierService(data) {
  const {
    userId,
    supplierName,
    supplierNumber,
    address1,
    city,
    country,                    // ISO 2-letter (AE, US)
    taxRegistrationNumber,
    procurementBUName,          // For logging only
    procurementBUId             // 🔥 REQUIRED FOR ORACLE SITE CREATION
  } = data;

  try {
    if (!procurementBUId) {
      throw new Error("ProcurementBUId is required for supplier site creation");
    }

    const payload = {
      Supplier: supplierName,
      SupplierNumber: supplierNumber,

      // Required lookup values
      SupplierTypeCode: "SUB-CONTRACTOR",
      BusinessRelationshipCode: "SPEND_AUTHORIZED",
      TaxOrganizationTypeCode: "INDIVIDUAL",

      TaxRegistrationCountryCode: country,
      TaxRegistrationNumber: taxRegistrationNumber,

      addresses: [
        {
          AddressName: "MAIN ADDRESS",
          CountryCode: country,
          AddressLine1: address1,
          City: city,
          AddressPurposeOrderingFlag: true
        }
      ],

      sites: [
        {
          SupplierSite: "MAIN ADDRESS",
          SupplierAddressName: "MAIN ADDRESS",

          // ✅ FIXED — Use ID not Name
          ProcurementBUId: procurementBUId,

          SitePurposePurchasingFlag: true,
          SitePurposePayFlag: true,
          SitePurposePrimaryPayFlag: true
        }
      ]
    };

    console.log("📦 Oracle Supplier Payload:", JSON.stringify(payload, null, 2));

    const supplierResponse = await callOracleAPI({
      userId,
      product: "MHI",
      method: "POST",
      endpoint: "/suppliers",
      payload
    });

    if (!supplierResponse?.SupplierId) {
      throw new Error("Supplier creation failed — Oracle did not return SupplierId");
    }

    return {
      success: true,
      supplierId: supplierResponse.SupplierId,
      supplierNumber: supplierResponse.SupplierNumber,
      supplierSiteId: supplierResponse.sites?.[0]?.SupplierSiteId || null,
      message: "Supplier created successfully (Header + Address + Site)"
    };

  } catch (error) {
    console.error("🚨 Supplier Creation Error:", error.message);
    throw new Error(error.message || "Supplier creation failed");
  }
}
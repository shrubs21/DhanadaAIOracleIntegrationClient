import { redis } from "../mcp-server/src/queue/redis.client.js";
import { callOracleAPI } from "../mcp-server/src/tools/oracle.client.js";

// ✅ USER-SCOPED CACHE KEY
const SUPPLIER_CACHE_KEY = (userId) => `oracle:suppliers:${userId}`;

export async function validateSupplier({ userId, supplierName }) {
  if (!supplierName) {
    return { status: "NONE" };
  }

  const q = supplierName.toLowerCase().trim();

  let suppliers = await redis.get(SUPPLIER_CACHE_KEY(userId));

  if (suppliers) {
    suppliers = JSON.parse(suppliers);
  } else {
    const res = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/suppliers",
      queryParams: { limit: 500 }
    });

    suppliers = (res.items || [])
      .filter(s => typeof s.Supplier === "string")
      .map(s => ({
        id: s.SupplierId,
        name: s.Supplier,
        nameLower: s.Supplier.toLowerCase()
      }));

    await redis.set(
      SUPPLIER_CACHE_KEY(userId),
      JSON.stringify(suppliers),
      "EX",
      3600
    );
  }

  const matches = suppliers.filter(s =>
    s.nameLower.includes(q)
  );

  if (matches.length === 0) {
    return { status: "NONE" };
  }

  if (matches.length === 1) {
    return { status: "SINGLE", supplier: matches[0] };
  }

  return { status: "MULTIPLE", options: matches };
}

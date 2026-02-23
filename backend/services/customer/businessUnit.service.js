import { callOracleAPI } from "../../mcp-server/src/tools/oracle.client.js";

export async function findBusinessUnitService(userId, businessUnitName) {

  const response = await callOracleAPI({
    userId,
    product: "ERP",
    endpoint: "/businessUnits",
    queryParams: { limit: 200 }
  });

  const units = response.items || [];

  return units.filter(u =>
    u.Name?.toLowerCase().includes(businessUnitName.toLowerCase())
  );
}
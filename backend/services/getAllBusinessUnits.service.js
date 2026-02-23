import { redis } from "../mcp-server/src/queue/redis.client.js";
import { callOracleAPI } from "../mcp-server/src/tools/oracle.client.js";

const BU_CACHE_KEY = (userId) => `oracle:businessUnits:${userId}`;

export async function getAllBusinessUnits({ userId }) {
  if (!userId) {
    return { status: "ERROR", message: "UserId required" };
  }

  let units = await redis.get(BU_CACHE_KEY(userId));

  if (units) {
    units = JSON.parse(units);
  } else {
    const res = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/finBusinessUnitsLOV",
      queryParams: { limit: 5000 }
    });

    units = (res.items || []).map(u => ({
      id: u.BusinessUnitId,
      name: u.BusinessUnitName
    }));

    await redis.set(
      BU_CACHE_KEY(userId),
      JSON.stringify(units),
      "EX",
      3600
    );
  }

  return {
    status: "ALL",
    options: units
  };
}

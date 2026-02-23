import { redis } from "../mcp-server/src/queue/redis.client.js";
import { callOracleAPI } from "../mcp-server/src/tools/oracle.client.js";

const BU_CACHE_KEY = (userId) => `oracle:businessUnits:${userId}`;

/**
 * Normalize string safely
 */
function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Smart ERP-style matching
 * - Case insensitive
 * - Partial match
 * - Word-start match
 */
function isMatch(name, query) {
  const n = normalize(name);
  const q = normalize(query);

  if (!n || !q) return false;

  // Direct contains
  if (n.includes(q)) return true;

  // Word-based matching
  const nameWords = n.split(" ");
  const queryWords = q.split(" ");

  return queryWords.every(qw =>
    nameWords.some(nw => nw.startsWith(qw))
  );
}

/**
 * Load Procurement BUs from supplier sites (Source of Truth)
 */
async function loadBusinessUnits(userId) {
  let cached = await redis.get(BU_CACHE_KEY(userId));

  if (cached) {
    return JSON.parse(cached);
  }

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

  const buMap = new Map();

  for (const supplier of suppliers) {
    if (Array.isArray(supplier.sites)) {
      for (const site of supplier.sites) {
        if (site.ProcurementBUId && site.ProcurementBU) {
          buMap.set(site.ProcurementBUId, site.ProcurementBU);
        }
      }
    }
  }

  const mapped = Array.from(buMap.entries()).map(([id, name]) => ({
    id: Number(id),
    name
  }));

  // Cache for 1 hour
  await redis.set(
    BU_CACHE_KEY(userId),
    JSON.stringify(mapped),
    "EX",
    3600
  );

  return mapped;
}

/**
 * Validate Business Unit (Procurement BU-based)
 */
export async function validateBusinessUnit({ userId, businessUnitName }) {
  try {
    if (!userId || !businessUnitName) {
      return { status: "NONE" };
    }

    const units = await loadBusinessUnits(userId);

    const matches = units.filter(u =>
      u.name && isMatch(u.name, businessUnitName)
    );

    if (matches.length === 0) {
      return { status: "NONE" };
    }

    if (matches.length === 1) {
      return {
        status: "SINGLE",
        businessUnit: {
          id: matches[0].id,
          name: matches[0].name
        }
      };
    }

    return {
      status: "MULTIPLE",
      options: matches.map(u => ({
        id: u.id,
        name: u.name
      }))
    };

  } catch (error) {
    console.error("validateBusinessUnit error:", error);
    return {
      status: "ERROR",
      message: error.message
    };
  }
}

/**
 * Get All Available Procurement BUs
 */
export async function getAllBusinessUnits({ userId }) {
  if (!userId) {
    return { status: "ERROR", message: "UserId required" };
  }

  try {
    const units = await loadBusinessUnits(userId);

    return {
      status: "ALL",
      options: units
    };

  } catch (error) {
    console.error("getAllBusinessUnits error:", error);
    return {
      status: "ERROR",
      message: error.message
    };
  }
}

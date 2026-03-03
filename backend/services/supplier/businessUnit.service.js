import { redis } from "../../mcp-server/src/queue/redis.client.js";
import { callOracleAPI } from "../../mcp-server/src/tools/oracle.client.js";

const BU_CACHE_KEY = (userId) => `oracle:procurementBU:${userId}`;

function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isMatch(name, query) {
  const n = normalize(name);
  const q = normalize(query);

  if (!n || !q) return false;

  if (n.includes(q)) return true;

  const nameWords = n.split(" ");
  const queryWords = q.split(" ");

  return queryWords.every(qw =>
    nameWords.some(nw => nw.startsWith(qw))
  );
}

/* =====================================================
   LOAD PROCUREMENT BUs (FROM SUPPLIER SITES)
===================================================== */
async function loadProcurementBUs(userId) {

  let cached = await redis.get(BU_CACHE_KEY(userId));
  if (cached) return JSON.parse(cached);

  const res = await callOracleAPI({
    userId,
    product: "MHI", // 🔥 IMPORTANT
    endpoint: "/suppliers",
    queryParams: {
      expand: "sites",
      limit: 50
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

  // Cache 1 hour
  await redis.set(
    BU_CACHE_KEY(userId),
    JSON.stringify(mapped),
    "EX",
    3600
  );

  return mapped;
}

/* =====================================================
   VALIDATE PROCUREMENT BU
===================================================== */
export async function validateProcurementBU({ userId, procurementBUName }) {

  if (!userId || !procurementBUName) {
    return { status: "NONE" };
  }

  const units = await loadProcurementBUs(userId);

  const matches = units.filter(u =>
    u.name && isMatch(u.name, procurementBUName)
  );

  if (matches.length === 0) {
    return { status: "NONE" };
  }

  if (matches.length === 1) {
    return {
      status: "SINGLE",
      procurementBU: matches[0]
    };
  }

  return {
    status: "MULTIPLE",
    options: matches
  };
}

/* =====================================================
   GET ALL PROCUREMENT BUs
===================================================== */
export async function getAllProcurementBUs({ userId }) {

  if (!userId) {
    return { status: "ERROR", message: "UserId required" };
  }

  const units = await loadProcurementBUs(userId);

  return {
    status: "ALL",
    options: units
  };
}
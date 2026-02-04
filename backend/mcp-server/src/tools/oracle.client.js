import fetch from "node-fetch";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379
});

/**
 * ✅ COMPLETE Oracle Fusion Cloud API Client - PRODUCTION READY
 * 
 * Supports:
 * - GET, POST, PUT, PATCH, DELETE methods
 * - Oracle NEXT-LINK pagination (fullUrl mode)
 * - Standard endpoint + queryParams mode
 * - HCM and ERP products
 * - Dynamic authentication from Redis
 * - Invoice creation, payments, and all CRUD operations
 * 
 * ✅ PRODUCTION FIXES APPLIED:
 * ✅ FIX #1: Added fullUrl parameter support for Oracle NEXT-LINK pagination
 * ✅ FIX #2: Handles both absolute URLs and relative URLs
 * ✅ FIX #3: Supports standard endpoint + queryParams mode
 * ✅ FIX #4: Proper Oracle-specific headers for POST/PUT/PATCH
 * 
 * @module oracle.client
 */

/**
 * Main Oracle API caller - Supports both standard and pagination modes
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID for authentication
 * @param {string} params.product - Product (HCM or ERP)
 * @param {string} [params.endpoint] - API endpoint (e.g., "/emps") - Standard mode
 * @param {Object} [params.queryParams] - Query parameters - Standard mode
 * @param {string} [params.fullUrl] - Full URL for pagination (Oracle next.href) - Pagination mode
 * @param {string} [params.method="GET"] - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {Object} [params.payload=null] - Request body for POST/PUT/PATCH
 * 
 * @returns {Promise<Object>} Oracle API response with items and links
 * 
 * @example Standard Mode (First Call)
 * const result = await callOracleAPI({
 *   userId: 1,
 *   product: "HCM",
 *   endpoint: "/emps",
 *   queryParams: { limit: 200 }
 * });
 * 
 * @example Pagination Mode (Following next.href)
 * const result = await callOracleAPI({
 *   userId: 1,
 *   product: "HCM",
 *   fullUrl: "/hcmRestApi/resources/11.13.18.05/emps?limit=200&offset=200"
 * });
 * 
 * @example POST Request (Create Invoice)
 * const result = await callOracleAPI({
 *   userId: 1,
 *   product: "ERP",
 *   endpoint: "/invoices",
 *   method: "POST",
 *   payload: { InvoiceNumber: "INV001", Amount: 5000 }
 * });
 */
export async function callOracleAPI({
  userId,
  product,
  endpoint,
  queryParams = {},
  fullUrl,      // ✅ NEW: Support for Oracle NEXT-LINK pagination
  method = "GET",
  payload = null
}) {
  
  let url;
  let skipAuth = false;

  // ✅ MODE 1: PAGINATION MODE (Oracle next.href)
  if (fullUrl) {
    console.log("🔄 Using fullUrl mode (Oracle pagination)");
    
    // Oracle returns full absolute URL in next.href
    // Example: "https://server.oracle.com/hcmRestApi/resources/11.13.18.05/emps?limit=200&offset=200"
    if (fullUrl.startsWith("http://") || fullUrl.startsWith("https://")) {
      url = fullUrl;
      skipAuth = false; // Still need auth for absolute URLs
      console.log("   Absolute URL detected:", url);
    }
    // First call or relative URL: "/emps?limit=200"
    else {
      // Get base URL from Redis
      const { baseUrl } = await getOracleConfig(userId, product);
      
      // Build full URL with product-specific path
      const apiPath = product === "HCM" 
        ? "/hcmRestApi/resources/11.13.18.05"
        : "/fscmRestApi/resources/11.13.18.05";
      
      url = `${baseUrl}${apiPath}${fullUrl}`;
      console.log("   Relative URL detected, building:", url);
    }
  }
  
  // ✅ MODE 2: STANDARD MODE (endpoint + queryParams)
  else {
    console.log("📍 Using standard mode (endpoint + queryParams)");
    
    if (!endpoint) {
      throw new Error("Either fullUrl or endpoint must be provided");
    }
    
    // Get base URL from Redis
    const { baseUrl } = await getOracleConfig(userId, product);
    
    // Build base URL with product-specific path
    const apiPath = product === "HCM" 
      ? "/hcmRestApi/resources/11.13.18.05"
      : "/fscmRestApi/resources/11.13.18.05";
    
    url = `${baseUrl}${apiPath}${endpoint}`;
    
    // Add query parameters if provided (only for GET requests)
    if (method === "GET" && queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    console.log("   Built URL:", url);
  }

  // Get Oracle credentials
  const { username, password } = await getOracleConfig(userId, product);

  // Create Basic Auth token
  const auth = Buffer
    .from(`${username}:${password}`)
    .toString("base64");

  console.log("🌐 Oracle API Request:", method, url);
  if (payload) {
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));
  }

  // ✅ Build headers with proper Oracle-specific Content-Type
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json"
  };

  // ✅ CRITICAL: Add Oracle-specific Content-Type for POST/PUT/PATCH
  // This is REQUIRED for Oracle Fusion REST APIs
  if (method !== "GET" && payload) {
    headers["Content-Type"] = "application/vnd.oracle.adf.resourceitem+json";
  }

  // Build request options
  const options = {
    method,
    headers
  };

  // Add body for POST/PUT/PATCH requests
  if (payload && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(payload);
  }

  // Make HTTP request
  try {
    const res = await fetch(url, options);

    // Handle errors with detailed logging
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Oracle API Error ${res.status}:`, errorText);
      throw new Error(`Oracle API error ${res.status}: ${errorText}`);
    }

    // Return response
    const responseData = await res.json();
    
    console.log(`✅ Oracle API Response: ${res.status} ${res.statusText}`);
    console.log(`   Items: ${responseData.items?.length || 0}`);
    console.log(`   Has Next Link: ${responseData.links?.some(l => l.rel === "next") ? 'Yes' : 'No'}`);
    
    return responseData;

  } catch (error) {
    console.error("❌ Oracle API Error:", error.message);
    throw error;
  }
}

/**
 * Helper function to get Oracle configuration from Redis
 * 
 * @param {number} userId - User ID
 * @param {string} product - Product (HCM or ERP)
 * @returns {Promise<Object>} { username, password, baseUrl }
 * @throws {Error} If configuration not found
 */
async function getOracleConfig(userId, product) {
  const redisKey = `user:${userId}:oracle:${product}`;
  const raw = await redis.get(redisKey);

  if (!raw) {
    throw new Error(`Oracle ${product} integration not found for user ${userId}`);
  }

  const config = JSON.parse(raw);
  
  if (!config.username || !config.password || !config.baseUrl) {
    throw new Error(`Invalid Oracle ${product} configuration for user ${userId}`);
  }

  return config;
}

/**
 * ✅ Helper to extract next page URL from Oracle response
 * 
 * @param {Object} oracleResponse - Oracle API response
 * @returns {string|null} Next page URL or null if no more pages
 * 
 * @example
 * const nextUrl = getNextPageUrl(response);
 * if (nextUrl) {
 *   const nextPage = await callOracleAPI({ userId, product, fullUrl: nextUrl });
 * }
 */
export function getNextPageUrl(oracleResponse) {
  if (!oracleResponse.links || !Array.isArray(oracleResponse.links)) {
    return null;
  }
  
  const nextLink = oracleResponse.links.find(link => link.rel === "next");
  
  return nextLink ? nextLink.href : null;
}

/**
 * ✅ Helper to check if there are more pages
 * 
 * @param {Object} oracleResponse - Oracle API response
 * @returns {boolean} True if more pages available
 */
export function hasMorePages(oracleResponse) {
  return getNextPageUrl(oracleResponse) !== null;
}

/**
 * ✅ Helper to fetch all pages automatically (use with caution for large datasets)
 * 
 * @param {Object} params - Same as callOracleAPI params
 * @param {number} [maxRecords=5000] - Safety cap on total records
 * @returns {Promise<Array>} All items from all pages
 * 
 * @example
 * const allEmployees = await fetchAllPages({
 *   userId: 1,
 *   product: "HCM",
 *   endpoint: "/emps",
 *   queryParams: { limit: 200 }
 * });
 */
export async function fetchAllPages({
  userId,
  product,
  endpoint,
  queryParams = {},
  maxRecords = 5000
}) {
  let allItems = [];
  let nextUrl = null;
  let isFirstCall = true;

  console.log("🔄 Fetching all pages...");

  while (true) {
    let response;

    if (isFirstCall) {
      // First call: use endpoint + queryParams
      response = await callOracleAPI({
        userId,
        product,
        endpoint,
        queryParams
      });
      isFirstCall = false;
    } else if (nextUrl) {
      // Subsequent calls: use fullUrl
      response = await callOracleAPI({
        userId,
        product,
        fullUrl: nextUrl
      });
    } else {
      // No more pages
      break;
    }

    // Stop if empty
    if (!response.items || response.items.length === 0) {
      console.log("   No more records");
      break;
    }

    // Add items
    allItems.push(...response.items);
    console.log(`   Fetched ${response.items.length} items (Total: ${allItems.length})`);

    // Check for next page
    nextUrl = getNextPageUrl(response);

    if (!nextUrl) {
      console.log("   No more pages");
      break;
    }

    // Safety cap
    if (allItems.length >= maxRecords) {
      console.log(`   Safety cap reached: ${allItems.length} records`);
      break;
    }
  }

  console.log(`✅ Fetched all pages: ${allItems.length} total items`);
  return allItems;
}

/**
 * ✅ Test Oracle Connection
 * Useful for debugging authentication issues
 * 
 * @param {number} userId - User ID
 * @param {string} product - Product (HCM or ERP)
 * @returns {Promise<Object>} { success, message, data }
 */
export async function testOracleConnection(userId, product) {
  try {
    const result = await callOracleAPI({
      userId,
      product,
      endpoint: product === "HCM" ? "/emps" : "/suppliers",
      queryParams: { limit: 1 }
    });

    return {
      success: true,
      message: `✅ Oracle ${product} connection successful`,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Oracle ${product} connection failed: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * ✅ CREATE Helper - Simplified POST request
 * 
 * @param {number} userId - User ID
 * @param {string} product - Product (HCM or ERP)
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Data to create
 * @returns {Promise<Object>} Created resource
 * 
 * @example
 * const invoice = await createResource(1, "ERP", "/invoices", {
 *   InvoiceNumber: "INV001",
 *   Amount: 5000
 * });
 */
export async function createResource(userId, product, endpoint, payload) {
  return await callOracleAPI({
    userId,
    product,
    endpoint,
    method: "POST",
    payload
  });
}

/**
 * ✅ UPDATE Helper - Simplified PUT/PATCH request
 * 
 * @param {number} userId - User ID
 * @param {string} product - Product (HCM or ERP)
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Data to update
 * @param {string} [method="PATCH"] - HTTP method (PUT or PATCH)
 * @returns {Promise<Object>} Updated resource
 * 
 * @example
 * const updated = await updateResource(1, "ERP", "/invoices/123", {
 *   Amount: 6000
 * });
 */
export async function updateResource(userId, product, endpoint, payload, method = "PATCH") {
  return await callOracleAPI({
    userId,
    product,
    endpoint,
    method,
    payload
  });
}

/**
 * ✅ DELETE Helper - Simplified DELETE request
 * 
 * @param {number} userId - User ID
 * @param {string} product - Product (HCM or ERP)
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Deletion result
 * 
 * @example
 * await deleteResource(1, "ERP", "/invoices/123");
 */
export async function deleteResource(userId, product, endpoint) {
  return await callOracleAPI({
    userId,
    product,
    endpoint,
    method: "DELETE"
  });
}

/**
 * ✅ GET Helper - Simplified GET request
 * 
 * @param {number} userId - User ID
 * @param {string} product - Product (HCM or ERP)
 * @param {string} endpoint - API endpoint
 * @param {Object} [queryParams={}] - Query parameters
 * @returns {Promise<Object>} Retrieved resources
 * 
 * @example
 * const employees = await getResource(1, "HCM", "/emps", { limit: 50 });
 */
export async function getResource(userId, product, endpoint, queryParams = {}) {
  return await callOracleAPI({
    userId,
    product,
    endpoint,
    queryParams
  });
}

/**
 * ✅ Export Redis instance for use in other modules
 */
export { redis };
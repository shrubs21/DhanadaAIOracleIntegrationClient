import { redis } from "../queue/redis.client.js";

/**
 * Save Oracle Fusion integration credentials
 * Stores in Redis (session-based, cleared on logout)
 */
export const saveOracleIntegration = async (req, res) => {
  try {
    const { instanceName, product, baseUrl, username, password } = req.body
    const userId = req.user.id

    // Validate required fields
    if (!instanceName || !product || !baseUrl || !username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields" 
      })
    }

    // Validate URL format
    try {
      new URL(baseUrl)
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid URL format" 
      })
    }

    // Store in Redis
    const redisKey = `user:${userId}:oracle:${product}`
    
    const integrationData = {
      instanceName,
      product,
      baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
      username,
      password, // In production, encrypt this
      connectedAt: new Date().toISOString(),
      status: 'connected'
    }

    await redis.set(redisKey, JSON.stringify(integrationData))

    console.log(`✓ Oracle ${product} integration saved for user ${userId}`)

    res.json({ 
      success: true,
      message: "Oracle integration saved successfully"
    })
  } catch (error) {
    console.error('✗ Save Oracle integration error:', error)
    res.status(500).json({ 
      success: false,
      message: "Failed to save Oracle integration" 
    })
  }
}

/**
 * Test Oracle connection with provided credentials
 */
export const testOracleConnection = async (req, res) => {
  try {
    const { baseUrl, username, password } = req.body

    // Validate required fields
    if (!baseUrl || !username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields" 
      })
    }

    // Validate URL format
    try {
      new URL(baseUrl)
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid URL format" 
      })
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${username}:${password}`).toString("base64")

    console.log(`⏳ Testing Oracle connection to ${baseUrl}...`)

    // Clean URL (remove trailing slash)
    const cleanUrl = baseUrl.replace(/\/$/, '')

    // Test connection to Oracle REST API
    const response = await fetch(
      `${cleanUrl}/fscmRestApi/resources/11.13.18.05/`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.log(`✗ Oracle connection failed: ${response.status}`)
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials or connection failed" 
      })
    }

    console.log(`✓ Oracle connection successful`)

    res.json({ 
      success: true,
      message: "Connection successful" 
    })
  } catch (error) {
    console.error('✗ Test Oracle connection error:', error)
    res.status(500).json({ 
      success: false,
      message: "Oracle connection failed. Please check your credentials and URL." 
    })
  }
}

/**
 * Get all Oracle integrations for current user
 */
export const getOracleInstances = async (req, res) => {
  try {
    const userId = req.user.id
    const instances = []

    // Check for HCM integration
    const hcmKey = `user:${userId}:oracle:HCM`
    const hcmData = await redis.get(hcmKey)
    if (hcmData) {
      const hcm = JSON.parse(hcmData)
      instances.push({
        id: 'HCM',
        ...hcm,
        password: undefined // Don't send password to frontend
      })
    }

    // Check for ERP integration
    const erpKey = `user:${userId}:oracle:ERP`
    const erpData = await redis.get(erpKey)
    if (erpData) {
      const erp = JSON.parse(erpData)
      instances.push({
        id: 'ERP',
        ...erp,
        password: undefined // Don't send password to frontend
      })
    }

    res.json({ 
      success: true,
      instances 
    })
  } catch (error) {
    console.error('✗ Get Oracle instances error:', error)
    res.status(500).json({ 
      success: false,
      message: "Failed to load Oracle instances" 
    })
  }
}

/**
 * Delete Oracle integration
 */
export const deleteOracleIntegration = async (req, res) => {
  try {
    const { instanceId } = req.params // instanceId is 'HCM' or 'ERP'
    const userId = req.user.id

    const redisKey = `user:${userId}:oracle:${instanceId}`
    
    const deleted = await redis.del(redisKey)

    if (deleted === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Integration not found" 
      })
    }

    console.log(`✓ Deleted Oracle ${instanceId} integration for user ${userId}`)

    res.json({ 
      success: true,
      message: "Integration deleted successfully" 
    })
  } catch (error) {
    console.error('✗ Delete Oracle integration error:', error)
    res.status(500).json({ 
      success: false,
      message: "Failed to delete integration" 
    })
  }
}

/**
 * Get Oracle credentials for MCP server
 * Internal use only - not exposed as public API
 */
export const getOracleCredentials = async (userId, product) => {
  try {
    const redisKey = `user:${userId}:oracle:${product}`
    const data = await redis.get(redisKey)
    
    if (!data) {
      return null
    }

    return JSON.parse(data)
  } catch (error) {
    console.error('✗ Get Oracle credentials error:', error)
    return null
  }
}

/**
 * Cleanup Oracle integrations on logout
 * Called from auth controller
 */
export const cleanupOracleIntegrations = async (userId) => {
  try {
    const hcmKey = `user:${userId}:oracle:HCM`
    const erpKey = `user:${userId}:oracle:ERP`
    
    await redis.del(hcmKey)
    await redis.del(erpKey)
    
    console.log(`✓ Cleaned up Oracle integrations for user ${userId}`)
  } catch (error) {
    console.error('✗ Cleanup Oracle integrations error:', error)
  }
}

export default {
  saveOracleIntegration,
  testOracleConnection,
  getOracleInstances,
  deleteOracleIntegration,
  getOracleCredentials,
  cleanupOracleIntegrations
}
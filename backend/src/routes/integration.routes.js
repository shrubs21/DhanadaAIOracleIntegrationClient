import express from 'express'
import { authenticateToken } from '../middlewares/auth.middleware.js'
import {
  saveOracleIntegration,
  testOracleConnection,
  getOracleInstances,
  deleteOracleIntegration
} from '../controllers/integration.controller.js'

const router = express.Router()

router.use(authenticateToken)

router.post('/oracle-fusion', saveOracleIntegration)
router.post('/test', testOracleConnection)
router.get('/instances', getOracleInstances)
router.delete('/oracle-fusion/:instanceId', deleteOracleIntegration)

export default router
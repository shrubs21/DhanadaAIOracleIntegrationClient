import express from 'express'
import { authenticateToken } from '../middlewares/auth.middleware.js'
import { upload, uploadFile, deleteFile } from '../controllers/file.controller.js'

const router = express.Router()

//  Upload file
router.post('/upload', authenticateToken, upload.single('file'), uploadFile)

//  Delete file
router.delete('/delete', authenticateToken, deleteFile)

export default router
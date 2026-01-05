import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import pdf from 'pdf-parse'

// 📁 Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

// 🔒 File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain'
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${file.mimetype} not supported`), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// 📤 Upload file endpoint
export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const file = req.file
    const fileData = {
      id: uuidv4(),
      filename: file.originalname,
      filepath: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }

    // 📄 Extract text from PDF
    if (file.mimetype === 'application/pdf') {
      try {
        const dataBuffer = fs.readFileSync(file.path)
        const pdfData = await pdf(dataBuffer)
        fileData.extractedText = pdfData.text
        fileData.pages = pdfData.numpages
      } catch (error) {
        console.error('PDF extraction error:', error)
        fileData.extractedText = 'Unable to extract text from PDF'
      }
    }

    // 🖼️ For images, create base64 preview
    if (file.mimetype.startsWith('image/')) {
      try {
        const imageBuffer = fs.readFileSync(file.path)
        const base64Image = imageBuffer.toString('base64')
        fileData.preview = `data:${file.mimetype};base64,${base64Image}`
        fileData.isImage = true
      } catch (error) {
        console.error('Image preview error:', error)
      }
    }

    res.json({
      success: true,
      file: fileData
    })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'File upload failed' })
  }
}

// 🗑️ Delete file
export async function deleteFile(req, res) {
  try {
    const { filepath } = req.body

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
    }

    res.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: 'File deletion failed' })
  }
}
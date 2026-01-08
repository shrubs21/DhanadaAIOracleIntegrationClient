import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')


// 📁 Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
  const uploadDir = path.join(process.cwd(), 'uploads')
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
    'application/pdf'
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
        fileData.isImage = false
        console.log(`✅ PDF processed: ${file.originalname} (${pdfData.numpages} pages)`)
      } catch (error) {
        console.error('PDF extraction error:', error)
        fileData.extractedText = 'Unable to extract text from PDF'
        fileData.pages = 0
        fileData.isImage = false
      }
    }

    // 🖼️ For images, mark as image
    if (file.mimetype.startsWith('image/')) {
      fileData.isImage = true
      console.log(`✅ Image uploaded: ${file.originalname}`)
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
      console.log(`✅ File deleted: ${filepath}`)
    }

    res.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: 'File deletion failed' })
  }
}
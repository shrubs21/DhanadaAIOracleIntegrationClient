import express from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { authenticateToken } from '../middlewares/auth.middleware.js';  // ✅ FIXED: middlewares (plural)

const router = express.Router();

// Middleware to authenticate all export routes
router.use(authenticateToken);

/**
 * Parse markdown table into structured data
 */
function parseMarkdownTable(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const tableLines = lines.filter(line => line.includes('|'));
  
  if (tableLines.length < 2) return null;
  
  // Extract headers
  const headers = tableLines[0]
    .split('|')
    .map(h => h.trim())
    .filter(h => h.length > 0);
  
  // Skip separator line (the one with dashes)
  const dataLines = tableLines.slice(2);
  
  // Extract data rows
  const rows = dataLines.map(line => {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      .slice(0, headers.length);
  });
  
  return { headers, rows };
}

/**
 * Export content as Excel spreadsheet
 * POST /api/export/excel
 * Body: { content: string }
 */
router.post('/excel', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log('📊 Generating Excel export for user:', req.user.id);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Oracle Export');

    // Check if content contains a table
    const tableData = parseMarkdownTable(content);
    
    if (tableData) {
      // Export as table
      const { headers, rows } = tableData;
      
      console.log(`✅ Detected table with ${headers.length} columns and ${rows.length} rows`);
      
      // Add headers with styling
      worksheet.addRow(headers);
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Add data rows
      rows.forEach(row => {
        worksheet.addRow(row);
      });
      
      // Auto-fit columns
      worksheet.columns.forEach((column, idx) => {
        let maxLength = headers[idx]?.length || 10;
        rows.forEach(row => {
          const cellLength = (row[idx]?.toString() || '').length;
          maxLength = Math.max(maxLength, cellLength);
        });
        column.width = Math.min(maxLength + 2, 50);
      });
      
      // Add borders to all cells
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
      
    } else {
      // Export as formatted text
      console.log('✅ Exporting as formatted text');
      const lines = content.split('\n');
      
      worksheet.columns = [
        { header: 'Content', key: 'content', width: 100 }
      ];
      
      // Add title
      worksheet.addRow(['Oracle AI Response']);
      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.addRow([]);
      
      // Add content lines
      lines.forEach(line => {
        if (line.trim()) {
          worksheet.addRow([line]);
        }
      });
      
      // Format content rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 2) {
          row.alignment = { wrapText: true, vertical: 'top' };
        }
      });
    }

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    console.log(`✅ Excel file generated: ${buffer.length} bytes`);
    
    // Send file
    const filename = `oracle-export-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

/**
 * Export content as PDF document
 * POST /api/export/pdf
 * Body: { content: string }
 */
router.post('/pdf', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log('📄 Generating PDF export for user:', req.user.id);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Set response headers
    const filename = `oracle-export-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add header
    doc.fillColor('#4F46E5')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('Oracle AI Assistant', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fillColor('#6B7280')
       .fontSize(10)
       .font('Helvetica')
       .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
    
    doc.moveDown(1.5);
    
    // Add horizontal line
    doc.strokeColor('#E5E7EB')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();
    
    doc.moveDown(1);

    // Check if content contains a table
    const tableData = parseMarkdownTable(content);
    
    if (tableData) {
      // Render table
      const { headers, rows } = tableData;
      
      console.log(`✅ Rendering PDF table with ${headers.length} columns and ${rows.length} rows`);
      
      // Table settings
      const tableTop = doc.y;
      const tableLeft = 50;
      const columnWidth = (545 - 50) / headers.length;
      const rowHeight = 25;
      
      // Draw header
      doc.fillColor('#4F46E5')
         .rect(tableLeft, tableTop, columnWidth * headers.length, rowHeight)
         .fill();
      
      doc.fillColor('#FFFFFF')
         .fontSize(10)
         .font('Helvetica-Bold');
      
      headers.forEach((header, idx) => {
        doc.text(
          header,
          tableLeft + (idx * columnWidth) + 5,
          tableTop + 7,
          {
            width: columnWidth - 10,
            align: 'left'
          }
        );
      });
      
      // Draw data rows
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(9);
      
      rows.forEach((row, rowIdx) => {
        const y = tableTop + ((rowIdx + 1) * rowHeight);
        
        // Check if we need a new page
        if (y > 700) {
          doc.addPage();
          return;
        }
        
        // Alternate row colors
        if (rowIdx % 2 === 0) {
          doc.fillColor('#F9FAFB')
             .rect(tableLeft, y, columnWidth * headers.length, rowHeight)
             .fill();
        }
        
        // Draw cell borders
        doc.strokeColor('#E5E7EB')
           .lineWidth(0.5);
        
        for (let i = 0; i <= headers.length; i++) {
          doc.moveTo(tableLeft + (i * columnWidth), y)
             .lineTo(tableLeft + (i * columnWidth), y + rowHeight)
             .stroke();
        }
        
        doc.moveTo(tableLeft, y)
           .lineTo(tableLeft + (columnWidth * headers.length), y)
           .stroke();
        doc.moveTo(tableLeft, y + rowHeight)
           .lineTo(tableLeft + (columnWidth * headers.length), y + rowHeight)
           .stroke();
        
        // Draw text
        doc.fillColor('#000000');
        row.forEach((cell, cellIdx) => {
          doc.text(
            cell || '',
            tableLeft + (cellIdx * columnWidth) + 5,
            y + 7,
            {
              width: columnWidth - 10,
              align: 'left',
              lineBreak: false,
              ellipsis: true
            }
          );
        });
      });
      
    } else {
      // Render formatted text
      console.log('✅ Rendering PDF as formatted text');
      
      doc.fillColor('#000000')
         .fontSize(11)
         .font('Helvetica');
      
      // Process content with basic markdown
      const lines = content.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) {
          doc.moveDown(0.5);
          continue;
        }
        
        // Handle headers
        if (line.startsWith('# ')) {
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .fillColor('#1F2937')
             .text(line.substring(2), { align: 'left' })
             .moveDown(0.5);
          doc.fontSize(11).font('Helvetica').fillColor('#000000');
        } else if (line.startsWith('## ')) {
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#374151')
             .text(line.substring(3), { align: 'left' })
             .moveDown(0.3);
          doc.fontSize(11).font('Helvetica').fillColor('#000000');
        } else if (line.startsWith('### ')) {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#4B5563')
             .text(line.substring(4), { align: 'left' })
             .moveDown(0.3);
          doc.fontSize(11).font('Helvetica').fillColor('#000000');
        }
        // Handle bullet points
        else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const bulletText = line.trim().substring(2);
          doc.text('• ' + bulletText, { indent: 20 });
        }
        // Handle numbered lists
        else if (/^\d+\.\s/.test(line.trim())) {
          doc.text(line.trim(), { indent: 20 });
        }
        // Regular text
        else {
          doc.text(line, { align: 'left' });
        }
        
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }
      }
    }

    // Add footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(8)
         .fillColor('#6B7280')
         .text(
           `Page ${i + 1} of ${pages.count}`,
           50,
           doc.page.height - 50,
           {
             align: 'center'
           }
         );
    }

    console.log(`✅ PDF generated with ${pages.count} page(s)`);

    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('❌ PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF file' });
  }
});

export default router;
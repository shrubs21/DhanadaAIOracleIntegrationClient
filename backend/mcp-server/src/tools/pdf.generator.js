import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate Employee Profile PDF
 */
export async function generateEmployeeProfilePDF(employee, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(24)
         .fillColor('#1a365d')
         .text('Employee Profile', { align: 'center' });
      
      doc.moveDown();
      
      // Employee Name and ID
      doc.fontSize(18)
         .fillColor('#000')
         .text(employee.DisplayName || 'N/A', { align: 'center' });
      
      doc.fontSize(12)
         .fillColor('#666')
         .text(`Employee ID: ${employee.PersonNumber}`, { align: 'center' });
      
      doc.moveDown(2);

      // Personal Information Section
      doc.fontSize(14)
         .fillColor('#2d3748')
         .text('Personal Information', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11);

      const personalInfo = [
        ['Full Name:', employee.DisplayName || 'Not provided'],
        ['First Name:', employee.FirstName || 'Not provided'],
        ['Last Name:', employee.LastName || 'Not provided'],
        ['Date of Birth:', employee.DateOfBirth || 'Not provided'],
        ['Gender:', employee.Gender === 'M' ? 'Male' : employee.Gender === 'F' ? 'Female' : 'Not specified'],
        ['Marital Status:', employee.MaritalStatus === 'M' ? 'Married' : employee.MaritalStatus === 'S' ? 'Single' : 'Not specified'],
      ];

      personalInfo.forEach(([label, value]) => {
        doc.fillColor('#000').font('Helvetica-Bold').text(label, { continued: true });
        doc.fillColor('#333').font('Helvetica').text(` ${value}`);
      });

      doc.moveDown();

      // Contact Information Section
      doc.fontSize(14)
         .fillColor('#2d3748')
         .font('Helvetica-Bold')
         .text('Contact Information', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11);

      const contactInfo = [
        ['Email:', employee.WorkEmail || 'Not provided'],
        ['Phone:', employee.WorkPhoneNumber || 'Not provided'],
        ['Address:', employee.AddressLine1 || 'Not provided'],
        ['City:', employee.City || 'Not provided'],
        ['Country:', employee.Country || 'Not provided'],
      ];

      contactInfo.forEach(([label, value]) => {
        doc.fillColor('#000').font('Helvetica-Bold').text(label, { continued: true });
        doc.fillColor('#333').font('Helvetica').text(` ${value}`);
      });

      doc.moveDown();

      // Employment Information Section
      doc.fontSize(14)
         .fillColor('#2d3748')
         .font('Helvetica-Bold')
         .text('Employment Information', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11);

      const employmentInfo = [
        ['Hire Date:', employee.HireDate || 'Not provided'],
        ['Worker Type:', employee.WorkerType === 'E' ? 'Employee' : 'Contractor'],
      ];

      employmentInfo.forEach(([label, value]) => {
        doc.fillColor('#000').font('Helvetica-Bold').text(label, { continued: true });
        doc.fillColor('#333').font('Helvetica').text(` ${value}`);
      });

      // Footer
      doc.moveDown(3);
      doc.fontSize(10)
         .fillColor('#999')
         .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}
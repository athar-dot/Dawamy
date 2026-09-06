/**
 * Print & PDF Export Utilities for Dawamy HR & Payroll System
 * Generates clean, high-resolution printable HTML documents and PDF files for payslips,
 * monthly payroll rosters, and salary advance vouchers.
 */

import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export interface PrintDocumentOptions {
  title: string;
  contentHtml: string;
  landscape?: boolean;
}

export interface ExportPdfOptions {
  elementId?: string;
  element?: HTMLElement | null;
  fileName: string;
  landscape?: boolean;
}

/**
 * Exports any DOM element to a crisp A4 PDF file and triggers automatic download.
 * Uses html-to-image to fully support modern CSS functions (oklab, oklch, flex, grid, and Arabic fonts).
 */
export async function exportElementToPdf({
  elementId,
  element,
  fileName,
  landscape = false,
}: ExportPdfOptions): Promise<boolean> {
  const target = element || (elementId ? document.getElementById(elementId) : null);
  if (!target) {
    console.error('Target element not found for PDF export');
    return false;
  }

  try {
    // Generate crisp high-DPI PNG data URL using native browser SVG foreignObject rendering
    const imgData = await toPng(target, {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#FFFFFF',
      cacheBust: true,
    });

    const pdf = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = landscape ? 297 : 210;
    const pageHeight = landscape ? 210 : 297;
    const margin = 8;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    // Load image to determine natural dimensions
    const img = new Image();
    img.src = imgData;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    });

    const imgWidth = img.naturalWidth || target.offsetWidth * 2.5;
    const imgHeight = img.naturalHeight || target.offsetHeight * 2.5;

    // Calculate dimensions to fit neatly on an A4 page without stretching or overflow
    const scaleFactor = Math.min(maxWidth / (imgWidth / 3.7795), maxHeight / (imgHeight / 3.7795));
    const finalWidth = (imgWidth / 3.7795) * scaleFactor;
    const finalHeight = (imgHeight / 3.7795) * scaleFactor;
    const posX = margin + (maxWidth - finalWidth) / 2;
    const posY = margin + (maxHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'PNG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');
    const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(cleanFileName);
    return true;
  } catch (error) {
    console.error('Failed to export PDF via html-to-image:', error);
    return false;
  }
}

/**
 * Builds the standard Dawamy CSS template for printable vouchers, slips, and rosters.
 */
export function getPrintDocumentHtml(title: string, contentHtml: string, landscape = false): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      @page {
        size: ${landscape ? 'A4 landscape' : 'A4 portrait'};
        margin: 10mm 12mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #1F2937;
        background: #FFF;
        margin: 0;
        padding: 12px;
        font-size: 13px;
        line-height: 1.5;
        direction: rtl;
      }
      @media screen {
        body {
          max-width: ${landscape ? '1050px' : '750px'};
          margin: 20px auto;
          padding: 24px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border-radius: 12px;
        }
        .screen-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #E5E7EB;
          justify-content: space-between;
          align-items: center;
        }
        .btn-print {
          background: #5E7153;
          color: white;
          border: none;
          padding: 10px 20px;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
      }
      @media print {
        .screen-toolbar {
          display: none !important;
        }
        body {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 8px 10px;
        border: 1px solid #E5E7EB;
        text-align: right;
      }
      th {
        background-color: #F9FAFB;
        font-weight: bold;
        color: #374151;
      }
      .header-box {
        border-bottom: 2px solid #5E7153;
        padding-bottom: 12px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .net-salary-box {
        background-color: #F4F6F2;
        border: 1.5px solid #5E7153;
        border-radius: 8px;
        padding: 12px 16px;
        margin-top: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .signatures-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 15px;
        margin-top: 24px;
        padding-top: 14px;
        border-top: 1px dashed #D1D5DB;
      }
      .sig-box {
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        background: #FAFAFA;
      }
      .sig-img {
        max-height: 48px;
        max-width: 140px;
        object-fit: contain;
        margin: 4px auto;
        display: block;
      }
      .stamp-box {
        display: inline-block;
        border: 2px dashed #5E7153;
        color: #5E7153;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        line-height: 56px;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        transform: rotate(-10deg);
        margin: 4px auto;
      }
    </style>
  </head>
  <body>
    <div class="screen-toolbar">
      <div style="font-weight: bold; color: #5E7153;">🖨️ معاينة المستند المعتمد للطباعة والتصدير</div>
      <button class="btn-print" onclick="window.print()">طباعة الآن (Print)</button>
    </div>
    ${contentHtml}
  </body>
</html>`;
}

/**
 * Triggers printing using isolated iframe or fallback popup window
 */
export function printHtmlDocument({ title, contentHtml, landscape = false }: PrintDocumentOptions): boolean {
  const html = getPrintDocumentHtml(title, contentHtml, landscape);

  try {
    // 1. First, try hidden iframe approach
    let printFrame = document.getElementById('dawamy-print-iframe') as HTMLIFrameElement | null;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'dawamy-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print intercepted, attempting fallback popup window:', err);
          // Fallback: Open clean popup window
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              try {
                printWindow.print();
              } catch (e) {
                console.error('Popup print failed:', e);
              }
            }, 300);
          } else {
            window.print();
          }
        }
      }, 250);
      return true;
    }
  } catch (e) {
    console.warn('Error in iframe print, trying direct popup:', e);
  }

  // 2. Direct Popup Fallback
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error('Popup print failed:', e);
        }
      }, 300);
      return true;
    }
  } catch (e) {
    console.error('Direct popup failed:', e);
  }

  // 3. Ultimate Fallback
  window.print();
  return true;
}

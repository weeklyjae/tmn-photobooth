// Print utilities for A4 layout and cut guides

/**
 * Create A4 print layout with multiple strips
 */
export function createA4PrintLayout(strips, poolSize = 4, cutGuides = true) {
  const A4_WIDTH = 210; // mm
  const A4_HEIGHT = 297; // mm
  const MARGIN = 5; // mm
  const CUT_GUIDE_WIDTH = 0.5; // mm

  const stripsPerPage = Math.min(strips.length, poolSize);
  const stripsPerRow = 2;
  const stripsPerCol = Math.ceil(poolSize / stripsPerRow);
  
  const availableWidth = A4_WIDTH - (MARGIN * 2);
  const availableHeight = A4_HEIGHT - (MARGIN * 2);
  
  const stripWidth = (availableWidth - (CUT_GUIDE_WIDTH * (stripsPerRow - 1))) / stripsPerRow;
  const stripHeight = (availableHeight - (CUT_GUIDE_WIDTH * (stripsPerCol - 1))) / stripsPerCol;

  return {
    stripsPerPage,
    stripsPerRow,
    stripsPerCol,
    stripWidth,
    stripHeight,
    margin: MARGIN,
    cutGuideWidth: cutGuides ? CUT_GUIDE_WIDTH : 0
  };
}

/**
 * Generate print HTML with strips arranged for A4
 */
export function generatePrintHTML(strips, layout, cutGuides = true) {
  const { stripsPerRow, stripWidth, stripHeight, margin, cutGuideWidth } = layout;
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Photobooth Print</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0;
          padding: ${margin}mm;
          display: flex;
          flex-wrap: wrap;
          gap: ${cutGuideWidth}mm;
          background: white;
        }
        .strip-container {
          width: ${stripWidth}mm;
          height: ${stripHeight}mm;
          position: relative;
          ${cutGuides ? 'border: 1px dashed #ccc;' : ''}
          box-sizing: border-box;
        }
        .strip-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        @media print {
          body {
            margin: 0;
            padding: ${margin}mm;
          }
        }
      </style>
    </head>
    <body>
  `;

  strips.forEach((strip, index) => {
    html += `
      <div class="strip-container">
        <img src="${strip}" alt="Photo strip ${index + 1}" />
      </div>
    `;
  });

  // Fill remaining slots with blank
  const remaining = layout.stripsPerPage - strips.length;
  for (let i = 0; i < remaining; i++) {
    html += `
      <div class="strip-container" style="background: #f5f5f5;">
        <!-- Empty slot -->
      </div>
    `;
  }

  html += `
    </body>
    </html>
  `;

  return html;
}

/**
 * Open print dialog with strips
 */
export function printStrips(strips, poolSize = 4, cutGuides = true) {
  const layout = createA4PrintLayout(strips, poolSize, cutGuides);
  const html = generatePrintHTML(strips, layout, cutGuides);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close window after print dialog closes (user may cancel)
      setTimeout(() => printWindow.close(), 1000);
    }, 250);
  };
}

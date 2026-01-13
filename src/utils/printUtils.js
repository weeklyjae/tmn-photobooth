// Print utilities for A4 layout and cut guides

/**
 * Create A4 print layout with multiple strips
 */
export function createA4PrintLayout(
  strips,
  poolSize = 5,
  {
    orientation = 'landscape', // 'portrait' | 'landscape'
    gapMm = 3, // spacing between strips (for cutting)
    marginMm = 4, // outer margin
  } = {},
) {
  // A4 size in mm
  const A4_PORTRAIT = { width: 210, height: 297 };
  const page = orientation === 'landscape'
    ? { width: A4_PORTRAIT.height, height: A4_PORTRAIT.width }
    : A4_PORTRAIT;

  const stripsPerPage = Math.min(strips.length, poolSize);

  // Practical, event-focused defaults:
  // - 5 strips: single row in landscape (matches your sample)
  // - 4 strips: 2x2
  // - 1-3 strips: single row
  let cols = 2;
  let rows = 2;
  if (poolSize === 5 && orientation === 'landscape') {
    cols = 5;
    rows = 1;
  } else if (poolSize <= 3) {
    cols = poolSize;
    rows = 1;
  } else if (poolSize === 4) {
    cols = 2;
    rows = 2;
  } else {
    cols = 2;
    rows = Math.ceil(poolSize / 2);
  }

  const availableWidth = page.width - (marginMm * 2) - (gapMm * (cols - 1));
  const availableHeight = page.height - (marginMm * 2) - (gapMm * (rows - 1));

  const stripWidth = availableWidth / cols;
  const stripHeight = availableHeight / rows;

  return {
    orientation,
    pageWidth: page.width,
    pageHeight: page.height,
    stripsPerPage: poolSize,
    cols,
    rows,
    stripWidth,
    stripHeight,
    gapMm,
    marginMm,
    toPrintCount: stripsPerPage,
  };
}

/**
 * Generate print HTML with strips arranged for A4
 */
export function generatePrintHTML(strips, layout, cutGuides = true) {
  const { orientation, pageWidth, pageHeight, cols, stripWidth, stripHeight, marginMm, gapMm } = layout;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Photobooth Print</title>
      <style>
        @page {
          size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
          margin: 0;
        }
        body {
          margin: 0;
          padding: ${marginMm}mm;
          width: ${pageWidth}mm;
          height: ${pageHeight}mm;
          display: grid;
          /* These will be recalculated after the first image loads */
          --cellW: ${stripWidth}mm;
          --cellH: ${stripHeight}mm;
          --gap: ${gapMm}mm;
          grid-template-columns: repeat(${cols}, var(--cellW));
          grid-auto-rows: var(--cellH);
          gap: var(--gap);
          background: white;
          align-content: start;
          justify-content: start;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .strip-container {
          width: var(--cellW);
          height: var(--cellH);
          position: relative;
          ${cutGuides ? 'outline: 0.6mm dashed rgba(0,0,0,0.25); outline-offset: -0.6mm;' : ''}
          box-sizing: border-box;
          overflow: hidden;
          background: white;
        }
        .strip-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        @media print {
          body {
            margin: 0;
            padding: ${marginMm}mm;
          }
        }
      </style>
    </head>
    <body>
  `;

  // Print up to the configured page capacity
  const toRender = strips.slice(0, layout.stripsPerPage);
  toRender.forEach((strip, index) => {
    html += `
      <div class="strip-container">
        <img src="${strip}" alt="Photo strip ${index + 1}" />
      </div>
    `;
  });

  // Fill remaining slots with blank
  const remaining = layout.stripsPerPage - toRender.length;
  for (let i = 0; i < remaining; i++) {
    html += `
      <div class="strip-container" style="background: #f5f5f5;">
        <!-- Empty slot -->
      </div>
    `;
  }

  // Script to dynamically fit cell size to strip image aspect ratio (prevents big blank space per strip)
  // Works best in Chromium print preview (Chrome/Edge).
  html += `
    <script>
      (function () {
        const cols = ${cols};
        const pageW = ${pageWidth};
        const pageH = ${pageHeight};
        const margin = ${marginMm};
        const baseGap = ${gapMm};
        const rows = 1;

        const firstImg = document.querySelector('.strip-container img');
        if (!firstImg) return;

        const update = () => {
          const nw = firstImg.naturalWidth || 0;
          const nh = firstImg.naturalHeight || 0;
          if (!nw || !nh) return;
          const ratio = nw / nh; // width / height

          // Available area in mm inside margins and gaps
          const availW0 = pageW - (margin * 2);
          const availH0 = pageH - (margin * 2);
          const availW = availW0 - (baseGap * (cols - 1));
          const availH = availH0 - (baseGap * (rows - 1));

          // Prefer using full height, then compute width by aspect ratio.
          let cellH = availH / rows;
          let cellW = cellH * ratio;

          // If too wide, clamp width and recompute height.
          const maxW = availW / cols;
          if (cellW > maxW) {
            cellW = maxW;
            cellH = cellW / ratio;
          }

          document.body.style.setProperty('--cellW', cellW.toFixed(3) + 'mm');
          document.body.style.setProperty('--cellH', cellH.toFixed(3) + 'mm');

          // If there's extra width left, distribute it into additional gap so it fills the page nicely.
          // This gives you bigger spacing for cutting (like your reference), while keeping at least baseGap.
          const usedW = (cellW * cols) + (baseGap * (cols - 1));
          const extraW = availW0 - usedW;
          let gap = baseGap;
          if (cols > 1 && extraW > 0) {
            gap = baseGap + (extraW / (cols - 1));
          }
          // Clamp gap so it doesn't get ridiculous on some printers
          gap = Math.min(Math.max(gap, baseGap), 12);
          document.body.style.setProperty('--gap', gap.toFixed(3) + 'mm');
        };

        if (firstImg.complete) {
          update();
        } else {
          firstImg.addEventListener('load', update, { once: true });
        }
      })();
    </script>
  `;

  html += `
    </body>
    </html>
  `;

  return html;
}

/**
 * Open print dialog with strips
 */
export function printStrips(
  strips,
  poolSize = 5,
  cutGuides = true,
  options = {},
) {
  const layout = createA4PrintLayout(strips, poolSize, options);
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

// QR code generation utilities
import QRCode from 'qrcode';

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(text, options = {}) {
  try {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };
    
    const dataURL = await QRCode.toDataURL(text, defaultOptions);
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Generate QR code as SVG
 */
export async function generateQRCodeSVG(text, options = {}) {
  try {
    const defaultOptions = {
      width: 300,
      margin: 2,
      ...options
    };
    
    const svg = await QRCode.toString(text, { type: 'svg', ...defaultOptions });
    return svg;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw error;
  }
}

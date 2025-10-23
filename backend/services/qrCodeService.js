import QRCode from 'qrcode';

/**
 * Generate QR code as data URL
 * @param {string} data - The data to encode in QR code
 * @returns {Promise<string>} - Base64 data URL of QR code image
 */
export const generateQRCodeDataURL = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#0F766E',  // Primary teal color
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code URL for room
 * @param {string} roomCode - The room code
 * @param {string} frontendUrl - Frontend base URL
 * @returns {string} - URL to join queue
 */
export const generateRoomJoinURL = (roomCode, frontendUrl) => {
  return `${frontendUrl}/join?room=${roomCode}`;
};

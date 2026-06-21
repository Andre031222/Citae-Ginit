// Worker singleton lazy: se crea en el primer uso y se reutiliza entre requests.

const Tesseract = require('tesseract.js');

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('spa+eng').catch(err => {
      // Si la creación falla (p.ej. sin red para descargar traineddata),
      // resetea para reintentar en el siguiente request.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

class OCRService {
  /**
   * Extrae el texto de una imagen.
   * @param {Buffer} imageBuffer
   * @returns {Promise<string>} texto reconocido (puede ser vacío)
   */
  async extractTextFromImage(imageBuffer) {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('La imagen está vacía o corrupta');
    }
    const worker = await getWorker();
    const { data } = await worker.recognize(imageBuffer);
    return (data.text || '').trim();
  }
}

module.exports = new OCRService();

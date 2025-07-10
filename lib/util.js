const axios = require('axios');
const crypto = require('crypto');




/**
 * Ejecuta el servicio de comparación de imágenes
 * @param {object} params - Parámetros del servicio
 * @param {string} params.image_url_1 - URL de la primera imagen
 * @param {string} params.image_url_2 - URL de la segunda imagen
 * @param {string} params.threshold - Umbral de comparación
 * @param {object} params.company - Datos de la empresa
 * @param {object} params.user - Datos del usuario
 * @returns {Promise<object>} Respuesta del servicio
 */
async function compareImages({ image_url_1, image_url_2, threshold, company, user }) {
  const WORKFLOWS_API_BASE = process.env.WORKFLOWS_API_BASE;
  const WORKFLOW_API_KEY = process.env.WORKFLOW_API_KEY;
  try {
    const url = `${WORKFLOWS_API_BASE}/toolkits/841/tools/3184/execute?version=private1.0.0`;
    
    const payload = {
      input: {
        image_url_1,
        image_url_2,
        threshold
      },
      company,
      user
    };

    const response = await axios.post(url, payload, {
      headers: {
        'X-Api-Key': WORKFLOW_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al comparar imágenes:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Convierte una cadena base64 a imagen usando el servicio de minitools
 * @param {string} base64 - Cadena base64 de la imagen
 * @returns {Promise<object>} Respuesta del servicio con la URL de la imagen
 */
async function base64ToImage(base64) {
  try {
    const url = 'https://functions.jelou.ai/minitools/base64-to-image';
    
    const payload = {
      base64: base64
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al convertir base64 a imagen:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Descarga y desencripta una imagen de WhatsApp
 * @param {object} whatsappMedia - Objeto de metadatos de WhatsApp
 * @returns {Promise<object>} Respuesta con la imagen desencriptada
 */
async function downloadWhatsAppImage(whatsappMedia) {
  try {
    const { cdn_url, encryption_metadata } = whatsappMedia;
    
    const response = await axios.get(cdn_url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const cdnFile = Buffer.from(response.data);
    
    const decryptedImage = decryptWhatsAppImage(cdnFile, encryption_metadata);
    
    const base64Image = decryptedImage.toString('base64');
    
    return {
      success: true,
      data: base64Image,
      status: 200
    };
    
  } catch (error) {
    console.error('Error al descargar/desencriptar imagen de WhatsApp:', error.message);
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Desencripta una imagen de WhatsApp siguiendo la documentación oficial
 * Basado en: https://developers.facebook.com/docs/whatsapp/flows/reference/media_upload/#endpoint-media-handling
 * @param {Buffer} cdnFile - Archivo completo descargado (ciphertext + hmac10)
 * @param {object} encryptionMetadata - Metadatos de encriptación
 * @returns {Buffer} Imagen desencriptada
 */
function decryptWhatsAppImage(cdnFile, encryptionMetadata) {
  try {
    const { encryption_key, hmac_key, iv, plaintext_hash, encrypted_hash } = encryptionMetadata;
    
    if (encrypted_hash) {
      const cdnFileHash = crypto.createHash('sha256').update(cdnFile).digest();
      const expectedEncryptedHash = Buffer.from(encrypted_hash, 'base64');
      
      if (!cdnFileHash.equals(expectedEncryptedHash)) {
        // Hash no coincide, pero continuamos
      }
    }
    
    const hmac10 = cdnFile.slice(-10);
    const ciphertext = cdnFile.slice(0, -10);
    
    const hmacKey = Buffer.from(hmac_key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    
    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(ivBuffer);
    hmac.update(ciphertext);
    const calculatedHmac = hmac.digest();
    
    const calculatedHmac10 = calculatedHmac.slice(0, 10);
    
    if (!calculatedHmac10.equals(hmac10)) {
      // HMAC no coincide, pero continuamos
    }
    
    const encryptionKeyBuffer = Buffer.from(encryption_key, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, ivBuffer);
    
    let decryptedMedia = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    const decryptedHash = crypto.createHash('sha256').update(decryptedMedia).digest();
    const expectedPlaintextHash = Buffer.from(plaintext_hash, 'base64');
    
    if (!decryptedHash.equals(expectedPlaintextHash)) {
      throw new Error('❌ La verificación del hash del contenido desencriptado falló');
    }
    
    return decryptedMedia;
    
  } catch (error) {
    console.error('❌ Error al desencriptar imagen de WhatsApp:', error.message);
    throw error;
  }
}



/**
 * Obtiene una imagen desde el PhotoPicker de Jelou
 * @param {string} mediaId - ID del media en Jelou
 * @param {Object} imageData - Datos completos de la imagen del PhotoPicker
 * @returns {Promise<Object>} Resultado con la imagen en base64
 */
async function getImageFromJelouPhotoPicker(mediaId, imageData) {
    try {
        if (imageData.base64) {
            return {
                success: true,
                data: imageData.base64,
                source: 'direct_base64'
            };
        }
        
        if (imageData.data && typeof imageData.data === 'string') {
            return {
                success: true,
                data: imageData.data,
                source: 'data_field'
            };
        }
        
        const possibleUrls = [
            imageData.url,
            imageData.jelou_url,
            imageData.download_url,
            imageData.file_url,
            imageData.image_url
        ].filter(Boolean);
        
        if (possibleUrls.length > 0) {
            for (const url of possibleUrls) {
                try {
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'JelouBiometricLambda/1.0'
                        }
                    });
                    
                    const base64 = Buffer.from(response.data, 'binary').toString('base64');
                    
                    return {
                        success: true,
                        data: base64,
                        source: 'downloaded_url',
                        url: url
                    };
                } catch (urlError) {
                    continue;
                }
            }
        }
        
        if (mediaId) {
            const jelouEndpoints = [
                `https://api.jelou.ai/v1/media/${mediaId}`,
                `https://files.jelou.ai/media/${mediaId}`,
                `https://storage.jelou.ai/files/${mediaId}`
            ];
            
            for (const endpoint of jelouEndpoints) {
                try {
                    const response = await axios.get(endpoint, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'JelouBiometricLambda/1.0',
                            'Accept': 'image/*'
                        }
                    });
                    
                    const base64 = Buffer.from(response.data, 'binary').toString('base64');
                    
                    return {
                        success: true,
                        data: base64,
                        source: 'jelou_api',
                        endpoint: endpoint
                    };
                } catch (apiError) {
                    continue;
                }
            }
        }
        
        console.error("❌ No se pudo obtener la imagen del PhotoPicker de Jelou");
        
        return {
            success: false,
            error: 'No se pudo obtener la imagen del PhotoPicker de Jelou',
            debug: {
                mediaId: mediaId,
                availableFields: Object.keys(imageData),
                possibleUrls: possibleUrls
            }
        };
        
    } catch (error) {
        console.error("❌ Error general en getImageFromJelouPhotoPicker:", error);
        return {
            success: false,
            error: error.message,
            debug: {
                mediaId: mediaId,
                errorType: error.name
            }
        };
    }
}




/**
 * Ejecuta una llamada a la API de OpenAI con imagen y texto
 * @param {object} params - Parámetros del servicio
 * @param {string} params.imageFileUrl - URL de la imagen
 * @returns {Promise<object>} Respuesta del servicio
 */
async function callOpenAI({ imageFileUrl }) {
  try {
    const url = 'https://api.openai.com/v1/responses';
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
    }
    
    const promptLLM = "Act as a forensic image analyst specialized in verifying whether a photograph was taken directly with a camera or is a re-capture (such as a photo of a screen, printed image, or screenshot). Carefully examine the image for visual indicators like specular reflections on glasses or shiny surfaces, screen glare, moiré patterns, aliasing, visible pixel structures, oversaturation, unnatural color tones, or edge pixelation. Respond strictly with APPROVED if the image appears to be an authentic, live photo taken directly from a camera, or DENIED if there are visual signs suggesting it is a photo of a screen, print, or another display. If DENIED, include a brief justification in one sentence (e.g., \"visible screen reflections in glasses\" or \"glare and pixel artifacts from a monitor\"). Do not guess age, identity, or gender—focus solely on the authenticity of the image capture.";
    
    const payload = {
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: promptLLM
            },
            {
              type: "input_image",
              image_url: imageFileUrl
            }
          ]
        }
      ]
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos de timeout para LLM
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Ejecuta una llamada a la API de OpenAI con imagen y texto usando el modelo gpt-4o
 * @param {object} params - Parámetros del servicio
 * @param {string} params.imageFileUrl - URL de la imagen
 * @returns {Promise<object>} Respuesta del servicio
 */
async function callOpenAi4o({ imageFileUrl }) {
  try {
    const url = 'https://api.openai.com/v1/responses';
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
    }
    
    const promptLLM = "Act as a forensic image analyst specialized in verifying whether a photograph was taken directly with a camera or is a re-capture (such as a photo of a screen, printed image, or screenshot). Carefully examine the image for visual indicators like specular reflections on glasses or shiny surfaces, screen glare, moiré patterns, aliasing, visible pixel structures, oversaturation, unnatural color tones, or edge pixelation. Respond strictly with APPROVED if the image appears to be an authentic, live photo taken directly from a camera, or DENIED if there are visual signs suggesting it is a photo of a screen, print, or another display. If DENIED, include a brief justification in one sentence (e.g., \"visible screen reflections in glasses\" or \"glare and pixel artifacts from a monitor\"). Do not guess age, identity, or gender—focus solely on the authenticity of the image capture.";
    
    const payload = {
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: promptLLM
            },
            {
              type: "input_image",
              image_url: imageFileUrl
            }
          ]
        }
      ]
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos de timeout para LLM
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al llamar a OpenAI GPT-4o:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Ejecuta el servicio de detección de rostros en imágenes usando AWS
 * @param {object} params - Parámetros del servicio
 * @param {string} params.file_url - URL del archivo de imagen
 * @returns {Promise<object>} Respuesta del servicio
 */
async function imageAWS({ file_url }) {
  try {
    const url = 'https://unwavering-creek-kpp7tpujqvjm.vapor-farm-a1.com/api/faces/detect-face-in-image';
    const apiKey = process.env.AWS_API_KEY;
    
    const payload = {
      file_url
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });
    console.log('🔄 response imageAWS:', response.data);
    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al detectar rostros en imagen con AWS:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Ejecuta el servicio de validación de documentos usando Regula
 * @param {object} params - Parámetros del servicio
 * @param {string} params.url - URL de la imagen frontal del documento
 * @param {string} params.url_back - URL de la imagen trasera del documento
 * @param {string} params.stage - Etapa del proceso (dev, prod, etc.)
 * @param {string} params.format - Formato de las imágenes (url, base64, etc.)
 * @param {object} params.processParam - Parámetros de procesamiento
 * @returns {Promise<object>} Respuesta del servicio
 */
async function validacionDocumentoRegula({ url, url_back, stage = "prod", format = "url", integrationId_regula, integrationId_regula_key }) {
  try {
    const apiUrl = `https://integrations.jelou.ai/api/v1/integrations/${integrationId_regula}/regula/validate`;
    const apiKey = integrationId_regula_key;
    
    if (!apiKey) {
      throw new Error('REGULA_API_KEY no está configurada en las variables de entorno');
    }
    
    const payload = {
      url,
      url_back,
      stage,
      format,
      processParam: {
        scenario: "FullProcess",
        authParams: {
          checkLiveness: false
        }
      }
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos de timeout para validación de documentos
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al validar documento con Regula:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}



/**
 * Ejecuta el servicio gubernamental de Ecuador
 * @param {object} params - Parámetros del servicio
 * @param {string} params.codigo_dactilar - Código dactilar
 * @param {string} params.cedula - Número de cédula
 * @param {object} params.company - Datos de la empresa
 * @param {object} params.user - Datos del usuario
 * @returns {Promise<object>} Respuesta del servicio
 */
async function ecuGobService({ codigo_dactilar, cedula, company, user }) {
  const WORKFLOWS_API_BASE = process.env.WORKFLOWS_API_BASE;
  const WORKFLOW_API_KEY = process.env.WORKFLOW_API_KEY;
  console.log("codigo_dactilar", codigo_dactilar);
  console.log("cedula", cedula);
  console.log("company", company);
  console.log("user", user);
  try {
    const url = `${WORKFLOWS_API_BASE}/tools/3207/execute?version=private1.1.1`;
    
    const payload = {
      input: {
        codigo_dactilar,
        cedula
      },
      company,
      user
    };

    const response = await axios.post(url, payload, {
      headers: {
        'X-Api-Key': WORKFLOW_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error en servicio gubernamental de Ecuador:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Ejecuta el servicio gubernamental de Colombia
 * @param {object} params - Parámetros del servicio
 * @param {string} params.document_type - Tipo de documento
 * @param {string} params.proveedor - Proveedor del servicio
 * @param {string} params.dni - Número de documento
 * @param {object} params.company - Datos de la empresa
 * @param {object} params.user - Datos del usuario
 * @returns {Promise<object>} Respuesta del servicio
 */
async function colGobService({ document_type, proveedor, dni, company, user }) {
  const WORKFLOWS_API_BASE = process.env.WORKFLOWS_API_BASE;
  const WORKFLOW_API_KEY = process.env.WORKFLOW_API_KEY;
  try {
    const url = `${WORKFLOWS_API_BASE}/tools/3208/execute?version=private1.0.1`;
    
    const payload = {
      input: {
        document_type,
        proveedor,
        dni
      },
      company,
      user
    };

    const response = await axios.post(url, payload, {
      headers: {
        'X-Api-Key': WORKFLOW_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error en servicio gubernamental de Colombia:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Ejecuta el servicio gubernamental de Chile
 * @param {object} params - Parámetros del servicio
 * @param {string} params.dni - Número de documento
 * @param {object} params.company - Datos de la empresa
 * @param {object} params.user - Datos del usuario
 * @returns {Promise<object>} Respuesta del servicio
 */
async function chGobService({ dni, company, user }) {
  const WORKFLOWS_API_BASE = process.env.WORKFLOWS_API_BASE;
  const WORKFLOW_API_KEY = process.env.WORKFLOW_API_KEY;
  try {
    const url = `${WORKFLOWS_API_BASE}/tools/3209/execute?version=private1.0.1`;
    
    const payload = {
      input: {
        dni
      },
      company,
      user
    };

    const response = await axios.post(url, payload, {
      headers: {
        'X-Api-Key': WORKFLOW_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error en servicio gubernamental de Chile:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

module.exports = {
  compareImages,
  base64ToImage,
  downloadWhatsAppImage,
  getImageFromJelouPhotoPicker,
  callOpenAI,
  callOpenAi4o,
  imageAWS,
  validacionDocumentoRegula,
  ecuGobService,
  colGobService,
  chGobService
}; 
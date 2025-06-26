const axios = require('axios');
const crypto = require('crypto');

const JELOU_API_BASE = 'https://api.jelou.ai/v1';
const WORKFLOWS_API_BASE = 'https://workflows.jelou.ai/v1';

const JELOU_AUTH = 'Basic cFM1T2lrUUt2SFUzM1YyaUN2STdVc0NnTGtaTzZFOUY6VHl4ZXhsUl9EUk53MEV4LWd2ZmZZcldaUmhZc3U0amM1LU9MbU5PS2pkQXVRMlY2YW95WFEyVXAybVA3aUFhbg==';
const WORKFLOWS_API_KEY = '9|dW7EBTcokrMHHqD7nXSQieLQ9MgKeAW101Y8p_qL';
const WORKFLOW_API_KEY = '1438|5gfPs5iEeDXwbtxkTNzQYwyjOTFSrwlfAw3Io84i';

/**
 * Ejecuta la validación de liveness en el servicio de Jelou
 * @param {object} params - Parámetros del workflow
 * @param {string} params.imageFileUrl - URL de la imagen
 * @param {string} params.provider - Proveedor del servicio
 * @param {object} params.company - Datos de la empresa
 * @param {object} params.user - Datos del usuario
 * @returns {Promise<object>} Respuesta del workflow
 */
async function validateLiveness({ imageFileUrl, provider, company, user }) {
  try {
    const url = process.env.WORKFLOW_URL || 'https://workflows.jelou.ai/v1/toolkits/850/tools/4403/execute?version=1.0.9-private';
    const apiKey = process.env.WORKFLOW_API_KEY || '1438|5gfPs5iEeDXwbtxkTNzQYwyjOTFSrwlfAw3Io84i';

    const payload = {
      input: {
        imageFileUrl,
        provider
      },
      company,
      user
    };

    console.log('Ejecutando validación de liveness con payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    console.log('Respuesta de validación de liveness:', response.status, JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al validar liveness:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Realiza una petición HTTP GET
 * @param {string} url - URL de la petición
 * @param {object} headers - Headers opcionales
 * @returns {Promise<object>} Respuesta de la API
 */
async function httpGet(url, headers = {}) {
  try {
    const response = await axios.get(url, { headers });
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Valida si un objeto tiene las propiedades requeridas
 * @param {object} obj - Objeto a validar
 * @param {string[]} requiredFields - Campos requeridos
 * @returns {object} Resultado de la validación
 */
function validateRequired(obj, requiredFields) {
  const missing = requiredFields.filter(field => !obj[field]);
  return {
    isValid: missing.length === 0,
    missing: missing
  };
}

/**
 * Valida la estructura de los datos de company
 * @param {object} company - Datos de la empresa
 * @returns {object} Resultado de la validación
 */
function validateCompany(company) {
  const requiredFields = ['id', 'name', 'clientId', 'clientSecret', 'socketId'];
  return validateRequired(company, requiredFields);
}

/**
 * Valida la estructura de los datos de user
 * @param {object} user - Datos del usuario
 * @returns {object} Resultado de la validación
 */
function validateUser(user) {
  const requiredFields = ['id', 'socketId', 'referenceId', 'names', 'botId', 'roomId', 'legalId'];
  return validateRequired(user, requiredFields);
}

/**
 * Obtiene la información de la compañía
 * @param {string} companyId - ID de la compañía
 * @returns {Promise<Object>} Datos de la compañía
 */
async function getCompanyInfo(companyId) {
  try {
    const response = await axios.get(`${JELOU_API_BASE}/company/${companyId}`, {
      headers: {
        'Authorization': JELOU_AUTH,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener información de la compañía:', error.message);
    throw new Error('Error al obtener información de la compañía');
  }
}

/**
 * Obtiene los registros de memoria del bot
 * @param {string} botId - ID del bot
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Registros de memoria
 */
async function getBotMemoryRecords(botId, userId) {
  try {
    const response = await axios.get(`${WORKFLOWS_API_BASE}/memory/all_records`, {
      params: {
        botId,
        userId
      },
      headers: {
        'X-Api-Key': WORKFLOWS_API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener registros de memoria:', error.message);
    throw new Error('Error al obtener registros de memoria');
  }
}

/**
 * Ejecuta el servicio de verificación de documentos
 * @param {object} params - Parámetros del servicio
 * @param {string} params.url_image_front - URL de la imagen frontal del documento
 * @param {string} params.url_image_back - URL de la imagen trasera del documento
 * @param {object} params.company - Datos de la empresa
 * @param {object} params.user - Datos del usuario
 * @returns {Promise<object>} Respuesta del servicio
 */
async function verifyDocument({ url_image_front, url_image_back, company, user }) {
  try {
    const url = `${WORKFLOWS_API_BASE}/toolkits/850/tools/3231/execute?version=1.5.4-private`;
    
    const payload = {
      input: {
        url_image_front,
        url_image_back
      },
      company,
      user
    };

    console.log('Ejecutando verificación de documento con payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: {
        'X-Api-Key': WORKFLOW_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    console.log('Respuesta de verificación de documento:', response.status, response.data);

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('Error al verificar documento:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

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

    console.log('Ejecutando comparación de imágenes con payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: {
        'X-Api-Key': WORKFLOW_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    console.log('Respuesta de comparación de imágenes:', response.status, response.data);

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

    console.log('Ejecutando conversión de base64 a imagen');

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos de timeout
    });

    console.log('Respuesta de conversión base64 a imagen:', response.status, response.data);

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
    
    console.log('Descargando imagen de WhatsApp desde:', cdn_url);
    
    // Descargar la imagen encriptada
    const response = await axios.get(cdn_url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const cdnFile = Buffer.from(response.data);
    console.log('Archivo CDN descargado, tamaño:', cdnFile.length);
    
    // Desencriptar la imagen usando el método oficial
    const decryptedImage = decryptWhatsAppImage(cdnFile, encryption_metadata);
    
    // Convertir a base64
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
    console.log('🔐 Desencriptando según documentación oficial de WhatsApp...');
    
    const { encryption_key, hmac_key, iv, plaintext_hash, encrypted_hash } = encryptionMetadata;
    
    // PASO 1: Verificar SHA256(cdn_file) == encrypted_hash (si está disponible)
    if (encrypted_hash) {
      console.log('🔍 PASO 1: Verificando SHA256(cdn_file) == encrypted_hash...');
      const cdnFileHash = crypto.createHash('sha256').update(cdnFile).digest();
      const expectedEncryptedHash = Buffer.from(encrypted_hash, 'base64');
      
      if (!cdnFileHash.equals(expectedEncryptedHash)) {
        console.log('⚠️  Advertencia: Hash del archivo no coincide');
      } else {
        console.log('✅ Hash del archivo verificado');
      }
    }
    
    // PASO 2: Separar ciphertext y HMAC
    console.log('🔓 PASO 2: Separando ciphertext y HMAC...');
    // Según documentación: cdn_file = ciphertext & hmac10
    const hmac10 = cdnFile.slice(-10); // Últimos 10 bytes
    const ciphertext = cdnFile.slice(0, -10); // Todo excepto los últimos 10 bytes
    
    console.log(`Ciphertext: ${ciphertext.length} bytes, HMAC10: ${hmac10.length} bytes`);
    
    // PASO 3: Validar HMAC-SHA256
    console.log('🔐 PASO 3: Validando HMAC-SHA256...');
    const hmacKey = Buffer.from(hmac_key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    
    // Calculate HMAC with hmac_key, initialization vector and ciphertext
    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(ivBuffer); // Primero el IV
    hmac.update(ciphertext); // Luego el ciphertext
    const calculatedHmac = hmac.digest();
    
    // Make sure first 10 bytes == hmac10
    const calculatedHmac10 = calculatedHmac.slice(0, 10);
    
    if (!calculatedHmac10.equals(hmac10)) {
      console.log('⚠️  Advertencia: HMAC no coincide');
    } else {
      console.log('✅ HMAC verificado correctamente');
    }
    
    // PASO 4: Desencriptar contenido
    console.log('🔓 PASO 4: Desencriptando contenido...');
    const encryptionKeyBuffer = Buffer.from(encryption_key, 'base64');
    
    console.log(`Clave: ${encryptionKeyBuffer.length} bytes (${encryptionKeyBuffer.length * 8} bits)`);
    
    // WhatsApp usa AES-256-CBC según la documentación
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, ivBuffer);
    
    let decryptedMedia = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    console.log(`✅ Contenido desencriptado: ${decryptedMedia.length} bytes`);
    
    // PASO 5: Validar contenido desencriptado
    console.log('✅ PASO 5: Validando contenido desencriptado...');
    const decryptedHash = crypto.createHash('sha256').update(decryptedMedia).digest();
    const expectedPlaintextHash = Buffer.from(plaintext_hash, 'base64');
    
    if (!decryptedHash.equals(expectedPlaintextHash)) {
      throw new Error('❌ La verificación del hash del contenido desencriptado falló');
    }
    console.log('✅ Hash del contenido desencriptado verificado correctamente');
    
    return decryptedMedia;
    
  } catch (error) {
    console.error('❌ Error al desencriptar imagen de WhatsApp:', error.message);
    throw error;
  }
}

/**
 * Descarga una imagen de WhatsApp usando media_id a través de la API de Meta
 * @param {string} mediaId - ID del media en WhatsApp
 * @param {string} accessToken - Token de acceso de WhatsApp Business API
 * @returns {Promise<object>} Respuesta con la imagen en base64
 */
async function downloadWhatsAppImageByMediaId(mediaId, accessToken) {
  try {
    console.log('Descargando imagen de WhatsApp usando media_id:', mediaId);
    
    // Paso 1: Obtener la URL de descarga del media
    const mediaInfoUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
    console.log('Obteniendo información del media desde:', mediaInfoUrl);
    
    const mediaInfoResponse = await axios.get(mediaInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('Información del media obtenida:', mediaInfoResponse.data);
    
    if (!mediaInfoResponse.data.url) {
      throw new Error('No se encontró URL en la respuesta del media');
    }
    
    const mediaUrl = mediaInfoResponse.data.url;
    console.log('URL del media:', mediaUrl);
    
    // Paso 2: Descargar la imagen usando la URL obtenida
    console.log('Descargando imagen desde URL del media...');
    const imageResponse = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'WhatsApp Business API Client'
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    console.log('Imagen descargada exitosamente:', {
      status: imageResponse.status,
      contentType: imageResponse.headers['content-type'],
      size: imageResponse.data.byteLength
    });
    
    // Paso 3: Convertir a base64
    const imageBuffer = Buffer.from(imageResponse.data);
    const base64Image = imageBuffer.toString('base64');
    
    console.log('Imagen convertida a base64, tamaño:', base64Image.length);
    
    return {
      success: true,
      data: base64Image,
      status: 200,
      contentType: imageResponse.headers['content-type']
    };
    
  } catch (error) {
    console.error('Error al descargar imagen de WhatsApp por media_id:', error.message);
    
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
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
        console.log("🔍 Procesando imagen del PhotoPicker de Jelou...");
        console.log("Media ID:", mediaId);
        console.log("Campos disponibles:", Object.keys(imageData));
        
        // Opción 1: Base64 directo en los datos
        if (imageData.base64) {
            console.log("✅ Encontrado base64 directo en imageData.base64");
            return {
                success: true,
                data: imageData.base64,
                source: 'direct_base64'
            };
        }
        
        if (imageData.data && typeof imageData.data === 'string') {
            console.log("✅ Encontrado base64 en imageData.data");
            return {
                success: true,
                data: imageData.data,
                source: 'data_field'
            };
        }
        
        // Opción 2: URL de Jelou
        const possibleUrls = [
            imageData.url,
            imageData.jelou_url,
            imageData.download_url,
            imageData.file_url,
            imageData.image_url
        ].filter(Boolean);
        
        if (possibleUrls.length > 0) {
            console.log("🔗 Intentando descargar desde URLs disponibles:", possibleUrls);
            
            for (const url of possibleUrls) {
                try {
                    console.log("Descargando desde:", url);
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'JelouBiometricLambda/1.0'
                        }
                    });
                    
                    const base64 = Buffer.from(response.data, 'binary').toString('base64');
                    console.log("✅ Imagen descargada exitosamente desde:", url);
                    
                    return {
                        success: true,
                        data: base64,
                        source: 'downloaded_url',
                        url: url
                    };
                } catch (urlError) {
                    console.log("❌ Error descargando desde", url, ":", urlError.message);
                    continue;
                }
            }
        }
        
        // Opción 3: Intentar API interna de Jelou (si existe)
        if (mediaId) {
            console.log("🔄 Intentando API interna de Jelou con media_id:", mediaId);
            
            // Posibles endpoints de Jelou para obtener medios
            const jelouEndpoints = [
                `https://api.jelou.ai/v1/media/${mediaId}`,
                `https://files.jelou.ai/media/${mediaId}`,
                `https://storage.jelou.ai/files/${mediaId}`
            ];
            
            for (const endpoint of jelouEndpoints) {
                try {
                    console.log("Probando endpoint:", endpoint);
                    const response = await axios.get(endpoint, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'JelouBiometricLambda/1.0',
                            'Accept': 'image/*'
                        }
                    });
                    
                    const base64 = Buffer.from(response.data, 'binary').toString('base64');
                    console.log("✅ Imagen obtenida desde API de Jelou:", endpoint);
                    
                    return {
                        success: true,
                        data: base64,
                        source: 'jelou_api',
                        endpoint: endpoint
                    };
                } catch (apiError) {
                    console.log("❌ Error en endpoint", endpoint, ":", apiError.message);
                    continue;
                }
            }
        }
        
        // Si llegamos aquí, no pudimos obtener la imagen
        console.error("❌ No se pudo obtener la imagen del PhotoPicker de Jelou");
        console.log("Estructura completa de imageData:", JSON.stringify(imageData, null, 2));
        
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

module.exports = {
  validateLiveness,
  httpGet,
  validateRequired,
  validateCompany,
  validateUser,
  getCompanyInfo,
  getBotMemoryRecords,
  verifyDocument,
  compareImages,
  base64ToImage,
  downloadWhatsAppImage,
  downloadWhatsAppImageByMediaId,
  getImageFromJelouPhotoPicker
}; 
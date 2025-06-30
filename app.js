const serverless = require('serverless-http');
const express = require('express');
const { validateLiveness, getBotMemoryRecords, verifyDocument, verifyDocumentAdvanced, compareImages, base64ToImage, downloadWhatsAppImage, getImageFromJelouPhotoPicker } = require('./lib/util');
const { decryptMessage, encryptResponse, decryptAESKey } = require('./lib/crypto');
require('dotenv').config();

const app = express();

// Middleware para parsear JSON
app.use(express.json({ limit: '50mb' }));

/**
 * Convierte un número a su representación en letras en español
 * @param {number} num - Número a convertir
 * @returns {string} Número en letras
 */
function numeroALetras(num) {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = {
        11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
        16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
        21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro',
        25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve'
    };

    if (num === 0) return 'cero';
    if (num < 10) return unidades[num];
    if (num < 30 && especiales[num]) return especiales[num];
    if (num < 100) {
        const decena = Math.floor(num / 10);
        const unidad = num % 10;
        if (unidad === 0) return decenas[decena];
        return decenas[decena] + ' y ' + unidades[unidad];
    }
    if (num < 1000) {
        const centena = Math.floor(num / 100);
        const resto = num % 100;
        if (centena === 1) {
            return resto === 0 ? 'cien' : 'ciento ' + numeroALetras(resto);
        }
        return unidades[centena] + 'cientos' + (resto === 0 ? '' : ' ' + numeroALetras(resto));
    }
    return num.toString(); // Para números mayores a 999, devolver como string
}

/**
 * Convierte un número en letras a su valor numérico
 * @param {string} letras - Número en letras
 * @returns {number} Número convertido
 */
function letrasANumero(letras) {
    const mapeo = {
        'cero': 0,
        'uno': 1,
        'dos': 2,
        'tres': 3,
        'cuatro': 4,
        'cinco': 5,
        'seis': 6,
        'siete': 7,
        'ocho': 8,
        'nueve': 9,
        'diez': 10,
        'once': 11,
        'doce': 12,
        'trece': 13,
        'catorce': 14,
        'quince': 15,
        'dieciséis': 16,
        'diecisiete': 17,
        'dieciocho': 18,
        'diecinueve': 19,
        'veinte': 20,
        'veintiuno': 21,
        'veintidós': 22,
        'veintitrés': 23,
        'veinticuatro': 24,
        'veinticinco': 25,
        'veintiséis': 26,
        'veintisiete': 27,
        'veintiocho': 28,
        'veintinueve': 29,
        'treinta': 30,
        'treinta y uno': 31,
        'treinta y dos': 32,
        'treinta y tres': 33,
        'treinta y cuatro': 34,
        'treinta y cinco': 35,
        'treinta y seis': 36,
        'treinta y siete': 37,
        'treinta y ocho': 38,
        'treinta y nueve': 39,
        'cuarenta': 40,
        'cuarenta y uno': 41,
        'cuarenta y dos': 42,
        'cuarenta y tres': 43,
        'cuarenta y cuatro': 44,
        'cuarenta y cinco': 45,
        'cuarenta y seis': 46,
        'cuarenta y siete': 47,
        'cuarenta y ocho': 48,
        'cuarenta y nueve': 49,
        'cincuenta': 50
    };
    
    const letrasLower = letras.toLowerCase().trim();
    return mapeo[letrasLower] || 0;
}

/**
 * Obtiene la foto_selfie desde los campos disponibles en el requestBody
 * @param {object} requestData - Datos del request body
 * @returns {object} Objeto con la foto_selfie y el campo encontrado
 */
function obtenerFotoSelfie(requestData) {
    const fotoSelfieCampos = ['foto_selfie_uno', 'foto_selfie_dos', 'foto_selfie_tres', 'foto_selfie_cuatro', 'foto_selfie_cinco'];
    let fotoSelfieData = null;
    let campoEncontrado = null;
    
    // Buscar cuál de los campos de foto_selfie existe
    for (const campo of fotoSelfieCampos) {
        if (requestData[campo]) {
            fotoSelfieData = requestData[campo];
            campoEncontrado = campo;
            console.log(`✅ Campo encontrado: ${campo}`);
            break;
        }
    }
    
    if (!fotoSelfieData) {
        throw new Error(`Se requiere uno de los siguientes campos: ${fotoSelfieCampos.join(', ')}`);
    }
    
    return {
        fotoSelfieData,
        campoEncontrado
    };
}

/**
 * Obtiene la imagen frontal desde los campos disponibles en el requestBody
 * @param {object} requestData - Datos del request body
 * @returns {object} Objeto con la imagen frontal y el campo encontrado
 */
function obtenerImagenFrontal(requestData) {
    const imagenFrontalCampos = ['imagenes_frontal_uno', 'imagenes_frontal_dos', 'imagenes_frontal_tres', 'imagenes_frontal_cuatro', 'imagenes_frontal_cinco'];
    let imagenFrontalData = null;
    let campoEncontrado = null;
    
    // Buscar cuál de los campos de imagen frontal existe
    for (const campo of imagenFrontalCampos) {
        if (requestData[campo]) {
            imagenFrontalData = requestData[campo];
            campoEncontrado = campo;
            console.log(`✅ Campo encontrado: ${campo}`);
            break;
        }
    }
    
    if (!imagenFrontalData) {
        throw new Error(`Se requiere uno de los siguientes campos: ${imagenFrontalCampos.join(', ')}`);
    }
    
    return {
        imagenFrontalData,
        campoEncontrado
    };
}

/**
 * Obtiene la imagen posterior desde los campos disponibles en el requestBody
 * @param {object} requestData - Datos del request body
 * @returns {object} Objeto con la imagen posterior y el campo encontrado
 */
function obtenerImagenPosterior(requestData) {
    const imagenPosteriorCampos = ['imagenes_posterior_uno', 'imagenes_posterior_dos', 'imagenes_posterior_tres', 'imagenes_posterior_cuatro', 'imagenes_posterior_cinco'];
    let imagenPosteriorData = null;
    let campoEncontrado = null;
    
    // Buscar cuál de los campos de imagen posterior existe
    for (const campo of imagenPosteriorCampos) {
        if (requestData[campo]) {
            imagenPosteriorData = requestData[campo];
            campoEncontrado = campo;
            console.log(`✅ Campo encontrado: ${campo}`);
            break;
        }
    }
    
    if (!imagenPosteriorData) {
        throw new Error(`Se requiere uno de los siguientes campos: ${imagenPosteriorCampos.join(', ')}`);
    }
    
    return {
        imagenPosteriorData,
        campoEncontrado
    };
}

// Middleware para logging de respuestas
app.use((req, res, next) => {
    // Interceptar el método send para logging
    const originalSend = res.send;
    res.send = function(data) {
        console.log('📤 === RESPUESTA ENVIADA ===');
        console.log('📍 URL:', req.url);
        console.log('🔢 Status Code:', res.statusCode);
        console.log('📋 Headers:', JSON.stringify(res.getHeaders(), null, 2));
        console.log('📦 Body (primeros 200 chars):', typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200));
        console.log('📏 Body Length:', typeof data === 'string' ? data.length : JSON.stringify(data).length);
        console.log('========================');
        
        return originalSend.call(this, data);
    };
    next();
});

// Códigos de estado HTTP
const HTTP_CODES = {
    OK: 200,
    BAD_REQUEST: 200,
    UNAUTHORIZED: 200,
    FORBIDDEN: 200,
    NOT_FOUND: 200,
    INTERNAL_ERROR: 200,
    MESSAGE_DECRYPTION_ERROR: 200
};

// Log para verificar los códigos HTTP configurados
console.log('🔧 === CONFIGURACIÓN HTTP CODES ===');
console.log('✅ HTTP_CODES.OK:', HTTP_CODES.OK);
console.log('❌ HTTP_CODES.BAD_REQUEST:', HTTP_CODES.BAD_REQUEST);
console.log('❌ HTTP_CODES.INTERNAL_ERROR:', HTTP_CODES.INTERNAL_ERROR);
console.log('====================================');

// Función para manejar errores y encriptar la respuesta
const handleEncryptedError = async (errorMessage, encrypted_aes_key, initial_vector, statusCode = HTTP_CODES.INTERNAL_ERROR) => {
    try {
        const claveAES = await decryptAESKey(encrypted_aes_key);
        const responseData = {
            screen: "captura_foto",
            data: {
                Resultado: "error_servicio"
            }
        };
        console.log('📤 === DATA A ENCRIPTAR (handleEncryptedError) ===');
        console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
        console.log('===============================================');
        const encryptedResponse = await encryptResponse(responseData, claveAES, initial_vector);
        // Siempre retornar OK (200) para cumplir con WhatsApp Flows
        return { statusCode: HTTP_CODES.OK, response: encryptedResponse };
    } catch (encryptError) {
        console.error('Error al encriptar respuesta de error:', encryptError);
        // Si no se puede encriptar, retornar un mensaje de error simple
        return {
            statusCode: HTTP_CODES.OK,
            response: 'Error interno del servidor'
        };
    }
};

/**
 * Función para procesar foto_selfie y obtener base64
 */
const processFotoSelfie = async (fotoSelfie) => {
    console.log("Procesando foto_selfie...");
    console.log("Tipo de foto_selfie:", typeof fotoSelfie);
    console.log("Contenido foto_selfie:", JSON.stringify(fotoSelfie, null, 2));
    
    let base64Image;
    
    // Verificar si es un array (estructura de PhotoPicker/WhatsApp)
    if (Array.isArray(fotoSelfie) && fotoSelfie.length > 0) {
        console.log("foto_selfie es un array, procesando primer elemento...");
        const firstImage = fotoSelfie[0];
        console.log("Primer elemento:", JSON.stringify(firstImage, null, 2));
        
        // CASO 1: PhotoPicker de Jelou (media_id sin cdn_url)
        if (firstImage.media_id && !firstImage.cdn_url) {
            console.log("Detectado: Imagen de PhotoPicker de Jelou (media_id sin cdn_url)");
            
            const jelouResult = await getImageFromJelouPhotoPicker(firstImage.media_id, firstImage);
            if (jelouResult.success) {
                console.log("✅ Imagen obtenida desde PhotoPicker de Jelou:", jelouResult.source);
                base64Image = jelouResult.data;
            } else {
                console.error("❌ Error al obtener imagen del PhotoPicker:", jelouResult.error);
                throw new Error(`Error del PhotoPicker de Jelou: ${jelouResult.error}`);
            }
        }
        // CASO 2: WhatsApp real (media_id + cdn_url)
        else if (firstImage.media_id && firstImage.cdn_url) {
            console.log("Detectado: Imagen real de WhatsApp (media_id + cdn_url)");
            
            // Ir directamente a la desencriptación sin intentar media_id
            if (firstImage.encryption_metadata) {
                console.log("Procesando con desencriptación directa...");
                const whatsappResult = await downloadWhatsAppImage(firstImage);
                if (whatsappResult.success) {
                    console.log("Imagen de WhatsApp procesada exitosamente con desencriptación");
                    base64Image = whatsappResult.data;
                } else {
                    console.error("Error al procesar imagen de WhatsApp:", whatsappResult.error);
                    throw new Error("Error al procesar imagen de WhatsApp");
                }
            } else {
                throw new Error("No se encontraron datos de encriptación para la imagen de WhatsApp");
            }
        }
        // CASO 3: WhatsApp encriptado (cdn_url + encryption_metadata)
        else if (firstImage.cdn_url && firstImage.encryption_metadata) {
            console.log("Detectado: WhatsApp encriptado (cdn_url + encryption_metadata)");
            const whatsappResult = await downloadWhatsAppImage(firstImage);
            if (whatsappResult.success) {
                console.log("Imagen de WhatsApp procesada exitosamente con desencriptación");
                base64Image = whatsappResult.data;
            } else {
                console.error("Error al procesar imagen de WhatsApp:", whatsappResult.error);
                throw new Error("Error al procesar imagen de WhatsApp");
            }
        }
        // CASO 4: Estructura desconocida
        else {
            console.error("Estructura de imagen no reconocida");
            console.log("Campos disponibles:", Object.keys(firstImage));
            throw new Error("Estructura de imagen no compatible");
        }
    } else {
        // CASO 5: Base64 directo
        console.log("foto_selfie es base64 directo");
        base64Image = fotoSelfie;
    }
    
    if (!base64Image) {
        throw new Error("No se pudo obtener base64 de la imagen");
    }
    
    // Convertir base64 a URL de imagen
    const base64Result = await base64ToImage(base64Image);
    if (base64Result.success) {
        console.log("Foto selfie convertida exitosamente:", base64Result.data);
        // Retornar el objeto completo para poder acceder a mediaUrl
        return base64Result.data;
    } else {
        console.error("Error al convertir foto_selfie:", base64Result.error);
        throw new Error("Error al convertir imagen a URL");
    }
};

// Ruta principal para ejecutar servicios biométricos
app.post('/execute', async (req, res) => {
    console.log('Body recibido:', req.body);
    
    let encrypted_aes_key, initial_vector, requestBody;
    
    try {
        // ========== PASO 1: DESENCRIPTAR REQ.BODY ==========
        console.log('\n🔓 PASO 1: Desencriptando req.body...');
        
        const { encrypted_flow_data, encrypted_aes_key: aesKey, initial_vector: iv } = req.body;
        encrypted_aes_key = aesKey;
        initial_vector = iv;
        
        // Validar campos de encriptación requeridos
        if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
            const errorResponse = await handleEncryptedError(
                'Faltan campos requeridos para desencriptación (encrypted_flow_data, encrypted_aes_key, initial_vector)',
                encrypted_aes_key,
                initial_vector,
                HTTP_CODES.BAD_REQUEST
            );
            // Establecer el Content-Type correcto para la respuesta de WhatsApp
            res.setHeader('Content-Type', 'text/plain');
            return res.status(errorResponse.statusCode).send(errorResponse.response);
        }
        
        // Desencriptar el mensaje
        requestBody = await decryptMessage(encrypted_aes_key, encrypted_flow_data, initial_vector);
        console.log('✅ Datos desencriptados exitosamente');
        console.log('Datos desencriptados:', JSON.stringify(requestBody, null, 2));
        
    } catch (error) {
        console.error('❌ Error en PASO 1 - Desencriptación:', error);
        
        // Para errores de desencriptación, retornar HTTP 421 según la documentación de Meta
        if (error.message.includes('desencriptar') || error.message.includes('decrypt')) {
            console.log('❌ Error de desencriptación detectado, retornando HTTP 421');
            res.setHeader('Content-Type', 'text/plain');
            return res.status(421).send('Error de desencriptación');
        }
        
        const errorResponse = await handleEncryptedError(
            `Error al desencriptar mensaje: ${error.message}`,
            encrypted_aes_key,
            initial_vector,
            HTTP_CODES.MESSAGE_DECRYPTION_ERROR
        );
        // Establecer el Content-Type correcto para la respuesta de WhatsApp
        res.setHeader('Content-Type', 'text/plain');
        return res.status(errorResponse.statusCode).send(errorResponse.response);
    }
    
    try {
        // ========== PASO 2: VERIFICAR ACTION PING ==========
        console.log('\n🏓 PASO 2: Verificando action ping...');
        
        if (requestBody.action === 'ping') {
            console.log('✅ Action es ping, retornando status active');
            const claveAES = await decryptAESKey(encrypted_aes_key);
            const responseData = { data: { status: "active" } };
            console.log('📤 === DATA A ENCRIPTAR (PING) ===');
            console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
            console.log('===================================');
            const encryptedResponse = await encryptResponse(responseData, claveAES, initial_vector);
            console.log('✅ Respuesta encriptada:', encryptedResponse);
            // Establecer el Content-Type correcto para la respuesta de WhatsApp
            res.setHeader('Content-Type', 'text/plain');
            return res.status(HTTP_CODES.OK).send(encryptedResponse);
        }
        
        console.log('ℹ️  Action no es ping, continuando con el flujo...');
        const { intento = 'cero', screen_retry = 'none' } = requestBody.data || {};
        if (intento !== 'cero' && screen_retry !== 'none') {
            console.log('✅ Validación de reintento');
            const claveAES = await decryptAESKey(encrypted_aes_key);
            const responseData = { data: { status: "active", intento: intento }, screen: screen_retry };
            console.log('📤 === DATA A ENCRIPTAR (REINTENTO) ===');
            console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
            console.log('=========================================');
            const encryptedResponse = await encryptResponse(responseData, claveAES, initial_vector);
            console.log('✅ Respuesta encriptada:', encryptedResponse);
            // Establecer el Content-Type correcto para la respuesta de WhatsApp
            res.setHeader('Content-Type', 'text/plain');
            return res.status(HTTP_CODES.OK).send(encryptedResponse);
        }
        // ========== PASO 3: OBTENER ORIGEN, BOT_ID Y CLIENT_ID ==========
        console.log('\n📋 PASO 3: Obteniendo origen, bot_id y client_id...');
        
        const { origen, bot_id, client_id } = requestBody.data || {};
        
        console.log(`Origen: ${origen}`);
        console.log(`Bot ID: ${bot_id}`);
        console.log(`Client ID: ${client_id}`);
        
        
        // Validar campos requeridos
        if (!origen) {
            const errorResponse = await handleEncryptedError(
                'El campo origen es requerido',
                encrypted_aes_key,
                initial_vector,
                HTTP_CODES.BAD_REQUEST
            );
            // Establecer el Content-Type correcto para la respuesta de WhatsApp
            res.setHeader('Content-Type', 'text/plain');
            return res.status(errorResponse.statusCode).send(errorResponse.response);
        }
        
        if (!bot_id || !client_id) {
            const errorResponse = await handleEncryptedError(
                'Los campos bot_id y client_id son requeridos',
                encrypted_aes_key,
                initial_vector,
                HTTP_CODES.BAD_REQUEST
            );
            // Establecer el Content-Type correcto para la respuesta de WhatsApp
            res.setHeader('Content-Type', 'text/plain');
            return res.status(errorResponse.statusCode).send(errorResponse.response);
        }
        
        console.log('✅ Campos requeridos validados correctamente');
        
        // ========== PASO 4: OBTENER INFORMACIÓN DE COMPANY Y USER ==========
        console.log('\n🏢 PASO 4: Obteniendo información de company y user desde datos desencriptados...');
        
        // Obtener company y user desde los datos desencriptados
        let company, user;
        
        try {
            // Verificar si existen los campos company y user en requestBody.data
            if (requestBody.data?.company && requestBody.data?.user) {
                // Si ya son objetos, usarlos directamente
                if (typeof requestBody.data.company === 'object' && typeof requestBody.data.user === 'object') {
                    company = requestBody.data.company;
                    user = requestBody.data.user;
                    console.log('✅ Company y user obtenidos como objetos directamente desde data');
                } else {
                    // Si son strings JSON, parsearlos
                    company = JSON.parse(requestBody.data.company);
                    user = JSON.parse(requestBody.data.user);
                    console.log('✅ Company y user parseados desde strings JSON en data');
                }
            } else {
                const errorResponse = await handleEncryptedError(
                    'No se encontró información completa de compañía o usuario en requestBody.data',
                    encrypted_aes_key,
                    initial_vector,
                    HTTP_CODES.NOT_FOUND
                );
                // Establecer el Content-Type correcto para la respuesta de WhatsApp
                res.setHeader('Content-Type', 'text/plain');
                return res.status(errorResponse.statusCode).send(errorResponse.response);
            }
            
            console.log('✅ Información de company y user obtenida correctamente');
            console.log(`Company: ${company.name || company.id}`);
            console.log(`User: ${user.name || user.id}`);
            
        } catch (parseError) {
            console.error('❌ Error al parsear company o user:', parseError);
            const errorResponse = await handleEncryptedError(
                `Error al parsear datos de company o user: ${parseError.message}`,
                encrypted_aes_key,
                initial_vector,
                HTTP_CODES.BAD_REQUEST
            );
            // Establecer el Content-Type correcto para la respuesta de WhatsApp
            res.setHeader('Content-Type', 'text/plain');
            return res.status(errorResponse.statusCode).send(errorResponse.response);
        }
        
        // Declarar claveAES globalmente después del PASO 4
        const claveAES = await decryptAESKey(encrypted_aes_key);
        console.log('🔑 Clave AES desencriptada y disponible globalmente');
        
        // ========== PASO 5: LÓGICA DE SWITCH POR ORIGEN ==========
        console.log(`\n🔀 PASO 5: Ejecutando lógica para origen: ${origen}`);
        
        let result;
        let screenName;
        
        switch (origen) {
            case 'liveness':
                console.log('📸 Procesando servicio LIVENESS...');
                screenName = 'selfie_res';
                
                // PASO 7 para LIVENESS: Validar y procesar foto_selfie
                let fotoSelfieData, campoEncontrado;
                try {
                    const fotoSelfieResult = obtenerFotoSelfie(requestBody.data);
                    fotoSelfieData = fotoSelfieResult.fotoSelfieData;
                    campoEncontrado = fotoSelfieResult.campoEncontrado;
                } catch (fotoError) {
                    const errorResponse = await handleEncryptedError(
                        fotoError.message,
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    // Establecer el Content-Type correcto para la respuesta de WhatsApp
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                
                try {
                     // Procesar foto_selfie y obtener URL de imagen
                     const imageResult = await processFotoSelfie(fotoSelfieData);
                     console.log(`✅ Imagen procesada desde ${campoEncontrado}, resultado obtenido:`, imageResult);
                     
                     // Extraer la URL correcta del resultado
                     const imageFileUrl = imageResult.mediaUrl || imageResult.url || imageResult;
                     console.log('✅ URL de imagen extraída:', imageFileUrl);
                     
                     // Ejecutar servicio validateLiveness
                     result = await validateLiveness({
                         imageFileUrl: imageFileUrl,
                         provider: requestBody.data.provider || 'AWS & Groq',
                         company: company,
                         user: user
                     });
                    
                    successMessage = 'Validación de liveness ejecutada correctamente';
                    
                    // ========== PROCESAR RESULTADO DE LIVENESS ==========
                    if (result.success) {
                        console.log('🎉 Servicio LIVENESS ejecutado exitosamente:', result);
                        
                        // Obtener contador_biometria del memory en el momento actual
                        console.log('🔄 Obteniendo contador_biometria actualizado del memory...');
                        const currentMemoryRecords = await getBotMemoryRecords(bot_id, client_id);
                        const contadorBiometria = currentMemoryRecords.data?.contador_biometria || 1;
                        console.log('🔢 Contador de biometría obtenido:', contadorBiometria);
                        
                        // Convertir el número a letras
                        let intentoEnLetras = numeroALetras(contadorBiometria);
                        console.log('📝 Intento en letras:', intentoEnLetras);
                        
                        // Determinar el valor de Resultado basado en el type
                        let resultadoValue;
                        if (result.data?.data?.output?.type === 'SUCCESS') {
                            resultadoValue = 'exitoso';
                            if (contadorBiometria === "0" || contadorBiometria === 0) {
                               intentoEnLetras = 'cero';
                            }
                            console.log('✅ Resultado: exitoso');
                        } else if (result.data?.data?.output?.type === 'FAILED') {
                            // Verificar si el error es por límite de reintentos
                            const errorCode = result.data?.data?.output?.value?.error_code;
                            console.log('🔍 Error code encontrado:', errorCode);
                            
                            if (errorCode === 'limit_retries') {
                                resultadoValue = 'max_intentos';
                                console.log('❌ Resultado: max_intentos (límite de reintentos alcanzado)');
                            } else {
                                resultadoValue = 'no_exitoso';
                                console.log('❌ Resultado: no_exitoso');
                            }
                        } else {
                            resultadoValue = 'error_servicio';
                            console.log('❌ Resultado:', resultadoValue);
                        }
                        
                        // Formato específico para liveness: { data: { Resultado: "exitoso", intento: "uno" }, screen: "selfie_res" }
                        const livenessResponse = {
                            data: { 
                                Resultado: resultadoValue,
                                intento: intentoEnLetras
                            },
                            screen: screenName
                        };
                        
                        console.log('📋 Respuesta final de liveness:', JSON.stringify(livenessResponse, null, 2));
                        console.log('📤 === DATA A ENCRIPTAR (LIVENESS - EXITOSO) ===');
                        console.log('📋 Response Data:', JSON.stringify(livenessResponse, null, 2));
                        console.log('=================================================');
                        // Encriptar respuesta de liveness con formato específico
                        const encryptedResponse = await encryptResponse(livenessResponse, claveAES, initial_vector);
                        console.log('✅ Respuesta encriptada:', encryptedResponse);
                        // Establecer el Content-Type correcto para la respuesta de WhatsApp
                        res.setHeader('Content-Type', 'text/plain');
                        return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    } else {
                        console.log('❌ Servicio LIVENESS falló:', result.error);
                        
                        // Formato específico para error de liveness: { data: { Resultado: "error_servicio" }, screen: "captura_foto" }
                        const livenessErrorResponse = {
                            data: {
                                Resultado: 'error_servicio'
                            },
                            screen: "captura_foto"
                        };
                        
                        console.log('📋 Respuesta de error de liveness:', JSON.stringify(livenessErrorResponse, null, 2));
                        console.log('📤 === DATA A ENCRIPTAR (LIVENESS - ERROR) ===');
                        console.log('📋 Response Data:', JSON.stringify(livenessErrorResponse, null, 2));
                        console.log('===============================================');
                        // Encriptar respuesta de error de liveness
                        const encryptedResponse = await encryptResponse(livenessErrorResponse, claveAES, initial_vector);
                        
                        // Establecer el Content-Type correcto para la respuesta de WhatsApp
                        res.setHeader('Content-Type', 'text/plain');
                        return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    }
                    
                } catch (imageError) {
                    console.error('❌ Error al procesar imagen para liveness:', imageError);
                    const errorResponse = await handleEncryptedError(
                        `Error al procesar imagen para liveness: ${imageError.message}`,
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                
            case 'document_check_1':
                console.log('📄 Procesando servicio DOCUMENT_CHECK_1...');
                screenName = 'documento_rev';
                
                // PASO 7 para DOCUMENT_CHECK_1: Validar y procesar imagen frontal
                let imagenFrontalData, campoEncontradoFrontal;
                try {
                    const imagenFrontalResult = obtenerImagenFrontal(requestBody.data);
                    imagenFrontalData = imagenFrontalResult.imagenFrontalData;
                    campoEncontradoFrontal = imagenFrontalResult.campoEncontrado;
                } catch (imagenError) {
                    const errorResponse = await handleEncryptedError(
                        imagenError.message,
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    // Establecer el Content-Type correcto para la respuesta de WhatsApp
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                
                try {
                    // Procesar imagen frontal y obtener URL de imagen
                    const imageResult = await processFotoSelfie(imagenFrontalData);
                    console.log(`✅ Imagen frontal procesada desde ${campoEncontradoFrontal}, resultado obtenido:`, imageResult);
                    
                    // Extraer la URL correcta del resultado
                    const urlFront = imageResult.mediaUrl || imageResult.url || imageResult;
                    console.log('✅ URL de imagen frontal extraída:', urlFront);
                    
                    // Preparar respuesta exitosa con la URL
                    const responseData = { 
                        data: { 
                            status: "active", 
                            url_front: urlFront,
                            intento: requestBody.data.intento
                        }, 
                        screen: screenName 
                    };
                    console.log('📤 === DATA A ENCRIPTAR (DOCUMENT_CHECK_1) ===');
                    console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
                    console.log('===============================================');
                    const encryptedResponse = await encryptResponse(responseData, claveAES, initial_vector);
                    console.log('✅ Respuesta encriptada:', encryptedResponse);
                    // Establecer el Content-Type correcto para la respuesta de WhatsApp
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    
                } catch (imageError) {
                    console.error('❌ Error al procesar imagen frontal para document_check_1:', imageError);
                    const errorResponse = await handleEncryptedError(
                        `Error al procesar imagen frontal para document_check_1: ${imageError.message}`,
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                
            case 'document_check_2':
                console.log('📄 Procesando servicio DOCUMENT_CHECK_2...');
                screenName = 'resultado_doc';
                
                // ========== INICIALIZAR VARIABLES DE REINTENTO ==========
                const reintentoLetras = requestBody.data?.intento || 'uno';
                const maxIntentosLetras = requestBody.data?.max_reintentos || 'cinco';
                
                let reintentoNumero = letrasANumero(reintentoLetras);
                let maxIntentosNumero = letrasANumero(maxIntentosLetras);
                
                console.log('🔄 Reintento recibido en letras:', reintentoLetras, '→ Número:', reintentoNumero);
                console.log('🎯 Max intentos recibido en letras:', maxIntentosLetras, '→ Número:', maxIntentosNumero);
                
                // Validar que no exceda el máximo de 5
                if (reintentoNumero > 5) {
                    reintentoNumero = 5;
                    console.log('⚠️ Reintento limitado a máximo 5');
                }
                if (maxIntentosNumero > 5) {
                    maxIntentosNumero = 5;
                    console.log('⚠️ Max intentos limitado a máximo 5');
                }
                
                // Obtener url_image_front directamente del request desencriptado
                const urlImageFront = requestBody.data?.url_front;
                if (!urlImageFront) {
                    const errorResponse = await handleEncryptedError(
                        'El campo url_front es requerido para el servicio document_check_2',
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                console.log('✅ URL frontal obtenida del request:', urlImageFront);
                
                // Validar y procesar imagen posterior
                let imagenPosteriorData, campoEncontradoPosterior;
                try {
                    const imagenPosteriorResult = obtenerImagenPosterior(requestBody.data);
                    imagenPosteriorData = imagenPosteriorResult.imagenPosteriorData;
                    campoEncontradoPosterior = imagenPosteriorResult.campoEncontrado;
                } catch (imagenError) {
                    const errorResponse = await handleEncryptedError(
                        imagenError.message,
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                
                try {
                    // Procesar imagen posterior y obtener URL
                    const imagenPosteriorResult = await processFotoSelfie(imagenPosteriorData);
                    console.log(`✅ Imagen posterior procesada desde ${campoEncontradoPosterior}, resultado obtenido:`, imagenPosteriorResult);
                    
                    // Extraer la URL correcta del resultado
                    const urlImageBack = imagenPosteriorResult.mediaUrl || imagenPosteriorResult.url || imagenPosteriorResult;
                    console.log('✅ URL de imagen posterior extraída:', urlImageBack);
                
                    // ========== VERIFICAR MAX_INTENTOS ANTES DE LLAMAR AL SERVICIO ==========
                    // Verificar si el intento actual es igual al máximo de intentos
                    if (reintentoNumero >= maxIntentosNumero) {
                        console.log('❌ Límite de intentos alcanzado. Enviando error max_intentos directamente');
                        
                        const responseData = { 
                            data: { 
                                Resultado_doc: 'max_intentos', 
                                intento: reintentoLetras 
                            }, 
                            screen: "resultado_doc" 
                        };
                        
                        console.log('📤 === DATA A ENCRIPTAR (DOCUMENT_CHECK_2 - MAX_INTENTOS) ===');
                        console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
                        console.log('==========================================================');
                        
                        const encryptedResponse = await encryptResponse(responseData, claveAES, initial_vector);
                        console.log('✅ Respuesta encriptada:', encryptedResponse);
                        res.setHeader('Content-Type', 'text/plain');
                        return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    }
                
                    // Ejecutar servicio verifyDocumentAdvanced con parámetros específicos
                    result = await verifyDocumentAdvanced({
                        url_document: urlImageFront,
                        url_document_back: urlImageBack,
                        type_qa: "bajo",
                        expiry: "false",
                        validate_age: "false",
                        company: company,
                        user: user
                    });
                    console.log("result", JSON.stringify(result, null, 2));
                    successMessage = 'Verificación avanzada de documento ejecutada correctamente';

                    // ========== PROCESAR RESULTADO DE DOCUMENT_CHECK_2 ==========
                    if (result.success) {
                        console.log('🎉 Servicio DOCUMENT_CHECK_2 ejecutado exitosamente:', result);
                        
                        let resultadoValue;
                        if (result.data?.data?.output?.type === 'SUCCESS') {
                            resultadoValue = 'exitoso';
                            console.log('✅ Resultado: exitoso');
                        } else if (result.data?.data?.output?.type === 'FAILED') {
                            resultadoValue = 'no_exitoso';
                            console.log('❌ Resultado: no_exitoso');
                        } else {
                            resultadoValue = 'error_servicio';
                            console.log('❌ Resultado:', resultadoValue);
                        }
                        
                        // Si es no_exitoso, sumar 1 al reintento
                        if (resultadoValue === 'no_exitoso') {
                            reintentoNumero = reintentoNumero + 1;
                            console.log('➕ Reintento incrementado a:', reintentoNumero);
                        }
                        
                        // Convertir el reintento final a letras
                        let reintentoFinalEnLetras = numeroALetras(reintentoNumero);
                        console.log('📝 Reintento final en letras:', reintentoFinalEnLetras);
                        
                        // Encriptar respuesta de document_check con formato específico
                        const responseData = { 
                            data: { 
                                Resultado_doc: resultadoValue, 
                                intento: reintentoFinalEnLetras 
                            }, 
                            screen: "resultado_doc" 
                        };
                        console.log('📤 === DATA A ENCRIPTAR (DOCUMENT_CHECK_2 - EXITOSO) ===');
                        console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
                        console.log('=====================================================');
                        const encryptedResponse = await encryptResponse(responseData, claveAES, initial_vector);
                        console.log('✅ Respuesta encriptada:', encryptedResponse);
                        // Establecer el Content-Type correcto para la respuesta de WhatsApp
                        res.setHeader('Content-Type', 'text/plain');
                        console.log("envios document_check");
                        return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    } else {
                        console.log('❌ Servicio DOCUMENT_CHECK_2 falló:', result.error);
                        
                        // Formato específico para error de document_check: { data: { Resultado_doc: "error_servicio" }, screen: "captura_foto" }
                        const documentCheckErrorResponse = {
                            data: {
                                Resultado_doc: 'error_servicio'
                            },
                            screen: "captura_foto"
                        };
                        
                        console.log('📋 Respuesta de error de document_check:', JSON.stringify(documentCheckErrorResponse, null, 2));
                        console.log('📤 === DATA A ENCRIPTAR (DOCUMENT_CHECK_2 - ERROR) ===');
                        console.log('📋 Response Data:', JSON.stringify(documentCheckErrorResponse, null, 2));
                        console.log('===================================================');
                        // Encriptar respuesta de error de document_check
                        const encryptedResponse = await encryptResponse(documentCheckErrorResponse, claveAES, initial_vector);
                        
                        // Establecer el Content-Type correcto para la respuesta de WhatsApp
                        res.setHeader('Content-Type', 'text/plain');
                        console.log("🔍 === LOG ERROR DOCUMENT_CHECK ===");
                        console.log("📄 Origen:", origen);
                        console.log("🔢 Status Code a enviar:", HTTP_CODES.OK);
                        console.log("📋 Headers configurados:", res.getHeaders());
                        console.log("📦 Body a enviar (primeros 100 chars):", encryptedResponse.substring(0, 100));
                        console.log("=====================================");
                        return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    }
                    
                } catch (imageError) {
                    console.error('❌ Error al procesar imagen posterior para document_check_2:', imageError);
                    const errorResponse = await handleEncryptedError(
                        `Error al procesar imagen posterior para document_check_2: ${imageError.message}`,
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                
            case 'facematch':
                console.log('👥 Procesando servicio FACEMATCH...');
                screenName = 'resultado_final';
                
                try {
                    // Obtener datos desde los datos desencriptados
                    console.log('📋 Obteniendo datos de facematch desde datos desencriptados...');
                    
                    // Obtener foto_selfie desde response_vivacidad_pasiva.imgURL
                    const fotoSelfieUrl = requestBody.data?.response_vivacidad_pasiva?.imgURL;
                    if (!fotoSelfieUrl) {
                        const errorResponse = await handleEncryptedError(
                            'No se encontró foto_selfie en response_vivacidad_pasiva.imgURL',
                            encrypted_aes_key,
                            initial_vector,
                            HTTP_CODES.BAD_REQUEST
                        );
                        res.setHeader('Content-Type', 'text/plain');
                        return res.status(errorResponse.statusCode).send(errorResponse.response);
                    }
                    console.log('✅ Foto selfie obtenida:', fotoSelfieUrl);
                    
                    // Obtener document_selfie desde document_check_data.images_extracted.portrait.image
                    let documentSelfieUrl;
                    
                    // Validar si flagGovValidation es true para obtener la foto desde gov_entity_data
                    const flagGovValidation = requestBody.data?.flagGovValidation ?? true;
                    if (flagGovValidation === true) {
                        console.log('🏛️ FlagGovValidation es true, obteniendo foto desde gov_entity_data...');
                        documentSelfieUrl = requestBody.data?.gov_entity_data?.fotografia;
                        console.log('✅ Foto obtenida desde gov_entity_data.fotografia:', documentSelfieUrl);
                    } else {
                        console.log('📄 FlagGovValidation es false, usando foto por defecto...');
                        documentSelfieUrl = requestBody.data?.document_check_data?.data_image?.images_extracted?.portrait?.image;
                        console.log('✅ Foto obtenida desde document_check_data:', documentSelfieUrl);
                    }
                    
                    console.log("documentSelfieUrl", documentSelfieUrl);
                    if (!documentSelfieUrl) {
                        const errorResponse = await handleEncryptedError(
                            'No se encontró document_selfie en las rutas disponibles (gov_entity_data.fotografia o document_check_data.data_image.images_extracted.portrait.image)',
                            encrypted_aes_key,
                            initial_vector,
                            HTTP_CODES.BAD_REQUEST
                        );
                        res.setHeader('Content-Type', 'text/plain');
                        return res.status(errorResponse.statusCode).send(errorResponse.response);
                    }
                    
                    // Obtener threshold desde la ruta principal, si no existe usar "70"
                    const threshold = requestBody.data?.threshold || "70";
                    console.log('✅ Threshold obtenido:', threshold);
                    
                    // Ejecutar servicio compareImages
                    result = await compareImages({
                        image_url_1: fotoSelfieUrl,
                        image_url_2: documentSelfieUrl,
                        threshold: threshold,
                        company: company,
                        user: user
                    });
                    
                    successMessage = 'Comparación de imágenes ejecutada correctamente';
                    
                    // ========== PROCESAR RESULTADO DE FACEMATCH ==========
                    if (result.success) {
                        console.log('🎉 Servicio FACEMATCH ejecutado exitosamente:', result);
                        
                        let resultadoValue;
                        if (result.data?.data?.output?.type === 'SUCCESS') {
                            resultadoValue = 'exitoso';
                            console.log('✅ Resultado: exitoso');
                        } else if (result.data?.data?.output?.type === 'FAILED') {
                            resultadoValue = 'no_exitoso';
                            console.log('❌ Resultado: no_exitoso');
                        } else {
                            resultadoValue = 'error_servicio';
                            console.log('❌ Resultado:', resultadoValue);
                        }
                        
                        // Encriptar respuesta de facematch con formato específico
                        const responseData = { data: { status: "active", Resultado: resultadoValue }, screen: screenName };
                        console.log('📤 === DATA A ENCRIPTAR (FACEMATCH - EXITOSO) ===');
                        console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
                        console.log('==================================================');
                        const encryptedResponse = await encryptResponse(responseData, claveAES, initial_vector);
                        console.log('✅ Respuesta encriptada:', encryptedResponse);
                        // Establecer el Content-Type correcto para la respuesta de WhatsApp
                        res.setHeader('Content-Type', 'text/plain');
                        console.log("envios facematch");
                        return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    } else {
                        console.log('❌ Servicio FACEMATCH falló:', result.error);
                        
                        // Formato específico para error de facematch: { data: { Resultado: "error_servicio" }, screen: "captura_foto" }
                        const facematchErrorResponse = {
                            data: {
                                Resultado: 'error_servicio'
                            },
                            screen: "captura_foto"
                        };
                        
                        console.log('📋 Respuesta de error de facematch:', JSON.stringify(facematchErrorResponse, null, 2));
                        console.log('📤 === DATA A ENCRIPTAR (FACEMATCH - ERROR) ===');
                        console.log('📋 Response Data:', JSON.stringify(facematchErrorResponse, null, 2));
                        console.log('===============================================');
                        // Encriptar respuesta de error de facematch
                        const encryptedResponse = await encryptResponse(facematchErrorResponse, claveAES, initial_vector);
                        
                        // Establecer el Content-Type correcto para la respuesta de WhatsApp
                        res.setHeader('Content-Type', 'text/plain');
                        return res.status(HTTP_CODES.OK).send(encryptedResponse);
                    }
                    
                } catch (facematchError) {
                    console.error('❌ Error al procesar facematch:', facematchError);
                    const errorResponse = await handleEncryptedError(
                        `Error al procesar facematch: ${facematchError.message}`,
                        encrypted_aes_key,
                        initial_vector,
                        HTTP_CODES.BAD_REQUEST
                    );
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(errorResponse.statusCode).send(errorResponse.response);
                }
                
            default:
                console.log(`❌ Servicio no válido: ${origen}`);
                const errorResponse = await handleEncryptedError(
                    `Servicio no válido: ${origen}. Servicios disponibles: liveness, document_check, facematch`,
                    encrypted_aes_key,
                    initial_vector,
                    HTTP_CODES.BAD_REQUEST
                );
                // Establecer el Content-Type correcto para la respuesta de WhatsApp
                res.setHeader('Content-Type', 'text/plain');
                return res.status(errorResponse.statusCode).send(errorResponse.response);
        }
        
      
        
    } catch (error) {
        console.error('❌ Error general en el procesamiento:', error);
        
        // PASO 7: Error general - encriptar respuesta de error
        const errorResponse = await handleEncryptedError(
            `Error interno del servidor: ${error.message}`,
            encrypted_aes_key,
            initial_vector,
            HTTP_CODES.INTERNAL_ERROR
        );
        // Establecer el Content-Type correcto para la respuesta de WhatsApp
        res.setHeader('Content-Type', 'text/plain');
        return res.status(HTTP_CODES.OK).send(errorResponse.response);
    }
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'biometric_flows_lambda',
    timestamp: new Date().toISOString(),
    message: 'Servicio funcionando correctamente'
  });
});

// Ruta catch-all
app.get('/*', (req, res) => {
  res.json({
    message: `Hola desde ${process.env.SERVICE_NAME || 'Biometric Flows Lambda'}!`,
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /execute': 'Ejecutar workflow biométrico',
      'GET /health': 'Estado del servicio'
    }
  });
});

module.exports = {
  handler: serverless(app, {
      basePath: "/biometric_flows_lambda",
  }),
  app,
};
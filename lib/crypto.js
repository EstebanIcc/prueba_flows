const crypto = require('crypto');
require('dotenv').config();

const AES_ALGORITHM = 'aes-128-gcm';

/**
 * Desencripta la clave AES usando RSA
 * @param {string} encryptedAESKey - Clave AES encriptada en base64
 * @returns {Promise<Buffer>} Clave AES desencriptada
 */
const decryptAESKey = async (encryptedAESKey) => {
    try {
        const privateKey = process.env.PRIVATE_KEY;
        const passphrase = process.env.PRIVATE_KEY_PASSPHRASE;
        
        if (!privateKey) {
            throw new Error('Clave privada no configurada');
        }

        if (!passphrase) {
            throw new Error('Passphrase de la clave privada no configurada');
        }

        // Intentar diferentes formatos de clave
        let decryptedPrivateKey;
        const formats = [
            {
                key: privateKey,
                format: 'pem',
                type: 'pkcs8'
            },
            {
                key: `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`,
                format: 'pem',
                type: 'pkcs1'
            },
            {
                key: Buffer.from(privateKey, 'base64'),
                format: 'der',
                type: 'pkcs8'
            }
        ];

        let lastError;
        for (const format of formats) {
            try {
                decryptedPrivateKey = crypto.createPrivateKey({
                    ...format,
                    passphrase: passphrase
                });
                break;
            } catch (error) {
                lastError = error;
            }
        }

        if (!decryptedPrivateKey) {
            throw new Error(`No se pudo crear la clave privada con ningún formato: ${lastError.message}`);
        }

        const buffer = Buffer.from(encryptedAESKey, 'base64');

        // Usar directamente el método 4 (RSA_PKCS1_OAEP_PADDING)
        const decryptedKey = crypto.privateDecrypt(
            { 
                key: decryptedPrivateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            }, 
            buffer
        );

        return decryptedKey;
    } catch (error) {
        console.error('Error detallado al desencriptar la clave AES:', error);
        console.error('Stack trace:', error.stack);
        throw new Error(`Error al desencriptar la clave AES: ${error.message}`);
    }
};

/**
 * Desencripta los datos del flujo usando AES
 * @param {string} encryptedFlowData - Datos encriptados en base64
 * @param {Buffer} aesKey - Clave AES desencriptada
 * @param {string} iv - Vector de inicialización en base64
 * @returns {Object} Datos desencriptados
 */
const decryptFlowData = (encryptedFlowData, aesKey, iv) => {
    try {
        const decipher = crypto.createDecipheriv(AES_ALGORITHM, aesKey, Buffer.from(iv, 'base64'));
        const data = Buffer.from(encryptedFlowData, 'base64');
        
        // Verificar si los datos tienen el authTag
        if (data.length < 16) {
            throw new Error('Datos encriptados inválidos: longitud insuficiente para contener authTag');
        }

        const authTag = data.slice(-16);
        const encryptedContent = data.slice(0, -16);
        
        decipher.setAuthTag(authTag);
        
        const decryptedData = decipher.update(encryptedContent, null, 'utf8') + decipher.final('utf8');
        
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Error detallado al desencriptar los datos del flujo:', error);
        throw new Error(`Error al desencriptar los datos del flujo: ${error.message}`);
    }
};

/**
 * Encripta la respuesta usando AES
 * @param {Object} payload - Datos a encriptar
 * @param {Buffer} aesKey - Clave AES
 * @param {string} iv - Vector de inicialización en base64
 * @returns {Promise<string>} Datos encriptados en base64
 */
const encryptResponse = async (payload, aesKey, iv) => {
    try {
        const ivBuffer = Buffer.from(iv, 'base64');
        const cipher = await crypto.createCipheriv(
            AES_ALGORITHM,
            aesKey,
            ivBuffer.map((b) => ~b)
        );
        const encrypted = await Buffer.concat([
            cipher.update(JSON.stringify(payload), 'utf8'),
            cipher.final()
        ]);
        return Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64');
    } catch (error) {
        console.error('Error al encriptar la respuesta:', error);
        throw new Error('Error al encriptar la respuesta');
    }
};

/**
 * Desencripta un mensaje completo
 * @param {string} encryptedAESKey - Clave AES encriptada en base64
 * @param {string} encryptedFlowData - Datos encriptados en base64
 * @param {string} initialVector - Vector de inicialización en base64
 * @returns {Object} Datos desencriptados
 */
const decryptMessage = async (encryptedAESKey, encryptedFlowData, initialVector) => {
    try {
        const aesKey = await decryptAESKey(encryptedAESKey);
        return decryptFlowData(encryptedFlowData, aesKey, initialVector);
    } catch (error) {
        console.error('Error detallado al desencriptar el mensaje:', error);
        throw new Error(`Error al desencriptar el mensaje: ${error.message}`);
    }
};

module.exports = {
    decryptAESKey,
    decryptFlowData,
    encryptResponse,
    decryptMessage
}; 
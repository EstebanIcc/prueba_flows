# Biometric Flows Lambda

Lambda function para ejecutar workflows biométricos usando el servicio de Jelou Workflows.

## Descripción

Este servicio permite ejecutar workflows biométricos mediante una API REST. Recibe datos encriptados de WhatsApp Business API, los desencripta y procesa a través del servicio de workflows de Jelou.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Despliegue

```bash
npm run deploy
```

## Endpoints

### POST /execute
Ejecuta el workflow biométrico con datos encriptados de WhatsApp.

**Body:**
```json
{
  "encrypted_flow_data": "base64_encrypted_data",
  "encrypted_aes_key": "base64_encrypted_aes_key", 
  "initial_vector": "base64_iv"
}
```

### GET /health
Verifica el estado del servicio.

### GET /
Información general del servicio.

## Variables de entorno

### Configuración de la aplicación
- `SERVICE_NAME`: Nombre del servicio (default: biometric_flows_lambda)
- `NODE_ENV`: Entorno de ejecución (default: development)

### URLs de APIs
- `JELOU_API_BASE`: URL base de la API de Jelou (default: https://api.jelou.ai/v1)
- `WORKFLOWS_API_BASE`: URL base de la API de Workflows (default: https://workflows.jelou.ai/v1)

### Autenticación y API Keys
- `JELOU_AUTH`: Token de autenticación para la API de Jelou
- `WORKFLOWS_API_KEY`: API Key para la API de Workflows
- `WORKFLOW_API_KEY`: API Key para workflows específicos

### URLs de workflows específicos
- `WORKFLOW_URL`: URL del workflow de liveness
- `DOCUMENT_CHECK_URL`: URL del workflow de verificación de documentos
- `FACEMATCH_URL`: URL del workflow de comparación de imágenes

### Configuración de encriptación
- `AES_ALGORITHM`: Algoritmo AES a usar (default: aes-128-gcm)
- `PRIVATE_KEY`: Clave privada RSA para desencriptar
- `PRIVATE_KEY_PASSPHRASE`: Passphrase de la clave privada

### Configuración de HTTP
- `HTTP_OK_CODE`: Código HTTP para respuestas exitosas (default: 200)
- `HTTP_BAD_REQUEST_CODE`: Código HTTP para errores de validación (default: 200)
- `HTTP_UNAUTHORIZED_CODE`: Código HTTP para errores de autenticación (default: 200)
- `HTTP_FORBIDDEN_CODE`: Código HTTP para errores de autorización (default: 200)
- `HTTP_NOT_FOUND_CODE`: Código HTTP para recursos no encontrados (default: 200)
- `HTTP_INTERNAL_ERROR_CODE`: Código HTTP para errores internos (default: 200)
- `HTTP_MESSAGE_DECRYPTION_ERROR_CODE`: Código HTTP para errores de desencriptación (default: 200)

### URLs de servicios externos
- `MINITOOLS_BASE64_URL`: URL del servicio de conversión base64 a imagen

## Configuración

1. Copia el archivo `env.example` a `.env`
2. Configura las variables de entorno según tu entorno
3. Asegúrate de configurar las claves de encriptación (`PRIVATE_KEY` y `PRIVATE_KEY_PASSPHRASE`)

## URL del servicio

Una vez desplegado, el servicio estará disponible en:
`https://functions.jelou.ai/biometric_flows_lambda` 
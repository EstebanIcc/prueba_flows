# Biometric Flows Lambda

Lambda function para ejecutar workflows biométricos usando el servicio de Jelou Workflows.

## Descripción

Este servicio permite ejecutar workflows biométricos mediante una API REST. Recibe datos de video, empresa y usuario, y los procesa a través del servicio de workflows de Jelou.

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
Ejecuta el workflow biométrico.

**Body:**
```json
{
  "video": "STRING",
  "company": {
    "id": 1944,
    "name": "Jelou Marketplace",
    "clientId": "HOizO1xhzC4xpL7elhbDD1sbgTg8rxvr",
    "clientSecret": "BQayJfqYEZW61ymCaOkOtmldlBzDiDEXW9DuWxnTyNZfpYljZutwKemjVr0d6sne",
    "socketId": "9d7cad79-eb6b-48ee-ad15-114527bfd660"
  },
  "user": {
    "id": "e5fa9824-02f1-4914-ba96-939a6f50a172",
    "socketId": "e5fa9824-02f1-4914-ba96-939a6f50a172",
    "referenceId": "e5fa9824-02f1-4914-ba96-939a6f50a172",
    "names": "Impersonate User",
    "botId": "229b1a8f-11a5-4e90-96b0-cccb2d4217b0",
    "roomId": "G:229b1a8f-11a5-4e90-96b0-cccb2d4217b0:e5fa9824-02f1-4914-ba96-939a6f50a172",
    "legalId": "1234567890"
  }
}
```

### GET /health
Verifica el estado del servicio.

### GET /
Información general del servicio.

## Variables de entorno

- `SERVICE_NAME`: Nombre del servicio
- `WORKFLOW_URL`: URL del servicio de workflows
- `WORKFLOW_API_KEY`: API Key para el servicio de workflows
- `NODE_ENV`: Entorno de ejecución

## URL del servicio

Una vez desplegado, el servicio estará disponible en:
`https://functions.jelou.ai/biometric_flows_lambda` 
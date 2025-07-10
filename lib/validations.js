/**
 * Validaciones para servicios biométricos
 */

/**
 * Valida la respuesta del servicio Regula
 * @param {object} regulaData - Datos de respuesta de Regula (result.data.data)
 * @param {object} options - Opciones de validación
 * @param {string} options.validateExpiry - Habilitar validación de expiración ("true"/"false")
 * @param {string} options.validateAge - Habilitar validación de edad ("true"/"false")
 * @returns {object} Resultado de la validación
 */
function validateRegula(regulaData, options = {}) {
    console.log('🔍 Iniciando validación de respuesta de Regula...');
    
    let isSuccess = true;
    let errorCode = null;
    let errorMessage = null;
    
    function throwError(code, message) {
        errorCode = code;
        errorMessage = message;
        console.log("❌ Error Code:", code);
        console.log("❌ Error Message:", message);
        isSuccess = false;
    }
    
    function validateExpiryField(jsonData, shouldValidate) {
        if (!shouldValidate || shouldValidate === "false") {
            console.log('ℹ️ Validación de expiración deshabilitada');
            return;
        }
        
        console.log('🔍 Validando campo de expiración...');
        const expiryStatus = jsonData?.status_fields?.details_optical?.expiry;
        console.log('📅 Status de expiración:', expiryStatus);
        
        if (expiryStatus === "WAS_NOT_DONE") {
            throwError("no_expiracy_date", "No se pudo validar la fecha de expiración");
        }
        
        if (expiryStatus !== 'OK') {
            console.log("❌ Entro error de expiración");
            throwError("expired_date", "El documento está expirado");
        }
        
        console.log('✅ Validación de expiración exitosa');
    }
    
    function validateAge(jsonData, shouldValidate) {
        if (!shouldValidate || shouldValidate === "false") {
            console.log('ℹ️ Validación de edad deshabilitada');
            return;
        }
        
        console.log('🔍 Validando edad del usuario...');
        const age = jsonData?.verified_fields?.age;
        console.log('👤 Edad del usuario:', age);
        
        if (age === undefined) {
            throwError("undefined_age", "No se pudo validar la edad del usuario");
        }
        
        if (parseInt(age) < 18) {
            throwError("underage_user", "El usuario es menor de edad");
        }
        
        console.log('✅ Validación de edad exitosa');
    }
    function evaluarDocumento(data, expiry, type_qa) {
        const overallResult = data.image_quality_details?.overall_result;
        const { optical } = data?.status_fields || {};
        const { doc_type, image_QA, text } = data.status_fields?.details_optical || {};
        const errores = [];
    
        if (!expiry || expiry === "false") {
            // if (doc_type !== 'OK') {
            //     throwError('doc_type_invalid', 'No se pudo identificar correctamente el tipo de documento.');
            // }
            // return true;
    
            switch (type_qa.toLowerCase()) {
                case 'bajo':
                    if (doc_type !== 'OK') {
                        throwError('doc_type_invalid', 'No se pudo identificar correctamente el tipo de documento.');
                    }
                    break;
    
                case 'medio':
                    // const errores = [];
                    if (doc_type !== 'OK') {
                        errores.push('No se pudo identificar correctamente el tipo de documento.');
                    }
    
                    if (image_QA !== 'OK') {
                        errores.push('La calidad de la imagen capturada del documento no es adecuada para una validación confiable.');
                    }
    
                    if (errores.length > 0) {
                        
                        throwError('medium_qa_validation_failed', errores.join(' '));
                    }
                    break;
    
                case 'alto':
                    // const errores = [];
    
                    if (overallResult !== 'OK') {
                        errores.push('La validación general del documento no fue satisfactoria. Es posible que la imagen esté borrosa, tenga reflejos o no se haya interpretado correctamente.');
                    }
    
                    if (image_QA !== 'OK') {
                        errores.push('La calidad de la imagen capturada del documento no es adecuada para una validación confiable.');
                    }
    
                    if (doc_type !== 'OK') {
                        errores.push('No se pudo identificar correctamente el tipo de documento.');
                    }
    
                    if (errores.length > 0) {
                        throwError('high_qa_validation_failed', errores.join(' '));
                    }
    
                    break;
    
                default:
                    throwError('unknown_type_qa', `El nivel de validación '${type_qa}' no es reconocido.`);
            }
    
            return true;
        } else {
            switch (type_qa.toLowerCase()) {
                case 'bajo':
                    if (doc_type !== 'OK') {
                        throwError('doc_type_invalid', 'No se pudo identificar correctamente el tipo de documento.');
                    }
                    break;
    
                case 'medio':
                    if (overallResult !== 'OK') {
                        throwError('overall_result_invalid', 'La validación general del documento falló. Esto puede deberse a problemas con la calidad de la imagen o la interpretación de los datos extraídos.');
                    }
                    break;
    
                case 'alto':
                    // const errores = [];
    
                    if (overallResult !== 'OK') {
                        errores.push('La validación general del documento no fue satisfactoria. Es posible que la imagen esté borrosa, tenga reflejos o no se haya interpretado correctamente.');
                    }
    
                    if (optical !== 'OK') {
                        errores.push('No se pudo extraer correctamente el texto del documento mediante OCR (Reconocimiento Óptico de Caracteres).');
                    }
    
                    if (image_QA !== 'OK') {
                        errores.push('La calidad de la imagen capturada del documento no es adecuada para una validación confiable.');
                    }
    
                    if (text !== 'OK') {
                        errores.push('Los datos combinados extraídos del documento no pudieron ser interpretados correctamente.');
                    }
    
                    if (doc_type !== 'OK') {
                        errores.push('No se pudo identificar correctamente el tipo de documento.');
                    }
    
    
                    if (errores.length > 0) {
                        $utils.logger.log("errores", errores);
                        throwError('high_qa_validation_failed', errores.join(' '));
                    }
    
                    break;
    
                default:
                    throwError('unknown_type_qa', `El nivel de validación '${type_qa}' no es reconocido.`);
            }
    
            return true;
        }
    
    }
    
    // Ejecutar validaciones
    console.log('📋 Datos de Regula a validar:', JSON.stringify(regulaData, null, 2));
    
    // Validar expiración
    validateExpiryField(regulaData, options.validateExpiry || "false");
    
    // Validar edad
    validateAge(regulaData, options.validateAge || "false");

    evaluarDocumento(regulaData, options.validateExpiry, options.type_qa || "medio");

    
    console.log('🎯 Resultado de validaciones - isSuccess:', isSuccess);
    if (!isSuccess) {
        console.log('❌ Error Code Final:', errorCode);
        console.log('❌ Error Message Final:', errorMessage);
    }
    
    return {
        isSuccess,
        errorCode,
        errorMessage
    };
}

/**
 * Valida la respuesta del servicio Regula AI Tool
 * @param {object} output - Datos de respuesta de Regula AI Tool
 * @returns {object} Resultado de la validación
 */
function validateRegulaAiTool(output) {
    const node = "Document Check";
    
    // Función que verifica campos vacíos en un objeto `fields`
    const getMissingFields = (fields) => {
        const issuing_state_code = output?.value?.verified_fields?.issuing_state_code;
        
        let missingFields = {};
        
        Object.keys(fields).forEach(key => {
            if (issuing_state_code === "COL" || issuing_state_code === "PER") {
                const isValid = /[^0-9]/.test(fields[key]);
                if (isValid)
                    fields[key] = !isValid;
            }
            
            if (issuing_state_code === "MEX" && key === 'cic') {
                if (/[^0-9]/.test(fields[key]))
                    fields[key] = false;
            }
            
            if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(fields[key])) {
                fields[key] = false;
            }
            
            if (!fields[key]) {
                missingFields[key] = `No se logró leer el ${key}`;
            }
        });
        
        // Si hay campos vacíos, los almacena en variables
        if (Object.keys(missingFields).length > 0) {
            const hasMissingFields = true;
            const missing_fields = missingFields;
            console.log('⚠️ Campos faltantes detectados:', missing_fields);
            return {
                isSuccess: false,
                missing_fields
            };
        }
    };
    
    // Función para obtener los datos del documento según el país de emisión y el nombre del documento
    const getDataDocumentName = () => {
        let fields = {};
        let {
            document_number,
            issuing_state_code,
            personal_number,
            identifier,
            ocr_number
        } = output?.value?.verified_fields;
        
        const { document_name } = output?.value?.details;
        
        // Verifica el país de emisión para configurar los campos específicos
        if (issuing_state_code && issuing_state_code.includes("EC")) {
            issuing_state_code = "ECU";
        }
        
        switch (issuing_state_code) {
            case "ECU":
                switch (document_name) {
                    case "Ecuador - Id Card (2021)":
                    case "Ecuador - Voter Card (2023) #2":
                    case "Ecuador - Id Card (2021) Side B":
                    case "Ecuador - Id Card (2009) Side B":
                        fields.document_number = personal_number && personal_number?.length === 10 ? personal_number : document_number;
                        break;
                    default:
                        fields.document_number = document_number;
                        break;
                }
                fields.identifier = identifier;
                break;
                
            case "COL":
                fields.document_number = document_number && document_number?.length === 10 ? document_number : personal_number;
                break;
                
            case "MEX":
                fields.document_number = personal_number; //CURP
                fields.ocr_number = ocr_number; //OCR
                fields.cic = output?.value?.secondary_fields?.document_number || output?.value?.verified_fields?.other; //CIC
                break;
                
            default:
                fields.document_number = personal_number;
                break;
        }
        
        // Almacenar datos del documento
        const document_check_data = {
            document_check_data: output?.value,
            gov_entity_fields: fields
        };
        
        console.log('📋 Datos del documento procesados:', document_check_data);
        
        // Llama a `getMissingFields` para verificar campos faltantes en `fields`
        const missingFields = getMissingFields(fields);

        
        return {
            missingFields,
            document_check_data
        };
        
        
        
    };
    
    if (!output?.isSuccess) {
        // Manejo de Errores
        const errors = {
            human_error: {
                no_expiracy_date: "No logramos leer correctamente la fecha de expiración de tu documento.",
                document_fail: "La foto que enviaste no se reconoce como documento.",
                document_data: "",
                expired_date: "La fecha de expiración del documento enviado ha caducado. Recuerda que en este proceso solamente se aceptan documentos vigentes.",
                quality_Image: "Hemos detectado que las fotos que enviaste de tu documento no son de buena calidad.",
                undefined_age: "No se pudo obtener la edad del usuario",
                underage_user: "El usuario es menor de edad",
                doc_type_invalid: "no se pudo identificar correctamente el tipo de documento.",
                overall_result_invalid: "La validación general del documento falló. Esto puede deberse a problemas con la calidad de la imagen o la interpretación de los datos extraídos.",
                high_qa_validation_failed: ""
            },
            service_error: {
                HTTP_ERROR: "Ocurrió un error en el servicio.",
                CODE_ERROR: "Ocurrió un error en el servicio."
            }
        };
        
        
        // Determinar la categoría del error
        let category = Object.keys(errors).find(cat => output.value?.error_code in errors[cat]) || "service_error";
        
        let description = errors[category][output.value?.error_code];
        let generalDescription = output.value?.error_message;
        
        const errorMessage = description;
        
        const error_document_check = {
            node: node,
            description: description,
            code: generalDescription,
            category,
            provider: 'Regula'
        };
        
        const document_check_data = output?.value;
        
        console.log('❌ Error en validación Regula AI Tool:', error_document_check);
        
        return {
            isSuccess: false,
            errorCode: output.value?.error_code,
            errorMessage: errorMessage,
            error_document_check,
            document_check_data
        };
    } else {
        const document_check_data = output?.value;
        
        // Obtener la data según el país para la validación con la entidad gubernamental
        const processedData = getDataDocumentName();
        
        const regulaResponse = true;
        
        console.log('✅ Validación Regula AI Tool exitosa');
        console.log('📊 Datos del documento:', document_check_data);
        
        return {
            isSuccess: true,
            regulaResponse,
            document_check_data: processedData,
            missingFields: processedData.missingFields
        };
    }
}

/**
 * Valida la respuesta del servicio de liveness AWS
 * @param {object} output - Datos de respuesta del servicio AWS
 * @param {string} language - Idioma para los mensajes ("Es", "En")
 * @param {string} videoUrl - URL del video de prueba de vida
 * @returns {object} Resultado de la validación
 */
function livenessValidationError(output, language = "Es") {
    const node = "Vivacidad Pasiva - AWS";
    
   
        // 🔍 Categorizar errores
        const errores = {
            human_error: {
                resp_face: {
                    Es: "¡Lo sentimos! Analizamos tu video y *no pudimos detectar ningún rostro*.",
                    En: "We're sorry! We analyzed your video and *couldn't detect any face*."
                },
                mas_de_un_rostro: {
                    Es: "¡Lo sentimos! Analizamos tu video y *detectamos más de un rostro*.",
                    En: "We're sorry! We analyzed your video and *detected more than one face*."
                },
                rostro_lejos: {
                    Es: "¡Lo sentimos! Analizamos tu video y encontramos que *tu cara estaba un poco lejos de la cámara*.",
                    En: "We're sorry! We analyzed your video and found that *your face was a bit far from the camera*."
                },
                rostro_cerca: {
                    Es: "¡Lo sentimos! Analizamos tu video y al parecer *acercaste mucho tu cara a la cámara y no se logró capturar una imagen completa*.",
                    En: "We're sorry! We analyzed your video and it seems *you brought your face too close to the camera, and a complete image couldn't be captured*."
                },
                Rostro_cortado_cubierto: {
                    Es: "¡Lo sentimos! Analizamos tu video y *parece que estaba cubierto tu rostro o no te encontrabas bien centrado a la cámara*.",
                    En: "We're sorry! We analyzed your video and *it seems your face was covered or you weren't well-centered in the camera*."
                },
                ojos_cerrados: {
                    Es: "¡Lo sentimos! Analizamos tu video y no pudimos detectar bien tus ojos, al parecer *te encontrabas con lentes puestos o estabas con tus ojos un poco cerrados*.",
                    En: "We're sorry! We analyzed your video and couldn't detect your eyes well. It seems *you were wearing glasses or your eyes were slightly closed*."
                },
                low_quality: {
                    Es: "¡Lo sentimos! El video que recibimos tiene baja calidad y no pudimos procesarlo correctamente.",
                    En: "We're sorry. The video you sent was too low in quality, so we couldn't process it properly."
                }
            },
            service_error: {
                code_error: {
                    Es: "Lo sentimos, ocurrió un error inesperado en el servicio.",
                    En: "We're sorry, an unexpected error occurred in the service."
                },
                error_http: {
                    Es: "Lo sentimos, ocurrió un error inesperado en el servicio.",
                    En: "We're sorry, an unexpected error occurred in the service."
                },
                error_general: {
                    Es: "Lo sentimos, ocurrió un error inesperado en el servicio.",
                    En: "We're sorry, an unexpected error occurred in the service."
                }
            }
        };

        // 🔍 Códigos generales de error
        const generalErrors = {
            human_error: {
                resp_face: {
                    Es: "No se encontró un rostro",
                },
                mas_de_un_rostro: {
                    Es: "Se detectó más de 1 rostro",
                },
                rostro_lejos: {
                    Es: "El rostro se encuentra muy lejos",
                },
                rostro_cerca: {
                    Es: "El rostro se encuentra muy cerca",
                },
                Rostro_cortado_cubierto: {
                    Es: "El rostro se encuentra cubierto o recortado",
                },
                ojos_cerrados: {
                    Es: "El rostro tiene los ojos cerrados",
                }
            },
            service_error: {
                code_error: {
                    Es: "Error en nodo código",
                },
                error_http: {
                    Es: "Error HTTP",
                },
                error_general: {
                    Es: "Error General",
                }
            }
        };

        // 🛑 Asegurar que `output.name` tenga un valor
        const errorKey = output?.name ?? "error_general";
        const category = Object.entries(errores).find(([_, errors]) => errors[errorKey])?.[0] || "service_error";

        // 🎯 Obtener mensaje de error y código en el idioma correcto
        const selectedLanguage = errores[category][errorKey]?.[language] ?? errores[category][errorKey]?.["Es"];
        const selectedGeneralErrors = generalErrors[category][errorKey]?.["Es"];

        // 🔍 Manejo especial para `resp_face`
        let description = selectedLanguage;
        let generalDescription = selectedGeneralErrors;

        if (errorKey === "resp_face" && output?.description === "No se encontró un rostro") {
            description = language === "En"
                ? "Sorry! We analyzed your video and could not detect any face."
                : "¡Lo sentimos! Analizamos tu video y *no pudimos detectar ningún rostro*.";
            generalDescription = language === "En" ? "No face detected" : "No se encontró un rostro";
        } else if (errorKey === "resp_face") {
            // Caso con lentes
            description = language === "En"
                ? "Sorry! We analyzed your video and couldn't detect your eyes properly, it seems you were wearing glasses or had your eyes slightly closed."
                : "¡Lo sentimos! Analizamos tu video y no pudimos detectar bien tus ojos, al parecer *te encontrabas con lentes puestos o estabas con tus ojos un poco cerrados*.";
            generalDescription = language === "En" ? "Face has glasses" : "El rostro tiene lentes";
        }

        const errorMessage = description;

        const livenessError = {
            node,
            description,
            code: generalDescription,
            category,
            provider: "AWS"
        };

        console.log('❌ Error en validación de liveness AWS:', livenessError);
        
        return {
            isSuccess: false,
            errorMessage,
            livenessError,
            node
        };
    
}

/**
 * Valida la respuesta del servicio de detección de rostros de AWS
 * @param {object} faceResponse - Respuesta del servicio AWS Face Detection
 * @param {number} thresholdValue - Valor umbral para la calidad de la imagen (por defecto 70)
 * @returns {object} Resultado de la validación
 */
function livenessValidationAws(faceResponse, thresholdValue = 70) {
    console.log('🔍 Iniciando validación de rostros AWS...');
    console.log('📋 Respuesta de AWS:', JSON.stringify(faceResponse, null, 2));
    
    const faceDetails = faceResponse?.data?.FaceDetails || [];
    const firstFace = faceDetails[0];
    
    if (!firstFace) {
        console.log('❌ No se encontraron rostros en la imagen');
        return {
            isSuccess: false,
            errorCode: 'no_faces_found',
            errorMessage: 'No se encontraron rostros',
            resp_face: 'No se encontraron rostros'
        };
    }
    
    const { BoundingBox: boundingBox, FaceOccluded, Eyeglasses, Sunglasses, Emotions, EyesOpen, Quality } = firstFace;
    
    const qualitySharpness = Quality?.Sharpness || 0;
    const faceOccluded = FaceOccluded?.Value || false;
    const eyeglasses = Eyeglasses?.Value || false;
    const sunglasses = Sunglasses?.Value || false;
    const eyesOpen = EyesOpen?.Value || false;
    
    console.log('📊 Datos del rostro detectado:', {
        qualitySharpness,
        faceOccluded,
        eyeglasses,
        sunglasses,
        eyesOpen,
        boundingBox
    });
    
    /**
     * Determina el estado del rostro basado en el área del bounding box
     * @param {object} boundingBox - Coordenadas del rostro
     * @returns {string} Estado del rostro
     */
    function statusFaces(boundingBox) {
        const { Width, Height } = boundingBox;
        const area = Width * Height;
        const umbralLejos = 0.075;
        const umbralCerca = 0.62;
        
        console.log('📏 Área del rostro:', area);
        
        if (area <= umbralLejos) return 'Muy lejos';
        if (area >= umbralCerca) return 'Muy cerca';
        return 'Normal';
    }
    
    /**
     * Obtiene la emoción con mayor confianza
     * @param {Array} emotions - Array de emociones detectadas
     * @returns {object|null} Emoción con mayor confianza
     */
    function getHighestEmotion(emotions) {
        if (!emotions || emotions.length === 0) return null;
        
        return emotions.reduce((prev, curr) => (curr.Confidence > prev.Confidence ? curr : prev));
    }
    
    let respFace = statusFaces(boundingBox);
    const highestEmotion = getHighestEmotion(Emotions);
    const emotionHighest = highestEmotion?.Type || null;
    
    console.log('🎭 Emoción detectada:', emotionHighest);
    console.log('📍 Estado del rostro:', respFace);
    
    let isSuccess = true;
    let errorCode = null;
    let errorMessage = null;
    let respFaceMessage = null;
    
    // Validaciones en orden de prioridad
    if (qualitySharpness < thresholdValue) {
        isSuccess = false;
        errorCode = 'low_quality';
        errorMessage = 'Baja calidad de imagen';
        respFaceMessage = 'Baja calidad';
        console.log('❌ Calidad de imagen insuficiente:', qualitySharpness, '<', thresholdValue);
    } else if (faceDetails.length > 1) {
        isSuccess = false;
        errorCode = 'multiple_faces';
        errorMessage = 'Se detectaron múltiples rostros';
        respFaceMessage = 'Varios rostros encontrados';
        console.log('❌ Múltiples rostros detectados:', faceDetails.length);
    } else if (respFace === 'Muy lejos' || respFace === 'Muy cerca') {
        isSuccess = false;
        errorCode = 'face_distance';
        errorMessage = `Rostro ${respFace.toLowerCase()}`;
        respFaceMessage = respFace;
        console.log('❌ Distancia del rostro inadecuada:', respFace);
    } else if (faceOccluded) {
        isSuccess = false;
        errorCode = 'face_occluded';
        errorMessage = 'Rostro cubierto o parcialmente oculto';
        respFaceMessage = 'Rostro cubierto';
        console.log('❌ Rostro cubierto detectado');
    } else if (sunglasses) {
        isSuccess = false;
        errorCode = 'sunglasses_detected';
        errorMessage = 'Se detectaron gafas de sol';
        respFaceMessage = 'Rostro con gafas';
        console.log('❌ Gafas de sol detectadas');
    } else if (!eyesOpen) {
        isSuccess = false;
        errorCode = 'eyes_closed';
        errorMessage = 'Ojos cerrados detectados';
        respFaceMessage = 'Ojos cerrados';
        console.log('❌ Ojos cerrados detectados');
    } else {
        isSuccess = true;
        errorCode = null;
        errorMessage = null;
        respFaceMessage = 'Rostro limpio';
        console.log('✅ Rostro válido para liveness');
    }
    
    const result = {
        isSuccess,
        errorCode,
        errorMessage,
        resp_face: respFaceMessage,
        data: {
            qualitySharpness,
            faceOccluded,
            eyeglasses,
            sunglasses,
            eyesOpen,
            boundingBox,
            emotionHighest
        }
    };
    
    // Si es exitoso, agregar datos adicionales
    if (isSuccess) {
        result.resp_face_data = {
            emotionHighest
        };
    }
    
    console.log('🎯 Resultado de validación AWS:', JSON.stringify(result, null, 2));
    
    return result;
}

/**
 * Valida y procesa datos de entidades gubernamentales
 * @param {object} documentCheckData - Datos del documento verificado
 * @param {object} missingFields - Campos faltantes identificados
 * @param {object} user - Datos del usuario
 * @param {object} company - Datos de la empresa
 * @returns {object} Resultado de la validación con datos procesados
 */
function gobentityvalidation(documentCheckData, missingFields, user, company) {
    console.log('🔍 Iniciando validación de entidad gubernamental...');
    console.log('📋 Datos del documento:', JSON.stringify(documentCheckData, null, 2));
    console.log('📋 Campos faltantes:', JSON.stringify(missingFields, null, 2));
    
    // Limpiar propiedades de company
    const cleanCompany = { ...company };
    delete cleanCompany.properties;
    
    console.log('🏢 Company limpio:', JSON.stringify(cleanCompany, null, 2));
    
    // Procesar campos faltantes
    let processedMissingFields = missingFields;
    try {
        if (missingFields === " " || missingFields === "") {
            processedMissingFields = {};
        } else {
            if (typeof missingFields !== "object") {
                processedMissingFields = JSON.parse(missingFields);
            }
        }
    } catch (error) {
        console.log('⚠️ Error al parsear campos faltantes, usando objeto vacío:', error.message);
        processedMissingFields = {};
    }
    
    console.log('📋 Campos faltantes procesados:', JSON.stringify(processedMissingFields, null, 2));
    
    try {
        // Obtener y verificar datos del documento
        const documentData = documentCheckData.gov_entity_fields || {};
        let country = documentCheckData.document_check_data?.verified_fields?.issuing_state_name?.toUpperCase();
        const { document_name, document_description } = documentCheckData?.details || {};
        
        console.log('🌍 País detectado:', country);
        console.log('📄 Nombre del documento:', document_name);
        console.log('📝 Descripción del documento:', document_description);
        
        // Crear objeto de datos inicial
        const documentNumber = documentData?.document_number || processedMissingFields?.document_number;
        
        let data = {
            dni: documentNumber
        };
        console.log("data", data);
        let provider = "";
        
        // Normalizar país
        if (country?.includes("EC")) {
            country = "ECUADOR";
        }
        
        console.log('🌍 País normalizado:', country);
        
        // Configurar datos según el país
        switch (country) {
            case "ECUADOR":
                data.cedula = documentNumber;
                data.codigo_dactilar = documentData?.identifier || processedMissingFields?.identifier;
                provider = "ECU - Registro Civil";
                country = "ECUADOR";
                console.log('🇪🇨 Configurado para Ecuador');
                break;
                
            case "COLOMBIA":
                data.document_type = "CC";
                data.proveedor = "gse";
                provider = "COL: GSE";
                country = "COLOMBIA";
                console.log('🇨🇴 Configurado para Colombia');
                break;
                
            case "CHILE":
                data.dni = documentNumber;
                provider = "CHL: FLOID";
                country = "CHILE";
                console.log('🇨🇱 Configurado para Chile');
                break;
                
            case "PERU":
                data.dni = documentNumber;
                provider = "PER: RENIEC";
                country = "PERU";
                console.log('🇵🇪 Configurado para Perú');
                break;
                
            case "MEXICO":
                delete data.dni;
                data.curp = documentNumber;
                provider = "MEX: KIBAN";
                country = "MEXICO";
                console.log('🇲🇽 Configurado para México');
                break;
                
            default:
                console.log('⚠️ País no reconocido:', country);
                provider = "UNKNOWN";
                break;
        }
        console.log("data", data);
        // Caso especial para México - actualizar document_check_data
        let updatedDocumentCheckData = documentCheckData;
        if (country === "MEXICO") {
            updatedDocumentCheckData = {
                ...documentCheckData,
                gov_entity_fields: {
                    ...documentData,
                    ...data
                }
            };
            console.log('🇲🇽 Document check data actualizado para México');
        }
        
        const result = {
            isValid: true,
            user: user,
            company: cleanCompany,
            country: country,
            data_input: data,
            provider: provider,
            document_name: document_name,
            document_description: document_description,
            missing_fields: processedMissingFields,
            document_check_data: updatedDocumentCheckData
        };
        
        console.log('✅ Validación de entidad gubernamental exitosa');
        console.log('📊 Resultado:', JSON.stringify(result, null, 2));
        
        return result;
        
    } catch (error) {
        console.error('❌ Error en validación de entidad gubernamental:', error.message);
        
        return {
            isValid: false,
            error: error.message,
            user: user,
            company: cleanCompany,
            country: null,
            data_input: {},
            provider: "",
            document_name: "",
            document_description: "",
            missing_fields: processedMissingFields,
            document_check_data: documentCheckData
        };
    }
}

module.exports = {
    validateRegula,
    validateRegulaAiTool,
    livenessValidationError,
    livenessValidationAws,
    gobentityvalidation
}; 
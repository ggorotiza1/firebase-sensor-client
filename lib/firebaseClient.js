const admin = require('firebase-admin');
const fs = require('fs');

class FirebaseClient {
    /**
     * Inicializa la conexión a Firebase Realtime Database
     */
    constructor({ credentialPath, databaseURL }) {
        if (!fs.existsSync(credentialPath)) {
            throw new Error(`Archivo de credencial no encontrado: ${credentialPath}`);
        }

        const serviceAccount = require(credentialPath);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL
            });
        }

        this.db = admin.database();
    }

    /**
     * Devuelve la fecha actual ajustada a hora Ecuador (UTC-5)
     */
    getEcuadorDate() {
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000; // en ms
        return new Date(utc - (5 * 60 * 60 * 1000)); // menos 5 horas
    }

    /**
     * Sube cualquier tipo de lectura de sensor a Firebase
     * @param {Object} data - Objeto con los datos a subir (estructura libre)
     * @param {string} sensorId - ID único del sensor
     * @param {string} tipo - Tipo de sensor (energia, luminosidad, presencia, etc.)
     * @param {string} [basePath='/lecturas'] - Ruta raíz en Firebase
     */
    async uploadSensorData(data, sensorId, tipo, basePath = '/lecturas') {
        if (!sensorId || !tipo || !data || typeof data !== 'object') {
            throw new Error('Faltan datos, sensorId o tipo de sensor');
        }

        const ecuadorDate = this.getEcuadorDate();

        // Partes de la fecha en Ecuador
        const year = ecuadorDate.getFullYear();
        const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
        const day = String(ecuadorDate.getDate()).padStart(2, '0');
        const hour = String(ecuadorDate.getHours()).padStart(2, '0');
        const minute = String(ecuadorDate.getMinutes()).padStart(2, '0');
        const second = String(ecuadorDate.getSeconds()).padStart(2, '0');

        // Ruta con hora Ecuador
        const path = `${basePath}/${tipo}/${sensorId}/${year}/${month}/${day}/${hour}/${minute}`;

        // ISO Ecuador con offset -05:00
        const timestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00`;

        await this.db.ref(path).set({
            ...data,
            sensorId,
            tipo,
            timestamp,                          // hora Ecuador
            timestamp_unix_ms: ecuadorDate.getTime(),
            timezone_offset_min: -300,          // -5h en minutos
            year_local: year,
            month_local: parseInt(month, 10),
            day_local: parseInt(day, 10),
            hour_local: parseInt(hour, 10),
            minute_local: parseInt(minute, 10),
            second_local: parseInt(second, 10)
        });
    }

    /**
     * Obtiene los datos desde cualquier ruta
     * @param {string} path - Ruta en Firebase
     * @returns {Promise<any>}
     */
    async get(path) {
        const snapshot = await this.db.ref(path).once('value');
        return snapshot.val();
    }
}

module.exports = FirebaseClient;

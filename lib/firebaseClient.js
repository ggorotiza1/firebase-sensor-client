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

        const now = new Date();

        // Fecha Ecuador (UTC-5) formateada
        const ecuadorTime = new Intl.DateTimeFormat('es-EC', {
            timeZone: 'America/Guayaquil',
            dateStyle: 'short',
            timeStyle: 'medium'
        }).format(now);

        // Partes de fecha/hora en Ecuador (para organizar en rutas)
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Guayaquil',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).formatToParts(now);

        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;

        const path = `${basePath}/${tipo}/${sensorId}/${year}/${month}/${day}/${hour}/${minute}`;

        await this.db.ref(path).set({
            ...data,
            timestampUTC: now.toISOString(),   // siempre en UTC
            timestampEcuador: ecuadorTime      // hora local Ecuador
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
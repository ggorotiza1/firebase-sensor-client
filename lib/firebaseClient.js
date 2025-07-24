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
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');

        const path = `${basePath}/${tipo}/${sensorId}/${year}/${month}/${day}/${hour}/${minute}`;

        await this.db.ref(path).set({
            ...data,
            timestamp: now.toISOString()
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

const admin = require('firebase-admin');
const fs = require('fs');

class FirebaseClient {
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
        this.offsetHours = -5; // Ecuador UTC-5
    }

    /**
     * Convierte la fecha actual a hora Ecuador (matemáticamente).
     */
    getEcuadorDate() {
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000; // hora UTC en ms
        const ecuador = new Date(utc + this.offsetHours * 3600000);  // aplicar -5 horas
        return ecuador;
    }

    async uploadSensorData(data, sensorId, tipo, basePath = '/lecturas') {
        if (!sensorId || !tipo || !data || typeof data !== 'object') {
            throw new Error('Faltan datos, sensorId o tipo de sensor');
        }

        const now = new Date();             // fecha UTC real
        const ecuadorDate = this.getEcuadorDate(); // fecha ajustada a Ecuador

        // Partes de la fecha ecuatoriana
        const year = ecuadorDate.getFullYear();
        const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
        const day = String(ecuadorDate.getDate()).padStart(2, '0');
        const hour = String(ecuadorDate.getHours()).padStart(2, '0');
        const minute = String(ecuadorDate.getMinutes()).padStart(2, '0');
        const second = String(ecuadorDate.getSeconds()).padStart(2, '0');

        // Ruta con hora Ecuador
        const path = `${basePath}/${tipo}/${sensorId}/${year}/${month}/${day}/${hour}/${minute}`;

        // ISO Ecuador con offset -05:00
        const timestampEcuador = `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00`;

        await this.db.ref(path).set({
            ...data,
            timestampUTC: now.toISOString(),    // referencia universal
            timestampEcuador                    // hora real de Ecuador
        });
    }

    async get(path) {
        const snapshot = await this.db.ref(path).once('value');
        return snapshot.val();
    }
}

module.exports = FirebaseClient;

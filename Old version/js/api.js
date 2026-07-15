// ==========================================
// API DEL SISTEMA LOGÍSTICO PT
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbxInwRTenjyJJm98Ca3rtewTghXcvqreinGyhmZpeqBWmLjqvt_JK4z6xCPSfAm3XxsBw/exec";

const API = {

    async post(datos) {

        try {

            const respuesta = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify(datos)
            });

            const texto = await respuesta.text();

            if (!respuesta.ok) {
                console.error("Respuesta HTTP:", respuesta.status, texto);
                return {
                    ok: false,
                    mensaje: "El servidor respondió con error " + respuesta.status
                };
            }

            try {
                return JSON.parse(texto);
            } catch (errorJSON) {
                console.error("Respuesta no JSON:", texto);
                return {
                    ok: false,
                    mensaje: "El servidor no devolvió una respuesta válida."
                };
            }

        } catch (error) {

            console.error("Error API:", error);

            return {
                ok: false,
                mensaje: "Error al conectar con el servidor."
            };

        }

    }

};
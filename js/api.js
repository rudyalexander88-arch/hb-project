// ==========================================
// API DEL SISTEMA LOGÍSTICO PT
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbxInwRTenjyJJm98Ca3rtewTghXcvqreinGyhmZpeqBWmLjqvt_JK4z6xCPSfAm3XxsBw/exec";


const API = {

    obtenerSesion() {

        try {

            return JSON.parse(
                localStorage.getItem("sesion") ||
                sessionStorage.getItem("sesion") ||
                "null"
            );

        } catch (error) {

            console.error(
                "No fue posible leer la sesión:",
                error
            );

            return null;

        }

    },


    limpiarSesion() {

        localStorage.removeItem("sesion");
        sessionStorage.removeItem("sesion");

    },


    _cerrandoSesionInvalidada: false,


    cerrarPorSesionInvalidada(
        mensaje
    ) {

        if (
            this._cerrandoSesionInvalidada
        ) {

            return;

        }


        this._cerrandoSesionInvalidada =
            true;


        this.limpiarSesion();


        if (
            window.Sistema &&
            typeof window.Sistema.error ===
                "function"
        ) {

            window.Sistema.error(
                mensaje ||
                "Su sesión ya no está activa.",
                3500
            );

        }


        window.setTimeout(
            () => {

                const rutaActual =
                    window.location.pathname;


                const rutaLogin =
                    rutaActual.includes(
                        "/dashboard/"
                    )
                        ? "../index.html"
                        : "index.html";


                window.location.href =
                    rutaLogin;

            },
            1200
        );

    },


    prepararSolicitud(
        datos
    ) {

        const solicitud = {
            ...(datos || {})
        };


        const accion =
            String(
                solicitud.action ||
                solicitud.accion ||
                ""
            ).trim();


        const accionesPublicas = [
            "login",
            "forzarNuevaSesion",
            "ping"
        ];


        if (
            accionesPublicas.includes(
                accion
            )
        ) {

            return solicitud;

        }


        const sesion =
            this.obtenerSesion();


        if (!sesion) {

            return solicitud;

        }


        if (
            !solicitud.idEmpleado
        ) {

            solicitud.idEmpleado =
                sesion.idEmpleado ||
                "";

        }


        if (
            !solicitud.usuarioSesion
        ) {

            solicitud.usuarioSesion =
                sesion.usuario ||
                "";

        }


        if (
            !solicitud.tokenSesion
        ) {

            solicitud.tokenSesion =
                sesion.tokenSesion ||
                "";

        }


        return solicitud;

    },


    async post(
        datos
    ) {
        const solicitud = this.prepararSolicitud(datos);
        const accion = String(solicitud.action || solicitud.accion || "");
        // Solo se reintentan consultas y escrituras idempotentes. Nunca crear,
        // finalizar, subir archivos ni enviar correos: podrían duplicarse.
        const reintentoSeguro = /^(listar|obtener|consultar|buscar|ping)/i.test(accion) || accion === "guardarDetalleInspeccion";
        const intentos = reintentoSeguro ? 2 : 1;

        for (let intento = 1; intento <= intentos; intento++) {
            let temporizador;
            try {
                if (typeof navigator !== "undefined" && navigator.onLine === false) {
                    return {ok:false,codigo:"SIN_CONEXION",mensaje:"El dispositivo no tiene conexión a internet. Sus cambios locales permanecen guardados."};
                }

                const controlador = typeof AbortController !== "undefined" ? new AbortController() : null;
                if (controlador) temporizador = setTimeout(() => controlador.abort(), 45000);
                const opciones = {method:"POST",body:JSON.stringify(solicitud)};
                if (controlador) opciones.signal = controlador.signal;
                const respuesta = await fetch(API_URL, opciones);
                clearTimeout(temporizador);
                const texto = await respuesta.text();

                if (!respuesta.ok) {
                    console.error("Respuesta HTTP:",respuesta.status,texto);
                    if (intento < intentos && [408,429,500,502,503,504].includes(respuesta.status)) {
                        await new Promise(resolve => setTimeout(resolve, 1200 * intento));
                        continue;
                    }
                    return {ok:false,codigo:"HTTP_" + respuesta.status,mensaje:"El servidor respondió con error " + respuesta.status};
                }

                let resultado;
                try {
                    resultado = JSON.parse(texto);
                } catch(errorJSON) {
                    console.error("Respuesta no JSON:",texto);
                    return {ok:false,codigo:"RESPUESTA_INVALIDA",mensaje:"El servidor no devolvió una respuesta válida."};
                }

                if (resultado && resultado.codigo === "SESION_INVALIDADA") this.cerrarPorSesionInvalidada(resultado.mensaje);
                return resultado;
            } catch(error) {
                clearTimeout(temporizador);
                console.error("Error API, acción " + accion + ", intento " + intento + ":",error);
                if (intento < intentos) {
                    await new Promise(resolve => setTimeout(resolve, 1500 * intento));
                    continue;
                }
                return {ok:false,codigo:error && error.name === "AbortError" ? "TIEMPO_AGOTADO" : "ERROR_CONEXION",mensaje:error && error.name === "AbortError" ? "El servidor tardó demasiado en responder. Intente nuevamente." : "Error al conectar con el servidor. Verifique la conexión e intente nuevamente."};
            }
        }

    }

};


window.API = API;

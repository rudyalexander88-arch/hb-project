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

        try {

            const solicitud =
                this.prepararSolicitud(
                    datos
                );


            const respuesta =
                await fetch(
                    API_URL,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify(
                                solicitud
                            )
                    }
                );


            const texto =
                await respuesta.text();


            if (
                !respuesta.ok
            ) {

                console.error(
                    "Respuesta HTTP:",
                    respuesta.status,
                    texto
                );


                return {
                    ok:
                        false,

                    mensaje:
                        "El servidor respondió con error " +
                        respuesta.status
                };

            }


            let resultado;


            try {

                resultado =
                    JSON.parse(
                        texto
                    );

            } catch (errorJSON) {

                console.error(
                    "Respuesta no JSON:",
                    texto
                );


                return {
                    ok:
                        false,

                    mensaje:
                        "El servidor no devolvió una respuesta válida."
                };

            }


            if (
                resultado &&
                resultado.codigo ===
                    "SESION_INVALIDADA"
            ) {

                this.cerrarPorSesionInvalidada(
                    resultado.mensaje
                );

            }


            return resultado;


        } catch (error) {

            console.error(
                "Error API:",
                error
            );


            return {
                ok:
                    false,

                mensaje:
                    "Error al conectar con el servidor."
            };

        }

    }

};


window.API = API;

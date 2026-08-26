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

        this.limpiarCacheConsultas();
        localStorage.removeItem("sesion");
        sessionStorage.removeItem("sesion");

    },


    _cerrandoSesionInvalidada: false,


    cerrarPorSesionInvalidada(mensaje) {

        if (this._cerrandoSesionInvalidada) {
            return;
        }

        this._cerrandoSesionInvalidada = true;

        this.limpiarSesion();

        if (
            window.Sistema &&
            typeof window.Sistema.error === "function"
        ) {

            window.Sistema.error(
                mensaje || "Su sesión ya no está activa.",
                3500
            );

        }

        window.setTimeout(
            () => {

                const rutaActual = window.location.pathname;

                const rutaLogin = rutaActual.includes("/dashboard/")
                    ? "../index.html"
                    : "index.html";

                window.location.href = rutaLogin;

            },
            1200
        );

    },


    prepararSolicitud(datos) {

        const solicitud = {
            ...(datos || {})
        };

        const accion = String(
            solicitud.action ||
            solicitud.accion ||
            ""
        ).trim();

        const accionesPublicas = [
            "login",
            "forzarNuevaSesion",
            "ping"
        ];

        if (accionesPublicas.includes(accion)) {
            return solicitud;
        }

        const sesion = this.obtenerSesion();

        if (!sesion) {
            return solicitud;
        }

        if (!solicitud.idEmpleado) {
            solicitud.idEmpleado = sesion.idEmpleado || "";
        }

        if (!solicitud.usuarioSesion) {
            solicitud.usuarioSesion = sesion.usuario || "";
        }

        if (!solicitud.tokenSesion) {
            solicitud.tokenSesion = sesion.tokenSesion || "";
        }

        return solicitud;

    },


    _prefijoCache: "bon_consulta_v2:",
    _consultasEnCurso: new Map(),
    _versionesPendientes: null,
    _versionesEnCurso: null,
    _versionesConfirmadas: null,
    _errorValidacionCiclo: null,
    _avisoConexionCiclo: false,
    _seguimientoNavegacionInstalado: false,
    _recuperacionEstilosInstalada: false,
    _solicitudesRedActivas: 0,
    _colaSolicitudesRed: [],
    _maximoSolicitudesSimultaneas: 1,

    _accion(datos) {
        return String(datos && (datos.action || datos.accion) || "").trim();
    },

    _esConsultaCacheable(accion) {
        return /^(listar|obtener|consultar|buscar)/i.test(accion) &&
            !/^(obtenerVersionesModulos|obtenerMarcacionPersonalActual|obtenerDisponibilidadMaterialCamara|obtenerPerfilUsuario|obtenerInspeccionActiva|obtenerBorrador|verificarSesionUsuario)$/i.test(accion);
    },

    _serializarEstable(valor) {
        if (Array.isArray(valor)) {
            return "[" + valor.map(elemento => this._serializarEstable(elemento)).join(",") + "]";
        }
        if (valor && typeof valor === "object") {
            return "{" + Object.keys(valor).sort().map(clave =>
                JSON.stringify(clave) + ":" + this._serializarEstable(valor[clave])
            ).join(",") + "}";
        }
        return JSON.stringify(valor === undefined ? null : valor);
    },

    _claveConsulta(solicitud) {
        const sesion = this.obtenerSesion();
        if (!sesion) return "";
        const datos = {...solicitud};
        delete datos.tokenSesion;
        delete datos.usuarioSesion;
        delete datos.__forzarActualizacion;
        delete datos.forzarActualizacion;
        const usuario = String(sesion.idEmpleado || sesion.usuario || "");
        if (!usuario) return "";
        return this._prefijoCache + usuario + ":" + this._serializarEstable(datos);
    },

    _leerCache(clave) {
        try {
            const texto = sessionStorage.getItem(clave);
            if (!texto) return null;
            const guardado = JSON.parse(texto);
            return guardado && guardado.resultado && guardado.versiones ? guardado : null;
        } catch (error) {
            return null;
        }
    },

    _guardarCache(clave, resultado) {
        if (!clave || !resultado || resultado.ok === false || !resultado.__versionesModulos) return;
        try {
            const claves = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const actual = sessionStorage.key(i);
                if (actual && actual.indexOf(this._prefijoCache) === 0) claves.push(actual);
            }
            if (claves.length >= 60) sessionStorage.removeItem(claves[0]);
            sessionStorage.setItem(clave, JSON.stringify({
                versiones: resultado.__versionesModulos,
                resultado: resultado,
                guardado: Date.now()
            }));
        } catch (error) {
            console.warn("No fue posible guardar temporalmente la consulta:", error);
        }
    },

    limpiarCacheConsultas(modulos) {
        try {
            const lista = Array.isArray(modulos) ? modulos.map(m => String(m).toUpperCase()) : [];
            const eliminar = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const clave = sessionStorage.key(i);
                if (!clave || clave.indexOf(this._prefijoCache || "bon_consulta_v2:") !== 0) continue;
                if (!lista.length) {eliminar.push(clave);continue;}
                const registro = this._leerCache(clave);
                if (!registro || Object.keys(registro.versiones || {}).some(m => lista.includes(m))) eliminar.push(clave);
            }
            eliminar.forEach(clave => sessionStorage.removeItem(clave));
        } catch (error) {
            console.warn("No fue posible limpiar la caché local:", error);
        }
    },

    invalidarCache(modulos) {
        this.limpiarCacheConsultas(modulos);
    },

    _ejecutarSolicitudRed(tarea) {
        return new Promise((resolve, reject) => {
            const ejecutar = () => {
                this._solicitudesRedActivas += 1;

                Promise.resolve()
                    .then(tarea)
                    .then(resolve, reject)
                    .finally(() => {
                        this._solicitudesRedActivas -= 1;

                        const siguiente = this._colaSolicitudesRed.shift();

                        if (siguiente) {
                            siguiente();
                        }
                    });
            };

            if (
                this._solicitudesRedActivas <
                this._maximoSolicitudesSimultaneas
            ) {
                ejecutar();
            } else {
                this._colaSolicitudesRed.push(ejecutar);
            }
        });
    },


    _errorTemporalValidacion(error) {
        const codigo = String(error && error.codigo || "").toUpperCase();

        return [
            "SIN_CONEXION",
            "ERROR_CONEXION",
            "TIEMPO_AGOTADO",
            "RESPUESTA_INVALIDA"
        ].includes(codigo) || /^HTTP_(404|408|429|500|502|503|504)$/.test(codigo);
    },

    _invalidarCicloVersiones() {
        this._versionesConfirmadas = null;
        this._errorValidacionCiclo = null;
        this._avisoConexionCiclo = false;
    },

    _instalarSeguimientoNavegacion() {
        if (this._seguimientoNavegacionInstalado || typeof document === "undefined") return;
        this._seguimientoNavegacionInstalado = true;

        document.addEventListener("click", evento => {
            const elemento = evento.target;
            if (!elemento || typeof elemento.closest !== "function") return;

            if (elemento.closest("#sidebarPrincipal li, #sidebarPrincipal a, .sidebar li, .menu-lateral li, [data-modulo]")) {
                this._invalidarCicloVersiones();
            }
        }, true);

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") this._invalidarCicloVersiones();
        });

        window.addEventListener("online", () => this._invalidarCicloVersiones());
    },

    _instalarRecuperacionEstilos() {
        if (this._recuperacionEstilosInstalada || typeof document === "undefined") return;
        this._recuperacionEstilosInstalada = true;

        const recuperar = enlace => {
            if (!enlace || enlace.tagName !== "LINK" || enlace.dataset.bonReintento === "1") return;
            if (!String(enlace.rel || "").toLowerCase().includes("stylesheet") || enlace.sheet) return;

            let direccion;
            try { direccion = new URL(enlace.href, window.location.href); }
            catch (error) { return; }

            if (direccion.origin !== window.location.origin || enlace.dataset.bonRecuperando === "1") return;
            this._reintentarEstiloLocal(enlace, 0);
        };

        document.addEventListener("error", evento => recuperar(evento.target), true);

        const revisar = () => {
            document.querySelectorAll('link[rel~="stylesheet"]').forEach(recuperar);
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", revisar, {once: true});
        } else {
            revisar();
        }

        window.addEventListener("load", () => window.setTimeout(revisar, 300), {once: true});
    },

    _reintentarEstiloLocal(enlace, intento) {
        if (!enlace || enlace.sheet || intento >= 3) {
            if (enlace) delete enlace.dataset.bonRecuperando;
            return;
        }

        enlace.dataset.bonRecuperando = "1";
        const espera = [500, 1500, 3000][intento];

        window.setTimeout(() => {
            if (enlace.sheet || !enlace.parentNode) {
                delete enlace.dataset.bonRecuperando;
                return;
            }

            const reemplazo = enlace.cloneNode(false);
            const direccion = new URL(enlace.href, window.location.href);
            direccion.searchParams.set("_bon_recuperar", Date.now() + "-" + intento);
            reemplazo.href = direccion.toString();
            reemplazo.dataset.bonReintento = "1";
            reemplazo.onload = () => {
                delete reemplazo.dataset.bonReintento;
                delete reemplazo.dataset.bonRecuperando;
                if (enlace.parentNode) enlace.parentNode.removeChild(enlace);
            };
            reemplazo.onerror = () => {
                if (reemplazo.parentNode) reemplazo.parentNode.removeChild(reemplazo);
                this._reintentarEstiloLocal(enlace, intento + 1);
            };
            enlace.parentNode.insertBefore(reemplazo, enlace.nextSibling);
        }, espera);
    },


    async _solicitarVersiones(modulos) {
        const requeridos = [...new Set((modulos || []).map(m => String(m).toUpperCase()).filter(Boolean))];
        if (!requeridos.length) return {};

        if (this._versionesConfirmadas) return this._versionesConfirmadas;
        if (this._errorValidacionCiclo) throw this._errorValidacionCiclo;

        if (this._versionesEnCurso) {
            return this._versionesEnCurso;
        }

        if (!this._versionesPendientes) {
            const lote = {modulos: new Set(), consultas: [], programado: false};
            this._versionesPendientes = lote;
            lote.programado = true;
            window.setTimeout(() => {
                if (this._versionesPendientes === lote) this._versionesPendientes = null;

                const consulta = this._enviarRed({
                    action: "obtenerVersionesModulos",
                    modulos: []
                }).then(resultado => {
                    if (!resultado || resultado.ok === false) {
                        const error = new Error(
                            resultado && resultado.mensaje ||
                            "No fue posible validar las versiones."
                        );

                        error.codigo =
                            resultado && resultado.codigo || "VALIDACION_VERSIONES";

                        throw error;
                    }

                    const versiones = resultado.data && resultado.data.versiones ||
                        resultado.versiones || {};
                    this._versionesConfirmadas = versiones;
                    this._errorValidacionCiclo = null;
                    return versiones;
                }).catch(error => {
                    if (this._errorTemporalValidacion(error)) {
                        this._errorValidacionCiclo = error;
                    }
                    throw error;
                });

                this._versionesEnCurso = consulta;

                consulta.then(
                    versiones => lote.consultas.forEach(item => item.resolve(versiones)),
                    error => lote.consultas.forEach(item => item.reject(error))
                ).finally(() => {
                    if (this._versionesEnCurso === consulta) {
                        this._versionesEnCurso = null;
                    }
                });
            }, 12);
        }
        const lote = this._versionesPendientes;
        requeridos.forEach(modulo => lote.modulos.add(modulo));
        return new Promise((resolve, reject) => lote.consultas.push({resolve, reject}));
    },

    _versionesCoinciden(locales, actuales) {
        return Object.keys(locales || {}).length > 0 && Object.keys(locales).every(modulo =>
            Number(locales[modulo]) === Number(actuales[modulo])
        );
    },

    async post(datos) {
        const solicitud = this.prepararSolicitud(datos);
        const accion = this._accion(solicitud);
        const cacheable = this._esConsultaCacheable(accion);
        const forzar = solicitud.__forzarActualizacion === true || solicitud.forzarActualizacion === true;
        const clave = cacheable ? this._claveConsulta(solicitud) : "";

        if (forzar) this._invalidarCicloVersiones();

        if (cacheable && clave && !forzar) {
            const guardado = this._leerCache(clave);
            if (guardado) {
                try {
                    const actuales = await this._solicitarVersiones(Object.keys(guardado.versiones));
                    if (this._versionesCoinciden(guardado.versiones, actuales)) return guardado.resultado;
                } catch (error) {

                    if (error && error.codigo === "SESION_INVALIDADA") {
                        return {
                            ok: false,
                            codigo: error.codigo,
                            mensaje: error.message
                        };
                    }

                    if (this._errorTemporalValidacion(error)) {
                        if (!this._avisoConexionCiclo) {
                            console.warn(
                                "Google no respondió temporalmente; se utilizará la información guardada:",
                                accion,
                                error.codigo
                            );
                            this._avisoConexionCiclo = true;
                        }

                        return guardado.resultado;
                    }

                    console.warn("No se pudo validar la caché; se consultará el servidor:", accion, error);
                }
            }
            if (this._consultasEnCurso.has(clave)) return this._consultasEnCurso.get(clave);
        }

        const ejecucion = this._enviarRed(solicitud).then(resultado => {
            if (cacheable && clave) this._guardarCache(clave, resultado);
            if (!cacheable && resultado && resultado.ok !== false) {
                if (accion !== "obtenerVersionesModulos" && accion !== "verificarSesionUsuario") {
                    this._invalidarCicloVersiones();
                }
                if (resultado.__invalidarCacheCompleta) this.limpiarCacheConsultas();
                else if (resultado.__versionesModulos) this.limpiarCacheConsultas(Object.keys(resultado.__versionesModulos));
            }
            return resultado;
        });

        if (!cacheable || !clave) return ejecucion;
        this._consultasEnCurso.set(clave, ejecucion);
        try {return await ejecucion;} finally {this._consultasEnCurso.delete(clave);}
    },

    async _enviarRed(datos) {

        const solicitud = this.prepararSolicitud(datos);

        const accion = String(
            solicitud.action ||
            solicitud.accion ||
            ""
        ).trim();

        const reintentoSeguro =
            /^(listar|obtener|consultar|buscar|ping)/i.test(accion) ||
            accion === "verificarSesionUsuario";

        const intentos = reintentoSeguro ? 3 : 1;

        const erroresReintentables = [
            404,
            408,
            429,
            500,
            502,
            503,
            504
        ];

        for (let intento = 1; intento <= intentos; intento++) {

            let temporizador;

            try {

                if (
                    typeof navigator !== "undefined" &&
                    navigator.onLine === false
                ) {

                    return {
                        ok: false,
                        codigo: "SIN_CONEXION",
                        mensaje:
                            "El dispositivo no tiene conexión a internet. " +
                            "Sus cambios locales permanecen guardados."
                    };

                }

                const controlador =
                    typeof AbortController !== "undefined"
                        ? new AbortController()
                        : null;

                if (controlador) {

                    temporizador = window.setTimeout(
                        () => controlador.abort(),
                        60000
                    );

                }

                // USO DE TEXT/PLAIN PARA EVITAR PREFLIGHT Y BLOQUEOS CORS
                const opciones = {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    body: JSON.stringify(solicitud),
                    cache: "no-store",
                    redirect: "follow"
                };

                if (controlador) {
                    opciones.signal = controlador.signal;
                }

                const respuesta = await this._ejecutarSolicitudRed(
                    () => fetch(API_URL, opciones)
                );

                window.clearTimeout(temporizador);

                const texto = await respuesta.text();

                if (!respuesta.ok) {

                    if (erroresReintentables.includes(respuesta.status)) {
                        console.warn("Respuesta temporal del servidor:", respuesta.status, accion);
                    } else {
                        console.error("Respuesta HTTP:", respuesta.status, String(texto || "").slice(0, 180));
                    }

                    if (
                        intento < intentos &&
                        erroresReintentables.includes(respuesta.status)
                    ) {

                        const espera = 1500 * intento;

                        console.warn(
                            "Reintentando acción:",
                            accion,
                            "Intento siguiente:",
                            intento + 1,
                            "Espera:",
                            espera + " ms"
                        );

                        await new Promise(
                            resolve => window.setTimeout(resolve, espera)
                        );

                        continue;

                    }

                    return {
                        ok: false,
                        codigo: "HTTP_" + respuesta.status,
                        mensaje:
                            "El servidor respondió con error " +
                            respuesta.status +
                            ". Intente nuevamente."
                    };

                }

                let resultado;

                try {

                    resultado = JSON.parse(texto);

                } catch (errorJSON) {

                    console.error(
                        "Respuesta no JSON:",
                        String(texto || "").slice(0, 350),
                        errorJSON
                    );

                    return {
                        ok: false,
                        codigo: "RESPUESTA_INVALIDA",
                        mensaje:
                            "El servidor no devolvió una respuesta válida."
                    };

                }

                if (
                    resultado &&
                    resultado.codigo === "SESION_INVALIDADA"
                ) {

                    this.cerrarPorSesionInvalidada(resultado.mensaje);

                }

                return resultado;

            } catch (error) {

                window.clearTimeout(temporizador);

                console.error(
                    "Error API, acción " + accion +
                    ", intento " + intento + ":",
                    error
                );

                if (intento < intentos) {

                    const espera = 1500 * intento;

                    await new Promise(
                        resolve => window.setTimeout(resolve, espera)
                    );

                    continue;

                }

                const tiempoAgotado =
                    error && error.name === "AbortError";

                return {
                    ok: false,
                    codigo: tiempoAgotado
                        ? "TIEMPO_AGOTADO"
                        : "ERROR_CONEXION",
                    mensaje: tiempoAgotado
                        ? "El servidor tardó demasiado en responder. " +
                          "Intente nuevamente."
                        : "Error al conectar con el servidor. " +
                          "Verifique la conexión e intente nuevamente."
                };

            } finally {

                window.clearTimeout(temporizador);

            }

        }

    }

};


window.API = API;
API._instalarSeguimientoNavegacion();
API._instalarRecuperacionEstilos();

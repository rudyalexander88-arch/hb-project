// =====================================
// DASHBOARD.JS
// Sistema Logístico PT
// =====================================


// ===============================
// VALIDAR SESIÓN
// ===============================

const usuario = JSON.parse(
    localStorage.getItem("sesion") || sessionStorage.getItem("sesion")
);

if (!usuario) {

    window.location = "../index.html";

}


// ===============================
// MOSTRAR DATOS DEL USUARIO
// ESCRITORIO Y MENÚ MÓVIL
// ===============================

const nombreSesion =
    usuario.nombre ||
    usuario.Nombre ||
    "Usuario";

const rolSesion =
    usuario.rol ||
    usuario.Rol ||
    "";


// ===============================
// ESCALA TIPOGRÁFICA CONFIGURABLE
// ===============================

const TipografiaSistema = {

    CLAVE_CONFIGURACION:
        "UI_Escala_Tipografica",

    CLAVE_LOCAL:
        "sistema_pt_ui_escala_tipografica",

    ESCALA_PREDETERMINADA:
        100,

    ESCALA_MINIMA:
        75,

    ESCALA_MAXIMA:
        150,

    TAMANOS_BASE_PX: [
        7,
        8,
        8.5,
        9,
        10,
        11,
        12,
        13,
        13.12,
        13.76,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        23.2,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        32,
        34,
        38,
        41.6
    ],

    escalaActual:
        100,

    elementos:
        new Map(),

    observador:
        null,

    reajustePendiente:
        0,


    normalizarEscala(
        valor
    ) {

        const texto =
            String(
                valor === undefined ||
                valor === null
                    ? ""
                    : valor
            )
                .trim()
                .replace(",", ".")
                .replace("%", "");


        let numero;


        if (!texto) {

            numero =
                this.ESCALA_PREDETERMINADA;

        } else {

            numero =
                Number(texto);

        }


        if (!Number.isFinite(numero)) {

            numero =
                this.ESCALA_PREDETERMINADA;

        }


        if (
            numero > 0 &&
            numero <= 2
        ) {

            numero *= 100;

        }


        return Math.min(
            this.ESCALA_MAXIMA,
            Math.max(
                this.ESCALA_MINIMA,
                numero
            )
        );

    },


    obtenerEscalaGuardada() {

        try {

            return this.normalizarEscala(
                localStorage.getItem(
                    this.CLAVE_LOCAL
                )
            );

        } catch (error) {

            return this.ESCALA_PREDETERMINADA;

        }

    },


    guardarEscala(
        escala
    ) {

        try {

            localStorage.setItem(
                this.CLAVE_LOCAL,
                String(escala)
            );

        } catch (error) {

            console.warn(
                "No fue posible guardar la escala tipográfica localmente.",
                error
            );

        }

    },


    esElementoTipografico(
        elemento
    ) {

        if (
            !elemento ||
            elemento.nodeType !== 1
        ) {

            return false;

        }


        const etiqueta =
            elemento.tagName;


        if (
            [
                "SCRIPT",
                "STYLE",
                "LINK",
                "META",
                "HEAD",
                "HTML",
                "BR",
                "HR",
                "SVG",
                "PATH",
                "CANVAS",
                "OPTION"
            ].includes(etiqueta) ||
            elemento.closest("svg")
        ) {

            return false;

        }


        if (
            [
                "INPUT",
                "SELECT",
                "TEXTAREA",
                "BUTTON"
            ].includes(etiqueta)
        ) {

            return true;

        }


        return Array.from(
            elemento.childNodes || []
        ).some(nodo => {

            return nodo.nodeType === 3 &&
                String(
                    nodo.textContent || ""
                ).trim();

        });

    },


    restaurarElementos() {

        this.elementos.forEach(
            (registro, elemento) => {

                if (!elemento.isConnected) {

                    this.elementos.delete(
                        elemento
                    );

                    return;

                }


                elemento.style.setProperty(
                    "font-size",
                    registro.valorInline,
                    registro.prioridadInline
                );

                if (!registro.valorInline) {

                    elemento.style.removeProperty(
                        "font-size"
                    );

                }

            }
        );

    },


    registrarElementos(
        raiz = document
    ) {

        const candidatos = [];


        if (
            raiz.nodeType === 1
        ) {

            candidatos.push(
                raiz
            );

        }


        if (
            typeof raiz.querySelectorAll ===
                "function"
        ) {

            candidatos.push(
                ...raiz.querySelectorAll("*")
            );

        }


        candidatos.forEach(elemento => {

            if (
                this.elementos.has(elemento) ||
                !this.esElementoTipografico(elemento)
            ) {

                return;

            }


            const calculado =
                Number.parseFloat(
                    window
                        .getComputedStyle(elemento)
                        .fontSize
                );


            if (
                !Number.isFinite(calculado) ||
                calculado <= 0
            ) {

                return;

            }


            this.elementos.set(
                elemento,
                {
                    base:
                        calculado,
                    valorInline:
                        elemento.style.getPropertyValue(
                            "font-size"
                        ),
                    prioridadInline:
                        elemento.style.getPropertyPriority(
                            "font-size"
                        )
                }
            );

        });


    },


    recalcularBases() {

        this.restaurarElementos();

        this.registrarElementos(
            document
        );


        this.elementos.forEach(
            (registro, elemento) => {

                const calculado =
                    Number.parseFloat(
                        window
                            .getComputedStyle(elemento)
                            .fontSize
                    );


                if (
                    Number.isFinite(calculado) &&
                    calculado > 0
                ) {

                    registro.base =
                        calculado;

                }

            }
        );

    },


    aplicarElementos() {

        const factor =
            this.escalaActual / 100;


        this.elementos.forEach(
            (registro, elemento) => {

                if (!elemento.isConnected) {

                    this.elementos.delete(
                        elemento
                    );

                    return;

                }


                const nuevoTamano =
                    Math.round(
                        registro.base *
                        factor *
                        1000
                    ) / 1000;


                elemento.style.setProperty(
                    "font-size",
                    String(nuevoTamano) + "px",
                    "important"
                );

            }
        );

    },


    programarReajuste() {

        if (
            this.reajustePendiente
        ) {
            return;
        }


        this.reajustePendiente =
            window.requestAnimationFrame(() => {

                this.reajustePendiente =
                    0;

                this.recalcularBases();

                this.aplicarElementos();

                document.documentElement.dataset.elementosTipograficos =
                    String(
                        this.elementos.size
                    );

            });

    },


    iniciarObservacion() {

        if (
            this.observador ||
            !document.body
        ) {
            return;
        }


        this.observador =
            new MutationObserver(
                mutaciones => {

                    const agregoContenido =
                        mutaciones.some(
                            mutacion =>
                                mutacion.addedNodes &&
                                mutacion.addedNodes.length
                        );


                    if (agregoContenido) {

                        this.programarReajuste();

                    }

                }
            );


        this.observador.observe(
            document.body,
            {
                childList:
                    true,
                subtree:
                    true
            }
        );


        let temporizadorRedimension =
            0;


        window.addEventListener(
            "resize",
            () => {

                window.clearTimeout(
                    temporizadorRedimension
                );


                temporizadorRedimension =
                    window.setTimeout(
                        () => {
                            this.programarReajuste();
                        },
                        180
                    );

            }
        );

    },


    aplicarVariablesCSS(
        escala
    ) {

        const factor =
            escala / 100;


        this.TAMANOS_BASE_PX.forEach(
            tamanoBase => {

                const nombre =
                    String(tamanoBase)
                        .replace(".", "_");


                const tamanoCalculado =
                    Math.round(
                        tamanoBase *
                        factor *
                        1000
                    ) / 1000;


                document.documentElement.style.setProperty(
                    "--ui-fs-" + nombre,
                    String(tamanoCalculado) + "px"
                );

            }
        );

    },


    aplicarEscala(
        valor,
        guardar = false
    ) {

        const escala =
            this.normalizarEscala(
                valor
            );


        this.escalaActual =
            escala;


        document.documentElement.style.setProperty(
            "--ui-font-scale",
            String(
                escala / 100
            )
        );


        this.aplicarVariablesCSS(
            escala
        );


        document.documentElement.dataset.escalaTipografica =
            String(escala);


        document.documentElement.dataset.estrategiaTipografica =
            "variables-css";


        delete document.documentElement.dataset.elementosTipograficos;


        if (guardar) {

            this.guardarEscala(
                escala
            );

        }


        return escala;

    },


    aplicarPreferenciaGuardada() {

        return this.aplicarEscala(
            this.obtenerEscalaGuardada(),
            false
        );

    },


    async cargarDesdeConfiguracion() {

        if (
            !window.API ||
            typeof window.API.post !==
                "function"
        ) {

            return this.aplicarPreferenciaGuardada();

        }


        if (
            window.CargadorSistema &&
            typeof window.CargadorSistema.mostrar ===
                "function"
        ) {

            window.CargadorSistema.mostrar(
                "Aplicando preferencias",
                "Configurando la presentación del sistema."
            );

        }


        try {

            const respuesta =
                await window.API.post({
                    action:
                        "listarConfiguracion"
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta &&
                    respuesta.mensaje
                        ? respuesta.mensaje
                        : "No fue posible consultar la configuración."
                );

            }


            const configuracion =
                respuesta.data || {};


            const valor =
                Object.prototype.hasOwnProperty.call(
                    configuracion,
                    this.CLAVE_CONFIGURACION
                )
                    ? configuracion[
                        this.CLAVE_CONFIGURACION
                    ]
                    : this.ESCALA_PREDETERMINADA;


            return this.aplicarEscala(
                valor,
                true
            );

        } catch (error) {

            console.warn(
                "Se mantuvo la escala tipográfica guardada:",
                error
            );


            return this.aplicarPreferenciaGuardada();

        } finally {

            if (
                window.CargadorSistema &&
                typeof window.CargadorSistema.ocultar ===
                    "function"
            ) {

                window.CargadorSistema.ocultar();

            }

        }

    }

};


window.TipografiaSistema =
    TipografiaSistema;


TipografiaSistema.aplicarPreferenciaGuardada();


[
    "nombreUsuario",
    "nombreUsuarioMenu",
    "nombreUsuarioMovil"
].forEach(id => {

    const elemento =
        document.getElementById(id);

    if (elemento) {

        elemento.textContent =
            nombreSesion;

    }

});


[
    "rolUsuario",
    "rolUsuarioMenu",
    "rolUsuarioMovil"
].forEach(id => {

    const elemento =
        document.getElementById(id);

    if (elemento) {

        elemento.textContent =
            rolSesion;

    }

});


// ===============================
// INICIALIZAR SISTEMA
// ===============================

window.addEventListener("load", async () => {

    aplicarPermisosDashboard();

    inicializarMenu();

    await TipografiaSistema.cargarDesdeConfiguracion();

    if (
        window.InicioOperativo &&
        typeof window.InicioOperativo.cargar ===
            "function"
    ) {

        activarMenu("menuInicio");

        window.InicioOperativo.cargar();

    }

});


// ===============================
// CONTROL DE ACCESO DEL DASHBOARD
// ===============================

function aplicarPermisosDashboard() {

    const configuracionModulos = [
        { idMenu: "menuInventario", modulo: "INVENTARIO" },
        { idMenu: "menuDespachos", modulo: "DESPACHOS" },
        { idMenu: "menuRecepciones", modulo: "RECEPCIONES" },
        { idMenu: "menuReportes", modulo: "REPORTES" },
        { idMenu: "menuUsuarios", modulo: "USUARIOS" },
        { idMenu: "menuConfiguracion", modulo: "CONFIGURACION" }
    ];

    configuracionModulos.forEach(item => {

        const elemento =
            document.getElementById(item.idMenu);

        if (!elemento) {
            return;
        }

        const permitido =
            item.idMenu === "menuReportes" &&
            window.ReportesKPIs &&
            typeof window.ReportesKPIs.puedeVer === "function"
                ? window.ReportesKPIs.puedeVer()
                : Sistema.tieneAccesoModulo(
                    item.modulo
                );

        elemento.hidden = !permitido;

        elemento.setAttribute(
            "aria-hidden",
            permitido ? "false" : "true"
        );

    });

    ["menuInicio", "salir"].forEach(id => {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.hidden = false;
            elemento.setAttribute(
                "aria-hidden",
                "false"
            );
        }

    });

}


function puedeAbrirModulo(
    modulo,
    mensaje
) {

    if (
        Sistema.tieneAccesoModulo(
            modulo
        )
    ) {
        return true;
    }

    Sistema.advertencia(
        mensaje ||
        "No tiene acceso a este módulo.",
        4200
    );

    return false;

}


// ===============================
// MENÚ LATERAL
// ===============================

function inicializarMenu() {

    const menuInicio =
        document.getElementById(
            "menuInicio"
        );

    if (menuInicio) {

        menuInicio.addEventListener(
            "click",
            () => {

                activarMenu(
                    "menuInicio"
                );

                if (
                    window.InicioOperativo &&
                    typeof window.InicioOperativo.cargar ===
                        "function"
                ) {

                    window.InicioOperativo.cargar();

                }

            }
        );

    }


    const menuInventario = document.getElementById("menuInventario");

    if (menuInventario) {
        menuInventario.addEventListener("click", () => {
            if (!puedeAbrirModulo("INVENTARIO", "No tiene acceso a Gestión del almacén.")) return;
            activarMenu("menuInventario");
            if (window.GestionAlmacen && typeof window.GestionAlmacen.cargar === "function") {
                window.GestionAlmacen.cargar();
            } else {
                Sistema.error("El módulo de Gestión del almacén no está disponible.");
            }
        });
    }

    const menuDespachos =
        document.getElementById(
            "menuDespachos"
        );

    if (menuDespachos) {

        menuDespachos.addEventListener(
            "click",
            () => {

                if (
                    !puedeAbrirModulo(
                        "DESPACHOS",
                        "No tiene acceso al módulo de Despachos."
                    )
                ) {
                    return;
                }

                activarMenu(
                    "menuDespachos"
                );

                if (
                    window.Despachos &&
                    typeof window.Despachos.cargar ===
                        "function"
                ) {

                    window.Despachos.cargar();

                } else {

                    console.error(
                        "Despachos no está disponible."
                    );

                }

            }
        );

    }


    const menuRecepciones =
        document.getElementById(
            "menuRecepciones"
        );

    if (menuRecepciones) {

        menuRecepciones.addEventListener(
            "click",
            () => {

                if (
                    !puedeAbrirModulo(
                        "RECEPCIONES",
                        "No tiene acceso al módulo de Recepciones."
                    )
                ) {
                    return;
                }

                activarMenu(
                    "menuRecepciones"
                );

                if (
                    window.RecepcionMateriales &&
                    typeof window.RecepcionMateriales.cargar ===
                        "function"
                ) {

                    window.RecepcionMateriales.cargar();

                } else {

                    console.error(
                        "RecepcionMateriales no está disponible."
                    );

                }

            }
        );

    }


    const menuReportes =
        document.getElementById(
            "menuReportes"
        );

    if (menuReportes) {

        menuReportes.addEventListener(
            "click",
            async () => {

                if (
                    !window.ReportesKPIs ||
                    typeof window.ReportesKPIs.cargar !==
                        "function"
                ) {

                    Sistema.error(
                        "El módulo Reportes & KPIs no está disponible."
                    );

                    return;

                }

                if (
                    typeof window.ReportesKPIs.puedeVer ===
                        "function" &&
                    !window.ReportesKPIs.puedeVer()
                ) {

                    Sistema.advertencia(
                        "No tiene acceso a Reportes & KPIs.",
                        4200
                    );

                    return;

                }

                activarMenu(
                    "menuReportes"
                );

                await window.ReportesKPIs.cargar();

            }
        );

    }


    const salir =
        document.getElementById(
            "salir"
        );

    if (salir) {

        salir.addEventListener(
            "click",
            cerrarSesion
        );

    }


    const cerrarModal =
        document.getElementById(
            "cerrarModal"
        );

    if (cerrarModal) {

        cerrarModal.addEventListener(
            "click",
            () => {

                /*
                 * Limpiar el conduce solo corresponde a los modales
                 * abiertos desde Despachos. En Inicio, Recepciones y
                 * los demás módulos debe conservarse la vista actual.
                 */
                const menuDespachos =
                    document.getElementById(
                        "menuDespachos"
                    );

                const limpiarConduce = Boolean(
                    menuDespachos &&
                    menuDespachos.classList.contains(
                        "active"
                    )
                );

                if (
                    typeof Sistema !== "undefined" &&
                    typeof Sistema.cerrarModal === "function"
                ) {
                    Sistema.cerrarModal(
                        limpiarConduce
                    );
                    return;
                }

                const modal =
                    document.getElementById(
                        "modalSistema"
                    );

                if (modal) {
                    modal.classList.add(
                        "oculto"
                    );
                    modal.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                }

                document.body.classList.remove(
                    "modal-sistema-abierto"
                );

                if (
                    limpiarConduce &&
                    typeof Conduce !== "undefined" &&
                    typeof Conduce.limpiar === "function"
                ) {
                    Conduce.limpiar();
                }

            }
        );

    }

}


// ===============================
// ACTIVAR MENÚ
// ===============================

function activarMenu(idMenu) {

    document
        .querySelectorAll(".sidebar li")
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });

    const elemento =
        document.getElementById(
            idMenu
        );

    if (elemento) {
        elemento.classList.add(
            "active"
        );
    }

}


// ===============================
// CERRAR SESIÓN
// ===============================

let cierreSesionEnProceso = false;


async function cerrarSesion() {

    /*
     * Evita dobles clics o varios intentos de cierre
     * mientras Apps Script elimina la sesión activa.
     */
    if (cierreSesionEnProceso) {
        return;
    }


    const confirmarCierre =
        await Sistema.confirmar({

            titulo:
                "Cerrar sesión",

            mensaje:
                "¿Está seguro de que desea cerrar su sesión?",

            detalle:
                "Se finalizará el acceso actual y volverá a la pantalla de inicio.",

            tipo:
                "peligro",

            textoConfirmar:
                "Sí, cerrar sesión",

            textoCancelar:
                "Permanecer"

        });


    if (!confirmarCierre) {
        return;
    }


    cierreSesionEnProceso = true;


    /*
     * Bloquea visualmente la interfaz mientras el backend
     * elimina el token de Sesiones_Usuarios.
     */
    CargadorSistema.mostrar(
        "Cerrando el sistema",
        "Estamos finalizando su sesión de forma segura."
    );


    /*
     * Para cerrar sesión usamos directamente API,
     * que es quien administra el token.
     */
    const sesion =
        API.obtenerSesion();


    try {

        if (
            sesion &&
            sesion.idEmpleado &&
            sesion.tokenSesion
        ) {

            const resultado =
                await API.post({

                    action:
                        "cerrarSesionUsuario",

                    /*
                     * Los enviamos explícitamente.
                     * Aunque API.post también los incorpora,
                     * aquí no dejamos ninguna ambigüedad.
                     */
                    idEmpleado:
                        sesion.idEmpleado,

                    tokenSesion:
                        sesion.tokenSesion

                });


            if (
                !resultado ||
                !resultado.ok
            ) {

                console.warn(
                    "El backend no confirmó el cierre de sesión:",
                    resultado
                );

            }

        }

    } catch (error) {

        console.warn(
            "No fue posible eliminar la sesión del servidor:",
            error
        );

    } finally {

        /*
         * La sesión local siempre se elimina.
         * Usuario recordado y Recordarme permanecen.
         */
        API.limpiarSesion();


        /*
         * No ocultamos el cargador antes de redirigir.
         * Así la interfaz permanece bloqueada hasta que
         * aparezca nuevamente la pantalla de inicio.
         */
        window.location.href =
            "../index.html";

    }

}


// ======================================================
// CARGADOR GLOBAL DEL SISTEMA
// ======================================================

const CargadorSistema = {

    cargasActivas: 0,

    mostrar(
        titulo = "Procesando...",
        mensaje = "Espere un momento."
    ) {

        const overlay =
            document.getElementById(
                "overlayCargaSistema"
            );

        const tituloElemento =
            document.getElementById(
                "tituloCargaSistema"
            );

        const mensajeElemento =
            document.getElementById(
                "mensajeCargaSistema"
            );

        if (!overlay) {

            console.warn(
                "No se encontró el cargador global del sistema."
            );

            return;

        }

        this.cargasActivas++;

        if (tituloElemento) {

            tituloElemento.textContent =
                String(
                    titulo ||
                    "Procesando..."
                );

        }

        if (mensajeElemento) {

            mensajeElemento.textContent =
                String(
                    mensaje ||
                    "Espere un momento."
                );

        }

        overlay.classList.remove(
            "oculto"
        );

        overlay.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "carga-sistema-activa"
        );

    },


    ocultar(
        forzar = false
    ) {

        const overlay =
            document.getElementById(
                "overlayCargaSistema"
            );

        if (!overlay) {
            return;
        }

        if (forzar) {

            this.cargasActivas = 0;

        } else {

            this.cargasActivas =
                Math.max(
                    0,
                    this.cargasActivas - 1
                );

        }

        /*
         * Si todavía existe otra operación activa,
         * el cargador permanece visible.
         */
        if (this.cargasActivas > 0) {
            return;
        }

        overlay.classList.add(
            "oculto"
        );

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "carga-sistema-activa"
        );

    },


    actualizar(
        titulo,
        mensaje
    ) {

        const tituloElemento =
            document.getElementById(
                "tituloCargaSistema"
            );

        const mensajeElemento =
            document.getElementById(
                "mensajeCargaSistema"
            );

        if (
            titulo !== undefined &&
            tituloElemento
        ) {

            tituloElemento.textContent =
                String(titulo || "");

        }

        if (
            mensaje !== undefined &&
            mensajeElemento
        ) {

            mensajeElemento.textContent =
                String(mensaje || "");

        }

    },


    estaActivo() {

        return this.cargasActivas > 0;

    }

};


/*
 * Se expone globalmente para que pueda utilizarse desde
 * Despachos, Inspecciones, Inventario y otros módulos.
 */
window.CargadorSistema =
    CargadorSistema;

document.addEventListener(
    "DOMContentLoaded",
    () => {

        iniciarControlTarjetasDashboard();

        verificarSesionActiva();
        

        const botonMenu =
            document.getElementById(
                "btnMenuMovil"
            );

       

        const sidebar =
            document.getElementById(
                "sidebarPrincipal"
            );

        const fondo =
            document.getElementById(
                "fondoMenuMovil"
            );

        const nombreUsuario =
            document.getElementById(
                "nombreUsuarioMovil"
            );

        const rolUsuario =
            document.getElementById(
                "rolUsuarioMovil"
            );

        if (!botonMenu || !sidebar || !fondo) {
            return;
        }

        const sesion = JSON.parse(
            localStorage.getItem("sesion") ||
            sessionStorage.getItem("sesion") ||
            "{}"
        );

        if (nombreUsuario) {
            nombreUsuario.textContent =
                sesion.nombre || "Usuario";
        }

        if (rolUsuario) {
            rolUsuario.textContent =
                sesion.rol || "";
        }

        const abrirMenu = () => {

            sidebar.classList.add(
                "sidebar-abierto"
            );

            fondo.classList.add(
                "visible"
            );

            document.body.classList.add(
                "menu-movil-abierto"
            );

            botonMenu.innerHTML =
                '<i class="fa-solid fa-xmark"></i>';

        };

        const cerrarMenu = () => {

            sidebar.classList.remove(
                "sidebar-abierto"
            );

            fondo.classList.remove(
                "visible"
            );

            document.body.classList.remove(
                "menu-movil-abierto"
            );

            botonMenu.innerHTML =
                '<i class="fa-solid fa-bars"></i>';

        };

        botonMenu.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains(
                        "sidebar-abierto"
                    )
                ) {

                    cerrarMenu();

                } else {

                    abrirMenu();

                }

            }
        );

        fondo.addEventListener(
            "click",
            cerrarMenu
        );

        /*
 * Cierra automáticamente el menú móvil
 * al seleccionar cualquier opción lateral.
 *
 * Los elementos del menú son <li>, no enlaces <a>.
 */
sidebar
    .querySelectorAll("li")
    .forEach(elemento => {

        elemento.addEventListener(
            "click",
            () => {

                if (
                    window.innerWidth <= 1024
                ) {

                    cerrarMenu();

                }

            }
        );

    });

        window.addEventListener(
            "resize",
            () => {

                if (window.innerWidth > 1024) {
                    cerrarMenu();
                }

            }
        );

    }
);

function iniciarControlTarjetasDashboard() {

    const tarjetas =
        document.getElementById(
            "tarjetasDashboard"
        );

    const boton =
        document.getElementById(
            "btnAlternarTarjetasDashboard"
        );


    if (
        !tarjetas ||
        !boton
    ) {

        return;

    }


    const icono =
        boton.querySelector("i");


    const claveSesion =
        "dashboard_tarjetas_ocultas";


    function aplicarEstado(
        ocultas,
        animar = true
    ) {

        if (!animar) {

            tarjetas.classList.add(
                "sin-animacion"
            );

        }


        tarjetas.classList.toggle(
            "cards-ocultas",
            ocultas
        );


        boton.classList.toggle(
            "tarjetas-ocultas",
            ocultas
        );


        boton.setAttribute(
            "aria-expanded",
            ocultas
                ? "false"
                : "true"
        );


        boton.setAttribute(
            "aria-label",
            ocultas
                ? "Mostrar indicadores generales"
                : "Ocultar indicadores generales"
        );


        if (icono) {

            icono.className =
                ocultas
                    ? "fa-solid fa-chevron-down"
                    : "fa-solid fa-chevron-up";

        }


        sessionStorage.setItem(
            claveSesion,
            ocultas
                ? "SI"
                : "NO"
        );


        if (!animar) {

            requestAnimationFrame(
                () => {

                    tarjetas.classList.remove(
                        "sin-animacion"
                    );

                }
            );

        }

    }


    const estadoGuardado =
        sessionStorage.getItem(
            claveSesion
        );


    aplicarEstado(
        estadoGuardado === "SI",
        false
    );


    boton.addEventListener(
        "click",
        () => {

            const ocultas =
                !tarjetas.classList.contains(
                    "cards-ocultas"
                );


            aplicarEstado(
                ocultas
            );

        }
    );


}

async function verificarSesionActiva() {

    const sesion =
        Sistema.obtenerSesion();


    if (
        !sesion ||
        !sesion.idEmpleado ||
        !sesion.tokenSesion
    ) {

        localStorage.removeItem(
            "sesion"
        );

        sessionStorage.removeItem(
            "sesion"
        );

        window.location.href =
            "../index.html";

        return false;

    }


    const respuesta =
        await API.post({
            action:
                "verificarSesionUsuario"
        });


    if (
        !respuesta ||
        !respuesta.ok
    ) {

        if (
            respuesta &&
            respuesta.codigo ===
                "SESION_INVALIDADA"
        ) {

            API.cerrarPorSesionInvalidada(
                respuesta.mensaje
            );

        }

        return false;

    }


    return true;

}

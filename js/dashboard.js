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

window.addEventListener("load", () => {

    aplicarPermisosDashboard();

    inicializarMenu();

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
            Sistema.tieneAccesoModulo(
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

                const modal =
                    document.getElementById(
                        "modalSistema"
                    );

                if (modal) {
                    modal.classList.add(
                        "oculto"
                    );
                }

                if (
                    typeof Conduce !==
                        "undefined"
                ) {
                    Conduce.limpiar();
                }

                const tituloModal =
                    document.getElementById(
                        "tituloModal"
                    );

                const contenidoModal =
                    document.getElementById(
                        "contenidoModal"
                    );

                if (tituloModal) {
                    tituloModal.textContent = "";
                }

                if (contenidoModal) {
                    contenidoModal.innerHTML = "";
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

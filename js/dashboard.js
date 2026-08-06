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

    inicializarMenu();

});


// ===============================
// MENÚ LATERAL
// ===============================

function inicializarMenu() {

    document.getElementById("menuDespachos")
        .addEventListener("click", () => {

            activarMenu("menuDespachos");

            Despachos.cargar();

        });
		
		const menuRecepciones =
    document.getElementById(
        "menuRecepciones"
    );


if (menuRecepciones) {

    menuRecepciones.addEventListener(
        "click",
        () => {

            activarMenu(
                "menuRecepciones"
            );


            if (
                window.RecepcionMateriales &&
                typeof window
                    .RecepcionMateriales
                    .cargar ===
                    "function"
            ) {

                window
                    .RecepcionMateriales
                    .cargar();

            } else {

                console.error(
                    "RecepcionMateriales no está disponible."
                );

            }

        }
    );

}


    document.getElementById("salir")
        .addEventListener("click", cerrarSesion);


    document.getElementById("cerrarModal")
    .addEventListener("click", () => {

        const modal = document.getElementById("modalSistema");

        modal.classList.add("oculto");

        if (typeof Conduce !== "undefined") {
            Conduce.limpiar();
        }

        document.getElementById("tituloModal").textContent = "";
        document.getElementById("contenidoModal").innerHTML = "";

    });

}


// ===============================
// ACTIVAR MENÚ
// ===============================

function activarMenu(idMenu){

    document.querySelectorAll(".sidebar li").forEach(item => {

        item.classList.remove("active");

    });

    document.getElementById(idMenu).classList.add("active");

}


// ===============================
// CERRAR SESIÓN
// ===============================

function cerrarSesion(){

    // Borra solo la sesión activa
    localStorage.removeItem("sesion");
    sessionStorage.removeItem("sesion");

    // No borra usuarioRecordado
    // No borra recordarUsuario si fue marcado

    window.location = "../index.html";

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


    /*
     * En móvil y tablet inicia con el último estado usado.
     * En escritorio siempre se mantiene visible.
     */
    const esDispositivoCompacto =
        window.matchMedia(
            "(max-width: 1024px)"
        ).matches;


    aplicarEstado(
        esDispositivoCompacto &&
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


    window.addEventListener(
        "resize",
        () => {

            const escritorio =
                window.matchMedia(
                    "(min-width: 1025px)"
                ).matches;


            if (escritorio) {

                tarjetas.classList.remove(
                    "cards-ocultas"
                );


                boton.classList.remove(
                    "tarjetas-ocultas"
                );


                boton.setAttribute(
                    "aria-expanded",
                    "true"
                );


                if (icono) {

                    icono.className =
                        "fa-solid fa-chevron-up";

                }

            }

        }
    );

}
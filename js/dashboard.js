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
// ===============================

document.getElementById("nombreUsuario").textContent = usuario.nombre;
document.getElementById("rolUsuario").textContent = usuario.rol;


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

        sidebar
            .querySelectorAll("a, button")
            .forEach(elemento => {

                elemento.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <= 768
                        ) {
                            cerrarMenu();
                        }

                    }
                );

            });

        window.addEventListener(
            "resize",
            () => {

                if (window.innerWidth > 768) {
                    cerrarMenu();
                }

            }
        );

    }
);
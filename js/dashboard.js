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
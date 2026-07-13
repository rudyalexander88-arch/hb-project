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
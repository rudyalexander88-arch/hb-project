window.addEventListener("load", () => {

    const logo = document.getElementById("logoContainer");
    const login = document.getElementById("loginSection");

    setTimeout(() => {

        const posicionInicial =
            logo && typeof logo.getBoundingClientRect === "function"
                ? logo.getBoundingClientRect()
                : null;

        if (logo) {
            logo.removeAttribute("style");
            logo.style.transition = "none";
        }

        document.body.classList.add("login-listo");

        if (login) {
            login.classList.remove("hidden");
            login.classList.add("show");
        }

        if (logo) {

            const posicionFinal =
                typeof logo.getBoundingClientRect === "function"
                    ? logo.getBoundingClientRect()
                    : null;

            if (
                posicionInicial &&
                posicionFinal &&
                typeof logo.animate === "function"
            ) {

                const desplazamientoY =
                    posicionInicial.top +
                    posicionInicial.height / 2 -
                    posicionFinal.top -
                    posicionFinal.height / 2;

                const escalaInicial =
                    posicionFinal.width > 0
                        ? posicionInicial.width / posicionFinal.width
                        : 1;

                const animacion = logo.animate(
                    [
                        {
                            transform:
                                "translateY(" +
                                desplazamientoY +
                                "px) scale(" +
                                escalaInicial +
                                ")",
                            transformOrigin: "center center"
                        },
                        {
                            transform: "translateY(0px) scale(1)",
                            transformOrigin: "center center"
                        }
                    ],
                    {
                        duration: 1300,
                        easing: "cubic-bezier(0.22, 0.68, 0, 1)",
                        fill: "both"
                    }
                );

                if (animacion) {
                    animacion.onfinish = () => {
                        logo.style.removeProperty("transition");
                    };
                }

            } else {
                logo.style.removeProperty("transition");
            }

        }

    }, 2200);


    // ===============================
    // LIMPIEZA DE SESIONES VIEJAS
    // ===============================

    localStorage.removeItem("usuario");
    sessionStorage.removeItem("usuario");


    // ===============================
    // CARGAR USUARIO RECORDADO
    // ===============================

    const usuarioRecordado =
        localStorage.getItem("usuarioRecordado");

    const recordarUsuario =
        localStorage.getItem("recordarUsuario");

    if (usuarioRecordado) {
        document.getElementById("usuario").value =
            usuarioRecordado;
    }

    document.getElementById("recordarme").checked =
        recordarUsuario === "true";


    // ===============================
    // UTILIDADES DE SESIÓN
    // ===============================

    function mostrarCargadorLogin(titulo, descripcion) {

        const capa =
            document.getElementById("loginCargador");

        const elementoTitulo =
            document.getElementById("loginCargadorTitulo");

        const elementoDescripcion =
            document.getElementById("loginCargadorDescripcion");

        if (elementoTitulo) {
            elementoTitulo.textContent =
                titulo || "Iniciando sesión";
        }

        if (elementoDescripcion) {
            elementoDescripcion.textContent =
                descripcion || "Estamos validando tus credenciales.";
        }

        if (capa) {
            capa.hidden = false;
            document.body.classList.add("login-emergente-abierto");
        }

    }


    function ocultarCargadorLogin() {

        const capa =
            document.getElementById("loginCargador");

        if (capa) {
            capa.hidden = true;
        }

        if (
            document.getElementById("loginDialogoSesion")?.hidden !== false
        ) {
            document.body.classList.remove("login-emergente-abierto");
        }

    }


    function confirmarReemplazoSesion() {

        return new Promise((resolver) => {

            const capa =
                document.getElementById("loginDialogoSesion");

            const botonCancelar =
                document.getElementById("loginCancelarSesion");

            const botonConfirmar =
                document.getElementById("loginConfirmarSesion");

            if (!capa || !botonCancelar || !botonConfirmar) {
                resolver(false);
                return;
            }

            let completado = false;

            const cerrar = (aceptado) => {

                if (completado) {
                    return;
                }

                completado = true;
                capa.hidden = true;

                botonCancelar.removeEventListener("click", cancelar);
                botonConfirmar.removeEventListener("click", confirmar);
                document.removeEventListener("keydown", manejarTecla);

                if (document.getElementById("loginCargador")?.hidden !== false) {
                    document.body.classList.remove("login-emergente-abierto");
                }

                resolver(aceptado);

            };

            const cancelar = () => cerrar(false);
            const confirmar = () => cerrar(true);

            const manejarTecla = (evento) => {
                if (evento.key === "Escape") {
                    cancelar();
                }
            };

            capa.hidden = false;
            document.body.classList.add("login-emergente-abierto");

            botonCancelar.addEventListener("click", cancelar);
            botonConfirmar.addEventListener("click", confirmar);
            document.addEventListener("keydown", manejarTecla);

            window.setTimeout(() => botonConfirmar.focus(), 30);

        });

    }

    function obtenerDispositivo() {

        const agente =
            navigator.userAgent || "";

        let sistema = "Dispositivo";

        if (/Android/i.test(agente)) {
            sistema = "Android";
        } else if (/iPhone|iPad|iPod/i.test(agente)) {
            sistema = "iPhone/iPad";
        } else if (/Windows/i.test(agente)) {
            sistema = "Windows";
        } else if (/Macintosh|Mac OS X/i.test(agente)) {
            sistema = "Mac";
        } else if (/Linux/i.test(agente)) {
            sistema = "Linux";
        }

        let navegador = "Navegador";

        if (/Edg\//i.test(agente)) {
            navegador = "Microsoft Edge";
        } else if (/Chrome\//i.test(agente)) {
            navegador = "Google Chrome";
        } else if (/Firefox\//i.test(agente)) {
            navegador = "Mozilla Firefox";
        } else if (/Safari\//i.test(agente)) {
            navegador = "Safari";
        }

        return navegador + " · " + sistema;

    }


    function guardarSesion(data, recordar, usuarioIngresado) {

        const sesion = {

            ok:
                data.ok,

            idEmpleado:
                data.idEmpleado,

            nombre:
                data.nombre,

            usuario:
                data.usuario,

            correo:
                data.correo,

            fechaIngreso:
                data.fechaIngreso || "",

            rol:
                data.rol,

            modulos:
                Array.isArray(data.modulos)
                    ? data.modulos
                    : [],

            permisos:
                Array.isArray(data.permisos)
                    ? data.permisos
                    : [],

            accesoTotal:
                data.accesoTotal === true,

            tokenSesion:
                data.tokenSesion || "",

            idSesion:
                data.idSesion || "",

            dispositivo:
                data.dispositivo || obtenerDispositivo()

        };


        localStorage.removeItem("sesion");
        sessionStorage.removeItem("sesion");


        if (recordar.checked) {

            localStorage.setItem(
                "sesion",
                JSON.stringify(sesion)
            );

            localStorage.setItem(
                "usuarioRecordado",
                usuarioIngresado
            );

            localStorage.setItem(
                "recordarUsuario",
                "true"
            );

        } else {

            sessionStorage.setItem(
                "sesion",
                JSON.stringify(sesion)
            );

            localStorage.setItem(
                "usuarioRecordado",
                usuarioIngresado
            );

            localStorage.removeItem(
                "recordarUsuario"
            );

        }

    }


    async function solicitarNuevaSesion(
        usuario,
        password,
        dispositivo
    ) {

        const respuesta =
            await confirmarReemplazoSesion();


        if (!respuesta) {
            return null;
        }


        mostrarCargadorLogin(
            "Cerrando sesión anterior",
            "Estamos liberando tu cuenta para ingresar desde este dispositivo."
        );


        const peticion =
            await fetch(
                "https://script.google.com/macros/s/AKfycbxInwRTenjyJJm98Ca3rtewTghXcvqreinGyhmZpeqBWmLjqvt_JK4z6xCPSfAm3XxsBw/exec",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            action:
                                "forzarNuevaSesion",

                            usuario:
                                usuario,

                            password:
                                password,

                            dispositivo:
                                dispositivo
                        })
                }
            );


        const resultado =
            await peticion.json();

        if (resultado && resultado.ok) {
            mostrarCargadorLogin(
                "Iniciando sesión",
                "Tu sesión anterior fue cerrada correctamente."
            );
        }

        return resultado;

    }


    // ===============================
    // LOGIN
    // ===============================

    const formulario =
        document.getElementById("loginForm");


    formulario.addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();


            const usuario =
                document
                    .getElementById("usuario")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("password")
                    .value
                    .trim();


            const recordar =
                document.getElementById("recordarme");


            const mensaje =
                document.getElementById("mensaje");


            const boton =
                formulario.querySelector(
                    'button[type="submit"]'
                );


            const dispositivo =
                obtenerDispositivo();

            let redirigiendo = false;


            if (boton) {
                boton.disabled = true;
            }


            mensaje.style.color = "#666";
            mensaje.textContent =
                "Validando credenciales...";

            mostrarCargadorLogin(
                "Iniciando sesión",
                "Estamos validando tus credenciales."
            );


            try {

                const respuesta =
                    await fetch(
                        "https://script.google.com/macros/s/AKfycbxInwRTenjyJJm98Ca3rtewTghXcvqreinGyhmZpeqBWmLjqvt_JK4z6xCPSfAm3XxsBw/exec",
                        {
                            method:
                                "POST",

                            body:
                                JSON.stringify({
                                    action:
                                        "login",

                                    usuario:
                                        usuario,

                                    password:
                                        password,

                                    dispositivo:
                                        dispositivo
                                })
                        }
                    );


                let data =
                    await respuesta.json();


                if (
                    !data.ok &&
                    (
                        data.codigo === "SESION_ACTIVA" ||
                        data.requiereConfirmacionSesion === true
                    )
                ) {

                    ocultarCargadorLogin();

                    mensaje.style.color = "#e31b23";
                    mensaje.textContent =
                        "Existe otra sesión activa. Confirme si desea reemplazarla.";


                    const nuevaSesion =
                        await solicitarNuevaSesion(
                            usuario,
                            password,
                            dispositivo
                        );


                    if (!nuevaSesion) {

                        mensaje.style.color = "#e31b23";
                        mensaje.textContent =
                            "Se mantuvo activa la sesión anterior.";

                        return;

                    }


                    data =
                        nuevaSesion;

                }


                if (data.ok) {

                    mostrarCargadorLogin(
                        "Iniciando sesión",
                        "Bienvenido, " + data.nombre + "."
                    );

                    guardarSesion(
                        data,
                        recordar,
                        usuario
                    );


                    mensaje.style.color = "green";
                    mensaje.textContent =
                        "Bienvenido " + data.nombre;

                    redirigiendo = true;


                    window.setTimeout(
                        () => {

                            window.location.href =
                                "dashboard/dashboard.html";

                        },
                        1000
                    );

                } else {

                    ocultarCargadorLogin();

                    mensaje.style.color = "red";
                    mensaje.textContent =
                        data.mensaje ||
                        "No fue posible iniciar sesión.";

                }


            } catch (error) {

                ocultarCargadorLogin();

                mensaje.style.color = "red";
                mensaje.textContent =
                    "Error al conectar con el servidor.";

                console.error(error);


            } finally {

                if (!redirigiendo) {
                    ocultarCargadorLogin();
                }

                if (boton && !redirigiendo) {
                    boton.disabled = false;
                }

            }

        }
    );

});

window.addEventListener("load", () => {

    const logo = document.getElementById("logoContainer");
    const login = document.getElementById("loginSection");

    setTimeout(() => {

        logo.style.top = "140px";
        logo.style.left = "50%";
        logo.style.transform = "translateX(-50%) scale(.75)";

        login.classList.remove("hidden");
        login.classList.add("show");

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
            window.confirm(
                "Este usuario ya tiene una sesión activa en otro dispositivo.\n\n" +
                "¿Desea cerrar la sesión anterior e iniciar aquí?"
            );


        if (!respuesta) {
            return null;
        }


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


        return await peticion.json();

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


            if (boton) {
                boton.disabled = true;
            }


            mensaje.style.color = "#666";
            mensaje.textContent =
                "Validando credenciales...";


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

                    guardarSesion(
                        data,
                        recordar,
                        usuario
                    );


                    mensaje.style.color = "green";
                    mensaje.textContent =
                        "Bienvenido " + data.nombre;


                    window.setTimeout(
                        () => {

                            window.location.href =
                                "dashboard/dashboard.html";

                        },
                        1000
                    );

                } else {

                    mensaje.style.color = "red";
                    mensaje.textContent =
                        data.mensaje ||
                        "No fue posible iniciar sesión.";

                }


            } catch (error) {

                mensaje.style.color = "red";
                mensaje.textContent =
                    "Error al conectar con el servidor.";

                console.error(error);


            } finally {

                if (boton) {
                    boton.disabled = false;
                }

            }

        }
    );

});
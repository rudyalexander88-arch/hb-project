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

    const usuarioRecordado = localStorage.getItem("usuarioRecordado");
    const recordarUsuario = localStorage.getItem("recordarUsuario");

    if (usuarioRecordado) {
        document.getElementById("usuario").value = usuarioRecordado;
    }

    document.getElementById("recordarme").checked = recordarUsuario === "true";


    // ===============================
    // LOGIN
    // ===============================

    const formulario = document.getElementById("loginForm");

    formulario.addEventListener("submit", function(e){

        e.preventDefault();

        const usuario = document.getElementById("usuario").value.trim();
        const password = document.getElementById("password").value.trim();
        const recordar = document.getElementById("recordarme");
        const mensaje = document.getElementById("mensaje");

        fetch("https://script.google.com/macros/s/AKfycbxInwRTenjyJJm98Ca3rtewTghXcvqreinGyhmZpeqBWmLjqvt_JK4z6xCPSfAm3XxsBw/exec", {

            method: "POST",

            body: JSON.stringify({

                action: "login",
                usuario: usuario,
                password: password

            })

        })

        .then(res => res.json())

        .then(data => {

            if(data.ok){

                // Limpiar sesiones anteriores
                localStorage.removeItem("sesion");
                sessionStorage.removeItem("sesion");

                if(recordar.checked){

                    // Sesión persistente
                    localStorage.setItem("sesion", JSON.stringify(data));

                    // Recordar usuario y checkbox
                    localStorage.setItem("usuarioRecordado", usuario);
                    localStorage.setItem("recordarUsuario", "true");

                } else {

                    // Sesión temporal
                    sessionStorage.setItem("sesion", JSON.stringify(data));

                    // Mantener usuario escrito, pero NO marcar recordarme
                    localStorage.setItem("usuarioRecordado", usuario);
                    localStorage.removeItem("recordarUsuario");

                }

                mensaje.style.color = "green";
                mensaje.textContent = "Bienvenido " + data.nombre;

                setTimeout(() => {

                    window.location.href = "dashboard/dashboard.html";

                }, 1000);

            } else {

                mensaje.style.color = "red";
                mensaje.textContent = data.mensaje;

            }

        })

        .catch(error => {

            mensaje.style.color = "red";
            mensaje.textContent = "Error al conectar con el servidor.";

            console.error(error);

        });

    });

});
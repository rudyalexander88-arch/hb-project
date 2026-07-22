// ==========================================
// SISTEMA.JS
// Utilidades compartidas - Sistema Logístico PT
// ==========================================

const Sistema = {

    abrirModal(titulo = "", contenido = "", opciones = {}) {

        const modal = document.getElementById("modalSistema");
        const tituloModal = document.getElementById("tituloModal");
        const contenidoModal = document.getElementById("contenidoModal");

        if (!modal || !tituloModal || !contenidoModal) {
            console.warn("No se encontró la estructura del modal corporativo.");
            return false;
        }

        tituloModal.textContent = String(titulo || "");

        if (
            contenido instanceof HTMLElement ||
            contenido instanceof DocumentFragment
        ) {
            contenidoModal.innerHTML = "";
            contenidoModal.appendChild(contenido);
        } else {
            contenidoModal.innerHTML = String(contenido || "");
        }

        modal.classList.remove("oculto");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-sistema-abierto");

        const modalContenido = modal.querySelector(".modal-contenido");

        if (modalContenido) {
            modalContenido.classList.toggle(
                "modal-contenido-compacto",
                opciones.compacto === true
            );

            if (opciones.clase) {
                modalContenido.classList.add(opciones.clase);
            }
        }

        if (opciones.enfocar) {
            window.setTimeout(() => {
                const elemento =
                    typeof opciones.enfocar === "string"
                        ? document.querySelector(opciones.enfocar)
                        : opciones.enfocar;

                if (elemento && typeof elemento.focus === "function") {
                    elemento.focus();
                }
            }, 60);
        }

        return true;
    },


    cerrarModal(limpiarConduce = false) {

        const modal = document.getElementById("modalSistema");
        const tituloModal = document.getElementById("tituloModal");
        const contenidoModal = document.getElementById("contenidoModal");

        if (!modal) {
            return;
        }

        modal.classList.add("oculto");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-sistema-abierto");

        const modalContenido = modal.querySelector(".modal-contenido");

        if (modalContenido) {
            modalContenido.classList.remove("modal-contenido-compacto");
        }

        if (tituloModal) {
            tituloModal.textContent = "";
        }

        if (contenidoModal) {
            contenidoModal.innerHTML = "";
        }

        if (
            limpiarConduce &&
            typeof Conduce !== "undefined" &&
            typeof Conduce.limpiar === "function"
        ) {
            Conduce.limpiar();
        }
    },


    notificar(mensaje, tipo = "info", duracion = 4200) {

        const tiposPermitidos = [
            "exito",
            "error",
            "advertencia",
            "info"
        ];

        const tipoFinal =
            tiposPermitidos.includes(tipo)
                ? tipo
                : "info";

        let contenedor =
            document.getElementById("contenedorNotificacionesSistema");

        if (!contenedor) {
            contenedor = document.createElement("div");
            contenedor.id = "contenedorNotificacionesSistema";
            contenedor.className = "contenedor-notificaciones-sistema";
            document.body.appendChild(contenedor);
        }

        const tarjeta = document.createElement("div");

        tarjeta.className =
            "notificacion-sistema " +
            "notificacion-" +
            tipoFinal;

        tarjeta.setAttribute(
            "role",
            tipoFinal === "error" ? "alert" : "status"
        );

        const iconos = {
            exito: "fa-solid fa-circle-check",
            error: "fa-solid fa-circle-xmark",
            advertencia: "fa-solid fa-triangle-exclamation",
            info: "fa-solid fa-circle-info"
        };

        tarjeta.innerHTML = `
            <div class="notificacion-sistema-icono">
                <i class="${iconos[tipoFinal]}"></i>
            </div>

            <div class="notificacion-sistema-contenido">
                <p>${this.escaparHTML(mensaje)}</p>
            </div>

            <button
                type="button"
                class="notificacion-sistema-cerrar"
                aria-label="Cerrar notificación"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        contenedor.appendChild(tarjeta);

        const cerrar = () => {

            if (
                !tarjeta ||
                tarjeta.classList.contains("saliendo")
            ) {
                return;
            }

            tarjeta.classList.add("saliendo");

            window.setTimeout(() => {
                tarjeta.remove();
            }, 230);
        };

        const botonCerrar =
            tarjeta.querySelector(".notificacion-sistema-cerrar");

        if (botonCerrar) {
            botonCerrar.addEventListener("click", cerrar);
        }

        window.setTimeout(() => {
            tarjeta.classList.add("visible");
        }, 20);

        window.setTimeout(
            cerrar,
            Math.max(1200, Number(duracion) || 4200)
        );

        return tarjeta;
    },


    exito(mensaje, duracion = 4200) {
        return this.notificar(mensaje, "exito", duracion);
    },


    error(mensaje, duracion = 5500) {
        return this.notificar(mensaje, "error", duracion);
    },


    advertencia(mensaje, duracion = 5000) {
        return this.notificar(mensaje, "advertencia", duracion);
    },


    info(mensaje, duracion = 4200) {
        return this.notificar(mensaje, "info", duracion);
    },


    mostrarCarga(
        titulo = "Procesando...",
        mensaje = "Espere un momento."
    ) {

        if (
            window.CargadorSistema &&
            typeof window.CargadorSistema.mostrar === "function"
        ) {
            window.CargadorSistema.mostrar(titulo, mensaje);
            return true;
        }

        return false;
    },


    ocultarCarga(forzar = false) {

        if (
            window.CargadorSistema &&
            typeof window.CargadorSistema.ocultar === "function"
        ) {
            window.CargadorSistema.ocultar(forzar);
            return true;
        }

        return false;
    },


    obtenerSesion() {

        try {
            return JSON.parse(
                localStorage.getItem("sesion") ||
                sessionStorage.getItem("sesion") ||
                "null"
            );
        } catch (error) {
            console.error("No fue posible leer la sesión:", error);
            return null;
        }
    },


    obtenerNombreUsuario() {

        const sesion = this.obtenerSesion();

        return sesion
            ? String(
                sesion.nombre ||
                sesion.usuario ||
                ""
            ).trim()
            : "";
    },


    formatearNumero(valor, decimales = 0) {

        const numero = this.convertirNumero(valor);

        return new Intl.NumberFormat(
            "es-DO",
            {
                minimumFractionDigits: decimales,
                maximumFractionDigits: decimales
            }
        ).format(numero);
    },


    formatearPorcentaje(valor, decimales = 2) {

        return (
            this.formatearNumero(valor, decimales) +
            "%"
        );
    },


    convertirNumero(valor, valorPredeterminado = 0) {

        if (
            typeof valor === "number" &&
            Number.isFinite(valor)
        ) {
            return valor;
        }

        const texto =
            String(valor == null ? "" : valor)
                .replace("%", "")
                .replace(/\s/g, "")
                .replace(",", ".");

        const numero = Number(texto);

        return Number.isFinite(numero)
            ? numero
            : valorPredeterminado;
    },


    formatearFecha(valor, incluirHora = false) {

        if (!valor) {
            return "";
        }

        let fecha;

        if (valor instanceof Date) {
            fecha = valor;
        } else {

            const texto = String(valor).trim();

            const fechaISO =
                texto.match(
                    /^(\d{4})-(\d{1,2})-(\d{1,2})/
                );

            const fechaLatina =
                texto.match(
                    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
                );

            if (fechaISO) {
                fecha = new Date(
                    Number(fechaISO[1]),
                    Number(fechaISO[2]) - 1,
                    Number(fechaISO[3])
                );
            } else if (fechaLatina) {
                fecha = new Date(
                    Number(fechaLatina[3]),
                    Number(fechaLatina[2]) - 1,
                    Number(fechaLatina[1])
                );
            } else {
                fecha = new Date(texto);
            }
        }

        if (
            !(fecha instanceof Date) ||
            Number.isNaN(fecha.getTime())
        ) {
            return String(valor);
        }

        const opciones = {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        };

        if (incluirHora) {
            opciones.hour = "2-digit";
            opciones.minute = "2-digit";
        }

        return new Intl.DateTimeFormat(
            "es-DO",
            opciones
        ).format(fecha);
    },


    obtenerMesActual() {

        const ahora = new Date();

        const mes =
            String(ahora.getMonth() + 1)
                .padStart(2, "0");

        return ahora.getFullYear() + "-" + mes;
    },


    escaparHTML(valor) {

        const elemento = document.createElement("div");

        elemento.textContent =
            String(valor == null ? "" : valor);

        return elemento.innerHTML;
    },


    escaparAtributo(valor) {

        return this.escaparHTML(valor)
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },


    actualizarRegistroEnCache(
        cache,
        clave,
        valorClave,
        cambios
    ) {

        if (!Array.isArray(cache)) {
            return false;
        }

        const indice =
            cache.findIndex(
                registro =>
                    String(
                        registro &&
                        registro[clave] != null
                            ? registro[clave]
                            : ""
                    ) ===
                    String(
                        valorClave == null
                            ? ""
                            : valorClave
                    )
            );

        if (indice === -1) {
            return false;
        }

        cache[indice] = {
            ...cache[indice],
            ...(cambios || {})
        };

        return true;
    },


    obtenerRegistroDeCache(
        cache,
        clave,
        valorClave
    ) {

        if (!Array.isArray(cache)) {
            return null;
        }

        return (
            cache.find(
                registro =>
                    String(
                        registro &&
                        registro[clave] != null
                            ? registro[clave]
                            : ""
                    ) ===
                    String(
                        valorClave == null
                            ? ""
                            : valorClave
                    )
            ) ||
            null
        );
    },


    debounce(funcion, espera = 300) {

        let temporizador;

        return function(...argumentos) {

            window.clearTimeout(temporizador);

            temporizador =
                window.setTimeout(
                    () => {
                        funcion.apply(this, argumentos);
                    },
                    espera
                );
        };
    },


    generarIdTemporal(prefijo = "TMP") {

        return (
            prefijo +
            "-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 8)
                .toUpperCase()
        );
    }

};

window.Sistema = Sistema;

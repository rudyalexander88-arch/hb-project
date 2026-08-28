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

        const elementoActivo = document.activeElement;

        if (
            elementoActivo &&
            elementoActivo !== document.body &&
            !modal.contains(elementoActivo)
        ) {
            this.elementoEnfocadoAntesDelModal = elementoActivo;
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
        modal.removeAttribute("inert");
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

        const elementoAnterior = this.elementoEnfocadoAntesDelModal;

        this.elementoEnfocadoAntesDelModal = null;

        let destinoFoco = null;

        if (
            elementoAnterior &&
            document.contains(elementoAnterior) &&
            !modal.contains(elementoAnterior) &&
            typeof elementoAnterior.focus === "function"
        ) {
            destinoFoco = elementoAnterior;
        }

        let tabindexTemporal = false;

        if (!destinoFoco) {
            destinoFoco = document.body;

            if (!document.body.hasAttribute("tabindex")) {
                document.body.setAttribute("tabindex", "-1");
                tabindexTemporal = true;
            }
        }

        /*
         * El foco debe quedar fuera del modal antes de aplicar inert o
         * aria-hidden. blur() por sí solo no garantiza ese traslado en
         * Chromium y provocaba la advertencia de accesibilidad.
         */
        try {
            destinoFoco.focus({ preventScroll: true });
        } catch (errorFoco) {
            document.body.focus();
        }

        modal.setAttribute("inert", "");
        modal.classList.add("oculto");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-sistema-abierto");

        if (tabindexTemporal) {
            window.setTimeout(() => {
                document.body.removeAttribute("tabindex");
            }, 0);
        }

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


    /**
     * Confirmación corporativa para toda interacción que requiera
     * una decisión explícita del usuario.
     *
     * Devuelve una Promise<boolean>:
     * - true: el usuario confirmó la acción.
     * - false: el usuario canceló o presionó Escape.
     */
    confirmar(configuracion = {}, opciones = {}) {

        const parametros =
            typeof configuracion === "string"
                ? {
                    ...opciones,
                    mensaje: configuracion
                }
                : {
                    ...(configuracion || {})
                };

        if (
            this.confirmacionActiva &&
            this.confirmacionActiva.promesa
        ) {
            return this.confirmacionActiva.promesa;
        }

        const tiposPermitidos = [
            "peligro",
            "advertencia",
            "info",
            "exito"
        ];

        const tipo =
            tiposPermitidos.includes(parametros.tipo)
                ? parametros.tipo
                : "advertencia";

        const iconos = {
            peligro: "fa-solid fa-triangle-exclamation",
            advertencia: "fa-solid fa-circle-exclamation",
            info: "fa-solid fa-circle-question",
            exito: "fa-solid fa-circle-check"
        };

        const titulo =
            String(
                parametros.titulo ||
                "Confirmar acción"
            );

        const mensaje =
            String(
                parametros.mensaje ||
                "¿Desea continuar con esta acción?"
            );

        const detalle =
            String(
                parametros.detalle ||
                ""
            );

        const textoConfirmar =
            String(
                parametros.textoConfirmar ||
                "Confirmar"
            );

        const textoCancelar =
            String(
                parametros.textoCancelar ||
                "Cancelar"
            );

        const elementoAnterior =
            document.activeElement;

        const fondo =
            document.createElement("div");

        fondo.className =
            "confirmacion-sistema-fondo " +
            "confirmacion-sistema-" +
            tipo;

        fondo.setAttribute(
            "aria-hidden",
            "true"
        );

        fondo.innerHTML = `
            <section
                class="confirmacion-sistema-tarjeta"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirmacionSistemaTitulo"
                aria-describedby="confirmacionSistemaMensaje"
            >
                <div class="confirmacion-sistema-identidad" aria-hidden="true">
                    <i class="${iconos[tipo]}"></i>
                </div>

                <div class="confirmacion-sistema-contenido">
                    <span class="confirmacion-sistema-etiqueta">
                        Sistema Logístico PT
                    </span>

                    <h3 id="confirmacionSistemaTitulo">
                        ${this.escaparHTML(titulo)}
                    </h3>

                    <p id="confirmacionSistemaMensaje">
                        ${this.escaparHTML(mensaje)}
                    </p>

                    ${
                        detalle
                            ? `
                                <small>
                                    ${this.escaparHTML(detalle)}
                                </small>
                            `
                            : ""
                    }
                </div>

                <div class="confirmacion-sistema-acciones">
                    <button
                        type="button"
                        class="confirmacion-sistema-cancelar"
                        data-confirmacion-cancelar
                    >
                        ${this.escaparHTML(textoCancelar)}
                    </button>

                    <button
                        type="button"
                        class="confirmacion-sistema-confirmar"
                        data-confirmacion-aceptar
                    >
                        ${this.escaparHTML(textoConfirmar)}
                    </button>
                </div>
            </section>
        `;

        let resolverPromesa;

        const promesa =
            new Promise(resolve => {
                resolverPromesa = resolve;
            });

        let cerrando = false;

        const cerrar = resultado => {

            if (cerrando) {
                return;
            }

            cerrando = true;

            document.removeEventListener(
                "keydown",
                manejarTeclado
            );

            /*
             * El foco debe salir de la tarjeta antes de marcarla
             * como oculta. De lo contrario Chrome bloquea
             * aria-hidden porque el botón confirmado todavía
             * conserva el foco.
             */
            const elementoEnfocado =
                document.activeElement;

            if (
                elementoEnfocado &&
                fondo.contains(elementoEnfocado) &&
                typeof elementoEnfocado.blur === "function"
            ) {
                elementoEnfocado.blur();
            }

            fondo.setAttribute("inert", "");

            fondo.classList.add("cerrando");
            fondo.classList.remove("visible");
            fondo.setAttribute("aria-hidden", "true");

            window.setTimeout(() => {

                fondo.remove();

                document.body.classList.remove(
                    "confirmacion-sistema-abierta"
                );

                this.confirmacionActiva = null;

                if (
                    elementoAnterior &&
                    document.contains(elementoAnterior) &&
                    typeof elementoAnterior.focus === "function"
                ) {
                    elementoAnterior.focus({
                        preventScroll: true
                    });
                }

                resolverPromesa(
                    resultado === true
                );

            }, 230);

        };

        const manejarTeclado = evento => {

            if (evento.key === "Escape") {
                evento.preventDefault();
                cerrar(false);
                return;
            }

            if (evento.key !== "Tab") {
                return;
            }

            const controles =
                Array.from(
                    fondo.querySelectorAll(
                        "button:not(:disabled)"
                    )
                );

            if (!controles.length) {
                return;
            }

            const primero = controles[0];
            const ultimo =
                controles[controles.length - 1];

            if (
                evento.shiftKey &&
                document.activeElement === primero
            ) {
                evento.preventDefault();
                ultimo.focus();
            } else if (
                !evento.shiftKey &&
                document.activeElement === ultimo
            ) {
                evento.preventDefault();
                primero.focus();
            }

        };

        const botonCancelar =
            fondo.querySelector(
                "[data-confirmacion-cancelar]"
            );

        const botonAceptar =
            fondo.querySelector(
                "[data-confirmacion-aceptar]"
            );

        botonCancelar.addEventListener(
            "click",
            () => cerrar(false)
        );

        botonAceptar.addEventListener(
            "click",
            () => cerrar(true)
        );

        if (parametros.cerrarConFondo === true) {
            fondo.addEventListener(
                "click",
                evento => {
                    if (evento.target === fondo) {
                        cerrar(false);
                    }
                }
            );
        }

        document.body.appendChild(fondo);
        document.body.classList.add(
            "confirmacion-sistema-abierta"
        );

        document.addEventListener(
            "keydown",
            manejarTeclado
        );

        this.confirmacionActiva = {
            promesa: promesa,
            cerrar: cerrar
        };

        window.requestAnimationFrame(() => {

            fondo.classList.add("visible");
            fondo.setAttribute("aria-hidden", "false");

            window.setTimeout(() => {
                botonCancelar.focus();
            }, 80);

        });

        return promesa;

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
	
	// ==========================================
    // CONTROL DE ACCESO Y PERMISOS
    // ==========================================

    normalizarPermiso(valor) {

        return String(valor || "")
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_");

    },


    esAdministrador() {

        const sesion = this.obtenerSesion();

        if (!sesion) {
            return false;
        }

        const rol = this.normalizarPermiso(sesion.rol);

        return (
            sesion.accesoTotal === true ||
            rol === "ADMINISTRADOR" ||
            rol === "ENCARGADO"
        );

    },


    tieneAccesoModulo(modulo) {

        const sesion = this.obtenerSesion();

        if (!sesion) {
            return false;
        }


        if (this.esAdministrador()) {
            return true;
        }


        const moduloBuscado =
            this.normalizarPermiso(modulo);


        const modulos =
            Array.isArray(sesion.modulos)
                ? sesion.modulos
                : [];


        return modulos.some(
            item =>
                this.normalizarPermiso(item) ===
                moduloBuscado
        );

    },


    tienePermiso(permiso) {

        const sesion = this.obtenerSesion();

        if (!sesion) {
            return false;
        }


        if (this.esAdministrador()) {
            return true;
        }


        const permisoBuscado =
            this.normalizarPermiso(permiso);


        const permisos =
            Array.isArray(sesion.permisos)
                ? sesion.permisos
                : [];


        return permisos.some(
            item =>
                this.normalizarPermiso(item) ===
                permisoBuscado
        );

    },


    puede(modulo, permiso = "") {

        if (!this.tieneAccesoModulo(modulo)) {
            return false;
        }


        if (!permiso) {
            return true;
        }


        return this.tienePermiso(permiso);

    },


    denegarAcceso(
        mensaje = "No tiene permiso para realizar esta acción."
    ) {

        this.advertencia(
            mensaje,
            4500
        );

        return false;

    },


    exigirPermiso(
        permiso,
        mensaje = "No tiene permiso para realizar esta acción."
    ) {

        if (this.tienePermiso(permiso)) {
            return true;
        }


        return this.denegarAcceso(
            mensaje
        );

    },


    exigirModulo(
        modulo,
        mensaje = "No tiene acceso a este módulo."
    ) {

        if (this.tieneAccesoModulo(modulo)) {
            return true;
        }


        return this.denegarAcceso(
            mensaje
        );

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

/**
 * ============================================================
 * INICIOOPERATIVO.JS
 * Sistema Logístico PT - Helados BON
 * ============================================================
 * Pantalla de inicio común para los usuarios del sistema.
 * ============================================================
 */

window.InicioOperativo = {

    cargandoResumen: false,


    async cargar() {

        const contenedor =
            document.getElementById(
                "contenidoPrincipal"
            );


        if (!contenedor) {
            return;
        }


        activarMenu(
            "menuInicio"
        );


        const sesion =
            Sistema.obtenerSesion() || {};


        contenedor.innerHTML =
            this.construirInicio(
                sesion,
                null
            );


        this.conectarEventos();


        await this.actualizarResumenHorasExtras();

    },


    async actualizarResumenHorasExtras() {

        if (this.cargandoResumen) {
            return;
        }


        if (
            !window.HorasExtras ||
            (
                !HorasExtras.puedeInscribirse() &&
                !HorasExtras.puedeGestionar()
            )
        ) {
            return;
        }


        this.cargandoResumen = true;


        try {

            const resumen =
                await HorasExtras
                    .cargarResumenInicio();


            if (!resumen) {
                return;
            }


            const contenedor =
                document.getElementById(
                    "resumenHorasExtrasInicio"
                );


            if (contenedor) {

                contenedor.innerHTML =
                    this.construirResumenHorasExtras(
                        resumen
                    );

            }

        } finally {

            this.cargandoResumen = false;

        }

    },


    construirInicio(
        sesion,
        resumenHorasExtras
    ) {

        const nombre =
            String(
                sesion.nombre ||
                sesion.usuario ||
                "Usuario"
            ).trim();


        const rol =
            String(
                sesion.rol || ""
            ).trim();


        const datosAntiguedad =
            this.calcularAntiguedad(
                sesion.fechaIngreso || ""
            );


        const aniversarioSemana =
            this.obtenerAniversarioSemana(
                sesion.fechaIngreso || "",
                nombre
            );


        const puedeHorasExtras =
            window.HorasExtras &&
            (
                HorasExtras.puedeInscribirse() ||
                HorasExtras.puedeGestionar()
            );


        const puedeSolicitarEPP =
            Sistema.esAdministrador() ||
            Sistema.tienePermiso(
                "EPP_SOLICITAR"
            );


        const puedeGestionarEPP =
            Sistema.esAdministrador() ||
            Sistema.tienePermiso(
                "EPP_GESTIONAR"
            );


        return `
            <section class="inicio-operativo">

                <header class="inicio-operativo-bienvenida">

                    <div>
                        <span class="inicio-operativo-eyebrow">
                            Centro operativo
                        </span>

                        <h2>
                            Bienvenido, ${this.escapar(nombre)}
                        </h2>

                        <p>
                            ${this.escapar(rol)}
                            ${
                                datosAntiguedad
                                    ? ` · ${this.escapar(datosAntiguedad.texto)}`
                                    : ""
                            }
                        </p>
                    </div>

                    <div class="inicio-operativo-fecha">
                        <i class="fa-regular fa-calendar"></i>
                        <span>
                            ${this.formatearFechaActual()}
                        </span>
                    </div>

                </header>


                ${
                    aniversarioSemana
                        ? `
                            <article class="inicio-aniversario">
                                <div class="inicio-aniversario-icono">
                                    <i class="fa-solid fa-cake-candles"></i>
                                </div>

                                <div>
                                    <span>ANIVERSARIO EN BON</span>
                                    <h3>${this.escapar(aniversarioSemana.titulo)}</h3>
                                    <p>${this.escapar(aniversarioSemana.mensaje)}</p>
                                </div>
                            </article>
                        `
                        : ""
                }


                <div class="inicio-operativo-grid">

                    <article class="inicio-card inicio-card-avisos">
                        <div class="inicio-card-icono">
                            <i class="fa-solid fa-bullhorn"></i>
                        </div>

                        <div>
                            <span class="inicio-card-etiqueta">
                                Comunicación
                            </span>
                            <h3>Avisos</h3>
                            <p>
                                Los avisos generales y por rol aparecerán en este espacio.
                            </p>
                        </div>

                        <button
                            type="button"
                            class="inicio-card-boton secundario"
                            id="btnVerAvisosInicio"
                        >
                            <i class="fa-regular fa-eye"></i>
                            Ver avisos
                        </button>
                    </article>


                    ${
                        puedeHorasExtras
                            ? `
                                <article class="inicio-card inicio-card-horas-extra">
                                    <div class="inicio-card-icono">
                                        <i class="fa-solid fa-clock"></i>
                                    </div>

                                    <div>
                                        <span class="inicio-card-etiqueta">
                                            Jornada adicional
                                        </span>
                                        <h3>Horas extras</h3>

                                        <div
                                            id="resumenHorasExtrasInicio"
                                            class="inicio-card-resumen"
                                        >
                                            ${
                                                this.construirResumenHorasExtras(
                                                    resumenHorasExtras
                                                )
                                            }
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        class="inicio-card-boton"
                                        id="btnHorasExtrasInicio"
                                    >
                                        <i class="fa-solid fa-arrow-right"></i>
                                        ${
                                            HorasExtras.puedeGestionar()
                                                ? "Gestionar horas extras"
                                                : "Ver disponibilidad"
                                        }
                                    </button>
                                </article>
                            `
                            : ""
                    }


                    ${
                        puedeSolicitarEPP ||
                        puedeGestionarEPP
                            ? `
                                <article class="inicio-card inicio-card-epp">
                                    <div class="inicio-card-icono">
                                        <i class="fa-solid fa-helmet-safety"></i>
                                    </div>

                                    <div>
                                        <span class="inicio-card-etiqueta">
                                            Seguridad personal
                                        </span>
                                        <h3>EPP</h3>
                                        <p>
                                            ${
                                                puedeGestionarEPP
                                                    ? "Consulte solicitudes pendientes y entregas."
                                                    : "Solicite reemplazo y consulte su historial de EPP."
                                            }
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        class="inicio-card-boton"
                                        id="btnEPPInicio"
                                    >
                                        <i class="fa-solid fa-arrow-right"></i>
                                        ${
                                            puedeGestionarEPP
                                                ? "Gestionar EPP"
                                                : "Solicitar EPP"
                                        }
                                    </button>
                                </article>
                            `
                            : ""
                    }

                </div>

            </section>
        `;

    },


    construirResumenHorasExtras(resumen) {

        if (!resumen) {
            return `
                <span class="inicio-resumen-cargando">
                    Consultando disponibilidad...
                </span>
            `;
        }


        if (resumen.puedeGestionar) {
            return `
                <strong>
                    ${Number(resumen.pendientesGestion || 0)}
                </strong>
                <span>
                    registros por gestionar
                </span>
            `;
        }


        return `
            <strong>
                ${Number(resumen.disponibles || 0)}
            </strong>
            <span>
                jornadas con disponibilidad
            </span>

            <small>
                ${Number(resumen.misInscripcionesActivas || 0)}
                jornadas activas para usted
            </small>
        `;

    },


    conectarEventos() {

        const botonHoras =
            document.getElementById(
                "btnHorasExtrasInicio"
            );


        if (botonHoras) {

            botonHoras.addEventListener(
                "click",
                () => HorasExtras.abrir()
            );

        }


        const botonAvisos =
            document.getElementById(
                "btnVerAvisosInicio"
            );


        if (botonAvisos) {

            botonAvisos.addEventListener(
                "click",
                () => {
                    Sistema.info(
                        "El Centro de Avisos será conectado en la siguiente etapa."
                    );
                }
            );

        }


        const botonEPP =
            document.getElementById(
                "btnEPPInicio"
            );


        if (botonEPP) {

            botonEPP.addEventListener(
                "click",
                () => {
                    Sistema.info(
                        "El asistente de EPP será conectado en la siguiente etapa."
                    );
                }
            );

        }

    },


    parsearFechaIngreso(valor) {

        const texto =
            String(valor || "").trim();


        if (!texto) {
            return null;
        }


        let coincidencia =
            texto.match(
                /^(\d{4})-(\d{1,2})-(\d{1,2})/
            );


        if (coincidencia) {

            const fecha =
                new Date(
                    Number(coincidencia[1]),
                    Number(coincidencia[2]) - 1,
                    Number(coincidencia[3])
                );

            return Number.isNaN(fecha.getTime())
                ? null
                : fecha;

        }


        coincidencia =
            texto.match(
                /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/
            );


        if (coincidencia) {

            const fecha =
                new Date(
                    Number(coincidencia[3]),
                    Number(coincidencia[2]) - 1,
                    Number(coincidencia[1])
                );

            return Number.isNaN(fecha.getTime())
                ? null
                : fecha;

        }


        const fechaDirecta =
            new Date(texto);


        return Number.isNaN(
            fechaDirecta.getTime()
        )
            ? null
            : fechaDirecta;

    },


    calcularAntiguedad(valor) {

        const fechaIngreso =
            this.parsearFechaIngreso(valor);


        if (!fechaIngreso) {
            return null;
        }


        const hoy = new Date();


        if (fechaIngreso > hoy) {
            return null;
        }


        let anios =
            hoy.getFullYear() -
            fechaIngreso.getFullYear();

        let meses =
            hoy.getMonth() -
            fechaIngreso.getMonth();


        if (hoy.getDate() < fechaIngreso.getDate()) {
            meses--;
        }


        if (meses < 0) {
            anios--;
            meses += 12;
        }


        let texto = "";


        if (anios > 0) {

            texto +=
                anios +
                (anios === 1
                    ? " año"
                    : " años");

        }


        if (meses > 0) {

            if (texto) {
                texto += ", ";
            }

            texto +=
                meses +
                (meses === 1
                    ? " mes"
                    : " meses");

        }


        if (!texto) {
            texto = "menos de 1 mes";
        }


        return {
            anios: anios,
            meses: meses,
            texto: texto + " en la empresa"
        };

    },


    obtenerAniversarioSemana(
        valor,
        nombre
    ) {

        const fechaIngreso =
            this.parsearFechaIngreso(valor);


        if (!fechaIngreso) {
            return null;
        }


        const hoy = new Date();

        const aniversario =
            new Date(
                hoy.getFullYear(),
                fechaIngreso.getMonth(),
                fechaIngreso.getDate()
            );


        const inicioSemana =
            new Date(hoy);

        const diaSemana =
            (hoy.getDay() + 6) % 7;

        inicioSemana.setDate(
            hoy.getDate() - diaSemana
        );

        inicioSemana.setHours(0, 0, 0, 0);


        const finSemana =
            new Date(inicioSemana);

        finSemana.setDate(
            inicioSemana.getDate() + 6
        );

        finSemana.setHours(
            23, 59, 59, 999
        );


        if (
            aniversario < inicioSemana ||
            aniversario > finSemana
        ) {
            return null;
        }


        let anios =
            hoy.getFullYear() -
            fechaIngreso.getFullYear();


        if (anios <= 0) {
            return null;
        }


        return {
            titulo:
                "¡Feliz aniversario, " +
                String(nombre || "") +
                "!",
            mensaje:
                "Esta semana cumple " +
                anios +
                (anios === 1
                    ? " año"
                    : " años") +
                " formando parte de Helados BON."
        };

    },


    formatearFechaActual() {

        return new Intl.DateTimeFormat(
            "es-DO",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        ).format(new Date());

    },


    escapar(valor) {

        const div =
            document.createElement("div");

        div.textContent =
            String(
                valor === null ||
                valor === undefined
                    ? ""
                    : valor
            );

        return div.innerHTML;

    }

};

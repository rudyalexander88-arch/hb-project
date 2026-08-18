/**
 * ============================================================
 * HORASEXTRAS.JS
 * Sistema Logístico PT - Helados BON
 * ============================================================
 */

window.HorasExtras = {

    resumenInicio: null,


    async cargarResumenInicio() {

        try {

            const respuesta =
                await API.post({
                    action:
                        "obtenerInicioHorasExtras"
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {
                return null;
            }


            this.resumenInicio =
                respuesta.data || null;


            return this.resumenInicio;

        } catch (error) {

            console.warn(
                "No fue posible cargar el resumen de horas extras:",
                error
            );

            return null;

        }

    },


    puedeInscribirse() {

        return (
            Sistema.esAdministrador() ||
            Sistema.tienePermiso(
                "HORAS_EXTRA_INSCRIBIR"
            )
        );

    },


    puedeGestionar() {

        return (
            Sistema.esAdministrador() ||
            Sistema.tienePermiso(
                "HORAS_EXTRA_GESTIONAR"
            )
        );

    },


    async abrir() {

        if (this.puedeGestionar()) {

            await this.abrirGestion();
            return;

        }


        if (this.puedeInscribirse()) {

            await this.abrirColaborador();
            return;

        }


        Sistema.advertencia(
            "No tiene permisos habilitados para Horas Extras."
        );

    },


    async abrirColaborador() {

        Sistema.abrirModal(
            "Horas Extras",
            this.construirCarga(),
            {
                clase:
                    "modal-horas-extras"
            }
        );


        CargadorSistema.mostrar(
            "Cargando horas extras",
            "Consultando jornadas y disponibilidad."
        );


        try {

            const respuesta =
                await API.post({
                    action:
                        "listarHorasExtrasDisponibles"
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible consultar las horas extras."
                );

            }


            const data =
                respuesta.data || {};


            const contenido =
                document.getElementById(
                    "contenidoModal"
                );


            if (contenido) {

                contenido.innerHTML =
                    this.construirVistaColaborador(
                        data.programaciones || [],
                        data.misInscripciones || []
                    );


                this.conectarEventosColaborador();

            }

        } catch (error) {

            console.error(
                "Error cargando Horas Extras:",
                error
            );


            const contenido =
                document.getElementById(
                    "contenidoModal"
                );


            if (contenido) {

                contenido.innerHTML =
                    this.construirError(
                        error.message
                    );

            }

        } finally {

            CargadorSistema.ocultar();

        }

    },


    construirVistaColaborador(
        programaciones,
        inscripciones
    ) {

        const disponibles =
            programaciones.filter(
                item =>
                    item.estado === "ACTIVO"
            );


        return `
            <div class="horas-extras">

                <section class="he-seccion">

                    <div class="he-seccion-encabezado">
                        <div>
                            <span class="he-eyebrow">
                                Disponibilidad
                            </span>
                            <h3>
                                Jornadas publicadas
                            </h3>
                            <p>
                                Seleccione la jornada en la que desea colaborar.
                            </p>
                        </div>
                    </div>

                    <div class="he-grid-jornadas">
                        ${
                            disponibles.length
                                ? disponibles
                                    .map(
                                        item =>
                                            this.construirTarjetaJornada(
                                                item
                                            )
                                    )
                                    .join("")
                                : `
                                    <div class="he-vacio">
                                        <i class="fa-regular fa-calendar-xmark"></i>
                                        <strong>
                                            No hay jornadas disponibles.
                                        </strong>
                                        <span>
                                            Cuando se publique una nueva disponibilidad aparecerá aquí.
                                        </span>
                                    </div>
                                `
                        }
                    </div>

                </section>


                <section class="he-seccion">

                    <div class="he-seccion-encabezado">
                        <div>
                            <span class="he-eyebrow">
                                Mis registros
                            </span>
                            <h3>
                                Mis jornadas de horas extras
                            </h3>
                            <p>
                                Consulte su asignación y registre Entrada o Salida el día programado.
                            </p>
                        </div>
                    </div>

                    <div class="he-lista-mis-jornadas">
                        ${
                            inscripciones.length
                                ? inscripciones
                                    .map(
                                        item =>
                                            this.construirMiJornada(
                                                item
                                            )
                                    )
                                    .join("")
                                : `
                                    <div class="he-vacio compacto">
                                        <i class="fa-regular fa-clock"></i>
                                        <strong>
                                            Aún no tiene jornadas registradas.
                                        </strong>
                                    </div>
                                `
                        }
                    </div>

                </section>

            </div>
        `;

    },


    construirTarjetaJornada(item) {

        const textoCupos =
            item.cuposRestantes === 1
                ? "1 cupo disponible"
                : `${item.cuposRestantes} cupos disponibles`;


        let accion = "";


        if (item.yaInscrito) {

            accion = `
                <button
                    type="button"
                    class="he-btn secundario"
                    disabled
                >
                    <i class="fa-solid fa-check"></i>
                    Ya inscrito
                </button>
            `;

        } else if (item.puedeInscribirse) {

            accion = `
                <button
                    type="button"
                    class="he-btn principal"
                    data-inscribir-he="${this.escapar(item.idProgramacion)}"
                >
                    <i class="fa-solid fa-user-plus"></i>
                    Inscribirme
                </button>
            `;

        } else {

            accion = `
                <button
                    type="button"
                    class="he-btn secundario"
                    disabled
                >
                    Sin disponibilidad
                </button>
            `;

        }


        return `
            <article class="he-jornada-card">

                <div class="he-jornada-fecha">
                    <i class="fa-regular fa-calendar"></i>
                    <strong>
                        ${this.formatearFecha(item.fecha)}
                    </strong>
                </div>

                <h4>
                    ${this.escapar(item.turno || "Jornada especial")}
                </h4>

                <div class="he-jornada-datos">
                    <span>
                        <i class="fa-regular fa-clock"></i>
                        ${this.escapar(this.formatearHora(item.horaInicio))}
                        -
                        ${this.escapar(this.formatearHora(item.horaFinal))}
                    </span>

                    <span>
                        <i class="fa-solid fa-users"></i>
                        ${textoCupos}
                    </span>
                </div>

                ${accion}

            </article>
        `;

    },


    construirMiJornada(item) {

        const hoy =
            new Date()
                .toISOString()
                .slice(0, 10);


        const esHoy =
            item.fechaTrabajo === hoy;


        const puedeEntrada =
            esHoy &&
            ["INSCRITO", "ASIGNADO"]
                .includes(item.estado);


        const puedeSalida =
            esHoy &&
            item.estado === "EN_TURNO";


        let accion = "";


        if (puedeEntrada) {

            accion = `
                <button
                    type="button"
                    class="he-btn principal"
                    data-marcar-entrada-he="${this.escapar(item.idInscripcion)}"
                >
                    <i class="fa-solid fa-right-to-bracket"></i>
                    Marcar entrada
                </button>
            `;

        } else if (puedeSalida) {

            accion = `
                <button
                    type="button"
                    class="he-btn salida"
                    data-marcar-salida-he="${this.escapar(item.idInscripcion)}"
                >
                    <i class="fa-solid fa-right-from-bracket"></i>
                    Marcar salida
                </button>
            `;

        }


        const linea =
            item.lineaTrabajo ||
            "Pendiente de asignación";


        return `
            <article class="he-mi-jornada ${this.escapar(item.estado.toLowerCase())}">

                <div class="he-mi-jornada-principal">

                    <div>
                        <span class="he-estado">
                            ${this.escapar(this.textoEstado(item.estado))}
                        </span>

                        <h4>
                            ${this.formatearFecha(item.fechaTrabajo)}
                            ·
                            ${this.escapar(item.turno || "Horas extras")}
                        </h4>

                        <p>
                            <strong>Línea:</strong>
                            ${this.escapar(linea)}
                        </p>
                    </div>

                    <div class="he-horas-turno">
                        ${this.escapar(this.formatearHora(item.horaTurnoInicio))}
                        -
                        ${this.escapar(this.formatearHora(item.horaTurnoFinal))}
                    </div>

                </div>

                <div class="he-mi-jornada-marcajes">
                    <span>
                        Entrada:
                        <strong>
                            ${this.escapar(this.formatearHora(item.horaEntrada) || "--")}
                        </strong>
                    </span>

                    <span>
                        Salida:
                        <strong>
                            ${this.escapar(this.formatearHora(item.horaSalida) || "--")}
                        </strong>
                    </span>

                    <span>
                        Tiempo:
                        <strong>
                            ${this.escapar(this.formatearDuracion(item.minutosTrabajados))}
                        </strong>
                    </span>
                </div>

                ${accion}

            </article>
        `;

    },


    conectarEventosColaborador() {

        document
            .querySelectorAll(
                "[data-inscribir-he]"
            )
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {
                        this.inscribir(
                            boton.dataset.inscribirHe
                        );
                    }
                );

            });


        document
            .querySelectorAll(
                "[data-marcar-entrada-he]"
            )
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {
                        this.registrarMarcaje(
                            boton.dataset.marcarEntradaHe,
                            "ENTRADA"
                        );
                    }
                );

            });


        document
            .querySelectorAll(
                "[data-marcar-salida-he]"
            )
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {
                        this.registrarMarcaje(
                            boton.dataset.marcarSalidaHe,
                            "SALIDA"
                        );
                    }
                );

            });

    },


    async inscribir(idProgramacion) {

        if (!idProgramacion) {
            return;
        }


        CargadorSistema.mostrar(
            "Registrando disponibilidad",
            "Estamos reservando su cupo."
        );


        try {

            const respuesta =
                await API.post({
                    action:
                        "inscribirHorasExtra",
                    idProgramacion:
                        idProgramacion
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible registrar la inscripción."
                );

            }


            Sistema.exito(
                respuesta.mensaje ||
                "Inscripción registrada."
            );


            await this.abrirColaborador();


            if (
                window.InicioOperativo &&
                typeof window.InicioOperativo
                    .actualizarResumenHorasExtras ===
                    "function"
            ) {

                window.InicioOperativo
                    .actualizarResumenHorasExtras();

            }

        } catch (error) {

            Sistema.error(
                error.message ||
                "No fue posible registrar la inscripción."
            );

        } finally {

            CargadorSistema.ocultar();

        }

    },


    async registrarMarcaje(
        idInscripcion,
        tipo
    ) {

        if (!navigator.geolocation) {

            Sistema.error(
                "Este dispositivo no permite obtener la ubicación."
            );

            return;

        }


        CargadorSistema.mostrar(
            tipo === "ENTRADA"
                ? "Registrando entrada"
                : "Registrando salida",
            "Validando su ubicación cerca de la empresa."
        );


        try {

            const ubicacion =
                await this.obtenerUbicacion();


            const respuesta =
                await API.post({
                    action:
                        tipo === "ENTRADA"
                            ? "marcarEntradaHorasExtra"
                            : "marcarSalidaHorasExtra",
                    idInscripcion:
                        idInscripcion,
                    latitud:
                        ubicacion.latitude,
                    longitud:
                        ubicacion.longitude,
                    precision:
                        ubicacion.accuracy
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible registrar el marcaje."
                );

            }


            Sistema.exito(
                respuesta.mensaje ||
                "Marcaje registrado correctamente."
            );


            await this.abrirColaborador();

        } catch (error) {

            Sistema.error(
                this.mensajeErrorUbicacion(
                    error
                )
            );

        } finally {

            CargadorSistema.ocultar();

        }

    },


    obtenerUbicacion() {

        return new Promise(
            (resolver, rechazar) => {

                navigator.geolocation
                    .getCurrentPosition(
                        posicion => {
                            resolver(
                                posicion.coords
                            );
                        },
                        error => {
                            rechazar(error);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 0
                        }
                    );

            }
        );

    },


    mensajeErrorUbicacion(error) {

        if (!error) {
            return "No fue posible obtener la ubicación.";
        }


        if (error.code === 1) {
            return "Debe permitir el acceso a la ubicación para registrar su jornada.";
        }


        if (error.code === 2) {
            return "No fue posible determinar su ubicación. Active el GPS e inténtelo nuevamente.";
        }


        if (error.code === 3) {
            return "La ubicación tardó demasiado en responder. Inténtelo nuevamente.";
        }


        return error.message ||
            "No fue posible registrar la ubicación.";

    },


    async abrirGestion() {

        Sistema.abrirModal(
            "Gestión de Horas Extras",
            this.construirCarga(),
            {
                clase:
                    "modal-horas-extras"
            }
        );


        CargadorSistema.mostrar(
            "Cargando horas extras",
            "Consultando programación, colaboradores y asignaciones."
        );


        try {

            const respuesta =
                await API.post({
                    action:
                        "listarGestionHorasExtras"
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible cargar la gestión de horas extras."
                );

            }


            const data =
                respuesta.data || {};


            const contenido =
                document.getElementById(
                    "contenidoModal"
                );


            if (contenido) {

                contenido.innerHTML =
                    this.construirVistaGestion(
                        data.programaciones || [],
                        data.inscripciones || [],
                        data.lineasTrabajo || []
                    );


                this.conectarEventosGestion();

            }

        } catch (error) {

            const contenido =
                document.getElementById(
                    "contenidoModal"
                );


            if (contenido) {
                contenido.innerHTML =
                    this.construirError(
                        error.message
                    );
            }


            Sistema.error(
                error.message ||
                "No fue posible abrir Horas Extras."
            );

        } finally {

            CargadorSistema.ocultar();

        }

    },


    construirVistaGestion(
        programaciones,
        inscripciones,
        lineasTrabajo
    ) {

        const programasOrdenados =
            [...programaciones]
                .sort((a, b) =>
                    (b.fecha + b.horaInicio)
                        .localeCompare(
                            a.fecha + a.horaInicio
                        )
                );


        return `
            <div class="horas-extras gestion">

                <section class="he-seccion he-publicar">

                    <div class="he-seccion-encabezado">
                        <div>
                            <span class="he-eyebrow">
                                Programación
                            </span>
                            <h3>
                                Publicar horas extras
                            </h3>
                            <p>
                                Defina el día, turno y cantidad de colaboradores requeridos.
                            </p>
                        </div>
                    </div>

                    <div class="he-form-programacion">

                        <label>
                            Fecha
                            <input
                                type="date"
                                id="heFechaProgramacion"
                            >
                        </label>

                        <label>
                            Turno
                            <input
                                type="text"
                                id="heTurnoProgramacion"
                                placeholder="Ej. Día / Tarde / Noche"
                            >
                        </label>

                        <label>
                            Hora inicio
                            <input
                                type="time"
                                id="heHoraInicioProgramacion"
                            >
                        </label>

                        <label>
                            Hora final
                            <input
                                type="time"
                                id="heHoraFinalProgramacion"
                            >
                        </label>

                        <label>
                            Cupos
                            <input
                                type="number"
                                id="heCuposProgramacion"
                                min="1"
                                step="1"
                                value="1"
                            >
                        </label>

                        <button
                            type="button"
                            id="btnPublicarHorasExtras"
                            class="he-btn principal"
                        >
                            <i class="fa-solid fa-bullhorn"></i>
                            Publicar
                        </button>

                    </div>

                </section>


                <section class="he-seccion">

                    <div class="he-seccion-encabezado">
                        <div>
                            <span class="he-eyebrow">
                                Colaboradores
                            </span>
                            <h3>
                                Inscritos y asignaciones
                            </h3>
                            <p>
                                Asigne la línea de trabajo y consulte entrada, salida y horas trabajadas.
                            </p>
                        </div>
                    </div>

                    <div class="he-gestion-listado">
                        ${
                            programasOrdenados.length
                                ? programasOrdenados
                                    .map(programa =>
                                        this.construirBloqueGestionPrograma(
                                            programa,
                                            inscripciones.filter(
                                                item =>
                                                    item.idProgramacion ===
                                                    programa.idProgramacion
                                            ),
                                            lineasTrabajo
                                        )
                                    )
                                    .join("")
                                : `
                                    <div class="he-vacio">
                                        <i class="fa-regular fa-calendar"></i>
                                        <strong>
                                            Aún no hay jornadas publicadas.
                                        </strong>
                                    </div>
                                `
                        }
                    </div>

                </section>

            </div>
        `;

    },


    construirBloqueGestionPrograma(
        programa,
        inscripciones,
        lineasTrabajo
    ) {

        const totalHoras =
            inscripciones.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.horasTrabajadas || 0
                    ),
                0
            );


        return `
            <article class="he-programa-gestion">

                <header>
                    <div>
                        <span>
                            ${this.formatearFecha(programa.fecha)}
                        </span>
                        <h4>
                            ${this.escapar(programa.turno || "Jornada")}
                            ·
                            ${this.escapar(this.formatearHora(programa.horaInicio))}
                            -
                            ${this.escapar(this.formatearHora(programa.horaFinal))}
                        </h4>
                    </div>

                    <div class="he-programa-resumen">
                        <span>
                            ${inscripciones.length}
                            /
                            ${programa.cuposDisponibles}
                            inscritos
                        </span>
                        <strong>
                            ${totalHoras.toFixed(2)} h trabajadas
                        </strong>
                    </div>
                </header>

                <div class="he-tabla-wrap">
                    <table class="he-tabla">
                        <thead>
                            <tr>
                                <th>Colaborador</th>
                                <th>Línea</th>
                                <th>Estado</th>
                                <th>Entrada</th>
                                <th>Salida</th>
                                <th>Horas</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                                inscripciones.length
                                    ? inscripciones
                                        .map(item =>
                                            this.construirFilaGestion(
                                                item,
                                                lineasTrabajo
                                            )
                                        )
                                        .join("")
                                    : `
                                        <tr>
                                            <td colspan="7" class="he-sin-inscritos">
                                                No hay colaboradores inscritos.
                                            </td>
                                        </tr>
                                    `
                            }
                        </tbody>
                    </table>
                </div>

            </article>
        `;

    },


    construirFilaGestion(
        item,
        lineasTrabajo
    ) {

        const opciones =
            [
                `<option value="">Seleccionar...</option>`,
                ...lineasTrabajo.map(linea => `
                    <option
                        value="${this.escapar(linea)}"
                        ${
                            linea === item.lineaTrabajo
                                ? "selected"
                                : ""
                        }
                    >
                        ${this.escapar(linea)}
                    </option>
                `)
            ].join("");


        const bloqueado =
            ["COMPLETADO", "CANCELADO", "NO_ASISTIO"]
                .includes(item.estado);


        return `
            <tr>
                <td>
                    <strong>
                        ${this.escapar(item.empleadoNombre)}
                    </strong>
                    <small>
                        ${this.escapar(item.empleadoId)}
                    </small>
                </td>

                <td>
                    <select
                        data-linea-he="${this.escapar(item.idInscripcion)}"
                        ${bloqueado ? "disabled" : ""}
                    >
                        ${opciones}
                    </select>
                </td>

                <td>
                    <span class="he-estado tabla">
                        ${this.escapar(this.textoEstado(item.estado))}
                    </span>
                </td>

                <td>
                    ${this.escapar(this.formatearHora(item.horaEntrada) || "--")}
                </td>

                <td>
                    ${this.escapar(this.formatearHora(item.horaSalida) || "--")}
                </td>

                <td>
                    ${
                        item.minutosTrabajados
                            ? this.escapar(
                                this.formatearDuracion(
                                    item.minutosTrabajados
                                )
                            )
                            : "--"
                    }
                </td>

                <td>
                    <button
                        type="button"
                        class="he-btn mini"
                        data-asignar-linea-he="${this.escapar(item.idInscripcion)}"
                        ${bloqueado ? "disabled" : ""}
                    >
                        Guardar
                    </button>
                </td>
            </tr>
        `;

    },


    conectarEventosGestion() {

        const publicar =
            document.getElementById(
                "btnPublicarHorasExtras"
            );


        if (publicar) {

            publicar.addEventListener(
                "click",
                () => this.publicarProgramacion()
            );

        }


        document
            .querySelectorAll(
                "[data-asignar-linea-he]"
            )
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const id =
                            boton.dataset.asignarLineaHe;


                        const select =
                            document.querySelector(
                                `[data-linea-he="${CSS.escape(id)}"]`
                            );


                        this.asignarLinea(
                            id,
                            select ? select.value : ""
                        );

                    }
                );

            });

    },


    async publicarProgramacion() {

        const fecha =
            document.getElementById(
                "heFechaProgramacion"
            )?.value || "";

        const turno =
            document.getElementById(
                "heTurnoProgramacion"
            )?.value.trim() || "";

        const horaInicio =
            document.getElementById(
                "heHoraInicioProgramacion"
            )?.value || "";

        const horaFinal =
            document.getElementById(
                "heHoraFinalProgramacion"
            )?.value || "";

        const cupos =
            document.getElementById(
                "heCuposProgramacion"
            )?.value || "";


        if (
            !fecha ||
            !horaInicio ||
            !horaFinal ||
            Number(cupos) <= 0
        ) {

            Sistema.advertencia(
                "Complete fecha, horas y cupos antes de publicar."
            );

            return;

        }


        CargadorSistema.mostrar(
            "Publicando horas extras",
            "Guardando la jornada disponible."
        );


        try {

            const respuesta =
                await API.post({
                    action:
                        "crearProgramacionHorasExtras",
                    fecha: fecha,
                    turno: turno,
                    horaInicio: horaInicio,
                    horaFinal: horaFinal,
                    cuposDisponibles:
                        Number(cupos)
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {
                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible publicar la jornada."
                );
            }


            Sistema.exito(
                respuesta.mensaje ||
                "Horas extras publicadas."
            );


            await this.abrirGestion();

        } catch (error) {

            Sistema.error(
                error.message ||
                "No fue posible publicar la jornada."
            );

        } finally {

            CargadorSistema.ocultar();

        }

    },


    async asignarLinea(
        idInscripcion,
        lineaTrabajo
    ) {

        if (!lineaTrabajo) {

            Sistema.advertencia(
                "Seleccione una línea de trabajo."
            );

            return;

        }


        CargadorSistema.mostrar(
            "Asignando colaborador",
            "Guardando la línea de trabajo."
        );


        try {

            const respuesta =
                await API.post({
                    action:
                        "asignarLineaHorasExtra",
                    idInscripcion:
                        idInscripcion,
                    lineaTrabajo:
                        lineaTrabajo
                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {
                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible guardar la asignación."
                );
            }


            Sistema.exito(
                respuesta.mensaje ||
                "Asignación guardada."
            );


            await this.abrirGestion();

        } catch (error) {

            Sistema.error(
                error.message ||
                "No fue posible guardar la asignación."
            );

        } finally {

            CargadorSistema.ocultar();

        }

    },


    construirCarga() {
        return `
            <div class="he-vacio">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <strong>
                    Cargando información...
                </strong>
            </div>
        `;
    },


    construirError(mensaje) {
        return `
            <div class="he-vacio error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <strong>
                    No fue posible cargar Horas Extras.
                </strong>
                <span>
                    ${this.escapar(mensaje || "Error desconocido")}
                </span>
            </div>
        `;
    },


    textoEstado(estado) {

        const mapa = {
            INSCRITO: "Inscrito",
            ASIGNADO: "Asignado",
            EN_TURNO: "En turno",
            COMPLETADO: "Completado",
            CANCELADO: "Cancelado",
            NO_ASISTIO: "No asistió"
        };

        return mapa[estado] || estado || "--";

    },


    formatearFecha(valor) {

        if (!valor) {
            return "--";
        }

        const partes =
            String(valor).split("-");

        if (partes.length !== 3) {
            return valor;
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;

    },


    formatearHora(valor) {

        if (!valor) {
            return "";
        }

        return String(valor).slice(0, 5);

    },


    formatearDuracion(minutos) {

        const total =
            Math.max(
                0,
                Number(minutos || 0)
            );


        if (!total) {
            return "--";
        }


        const horas =
            Math.floor(total / 60);

        const resto =
            Math.round(total % 60);


        if (!horas) {
            return `${resto} min`;
        }


        return resto
            ? `${horas} h ${resto} min`
            : `${horas} h`;

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

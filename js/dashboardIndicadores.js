// ============================================================
// DASHBOARDINDICADORES.JS
// Sistema Logístico PT - Helados BON
// ============================================================
//
// Responsabilidad:
// - Cargar el avance mensual de las metas.
// - Actualizar la tarjeta "Avance Meta del Mes".
// - Abrir el histórico de metas.
// - Filtrar el histórico en memoria.
// - Abrir y guardar justificaciones.
// - Actualizar únicamente la meta modificada, sin recargar
//   todo el dashboard ni volver a consultar el histórico.
//
// Requiere:
// - api.js
// - Sistema.js
// - Backend:
//      listarMetasDiarias
//      obtenerCausasIncumplimiento
//      guardarJustificacionMeta
//
// IMPORTANTE:
// - Este archivo no modifica Despachos ni Inspección.
// - La tarjeta de prioridades queda preparada visualmente,
//   pero su lógica se conectará más adelante.
// ============================================================


const DashboardIndicadores = {

    // ========================================================
    // ESTADO DEL MÓDULO
    // ========================================================

    metasCache: [],

    causasCache: [],

    ocupacionCache: null,

    detalleOcupacionCache: [],

    graficoOcupacionCamaras: null,

    cargandoOcupacion: false,

    filtrosMetas: {
        mes: "",
        supervisor: "TODOS",
        resultado: "TODOS",
        estadoJustificacion: "TODOS"
    },

    cargandoMetas: false,

    historicoAbierto: false,

    idMetaEnJustificacion: "",

    scrollHistorico: 0,


    // ========================================================
    // INICIALIZACIÓN
    // ========================================================

    iniciar() {

        this.prepararTarjetas();
        this.conectarEventosTarjetas();
        this.cargarIndicadorOcupacion();
        this.cargarMetaMensual();

    },


    /**
     * Adapta las tarjetas existentes sin depender únicamente
     * de cambios previos en dashboard.html.
     *
     * Si existen IDs específicos, los utiliza.
     * Si todavía no existen, usa la posición actual:
     * - segunda tarjeta: meta mensual
     * - cuarta tarjeta: prioridades
     */
    prepararTarjetas() {

        const tarjetas =
            document.querySelectorAll(".cards .card");

        let tarjetaOcupacion =
            document.getElementById("cardOcupacionCamaras");

        let tarjetaMeta =
            document.getElementById("cardMetaMensual");

        let tarjetaPrioridades =
            document.getElementById("cardPrioridadesDespacho");


        if (!tarjetaOcupacion && tarjetas.length >= 1) {

            tarjetaOcupacion = tarjetas[0];
            tarjetaOcupacion.id =
                "cardOcupacionCamaras";

        }


        if (!tarjetaMeta && tarjetas.length >= 2) {

            tarjetaMeta = tarjetas[1];
            tarjetaMeta.id = "cardMetaMensual";

        }


        if (!tarjetaPrioridades && tarjetas.length >= 4) {

            tarjetaPrioridades = tarjetas[3];
            tarjetaPrioridades.id =
                "cardPrioridadesDespacho";

        }


        if (tarjetaOcupacion) {

            tarjetaOcupacion.classList.add(
                "card-indicador",
                "card-ocupacion-camaras",
                "indicador-sin-datos"
            );

            tarjetaOcupacion.innerHTML = `

                <div class="card-indicador-icono">
                    <i class="fa-solid fa-warehouse"></i>
                </div>

                <h3>
                    Ocupación de Cámaras
                </h3>

                <h1 id="valorOcupacionCamaras">
                    --
                </h1>

                <div class="card-indicador-info">

                    <strong
                        id="detalleOcupacionCamaras"
                        class="card-indicador-detalle"
                    >
                        Cargando ocupación...
                    </strong>

                    <span
                        id="disponibleOcupacionCamaras"
                        class="card-indicador-secundario"
                    >
                        --
                    </span>

                </div>

                <button
                    type="button"
                    id="btnOcupacionCamaras"
                    class="btn-card-indicador"
                >
                    <i class="fa-solid fa-chart-area"></i>
                    Ver ocupación
                </button>

            `;

        }


        if (tarjetaMeta) {

            tarjetaMeta.classList.add(
                "card-indicador",
                "card-meta-mensual"
            );

            tarjetaMeta.innerHTML = `

							<div class="card-indicador-icono">
								<i class="fa-solid fa-chart-line"></i>
							</div>

							<h3>
								Avance Meta del Mes
							</h3>

							<h1 id="valorMetaMensual">
								--
							</h1>

							<div class="card-indicador-info">

								<strong
									id="detalleMetaMensual"
									class="card-indicador-detalle"
								>
									Cargando información...
								</strong>

								<span
									id="diasOperativosMetaMensual"
									class="card-indicador-secundario"
								>
									--
								</span>

							</div>

							<button
								type="button"
								id="btnHistoricoMetas"
								class="btn-card-indicador"
							>
								<i class="fa-solid fa-clock-rotate-left"></i>
								Ver histórico
							</button>

						`;

        }


        if (tarjetaPrioridades) {

            tarjetaPrioridades.classList.add(
                "card-indicador",
                "card-prioridades-despacho"
            );

            tarjetaPrioridades.innerHTML = `
                <div class="card-indicador-icono">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>

                <h3>Prioridades de Despacho</h3>

                <h1 id="valorPrioridadesDespacho">
                    0
                </h1>

                <div class="card-indicador-info">

					<strong class="card-indicador-detalle">
						Materiales con bajo inventario en FB
					</strong>
			
				</div>

                <button
						type="button"
						id="btnPrioridadesDespacho"
						class="btn-card-indicador"
					>
                    <i class="fa-solid fa-list-check"></i>
                    Ver prioridades
                </button>
            `;
					if (
					window.Prioridades &&
					typeof Prioridades.inicializarTarjeta ===
						"function"
				) {

					Prioridades
						.inicializarTarjeta();

				}

        }

    },


    conectarEventosTarjetas() {

        const botonOcupacion =
            document.getElementById(
                "btnOcupacionCamaras"
            );

        if (
            botonOcupacion &&
            !botonOcupacion.dataset.eventoIndicadores
        ) {

            botonOcupacion.dataset.eventoIndicadores =
                "true";

            botonOcupacion.addEventListener(
                "click",
                () => {
                    this.abrirOcupacionCamaras();
                }
            );

        }


        const botonHistorico =
            document.getElementById(
                "btnHistoricoMetas"
            );

        if (
            botonHistorico &&
            !botonHistorico.dataset.eventoIndicadores
        ) {

            botonHistorico.dataset.eventoIndicadores =
                "true";

            botonHistorico.addEventListener(
                "click",
                () => {
                    this.abrirHistoricoMetas();
                }
            );

        }


        const botonPrioridades =
            document.getElementById(
                "btnPrioridadesDespacho"
            );

        if (
            botonPrioridades &&
            !botonPrioridades.dataset.eventoIndicadores
        ) {

            botonPrioridades.dataset.eventoIndicadores =
                "true";

            botonPrioridades.addEventListener(
                "click",
                () => {

                    if (!botonPrioridades.disabled) {
                        this.abrirPrioridades();
                    }

                }
            );

        }

    },


    // ========================================================
    // OCUPACIÓN DE CÁMARAS
    // ========================================================

    async cargarIndicadorOcupacion(
        forzarConsulta = false
    ) {

        if (this.cargandoOcupacion) {
            return;
        }

        if (
            this.ocupacionCache &&
            !forzarConsulta
        ) {

            this.actualizarTarjetaOcupacion();
            return;

        }

        this.cargandoOcupacion = true;
        this.mostrarEstadoCargaTarjetaOcupacion();

        try {

            const respuesta = await API.post({
                accion:
                    "obtenerIndicadorOcupacionCamaras",
                action:
                    "obtenerIndicadorOcupacionCamaras"
            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible cargar la ocupación."
                    )
                );

            }

            this.ocupacionCache =
                respuesta.data ||
                respuesta.ocupacion ||
                respuesta;

            this.actualizarTarjetaOcupacion();

        } catch (error) {

            console.error(
                "Error al cargar la ocupación de cámaras:",
                error
            );

            this.mostrarErrorTarjetaOcupacion();

        } finally {

            this.cargandoOcupacion = false;

        }

    },


    actualizarTarjetaOcupacion() {

        const valor =
            document.getElementById(
                "valorOcupacionCamaras"
            );

        const detalle =
            document.getElementById(
                "detalleOcupacionCamaras"
            );

        const disponible =
            document.getElementById(
                "disponibleOcupacionCamaras"
            );

        const tarjeta =
            document.getElementById(
                "cardOcupacionCamaras"
            );

        if (
            !valor ||
            !detalle ||
            !disponible ||
            !tarjeta
        ) {
            return;
        }

        const datos =
            this.ocupacionCache ||
            {};

        const capacidad =
            Sistema.convertirNumero(
                datos.capacidadTotal
            );

        const ocupadas =
            Sistema.convertirNumero(
                datos.posicionesOcupadas
            );

        const libres =
            Math.max(
                0,
                Sistema.convertirNumero(
                    datos.posicionesDisponibles
                )
            );

        const porcentaje =
            capacidad > 0
                ? (
                    ocupadas /
                    capacidad
                  ) * 100
                : 0;

        valor.textContent =
            Sistema.formatearPorcentaje(
                porcentaje,
                1
            );

        detalle.textContent =
            Sistema.formatearNumero(
                ocupadas,
                0
            ) +
            " de " +
            Sistema.formatearNumero(
                capacidad,
                0
            ) +
            " posiciones ocupadas";

        disponible.textContent =
            Sistema.formatearNumero(
                libres,
                0
            ) +
            (
                libres === 1
                    ? " posición disponible"
                    : " posiciones disponibles"
            );

        tarjeta.classList.remove(
            "ocupacion-baja",
            "ocupacion-media",
            "ocupacion-alta",
            "ocupacion-critica",
            "indicador-sin-datos"
        );

        if (capacidad <= 0) {

            tarjeta.classList.add(
                "indicador-sin-datos"
            );

        } else if (porcentaje >= 90) {

            tarjeta.classList.add(
                "ocupacion-critica"
            );

        } else if (porcentaje >= 75) {

            tarjeta.classList.add(
                "ocupacion-alta"
            );

        } else if (porcentaje >= 60) {

            tarjeta.classList.add(
                "ocupacion-media"
            );

        } else {

            tarjeta.classList.add(
                "ocupacion-baja"
            );

        }

    },


    mostrarEstadoCargaTarjetaOcupacion() {

        const valor =
            document.getElementById(
                "valorOcupacionCamaras"
            );

        const detalle =
            document.getElementById(
                "detalleOcupacionCamaras"
            );

        const disponible =
            document.getElementById(
                "disponibleOcupacionCamaras"
            );

        if (valor) {
            valor.textContent = "...";
        }

        if (detalle) {
            detalle.textContent =
                "Calculando ocupación actual...";
        }

        if (disponible) {
            disponible.textContent = "";
        }

    },


    mostrarErrorTarjetaOcupacion() {

        const valor =
            document.getElementById(
                "valorOcupacionCamaras"
            );

        const detalle =
            document.getElementById(
                "detalleOcupacionCamaras"
            );

        const disponible =
            document.getElementById(
                "disponibleOcupacionCamaras"
            );

        if (valor) {
            valor.textContent = "--";
        }

        if (detalle) {
            detalle.textContent =
                "No fue posible cargar la ocupación.";
        }

        if (disponible) {
            disponible.textContent =
                "Pulse Ver ocupación para reintentar.";
        }

    },


    async abrirOcupacionCamaras() {

        Sistema.mostrarCarga(
            "Cargando ocupación",
            "Consultando el estado actual de las cámaras."
        );

        try {

            const respuesta = await API.post({
                accion:
                    "obtenerDetalleOcupacionCamaras",
                action:
                    "obtenerDetalleOcupacionCamaras"
            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible consultar la ocupación."
                    )
                );

            }

            const datos =
                respuesta.data ||
                respuesta.ocupacion ||
                respuesta;

            this.ocupacionCache =
                datos.general ||
                datos;

            this.detalleOcupacionCache =
                Array.isArray(datos.camaras)
                    ? datos.camaras
                    : [];

            this.actualizarTarjetaOcupacion();

            Sistema.abrirModal(
                "Ocupación de Cámaras",
                this.construirVistaOcupacionCamaras(),
                {
                    clase:
                        "modal-ocupacion-camaras"
                }
            );

            this.conectarEventosOcupacionCamaras();
            this.renderizarDetalleCamaras();
            await this.consultarHistoricoOcupacion(
                "SEMANA",
                "GENERAL"
            );

        } catch (error) {

            console.error(
                "Error al abrir la ocupación de cámaras:",
                error
            );

            Sistema.error(
                error.message ||
                "No fue posible abrir la ocupación."
            );

        } finally {

            Sistema.ocultarCarga();

        }

    },


    construirVistaOcupacionCamaras() {

        const datos =
            this.ocupacionCache ||
            {};

        return `

            <div class="ocupacion-camaras-modal">

                <section class="resumen-ocupacion-general">

                    <div class="ocupacion-general-principal">

                        <span>
                            Ocupación general
                        </span>

                        <strong id="modalPorcentajeOcupacion">
                            ${Sistema.formatearPorcentaje(
                                datos.porcentajeOcupacion ||
                                0,
                                1
                            )}
                        </strong>

                        <div class="barra-ocupacion-general">
                            <span
                                style="width: ${Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        Sistema.convertirNumero(
                                            datos.porcentajeOcupacion
                                        )
                                    )
                                )}%"
                            ></span>
                        </div>

                    </div>

                    <div class="metricas-ocupacion-general">

                        <div>
                            <span>Ocupadas</span>
                            <strong>
                                ${Sistema.formatearNumero(
                                    datos.posicionesOcupadas,
                                    0
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Capacidad</span>
                            <strong>
                                ${Sistema.formatearNumero(
                                    datos.capacidadTotal,
                                    0
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Disponibles</span>
                            <strong>
                                ${Sistema.formatearNumero(
                                    datos.posicionesDisponibles,
                                    0
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Cámaras activas</span>
                            <strong>
                                ${Sistema.formatearNumero(
                                    datos.camarasActivas,
                                    0
                                )}
                            </strong>
                        </div>

                    </div>

                </section>


                <section class="seccion-ocupacion-camaras">

                    <div class="encabezado-seccion-ocupacion">

                        <div>
                            <span>Estado actual</span>
                            <h3>Ocupación por cámara</h3>
                        </div>

                        <button
                            type="button"
                            id="btnActualizarOcupacionCamaras"
                            class="btn-actualizar-ocupacion"
                        >
                            <i class="fa-solid fa-rotate"></i>
                            Actualizar
                        </button>

                    </div>

                    <div
                        id="rejillaDetalleOcupacionCamaras"
                        class="rejilla-detalle-ocupacion"
                    ></div>

                </section>


                <section class="seccion-historico-ocupacion">

                    <div class="encabezado-seccion-ocupacion">

                        <div>
                            <span>Evolución</span>
                            <h3>Histórico de ocupación</h3>
                        </div>

                        <p id="textoPeriodoHistoricoOcupacion"></p>

                    </div>

                    <div class="filtros-historico-ocupacion">

                        <div>
                            <label for="filtroPeriodoOcupacion">
                                Período
                            </label>

                            <select id="filtroPeriodoOcupacion">
                                <option value="SEMANA">
                                    Semana
                                </option>
                                <option value="MES">
                                    Mes
                                </option>
                                <option value="ANO">
                                    Año
                                </option>
                            </select>
                        </div>

                        <div>
                            <label for="filtroCamaraOcupacion">
                                Vista
                            </label>

                            <select id="filtroCamaraOcupacion">

                                <option value="GENERAL">
                                    Ocupación general
                                </option>

                                ${this.detalleOcupacionCache
                                    .map(camara => `
                                        <option
                                            value="${Sistema.escaparAtributo(
                                                camara.idCamara
                                            )}"
                                        >
                                            ${Sistema.escaparHTML(
                                                camara.codigo +
                                                " · " +
                                                camara.nombre
                                            )}
                                        </option>
                                    `)
                                    .join("")}

                            </select>
                        </div>

                        <button
                            type="button"
                            id="btnConsultarHistoricoOcupacion"
                            class="btn-consultar-ocupacion"
                        >
                            <i class="fa-solid fa-magnifying-glass"></i>
                            Consultar
                        </button>

                    </div>

                    <div class="contenedor-grafico-ocupacion">
                        <canvas id="graficoHistoricoOcupacion"></canvas>
                    </div>

                    <div
                        id="sinDatosHistoricoOcupacion"
                        class="sin-datos-historico-ocupacion oculto"
                    >
                        No existen movimientos para representar
                        en el período seleccionado.
                    </div>

                </section>

            </div>

        `;

    },


    conectarEventosOcupacionCamaras() {

        const actualizar =
            document.getElementById(
                "btnActualizarOcupacionCamaras"
            );

        const consultar =
            document.getElementById(
                "btnConsultarHistoricoOcupacion"
            );

        if (actualizar) {

            actualizar.addEventListener(
                "click",
                async () => {

                    await this.actualizarModalOcupacion();

                }
            );

        }

        if (consultar) {

            consultar.addEventListener(
                "click",
                async () => {

                    const periodo =
                        document.getElementById(
                            "filtroPeriodoOcupacion"
                        );

                    const camara =
                        document.getElementById(
                            "filtroCamaraOcupacion"
                        );

                    await this.consultarHistoricoOcupacion(
                        periodo
                            ? periodo.value
                            : "SEMANA",
                        camara
                            ? camara.value
                            : "GENERAL"
                    );

                }
            );

        }

    },


    async actualizarModalOcupacion() {

        Sistema.mostrarCarga(
            "Actualizando ocupación",
            "Consultando el inventario actual."
        );

        try {

            const respuesta = await API.post({
                accion:
                    "obtenerDetalleOcupacionCamaras",
                action:
                    "obtenerDetalleOcupacionCamaras"
            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible actualizar la ocupación."
                    )
                );

            }

            const datos =
                respuesta.data ||
                respuesta.ocupacion ||
                respuesta;

            this.ocupacionCache =
                datos.general ||
                datos;

            this.detalleOcupacionCache =
                Array.isArray(datos.camaras)
                    ? datos.camaras
                    : [];

            this.actualizarTarjetaOcupacion();
            this.actualizarResumenModalOcupacion();
            this.renderizarDetalleCamaras();

        } catch (error) {

            Sistema.error(
                error.message ||
                "No fue posible actualizar la ocupación."
            );

        } finally {

            Sistema.ocultarCarga();

        }

    },


    actualizarResumenModalOcupacion() {

        const datos =
            this.ocupacionCache ||
            {};

        const porcentaje =
            document.getElementById(
                "modalPorcentajeOcupacion"
            );

        if (porcentaje) {

            porcentaje.textContent =
                Sistema.formatearPorcentaje(
                    datos.porcentajeOcupacion,
                    1
                );

        }

    },


    renderizarDetalleCamaras() {

        const contenedor =
            document.getElementById(
                "rejillaDetalleOcupacionCamaras"
            );

        if (!contenedor) {
            return;
        }

        const lista =
            Array.isArray(
                this.detalleOcupacionCache
            )
                ? this.detalleOcupacionCache
                : [];

        if (!lista.length) {

            contenedor.innerHTML = `
                <div class="estado-vacio-ocupacion">
                    No existen cámaras activas configuradas.
                </div>
            `;

            return;

        }

        contenedor.innerHTML =
            lista
                .map(camara =>
                    this.construirTarjetaOcupacionCamara(
                        camara
                    )
                )
                .join("");

    },


    construirTarjetaOcupacionCamara(
        camara
    ) {

        const porcentaje =
            Sistema.convertirNumero(
                camara.porcentajeOcupacion
            );

        let nivel = "baja";

        if (porcentaje >= 90) {
            nivel = "critica";
        } else if (porcentaje >= 75) {
            nivel = "alta";
        } else if (porcentaje >= 60) {
            nivel = "media";
        }

        return `

            <article
                class="tarjeta-ocupacion-camara nivel-${nivel}"
            >

                <header>

                    <div>
                        <span>
                            ${Sistema.escaparHTML(
                                camara.codigo ||
                                camara.idCamara
                            )}
                        </span>

                        <h4>
                            ${Sistema.escaparHTML(
                                camara.nombre ||
                                "Cámara"
                            )}
                        </h4>
                    </div>

                    <strong>
                        ${Sistema.formatearPorcentaje(
                            porcentaje,
                            1
                        )}
                    </strong>

                </header>

                <div class="barra-camara">
                    <span
                        style="width: ${Math.min(
                            100,
                            Math.max(0, porcentaje)
                        )}%"
                    ></span>
                </div>

                <div class="metricas-camara">

                    <div>
                        <span>Ocupadas</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                camara.posicionesOcupadas,
                                0
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Capacidad</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                camara.capacidad,
                                0
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Disponibles</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                camara.posicionesDisponibles,
                                0
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Materiales</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                camara.materialesDistintos,
                                0
                            )}
                        </strong>
                    </div>

                </div>

                <footer>

                    <span>
                        <i class="fa-solid fa-temperature-low"></i>
                        ${Sistema.escaparHTML(
                            camara.temperaturaObjetivo ||
                            "Sin objetivo"
                        )}
                    </span>

                    <span>
                        ${Sistema.formatearNumero(
                            camara.totalUnidades,
                            0
                        )}
                        bultos
                    </span>

                </footer>

            </article>

        `;

    },


    async consultarHistoricoOcupacion(
        periodo,
        idCamara
    ) {

        const contenedor =
            document.querySelector(
                ".contenedor-grafico-ocupacion"
            );

        if (contenedor) {
            contenedor.classList.add(
                "cargando"
            );
        }

        try {

            const respuesta = await API.post({
                accion:
                    "obtenerHistoricoOcupacionCamaras",
                action:
                    "obtenerHistoricoOcupacionCamaras",
                periodo:
                    periodo || "SEMANA",
                idCamara:
                    idCamara || "GENERAL"
            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible consultar el histórico."
                    )
                );

            }

            const datos =
                respuesta.data ||
                {};

            this.renderizarGraficoOcupacion(
                Array.isArray(datos.puntos)
                    ? datos.puntos
                    : [],
                datos
            );

        } catch (error) {

            console.error(
                "Error al consultar histórico de ocupación:",
                error
            );

            Sistema.error(
                error.message ||
                "No fue posible consultar el histórico."
            );

        } finally {

            if (contenedor) {
                contenedor.classList.remove(
                    "cargando"
                );
            }

        }

    },


    renderizarGraficoOcupacion(
        puntos,
        informacion
    ) {

        const canvas =
            document.getElementById(
                "graficoHistoricoOcupacion"
            );

        const sinDatos =
            document.getElementById(
                "sinDatosHistoricoOcupacion"
            );

        const textoPeriodo =
            document.getElementById(
                "textoPeriodoHistoricoOcupacion"
            );

        if (!canvas) {
            return;
        }

        if (this.graficoOcupacionCamaras) {

            this.graficoOcupacionCamaras.destroy();
            this.graficoOcupacionCamaras = null;

        }

        if (textoPeriodo) {

            textoPeriodo.textContent =
                informacion.fechaDesde &&
                informacion.fechaHasta
                    ? informacion.fechaDesde +
                      " al " +
                      informacion.fechaHasta
                    : "";

        }

        if (!puntos.length) {

            canvas.classList.add("oculto");

            if (sinDatos) {
                sinDatos.classList.remove(
                    "oculto"
                );
            }

            return;

        }

        canvas.classList.remove("oculto");

        if (sinDatos) {
            sinDatos.classList.add("oculto");
        }

        if (typeof Chart === "undefined") {

            console.warn(
                "Chart.js no está disponible."
            );

            return;

        }

        this.graficoOcupacionCamaras =
            new Chart(
                canvas.getContext("2d"),
                {
                    type: "line",

                    data: {
                        labels:
                            puntos.map(
                                punto => punto.etiqueta
                            ),

                        datasets: [
                            {
                                label:
                                    "Ocupación %",
                                data:
                                    puntos.map(
                                        punto =>
                                            Sistema.convertirNumero(
                                                punto.porcentaje
                                            )
                                    ),
                                borderColor:
                                    "rgba(33, 150, 243, 1)",
                                backgroundColor:
                                    "rgba(33, 150, 243, 0.13)",
                                fill: true,
                                tension: 0.28,
                                borderWidth: 2,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,

                        interaction: {
                            mode: "index",
                            intersect: false
                        },

                        plugins: {
                            legend: {
                                display: false
                            },

                            tooltip: {
                                callbacks: {
                                    afterLabel: contexto => {

                                        const punto =
                                            puntos[
                                                contexto.dataIndex
                                            ];

                                        return (
                                            Sistema.formatearNumero(
                                                punto.ocupadas,
                                                0
                                            ) +
                                            " de " +
                                            Sistema.formatearNumero(
                                                punto.capacidad,
                                                0
                                            ) +
                                            " posiciones"
                                        );

                                    }
                                }
                            }
                        },

                        scales: {
                            y: {
                                beginAtZero: true,
                                suggestedMax: 100,
                                max: 100,
                                ticks: {
                                    callback:
                                        valor => valor + "%"
                                },
                                grid: {
                                    color:
                                        "rgba(0, 0, 0, 0.06)"
                                }
                            },

                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                }
            );

    },


    // ========================================================
    // CARGA DE METAS
    // ========================================================

    async cargarMetaMensual(
        forzarConsulta = false
    ) {

        if (this.cargandoMetas) {
            return;
        }

        if (
            this.metasCache.length > 0 &&
            !forzarConsulta
        ) {

            this.actualizarTarjetaMetaMensual();
            return;

        }

        this.cargandoMetas = true;
        this.mostrarEstadoCargaTarjetaMeta();

        try {

            const mesActual =
                Sistema.obtenerMesActual();

            const respuesta = await API.post({
                accion: "listarMetasDiarias",
                mes: mesActual
            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible cargar las metas del mes."
                    )
                );

            }

            const metas =
                Array.isArray(respuesta.metas)
                    ? respuesta.metas
                    : [];

            this.metasCache = metas;

            this.filtrosMetas.mes =
                mesActual;

            this.actualizarTarjetaMetaMensual();

        } catch (error) {

            console.error(
                "Error al cargar la meta mensual:",
                error
            );

            this.mostrarErrorTarjetaMeta();

        } finally {

            this.cargandoMetas = false;

        }

    },


    actualizarTarjetaMetaMensual() {

        const valor =
            document.getElementById(
                "valorMetaMensual"
            );

        const detalle =
            document.getElementById(
                "detalleMetaMensual"
            );

        const dias =
            document.getElementById(
                "diasOperativosMetaMensual"
            );

        if (!valor || !detalle || !dias) {
            return;
        }

        const resumen =
            this.calcularResumenMetas(
                this.metasCache
            );

        valor.textContent =
            Sistema.formatearPorcentaje(
                resumen.cumplimiento,
                2
            );

        detalle.textContent =
            Sistema.formatearNumero(
                resumen.despachosRealizados,
                0
            ) +
            " / " +
            Sistema.formatearNumero(
                resumen.metaAcumulada,
                0
            ) +
            " despachos";

        dias.textContent =
            resumen.diasOperativos +
            (
                resumen.diasOperativos === 1
                    ? " día operativo"
                    : " días operativos"
            );

        const tarjeta =
            document.getElementById(
                "cardMetaMensual"
            );

        if (tarjeta) {

            tarjeta.classList.remove(
                "indicador-cumplido",
                "indicador-no-cumplido",
                "indicador-superado",
                "indicador-sin-datos"
            );

            if (resumen.diasOperativos === 0) {

                tarjeta.classList.add(
                    "indicador-sin-datos"
                );

            } else if (resumen.cumplimiento > 100) {

                tarjeta.classList.add(
                    "indicador-superado"
                );

            } else if (resumen.cumplimiento >= 100) {

                tarjeta.classList.add(
                    "indicador-cumplido"
                );

            } else {

                tarjeta.classList.add(
                    "indicador-no-cumplido"
                );

            }

        }

    },


    mostrarEstadoCargaTarjetaMeta() {

        const valor =
            document.getElementById(
                "valorMetaMensual"
            );

        const detalle =
            document.getElementById(
                "detalleMetaMensual"
            );

        const dias =
            document.getElementById(
                "diasOperativosMetaMensual"
            );

        if (valor) {
            valor.textContent = "...";
        }

        if (detalle) {
            detalle.textContent =
                "Calculando avance mensual...";
        }

        if (dias) {
            dias.textContent = "";
        }

    },


    mostrarErrorTarjetaMeta() {

        const valor =
            document.getElementById(
                "valorMetaMensual"
            );

        const detalle =
            document.getElementById(
                "detalleMetaMensual"
            );

        const dias =
            document.getElementById(
                "diasOperativosMetaMensual"
            );

        if (valor) {
            valor.textContent = "--";
        }

        if (detalle) {
            detalle.textContent =
                "No fue posible cargar el indicador.";
        }

        if (dias) {
            dias.textContent =
                "Pulse Ver histórico para reintentar.";
        }

    },


    calcularResumenMetas(metas) {

        const lista =
            Array.isArray(metas)
                ? metas
                : [];

        let metaAcumulada = 0;
        let despachosRealizados = 0;

        lista.forEach(meta => {

            metaAcumulada +=
                Sistema.convertirNumero(
                    meta.metaDespachos
                );

            despachosRealizados +=
                Sistema.convertirNumero(
                    meta.despachosRealizados
                );

        });

        const cumplimiento =
            metaAcumulada > 0
                ? (
                    despachosRealizados /
                    metaAcumulada
                ) * 100
                : 0;

        return {
            diasOperativos:
                lista.length,

            metaAcumulada:
                metaAcumulada,

            despachosRealizados:
                despachosRealizados,

            cumplimiento:
                Number(
                    cumplimiento.toFixed(2)
                )
        };

    },


    // ========================================================
    // HISTÓRICO DE METAS
    // ========================================================

    async abrirHistoricoMetas() {

        if (this.metasCache.length === 0) {

            Sistema.mostrarCarga(
                "Cargando histórico",
                "Consultando las metas del mes."
            );

            try {

                await this.cargarMetaMensual(true);

            } finally {

                Sistema.ocultarCarga();

            }

        }

        this.historicoAbierto = true;

        this.filtrosMetas.mes =
            this.filtrosMetas.mes ||
            Sistema.obtenerMesActual();

        const contenido =
            this.construirVistaHistorico();

        Sistema.abrirModal(
            "Histórico de Metas",
            contenido,
            {
                clase:
                    "modal-historico-metas"
            }
        );

        this.conectarEventosHistorico();
        this.aplicarFiltrosHistorico();

    },


    construirVistaHistorico() {

        const mes =
            this.filtrosMetas.mes ||
            Sistema.obtenerMesActual();

        return `
            <div class="historico-metas">

                <div class="historico-metas-resumen">

                    <div class="resumen-meta-item">
                        <span>Meta acumulada</span>
                        <strong id="resumenMetaAcumulada">
                            0
                        </strong>
                    </div>

                    <div class="resumen-meta-item">
                        <span>Realizados</span>
                        <strong id="resumenMetaRealizados">
                            0
                        </strong>
                    </div>

                    <div class="resumen-meta-item">
                        <span>Cumplimiento</span>
                        <strong id="resumenMetaCumplimiento">
                            0%
                        </strong>
                    </div>

                    <div class="resumen-meta-item">
                        <span>Días operativos</span>
                        <strong id="resumenMetaDias">
                            0
                        </strong>
                    </div>

                </div>


                <div class="filtros-historico-metas">

                    <div class="campo-filtro-meta">

                        <label for="filtroMesMetas">
                            Mes
                        </label>

                        <input
                            type="month"
                            id="filtroMesMetas"
                            value="${Sistema.escaparAtributo(mes)}"
                        >

                    </div>


                    <div class="campo-filtro-meta">

                        <label for="filtroSupervisorMetas">
                            Supervisor
                        </label>

                        <select id="filtroSupervisorMetas">
                            <option value="TODOS">
                                Todos
                            </option>
                        </select>

                    </div>


                    <div class="campo-filtro-meta">

                        <label for="filtroResultadoMetas">
                            Resultado
                        </label>

                        <select id="filtroResultadoMetas">

                            <option value="TODOS">
                                Todos
                            </option>

                            <option value="META CUMPLIDA">
                                Meta cumplida
                            </option>

                            <option value="META SUPERADA">
                                Meta superada
                            </option>

                            <option value="META NO CUMPLIDA">
                                Meta no cumplida
                            </option>

                        </select>

                    </div>


                    <div class="campo-filtro-meta">

                        <label for="filtroJustificacionMetas">
                            Justificación
                        </label>

                        <select id="filtroJustificacionMetas">

                            <option value="TODOS">
                                Todos
                            </option>

                            <option value="PENDIENTE">
                                Pendiente
                            </option>

                            <option value="JUSTIFICADA">
                                Justificada
                            </option>

                            <option value="NO APLICA">
                                No aplica
                            </option>

                        </select>

                    </div>


                    <div class="acciones-filtros-metas">

                        <button
                            type="button"
                            id="btnActualizarHistoricoMetas"
                            class="btn-secundario-meta"
                            title="Consultar nuevamente el servidor"
                        >
                            <i class="fa-solid fa-rotate"></i>
                            Actualizar
                        </button>

                    </div>

                </div>


                <div
                    id="contenedorListadoMetas"
                    class="contenedor-listado-metas"
                >
                </div>


                <div
                    id="panelJustificacionMeta"
                    class="panel-justificacion-meta oculto"
                    aria-hidden="true"
                >
                </div>

            </div>
        `;

    },


    conectarEventosHistorico() {

        const filtroMes =
            document.getElementById(
                "filtroMesMetas"
            );

        const filtroSupervisor =
            document.getElementById(
                "filtroSupervisorMetas"
            );

        const filtroResultado =
            document.getElementById(
                "filtroResultadoMetas"
            );

        const filtroJustificacion =
            document.getElementById(
                "filtroJustificacionMetas"
            );

        const botonActualizar =
            document.getElementById(
                "btnActualizarHistoricoMetas"
            );


        if (filtroMes) {

            filtroMes.addEventListener(
                "change",
                async event => {

                    this.filtrosMetas.mes =
                        event.target.value ||
                        Sistema.obtenerMesActual();

                    await this.recargarHistoricoMes();

                }
            );

        }


        if (filtroSupervisor) {

            filtroSupervisor.addEventListener(
                "change",
                event => {

                    this.filtrosMetas.supervisor =
                        event.target.value;

                    this.aplicarFiltrosHistorico();

                }
            );

        }


        if (filtroResultado) {

            filtroResultado.addEventListener(
                "change",
                event => {

                    this.filtrosMetas.resultado =
                        event.target.value;

                    this.aplicarFiltrosHistorico();

                }
            );

        }


        if (filtroJustificacion) {

            filtroJustificacion.addEventListener(
                "change",
                event => {

                    this.filtrosMetas.estadoJustificacion =
                        event.target.value;

                    this.aplicarFiltrosHistorico();

                }
            );

        }


        if (botonActualizar) {

            botonActualizar.addEventListener(
                "click",
                async () => {

                    await this.recargarHistoricoMes();

                }
            );

        }


        this.rellenarFiltroSupervisores();

    },


    async recargarHistoricoMes() {

        const mes =
            this.filtrosMetas.mes ||
            Sistema.obtenerMesActual();

        Sistema.mostrarCarga(
            "Actualizando histórico",
            "Consultando las metas del período seleccionado."
        );

        try {

            const respuesta = await API.post({
                accion: "listarMetasDiarias",
                mes: mes
            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible actualizar el histórico."
                    )
                );

            }

            this.metasCache =
                Array.isArray(respuesta.metas)
                    ? respuesta.metas
                    : [];

            this.rellenarFiltroSupervisores();
            this.aplicarFiltrosHistorico();

            if (
                mes ===
                Sistema.obtenerMesActual()
            ) {
                this.actualizarTarjetaMetaMensual();
            }

        } catch (error) {

            console.error(
                "Error al actualizar el histórico:",
                error
            );

            Sistema.error(
                error.message ||
                "No fue posible actualizar el histórico."
            );

        } finally {

            Sistema.ocultarCarga();

        }

    },


    rellenarFiltroSupervisores() {

        const select =
            document.getElementById(
                "filtroSupervisorMetas"
            );

        if (!select) {
            return;
        }

        const valorActual =
            this.filtrosMetas.supervisor ||
            "TODOS";

        const supervisores = [
            ...new Set(
                this.metasCache
                    .map(meta =>
                        String(
                            meta.supervisorNombre ||
                            ""
                        ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "es",
                    {
                        sensitivity: "base"
                    }
                )
        );

        select.innerHTML = `
            <option value="TODOS">
                Todos
            </option>

            ${supervisores.map(nombre => `
                <option
                    value="${Sistema.escaparAtributo(nombre)}"
                >
                    ${Sistema.escaparHTML(nombre)}
                </option>
            `).join("")}
        `;

        const existe =
            valorActual === "TODOS" ||
            supervisores.includes(
                valorActual
            );

        select.value =
            existe
                ? valorActual
                : "TODOS";

        this.filtrosMetas.supervisor =
            select.value;

    },


    aplicarFiltrosHistorico() {

        const metasFiltradas =
            this.obtenerMetasFiltradas();

        this.actualizarResumenHistorico(
            metasFiltradas
        );

        this.renderizarListadoMetas(
            metasFiltradas
        );

    },


    obtenerMetasFiltradas() {

        const supervisor =
            this.filtrosMetas.supervisor ||
            "TODOS";

        const resultado =
            this.filtrosMetas.resultado ||
            "TODOS";

        const estado =
            this.filtrosMetas.estadoJustificacion ||
            "TODOS";

        return this.metasCache.filter(meta => {

            const cumpleSupervisor =
                supervisor === "TODOS" ||
                String(
                    meta.supervisorNombre || ""
                ) === supervisor;

            const cumpleResultado =
                resultado === "TODOS" ||
                String(
                    meta.resultado || ""
                ) === resultado;

            const cumpleEstado =
                estado === "TODOS" ||
                String(
                    meta.estadoJustificacion || ""
                ) === estado;

            return (
                cumpleSupervisor &&
                cumpleResultado &&
                cumpleEstado
            );

        });

    },


    actualizarResumenHistorico(metas) {

        const resumen =
            this.calcularResumenMetas(metas);

        const elementoMeta =
            document.getElementById(
                "resumenMetaAcumulada"
            );

        const elementoRealizados =
            document.getElementById(
                "resumenMetaRealizados"
            );

        const elementoCumplimiento =
            document.getElementById(
                "resumenMetaCumplimiento"
            );

        const elementoDias =
            document.getElementById(
                "resumenMetaDias"
            );


        if (elementoMeta) {

            elementoMeta.textContent =
                Sistema.formatearNumero(
                    resumen.metaAcumulada,
                    0
                );

        }


        if (elementoRealizados) {

            elementoRealizados.textContent =
                Sistema.formatearNumero(
                    resumen.despachosRealizados,
                    0
                );

        }


        if (elementoCumplimiento) {

            elementoCumplimiento.textContent =
                Sistema.formatearPorcentaje(
                    resumen.cumplimiento,
                    2
                );

        }


        if (elementoDias) {

            elementoDias.textContent =
                resumen.diasOperativos;

        }

    },


    renderizarListadoMetas(metas) {

        const contenedor =
            document.getElementById(
                "contenedorListadoMetas"
            );

        if (!contenedor) {
            return;
        }

        if (!Array.isArray(metas) || metas.length === 0) {

            contenedor.innerHTML = `
                <div class="estado-vacio-metas">

                    <i class="fa-solid fa-chart-column"></i>

                    <h3>No hay metas para mostrar</h3>

                    <p>
                        No existen registros que coincidan con
                        los filtros seleccionados.
                    </p>

                </div>
            `;

            return;

        }

        contenedor.innerHTML =
            metas
                .map(meta =>
                    this.construirFilaMeta(meta)
                )
                .join("");

        contenedor
            .querySelectorAll(
                "[data-accion-meta]"
            )
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const idMeta =
                            boton.dataset.idMeta;

                        const accion =
                            boton.dataset.accionMeta;

                        if (
                            accion === "justificar" ||
                            accion === "editar"
                        ) {

                            this.abrirJustificacionMeta(
                                idMeta
                            );

                        } else if (
                            accion === "detalle"
                        ) {

                            this.abrirDetalleMeta(
                                idMeta
                            );

                        }

                    }
                );

            });

    },


    construirFilaMeta(meta) {

        const claseResultado =
            this.obtenerClaseResultadoMeta(
                meta.resultado
            );

        const claseJustificacion =
            this.obtenerClaseJustificacion(
                meta.estadoJustificacion
            );

        const textoBoton =
            meta.estadoJustificacion ===
                "JUSTIFICADA"
                ? "Ver / editar"
                : "Justificar";

        const iconoBoton =
            meta.estadoJustificacion ===
                "JUSTIFICADA"
                ? "fa-pen-to-square"
                : "fa-comment-dots";

        const puedeJustificar =
            meta.puedeJustificar === true ||
            String(meta.resultado) ===
                "META NO CUMPLIDA";

        return `
            <article
                id="filaMeta-${Sistema.escaparAtributo(meta.idMeta)}"
                class="fila-meta-historico"
                data-id-meta="${Sistema.escaparAtributo(meta.idMeta)}"
            >

                <div class="fila-meta-fecha">

                    <span class="meta-fecha-principal">
                        ${Sistema.escaparHTML(meta.fecha)}
                    </span>

                    <span class="meta-id">
                        ${Sistema.escaparHTML(meta.idMeta)}
                    </span>

                </div>


                <div class="fila-meta-supervisor">

                    <span>Supervisor</span>

                    <strong>
                        ${
                            Sistema.escaparHTML(
                                meta.supervisorNombre ||
                                "Sin supervisor"
                            )
                        }
                    </strong>

                </div>


                <div class="fila-meta-numeros">

                    <div>
                        <span>Meta</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                meta.metaDespachos,
                                0
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Realizados</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                meta.despachosRealizados,
                                0
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Cumplimiento</span>
                        <strong>
                            ${Sistema.formatearPorcentaje(
                                meta.cumplimientoPorcentaje,
                                2
                            )}
                        </strong>
                    </div>

                </div>


                <div class="fila-meta-estados">

                    <span class="estado-meta ${claseResultado}">
                        ${Sistema.escaparHTML(meta.resultado)}
                    </span>

                    <span class="estado-justificacion ${claseJustificacion}">
                        ${Sistema.escaparHTML(
                            this.obtenerTextoEstadoJustificacion(
                                meta.estadoJustificacion
                            )
                        )}
                    </span>

                </div>


                <div class="fila-meta-acciones">

                    ${
                        puedeJustificar
                            ? `
                                <button
                                    type="button"
                                    class="btn-accion-meta btn-justificar-meta"
                                    data-accion-meta="${
                                        meta.estadoJustificacion ===
                                            "JUSTIFICADA"
                                            ? "editar"
                                            : "justificar"
                                    }"
                                    data-id-meta="${Sistema.escaparAtributo(meta.idMeta)}"
                                >
                                    <i class="fa-solid ${iconoBoton}"></i>
                                    ${textoBoton}
                                </button>
                            `
                            : `
                                <button
                                    type="button"
                                    class="btn-accion-meta btn-detalle-meta"
                                    data-accion-meta="detalle"
                                    data-id-meta="${Sistema.escaparAtributo(meta.idMeta)}"
                                >
                                    <i class="fa-solid fa-eye"></i>
                                    Ver detalle
                                </button>
                            `
                    }

                </div>

            </article>
        `;

    },


    // ========================================================
    // JUSTIFICACIÓN
    // ========================================================

    async abrirJustificacionMeta(idMeta) {

        const meta =
            Sistema.obtenerRegistroDeCache(
                this.metasCache,
                "idMeta",
                idMeta
            );

        if (!meta) {

            Sistema.error(
                "No se encontró la meta seleccionada."
            );

            return;

        }

        this.idMetaEnJustificacion =
            idMeta;

        const contenidoModal =
            document.getElementById(
                "contenidoModal"
            );

        if (contenidoModal) {
            this.scrollHistorico =
                contenidoModal.scrollTop;
        }

        if (this.causasCache.length === 0) {

            Sistema.mostrarCarga(
                "Cargando causas",
                "Preparando el formulario de justificación."
            );

            try {

                const respuesta = await API.post({
                    accion:
                        "obtenerCausasIncumplimiento"
                });

                if (!this.respuestaExitosa(respuesta)) {

                    throw new Error(
                        this.obtenerMensajeRespuesta(
                            respuesta,
                            "No fue posible cargar las causas."
                        )
                    );

                }

                this.causasCache =
                    Array.isArray(respuesta.causas)
                        ? respuesta.causas
                        : [];

            } catch (error) {

                console.error(
                    "Error al cargar las causas:",
                    error
                );

                Sistema.error(
                    error.message ||
                    "No fue posible cargar las causas."
                );

                return;

            } finally {

                Sistema.ocultarCarga();

            }

        }

        this.mostrarPanelJustificacion(meta);

    },


    mostrarPanelJustificacion(meta) {

        const panel =
            document.getElementById(
                "panelJustificacionMeta"
            );

        if (!panel) {
            return;
        }

        const opcionesCausas =
            this.causasCache
                .map(causa => {

                    const seleccionada =
                        String(
                            meta.causaIncumplimiento ||
                            ""
                        ) === String(causa);

                    return `
                        <option
                            value="${Sistema.escaparAtributo(causa)}"
                            ${seleccionada ? "selected" : ""}
                        >
                            ${Sistema.escaparHTML(causa)}
                        </option>
                    `;

                })
                .join("");

        panel.innerHTML = `
            <div class="panel-justificacion-contenido">

                <div class="panel-justificacion-header">

                    <div>

                        <span class="panel-etiqueta">
                            Justificación de incumplimiento
                        </span>

                        <h3>
                            ${Sistema.escaparHTML(meta.fecha)}
                        </h3>

                    </div>

                    <button
                        type="button"
                        id="btnCerrarJustificacionMeta"
                        class="btn-cerrar-panel-meta"
                        aria-label="Cerrar justificación"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>


                <div class="resumen-justificacion-meta">

                    <div>
                        <span>Supervisor</span>
                        <strong>
                            ${Sistema.escaparHTML(
                                meta.supervisorNombre ||
                                "Sin supervisor"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Meta</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                meta.metaDespachos,
                                0
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Realizados</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                meta.despachosRealizados,
                                0
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Brecha</span>
                        <strong>
                            ${Sistema.formatearNumero(
                                meta.brechaMeta,
                                0
                            )}
                        </strong>
                    </div>

                </div>


                <form id="formJustificacionMeta">

                    <div class="campo-justificacion-meta">

                        <label for="causaJustificacionMeta">
                            Causa del incumplimiento
                            <span class="requerido">*</span>
                        </label>

                        <select
                            id="causaJustificacionMeta"
                            required
                        >
                            <option value="">
                                Seleccione una causa
                            </option>

                            ${opcionesCausas}

                        </select>

                    </div>


                    <div class="campo-justificacion-meta">

                        <label for="comentarioJustificacionMeta">
                            Comentario adicional
                        </label>

                        <textarea
                            id="comentarioJustificacionMeta"
                            rows="4"
                            maxlength="800"
                            placeholder="Comentario opcional. Será obligatorio solamente si selecciona OTRA."
                        >${Sistema.escaparHTML(
                            meta.comentarioIncumplimiento ||
                            ""
                        )}</textarea>

                        <div class="ayuda-campo-meta">
                            <span id="ayudaComentarioMeta">
                                Opcional
                            </span>

                            <span id="contadorComentarioMeta">
                                ${
                                    String(
                                        meta.comentarioIncumplimiento ||
                                        ""
                                    ).length
                                } / 800
                            </span>
                        </div>

                    </div>


                    ${
                        meta.registradoPorComentario
                            ? `
                                <div class="detalle-justificacion-existente">

                                    <i class="fa-solid fa-circle-info"></i>

                                    <span>
                                        Última actualización por
                                        <strong>
                                            ${Sistema.escaparHTML(
                                                meta.registradoPorComentario
                                            )}
                                        </strong>

                                        ${
                                            meta.fechaComentario
                                                ? " el " +
                                                  Sistema.escaparHTML(
                                                      meta.fechaComentario
                                                  )
                                                : ""
                                        }
                                    </span>

                                </div>
                            `
                            : ""
                    }


                    <div class="acciones-justificacion-meta">

                        <button
                            type="button"
                            id="btnCancelarJustificacionMeta"
                            class="btn-cancelar-justificacion"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            id="btnGuardarJustificacionMeta"
                            class="btn-guardar-justificacion"
                        >
                            <i class="fa-solid fa-floppy-disk"></i>
                            Guardar justificación
                        </button>

                    </div>

                </form>

            </div>
        `;

        panel.classList.remove("oculto");

        panel.setAttribute(
            "aria-hidden",
            "false"
        );

        this.conectarEventosPanelJustificacion();

    },


    conectarEventosPanelJustificacion() {

        const panel =
            document.getElementById(
                "panelJustificacionMeta"
            );

        const formulario =
            document.getElementById(
                "formJustificacionMeta"
            );

        const botonCerrar =
            document.getElementById(
                "btnCerrarJustificacionMeta"
            );

        const botonCancelar =
            document.getElementById(
                "btnCancelarJustificacionMeta"
            );

        const causa =
            document.getElementById(
                "causaJustificacionMeta"
            );

        const comentario =
            document.getElementById(
                "comentarioJustificacionMeta"
            );


        const cerrarPanel = () => {
            this.cerrarPanelJustificacion();
        };


        if (botonCerrar) {
            botonCerrar.addEventListener(
                "click",
                cerrarPanel
            );
        }


        if (botonCancelar) {
            botonCancelar.addEventListener(
                "click",
                cerrarPanel
            );
        }


        if (panel) {

            panel.addEventListener(
                "click",
                event => {

                    if (event.target === panel) {
                        cerrarPanel();
                    }

                }
            );

        }


        if (causa) {

            causa.addEventListener(
                "change",
                () => {
                    this.actualizarRequisitoComentario();
                }
            );

        }


        if (comentario) {

            comentario.addEventListener(
                "input",
                () => {

                    const contador =
                        document.getElementById(
                            "contadorComentarioMeta"
                        );

                    if (contador) {

                        contador.textContent =
                            comentario.value.length +
                            " / 800";

                    }

                }
            );

        }


        if (formulario) {

            formulario.addEventListener(
                "submit",
                event => {

                    event.preventDefault();
                    this.guardarJustificacionActual();

                }
            );

        }


        this.actualizarRequisitoComentario();

    },


    actualizarRequisitoComentario() {

        const causa =
            document.getElementById(
                "causaJustificacionMeta"
            );

        const comentario =
            document.getElementById(
                "comentarioJustificacionMeta"
            );

        const ayuda =
            document.getElementById(
                "ayudaComentarioMeta"
            );

        if (!causa || !comentario) {
            return;
        }

        const esOtra =
            String(causa.value)
                .trim()
                .toUpperCase() === "OTRA";

        comentario.required =
            esOtra;

        if (ayuda) {

            ayuda.textContent =
                esOtra
                    ? "Obligatorio para la causa OTRA"
                    : "Opcional";

            ayuda.classList.toggle(
                "campo-obligatorio",
                esOtra
            );

        }

    },


    async guardarJustificacionActual() {

        const idMeta =
            this.idMetaEnJustificacion;

        const causa =
            document.getElementById(
                "causaJustificacionMeta"
            );

        const comentario =
            document.getElementById(
                "comentarioJustificacionMeta"
            );

        const boton =
            document.getElementById(
                "btnGuardarJustificacionMeta"
            );

        if (!idMeta || !causa || !comentario) {
            return;
        }

        const valorCausa =
            String(causa.value || "").trim();

        const valorComentario =
            String(
                comentario.value || ""
            ).trim();

        if (!valorCausa) {

            Sistema.advertencia(
                "Seleccione una causa de incumplimiento."
            );

            causa.focus();
            return;

        }

        if (
            valorCausa.toUpperCase() ===
                "OTRA" &&
            !valorComentario
        ) {

            Sistema.advertencia(
                "Escriba un comentario para explicar la causa OTRA."
            );

            comentario.focus();
            return;

        }

        if (boton) {

            boton.disabled = true;

            boton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Guardando...
            `;

        }

        try {

            const respuesta = await API.post({
                accion:
                    "guardarJustificacionMeta",

                idMeta:
                    idMeta,

                causa:
                    valorCausa,

                comentario:
                    valorComentario,

                registradoPor:
                    Sistema.obtenerNombreUsuario()
            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible guardar la justificación."
                    )
                );

            }

            const metaActualizada =
                respuesta.metaActualizada;

            if (!metaActualizada) {

                throw new Error(
                    "El servidor no devolvió la meta actualizada."
                );

            }

            const actualizada =
                Sistema.actualizarRegistroEnCache(
                    this.metasCache,
                    "idMeta",
                    idMeta,
                    metaActualizada
                );

            if (!actualizada) {

                this.metasCache.unshift(
                    metaActualizada
                );

            }

            this.actualizarFilaMeta(
                metaActualizada
            );

            this.actualizarResumenHistorico(
                this.obtenerMetasFiltradas()
            );

            if (
                this.filtrosMetas.mes ===
                Sistema.obtenerMesActual()
            ) {
                this.actualizarTarjetaMetaMensual();
            }

            this.cerrarPanelJustificacion();

            Sistema.exito(
                respuesta.mensaje ||
                "La justificación fue guardada correctamente."
            );

        } catch (error) {

            console.error(
                "Error al guardar la justificación:",
                error
            );

            Sistema.error(
                error.message ||
                "No fue posible guardar la justificación."
            );

        } finally {

            if (boton) {

                boton.disabled = false;

                boton.innerHTML = `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Guardar justificación
                `;

            }

        }

    },


    actualizarFilaMeta(metaActualizada) {

        const fila =
            document.getElementById(
                "filaMeta-" +
                metaActualizada.idMeta
            );

        if (!fila) {

            /*
             * Si la meta dejó de cumplir los filtros actuales,
             * se vuelve a renderizar únicamente el listado.
             */
            this.aplicarFiltrosHistorico();
            return;

        }

        const contenedorTemporal =
            document.createElement("div");

        contenedorTemporal.innerHTML =
            this.construirFilaMeta(
                metaActualizada
            ).trim();

        const filaNueva =
            contenedorTemporal.firstElementChild;

        if (!filaNueva) {
            return;
        }

        fila.replaceWith(filaNueva);

        filaNueva
            .querySelectorAll(
                "[data-accion-meta]"
            )
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const idMeta =
                            boton.dataset.idMeta;

                        const accion =
                            boton.dataset.accionMeta;

                        if (
                            accion === "justificar" ||
                            accion === "editar"
                        ) {

                            this.abrirJustificacionMeta(
                                idMeta
                            );

                        } else {

                            this.abrirDetalleMeta(
                                idMeta
                            );

                        }

                    }
                );

            });

        /*
         * Si el filtro actual era PENDIENTE, la fila ahora
         * debe desaparecer porque pasó a JUSTIFICADA.
         */
        const metasFiltradas =
            this.obtenerMetasFiltradas();

        const sigueVisible =
            metasFiltradas.some(
                meta =>
                    String(meta.idMeta) ===
                    String(metaActualizada.idMeta)
            );

        if (!sigueVisible) {

            filaNueva.remove();

            this.renderizarListadoMetas(
                metasFiltradas
            );

        }

    },


    cerrarPanelJustificacion() {

        const panel =
            document.getElementById(
                "panelJustificacionMeta"
            );

        if (!panel) {
            return;
        }

        panel.classList.add("oculto");

        panel.setAttribute(
            "aria-hidden",
            "true"
        );

        panel.innerHTML = "";

        this.idMetaEnJustificacion = "";

        const contenidoModal =
            document.getElementById(
                "contenidoModal"
            );

        if (contenidoModal) {

            window.requestAnimationFrame(() => {

                contenidoModal.scrollTop =
                    this.scrollHistorico;

            });

        }

    },


    // ========================================================
    // DETALLE
    // ========================================================

    abrirDetalleMeta(idMeta) {

        const meta =
            Sistema.obtenerRegistroDeCache(
                this.metasCache,
                "idMeta",
                idMeta
            );

        if (!meta) {
            return;
        }

        Sistema.info(
            meta.resultado +
            " · " +
            Sistema.formatearPorcentaje(
                meta.cumplimientoPorcentaje,
                2
            )
        );

    },



    // ========================================================
    // CLASES Y TEXTOS
    // ========================================================

    obtenerClaseResultadoMeta(resultado) {

        const valor =
            String(resultado || "")
                .trim()
                .toUpperCase();

        if (valor === "META SUPERADA") {
            return "estado-meta-superada";
        }

        if (valor === "META CUMPLIDA") {
            return "estado-meta-cumplida";
        }

        return "estado-meta-no-cumplida";

    },


    obtenerClaseJustificacion(estado) {

        const valor =
            String(estado || "")
                .trim()
                .toUpperCase();

        if (valor === "JUSTIFICADA") {
            return "justificacion-completa";
        }

        if (valor === "PENDIENTE") {
            return "justificacion-pendiente";
        }

        return "justificacion-no-aplica";

    },


    obtenerTextoEstadoJustificacion(estado) {

        const valor =
            String(estado || "")
                .trim()
                .toUpperCase();

        if (valor === "PENDIENTE") {
            return "Pendiente justificación";
        }

        if (valor === "JUSTIFICADA") {
            return "Justificada";
        }

        return "No aplica";

    },


    // ========================================================
    // RESPUESTAS DE API
    // ========================================================

    respuestaExitosa(respuesta) {

        if (!respuesta) {
            return false;
        }

        /*
         * El backend actual utiliza "exito".
         * api.js utiliza "ok" solamente para errores de conexión.
         */
        if (respuesta.exito === true) {
            return true;
        }

        if (
            respuesta.ok === true &&
            respuesta.exito !== false
        ) {
            return true;
        }

        return false;

    },


    obtenerMensajeRespuesta(
        respuesta,
        predeterminado
    ) {

        if (!respuesta) {
            return predeterminado;
        }

        return (
            respuesta.mensaje ||
            respuesta.error ||
            predeterminado
        );

    }

};


// ============================================================
// INICIO AUTOMÁTICO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        DashboardIndicadores.iniciar();

    }
);


/*
 * Se expone globalmente para que otros módulos puedan
 * actualizar indicadores de manera selectiva.
 *
 * Ejemplo futuro:
 *
 * DashboardIndicadores.cargarMetaMensual(true);
 */
window.DashboardIndicadores =
    DashboardIndicadores;

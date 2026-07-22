// ============================================================
// DASHBOARDINDICADORESGRAFICOS.JS
// Extensión del Histórico de Metas
// ============================================================
//
// Responsabilidad:
// - Añadir consulta por rango de fechas.
// - Añadir accesos rápidos de período.
// - Mostrar un gráfico diario Meta vs. Realizados.
// - Mantener filtros, justificaciones y actualización parcial.
//
// Requiere cargarse DESPUÉS de:
// - Chart.js
// - dashboardIndicadores.js
// ============================================================

(function () {

    if (
        typeof DashboardIndicadores === "undefined" ||
        typeof Sistema === "undefined"
    ) {
        console.error(
            "DashboardIndicadoresGraficos requiere " +
            "DashboardIndicadores y Sistema."
        );
        return;
    }


    // ========================================================
    // ESTADO ADICIONAL
    // ========================================================

    DashboardIndicadores.graficoMetasDiarias = null;

    DashboardIndicadores.filtrosMetas.fechaDesde = "";
    DashboardIndicadores.filtrosMetas.fechaHasta = "";


    // ========================================================
    // APERTURA DEL HISTÓRICO
    // ========================================================

    DashboardIndicadores.abrirHistoricoMetas = async function () {

        const rango = this.obtenerRangoMesActual();

        if (!this.filtrosMetas.fechaDesde) {
            this.filtrosMetas.fechaDesde = rango.fechaDesde;
        }

        if (!this.filtrosMetas.fechaHasta) {
            this.filtrosMetas.fechaHasta = rango.fechaHasta;
        }

        this.historicoAbierto = true;

        Sistema.mostrarCarga(
            "Cargando histórico",
            "Consultando el período seleccionado."
        );

        try {

            await this.cargarMetasPorRango(
                this.filtrosMetas.fechaDesde,
                this.filtrosMetas.fechaHasta
            );

            Sistema.abrirModal(
                "Histórico de Metas",
                this.construirVistaHistoricoRango(),
                {
                    clase: "modal-historico-metas"
                }
            );

            this.conectarEventosHistoricoRango();
            this.rellenarFiltroSupervisores();
            this.aplicarFiltrosHistorico();

        } catch (error) {

            console.error(
                "Error al abrir el histórico de metas:",
                error
            );

            Sistema.error(
                error.message ||
                "No fue posible abrir el histórico."
            );

        } finally {

            Sistema.ocultarCarga();
        }
    };


    // ========================================================
    // VISTA
    // ========================================================

    DashboardIndicadores.construirVistaHistoricoRango = function () {

        return `
            <div class="historico-metas">

                <div class="historico-metas-resumen">

                    <div class="resumen-meta-item">
                        <span>Meta acumulada</span>
                        <strong id="resumenMetaAcumulada">0</strong>
                    </div>

                    <div class="resumen-meta-item">
                        <span>Realizados</span>
                        <strong id="resumenMetaRealizados">0</strong>
                    </div>

                    <div class="resumen-meta-item">
                        <span>Cumplimiento</span>
                        <strong id="resumenMetaCumplimiento">0%</strong>
                    </div>

                    <div class="resumen-meta-item">
                        <span>Días operativos</span>
                        <strong id="resumenMetaDias">0</strong>
                    </div>

                </div>


                <div class="accesos-rapidos-periodo">

                    <span>Períodos rápidos:</span>

                    <button
                        type="button"
                        data-periodo-rapido="SEMANA"
                    >
                        Esta semana
                    </button>

                    <button
                        type="button"
                        data-periodo-rapido="MES"
                    >
                        Este mes
                    </button>

                    <button
                        type="button"
                        data-periodo-rapido="MES_ANTERIOR"
                    >
                        Mes anterior
                    </button>

                    <button
                        type="button"
                        data-periodo-rapido="30_DIAS"
                    >
                        Últimos 30 días
                    </button>

                </div>


                <div class="filtros-historico-metas filtros-rango-metas">

                    <div class="campo-filtro-meta">

                        <label for="filtroFechaDesdeMetas">
                            Fecha desde
                        </label>

                        <input
                            type="date"
                            id="filtroFechaDesdeMetas"
                            value="${Sistema.escaparAtributo(
                                this.filtrosMetas.fechaDesde
                            )}"
                        >

                    </div>


                    <div class="campo-filtro-meta">

                        <label for="filtroFechaHastaMetas">
                            Fecha hasta
                        </label>

                        <input
                            type="date"
                            id="filtroFechaHastaMetas"
                            value="${Sistema.escaparAtributo(
                                this.filtrosMetas.fechaHasta
                            )}"
                        >

                    </div>


                    <div class="campo-filtro-meta">

                        <label for="filtroSupervisorMetas">
                            Supervisor
                        </label>

                        <select id="filtroSupervisorMetas">
                            <option value="TODOS">Todos</option>
                        </select>

                    </div>


                    <div class="campo-filtro-meta">

                        <label for="filtroResultadoMetas">
                            Resultado
                        </label>

                        <select id="filtroResultadoMetas">
                            <option value="TODOS">Todos</option>
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
                            <option value="TODOS">Todos</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="JUSTIFICADA">Justificada</option>
                            <option value="NO APLICA">No aplica</option>
                        </select>

                    </div>


                    <div class="acciones-filtros-metas">

                        <button
                            type="button"
                            id="btnConsultarRangoMetas"
                            class="btn-consultar-rango-meta"
                        >
                            <i class="fa-solid fa-magnifying-glass"></i>
                            Consultar
                        </button>

                        <button
                            type="button"
                            id="btnActualizarHistoricoMetas"
                            class="btn-secundario-meta"
                            title="Consultar nuevamente el servidor"
                        >
                            <i class="fa-solid fa-rotate"></i>
                            Actualizar
                        </button>

                        <button
                            type="button"
                            id="btnGenerarPDFHistoricoMetas"
                            class="btn-pdf-historico-metas"
                            title="Generar PDF temporal con la vista filtrada"
                        >
                            <i class="fa-solid fa-file-pdf"></i>
                            Generar PDF
                        </button>

                    </div>

                </div>


                <section class="panel-grafico-metas">

                    <div class="panel-grafico-metas-header">

                        <div>
                            <span>Evolución diaria</span>
                            <h3>Meta vs. despachos realizados</h3>
                        </div>

                        <p id="textoPeriodoGraficoMetas"></p>

                    </div>

                    <div class="contenedor-canvas-metas">
                        <canvas id="graficoMetasDiarias"></canvas>
                    </div>

                    <div
                        id="sinDatosGraficoMetas"
                        class="sin-datos-grafico-metas oculto"
                    >
                        No hay datos para representar en el período.
                    </div>

                </section>


                <div
                    id="contenedorListadoMetas"
                    class="contenedor-listado-metas"
                ></div>


                <div
                    id="panelJustificacionMeta"
                    class="panel-justificacion-meta oculto"
                    aria-hidden="true"
                ></div>

            </div>
        `;
    };


    // ========================================================
    // EVENTOS
    // ========================================================

    DashboardIndicadores.conectarEventosHistoricoRango = function () {

        const fechaDesde =
            document.getElementById("filtroFechaDesdeMetas");

        const fechaHasta =
            document.getElementById("filtroFechaHastaMetas");

        const filtroSupervisor =
            document.getElementById("filtroSupervisorMetas");

        const filtroResultado =
            document.getElementById("filtroResultadoMetas");

        const filtroJustificacion =
            document.getElementById("filtroJustificacionMetas");

        const botonConsultar =
            document.getElementById("btnConsultarRangoMetas");

        const botonActualizar =
            document.getElementById("btnActualizarHistoricoMetas");

        const botonGenerarPDF =
            document.getElementById("btnGenerarPDFHistoricoMetas");


        const consultar = async () => {

            const desde = fechaDesde ? fechaDesde.value : "";
            const hasta = fechaHasta ? fechaHasta.value : "";

            await this.consultarNuevoRango(desde, hasta);
        };


        if (botonConsultar) {
            botonConsultar.addEventListener("click", consultar);
        }

        if (botonActualizar) {
            botonActualizar.addEventListener("click", consultar);
        }


        if (botonGenerarPDF) {
            botonGenerarPDF.addEventListener(
                "click",
                () => {
                    this.generarPDFHistoricoMetas();
                }
            );
        }

        if (filtroSupervisor) {
            filtroSupervisor.addEventListener(
                "change",
                event => {
                    this.filtrosMetas.supervisor = event.target.value;
                    this.aplicarFiltrosHistorico();
                }
            );
        }

        if (filtroResultado) {
            filtroResultado.addEventListener(
                "change",
                event => {
                    this.filtrosMetas.resultado = event.target.value;
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

        document
            .querySelectorAll("[data-periodo-rapido]")
            .forEach(boton => {

                boton.addEventListener("click", async () => {

                    const rango = this.obtenerRangoRapido(
                        boton.dataset.periodoRapido
                    );

                    if (fechaDesde) {
                        fechaDesde.value = rango.fechaDesde;
                    }

                    if (fechaHasta) {
                        fechaHasta.value = rango.fechaHasta;
                    }

                    await this.consultarNuevoRango(
                        rango.fechaDesde,
                        rango.fechaHasta
                    );
                });
            });
    };



    // ========================================================
    // CONSULTA AL BACKEND
    // ========================================================

    DashboardIndicadores.consultarNuevoRango = async function (
        fechaDesde,
        fechaHasta
    ) {

        if (!fechaDesde || !fechaHasta) {
            Sistema.advertencia(
                "Seleccione la Fecha Desde y la Fecha Hasta."
            );
            return;
        }

        if (fechaDesde > fechaHasta) {
            Sistema.advertencia(
                "La Fecha Desde no puede ser mayor que la Fecha Hasta."
            );
            return;
        }

        Sistema.mostrarCarga(
            "Consultando período",
            "Actualizando el histórico y el gráfico."
        );

        try {

            await this.cargarMetasPorRango(
                fechaDesde,
                fechaHasta
            );

            this.rellenarFiltroSupervisores();
            this.aplicarFiltrosHistorico();

        } catch (error) {

            console.error(
                "Error al consultar el rango de metas:",
                error
            );

            Sistema.error(
                error.message ||
                "No fue posible consultar el período."
            );

        } finally {

            Sistema.ocultarCarga();
        }
    };


    DashboardIndicadores.cargarMetasPorRango = async function (
        fechaDesde,
        fechaHasta
    ) {

        const respuesta = await API.post({
            accion: "listarMetasDiarias",
            fechaDesde: fechaDesde,
            fechaHasta: fechaHasta
        });

        if (!this.respuestaExitosa(respuesta)) {
            throw new Error(
                this.obtenerMensajeRespuesta(
                    respuesta,
                    "No fue posible cargar el histórico."
                )
            );
        }

        this.metasCache =
            Array.isArray(respuesta.metas)
                ? respuesta.metas
                : [];

        this.filtrosMetas.fechaDesde = fechaDesde;
        this.filtrosMetas.fechaHasta = fechaHasta;

        return respuesta;
    };


    // ========================================================
    // FILTROS + GRÁFICO
    // ========================================================

    const aplicarFiltrosOriginal =
        DashboardIndicadores.aplicarFiltrosHistorico.bind(
            DashboardIndicadores
        );

    DashboardIndicadores.aplicarFiltrosHistorico = function () {

        aplicarFiltrosOriginal();

        const metasFiltradas =
            this.obtenerMetasFiltradas();

        this.renderizarGraficoMetasDiarias(
            metasFiltradas
        );

        this.actualizarTextoPeriodoGrafico();
    };


    DashboardIndicadores.renderizarGraficoMetasDiarias = function (
        metas
    ) {

        const canvas =
            document.getElementById("graficoMetasDiarias");

        const sinDatos =
            document.getElementById("sinDatosGraficoMetas");

        if (!canvas) {
            return;
        }

        const lista = Array.isArray(metas)
            ? [...metas]
            : [];

        lista.sort((a, b) =>
            String(a.fechaISO).localeCompare(
                String(b.fechaISO)
            )
        );

        if (this.graficoMetasDiarias) {
            this.graficoMetasDiarias.destroy();
            this.graficoMetasDiarias = null;
        }

        if (lista.length === 0) {
            canvas.classList.add("oculto");

            if (sinDatos) {
                sinDatos.classList.remove("oculto");
            }

            return;
        }

        canvas.classList.remove("oculto");

        if (sinDatos) {
            sinDatos.classList.add("oculto");
        }

        if (typeof Chart === "undefined") {
            console.warn(
                "Chart.js no está disponible. " +
                "El histórico seguirá funcionando sin gráfico."
            );
            return;
        }

        const etiquetas = lista.map(meta =>
            this.formatearFechaCortaGrafico(meta.fechaISO)
        );

        const metasProgramadas = lista.map(meta =>
            Sistema.convertirNumero(meta.metaDespachos)
        );

        const realizados = lista.map(meta =>
            Sistema.convertirNumero(meta.despachosRealizados)
        );

        this.graficoMetasDiarias = new Chart(
            canvas.getContext("2d"),
            {
                type: "bar",

                data: {
                    labels: etiquetas,

                    datasets: [
                        {
                            label: "Meta",
                            data: metasProgramadas,
                            backgroundColor: "rgba(111, 117, 123, 0.30)",
                            borderColor: "rgba(111, 117, 123, 0.85)",
                            borderWidth: 1,
                            borderRadius: 6,
                            maxBarThickness: 34
                        },
                        {
                            label: "Realizados",
                            data: realizados,
                            backgroundColor: "rgba(215, 25, 32, 0.72)",
                            borderColor: "rgba(215, 25, 32, 1)",
                            borderWidth: 1,
                            borderRadius: 6,
                            maxBarThickness: 34
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
                            position: "bottom",
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8,
                                font: {
                                    family: "Poppins",
                                    size: 11
                                }
                            }
                        },

                        tooltip: {
                            callbacks: {
                                footer: elementos => {
                                    const indice =
                                        elementos[0].dataIndex;

                                    const meta = lista[indice];

                                    return (
                                        "Cumplimiento: " +
                                        Sistema.formatearPorcentaje(
                                            meta.cumplimientoPorcentaje,
                                            2
                                        )
                                    );
                                }
                            }
                        }
                    },

                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    family: "Poppins",
                                    size: 10
                                }
                            }
                        },

                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0,
                                font: {
                                    family: "Poppins",
                                    size: 10
                                }
                            },
                            grid: {
                                color: "rgba(0, 0, 0, 0.06)"
                            }
                        }
                    }
                }
            }
        );
    };


    DashboardIndicadores.actualizarTextoPeriodoGrafico = function () {

        const elemento =
            document.getElementById("textoPeriodoGraficoMetas");

        if (!elemento) {
            return;
        }

        elemento.textContent =
            this.formatearFechaVisual(
                this.filtrosMetas.fechaDesde
            ) +
            " al " +
            this.formatearFechaVisual(
                this.filtrosMetas.fechaHasta
            );
    };


    // ========================================================
    // RANGOS RÁPIDOS
    // ========================================================

    DashboardIndicadores.obtenerRangoMesActual = function () {

        const hoy = new Date();

        return {
            fechaDesde: this.formatearFechaInput(
                new Date(
                    hoy.getFullYear(),
                    hoy.getMonth(),
                    1
                )
            ),
            fechaHasta: this.formatearFechaInput(hoy)
        };
    };


    DashboardIndicadores.obtenerRangoRapido = function (tipo) {

        const hoy = new Date();
        let desde;
        let hasta = new Date(hoy);

        switch (tipo) {

            case "SEMANA": {

                const dia = hoy.getDay();
                const diferencia = dia === 0 ? 6 : dia - 1;

                desde = new Date(hoy);
                desde.setDate(hoy.getDate() - diferencia);
                break;
            }

            case "MES_ANTERIOR": {

                desde = new Date(
                    hoy.getFullYear(),
                    hoy.getMonth() - 1,
                    1
                );

                hasta = new Date(
                    hoy.getFullYear(),
                    hoy.getMonth(),
                    0
                );
                break;
            }

            case "30_DIAS": {

                desde = new Date(hoy);
                desde.setDate(hoy.getDate() - 29);
                break;
            }

            case "MES":
            default: {

                desde = new Date(
                    hoy.getFullYear(),
                    hoy.getMonth(),
                    1
                );
                break;
            }
        }

        return {
            fechaDesde: this.formatearFechaInput(desde),
            fechaHasta: this.formatearFechaInput(hasta)
        };
    };


    // ========================================================
    // FECHAS
    // ========================================================

    DashboardIndicadores.formatearFechaInput = function (fecha) {

        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const dia = String(fecha.getDate()).padStart(2, "0");

        return `${anio}-${mes}-${dia}`;
    };


    DashboardIndicadores.formatearFechaVisual = function (valor) {

        if (!valor) {
            return "";
        }

        const partes = String(valor).split("-");

        if (partes.length !== 3) {
            return valor;
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };


    DashboardIndicadores.formatearFechaCortaGrafico = function (valor) {

        if (!valor) {
            return "";
        }

        const partes = String(valor).split("-");

        return partes.length === 3
            ? `${partes[2]}/${partes[1]}`
            : valor;
    };


    // ========================================================
    // PDF TEMPORAL DEL HISTÓRICO
    // ========================================================

    DashboardIndicadores.generarPDFHistoricoMetas = async function () {

        const metasFiltradas =
            this.obtenerMetasFiltradas();

        if (metasFiltradas.length === 0) {

            Sistema.advertencia(
                "No existen registros visibles para generar el PDF."
            );

            return;
        }

        const boton =
            document.getElementById(
                "btnGenerarPDFHistoricoMetas"
            );

        const resumen =
            this.calcularResumenMetas(
                metasFiltradas
            );

        let graficoBase64 = "";

        try {

            if (
                this.graficoMetasDiarias &&
                typeof this.graficoMetasDiarias.toBase64Image ===
                    "function"
            ) {

                graficoBase64 =
                    this.graficoMetasDiarias
                        .toBase64Image(
                            "image/png",
                            1
                        );

            } else {

                const canvas =
                    document.getElementById(
                        "graficoMetasDiarias"
                    );

                if (
                    canvas &&
                    typeof canvas.toDataURL ===
                        "function"
                ) {
                    graficoBase64 =
                        canvas.toDataURL(
                            "image/png",
                            1
                        );
                }
            }

        } catch (errorGrafico) {

            console.warn(
                "No fue posible capturar el gráfico para el PDF:",
                errorGrafico
            );

        }

        if (boton) {

            boton.disabled = true;

            boton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Generando...
            `;
        }

        Sistema.mostrarCarga(
            "Generando informe",
            "Preparando el PDF temporal con los datos y el gráfico seleccionados."
        );

        try {

            const respuesta = await API.post({

                accion:
                    "generarPDFHistoricoMetas",

                fechaDesde:
                    this.filtrosMetas.fechaDesde,

                fechaHasta:
                    this.filtrosMetas.fechaHasta,

                supervisor:
                    this.filtrosMetas.supervisor ||
                    "TODOS",

                resultado:
                    this.filtrosMetas.resultado ||
                    "TODOS",

                estadoJustificacion:
                    this.filtrosMetas.estadoJustificacion ||
                    "TODOS",

                resumen: {
                    metaAcumulada:
                        resumen.metaAcumulada,

                    despachosRealizados:
                        resumen.despachosRealizados,

                    cumplimientoPorcentaje:
                        resumen.cumplimiento,

                    diasOperativos:
                        resumen.diasOperativos
                },

                metas:
                    metasFiltradas,

                graficoBase64:
                    graficoBase64,

                generadoPor:
                    Sistema.obtenerNombreUsuario()

            });

            if (!this.respuestaExitosa(respuesta)) {

                throw new Error(
                    this.obtenerMensajeRespuesta(
                        respuesta,
                        "No fue posible generar el PDF."
                    )
                );
            }

            if (!respuesta.base64) {
                throw new Error(
                    "El servidor no devolvió el contenido del PDF."
                );
            }

            this.abrirPDFBase64(
                respuesta.base64,
                respuesta.nombreArchivo ||
                "Historico_Metas.pdf"
            );

            Sistema.exito(
                respuesta.mensaje ||
                "Informe generado correctamente."
            );

        } catch (error) {

            console.error(
                "Error al generar el PDF del histórico:",
                error
            );

            Sistema.error(
                error.message ||
                "No fue posible generar el PDF."
            );

        } finally {

            Sistema.ocultarCarga();

            if (boton) {

                boton.disabled = false;

                boton.innerHTML = `
                    <i class="fa-solid fa-file-pdf"></i>
                    Generar PDF
                `;
            }
        }
    };


    DashboardIndicadores.abrirPDFBase64 = function (
        base64,
        nombreArchivo
    ) {

        const binario =
            window.atob(base64);

        const bytes =
            new Uint8Array(
                binario.length
            );

        for (
            let i = 0;
            i < binario.length;
            i++
        ) {
            bytes[i] =
                binario.charCodeAt(i);
        }

        const blob =
            new Blob(
                [bytes],
                {
                    type: "application/pdf"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const ventana =
            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );

        if (!ventana) {

            const enlace =
                document.createElement("a");

            enlace.href = url;
            enlace.download =
                nombreArchivo ||
                "Historico_Metas.pdf";

            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
        }

        window.setTimeout(
            () => {
                URL.revokeObjectURL(url);
            },
            120000
        );
    };

})();

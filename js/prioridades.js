/* ============================================================
   CENTRO DE PRIORIDADES FB
   Sistema Logístico PT - Helados BON
   ============================================================ */

window.Prioridades = {

    estado: {

        limite:
            10,

        desplazamiento:
            0,

        total:
            0,

        hayMas:
            false,

        cargando:
            false,

        registros:
            [],

        resumenActual:
            {},

        historico:
            {},

        opcionesUM:
            [],

        periodo:
            "mes",

        filtros: {

            busqueda:
                "",

            prioridad:
                "",

            reposicion:
                "",

            um:
                "",

            orden:
                "prioridad"

        },

        tarjetaExpandida:
            ""

    },


    inicializarTarjeta() {

        const boton =
            document.getElementById(
                "btnPrioridadesDespacho"
            );


        if (boton) {

            boton.disabled =
                false;


            boton.removeAttribute(
                "title"
            );


            boton.onclick =
                async function() {

                    await Prioridades
                        .abrirCentro();

                };

        }


        Prioridades
            .cargarIndicadorTarjeta();

    },


    async cargarIndicadorTarjeta() {

        const valor =
            document.getElementById(
                "valorPrioridadesDespacho"
            );


        if (!valor) {
            return;
        }


        valor.textContent =
            "...";


        try {

            const respuesta =
                await API.post({

                    action:
                        "obtenerPrioridadesDespacho",

                    limite:
                        1,

                    desplazamiento:
                        0,

                    busqueda:
                        "",

                    prioridad:
                        "",

                    reposicion:
                        "",

                    um:
                        "",

                    orden:
                        "prioridad"

                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible consultar las prioridades."
                );

            }


            valor.textContent =
                Number(
                    respuesta.data
                        ?.totalPrioridades || 0
                ).toLocaleString(
                    "es-DO"
                );


        } catch (error) {

            console.error(
                "Error cargando indicador de prioridades:",
                error
            );


            valor.textContent =
                "—";

        }

    },


    async abrirCentro() {

        const modal =
            document.getElementById(
                "modalSistema"
            );


        const titulo =
            document.getElementById(
                "tituloModal"
            );


        const contenido =
            document.getElementById(
                "contenidoModal"
            );


        if (
            !modal ||
            !titulo ||
            !contenido
        ) {

            return;

        }


        Prioridades
            .reiniciarEstado();


        titulo.textContent =
            "Centro de Prioridades FB";


        contenido.classList.remove(
            "modo-visor-conduce",
            "modo-centro-despachos"
        );


        contenido.classList.add(
            "modo-centro-prioridades"
        );


        modal.classList.remove(
            "oculto"
        );


        Prioridades
            .renderizarEstructura();


        Prioridades
            .configurarEventos();


        CargadorSistema.mostrar(
            "Consultando prioridades",
            "Estamos preparando la situación actual y el cumplimiento histórico."
        );


        try {

            await Promise.all([

                Prioridades
                    .cargarPrioridades({
                        reiniciar:
                            true,

                        mostrarCargador:
                            false
                    }),

                Prioridades
                    .cargarResumenHistorico({
                        mostrarCargador:
                            false
                    })

            ]);


        } catch (error) {

            console.error(
                "Error abriendo centro de prioridades:",
                error
            );


            Prioridades
                .notificar(
                    error.message ||
                    "No fue posible abrir el Centro de Prioridades.",
                    "error"
                );


        } finally {

            CargadorSistema.ocultar();

        }

    },


    reiniciarEstado() {

        Prioridades.estado = {

            limite:
                10,

            desplazamiento:
                0,

            total:
                0,

            hayMas:
                false,

            cargando:
                false,

            registros:
                [],

            resumenActual:
                {},

            historico:
                {},

            opcionesUM:
                [],

            periodo:
                "mes",

            filtros: {

                busqueda:
                    "",

                prioridad:
                    "",

                reposicion:
                    "",

                um:
                    "",

                orden:
                    "prioridad"

            },

            tarjetaExpandida:
                ""

        };

    },


    renderizarEstructura() {

        const contenido =
            document.getElementById(
                "contenidoModal"
            );


        if (!contenido) {
            return;
        }


        contenido.innerHTML = `

            <div class="centro-prioridades">

                <section
                    class="cumplimiento-prioridades"
                    id="cumplimientoPrioridades"
                >

                    <div class="estado-carga-prioridades">
                        Cargando cumplimiento histórico...
                    </div>

                </section>


                <section
                    class="resumen-actual-prioridades"
                    id="resumenActualPrioridades"
                >

                    <article>
                        <span>Prioridades</span>
                        <strong>--</strong>
                    </article>

                    <article>
                        <span>Reposición</span>
                        <strong>--</strong>
                    </article>

                    <article>
                        <span>Pendiente QA</span>
                        <strong>--</strong>
                    </article>

                    <article>
                        <span>Sin reposición</span>
                        <strong>--</strong>
                    </article>

                </section>


                <section class="filtros-prioridades">

                    <div class="filtro-prioridad busqueda">

                        <label for="buscarPrioridad">
                            Buscar
                        </label>

                        <div class="entrada-busqueda-prioridad">

                            <i class="fa-solid fa-magnifying-glass"></i>

                            <input
                                type="search"
                                id="buscarPrioridad"
                                placeholder="Material o descripción"
                                autocomplete="off"
                            >

                        </div>

                    </div>


                    <div class="filtro-prioridad">

                        <label for="filtroEstadoPrioridad">
                            Estado FB
                        </label>

                        <select id="filtroEstadoPrioridad">

                            <option value="">
                                Todos
                            </option>

                            <option value="Agotado">
                                Agotado
                            </option>

                            <option value="Crítico">
                                Crítico
                            </option>

                            <option value="Bajo">
                                Bajo
                            </option>

                        </select>

                    </div>


                    <div class="filtro-prioridad">

                        <label for="filtroReposicionPrioridad">
                            Reposición
                        </label>

                        <select id="filtroReposicionPrioridad">

                            <option value="">
                                Todas
                            </option>

                            <option value="Reposición inmediata">
                                Inmediata
                            </option>

                            <option value="Reposición parcial">
                                Parcial
                            </option>

                            <option value="Pendiente liberación QA">
                                Pendiente QA
                            </option>

                            <option value="Sin reposición">
                                Sin reposición
                            </option>

                        </select>

                    </div>


                    <div class="filtro-prioridad">

                        <label for="filtroUmPrioridad">
                            UM
                        </label>

                        <select id="filtroUmPrioridad">

                            <option value="">
                                Todas
                            </option>

                        </select>

                    </div>


                    <div class="filtro-prioridad">

                        <label for="ordenPrioridad">
                            Ordenar
                        </label>

                        <select id="ordenPrioridad">

                            <option value="prioridad">
                                Prioridad operativa
                            </option>

                            <option value="dias">
                                Menor cobertura
                            </option>

                            <option value="stock_hb">
                                Mayor stock HB
                            </option>

                            <option value="stock_fb">
                                Menor stock FB
                            </option>

                            <option value="material">
                                Material
                            </option>

                            <option value="descripcion">
                                Descripción
                            </option>

                        </select>

                    </div>


                    <button
                        type="button"
                        id="btnLimpiarPrioridades"
                        class="btn-limpiar-prioridades"
                    >
                        <i class="fa-solid fa-filter-circle-xmark"></i>
                        Limpiar
                    </button>

                </section>


                <div class="barra-listado-prioridades">

                    <span id="contadorPrioridades">
                        Mostrando 0 de 0 materiales
                    </span>

                    <button
                        type="button"
                        id="btnCargarMasPrioridades"
                        class="btn-cargar-prioridades"
                        hidden
                    >
                        <i class="fa-solid fa-plus"></i>
                        Cargar 10 más
                    </button>

                </div>


                <section
                    class="lista-prioridades"
                    id="listaPrioridades"
                >

                    <div class="estado-carga-prioridades">
                        Cargando materiales...
                    </div>

                </section>


                <footer class="acciones-centro-prioridades">

                    <button
                        type="button"
                        id="btnCerrarCentroPrioridades"
                        class="btn-secundario"
                    >
                        Cerrar
                    </button>

                </footer>

            </div>
        `;

    },


    async cargarPrioridades(
        opciones = {}
    ) {

        const reiniciar =
            opciones.reiniciar === true;


        const mostrarCargador =
            opciones.mostrarCargador !==
            false;


        const estado =
            Prioridades.estado;


        if (estado.cargando) {
            return;
        }


        if (reiniciar) {

            estado.desplazamiento =
                0;

            estado.total =
                0;

            estado.hayMas =
                false;

            estado.registros =
                [];

            estado.tarjetaExpandida =
                "";

        }


        estado.cargando =
            true;


        if (mostrarCargador) {

            CargadorSistema.mostrar(
                reiniciar
                    ? "Consultando prioridades"
                    : "Cargando más materiales",
                "Estamos actualizando el listado operativo."
            );

        }


        try {

            const respuesta =
                await API.post({

                    action:
                        "obtenerPrioridadesDespacho",

                    limite:
                        estado.limite,

                    desplazamiento:
                        estado.desplazamiento,

                    busqueda:
                        estado.filtros.busqueda,

                    prioridad:
                        estado.filtros.prioridad,

                    reposicion:
                        estado.filtros.reposicion,

                    um:
                        estado.filtros.um,

                    orden:
                        estado.filtros.orden

                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible cargar las prioridades."
                );

            }


            const datos =
                respuesta.data || {};


            const nuevos =
                Array.isArray(
                    datos.registros
                )
                    ? datos.registros
                    : [];


            if (reiniciar) {

                estado.registros =
                    nuevos;

            } else {

                estado.registros.push(
                    ...nuevos
                );

            }


            estado.total =
                Number(
                    datos.total || 0
                );


            estado.desplazamiento =
                Number(
                    datos.siguienteDesplazamiento ||
                    estado.registros.length
                );


            estado.hayMas =
                datos.hayMas === true;


            estado.resumenActual =
                datos.resumen || {};


            estado.opcionesUM =
                Array.isArray(
                    datos.opcionesUM
                )
                    ? datos.opcionesUM
                    : [];


            Prioridades
                .renderizarResumenActual();


            Prioridades
                .actualizarOpcionesUM();


            Prioridades
                .renderizarLista();


            Prioridades
                .actualizarPaginacion();


            Prioridades
                .actualizarTarjetaDashboard();


        } finally {

            estado.cargando =
                false;


            Prioridades
                .actualizarPaginacion();


            if (mostrarCargador) {

                CargadorSistema.ocultar();

            }

        }

    },


    async cargarResumenHistorico(
        opciones = {}
    ) {

        const mostrarCargador =
            opciones.mostrarCargador !==
            false;


        const periodo =
            Prioridades.estado.periodo;


        const fechaDesde =
            document.getElementById(
                "fechaDesdePrioridades"
            )?.value || "";


        const fechaHasta =
            document.getElementById(
                "fechaHastaPrioridades"
            )?.value || "";


        if (mostrarCargador) {

            CargadorSistema.mostrar(
                "Consultando cumplimiento",
                "Estamos calculando los indicadores del periodo."
            );

        }


        try {

            const respuesta =
                await API.post({

                    action:
                        "obtenerResumenHistoricoPrioridades",

                    periodo:
                        periodo,

                    fechaDesde:
                        fechaDesde,

                    fechaHasta:
                        fechaHasta

                });


            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible consultar el cumplimiento."
                );

            }


            Prioridades.estado.historico =
                respuesta.data || {};


            Prioridades
                .renderizarCumplimiento();


        } finally {

            if (mostrarCargador) {

                CargadorSistema.ocultar();

            }

        }

    },


    renderizarCumplimiento() {

        const contenedor =
            document.getElementById(
                "cumplimientoPrioridades"
            );


        if (!contenedor) {
            return;
        }


        const datos =
            Prioridades.estado.historico ||
            {};


        const cumplimiento =
            Number(
                datos.cumplimientoMateriales || 0
            );


        const clase =
            cumplimiento >= 90
                ? "verde"
                : cumplimiento >= 80
                    ? "amarillo"
                    : cumplimiento >= 70
                        ? "naranja"
                        : "rojo";


        const mostrarRango =
            Prioridades.estado.periodo ===
            "rango";


        contenedor.innerHTML = `

            <div class="cumplimiento-prioridades-cabecera">

                <div>

                    <span>
                        Cumplimiento del abastecimiento ·
                        ${Prioridades.escapar(
                            datos.etiquetaPeriodo ||
                            "ESTE MES"
                        )}
                    </span>

                    <small>
                        ${Prioridades.escapar(
                            datos.fechaDesde || ""
                        )}
                        —
                        ${Prioridades.escapar(
                            datos.fechaHasta || ""
                        )}
                    </small>

                </div>

                <strong class="${clase}">
                    ${cumplimiento.toFixed(2)}%
                </strong>

            </div>


            <div class="cumplimiento-prioridades-metricas">

                <div>
                    <span>Materiales</span>
                    <strong>
                        ${Prioridades.numero(
                            datos.materialesAbastecidos
                        )}
                        /
                        ${Prioridades.numero(
                            datos.oportunidadesAtendibles
                        )}
                    </strong>
                </div>

                <div>
                    <span>Cantidad atendida</span>
                    <strong>
                        ${Prioridades.numero(
                            datos.cantidadAtendida
                        )}
                        /
                        ${Prioridades.numero(
                            datos.cantidadObjetivo
                        )}
                    </strong>
                </div>

                <div>
                    <span>Cumplimiento cantidad</span>
                    <strong>
                        ${Number(
                            datos.cumplimientoCantidad || 0
                        ).toFixed(2)}%
                    </strong>
                </div>

                <div>
                    <span>Oportunidades perdidas</span>
                    <strong>
                        ${Prioridades.numero(
                            datos.oportunidadesPerdidas
                        )}
                    </strong>
                </div>

            </div>


            <div class="acciones-periodo-prioridades">

                <div class="selector-periodo-prioridades">

                    ${[
                        ["hoy", "Hoy"],
                        ["semana", "Semana"],
                        ["mes", "Mes"],
                        ["rango", "Rango"]
                    ].map(function(opcion) {

                        return `
                            <button
                                type="button"
                                data-periodo-prioridades="${opcion[0]}"
                                class="${
                                    Prioridades.estado.periodo ===
                                    opcion[0]
                                        ? "activo"
                                        : ""
                                }"
                            >
                                ${opcion[1]}
                            </button>
                        `;

                    }).join("")}

                </div>


                <div
                    class="rango-prioridades ${
                        mostrarRango
                            ? "visible"
                            : ""
                    }"
                >

                    <input
                        type="date"
                        id="fechaDesdePrioridades"
                    >

                    <input
                        type="date"
                        id="fechaHastaPrioridades"
                    >

                    <button
                        type="button"
                        id="btnConsultarRangoPrioridades"
                    >
                        Consultar
                    </button>

                </div>


                <button
                    type="button"
                    id="btnHistoricoPrioridades"
                    class="btn-historico-prioridades"
                    title="Disponible en la siguiente fase"
                >
                    <i class="fa-solid fa-chart-column"></i>
                    Ver histórico
                </button>

            </div>
        `;


        Prioridades
            .configurarEventosPeriodo();

    },


    renderizarResumenActual() {

        const contenedor =
            document.getElementById(
                "resumenActualPrioridades"
            );


        if (!contenedor) {
            return;
        }


        const resumen =
            Prioridades.estado
                .resumenActual || {};


        const reposicion =
            Number(
                resumen.reposicionInmediata || 0
            ) +
            Number(
                resumen.reposicionParcial || 0
            );


        contenedor.innerHTML = `

            <article class="total">
                <span>Prioridades</span>
                <strong>
                    ${Prioridades.numero(
                        resumen.totalPrioridades
                    )}
                </strong>
            </article>

            <article class="reposicion">
                <span>Reposición</span>
                <strong>
                    ${Prioridades.numero(
                        reposicion
                    )}
                </strong>
            </article>

            <article class="qa">
                <span>Pendiente QA</span>
                <strong>
                    ${Prioridades.numero(
                        resumen.pendienteQA
                    )}
                </strong>
            </article>

            <article class="sin-reposicion">
                <span>Sin reposición</span>
                <strong>
                    ${Prioridades.numero(
                        resumen.sinReposicion
                    )}
                </strong>
            </article>
        `;

    },


    renderizarLista() {

        const contenedor =
            document.getElementById(
                "listaPrioridades"
            );


        if (!contenedor) {
            return;
        }


        const registros =
            Prioridades.estado.registros;


        if (registros.length === 0) {

            contenedor.innerHTML = `

                <div class="estado-vacio-prioridades">

                    <i class="fa-solid fa-circle-check"></i>

                    <strong>
                        No hay materiales para mostrar
                    </strong>

                    <span>
                        No existen prioridades que coincidan con los filtros.
                    </span>

                </div>
            `;

            return;
        }


        contenedor.innerHTML =
            registros
                .map(
                    function(item) {

                        return Prioridades
                            .crearTarjeta(
                                item
                            );

                    }
                )
                .join("");

    },


    crearTarjeta(
        item
    ) {

        const id =
            String(
                item.idMaterial || ""
            );


        const abierta =
            Prioridades.estado
                .tarjetaExpandida === id;


        const color =
            String(
                item.colorReposicion ||
                item.color ||
                "gris"
            )
                .toLowerCase();


        const dias =
            item.diasStockFB === null ||
            item.diasStockFB === undefined
                ? "N/D"
                : Number(
                    item.diasStockFB
                ).toFixed(1);


        return `

            <article
                class="
                    tarjeta-prioridad
                    color-${Prioridades.escapar(color)}
                    ${abierta ? "expandida" : ""}
                "
                data-material-prioridad="${Prioridades.escapar(id)}"
            >

                <button
                    type="button"
                    class="cabecera-tarjeta-prioridad"
                    aria-expanded="${abierta}"
                >

                    <span class="indicador-prioridad"></span>

                    <span class="identidad-prioridad">

                        <strong>
                            ${Prioridades.escapar(id)}
                        </strong>

                        <small>
                            ${Prioridades.escapar(
                                item.descripcion || ""
                            )}
                        </small>

                    </span>


                    <span class="dato-prioridad">
                        <small>Días FB</small>
                        <strong>${dias}</strong>
                    </span>


                    <span class="dato-prioridad">
                        <small>HB libre</small>
                        <strong>
                            ${Prioridades.numero(
                                item.stockLibreHB
                            )}
                        </strong>
                    </span>


                    <span class="dato-prioridad">
                        <small>QA</small>
                        <strong>
                            ${Prioridades.numero(
                                item.stockCalidadHB
                            )}
                        </strong>
                    </span>


                    <span
                        class="
                            etiqueta-reposicion
                            color-${Prioridades.escapar(color)}
                        "
                    >
                        ${Prioridades.escapar(
                            item.estadoReposicion || ""
                        )}
                    </span>


                    <i class="fa-solid fa-chevron-down"></i>

                </button>


                <div class="detalle-tarjeta-prioridad">

                    <div class="detalle-grid-prioridad">

                        <div>
                            <span>Estado FB</span>
                            <strong>
                                ${Prioridades.escapar(
                                    item.estadoPrioridad || ""
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Stock libre FB</span>
                            <strong>
                                ${Prioridades.numero(
                                    item.stockLibreFB
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Promedio ventas</span>
                            <strong>
                                ${Prioridades.numero(
                                    item.promedioVentas
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Cantidad objetivo</span>
                            <strong>
                                ${Prioridades.numero(
                                    item.cantidadSugerida
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>HB bloqueado</span>
                            <strong>
                                ${Prioridades.numero(
                                    item.stockBloqueadoHB
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Cobertura posible HB</span>
                            <strong>
                                ${
                                    item.coberturaReposicionHB ===
                                    null
                                        ? "N/D"
                                        : Number(
                                            item.coberturaReposicionHB
                                        ).toFixed(2) +
                                          " días"
                                }
                            </strong>
                        </div>

                    </div>


                    <div class="accion-recomendada-prioridad">

                        <span>
                            Acción recomendada
                        </span>

                        <strong>
                            ${Prioridades.escapar(
                                item.accionRecomendada || ""
                            )}
                        </strong>

                    </div>

                </div>

            </article>
        `;

    },


    configurarEventos() {

        const lista =
            document.getElementById(
                "listaPrioridades"
            );


        if (lista) {

            lista.onclick =
                function(evento) {

                    const boton =
                        evento.target.closest(
                            ".cabecera-tarjeta-prioridad"
                        );


                    if (!boton) {
                        return;
                    }


                    const tarjeta =
                        boton.closest(
                            "[data-material-prioridad]"
                        );


                    const material =
                        tarjeta?.dataset
                            .materialPrioridad || "";


                    Prioridades
                        .alternarTarjeta(
                            material
                        );

                };

        }


        const selectores = [

            "filtroEstadoPrioridad",
            "filtroReposicionPrioridad",
            "filtroUmPrioridad",
            "ordenPrioridad"

        ];


        selectores.forEach(
            function(id) {

                const control =
                    document.getElementById(
                        id
                    );


                if (!control) {
                    return;
                }


                control.onchange =
                    async function() {

                        Prioridades
                            .leerFiltros();


                        await Prioridades
                            .cargarPrioridades({
                                reiniciar:
                                    true
                            });

                    };

            }
        );


        const buscador =
            document.getElementById(
                "buscarPrioridad"
            );


        let espera =
            null;


        if (buscador) {

            buscador.oninput =
                function() {

                    clearTimeout(
                        espera
                    );


                    espera =
                        setTimeout(
                            async function() {

                                Prioridades
                                    .leerFiltros();


                                await Prioridades
                                    .cargarPrioridades({
                                        reiniciar:
                                            true
                                    });

                            },
                            650
                        );

                };

        }


        const cargarMas =
            document.getElementById(
                "btnCargarMasPrioridades"
            );


        if (cargarMas) {

            cargarMas.onclick =
                async function() {

                    if (
                        cargarMas.disabled
                    ) {
                        return;
                    }


                    await Prioridades
                        .cargarPrioridades();

                };

        }


        const limpiar =
            document.getElementById(
                "btnLimpiarPrioridades"
            );


        if (limpiar) {

            limpiar.onclick =
                async function() {

                    [
                        "buscarPrioridad",
                        "filtroEstadoPrioridad",
                        "filtroReposicionPrioridad",
                        "filtroUmPrioridad"
                    ].forEach(
                        function(id) {

                            const control =
                                document.getElementById(
                                    id
                                );


                            if (control) {
                                control.value = "";
                            }

                        }
                    );


                    const orden =
                        document.getElementById(
                            "ordenPrioridad"
                        );


                    if (orden) {
                        orden.value = "prioridad";
                    }


                    Prioridades
                        .leerFiltros();


                    await Prioridades
                        .cargarPrioridades({
                            reiniciar:
                                true
                        });

                };

        }


        const cerrar =
            document.getElementById(
                "btnCerrarCentroPrioridades"
            );


        if (cerrar) {

            cerrar.onclick =
                function() {

                    document
                        .getElementById(
                            "modalSistema"
                        )
                        ?.classList.add(
                            "oculto"
                        );

                };

        }

    },


    configurarEventosPeriodo() {

        document
            .querySelectorAll(
                "[data-periodo-prioridades]"
            )
            .forEach(
                function(boton) {

                    boton.onclick =
                        async function() {

                            Prioridades.estado.periodo =
                                boton.dataset
                                    .periodoPrioridades;


                            Prioridades
                                .renderizarCumplimiento();


                            if (
                                Prioridades.estado
                                    .periodo !==
                                "rango"
                            ) {

                                await Prioridades
                                    .cargarResumenHistorico();

                            }

                        };

                }
            );


        const consultar =
            document.getElementById(
                "btnConsultarRangoPrioridades"
            );


        if (consultar) {

            consultar.onclick =
                async function() {

                    await Prioridades
                        .cargarResumenHistorico();

                };

        }

    },


    alternarTarjeta(
        material
    ) {

        Prioridades.estado
            .tarjetaExpandida =

                Prioridades.estado
                    .tarjetaExpandida === material

                    ? ""

                    : material;


        Prioridades
            .renderizarLista();

    },


    leerFiltros() {

        Prioridades.estado.filtros = {

            busqueda:
                document.getElementById(
                    "buscarPrioridad"
                )?.value || "",

            prioridad:
                document.getElementById(
                    "filtroEstadoPrioridad"
                )?.value || "",

            reposicion:
                document.getElementById(
                    "filtroReposicionPrioridad"
                )?.value || "",

            um:
                document.getElementById(
                    "filtroUmPrioridad"
                )?.value || "",

            orden:
                document.getElementById(
                    "ordenPrioridad"
                )?.value || "prioridad"

        };

    },


    actualizarOpcionesUM() {

        const select =
            document.getElementById(
                "filtroUmPrioridad"
            );


        if (!select) {
            return;
        }


        const valor =
            select.value;


        select.innerHTML = `

            <option value="">
                Todas
            </option>

            ${Prioridades.estado
                .opcionesUM
                .map(function(um) {

                    return `
                        <option value="${Prioridades.escapar(um)}">
                            ${Prioridades.escapar(um)}
                        </option>
                    `;

                })
                .join("")}
        `;


        select.value =
            valor;

    },


    actualizarPaginacion() {

        const contador =
            document.getElementById(
                "contadorPrioridades"
            );


        const boton =
            document.getElementById(
                "btnCargarMasPrioridades"
            );


        if (contador) {

            contador.textContent =
                `Mostrando ${
                    Prioridades.estado
                        .registros.length
                } de ${
                    Prioridades.estado.total
                } materiales`;

        }


        if (boton) {

            boton.hidden =
                !Prioridades.estado.hayMas;


            boton.disabled =
                Prioridades.estado.cargando;


            boton.innerHTML = `
                <i class="fa-solid fa-plus"></i>
                Cargar ${
                    Prioridades.estado.limite
                } más
            `;

        }

    },


    actualizarTarjetaDashboard() {

        const valor =
            document.getElementById(
                "valorPrioridadesDespacho"
            );


        if (valor) {

            valor.textContent =
                Prioridades.numero(
                    Prioridades.estado
                        .resumenActual
                        .totalPrioridades
                );

        }

    },


    numero(
        valor
    ) {

        return Number(
            valor || 0
        ).toLocaleString(
            "es-DO",
            {
                maximumFractionDigits:
                    2
            }
        );

    },


    escapar(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    },


    notificar(
        mensaje,
        tipo
    ) {

        if (
            window.Notificaciones &&
            typeof Notificaciones.mostrar ===
                "function"
        ) {

            Notificaciones.mostrar(
                mensaje,
                tipo
            );

            return;

        }


        console[
            tipo === "error"
                ? "error"
                : "log"
        ](
            mensaje
        );

    }

};
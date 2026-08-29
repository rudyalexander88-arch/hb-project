// ==========================================
// MÓDULO DESPACHOS
// Sistema Logístico PT
// ==========================================

window.Despachos = {

urlPdfTemporalConduce: null,

consultaAccionesDespachosMovil: null,
controlAccionesDespachosResponsive: null,

activarModalAsistente() {

    const modal =
        document.getElementById("modalSistema");

    const contenido =
        document.getElementById("contenidoModal");

    if (!modal) {
        return false;
    }

    const activar = () => {

        if (modal.classList.contains("oculto")) {
            return;
        }

        modal.inert = false;
        modal.removeAttribute("inert");
        modal.setAttribute("aria-hidden", "false");
        modal.style.pointerEvents = "auto";

        if (contenido) {
            contenido.inert = false;
            contenido.removeAttribute("inert");
            contenido.style.pointerEvents = "auto";
        }

        document.body.classList.add(
            "modal-sistema-abierto"
        );

    };

    modal.classList.remove("oculto");
    activar();

    /*
     * Algunas aperturas esperan catálogos o terminan dentro del mismo
     * ciclo del cargador global. Se reafirma el estado en el siguiente
     * cuadro únicamente si el modal continúa visible.
     */
    window.requestAnimationFrame(activar);

    return true;

},

sincronizarAccionesDespachosResponsive() {

    const panel =
        document.querySelector(
            ".acciones-secundarias-despachos"
        );


    if (!panel) {
        return;
    }


    const consulta =
        Despachos.consultaAccionesDespachosMovil ||
        window.matchMedia("(max-width: 700px)");


    /*
     * En escritorio las acciones de consulta siempre deben
     * estar disponibles. En móvil el usuario conserva el
     * control del plegable y puede abrirlo o cerrarlo.
     */
    if (!consulta.matches) {
        panel.open = true;
    }

},

configurarAccionesDespachosResponsive() {

    if (!Despachos.consultaAccionesDespachosMovil) {

        Despachos.consultaAccionesDespachosMovil =
            window.matchMedia(
                "(max-width: 700px)"
            );

    }


    if (!Despachos.controlAccionesDespachosResponsive) {

        Despachos.controlAccionesDespachosResponsive =
            function() {

                Despachos
                    .sincronizarAccionesDespachosResponsive();

            };


        const consulta =
            Despachos.consultaAccionesDespachosMovil;


        if (
            typeof consulta.addEventListener ===
            "function"
        ) {

            consulta.addEventListener(
                "change",
                Despachos.controlAccionesDespachosResponsive
            );

        } else if (
            typeof consulta.addListener ===
            "function"
        ) {

            consulta.addListener(
                Despachos.controlAccionesDespachosResponsive
            );

        }

    }


    Despachos
        .sincronizarAccionesDespachosResponsive();

},

obtenerSesionActual() {
    try {
        return JSON.parse(
            localStorage.getItem("sesion") ||
            sessionStorage.getItem("sesion") ||
            "{}"
        );
    } catch (error) {
        console.error("No fue posible leer la sesión en Despachos:", error);
        return {};
    }
},

esAnalista() {
    const sesion = Despachos.obtenerSesionActual();

    const rol = String(sesion.rol || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return rol === "analista" || rol === "gerencia" || rol === "gerente";
},

denegarEdicionAnalista() {
    if (!Despachos.esAnalista()) {
        return false;
    }

    Despachos.notificar(
        "Su perfil dispone únicamente de consulta en Despachos.",
        "advertencia"
    );

    return true;
},

async ejecutarConCargador(
    titulo,
    mensaje,
    proceso
) {

    const inicioCargador = Date.now();

    if (
        typeof CargadorSistema !== "undefined" &&
        typeof CargadorSistema.mostrar === "function"
    ) {
        CargadorSistema.mostrar(titulo, mensaje);
    }

    try {
        return await proceso();
    } finally {

        const tiempoTranscurrido =
            Date.now() - inicioCargador;

        const tiempoRestante =
            Math.max(0, 450 - tiempoTranscurrido);

        if (tiempoRestante > 0) {
            await new Promise(resolve =>
                setTimeout(resolve, tiempoRestante)
            );
        }

        if (
            typeof CargadorSistema !== "undefined" &&
            typeof CargadorSistema.ocultar === "function"
        ) {
            CargadorSistema.ocultar();
        }
    }

},

async consultarBackendConCargador(
    datos,
    titulo,
    mensaje
) {
    return Despachos.ejecutarConCargador(
        titulo,
        mensaje,
        () => API.post(datos)
    );
},

normalizarBusquedaMaterial(valor) {

    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

},

buscarMaterialesInteligente(
    materiales,
    busqueda,
    limite = 10
) {

    const texto =
        Despachos.normalizarBusquedaMaterial(
            busqueda
        );

    if (texto.length < 2) {
        return [];
    }

    const palabras =
        texto.split(" ").filter(Boolean);

    return (Array.isArray(materiales) ? materiales : [])
        .map(material => {

            const codigo =
                Despachos.normalizarBusquedaMaterial(
                    material.id
                );

            const descripcion =
                Despachos.normalizarBusquedaMaterial(
                    material.descripcion
                );

            const textoCompleto =
                `${codigo} ${descripcion}`;

            const coincidenTodas =
                palabras.every(palabra =>
                    textoCompleto.includes(palabra)
                );

            if (!coincidenTodas) {
                return null;
            }

            let prioridad = 4;

            if (codigo === texto) {
                prioridad = 0;
            } else if (codigo.startsWith(texto)) {
                prioridad = 1;
            } else if (descripcion.startsWith(texto)) {
                prioridad = 2;
            } else if (descripcion.includes(texto)) {
                prioridad = 3;
            }

            return {
                material: material,
                prioridad: prioridad,
                descripcion: descripcion
            };

        })
        .filter(Boolean)
        .sort((a, b) =>
            a.prioridad - b.prioridad ||
            a.descripcion.localeCompare(
                b.descripcion,
                "es"
            )
        )
        .slice(0, limite)
        .map(item => item.material);

},
		
	listasDashboardEstado: {

    limite:
        10,

    abiertos: {

        registros:
            [],

        desplazamiento:
            0,

        hayMas:
            false,

        cargando:
            false

    },

    completados: {

        registros:
            [],

        desplazamiento:
            0,

        hayMas:
            false,

        cargando:
            false

    }

},	

ajustarHojaConduceAlVisor() {

    const contenedor =
        document.querySelector(
            ".contenedor-ajuste-hoja-conduce"
        );

    const hoja =
        document.getElementById(
            "hojaConduceVisor"
        );

    if (
        !contenedor ||
        !hoja
    ) {
        return;
    }


    const anchoBase =
        816;


    /*
     * Dejamos unos pocos píxeles para evitar que
     * el borde o la sombra provoquen un desbordamiento.
     */
    const anchoDisponible =
        Math.max(
            contenedor.clientWidth - 4,
            1
        );


    /*
     * Nunca ampliamos por encima del tamaño original.
     * En pantallas pequeñas únicamente reducimos.
     */
    const escala =
        Math.min(
            1,
            anchoDisponible /
                anchoBase
        );


    hoja.style.transform =
        `scale(${escala})`;


    /*
     * Transform no modifica el espacio que ocupa el elemento.
     * Por eso ajustamos manualmente la altura del contenedor.
     */
    const alturaReal =
        Math.max(
            hoja.scrollHeight,
            1056
        );


    contenedor.style.height =
        `${Math.ceil(
            alturaReal * escala
        )}px`;


    contenedor.dataset.escala =
        String(escala);

},
		
centroDespachosEstado: {

        vista:
            "lista",

        limite:
            30,

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
			
		volverDesdeVisor:
			false,

        filtros: {
			
			busqueda:
				"",

            estado:
                "",

            anio:
                "",

            mes:
                "",

            conduce:
                "",

            chofer:
                "",

            destino:
                ""

        }

    },
	

	listadoInspeccionesEstado: {

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

    resumen: {

        total:
            0,

        completadas:
            0,

        conformes:
            0,

        conHallazgos:
            0,

        pendientes:
            0

    },

    inspectores:
        [],

    filtros: {

        busqueda:
            "",

        mes:
            "",

        ano:
            "",

        estado:
            "",

        resultado:
            "",

        inspector:
            ""

    }

},


async cargar() {

    const contenido =
        document.getElementById("contenidoPrincipal");

    const esAnalista =
        Despachos.esAnalista();

    contenido.innerHTML = `
        <div class="modulo">

            <div class="modulo-header">

                <div>
                    <h2>
                        <i class="fa-solid fa-truck"></i>
                        Gestión de Despachos
                    </h2>

                    <p>
                        Administración de conduces de Productos Terminados
                    </p>
                </div>

               <div class="acciones-header-despachos">

				<details class="acciones-secundarias-despachos">
					<summary>
						<span><i class="fa-solid fa-sliders"></i> Acciones</span>
						<i class="fa-solid fa-chevron-down"></i>
					</summary>
					<div class="acciones-secundarias-despachos__contenido">

				<button
					type="button"
					id="btnActualizarDespachos"
					class="btn-principal-despachos"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
					<span>Actualizar</span>
				</button>
			   
			   <button
					type="button"
					id="btnVerInspecciones"
					class="btn-principal-despachos btn-ver-inspecciones"
				>
					<i class="fa-solid fa-clipboard-list"></i>

					<span>
						Ver inspecciones
					</span>
				</button>

				<button
					id="btnVerTodosDespachos"
					class="btn-ver-todos-despachos"
				>
					<i class="fa-solid fa-table-list"></i>
					<span>Ver todos los despachos</span>
				</button>

					</div>
				</details>
								
				${
					esAnalista
						? ""
						: `
						<div class="acciones-flotantes-despachos" aria-label="Acciones principales de despacho">
							<button type="button" id="btnInspeccionarContenedor" class="btn-principal-despachos btn-inspeccionar-contenedor" aria-label="Inspeccionar contenedor" title="Inspeccionar contenedor">
								<i class="fa-solid fa-clipboard-check"></i>
								<span>Inspeccionar contenedor</span>
							</button>

							<button type="button" id="btnNuevoConduce" class="btn-rojo btn-nuevo-conduce" aria-label="Crear nuevo conduce" title="Crear nuevo conduce">
								<i class="fa-solid fa-plus"></i>
								<span>Nuevo Conduce</span>
							</button>
						</div>
						`
				}

			</div>

            </div>

            <div class="cards-resumen">

    <!-- =========================================
         CONDUCES ABIERTOS
         ========================================= -->

    <div class="card-resumen">

        <div class="card-resumen-encabezado">

            <h3>
                Abiertos
            </h3>

            <div class="card-resumen-icono">
                <i class="fa-solid fa-folder-open"></i>
            </div>

        </div>

        <strong
            id="totalAbiertos"
            class="card-resumen-valor"
        >
            0
        </strong>

        <div class="card-resumen-pie">

            <span class="card-resumen-descripcion">
                Conduces en proceso
            </span>

        </div>

    </div>


    <!-- =========================================
         META Y COMPLETADOS
         ========================================= -->

    <div
        class="card-resumen card-meta-despachos"
        id="cardMetaDespachos"
    >

        <div class="card-resumen-encabezado">

            <h3>
                Despachados Hoy
            </h3>

            <div class="card-resumen-icono">
                <i class="fa-solid fa-circle-check"></i>
            </div>

        </div>

        <strong
            id="totalCerrados"
            class="card-resumen-valor"
        >
            0
        </strong>

        <div class="card-resumen-pie">

            <div class="cumplimiento-meta">

                <span id="porcentajeMetaDespachos">
                    0%
                </span>

                <small id="textoMetaDespachos">
                    Meta: 0
                </small>

            </div>

        </div>

    </div>


    <!-- =========================================
         PAQUETES ENVIADOS
         ========================================= -->

    <div class="card-resumen">

        <div class="card-resumen-encabezado">

            <h3>
                Paquetes enviados hoy
            </h3>

            <div class="card-resumen-icono">
                <i class="fa-solid fa-boxes-stacked"></i>
            </div>

        </div>

        <strong
            id="totalTarimas"
            class="card-resumen-valor"
        >
            0
        </strong>

        <div class="card-resumen-pie">

            <span class="card-resumen-descripcion">
                Total movilizado
            </span>

        </div>

    </div>

</div>
            <div class="paneles">

                <div class="panel panel-abiertos">

				<div class="panel-listado-encabezado">

					<h3>
						<i class="fa-solid fa-folder-open"></i>
						Conduces Abiertos
					</h3>

					<button
							type="button"
							id="btnMasConducesAbiertos"
							class="btn-mas-conduces"
							hidden
						>
							<i class="fa-solid fa-plus"></i>
							Cargar 10 más
						</button>

				</div>

                    <div class="tabla-responsive">

                        <table>

                            <thead>
                                <tr>
                                    <th>Conduce</th>
                                    <th>Creado por</th>
                                    <th>Fecha</th>
                                    <th>Líneas</th>
                                    <th>Unidades</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>

                            <tbody id="tablaAbiertos">
                                <tr>
                                    <td colspan="6" class="tabla-vacia">
                                        Cargando conduces abiertos...
                                    </td>
                                </tr>
                            </tbody>

                        </table>

                    </div>

                </div>

                <div class="panel">

				<div class="panel-listado-encabezado">

					<h3>
						<i class="fa-solid fa-box-archive"></i>
						Conduces Completados
					</h3>

					<button
						type="button"
						id="btnMasConducesCompletados"
						class="btn-mas-conduces"
						hidden
					>
						<i class="fa-solid fa-plus"></i>
						Cargar 10 más
					</button>

				</div>

                    <div class="tabla-responsive">

                        <table>

                            <thead>
                                <tr>
                                    <th>Conduce</th>
                                    <th>Creado por</th>
                                    <th>Fecha</th>
                                    <th>Líneas</th>
                                    <th>Unidades</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>

                            <tbody id="tablaDespachados">
                                <tr>
                                    <td colspan="6" class="tabla-vacia">
                                        Cargando conduces completados...
                                    </td>
                                </tr>
                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

        </div>
    `;

    Despachos
        .configurarAccionesDespachosResponsive();
	
	const modalSistema =
    document.getElementById("modalSistema");

if (
    modalSistema &&
    !modalSistema.dataset.refrescoDespachosConfigurado
) {

    modalSistema.dataset.refrescoDespachosConfigurado =
        "true";

    modalSistema.addEventListener(
        "click",
        async evento => {

            const elemento =
                evento.target;

            const boton =
                elemento.closest(
                    "button, [role='button'], .cerrar-modal, .modal-close"
                );

            if (!boton) {
                return;
            }

            const texto =
                String(
                    boton.textContent || ""
                ).trim();

            const idClase =
                (
                    String(boton.id || "") +
                    " " +
                    String(boton.className || "")
                ).toLowerCase();

            const tieneIconoCerrar =
                boton.querySelector(
                    ".fa-xmark, .fa-times, .fa-close"
                );

            const esBotonCerrar =
                texto === "×" ||
                texto === "✕" ||
                idClase.includes("cerrar") ||
                idClase.includes("close") ||
                Boolean(tieneIconoCerrar);

            if (!esBotonCerrar) {
                return;
            }

            /*
             * Este escucha pertenece exclusivamente a Despachos.
             * No debe reaccionar al cierre de ventanas de otros módulos
             * que reutilicen #modalSistema.
             */
            const contenidoModalActual =
                document.getElementById("contenidoModal");

            const perteneceADespachos = Boolean(
                document.getElementById("btnActualizarDespachos") ||
                document.body.classList.contains("centro-despachos-abierto") ||
                contenidoModalActual?.classList.contains("modo-centro-despachos") ||
                contenidoModalActual?.classList.contains("modo-visor-conduce") ||
                contenidoModalActual?.classList.contains("modo-visor-inspecciones")
            );

            if (!perteneceADespachos) {
                return;
            }

            /*
             * Esperamos a que el evento original
             * oculte primero el modal.
             */
            setTimeout(async () => {

                if (
                    modalSistema.classList.contains(
                        "oculto"
                    )
                ) {
					
					Despachos.centroDespachosEstado
					.volverDesdeVisor = false;
					
					document.body.classList.remove(
					"centro-despachos-abierto"
				);

				const contenidoModal =
					document.getElementById(
						"contenidoModal"
					);

				if (contenidoModal) {

					contenidoModal.classList.remove(
						"modo-centro-despachos"
					);

				}
					
					document.body.classList.remove(
					"centro-despachos-abierto"
				);

                    Conduce.limpiar();

                    await Despachos.cargar();

                }

            }, 50);

        }
    );

}

			const btnVerTodosDespachos =
			document.getElementById(
				"btnVerTodosDespachos"
					);

				if (btnVerTodosDespachos) {

					btnVerTodosDespachos.addEventListener(
						"click",
						async () => {

							await Despachos
								.abrirCentroDespachos();

						}
					);

				}
				
		
		const btnVerInspecciones =
			document.getElementById(
				"btnVerInspecciones"
			);

		if (btnVerInspecciones) {

			btnVerInspecciones.addEventListener(
				"click",
				() => {

					Despachos.abrirInspeccionesRealizadas();

				}
			);

		}

		const btnActualizarDespachos =
			document.getElementById(
				"btnActualizarDespachos"
			);

		if (btnActualizarDespachos) {

			btnActualizarDespachos.addEventListener(
				"click",
				async () => {

					if (
						window.CacheOperativo &&
						typeof CacheOperativo.invalidarPrefijo === "function"
					) {
						await CacheOperativo.invalidarPrefijo("despachos_");
					}

					await Despachos.cargarConducesAbiertos({
						forzarCompletados: true
					});

					await Despachos.cargarResumenDiario();

					Despachos.notificar(
						"Despachos actualizados correctamente.",
						"exito"
					);

				}
			);

		}


		const btnInspeccionarContenedor =
			document.getElementById(
				"btnInspeccionarContenedor"
			);

		if (btnInspeccionarContenedor) {

			btnInspeccionarContenedor.addEventListener(
				"click",
				() => {
					if (Despachos.denegarEdicionAnalista()) return;

					InspeccionContenedores.abrir();

				}
			);

		}

    const btnNuevoConduce =
    document.getElementById(
        "btnNuevoConduce"
    );


if (btnNuevoConduce) {

    btnNuevoConduce.addEventListener(
        "click",
        async () => {

            if (Despachos.denegarEdicionAnalista()) return;

            await Despachos
                .prepararNuevoConduce(
                    btnNuevoConduce
                );

        }
    );

}

    await Despachos.cargarConducesAbiertos();
	
	await Despachos.cargarResumenDiario();

},





async abrirCentroDespachos(
    opciones = {}
) {

    const preservarEstado =
        opciones.preservarEstado === true;

    const modal =
        document.getElementById(
            "modalSistema"
        );

    const tituloModal =
        document.getElementById(
            "tituloModal"
        );

    const contenidoModal =
        document.getElementById(
            "contenidoModal"
        );

    if (
        !modal ||
        !tituloModal ||
        !contenidoModal
    ) {

        Despachos.notificar(
            "No fue posible abrir el Centro de Despachos.",
            "error"
        );

        return;

    }

    /*
 * Si la ventana se abre normalmente, iniciamos
 * desde el primer bloque.
 *
 * Si regresamos desde el visor, conservamos los
 * registros, filtros, vista y desplazamiento.
 */
if (!preservarEstado) {

    Despachos.centroDespachosEstado
        .desplazamiento = 0;

    Despachos.centroDespachosEstado
        .total = 0;

    Despachos.centroDespachosEstado
        .hayMas = false;

    Despachos.centroDespachosEstado
        .cargando = false;

    Despachos.centroDespachosEstado
        .registros = [];

}

    tituloModal.textContent =
        "Centro de Despachos";

    contenidoModal.classList.remove(
        "modo-visor-conduce"
    );
	
	contenidoModal.classList.add(
    "modo-centro-despachos"
	);

    contenidoModal.innerHTML = `

        <section class="centro-despachos">

            <div class="centro-despachos__encabezado">

                <div class="centro-despachos__fila-superior">

                    <span class="centro-despachos__etiqueta">
                        Gestión y consulta
                    </span>

                <div class="centro-despachos__controles-vista">

                    <button
                        type="button"
                        id="btnVistaListaDespachos"
                        class="btn-vista-despachos activo"
                        title="Vista en lista"
                    >
                        <i class="fa-solid fa-list"></i>
                    </button>

                    <button
                        type="button"
                        id="btnVistaTarjetasDespachos"
                        class="btn-vista-despachos"
                        title="Vista en tarjetas"
                    >
                        <i class="fa-solid fa-table-cells-large"></i>
                    </button>

                </div>

                </div>

                <p class="centro-despachos__descripcion">
                    Consulte y administre los conduces registrados.
                </p>

            </div>

            <section
                id="tarjetaFiltrosCentroDespachos"
                class="centro-despachos__tarjeta-filtros"
            >

            <button
                type="button"
                id="btnAlternarFiltrosCentroDespachos"
                class="centro-despachos__alternar-filtros"
                aria-expanded="false"
                aria-controls="panelFiltrosCentroDespachos"
            >
                <span class="centro-despachos__titulo-filtros">
                    <i class="fa-solid fa-sliders" aria-hidden="true"></i>
                    Filtros
                </span>
                <span
                    class="centro-despachos__linea-filtros"
                    aria-hidden="true"
                ></span>
                <i
                    class="fa-solid fa-chevron-down centro-despachos__flecha-filtros"
                    aria-hidden="true"
                ></i>
            </button>

            <div
                id="panelFiltrosCentroDespachos"
                class="centro-despachos__filtros"
            >

                <div class="campo-filtro-despachos">

                    <label for="filtroConduceCentroDespachos">
                        Buscar
                    </label>

                    <input
                        type="search"
                        id="filtroConduceCentroDespachos"
                        placeholder="Conduce, chofer o destino"
                    >

                </div>

                <div class="campo-filtro-despachos">

                    <label for="filtroMesCentroDespachos">
                        Mes
                    </label>

                    <select id="filtroMesCentroDespachos">

                        <option value="">
                            Todos
                        </option>

                        <option value="01">Enero</option>
                        <option value="02">Febrero</option>
                        <option value="03">Marzo</option>
                        <option value="04">Abril</option>
                        <option value="05">Mayo</option>
                        <option value="06">Junio</option>
                        <option value="07">Julio</option>
                        <option value="08">Agosto</option>
                        <option value="09">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>

                    </select>

                </div>

                <div class="campo-filtro-despachos">

                    <label for="filtroAnioCentroDespachos">
                        Año
                    </label>

                    <select id="filtroAnioCentroDespachos">

                        <option value="">
                            Todos
                        </option>

                    </select>

                </div>

                <div class="campo-filtro-despachos">

                    <label for="filtroEstadoCentroDespachos">
                        Estado
                    </label>

                    <select id="filtroEstadoCentroDespachos">

                        <option value="">
                            Todos
                        </option>

                        <option value="Borrador">
                            Borrador
                        </option>

                        <option value="Despachado">
                            Despachado
                        </option>

                        <option value="Completado">
                            Completado
                        </option>

                    </select>

                </div>

                <div class="campo-filtro-despachos campo-filtro-limite">

                    <label for="limiteCentroDespachos">
                        Cargar
                    </label>

                    <select id="limiteCentroDespachos">

                        <option value="30" selected>
                            30
                        </option>

                        <option value="50">
                            50
                        </option>

                        <option value="100">
                            100
                        </option>

                    </select>

                </div>

                <button
                    type="button"
                    id="btnLimpiarFiltrosCentroDespachos"
                    class="btn-limpiar-filtros-despachos"
                >
                    <i class="fa-solid fa-filter-circle-xmark"></i>
                    Limpiar
                </button>

            </div>

            </section>

            <section class="centro-despachos__registros">

            <div class="centro-despachos__resumen">

				<div class="centro-despachos__resumen-acciones">

					<span id="contadorCentroDespachos">
						Mostrando 0 de 0 despachos
					</span>

					<button
						type="button"
						id="btnCargarMasCentroDespachos"
						class="btn-cargar-mas-despachos"
						hidden
					>
						<i class="fa-solid fa-plus"></i>

						<span>
							Cargar más
						</span>
					</button>

				</div>

			</div>
            <div
                id="listaCentroDespachos"
                class="lista-centro-despachos"
            >

                <div class="estado-carga-centro-despachos">

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <span>
                        Cargando despachos...
                    </span>

                </div>

            </div>

            </section>

        </section>
    `;

    modal.classList.remove(
        "oculto"
    );
	
	document.body.classList.add(
    "centro-despachos-abierto"
	);
	
	document.body.classList.add(
    "centro-despachos-abierto"
	);

    Despachos
    .configurarEventosCentroDespachos();

	if (
		preservarEstado &&
		Despachos.centroDespachosEstado
			.registros.length > 0
	) {

		Despachos
			.renderizarCentroDespachos();

	} else {

		await Despachos
			.cargarCentroDespachos({
				reiniciar: true
			});

	}

},

async cargarCentroDespachos(
    opciones = {}
) {

    const estado =
        Despachos.centroDespachosEstado;

    if (estado.cargando) {
        return;
    }

    const reiniciar =
        opciones.reiniciar === true;

    if (reiniciar) {

        estado.desplazamiento = 0;
        estado.registros = [];

    }

    const lista =
        document.getElementById(
            "listaCentroDespachos"
        );

    const contador =
        document.getElementById(
            "contadorCentroDespachos"
        );

    const btnCargarMas =
        document.getElementById(
            "btnCargarMasCentroDespachos"
        );

    if (
        !lista ||
        !contador ||
        !btnCargarMas
    ) {
        return;
    }

    estado.cargando = true;

    if (
        window.CargadorSistema &&
        typeof CargadorSistema.mostrar ===
            "function"
    ) {

        CargadorSistema.mostrar(
            reiniciar
                ? "Cargando despachos"
                : "Cargando más despachos",
            "Estamos consultando los registros del sistema."
        );

    }

    try {

        const respuesta =
            await API.post({

                action:
                    "listarTodosDespachos",

                limite:
                    estado.limite,

                desplazamiento:
                    estado.desplazamiento,

                estado:
                    estado.filtros.estado,

                anio:
                    estado.filtros.anio,

                mes:
                    estado.filtros.mes,

                conduce:
                    estado.filtros.conduce,

                chofer:
                    estado.filtros.chofer,

                destino:
                    estado.filtros.destino,
					
				busqueda:
					estado.filtros.busqueda || ""

            });

        if (
            !respuesta ||
            !respuesta.ok
        ) {

            throw new Error(
                respuesta?.mensaje ||
                "No fue posible cargar los despachos."
            );

        }

        const datos =
            respuesta.data || {};

        const nuevosRegistros =
            Array.isArray(
                datos.registros
            )
                ? datos.registros
                : [];

        if (reiniciar) {

            estado.registros =
                nuevosRegistros;

        } else {

            estado.registros.push(
                ...nuevosRegistros
            );

        }

        estado.total =
            Number(
                datos.total || 0
            );

        estado.hayMas =
            datos.hayMas === true;

        estado.desplazamiento =
            estado.registros.length;

        Despachos
            .renderizarCentroDespachos();

    } catch (error) {

        console.error(
            "Error cargando el Centro de Despachos:",
            error
        );

        if (reiniciar) {

            lista.innerHTML = `
                <div class="estado-vacio-centro-despachos">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <strong>
                        No fue posible cargar los despachos
                    </strong>

                    <span>
                        ${error.message || "Error desconocido."}
                    </span>

                </div>
            `;

        }

        Despachos.notificar(
            error.message ||
            "No fue posible cargar los despachos.",
            "error"
        );

    } finally {

        estado.cargando = false;

        if (
            window.CargadorSistema &&
            typeof CargadorSistema.ocultar ===
                "function"
        ) {

            CargadorSistema.ocultar();

        }

    }

},

renderizarCentroDespachos() {

    const estado =
        Despachos.centroDespachosEstado;

    const lista =
        document.getElementById(
            "listaCentroDespachos"
        );

    const contador =
        document.getElementById(
            "contadorCentroDespachos"
        );

    const btnCargarMas =
        document.getElementById(
            "btnCargarMasCentroDespachos"
        );

    if (
        !lista ||
        !contador ||
        !btnCargarMas
    ) {
        return;
    }

    contador.textContent =
        `Mostrando ${estado.registros.length} de ${estado.total} despachos`;

    if (
        estado.registros.length === 0
    ) {

        lista.innerHTML = `
            <div class="estado-vacio-centro-despachos">

                <i class="fa-regular fa-folder-open"></i>

                <strong>
                    No se encontraron despachos
                </strong>

                <span>
                    Modifique los filtros para ampliar la búsqueda.
                </span>

            </div>
        `;

    } else if (
        estado.vista === "tarjetas"
    ) {

        /*
         * La vista por tarjetas se construirá
         * en el próximo paso.
         */
        Despachos
            .renderizarCentroDespachosTarjetas();

    } else {

        Despachos
            .renderizarCentroDespachosLista();

    }

    btnCargarMas.hidden =
        !estado.hayMas;

    const textoBoton =
        btnCargarMas.querySelector(
            "span"
        );

    if (textoBoton) {

        textoBoton.textContent =
            `Cargar ${estado.limite} más`;

    }

},

renderizarCentroDespachosLista() {

    const estado =
        Despachos.centroDespachosEstado;

    const lista =
        document.getElementById(
            "listaCentroDespachos"
        );

    if (!lista) {
        return;
    }

    const grupos =
        Despachos
            .agruparDespachosPorMes(
                estado.registros
            );

    lista.classList.remove(
        "vista-tarjetas-centro-despachos"
    );

    lista.classList.add(
        "vista-lista-centro-despachos"
    );

    lista.innerHTML =
        grupos
            .map(grupo => {

                return `
                    <section class="grupo-mensual-despachos">

                        <div class="encabezado-mes-despachos">

                            <div>

                                <span>
                                    Periodo
                                </span>

                                <strong>
                                    ${Despachos.escaparHTMLInspecciones(
                                        grupo.nombre
                                    )}
                                </strong>

                            </div>

                            <small>
                                ${grupo.registros.length}
                                ${
                                    grupo.registros.length === 1
                                        ? "despacho"
                                        : "despachos"
                                }
                            </small>

                        </div>

                        <div class="tabla-lista-despachos">

                            <div class="cabecera-lista-despachos">

                                <span>Conduce</span>
                                <span>Fecha</span>
                                <span>Estado</span>
                                <span>Chofer</span>
                                <span>Destino</span>
                                <span>Líneas</span>
                                <span>Unidades</span>
                                <span>Acción</span>

                            </div>

                            ${grupo.registros
                                .map(item =>
                                    Despachos
                                        .crearFilaCentroDespachos(
                                            item
                                        )
                                )
                                .join("")}

                        </div>

                    </section>
                `;

            })
            .join("");

},

crearFilaCentroDespachos(
    item
) {

    const esAnalista =
        Despachos.esAnalista();

    const estado =
        String(
            item.estado || "Pendiente"
        ).trim();

    const estadoNormalizado =
        estado
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            );

    const fecha =
        Despachos
            .obtenerFechaVisibleDespacho(
                item
            );

    const destinoPrincipal =
        String(
            item.destino1 || "-"
        ).trim();

    const tieneSegundoDestino =
        String(
            item.destino2 || ""
        ).trim() !== "";

    const destinoVisible =
        tieneSegundoDestino
            ? `${destinoPrincipal} + 1`
            : destinoPrincipal;

    const sesionCentro = JSON.parse(
        localStorage.getItem("sesion") ||
        sessionStorage.getItem("sesion") ||
        "{}"
    );

    const rolCentro = String(
        sesionCentro.rol || ""
    ).trim().toLowerCase();

    const puedeReabrirCompletado =
        rolCentro === "administrador" ||
        rolCentro === "encargado";

    const botonVer = `
        <button
            type="button"
            class="btn-accion-centro-despachos ver"
            data-accion="ver"
            data-id-conduce="${Despachos.escaparHTMLInspecciones(item.idConduce || "")}"
            title="Ver despacho"
            aria-label="Ver despacho"
        >
            <i class="fa-solid fa-eye"></i>
        </button>
    `;

    let botonAccion = "";

    if (esAnalista) {

        botonAccion = botonVer;

    } else if (
        estadoNormalizado ===
        "borrador"
    ) {

        botonAccion = botonVer + `
            <button
                type="button"
                class="btn-accion-centro-despachos continuar"
                data-accion="continuar"
                data-id-conduce="${Despachos.escaparHTMLInspecciones(
                    item.idConduce || ""
                )}"
                title="Continuar despacho"
            >
                <i class="fa-solid fa-play"></i>
            </button>
        `;

    } else if (
        estadoNormalizado ===
        "despachado"
    ) {

        botonAccion = botonVer + `
            <button
                type="button"
                class="btn-accion-centro-despachos finalizar"
                data-accion="continuar"
                data-id-conduce="${Despachos.escaparHTMLInspecciones(
                    item.idConduce || ""
                )}"
                title="Continuar en Finalizar carga"
                aria-label="Editar despacho"
            >
                <i class="fa-solid fa-pen"></i>
            </button>
        `;

    } else {

        botonAccion = botonVer;

        if (
            estadoNormalizado === "completado" &&
            puedeReabrirCompletado
        ) {
            botonAccion += `
                <button
                    type="button"
                    class="btn-accion-centro-despachos finalizar"
                    data-accion="reabrir"
                    data-id-conduce="${Despachos.escaparHTMLInspecciones(item.idConduce || "")}"
                    title="Editar despacho completado"
                    aria-label="Editar despacho completado"
                >
                    <i class="fa-solid fa-pen"></i>
                </button>
            `;
        }

    }

    return `
        <article class="fila-centro-despachos estado-${estadoNormalizado.replace(/\s+/g, "-")}">

            <div class="dato-conduce-lista">

                <strong>
                    ${Despachos.escaparHTMLInspecciones(
                        item.noConduce || "-"
                    )}
                </strong>

                <small>
                    ${Despachos.escaparHTMLInspecciones(
                        item.unidad || "-"
                    )}
                </small>

            </div>

            <div class="dato-fecha-lista">

                <span>
                    ${Despachos.escaparHTMLInspecciones(
                        fecha.fecha || "-"
                    )}
                </span>

                <small>
                    ${Despachos.escaparHTMLInspecciones(
                        fecha.hora || ""
                    )}
                </small>

            </div>

            <div class="dato-estado-centro-despachos">

                <span
                    class="
                        etiqueta-estado-despacho
                        ${estadoNormalizado}
                    "
                >
                    ${Despachos.escaparHTMLInspecciones(
                        estado
                    )}
                </span>

            </div>

            <div
                class="texto-truncado-despacho dato-chofer-centro-despachos"
                title="${Despachos.escaparHTMLInspecciones(
                    item.chofer || "-"
                )}"
            >
                ${Despachos.escaparHTMLInspecciones(
                    item.chofer || "-"
                )}
            </div>

            <div
                class="texto-truncado-despacho dato-destino-centro-despachos"
                title="${Despachos.escaparHTMLInspecciones(
                    [
                        item.destino1,
                        item.destino2
                    ]
                        .filter(Boolean)
                        .join(" / ") ||
                    "-"
                )}"
            >
                ${Despachos.escaparHTMLInspecciones(
                    destinoVisible
                )}
            </div>

            <div class="dato-numerico-despacho">

                ${Number(
                    item.totalLineas || 0
                ).toLocaleString(
                    "es-DO"
                )}

            </div>

            <div class="dato-numerico-despacho">

                ${Number(
                    item.totalUnidades || 0
                ).toLocaleString(
                    "es-DO"
                )}

            </div>

            <div class="acciones-lista-centro-despachos">

                ${botonAccion}

            </div>

        </article>
    `;

},

agruparDespachosPorMes(
    registros
) {

    const grupos = new Map();

    registros.forEach(item => {

        const fecha =
            Despachos
                .convertirFechaCentroDespachos(
                    Despachos
                        .obtenerFechaBaseDespacho(
                            item
                        )
                );

        let clave =
            "sin-fecha";

        let nombre =
            "Sin fecha";

        let orden =
            0;

        if (fecha) {

            const anio =
                fecha.getFullYear();

            const mes =
                fecha.getMonth();

            clave =
                `${anio}-${String(
                    mes + 1
                ).padStart(2, "0")}`;

            nombre =
                fecha
                    .toLocaleDateString(
                        "es-DO",
                        {
                            month: "long",
                            year: "numeric"
                        }
                    );

            nombre =
                nombre.charAt(0)
                    .toUpperCase() +
                nombre.slice(1);

            orden =
                new Date(
                    anio,
                    mes,
                    1
                ).getTime();

        }

        if (!grupos.has(clave)) {

            grupos.set(
                clave,
                {
                    clave:
                        clave,

                    nombre:
                        nombre,

                    orden:
                        orden,

                    registros:
                        []
                }
            );

        }

        grupos
            .get(clave)
            .registros
            .push(item);

    });

    return Array
        .from(
            grupos.values()
        )
        .sort(
            (a, b) =>
                b.orden -
                a.orden
        );

},

obtenerFechaBaseDespacho(
    item
) {

    const estado =
        String(
            item.estado || ""
        )
            .trim()
            .toLowerCase();

    if (
        estado === "completado"
    ) {

        return (
            item.fechaCompletado ||
            item.fechaDespacho ||
            item.fechaCreacion ||
            ""
        );

    }

    if (
        estado === "despachado"
    ) {

        return (
            item.fechaDespacho ||
            item.fechaCreacion ||
            ""
        );

    }

    return (
        item.fechaCreacion ||
        item.fechaDespacho ||
        item.fechaCompletado ||
        ""
    );

},


obtenerFechaVisibleDespacho(
    item
) {

    const valor =
        Despachos
            .obtenerFechaBaseDespacho(
                item
            );

    const fecha =
        Despachos
            .convertirFechaCentroDespachos(
                valor
            );

    if (!fecha) {

        return {
            fecha:
                String(
                    valor || "-"
                ),

            hora:
                ""
        };

    }

    return {

        fecha:
            fecha.toLocaleDateString(
                "es-DO",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            ),

        hora:
            fecha.toLocaleTimeString(
                "es-DO",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )

    };

},


convertirFechaCentroDespachos(
    valor
) {

    if (!valor) {
        return null;
    }

    if (
        valor instanceof Date &&
        !Number.isNaN(
            valor.getTime()
        )
    ) {

        return valor;

    }

    const texto =
        String(
            valor || ""
        ).trim();

    const coincidencia =
        texto.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)?(\d{1,2})?:?(\d{2})?:?(\d{2})?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/i
        );

    if (coincidencia) {

        const dia =
            Number(
                coincidencia[1]
            );

        const mes =
            Number(
                coincidencia[2]
            ) - 1;

        const anio =
            Number(
                coincidencia[3]
            );

        let hora =
            Number(
                coincidencia[4] || 0
            );

        const minutos =
            Number(
                coincidencia[5] || 0
            );

        const segundos =
            Number(
                coincidencia[6] || 0
            );

        const periodo =
            String(
                coincidencia[7] || ""
            )
                .toLowerCase()
                .replace(
                    /\s|\./g,
                    ""
                );

        if (
            periodo === "pm" &&
            hora < 12
        ) {

            hora += 12;

        }

        if (
            periodo === "am" &&
            hora === 12
        ) {

            hora = 0;

        }

        const fecha =
            new Date(
                anio,
                mes,
                dia,
                hora,
                minutos,
                segundos
            );

        return Number.isNaN(
            fecha.getTime()
        )
            ? null
            : fecha;

    }

    const alternativa =
        new Date(texto);

    return Number.isNaN(
        alternativa.getTime()
    )
        ? null
        : alternativa;

},


renderizarCentroDespachosTarjetas() {

    const lista =
        document.getElementById(
            "listaCentroDespachos"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = `
        <div class="estado-vacio-centro-despachos">

            <i class="fa-solid fa-table-cells-large"></i>

            <strong>
                Vista por tarjetas
            </strong>

            <span>
                Esta vista será construida en el siguiente paso.
            </span>

        </div>
    `;

},

async aplicarFiltrosCentroDespachos() {

    const estado =
        Despachos.centroDespachosEstado;

    const inputBusqueda =
        document.getElementById(
            "filtroConduceCentroDespachos"
        );

    const selectMes =
        document.getElementById(
            "filtroMesCentroDespachos"
        );

    const selectAnio =
        document.getElementById(
            "filtroAnioCentroDespachos"
        );

    const selectEstado =
        document.getElementById(
            "filtroEstadoCentroDespachos"
        );

    const selectLimite =
        document.getElementById(
            "limiteCentroDespachos"
        );

    estado.filtros.busqueda =
        String(
            inputBusqueda?.value || ""
        ).trim();

    estado.filtros.mes =
        String(
            selectMes?.value || ""
        ).trim();

    estado.filtros.anio =
        String(
            selectAnio?.value || ""
        ).trim();

    estado.filtros.estado =
        String(
            selectEstado?.value || ""
        ).trim();

    estado.limite =
        Number(
            selectLimite?.value ||
            30
        );

    await Despachos
        .cargarCentroDespachos({
            reiniciar: true
        });

},

configurarEventosCentroDespachos() {

    const estado =
        Despachos.centroDespachosEstado;

    const btnCargarMas =
        document.getElementById(
            "btnCargarMasCentroDespachos"
        );

    const inputBusqueda =
        document.getElementById(
            "filtroConduceCentroDespachos"
        );

    const selectMes =
        document.getElementById(
            "filtroMesCentroDespachos"
        );

    const selectAnio =
        document.getElementById(
            "filtroAnioCentroDespachos"
        );

    const selectEstado =
        document.getElementById(
            "filtroEstadoCentroDespachos"
        );

    const selectLimite =
        document.getElementById(
            "limiteCentroDespachos"
        );

    const btnLimpiar =
        document.getElementById(
            "btnLimpiarFiltrosCentroDespachos"
        );

    const tarjetaFiltros =
        document.getElementById(
            "tarjetaFiltrosCentroDespachos"
        );

    const btnAlternarFiltros =
        document.getElementById(
            "btnAlternarFiltrosCentroDespachos"
        );

    const panelFiltros =
        document.getElementById(
            "panelFiltrosCentroDespachos"
        );

    const lista =
        document.getElementById(
            "listaCentroDespachos"
        );

    if (btnAlternarFiltros && tarjetaFiltros && panelFiltros) {

        const pantallaCompacta =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(max-width: 768px)").matches;

        panelFiltros.inert = pantallaCompacta;

        btnAlternarFiltros.onclick = () => {

            const abierto = tarjetaFiltros.classList.toggle(
                "centro-despachos__tarjeta-filtros--abierta"
            );

            btnAlternarFiltros.setAttribute(
                "aria-expanded",
                String(abierto)
            );

            panelFiltros.inert = !abierto;

        };

    }

    /*
     * Generamos los años sin depender de los primeros
     * 30 registros cargados.
     */
    if (selectAnio) {

        const anioActual =
            new Date().getFullYear();

        const opcionesAnios = [];

        for (
            let anio = anioActual;
            anio >= anioActual - 10;
            anio--
        ) {

            opcionesAnios.push(`
                <option value="${anio}">
                    ${anio}
                </option>
            `);

        }

        selectAnio.innerHTML = `
            <option value="">
                Todos
            </option>

            ${opcionesAnios.join("")}
        `;

    }

    /*
     * Restauramos los valores guardados cuando se vuelve
     * desde el visor del conduce.
     */
    if (inputBusqueda) {

        inputBusqueda.value =
            estado.filtros.busqueda || "";

    }

    if (selectMes) {

        selectMes.value =
            estado.filtros.mes || "";

    }

    if (selectAnio) {

        selectAnio.value =
            estado.filtros.anio || "";

    }

    if (selectEstado) {

        selectEstado.value =
            estado.filtros.estado || "";

    }

    if (selectLimite) {

        selectLimite.value =
            String(
                estado.limite || 30
            );

    }

    /*
     * Buscar espera brevemente para no consultar el
     * backend por cada tecla presionada.
     */
    let temporizadorBusqueda = null;

    if (inputBusqueda) {

        inputBusqueda.oninput =
            () => {

                clearTimeout(
                    temporizadorBusqueda
                );

                temporizadorBusqueda =
                    setTimeout(
                        async () => {

                            await Despachos
                                .aplicarFiltrosCentroDespachos();

                        },
                        700
                    );

            };

    }

    if (selectMes) {

        selectMes.onchange =
            async () => {

                await Despachos
                    .aplicarFiltrosCentroDespachos();

            };

    }

    if (selectAnio) {

        selectAnio.onchange =
            async () => {

                await Despachos
                    .aplicarFiltrosCentroDespachos();

            };

    }

    if (selectEstado) {

        selectEstado.onchange =
            async () => {

                await Despachos
                    .aplicarFiltrosCentroDespachos();

            };

    }

    if (selectLimite) {

        selectLimite.onchange =
            async () => {

                await Despachos
                    .aplicarFiltrosCentroDespachos();

            };

    }

    if (btnLimpiar) {

        btnLimpiar.onclick =
            async () => {

                estado.filtros.busqueda = "";
                estado.filtros.estado = "";
                estado.filtros.anio = "";
                estado.filtros.mes = "";
                estado.filtros.conduce = "";
                estado.filtros.chofer = "";
                estado.filtros.destino = "";

                estado.limite = 30;

                if (inputBusqueda) {
                    inputBusqueda.value = "";
                }

                if (selectMes) {
                    selectMes.value = "";
                }

                if (selectAnio) {
                    selectAnio.value = "";
                }

                if (selectEstado) {
                    selectEstado.value = "";
                }

                if (selectLimite) {
                    selectLimite.value = "30";
                }

                await Despachos
                    .cargarCentroDespachos({
                        reiniciar: true
                    });

            };

    }

    if (btnCargarMas) {

        btnCargarMas.onclick =
            async () => {

                await Despachos
                    .cargarCentroDespachos();

            };

    }

    /*
     * Delegación de eventos para los botones de acción.
     * Se conserva aunque la lista vuelva a renderizarse.
     */
    if (lista) {

        lista.onclick =
            async evento => {

                const boton =
                    evento.target.closest(
                        ".btn-accion-centro-despachos"
                    );

                if (!boton) {
                    return;
                }

                const accion =
                    String(
                        boton.dataset.accion || ""
                    ).trim();

                const idConduce =
                    String(
                        boton.dataset.idConduce || ""
                    ).trim();

                if (!idConduce) {

                    Despachos.notificar(
                        "No fue posible identificar el conduce.",
                        "error"
                    );

                    return;

                }

                if (
                    window.CargadorSistema &&
                    typeof CargadorSistema.mostrar ===
                        "function"
                ) {

                    CargadorSistema.mostrar(
                        accion === "ver"
                            ? "Cargando despacho"
                            : "Recuperando despacho",
                        accion === "ver"
                            ? "Estamos preparando la información del conduce."
                            : "Estamos recuperando el proceso pendiente."
                    );

                }

                try {

                    document.body.classList.remove(
                        "centro-despachos-abierto"
                    );

                    const contenidoModal =
                        document.getElementById(
                            "contenidoModal"
                        );

                    if (contenidoModal) {

                        contenidoModal.classList.remove(
                            "modo-centro-despachos"
                        );

                    }

                    if (
                        accion === "continuar" ||
                        accion === "reabrir"
                    ) {

                        if (Despachos.denegarEdicionAnalista()) return;

                        if (accion === "reabrir") {
                            const sesion = JSON.parse(
                                localStorage.getItem("sesion") ||
                                sessionStorage.getItem("sesion") ||
                                "{}"
                            );
                            const rol = String(sesion.rol || "")
                                .trim()
                                .toLowerCase();

                            if (rol !== "administrador" && rol !== "encargado") {
                                throw new Error(
                                    "Su rol no puede reabrir despachos completados."
                                );
                            }
                        }

                        await Despachos
                            .continuarBorrador(
                                idConduce,
                                accion === "reabrir"
                                    ? { permitirCompletado: true }
                                    : undefined
                            );

                        return;

                    }

                    if (
                        accion === "ver"
                    ) {

                        estado.volverDesdeVisor =
                            true;

                        await Despachos
                            .abrirVistaConduce(
                                idConduce
                            );

                    }

                } catch (error) {

                    console.error(
                        "Error ejecutando acción del Centro de Despachos:",
                        error
                    );

                    Despachos.notificar(
                        error.message ||
                        "No fue posible abrir el despacho.",
                        "error"
                    );

                } finally {

                    if (
                        window.CargadorSistema &&
                        typeof CargadorSistema.ocultar ===
                            "function"
                    ) {

                        CargadorSistema.ocultar();

                    }

                }

            };

    }

},

async cargarConducesAbiertos(opciones = {}) {

    const estado =
        Despachos.listasDashboardEstado;

    /*
     * Cada vez que el módulo se abre,
     * ambas listas comienzan desde cero.
     */
    estado.abiertos.registros = [];
    estado.abiertos.desplazamiento = 0;
    estado.abiertos.hayMas = false;
    estado.abiertos.cargando = false;

    estado.completados.registros = [];
    estado.completados.desplazamiento = 0;
    estado.completados.hayMas = false;
    estado.completados.cargando = false;


    Despachos.configurarEventosListasDashboard();


    let completadosDesdeCache = false;

    if (
        opciones.forzarCompletados !== true &&
        window.CacheOperativo &&
        typeof CacheOperativo.obtener === "function"
    ) {

        const cache = await CacheOperativo.obtener(
            "despachos_completados_dashboard"
        );

        const datosCache = cache && cache.datos;

        if (
            datosCache &&
            Array.isArray(datosCache.registros)
        ) {

            estado.completados.registros =
                datosCache.registros;

            estado.completados.desplazamiento =
                Number(
                    datosCache.desplazamiento ||
                    datosCache.registros.length
                );

            estado.completados.hayMas =
                datosCache.hayMas === true;

            Despachos.renderizarListaDashboard(
                "completados"
            );

            Despachos.actualizarBotonListaDashboard(
                "completados"
            );

            completadosDesdeCache = true;

        }

    }

    const consultas = [
        Despachos.cargarPaginaListaDashboard(
            "abiertos"
        )
    ];

    if (!completadosDesdeCache) {
        consultas.push(
            Despachos.cargarPaginaListaDashboard(
                "completados"
            )
        );
    }

    await Promise.all(consultas);

},

async cargarPaginaListaDashboard(
    tipo
) {

    const estadoGeneral =
        Despachos.listasDashboardEstado;

    const estadoLista =
        estadoGeneral[tipo];

    if (
        !estadoLista ||
        estadoLista.cargando
    ) {
        return;
    }


    const tabla =
        document.getElementById(
            tipo === "abiertos"
                ? "tablaAbiertos"
                : "tablaDespachados"
        );

    const boton =
        document.getElementById(
            tipo === "abiertos"
                ? "btnMasConducesAbiertos"
                : "btnMasConducesCompletados"
        );


    if (!tabla) {
        return;
    }


    estadoLista.cargando =
        true;


    if (boton) {

        boton.disabled =
            true;

        boton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Cargando...
        `;

    }


    /*
     * Solo mostramos el mensaje de carga cuando todavía
     * no existe ningún registro en la tabla.
     */
    if (
        estadoLista.registros.length === 0
    ) {

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="tabla-vacia"
                >
                    Cargando conduces...
                </td>
            </tr>
        `;

    }


    try {

        const respuesta =
            await API.post({

                action:
                    "listarDespachosDashboard",

                tipo:
                    tipo,

                limite:
                    estadoGeneral.limite,

                desplazamiento:
                    estadoLista.desplazamiento

            });


        if (
            !respuesta ||
            !respuesta.ok
        ) {

            throw new Error(
                respuesta?.mensaje ||
                "No fue posible cargar los conduces."
            );

        }


        const datos =
            respuesta.data || {};


        const nuevosRegistros =
            Array.isArray(
                datos.registros
            )
                ? datos.registros
                : [];


        estadoLista.registros.push(
            ...nuevosRegistros
        );


        estadoLista.desplazamiento =
            Number(
                datos.siguienteDesplazamiento ||
                estadoLista.registros.length
            );


        estadoLista.hayMas =
            datos.hayMas === true;


        if (
            tipo === "completados" &&
            window.CacheOperativo &&
            typeof CacheOperativo.guardar === "function"
        ) {

            await CacheOperativo.guardar(
                "despachos_completados_dashboard",
                {
                    registros:
                        estadoLista.registros,
                    desplazamiento:
                        estadoLista.desplazamiento,
                    hayMas:
                        estadoLista.hayMas
                }
            );

        }


        Despachos.renderizarListaDashboard(
            tipo
        );


    } catch (error) {

        console.error(
            "Error cargando lista paginada de despachos:",
            error
        );


        if (
            estadoLista.registros.length === 0
        ) {

            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="tabla-vacia"
                    >
                        No fue posible cargar los conduces.
                    </td>
                </tr>
            `;

        }


        Despachos.notificar(
            error.message ||
            "No fue posible cargar los conduces.",
            "error"
        );


    } finally {

        estadoLista.cargando =
            false;


        Despachos.actualizarBotonListaDashboard(
            tipo
        );

    }

},


renderizarListaDashboard(
    tipo
) {

    const estadoGeneral =
        Despachos.listasDashboardEstado;

    const estadoLista =
        estadoGeneral[tipo];


    const tabla =
        document.getElementById(
            tipo === "abiertos"
                ? "tablaAbiertos"
                : "tablaDespachados"
        );


    if (!tabla) {
        return;
    }


    const registros =
        estadoLista.registros;


    if (registros.length === 0) {

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="tabla-vacia"
                >
                    ${
                        tipo === "abiertos"
                            ? "No hay conduces abiertos."
                            : "No hay conduces completados."
                    }
                </td>
            </tr>
        `;

        Despachos.actualizarTotalesListasDashboard();

        return;

    }


    const sesion =
        JSON.parse(
            localStorage.getItem(
                "sesion"
            ) ||
            sessionStorage.getItem(
                "sesion"
            ) ||
            "{}"
        );


    const rol =
        String(
            sesion.rol || ""
        )
            .trim()
            .toLowerCase();


    const puedeReabrirCompletado =
        rol === "administrador" ||
        rol === "encargado";


    tabla.innerHTML =
        registros
            .map(function(item) {

                const estado =
                    String(
                        item.estado ||
                        (
                            tipo === "abiertos"
                                ? "Borrador"
                                : "Completado"
                        )
                    ).trim();


                const estadoNormalizado =
                    estado
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(
                            /[\u0300-\u036f]/g,
                            ""
                        );


                const realizadoPor =
                    item.realizadoPor ||
                    item.supervisor ||
                    "-";


                const fechaBase =
                    item.fechaTabla ||
                    item.fecha ||
                    item.fechaCreacion ||
                    "-";


                const fecha =
                    String(
                        fechaBase || "-"
                    ).split(" ")[0];


                let botones = "";


                if (
                    tipo === "abiertos"
                ) {

                    if (Despachos.esAnalista()) {

                        botones = `
                            <button
                                type="button"
                                class="btn-ver-despacho"
                                data-id-conduce="${item.idConduce || ""}"
                                title="Ver conduce"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        `;

                    } else {

                    botones =
                        estadoNormalizado ===
                        "despachado"

                            ? `
                                <button
                                    type="button"
                                    class="
                                        btn-editar-despacho
                                        btn-continuar-despacho
                                    "
                                    data-id-conduce="${
                                        item.idConduce || ""
                                    }"
                                    title="Continuar en Finalizar carga"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                            `

                            : `
                                <button
                                    type="button"
                                    class="btn-continuar-borrador"
                                    data-id-conduce="${
                                        item.idConduce || ""
                                    }"
                                    title="Continuar carga"
                                >
                                    <i class="fa-solid fa-play"></i>
                                </button>
                            `;

                    }

                } else {

                    botones = `
                        <button
                            type="button"
                            class="btn-ver-despacho"
                            data-id-conduce="${
                                item.idConduce || ""
                            }"
                            title="Ver conduce"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    `;


                    if (
                        puedeReabrirCompletado
                    ) {

                        botones += `
                            <button
                                type="button"
                                class="
                                    btn-editar-despacho
                                    btn-abrir-completado
                                "
                                data-id-conduce="${
                                    item.idConduce || ""
                                }"
                                title="Abrir asistente en Finalizar carga"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        `;

                    }

                }


                return `
                    <tr class="${estadoNormalizado}">

                        <td>

                            <strong>
                                ${item.noConduce || "-"}
                            </strong>

                            <small
                                class="
                                    estado-conduce
                                    ${estadoNormalizado}
                                "
                            >
                                ${estado}
                            </small>

                        </td>

                        <td>
                            ${realizadoPor}
                        </td>

                        <td class="fecha-conduce">
                            ${fecha}
                        </td>

                        <td class="centrado">

                            ${Number(
                                item.totalLineas || 0
                            ).toLocaleString(
                                "es-DO"
                            )}

                        </td>

                        <td class="numero">

                            ${Number(
                                item.totalUnidades || 0
                            ).toLocaleString(
                                "es-DO"
                            )}

                        </td>

                        <td class="acciones-despacho">
                            ${botones}
                        </td>

                    </tr>
                `;

            })
            .join("");


    Despachos.actualizarTotalesListasDashboard();

},


actualizarTotalesListasDashboard() {

    const estado =
        Despachos.listasDashboardEstado;


    const totalAbiertos =
        document.getElementById(
            "totalAbiertos"
        );


    /*
     * El backend paginado no cuenta toda la hoja.
     * Cuando existen más registros mostramos 10+,
     * 20+, etc., evitando hacer una lectura completa.
     */
    if (totalAbiertos) {

        const cantidad =
            estado.abiertos.registros.length;


        totalAbiertos.textContent =
            estado.abiertos.hayMas

                ? cantidad + "+"

                : cantidad;

    }

},

actualizarBotonListaDashboard(
    tipo
) {

    const estado =
        Despachos.listasDashboardEstado[
            tipo
        ];


    const boton =
        document.getElementById(
            tipo === "abiertos"
                ? "btnMasConducesAbiertos"
                : "btnMasConducesCompletados"
        );


    if (
        !boton ||
        !estado
    ) {
        return;
    }


    boton.disabled =
        estado.cargando;


    boton.hidden =
        !estado.hayMas;


    boton.innerHTML = `
        <i class="fa-solid fa-plus"></i>
        Cargar 10 más
    `;

},


async ejecutarAccionListaDashboard(
    boton,
    accion,
    idConduce
) {

    if (
        !boton ||
        !idConduce
    ) {

        Despachos.notificar(
            "No fue posible identificar el conduce.",
            "error"
        );

        return;
    }


    const contenidoOriginal =
        boton.innerHTML;


    const tituloCarga =
        accion === "ver"

            ? "Cargando despacho"

            : accion === "reabrir"

                ? "Abriendo despacho"

                : "Recuperando conduce";


    const descripcionCarga =
        accion === "ver"

            ? "Estamos preparando la visualización del conduce."

            : accion === "reabrir"

                ? "Estamos recuperando el despacho completado."

                : "Estamos recuperando la información pendiente.";

    if (
        accion !== "ver" &&
        Despachos.denegarEdicionAnalista()
    ) {
        return;
    }


    /*
     * Bloqueamos el botón para evitar múltiples pulsaciones.
     */
    boton.disabled =
        true;


    boton.classList.add(
        "boton-accion-cargando"
    );


    boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
    `;


    if (
        window.CargadorSistema &&
        typeof CargadorSistema.mostrar ===
            "function"
    ) {

        CargadorSistema.mostrar(
            tituloCarga,
            descripcionCarga
        );

    }


    try {

        if (
            accion === "ver"
        ) {

            await Despachos
                .abrirVistaConduce(
                    idConduce
                );

            return;

        }


        if (
            accion === "reabrir"
        ) {

            await Despachos
                .continuarBorrador(
                    idConduce,
                    {
                        permitirCompletado:
                            true
                    }
                );

            return;

        }


        await Despachos
            .continuarBorrador(
                idConduce
            );


    } catch (error) {

        console.error(
            "Error ejecutando acción del conduce:",
            error
        );


        Despachos.notificar(
            error &&
            error.message

                ? error.message

                : "No fue posible abrir el conduce.",
            "error"
        );


    } finally {

        boton.disabled =
            false;


        boton.classList.remove(
            "boton-accion-cargando"
        );


        /*
         * El botón podría dejar de existir si el modal
         * o el módulo se volvió a renderizar.
         */
        if (
            boton.isConnected
        ) {

            boton.innerHTML =
                contenidoOriginal;

        }


        if (
            window.CargadorSistema &&
            typeof CargadorSistema.ocultar ===
                "function"
        ) {

            CargadorSistema.ocultar();

        }

    }

},

configurarEventosListasDashboard() {

    const btnAbiertos =
        document.getElementById(
            "btnMasConducesAbiertos"
        );


    const btnCompletados =
        document.getElementById(
            "btnMasConducesCompletados"
        );


    const tablaAbiertos =
        document.getElementById(
            "tablaAbiertos"
        );


    const tablaCompletados =
        document.getElementById(
            "tablaDespachados"
        );


    // =====================================================
    // CARGAR MÁS CONDUCES ABIERTOS
    // =====================================================

    if (btnAbiertos) {

        btnAbiertos.onclick =
            async function() {

                if (btnAbiertos.disabled) {
                    return;
                }

                await Despachos
                    .cargarPaginaListaDashboard(
                        "abiertos"
                    );

            };

    }


    // =====================================================
    // CARGAR MÁS CONDUCES COMPLETADOS
    // =====================================================

    if (btnCompletados) {

        btnCompletados.onclick =
            async function() {

                if (btnCompletados.disabled) {
                    return;
                }

                await Despachos
                    .cargarPaginaListaDashboard(
                        "completados"
                    );

            };

    }


    // =====================================================
    // ACCIONES DE CONDUCES ABIERTOS
    // =====================================================

    if (tablaAbiertos) {

        tablaAbiertos.onclick =
            async function(evento) {

                const boton =
                    evento.target.closest(
                        "button[data-id-conduce]"
                    );


                if (
                    !boton ||
                    boton.disabled
                ) {
                    return;
                }


                const idConduce =
                    String(
                        boton.dataset.idConduce ||
                        ""
                    ).trim();


                if (!idConduce) {

                    Despachos.notificar(
                        "No fue posible identificar el conduce.",
                        "error"
                    );

                    return;
                }


                if (
                    boton.classList.contains(
                        "btn-ver-despacho"
                    )
                ) {

                    await Despachos.ejecutarAccionListaDashboard(
                        boton,
                        "ver",
                        idConduce
                    );

                    return;
                }

                if (
                    boton.classList.contains(
                        "btn-continuar-borrador"
                    ) ||
                    boton.classList.contains(
                        "btn-continuar-despacho"
                    )
                ) {

                    await Despachos
                        .ejecutarAccionListaDashboard(
                            boton,
                            "continuar",
                            idConduce
                        );

                }

            };

    }


    // =====================================================
    // ACCIONES DE CONDUCES COMPLETADOS
    // =====================================================

    if (tablaCompletados) {

        tablaCompletados.onclick =
            async function(evento) {

                const boton =
                    evento.target.closest(
                        "button[data-id-conduce]"
                    );


                if (
                    !boton ||
                    boton.disabled
                ) {
                    return;
                }


                const idConduce =
                    String(
                        boton.dataset.idConduce ||
                        ""
                    ).trim();


                if (!idConduce) {

                    Despachos.notificar(
                        "No fue posible identificar el conduce.",
                        "error"
                    );

                    return;
                }


                /*
                 * Botón verde:
                 * visualizar el conduce.
                 */
                if (
                    boton.classList.contains(
                        "btn-ver-despacho"
                    )
                ) {

                    await Despachos
                        .ejecutarAccionListaDashboard(
                            boton,
                            "ver",
                            idConduce
                        );

                    return;
                }


                /*
                 * Botón azul:
                 * abrir nuevamente el despacho completado.
                 */
                if (
                    boton.classList.contains(
                        "btn-abrir-completado"
                    )
                ) {

                    await Despachos
                        .ejecutarAccionListaDashboard(
                            boton,
                            "reabrir",
                            idConduce
                        );

                }

            };

    }

},


async cargarResumenDiario() {

    const totalCerrados =
        document.getElementById(
            "totalCerrados"
        );

    const totalPaquetes =
        document.getElementById(
            "totalTarimas"
        );

    const porcentajeMeta =
        document.getElementById(
            "porcentajeMetaDespachos"
        );

    const textoMeta =
        document.getElementById(
            "textoMetaDespachos"
        );

    const cardMeta =
        document.getElementById(
            "cardMetaDespachos"
        );

    if (
        !totalCerrados ||
        !totalPaquetes ||
        !porcentajeMeta ||
        !textoMeta ||
        !cardMeta
    ) {
        return;
    }

    try {

        const respuesta =
            await API.post({
                action:
                    "obtenerResumenDiarioDespachos"
            });

        if (!respuesta.ok) {

            throw new Error(
                respuesta.mensaje ||
                "No fue posible cargar el resumen diario."
            );

        }

        const datos =
            respuesta.data || {};

        totalCerrados.textContent =
            Number(
                datos.completadosHoy || 0
            );

        totalPaquetes.textContent =
            Number(
                datos.paquetesEnviadosHoy || 0
            ).toLocaleString("es-DO");

        porcentajeMeta.textContent =
            `${
                Number(
                    datos.porcentajeCumplimiento || 0
                )
            }%`;

        textoMeta.textContent =
            `Meta: ${
                Number(
                    datos.metaDespachos || 0
                )
            }`;

        cardMeta.classList.remove(
            "semaforo-rojo",
            "semaforo-naranja",
            "semaforo-verde"
        );

        cardMeta.classList.add(
            `semaforo-${
                datos.semaforo || "rojo"
            }`
        );

    } catch (error) {

        console.error(
            "Error cargando resumen diario:",
            error
        );

    }

},

async continuarBorrador(idConduce, opciones = {}) {

    if (Despachos.denegarEdicionAnalista()) return;

    if (!idConduce) {

        Despachos.notificar(
            "No se recibió el identificador del conduce.",
            "error"
        );

        return;

    }

    try {

        const respuesta = await Despachos.consultarBackendConCargador({
            action: "obtenerBorrador",
            idConduce: idConduce
        }, "Cargando conduce", "Estamos recuperando la información del despacho.");

        if (!respuesta.ok) {

            Despachos.notificar(
                respuesta.mensaje ||
                "No fue posible recuperar el conduce.",
                "error"
            );

            return;

        }

        const datos =
            respuesta.data || {};

        Conduce.limpiar();

        Conduce.encabezado = {
            ...Conduce.encabezado,
            ...(datos.encabezado || {})
        };

        Conduce.detalle =
            Array.isArray(datos.detalle)
                ? datos.detalle
                : [];

        const consecutivos =
    Conduce.detalle
        .map(linea => {

            const idLinea =
                String(
                    linea.idLinea || ""
                ).trim();

            /*
             * Nuevo formato:
             * ID_CONDUCE_001
             */
            const coincidencia =
                idLinea.match(
                    /_(\d{3})$/
                );

            if (coincidencia) {
                return Number(
                    coincidencia[1]
                );
            }

            /*
             * Compatibilidad con líneas antiguas
             * cuyos ID eran 1, 2, 3...
             */
            const idAntiguo =
                Number(idLinea);

            return Number.isFinite(idAntiguo)
                ? idAntiguo
                : 0;

        })
        .filter(numero =>
            Number.isFinite(numero)
        );

Conduce.contadorLineas =
    consecutivos.length > 0
        ? Math.max(...consecutivos)
        : 0;

        Despachos.normalizarDetalleCarga();

        const contenidoModal =
            document.getElementById("contenidoModal");

        if (contenidoModal) {
            contenidoModal.classList.remove(
                "modo-visor-conduce"
            );
            contenidoModal.style.pointerEvents = "";
            contenidoModal.style.overflowY = "";
        }

        const modal =
            document.getElementById("modalSistema");

        const titulo =
            document.getElementById("tituloModal");

        const estado =
            String(
                Conduce.encabezado.estado ||
                "Borrador"
            )
                .trim()
                .toLowerCase();

        const sesion = JSON.parse(
            localStorage.getItem("sesion") ||
            sessionStorage.getItem("sesion") ||
            "{}"
        );

        const rol =
            String(sesion.rol || "")
                .trim()
                .toLowerCase();

        const puedeAbrirCompletado =
            opciones.permitirCompletado === true &&
            (
                rol === "administrador" ||
                rol === "encargado"
            );

        if (
            estado === "completado" &&
            !puedeAbrirCompletado
        ) {

            await Despachos.abrirVistaConduce(
                idConduce
            );

            return;

        }

        if (titulo) {
            titulo.textContent =
                estado === "borrador"
                    ? `Continuar ${Conduce.encabezado.noConduce || "borrador"}`
                    : `Finalizar ${Conduce.encabezado.noConduce || "despacho"}`;
        }

        Despachos.activarModalAsistente();

        if (
            estado === "despachado" ||
            estado === "completado"
        ) {

            await Despachos.pasoCalidad();

        } else {

            await Despachos.pasoCarga();

        }

        Despachos.notificar(
            `${Conduce.encabezado.noConduce || "El conduce"} fue cargado correctamente.`,
            "exito"
        );

    } catch (error) {

        console.error(
            "Error recuperando conduce:",
            error
        );

        Despachos.notificar(
            "No fue posible recuperar el conduce.",
            "error"
        );

    }

},


async verConduce(idConduce) {

    if (!idConduce) {

        Despachos.notificar(
            "No se recibió el identificador del conduce.",
            "error"
        );

        return;
    }

    const respuesta = await Despachos.consultarBackendConCargador({
        action: "obtenerBorrador",
        idConduce: idConduce
    }, "Abriendo conduce", "Estamos preparando la visualización del despacho.");

    if (!respuesta.ok) {

        Despachos.notificar(
            respuesta.mensaje ||
            "No fue posible cargar el conduce.",
            "error"
        );

        return;
    }

    const datos = respuesta.data || {};
    const encabezado = datos.encabezado || {};
    const detalle = Array.isArray(datos.detalle)
        ? datos.detalle
        : [];

    const totalUnidades = detalle.reduce(
        (total, linea) =>
            total + Number(linea.cantidad || 0),
        0
    );

    const documentosSAP = [
        encabezado.documentoSAP1,
        encabezado.documentoSAP2,
        encabezado.documentoSAP3,
        encabezado.documentoSAP4
    ].filter(Boolean);

    document.getElementById(
        "tituloModal"
    ).textContent = "Visualización del despacho";
	
	document
    .getElementById("contenidoModal")
    .classList.add("modo-visor-conduce");

    document.getElementById(
        "contenidoModal"
    ).innerHTML = `

        <div class="vista-despacho">

            <div class="vista-despacho-titulo">

                <div>
                    <span>Conduce</span>
                    <strong>
                        ${encabezado.noConduce || "-"}
                    </strong>
                </div>

                <span class="estado-vista-despacho ${String(
                    encabezado.estado || ""
                ).toLowerCase()}">
                    ${encabezado.estado || "-"}
                </span>

            </div>

            <div class="vista-despacho-grid">

                <section class="vista-despacho-tarjeta">

                    <h3>Información del despacho</h3>

                    <div class="vista-dato">
                        <span>Creado por</span>
                        <strong>
                            ${encabezado.supervisor || "-"}
                        </strong>
                    </div>

                    <div class="vista-dato">
                        <span>Chofer</span>
                        <strong>
                            ${encabezado.chofer || "-"}
                        </strong>
                    </div>

                    <div class="vista-dato">
                        <span>Unidad de carga</span>
                        <strong>
                            ${encabezado.unidad || "-"}
                        </strong>
                    </div>

                    <div class="vista-dato">
                        <span>Verificado por QA</span>
                        <strong>
                            ${encabezado.asistenteCalidad || "-"}
                        </strong>
                    </div>

                    <div class="vista-dato">
                        <span>Temperatura</span>
                        <strong>
                            ${encabezado.temperatura || "-"} °C
                        </strong>
                    </div>

                </section>

                <section class="vista-despacho-tarjeta">

                    <h3>Destinos y precintos</h3>

                    <div class="vista-destino">

                        <strong>
                            ${encabezado.destino1 || "-"}
                        </strong>

                        <span>
                            Precinto:
                            ${encabezado.precinto1 || "-"}
                        </span>

                    </div>

                    ${
                        Number(
                            encabezado.cantidadDestinos || 1
                        ) === 2
                            ? `
                            <div class="vista-destino">

                                <strong>
                                    ${encabezado.destino2 || "-"}
                                </strong>

                                <span>
                                    Precinto:
                                    ${encabezado.precinto2 || "-"}
                                </span>

                            </div>
                            `
                            : ""
                    }

                </section>

            </div>

            <section class="vista-despacho-tarjeta">

                <h3>Resumen</h3>

                <div class="vista-resumen-numeros">

                    <div>
                        <span>Líneas</span>
                        <strong>${detalle.length}</strong>
                    </div>

                    <div>
                        <span>Total de unidades</span>
                        <strong>
                            ${totalUnidades.toLocaleString("es-DO")}
                        </strong>
                    </div>

                </div>

            </section>

            <section class="vista-despacho-tarjeta">

                <h3>Documentos SAP</h3>

                <div class="vista-documentos-sap">

                    ${[0, 1, 2, 3].map(indice => `
                        <div>
                            ${documentosSAP[indice] || ""}
                        </div>
                    `).join("")}

                </div>

            </section>

            <section class="vista-despacho-tarjeta">

                <h3>Comentarios u observaciones</h3>

                <p class="vista-observaciones">
                    ${encabezado.observaciones || "Sin observaciones."}
                </p>

            </section>

            <div class="vista-despacho-acciones">

                <button
                    type="button"
                    class="btn-secundario"
                    id="btnCerrarVistaDespacho"
                >
                    Cerrar
                </button>

                <button
                    type="button"
                    class="btn-imprimir-vista"
                    id="btnImprimirVistaDespacho"
                >
                    <i class="fa-solid fa-print"></i>
                    Imprimir
                </button>

            </div>

        </div>
    `;
	
	requestAnimationFrame(() => {

    Despachos
        .ajustarHojaConduceAlVisor();


    const hoja =
        document.getElementById(
            "hojaConduceVisor"
        );


    if (hoja) {

        hoja
            .querySelectorAll("img")
            .forEach(imagen => {

                if (!imagen.complete) {

                    imagen.addEventListener(
                        "load",
                        () => {

                            Despachos
                                .ajustarHojaConduceAlVisor();

                        },
                        {
                            once: true
                        }
                    );

                }

            });

    }

});

    document
    .getElementById("contenidoModal")
    .classList.remove("modo-visor-conduce");

	document
		.getElementById("modalSistema")
		.classList.add("oculto");

    document
        .getElementById("btnCerrarVistaDespacho")
        .onclick = () => {

            document
                .getElementById("modalSistema")
                .classList.add("oculto");

        };

    document
        .getElementById("btnImprimirVistaDespacho")
        .onclick = async () => {

            Conduce.limpiar();

            Conduce.encabezado = {
                ...Conduce.encabezado,
                ...encabezado
            };

            Conduce.detalle = detalle;

            await Despachos.imprimirConduceFinal();

        };

},


/**
 * ============================================================
 * PREPARAR NUEVO CONDUCE
 * ============================================================
 *
 * Antes de abrir el asistente:
 * - consulta las prioridades actuales;
 * - muestra un aviso cuando existen materiales atendibles;
 * - permite revisar las prioridades o continuar el despacho.
 *
 * @param {HTMLButtonElement} boton
 */
async prepararNuevoConduce(
    boton
) {

    if (Despachos.denegarEdicionAnalista()) return;

    if (
        !boton ||
        boton.disabled
    ) {
        return;
    }


    const contenidoOriginal =
        boton.innerHTML;


    boton.disabled =
        true;


    boton.classList.add(
        "boton-accion-cargando"
    );


    boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Consultando...
    `;


    if (
        window.CargadorSistema &&
        typeof CargadorSistema.mostrar ===
            "function"
    ) {

        CargadorSistema.mostrar(
            "Consultando prioridades",
            "Estamos verificando los materiales que requieren abastecimiento en FrioBox."
        );

    }


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


        const datos =
            respuesta.data || {};


        const alerta =
            datos.alertaDespacho || {};


        const resumen =
            datos.resumen || {};


        /*
         * Usamos alertaDespacho como fuente principal.
         * El resumen queda como respaldo por compatibilidad.
         */
        const reposicionInmediata =
            Number(
                alerta.reposicionInmediata ??
                resumen.reposicionInmediata ??
                0
            );


        const reposicionParcial =
            Number(
                alerta.reposicionParcial ??
                resumen.reposicionParcial ??
                0
            );


        const pendienteQA =
            Number(
                alerta.pendienteQA ??
                resumen.pendienteQA ??
                0
            );


        const oportunidadesAtendibles =
            Number(
                alerta.oportunidadesAtendibles ??
                resumen.oportunidadesAtendibles ??
                (
                    reposicionInmediata +
                    reposicionParcial
                )
            );


        const debeMostrarAviso =
            alerta.mostrar === true ||
            oportunidadesAtendibles > 0 ||
            pendienteQA > 0;


        if (!debeMostrarAviso) {

            Conduce.limpiar();


            await Despachos
                .nuevoConduce();


            return;

        }


        Despachos
            .mostrarAvisoPrioridadesNuevoConduce({

                totalPrioridades:
                    Number(
                        alerta.totalPrioridades ??
                        resumen.totalPrioridades ??
                        datos.totalPrioridades ??
                        0
                    ),

                reposicionInmediata:
                    reposicionInmediata,

                reposicionParcial:
                    reposicionParcial,

                pendienteQA:
                    pendienteQA,

                oportunidadesAtendibles:
                    oportunidadesAtendibles

            });


    } catch (error) {

        console.error(
            "Error consultando prioridades antes de crear el conduce:",
            error
        );


        /*
         * La consulta de prioridades es informativa.
         * Si falla, no bloqueamos la operación.
         */
        Despachos.notificar(
            "No fue posible consultar las prioridades. Puede continuar creando el conduce.",
            "advertencia"
        );


        Conduce.limpiar();


        await Despachos
            .nuevoConduce();


    } finally {

        if (
            boton &&
            boton.isConnected
        ) {

            boton.disabled =
                false;


            boton.classList.remove(
                "boton-accion-cargando"
            );


            boton.innerHTML =
                contenidoOriginal;

        }


        if (
            window.CargadorSistema &&
            typeof CargadorSistema.ocultar ===
                "function"
        ) {

            CargadorSistema.ocultar();

        }

    }

},


/**
 * ============================================================
 * AVISO DE PRIORIDADES ANTES DEL NUEVO CONDUCE
 * ============================================================
 *
 * @param {Object} datos
 */
mostrarAvisoPrioridadesNuevoConduce(
    datos = {}
) {

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

        Conduce.limpiar();


        Despachos
            .nuevoConduce();


        return;

    }


    /*
     * Eliminamos modos pertenecientes a otros visores.
     */
    contenido.classList.remove(
        "modo-visor-conduce",
        "modo-centro-despachos",
        "modo-centro-prioridades"
    );


    contenido.classList.add(
        "modo-aviso-prioridades-conduce"
    );


    document.body.classList.remove(
        "centro-despachos-abierto"
    );


    titulo.textContent =
        "Prioridades de abastecimiento";


    const totalPrioridades =
        Number(
            datos.totalPrioridades || 0
        );


    const reposicionInmediata =
        Number(
            datos.reposicionInmediata || 0
        );


    const reposicionParcial =
        Number(
            datos.reposicionParcial || 0
        );


    const pendienteQA =
        Number(
            datos.pendienteQA || 0
        );


    const oportunidadesAtendibles =
        Number(
            datos.oportunidadesAtendibles || 0
        );


    contenido.innerHTML = `

        <section class="aviso-prioridades-conduce">

            <div class="aviso-prioridades-conduce__icono">

                <i class="fa-solid fa-triangle-exclamation"></i>

            </div>


            <div class="aviso-prioridades-conduce__introduccion">

                <span class="aviso-prioridades-conduce__etiqueta">
                    Abastecimiento a FrioBox
                </span>

                <h3>
                    Existen materiales que requieren atención
                </h3>

                <p>
                    Antes de continuar, revise si alguno de estos
                    materiales debe incluirse en el nuevo despacho.
                </p>

            </div>


            <div class="aviso-prioridades-conduce__resumen">

                <article class="total">

                    <span>
                        Prioridades activas
                    </span>

                    <strong>
                        ${totalPrioridades.toLocaleString("es-DO")}
                    </strong>

                </article>


                <article class="atendibles">

                    <span>
                        Pueden abastecerse
                    </span>

                    <strong>
                        ${oportunidadesAtendibles.toLocaleString("es-DO")}
                    </strong>

                </article>


                <article class="inmediatas">

                    <span>
                        Reposición inmediata
                    </span>

                    <strong>
                        ${reposicionInmediata.toLocaleString("es-DO")}
                    </strong>

                </article>


                <article class="parciales">

                    <span>
                        Reposición parcial
                    </span>

                    <strong>
                        ${reposicionParcial.toLocaleString("es-DO")}
                    </strong>

                </article>


                <article class="qa">

                    <span>
                        Pendientes de QA
                    </span>

                    <strong>
                        ${pendienteQA.toLocaleString("es-DO")}
                    </strong>

                </article>

            </div>


            <div class="aviso-prioridades-conduce__mensaje">

                <i class="fa-solid fa-circle-info"></i>

                <p>
                    Los materiales con reposición inmediata o parcial
                    pueden despacharse desde HB. Los pendientes de QA
                    requieren coordinación con Calidad.
                </p>

            </div>


            <div class="aviso-prioridades-conduce__acciones">

                <button
                    type="button"
                    id="btnVerPrioridadesAntesConduce"
                    class="btn-ver-prioridades-aviso"
                >
                    <i class="fa-solid fa-list-check"></i>

                    Ver prioridades
                </button>


                <button
                    type="button"
                    id="btnContinuarNuevoConduce"
                    class="btn-continuar-conduce-aviso"
                >
                    <i class="fa-solid fa-arrow-right"></i>

                    Continuar despacho
                </button>

            </div>

        </section>
    `;


    modal.classList.remove(
        "oculto"
    );


    const btnVerPrioridades =
        document.getElementById(
            "btnVerPrioridadesAntesConduce"
        );


    const btnContinuar =
        document.getElementById(
            "btnContinuarNuevoConduce"
        );


    if (btnVerPrioridades) {

        btnVerPrioridades.onclick =
            async function() {

                if (
                    btnVerPrioridades.disabled
                ) {
                    return;
                }


                btnVerPrioridades.disabled =
                    true;


                btnContinuar &&
                (
                    btnContinuar.disabled =
                        true
                );


                if (
                    window.CargadorSistema &&
                    typeof CargadorSistema.mostrar ===
                        "function"
                ) {

                    CargadorSistema.mostrar(
                        "Abriendo prioridades",
                        "Estamos preparando el Centro de Prioridades FB."
                    );

                }


                try {

                    contenido.classList.remove(
                        "modo-aviso-prioridades-conduce"
                    );


                    if (
                        window.Prioridades &&
                        typeof Prioridades.abrirCentro ===
                            "function"
                    ) {

                        await Prioridades
                            .abrirCentro();

                        return;

                    }


                    throw new Error(
                        "El módulo de Prioridades no está disponible."
                    );


                } catch (error) {

                    console.error(
                        "Error abriendo el Centro de Prioridades:",
                        error
                    );


                    Despachos.notificar(
                        error.message ||
                        "No fue posible abrir las prioridades.",
                        "error"
                    );


                    btnVerPrioridades.disabled =
                        false;


                    if (btnContinuar) {

                        btnContinuar.disabled =
                            false;

                    }


                } finally {

                    if (
                        window.CargadorSistema &&
                        typeof CargadorSistema.ocultar ===
                            "function"
                    ) {

                        CargadorSistema.ocultar();

                    }

                }

            };

    }


    if (btnContinuar) {

        btnContinuar.onclick =
            async function() {

                if (
                    btnContinuar.disabled
                ) {
                    return;
                }


                btnContinuar.disabled =
                    true;


                if (btnVerPrioridades) {

                    btnVerPrioridades.disabled =
                        true;

                }


                if (
                    window.CargadorSistema &&
                    typeof CargadorSistema.mostrar ===
                        "function"
                ) {

                    CargadorSistema.mostrar(
                        "Preparando conduce",
                        "Estamos iniciando el asistente de despacho."
                    );

                }


                try {

                    contenido.classList.remove(
                        "modo-aviso-prioridades-conduce"
                    );


                    Conduce.limpiar();


                    await Despachos
                        .nuevoConduce();


                } catch (error) {

                    console.error(
                        "Error abriendo el nuevo conduce:",
                        error
                    );


                    Despachos.notificar(
                        error.message ||
                        "No fue posible iniciar el nuevo conduce.",
                        "error"
                    );


                    btnContinuar.disabled =
                        false;


                    if (btnVerPrioridades) {

                        btnVerPrioridades.disabled =
                            false;

                    }


                } finally {

                    if (
                        window.CargadorSistema &&
                        typeof CargadorSistema.ocultar ===
                            "function"
                    ) {

                        CargadorSistema.ocultar();

                    }

                }

            };

    }

},


   async nuevoConduce() {

    document.getElementById("tituloModal").textContent =
        "Asistente de Despacho";

    document.getElementById("contenidoModal").innerHTML = `
        <div class="pasos-asistente">
            <div class="paso activo">1. Información</div>
            <div class="paso">2. Destinos</div>
            <div class="paso">3. Carga</div>
            <div class="paso">4. Calidad</div>
        </div>

        <div class="formulario-conduce">

            <h3>Información General</h3>

            <div class="grid-form">

                <div class="campo">
                    <label>Creado por</label>
                    <input
                        type="text"
                        id="supervisorConduce"
                        readonly
                    >
                </div>

                <div class="campo">
                    <label>Chofer</label>

                    <select id="choferConduce">
                        <option value="">
                            Cargando choferes...
                        </option>
                    </select>
                </div>

                <div class="campo">

                    <label>Unidad de carga</label>

                    <div
                        style="
                            display:flex;
                            gap:8px;
                            align-items:center;
                        "
                    >

                        <select
                            id="unidadConduce"
                            style="flex:1;"
                        >
                            <option value="">
                                Cargando unidades...
                            </option>
                        </select>

                        <button
                            type="button"
                            id="btnUnidadTemporal"
                            class="btn-secundario"
                            title="Agregar otro contenedor"
                            style="
                                width:42px;
                                min-width:42px;
                                height:42px;
                                padding:0;
                            "
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                    </div>

                </div>

                <div class="campo">
                    <label>Cantidad de destinos</label>

                    <select id="cantidadDestinos">
                        <option value="1">
                            1 destino
                        </option>

                        <option value="2">
                            2 destinos
                        </option>
                    </select>
                </div>

            </div>

            <div
                id="panelUnidadTemporal"
                class="campo-full"
                style="
                    display:none;
                    margin-top:18px;
                    padding:16px;
                    border:1px solid #dddddd;
                    border-radius:8px;
                "
            >

                <h4 style="margin-top:0;">
                    Agregar otro contenedor
                </h4>

                <div class="grid-form">

                    <div class="campo">
                        <label>Identificación</label>

                        <input
                            type="text"
                            id="identificacionUnidadTemporal"
                            placeholder="Ej.: TTNU-849166-0"
                        >
                    </div>

                    <div class="campo">
                        <label>Tipo de contenedor</label>

                        <input
                            type="text"
                            id="tipoContenedorTemporal"
                            placeholder="Ej.: Refrigerado"
                        >
                    </div>

                    <div class="campo">
                        <label>Tamaño</label>

                        <input
                            type="text"
                            id="tamanoContenedorTemporal"
                            placeholder="Ej.: 40 pies"
                        >
                    </div>

                </div>

                <label
                    style="
                        display:flex;
                        gap:8px;
                        align-items:center;
                        margin-top:12px;
                    "
                >
                    <input
                        type="checkbox"
                        id="guardarUnidadFuturo"
                    >
                    Guardar este contenedor para usos futuros
                </label>

                <label
                    style="
                        display:flex;
                        gap:8px;
                        align-items:center;
                        margin-top:10px;
                    "
                >
                    <input
                        type="checkbox"
                        id="establecerUnidadPredeterminada"
                        disabled
                    >
                    Establecerlo como predeterminado para este chofer
                </label>

                <div
                    style="
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                        margin-top:16px;
                    "
                >

                    <button
                        type="button"
                        class="btn-secundario"
                        id="btnCancelarUnidadTemporal"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        class="btn-verde"
                        id="btnAplicarUnidadTemporal"
                    >
                        Aplicar contenedor
                    </button>

                </div>

            </div>

            <div class="acciones-modal">

                <button
                    class="btn-secundario"
                    id="btnCancelarConduce"
                >
                    Cancelar
                </button>

                <button
                    class="btn-verde"
                    id="btnPasoDestinos"
                >
                    Siguiente
                    <i class="fa-solid fa-arrow-right"></i>
                </button>

            </div>

        </div>
    `;

    const usuario = JSON.parse(
        localStorage.getItem("sesion") ||
        sessionStorage.getItem("sesion") ||
        "{}"
    );

    document.getElementById(
        "supervisorConduce"
    ).value = usuario.nombre || "";

    document
        .getElementById("modalSistema")
        .classList.remove("oculto");

    await Promise.all([
        Despachos.cargarChoferes(),
        Despachos.cargarUnidades()
    ]);

    const selectChofer =
        document.getElementById(
            "choferConduce"
        );

    const selectUnidad =
        document.getElementById(
            "unidadConduce"
        );

    selectChofer.onchange = () => {

        Despachos.seleccionarUnidadPredeterminadaChofer(
            selectChofer.value,
            selectUnidad
        );

    };

    document.getElementById(
        "btnUnidadTemporal"
    ).onclick = () => {

        const panel =
            document.getElementById(
                "panelUnidadTemporal"
            );

        panel.style.display =
            panel.style.display === "none"
                ? "block"
                : "none";

    };

    document.getElementById(
        "guardarUnidadFuturo"
    ).onchange = evento => {

        const guardar =
            evento.target.checked;

        const checkPredeterminado =
            document.getElementById(
                "establecerUnidadPredeterminada"
            );

        checkPredeterminado.disabled =
            !guardar;

        if (!guardar) {
            checkPredeterminado.checked =
                false;
        }

    };

    document.getElementById(
        "btnCancelarUnidadTemporal"
    ).onclick = () => {

        Despachos.cerrarPanelUnidadTemporal();

    };

    document.getElementById(
        "btnAplicarUnidadTemporal"
    ).onclick = async () => {

        await Despachos.aplicarUnidadTemporal();

    };

    document.getElementById(
        "btnCancelarConduce"
    ).onclick = () => {

        document
            .getElementById("modalSistema")
            .classList.add("oculto");

        Conduce.limpiar();

        document.getElementById(
            "tituloModal"
        ).textContent = "";

        document.getElementById(
            "contenidoModal"
        ).innerHTML = "";

    };

    document.getElementById(
        "btnPasoDestinos"
    ).onclick = () => {

        const chofer =
            document.getElementById(
                "choferConduce"
            ).value;

        const unidad =
            document.getElementById(
                "unidadConduce"
            ).value;

        if (chofer === "") {

            Despachos.notificar(
                "Debe seleccionar un chofer.",
                "error"
            );

            return;

        }

        if (unidad === "") {

            Despachos.notificar(
                "Debe seleccionar una unidad de carga.",
                "error"
            );

            return;

        }

        Conduce.encabezado.supervisor =
            usuario.nombre;

        Conduce.encabezado.chofer =
            chofer;

        Conduce.encabezado.unidad =
            unidad;

        Conduce.encabezado.cantidadDestinos =
            Number(
                document.getElementById(
                    "cantidadDestinos"
                ).value
            );

        if (!Conduce.encabezado.idConduce) {
            Conduce.encabezado.idConduce = "";
        }

        if (!Conduce.encabezado.noConduce) {
            Conduce.encabezado.noConduce = "";
        }

        if (!Conduce.encabezado.estado) {
            Conduce.encabezado.estado = "Borrador";
        }

        if (!Conduce.encabezado.fechaCreacion) {
            Conduce.encabezado.fechaCreacion = "";
        }

        if (!Conduce.encabezado.usuarioCreador) {

            Conduce.encabezado.usuarioCreador =
                usuario.usuario ||
                usuario.nombre;

        }

        Despachos.pasoDestinos();

    };

},

rutaDespachoCambio(
    cantidadNueva,
    destino1Nuevo,
    destino2Nuevo
) {

    const cantidadAnterior =
        Number(Conduce.encabezado.cantidadDestinos || 1);

    const destinosAnteriores = [
        Conduce.encabezado.destino1 || "",
        cantidadAnterior === 2
            ? Conduce.encabezado.destino2 || ""
            : ""
    ]
        .filter(Boolean)
        .map(valor => valor.trim())
        .sort();

    const destinosNuevos = [
        destino1Nuevo || "",
        Number(cantidadNueva) === 2
            ? destino2Nuevo || ""
            : ""
    ]
        .filter(Boolean)
        .map(valor => valor.trim())
        .sort();

    if (cantidadAnterior !== Number(cantidadNueva)) {
        return true;
    }

    return JSON.stringify(destinosAnteriores) !==
        JSON.stringify(destinosNuevos);

},

prepararCambioRuta() {

    const cantidadLineas = Conduce.detalle.length;

    if (cantidadLineas > 0) {

        Conduce.detalle = [];
        Conduce.contadorLineas = 0;

        Despachos.notificar(
            `Se eliminaron ${cantidadLineas} línea(s) porque cambió la ruta del despacho.`,
            "advertencia"
        );

    }

    /*
     * El ID técnico se conserva.
     * El backend usará esta marca para reemplazar
     * el número visible según los nuevos destinos.
     */
    Conduce.encabezado.requiereRenumeracion = true;

},


esFrioBoxDestino(valor) {

    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .includes("friobox");

},

async confirmarFrioBoxComoDestinoFinal(
    destino1,
    precinto1,
    destino2,
    precinto2
) {

    const cantidadDestinos =
        Number(
            Conduce.encabezado.cantidadDestinos || 1
        );

    const rutaActual = {
        destino1: destino1,
        precinto1: precinto1,
        destino2: destino2,
        precinto2: precinto2
    };

    if (cantidadDestinos !== 2) {
        return rutaActual;
    }

    const frioBoxEstaPrimero =
        Despachos.esFrioBoxDestino(destino1);

    const frioBoxEstaSegundo =
        Despachos.esFrioBoxDestino(destino2);

    /*
     * Solo preguntamos cuando FrioBox quedó
     * colocado como destino 1.
     */
    if (
        !frioBoxEstaPrimero ||
        frioBoxEstaSegundo
    ) {
        return rutaActual;
    }

    const moverFrioBoxAlFinal =
        await new Promise(resolve => {

            const modalAnterior =
                document.getElementById(
                    "modalConfirmacionFrioBox"
                );

            if (modalAnterior) {
                modalAnterior.remove();
            }

            const modal =
                document.createElement("div");

            modal.id =
                "modalConfirmacionFrioBox";

            modal.className =
                "modal-confirmacion-friobox";

            modal.innerHTML = `
                <div class="modal-confirmacion-friobox__fondo"></div>

                <div
                    class="modal-confirmacion-friobox__tarjeta"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tituloConfirmacionFrioBox"
                >
                    <div class="modal-confirmacion-friobox__icono">
                        <i class="fa-solid fa-route"></i>
                    </div>

                    <div class="modal-confirmacion-friobox__contenido">

                        <h3 id="tituloConfirmacionFrioBox">
                            Confirmar orden de la ruta
                        </h3>

                        <p>
                            FrioBox está colocado como
                            <strong>destino 1</strong>.
                        </p>

                        <p>
                            ¿Desea establecer FrioBox como
                            destino final de la ruta?
                        </p>

                        <div class="modal-confirmacion-friobox__resumen">

                            <div>
                                <span>Orden actual</span>
                                <strong>
                                    1. ${destino1}<br>
                                    2. ${destino2}
                                </strong>
                            </div>

                            <i class="fa-solid fa-arrow-right-arrow-left"></i>

                            <div>
                                <span>Nuevo orden</span>
                                <strong>
                                    1. ${destino2}<br>
                                    2. ${destino1}
                                </strong>
                            </div>

                        </div>

                    </div>

                    <div class="modal-confirmacion-friobox__acciones">

                        <button
                            type="button"
                            class="btn-confirmacion-friobox btn-confirmacion-friobox--no"
                            id="btnMantenerOrdenFrioBox"
                        >
                            No, mantener orden
                        </button>

                        <button
                            type="button"
                            class="btn-confirmacion-friobox btn-confirmacion-friobox--si"
                            id="btnMoverFrioBoxFinal"
                        >
                            Sí, colocar al final
                        </button>

                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cerrar = respuesta => {

                document.removeEventListener(
                    "keydown",
                    manejarEscape
                );

                modal.remove();

                resolve(respuesta);

            };

            const manejarEscape = evento => {

                if (evento.key === "Escape") {
                    cerrar(false);
                }

            };

            document.addEventListener(
                "keydown",
                manejarEscape
            );

            modal
                .querySelector(
                    "#btnMantenerOrdenFrioBox"
                )
                .onclick = () => cerrar(false);

            modal
                .querySelector(
                    "#btnMoverFrioBoxFinal"
                )
                .onclick = () => cerrar(true);

            modal
                .querySelector(
                    ".modal-confirmacion-friobox__fondo"
                )
                .onclick = () => cerrar(false);

            modal
                .querySelector(
                    "#btnMoverFrioBoxFinal"
                )
                .focus();

        });

    if (!moverFrioBoxAlFinal) {
        return rutaActual;
    }

    return {
        destino1: destino2,
        precinto1: precinto2,
        destino2: destino1,
        precinto2: precinto1
    };

},


 async pasoDestinos() {

    const cantidadDestinos =
        String(Conduce.encabezado.cantidadDestinos || 1);

    const centros = await Catalogos.cargarCentros();

    const opcionesCentros = centros.map(centro => `
        <option
            value="${centro.texto}"
            ${centro.texto === Conduce.encabezado.destino1 ? "selected" : ""}
        >
            ${centro.texto}
        </option>
    `).join("");

    document.getElementById("contenidoModal").innerHTML = `

        <div class="pasos-asistente">

            <div class="paso completado">
                1. Información
            </div>

            <div class="paso activo">
                2. Destinos
            </div>

            <div class="paso">
                3. Carga
            </div>

            <div class="paso">
                4. Calidad
            </div>
           
        </div>

        <div class="formulario-conduce">

            <h3>Destinos y Precintos</h3>

            <div class="grid-form">

                <div class="campo">

                    <label>Destino 1</label>

                    <select id="destino1">

                        <option value="">
                            Seleccione destino
                        </option>

                        ${opcionesCentros}

                    </select>

                </div>

                <div class="campo">

                    <label>Precinto 1</label>

                    <input
                        type="text"
                        id="precinto1"
                        placeholder="Digite el precinto"
                        value="${Conduce.encabezado.precinto1 || ""}"
                    >

                </div>

                ${
                    cantidadDestinos === "2"
                        ? `
                        <div class="campo">

                            <label>Destino 2</label>

                            <select id="destino2">

                                <option value="">
                                    Seleccione destino
                                </option>

                                ${centros.map(centro => `
                                    <option
                                        value="${centro.texto}"
                                        ${
                                            centro.texto ===
                                            Conduce.encabezado.destino2
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${centro.texto}
                                    </option>
                                `).join("")}

                            </select>

                        </div>

                        <div class="campo">

                            <label>Precinto 2</label>

                            <input
                                type="text"
                                id="precinto2"
                                placeholder="Digite el precinto"
                                value="${Conduce.encabezado.precinto2 || ""}"
                            >

                        </div>
                        `
                        : ""
                }

            </div>

            <div class="acciones-modal">

                <button
                    class="btn-secundario"
                    id="btnVolverInfo"
                >
                    Volver
                </button>

                <button
                    class="btn-verde"
                    id="btnPasoCarga"
                >
                    Siguiente
                    <i class="fa-solid fa-arrow-right"></i>
                </button>

            </div>

        </div>
    `;

    document.getElementById("btnVolverInfo").onclick = () => {
        Despachos.nuevoConduce();
    };

    document.getElementById("btnPasoCarga").onclick = async () => {

        let destino1 =
            document.getElementById("destino1").value;

        let precinto1 =
            document.getElementById("precinto1").value.trim();

        let destino2 = cantidadDestinos === "2"
            ? document.getElementById("destino2").value
            : "";

        let precinto2 = cantidadDestinos === "2"
            ? document.getElementById("precinto2").value.trim()
            : "";

        if (!destino1) {

            Despachos.notificar(
                "Debe seleccionar el destino 1.",
                "error"
            );

            return;

        }

        if (!precinto1) {

            Despachos.notificar(
                "Debe registrar el precinto 1.",
                "error"
            );

            return;

        }

        if (cantidadDestinos === "2") {

            if (!destino2) {

                Despachos.notificar(
                    "Debe seleccionar el destino 2.",
                    "error"
                );

                return;

            }

            if (destino1 === destino2) {

                Despachos.notificar(
                    "No puede seleccionar el mismo destino dos veces.",
                    "error"
                );

                return;

            }

            if (!precinto2) {

                Despachos.notificar(
                    "Debe registrar el precinto 2.",
                    "error"
                );

                return;

            }

            if (precinto1 === precinto2) {

                Despachos.notificar(
                    "No puede usar el mismo precinto para dos destinos.",
                    "error"
                );

                return;

            }

        }

        if (cantidadDestinos === "2") {

            const rutaConfirmada =
                await Despachos.confirmarFrioBoxComoDestinoFinal(
                    destino1,
                    precinto1,
                    destino2,
                    precinto2
                );

            destino1 =
                rutaConfirmada.destino1;

            precinto1 =
                rutaConfirmada.precinto1;

            destino2 =
                rutaConfirmada.destino2;

            precinto2 =
                rutaConfirmada.precinto2;

        }

        const precinto1EsAnterior =
            precinto1 === Conduce.encabezado.precinto1;

        if (!precinto1EsAnterior) {

            const validar1 = await Despachos.consultarBackendConCargador({
                action: "validarPrecinto",
                no_precinto: precinto1
            }, "Validando precinto", "Estamos verificando el precinto del destino 1.");

            if (!validar1.ok) {

                Despachos.notificar(
                    validar1.mensaje,
                    "error"
                );

                return;

            }

        }

        const precinto2EsAnterior =
            cantidadDestinos === "2" &&
            precinto2 === Conduce.encabezado.precinto2;

        if (
            cantidadDestinos === "2" &&
            !precinto2EsAnterior
        ) {

            const validar2 = await Despachos.consultarBackendConCargador({
                action: "validarPrecinto",
                no_precinto: precinto2
            }, "Validando precinto", "Estamos verificando el precinto del destino 2.");

            if (!validar2.ok) {

                Despachos.notificar(
                    validar2.mensaje,
                    "error"
                );

                return;

            }

        }

        const cambioRuta =
            Despachos.rutaDespachoCambio(
                cantidadDestinos,
                destino1,
                destino2
            );

        if (cambioRuta) {
            Despachos.prepararCambioRuta();
        }

        Conduce.encabezado.cantidadDestinos =
            Number(cantidadDestinos);

        Conduce.encabezado.destino1 = destino1;
        Conduce.encabezado.precinto1 = precinto1;

        Conduce.encabezado.destino2 =
            cantidadDestinos === "2"
                ? destino2
                : "";

        Conduce.encabezado.precinto2 =
            cantidadDestinos === "2"
                ? precinto2
                : "";

        /*
         * Desde este punto el conduce ya existe
         * en Google Sheets, aunque todavía no tenga tarimas.
         */
        const guardado = await Despachos.guardarCambios({
            silencioso: true,
            mostrarCargador: true
        });

        if (!guardado) {
            return;
        }

        Despachos.pasoCarga();

    };

},



async pasoCarga() {

    Despachos.activarModalAsistente();

    document.getElementById("contenidoModal").innerHTML = `
        <div class="barra-superior-carga">

    <div class="pasos-asistente pasos-compactos">

        <div class="paso completado">1. Información</div>
        <div class="paso completado">2. Destinos</div>
        <div class="paso activo">3. Carga</div>
        <div class="paso">4. Calidad</div>
        
    </div>

    <div class="barra-acciones-carga">

        <div class="acciones-carga-izquierda">

            <button class="btn-verde" id="btnAgregarTarima">
                <i class="fa-solid fa-plus"></i>
                Agregar Tarima
            </button>

            <button class="btn-naranja" id="btnAgregarRecorte">
                <i class="fa-solid fa-plus"></i>
                Agregar Parcial
            </button>

        </div>

        <div class="acciones-carga-derecha">

            <button class="btn-secundario" id="btnVolverDestinos">
                Volver
            </button>

            <button class="btn-naranja" id="btnGuardarBorrador">
                <i class="fa-solid fa-floppy-disk"></i>
                Guardar cambios
            </button>

            <button class="btn-secundario" id="btnImprimirBorrador">
                <i class="fa-solid fa-print"></i>
                Imprimir borrador
            </button>

            <button class="btn-verde" id="btnPasoResumen">
                Siguiente
                <i class="fa-solid fa-arrow-right"></i>
            </button>

        </div>

    </div>

</div>
		
        <div class="formulario-conduce">

            <h3>Carga y Distribución del Contenedor</h3>
			
			<div class="resumen-encabezado-carga">

    <div class="resumen-carga-titulo">
        <h4>Datos del despacho</h4>
    </div>

    <div class="resumen-carga-grid">

        <div class="resumen-carga-bloque">

            <div>
                <span>Creado por</span>
                <strong>${Conduce.encabezado.supervisor || "-"}</strong>
            </div>

            <div>
                <span>Chofer</span>
                <strong>${Conduce.encabezado.chofer || "-"}</strong>
            </div>

            <div>
                <span>Unidad de carga</span>
                <strong>${Conduce.encabezado.unidad || "-"}</strong>
            </div>

            <button
                type="button"
                class="btn-editar-resumen"
                id="btnEditarInformacion"
                title="Modificar información general"
            >
                <i class="fa-solid fa-pen"></i>
            </button>

        </div>

        <div class="resumen-carga-bloque">

            <div>
                <span>Destino 1</span>
                <strong>${Conduce.encabezado.destino1 || "-"}</strong>
                <small>Precinto: ${Conduce.encabezado.precinto1 || "-"}</small>
            </div>

            ${
                Number(Conduce.encabezado.cantidadDestinos) === 2
                    ? `
                    <div>
                        <span>Destino 2</span>
                        <strong>${Conduce.encabezado.destino2 || "-"}</strong>
                        <small>Precinto: ${Conduce.encabezado.precinto2 || "-"}</small>
                    </div>
                    `
                    : ""
            }

            <div class="resumen-inspeccion-conduce">

                <span>
                    Formulario de inspección
                </span>

                <strong id="numeroInspeccionConduce">
                    Consultando...
                </strong>

                <small id="estadoInspeccionConduce">
                    Verificando inspección vinculada
                </small>

            </div>

            <button
                type="button"
                class="btn-editar-resumen"
                id="btnEditarDestinos"
                title="Modificar destinos y precintos"
            >
                <i class="fa-solid fa-pen"></i>
            </button>

        </div>

    </div>

</div>

            <div class="contenedor-tarimas">
                <div>
                    <h4>Tarimas utilizadas</h4>
                    <p id="contadorTarimas">0 / 18</p>
                </div>

                <div id="gridContenedor" class="grid-tarimas"></div>
            </div>            

            <div class="tabla-carga">
                <h4>Detalle de la carga</h4>

                <table>
                    <thead>
                        <tr>
								<th>Pos.</th>
								<th>Destino</th>
								<th>Material</th>
								<th>Lote</th>
								<th>F. Producción</th>
								<th>Vence</th>
								<th>B × A</th>
								<th>Cantidad</th>
								<th>Acción</th>
						</tr>
                    </thead>

                    <tbody id="tablaCarga"></tbody>
                </table>
            </div>

        </div>
    `;

    document.getElementById("btnVolverDestinos").onclick = () => {
        Despachos.pasoDestinos();
    };

    document.getElementById("btnAgregarTarima").onclick = () => {
        Despachos.modalAgregarTarima();
    };

    document.getElementById("btnAgregarRecorte").onclick = () => {
    Despachos.modalAgregarRecorte();
	};

    document.getElementById("btnPasoResumen").onclick = async () => {

        const inspeccionDisponible =
            await Despachos.cargarInspeccionConduce({
                notificarSiFalta: true
            });

        if (!inspeccionDisponible) {
            return;
        }

        Despachos.validarPasoCarga();

	};
	
	document.getElementById("btnGuardarBorrador").onclick = async () => {

    await Despachos.guardarCambios({
        mostrarCargador: true
    });

	};

	document.getElementById("btnImprimirBorrador").onclick = () => {
    Despachos.imprimirBorrador();
	};
	
	document.getElementById("btnEditarInformacion").onclick = () => {
    Despachos.editarInformacionConduce();
	};

	document.getElementById("btnEditarDestinos").onclick = () => {
    Despachos.editarDestinosConduce();
	};

    Despachos.refrescarCarga();

    await Despachos.cargarInspeccionConduce();

},


async cargarInspeccionConduce(
    opciones = {}
) {

    const numeroElemento =
        document.getElementById(
            "numeroInspeccionConduce"
        );

    const estadoElemento =
        document.getElementById(
            "estadoInspeccionConduce"
        );

    const idConduce =
        String(
            Conduce.encabezado.idConduce || ""
        ).trim();

    if (!idConduce) {

        Conduce.encabezado.numeroInspeccion =
            "";

        if (numeroElemento) {
            numeroElemento.textContent =
                "No disponible";
        }

        if (estadoElemento) {
            estadoElemento.textContent =
                "Primero debe guardarse el conduce";
            estadoElemento.className =
                "inspeccion-conduce-pendiente";
        }

        if (
            opciones.notificarSiFalta === true
        ) {

            Despachos.notificar(
                "Primero debe guardar el conduce antes de validar su inspección.",
                "advertencia"
            );

        }

        return false;

    }

    try {

        const respuesta =
            await Despachos.consultarBackendConCargador({
                action:
                    "obtenerInspeccionConduce",
                idConduce:
                    idConduce
            }, "Consultando inspección", "Estamos verificando la inspección BASC vinculada.");

        const datos =
            respuesta && respuesta.ok
                ? respuesta.data || {}
                : {};

        const numeroFormulario =
            String(
                datos.numeroFormulario || ""
            ).trim();

        const estado =
            String(
                datos.estado || ""
            ).trim();

        const completada =
            respuesta &&
            respuesta.ok &&
            datos.completada === true &&
            numeroFormulario !== "";

        Conduce.encabezado.numeroInspeccion =
            completada
                ? numeroFormulario
                : "";

        if (numeroElemento) {

            numeroElemento.textContent =
                completada
                    ? numeroFormulario
                    : "Pendiente";

        }

        if (estadoElemento) {

            estadoElemento.textContent =
                completada
                    ? "Inspección completada"
                    : (
                        estado
                            ? `Estado: ${estado}`
                            : "No existe una inspección completada"
                    );

            estadoElemento.className =
                completada
                    ? "inspeccion-conduce-completada"
                    : "inspeccion-conduce-pendiente";

        }

        if (
            !completada &&
            opciones.notificarSiFalta === true
        ) {

            Despachos.notificar(
                "Debe completar la inspección del contenedor antes de pasar al Paso 4.",
                "error"
            );

        }

        return completada;

    } catch (error) {

        console.error(
            "Error consultando la inspección del conduce:",
            error
        );

        Conduce.encabezado.numeroInspeccion =
            "";

        if (numeroElemento) {
            numeroElemento.textContent =
                "Error";
        }

        if (estadoElemento) {
            estadoElemento.textContent =
                "No fue posible comprobar la inspección";
            estadoElemento.className =
                "inspeccion-conduce-pendiente";
        }

        if (
            opciones.notificarSiFalta === true
        ) {

            Despachos.notificar(
                "No fue posible comprobar la inspección del contenedor.",
                "error"
            );

        }

        return false;

    }

},


async editarInformacionConduce() {

    const choferesCatalogo =
        await Catalogos.cargarChoferes();

    const unidadesCatalogo =
        await Catalogos.cargarUnidades();

    const choferes =
        Array.isArray(choferesCatalogo)
            ? choferesCatalogo
            : [];

    const unidades =
        Array.isArray(unidadesCatalogo)
            ? unidadesCatalogo.filter(unidad => {

                const tipo = String(
                    unidad.tipo ||
                    unidad.Tipo ||
                    unidad.tipoUnidad ||
                    unidad.tipo_unidad ||
                    ""
                )
                    .trim()
                    .toLowerCase();

                return tipo === "contenedor";

            })
            : [];

    const opcionesChoferes = choferes.map(chofer => `
        <option
            value="${chofer.texto}"
            ${chofer.texto === Conduce.encabezado.chofer ? "selected" : ""}
        >
            ${chofer.texto}
        </option>
    `).join("");

    const opcionesUnidades = unidades.map(unidad => `
        <option
            value="${unidad.texto}"
            ${unidad.texto === Conduce.encabezado.unidad ? "selected" : ""}
        >
            ${unidad.texto}
        </option>
    `).join("");

    document.getElementById("tituloModal").textContent =
        "Modificar información general";

    document.getElementById("contenidoModal").innerHTML = `

        <div class="formulario-conduce">

            <h3>Información General</h3>

            <div class="grid-form">

                <div class="campo">
                    <label>Supervisor</label>

                    <input
                        type="text"
                        value="${Conduce.encabezado.supervisor || ""}"
                        readonly
                    >
                </div>

                <div class="campo">
                    <label>Chofer</label>

                    <select id="editarChofer">
                        <option value="" disabled hidden></option>
                        ${opcionesChoferes}
                    </select>
                </div>

                <div class="campo">
                    <label>Unidad de carga</label>

                    <select id="editarUnidad">
                        <option value="" disabled hidden></option>
                        ${opcionesUnidades}
                    </select>
                </div>

            </div>

            <div class="acciones-modal">

                <button
                    type="button"
                    class="btn-secundario"
                    id="btnCancelarInformacion"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    class="btn-verde"
                    id="btnGuardarInformacion"
                >
                    Guardar cambios
                </button>

            </div>

        </div>
    `;

    document.getElementById("btnCancelarInformacion").onclick = () => {
        Despachos.pasoCarga();
    };

    document.getElementById("btnGuardarInformacion").onclick = () => {

        const chofer =
            document.getElementById("editarChofer").value;

        const unidad =
            document.getElementById("editarUnidad").value;

        if (!chofer) {
            Despachos.notificar(
                "Debe seleccionar un chofer.",
                "error"
            );
            return;
        }

        if (!unidad) {
            Despachos.notificar(
                "Debe seleccionar una unidad de carga.",
                "error"
            );
            return;
        }

        Conduce.encabezado.chofer = chofer;
        Conduce.encabezado.unidad = unidad;

        Despachos.notificar(
            "Información general actualizada.",
            "exito"
        );

        Despachos.pasoCarga();

    };

},

async editarDestinosConduce() {

    const centros = await Catalogos.cargarCentros();

    const crearOpcionesCentros = seleccionActual => {

        return centros.map(centro => `
            <option
                value="${centro.texto}"
                ${
                    centro.texto === seleccionActual
                        ? "selected"
                        : ""
                }
            >
                ${centro.texto}
            </option>
        `).join("");

    };

    document.getElementById("tituloModal").textContent =
        "Modificar destinos y precintos";

    document.getElementById("contenidoModal").innerHTML = `

        <div class="formulario-conduce">

            <h3>Destinos y Precintos</h3>

            <div class="grid-form">

                <div class="campo">

                    <label>Cantidad de destinos</label>

                    <select id="editarCantidadDestinos">

                        <option
                            value="1"
                            ${
                                Number(
                                    Conduce.encabezado.cantidadDestinos
                                ) === 1
                                    ? "selected"
                                    : ""
                            }
                        >
                            1 destino
                        </option>

                        <option
                            value="2"
                            ${
                                Number(
                                    Conduce.encabezado.cantidadDestinos
                                ) === 2
                                    ? "selected"
                                    : ""
                            }
                        >
                            2 destinos
                        </option>

                    </select>

                </div>

            </div>

            <div
                id="camposEditarDestinos"
                class="grid-form"
                style="margin-top:20px;"
            ></div>

            <div class="acciones-modal">

                <button
                    type="button"
                    class="btn-secundario"
                    id="btnCancelarDestinos"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    class="btn-verde"
                    id="btnGuardarDestinos"
                >
                    Guardar cambios
                </button>

            </div>

        </div>
    `;

    const dibujarCamposDestinos = () => {

        const cantidad =
            document.getElementById(
                "editarCantidadDestinos"
            ).value;

        document.getElementById(
            "camposEditarDestinos"
        ).innerHTML = `

            <div class="campo">

                <label>Destino 1</label>

                <select id="editarDestino1">

                    <option value="">
                        Seleccione destino
                    </option>

                    ${crearOpcionesCentros(
                        Conduce.encabezado.destino1
                    )}

                </select>

            </div>

            <div class="campo">

                <label>Precinto 1</label>

                <input
                    type="text"
                    id="editarPrecinto1"
                    value="${Conduce.encabezado.precinto1 || ""}"
                >

            </div>

            ${
                cantidad === "2"
                    ? `
                    <div class="campo">

                        <label>Destino 2</label>

                        <select id="editarDestino2">

                            <option value="">
                                Seleccione destino
                            </option>

                            ${crearOpcionesCentros(
                                Conduce.encabezado.destino2
                            )}

                        </select>

                    </div>

                    <div class="campo">

                        <label>Precinto 2</label>

                        <input
                            type="text"
                            id="editarPrecinto2"
                            value="${Conduce.encabezado.precinto2 || ""}"
                        >

                    </div>
                    `
                    : ""
            }

        `;

    };

    dibujarCamposDestinos();

    document.getElementById(
        "editarCantidadDestinos"
    ).onchange = dibujarCamposDestinos;

    document.getElementById(
        "btnCancelarDestinos"
    ).onclick = () => {

        Despachos.pasoCarga();

    };

    document.getElementById(
        "btnGuardarDestinos"
    ).onclick = async () => {

        const cantidad =
            document.getElementById(
                "editarCantidadDestinos"
            ).value;

        const destino1 =
            document.getElementById(
                "editarDestino1"
            ).value;

        const precinto1 =
            document.getElementById(
                "editarPrecinto1"
            ).value.trim();

        const destino2 = cantidad === "2"
            ? document.getElementById(
                "editarDestino2"
            ).value
            : "";

        const precinto2 = cantidad === "2"
            ? document.getElementById(
                "editarPrecinto2"
            ).value.trim()
            : "";

        if (!destino1 || !precinto1) {

            Despachos.notificar(
                "Debe completar el destino y precinto 1.",
                "error"
            );

            return;

        }

        if (cantidad === "2") {

            if (!destino2 || !precinto2) {

                Despachos.notificar(
                    "Debe completar el destino y precinto 2.",
                    "error"
                );

                return;

            }

            if (destino1 === destino2) {

                Despachos.notificar(
                    "Los destinos no pueden ser iguales.",
                    "error"
                );

                return;

            }

            if (precinto1 === precinto2) {

                Despachos.notificar(
                    "Los precintos no pueden ser iguales.",
                    "error"
                );

                return;

            }

        }

        const precinto1Cambio =
            precinto1 !==
            Conduce.encabezado.precinto1;

        const precinto2Cambio =
            cantidad === "2" &&
            precinto2 !==
            Conduce.encabezado.precinto2;

        if (precinto1Cambio) {

            const validacion1 = await Despachos.consultarBackendConCargador({
                action: "validarPrecinto",
                no_precinto: precinto1
            }, "Validando precinto", "Estamos verificando el nuevo precinto del destino 1.");

            if (!validacion1.ok) {

                Despachos.notificar(
                    validacion1.mensaje,
                    "error"
                );

                return;

            }

        }

        if (precinto2Cambio) {

            const validacion2 = await Despachos.consultarBackendConCargador({
                action: "validarPrecinto",
                no_precinto: precinto2
            }, "Validando precinto", "Estamos verificando el nuevo precinto del destino 2.");

            if (!validacion2.ok) {

                Despachos.notificar(
                    validacion2.mensaje,
                    "error"
                );

                return;

            }

        }

        const cambioRuta =
            Despachos.rutaDespachoCambio(
                cantidad,
                destino1,
                destino2
            );

        if (cambioRuta) {
            Despachos.prepararCambioRuta();
        }

        Conduce.encabezado.cantidadDestinos =
            Number(cantidad);

        Conduce.encabezado.destino1 = destino1;
        Conduce.encabezado.precinto1 = precinto1;

        Conduce.encabezado.destino2 =
            cantidad === "2"
                ? destino2
                : "";

        Conduce.encabezado.precinto2 =
            cantidad === "2"
                ? precinto2
                : "";

        const guardado = await Despachos.guardarCambios({
            silencioso: true,
            mostrarCargador: true
        });

        if (!guardado) {
            return;
        }

        Despachos.notificar(
            cambioRuta
                ? "Ruta actualizada. La carga anterior fue eliminada."
                : "Destinos y precintos actualizados.",
            cambioRuta ? "advertencia" : "exito"
        );

        Despachos.pasoCarga();

    };

},



async consultarDisponibilidadMaterialCamara(material) {

    const respuestaDisponibilidad = await API.post({
        action: "obtenerDisponibilidadMaterialCamara",
        material: material
    });

    if (!respuestaDisponibilidad || respuestaDisponibilidad.ok === false) {
        throw new Error(
            respuestaDisponibilidad?.mensaje ||
            "No fue posible consultar las cámaras del material."
        );
    }

    const datos = respuestaDisponibilidad.data || respuestaDisponibilidad;

    return {
        accionSinExistencia: String(
            datos.accionSinExistencia || "BLOQUEAR"
        ).trim().toUpperCase(),
        camaras: Array.isArray(datos.camaras) ? datos.camaras : []
    };

},


opcionesCamarasMaterial(disponibilidad, idSeleccionado = "") {

    const bloqueo = disponibilidad.accionSinExistencia === "BLOQUEAR";

    return disponibilidad.camaras.map(camara => {

        const idCamara = String(camara.idCamara || "").trim();
        const codigo = String(camara.codigo || idCamara).trim();
        const nombre = String(camara.nombre || "").trim();
        const tarimas = Number(camara.tarimas || 0);
        const unidades = Number(camara.unidades || 0);
        const sinTarimas = tarimas <= 0;
        const seleccionada = idCamara === String(idSeleccionado || "").trim();
        const texto = `${codigo}${nombre ? ` · ${nombre}` : ""} — ${tarimas.toLocaleString("es-DO")} tarima(s) · ${unidades.toLocaleString("es-DO")} unidades`;

        return `
            <option
                value="${Despachos.escaparHTMLInspecciones(idCamara)}"
                data-codigo="${Despachos.escaparHTMLInspecciones(codigo)}"
                ${seleccionada ? "selected" : ""}
                ${bloqueo && sinTarimas && !seleccionada ? "disabled" : ""}
            >${Despachos.escaparHTMLInspecciones(texto)}</option>
        `;

    }).join("");

},



async modalAgregarTarima() {

    const materiales = await Despachos.ejecutarConCargador(
        "Cargando materiales",
        "Estamos preparando el catálogo para agregar tarimas.",
        () => Catalogos.cargarMateriales()
    );

    document.getElementById("tituloModal").textContent = "Agregar Tarima";

    document.getElementById("contenidoModal").innerHTML = `

        <div class="formulario-conduce">

            <h3>Datos de la Tarima</h3>

            <div class="grid-form">

                <div class="campo campo-full campo-autocomplete">
                    <label>Material</label>
										
                    <input
                        type="text"
                        id="buscarMaterialTarima"
                        placeholder="Escriba código o descripción del material...">

                    <input type="hidden" id="materialTarima">

                    <div id="sugerenciasMaterial" class="lista-sugerencias"></div>
                </div>

                <div class="campo campo-full" id="campoCamaraTarima" hidden>
                    <label for="camaraTarima">Cámara frigorífica de origen</label>
                    <select id="camaraTarima" disabled>
                        <option value="">Seleccione primero el material</option>
                    </select>
                    <small id="detalleCamaraTarima">
                        La salida se registrará cuando el conduce sea completado.
                    </small>
                </div>
				${
    Number(Conduce.encabezado.cantidadDestinos) === 2
        ? `
        <div class="campo campo-full">
            <label>Destino de las tarimas</label>

            <select id="destinoTarima">
                <option value="">Seleccione destino</option>

                <option value="${Conduce.encabezado.destino1}">
                    ${Conduce.encabezado.destino1}
                </option>

                <option value="${Conduce.encabezado.destino2}">
                    ${Conduce.encabezado.destino2}
                </option>
            </select>
        </div>
        `
        : ""
}

                <div class="campo">
                    <label>Fecha de producción</label>
                    <input type="date" id="fechaProduccionTarima">
                </div>

                <div class="campo">
                    <label>Cantidad de tarimas</label>
                    <input type="number" id="cantidadTarimas" min="1" max="18" value="1">
                </div>

            </div>

            <div class="acciones-modal">

                <button class="btn-secundario" id="btnCancelarTarima">
                    Cancelar
                </button>

                <button class="btn-verde" id="btnGuardarTarima">
                    Agregar
                </button>

            </div>

        </div>
    `;

    const inputBuscar = document.getElementById("buscarMaterialTarima");
    const inputMaterial = document.getElementById("materialTarima");
    const lista = document.getElementById("sugerenciasMaterial");
    const campoCamara = document.getElementById("campoCamaraTarima");
    const selectorCamara = document.getElementById("camaraTarima");
    const detalleCamara = document.getElementById("detalleCamaraTarima");
    let disponibilidadCamara = {accionSinExistencia: "BLOQUEAR", camaras: []};

    inputBuscar.addEventListener("input", () => {

        const texto = inputBuscar.value.trim();

        inputMaterial.value = "";
        lista.innerHTML = "";
        campoCamara.hidden = true;
        selectorCamara.disabled = true;
        selectorCamara.innerHTML = `<option value="">Seleccione primero el material</option>`;

        if (texto.length < 2) {
            return;
        }

        const resultados =
            Despachos.buscarMaterialesInteligente(
                materiales,
                texto,
                10
            );

        if (resultados.length === 0) {

            lista.innerHTML = `
                <div class="item-sugerencia">
                    No se encontraron materiales.
                </div>
            `;

            return;
        }

        resultados.forEach(material => {

            const item = document.createElement("div");

            item.className = "item-sugerencia";

            item.innerHTML = `
                <strong>${material.id}</strong>
                <span>${material.descripcion}</span>
            `;

            item.onclick = async () => {

                inputBuscar.value = material.texto;
                inputMaterial.value = material.id;
                lista.innerHTML = "";

                try {

                    disponibilidadCamara = await Despachos.ejecutarConCargador(
                        "Consultando cámaras",
                        "Estamos verificando dónde se encuentra el material seleccionado.",
                        () => Despachos.consultarDisponibilidadMaterialCamara(material.id)
                    );

                    if (String(inputMaterial.value) !== String(material.id)) {
                        return;
                    }

                    campoCamara.hidden = false;
                    selectorCamara.disabled = false;
                    selectorCamara.innerHTML = `
                        <option value="">Seleccione la cámara de origen</option>
                        ${Despachos.opcionesCamarasMaterial(disponibilidadCamara)}
                    `;
                    detalleCamara.textContent = disponibilidadCamara.camaras.length
                        ? "La disponibilidad corresponde al inventario actual. El movimiento se realizará al completar el conduce."
                        : "El material no tiene inventario registrado en cámaras frigoríficas.";

                } catch (error) {

                    campoCamara.hidden = false;
                    selectorCamara.disabled = true;
                    selectorCamara.innerHTML = `<option value="">Consulta no disponible</option>`;
                    detalleCamara.textContent = error.message || "No fue posible consultar las cámaras.";
                    Despachos.notificar(detalleCamara.textContent, "error");

                }

            };

            lista.appendChild(item);

        });

    });

    document.getElementById("btnCancelarTarima").onclick = () => {
        Despachos.pasoCarga();
    };

    document.getElementById("btnGuardarTarima").onclick = async () => {

        const idMaterial = inputMaterial.value;
        const fechaProduccion = document.getElementById("fechaProduccionTarima").value;
        const cantidadTarimas = Number(document.getElementById("cantidadTarimas").value);
		const idCamara = selectorCamara.value;
		const camaraSeleccionada = disponibilidadCamara.camaras.find(
			camara => String(camara.idCamara) === String(idCamara)
		);
		const destino = Number(Conduce.encabezado.cantidadDestinos) === 2
								? document.getElementById("destinoTarima").value
								: Conduce.encabezado.destino1;

        if (idMaterial === "") {
            Despachos.notificar("Debe seleccionar un material válido de la lista.", "error");
            return;
        }

		if (!camaraSeleccionada) {
			Despachos.notificar("Debe seleccionar la cámara frigorífica de origen.", "error");
			return;
		}
		
		if (!destino) {
			Despachos.notificar("Debe seleccionar el destino de las tarimas.",  "error" );
				return;
			}

        if (fechaProduccion === "") {
            Despachos.notificar("Debe seleccionar la fecha de producción.", "error");
            return;
        }

        if (Despachos.fechaEsFutura(fechaProduccion)) {
            Despachos.notificar("La fecha de fabricación no puede ser futura.", "error");
            return;
        }

        if (cantidadTarimas < 1 || cantidadTarimas > 18) {
            Despachos.notificar("La cantidad de tarimas debe estar entre 1 y 18.", "error");
            return;
        }

		if (
			disponibilidadCamara.accionSinExistencia === "BLOQUEAR" &&
			cantidadTarimas > Number(camaraSeleccionada.tarimas || 0)
		) {
			Despachos.notificar(
				`La cámara ${camaraSeleccionada.codigo || "seleccionada"} dispone de ${Number(camaraSeleccionada.tarimas || 0)} tarima(s) de este material.`,
				"error"
			);
			return;
		}

        if ((Conduce.detalle.length + cantidadTarimas) > 18) {
            Despachos.notificar("No puede exceder las 18 posiciones del contenedor.", "error");
            return;
        }

        const material = materiales.find(m => m.id === idMaterial);
		const origenCamara = {
			idCamara: camaraSeleccionada.idCamara,
			codigoCamara: camaraSeleccionada.codigo || "",
			observacionCamara: `Origen seleccionado al agregar tarima: ${camaraSeleccionada.codigo || camaraSeleccionada.idCamara}`
		};

        for (let i = 0; i < cantidadTarimas; i++) {
            Despachos.agregarLinea(material, fechaProduccion, destino, "Tarima", origenCamara);
        }
		
		const guardado = await Despachos.guardarCambios({
			silencioso: true,
			mostrarCargador: true
		});

		if (!guardado) {
			return;
		}

        Despachos.notificar(
            `${cantidadTarimas} tarima(s) agregadas correctamente.`,
            "exito"
        );

        setTimeout(() => {
            Despachos.pasoCarga();
        }, 500);

    };

},	


async modalAgregarRecorte() {

    const materiales = await Despachos.ejecutarConCargador(
        "Cargando materiales",
        "Estamos preparando el catálogo para agregar parciales.",
        () => Catalogos.cargarMateriales()
    );

    document.getElementById("tituloModal").textContent = "Agregar Parcial";

    document.getElementById("contenidoModal").innerHTML = `

        <div class="formulario-conduce">

            <h3>Datos del Parcial</h3>

            <div class="grid-form">

                <div class="campo campo-full campo-autocomplete">

                    <label>Material</label>
										
                    <input
                        type="text"
                        id="buscarMaterialRecorte"
                        placeholder="Escriba el código o descripción del material..."
                        autocomplete="off"
                    >

                    <input type="hidden" id="materialRecorte">

                    <div
                        id="sugerenciasMaterialRecorte"
                        class="lista-sugerencias"></div>

                </div>
				${
    Number(Conduce.encabezado.cantidadDestinos) === 2
        ? `
        <div class="campo campo-full">
            <label>Destino del parcial</label>

            <select id="destinoRecorte">
                <option value="">Seleccione destino</option>

                <option value="${Conduce.encabezado.destino1}">
                    ${Conduce.encabezado.destino1}
                </option>

                <option value="${Conduce.encabezado.destino2}">
                    ${Conduce.encabezado.destino2}
                </option>
            </select>
        </div>
        `
        : ""
}

                <div class="campo">

                    <label>Fecha de producción</label>

                    <input
                        type="date"
                        id="fechaProduccionRecorte"
                    >

                </div>

                <div class="campo">

                    <label>Cantidad del parcial</label>

                    <input
                        type="number"
                        id="cantidadRecorte"
                        min="1"
                        value="1"
                    >

                </div>

            </div>

            <div class="acciones-modal">

                <button
                    class="btn-secundario"
                    id="btnCancelarRecorte">

                    Cancelar

                </button>

                <button
                    class="btn-naranja"
                    id="btnGuardarRecorte">

                    Agregar Parcial

                </button>

            </div>

        </div>
    `;

    const inputBuscar = document.getElementById("buscarMaterialRecorte");
    const inputMaterial = document.getElementById("materialRecorte");
    const lista = document.getElementById("sugerenciasMaterialRecorte");
    inputBuscar.addEventListener("input", () => {

        const texto = inputBuscar.value.trim();

        inputMaterial.value = "";
        lista.innerHTML = "";

        if (texto.length < 2) {
            return;
        }

        const resultados =
            Despachos.buscarMaterialesInteligente(
                materiales,
                texto,
                10
            );

        if (resultados.length === 0) {

            lista.innerHTML = `
                <div class="item-sugerencia">
                    No se encontraron materiales.
                </div>
            `;

            return;
        }

        resultados.forEach(material => {

            const item = document.createElement("div");

            item.className = "item-sugerencia";

            item.innerHTML = `
                <strong>${material.id}</strong>
                <span>${material.descripcion}</span>
            `;

            item.onclick = () => {

                inputBuscar.value = material.texto;
                inputMaterial.value = material.id;
                lista.innerHTML = "";

            };

            lista.appendChild(item);

        });

    });

    document.getElementById("btnCancelarRecorte").onclick = () => {
        Despachos.pasoCarga();
    };

    document.getElementById("btnGuardarRecorte").onclick = () => {

        const idMaterial = inputMaterial.value;
		
		const destino = Number(Conduce.encabezado.cantidadDestinos) === 2
			? document.getElementById("destinoRecorte").value
			: Conduce.encabezado.destino1;

        const fechaProduccion =
            document.getElementById("fechaProduccionRecorte").value;

        const cantidad =
            Number(document.getElementById("cantidadRecorte").value);

        if (idMaterial === "") {

            Despachos.notificar(
                "Debe seleccionar un material válido de la lista.",
                "error"
            );

            return;

        }
		
		if (!destino) { Despachos.notificar("Debe seleccionar el destino del parcial.", "error" );
				return;
			}

        if (fechaProduccion === "") {

            Despachos.notificar(
                "Debe seleccionar la fecha de producción.",
                "error"
            );

            return;

        }

        if (Despachos.fechaEsFutura(fechaProduccion)) {

            Despachos.notificar(
                "La fecha de fabricación no puede ser futura.",
                "error"
            );

            return;

        }

        if (!Number.isInteger(cantidad) || cantidad < 1) {

            Despachos.notificar(
                "La cantidad del parcial debe ser mayor que cero.",
                "error"
            );

            return;

        }

        const material = materiales.find(
            item => item.id === idMaterial
        );

        if (!material) {

            Despachos.notificar(
                "No fue posible encontrar el material seleccionado.",
                "error"
            );

            return;

        }

        Despachos.agregarRecorte(
			material,
			fechaProduccion,
			cantidad,
			destino
		);

        Despachos.notificar(
            `Parcial de ${cantidad} ${material.unidad_medida} agregado correctamente.`,
            "exito"
        );

        setTimeout(() => {

            Despachos.pasoCarga();

        }, 500);

    };

},


generarIdLinea() {

    const idConduce =
        String(
            Conduce.encabezado.idConduce || ""
        ).trim();

    if (!idConduce) {

        throw new Error(
            "El conduce debe estar guardado antes de agregar líneas."
        );

    }

    Conduce.contadorLineas =
        Number(
            Conduce.contadorLineas || 0
        ) + 1;

    const consecutivo =
        String(
            Conduce.contadorLineas
        ).padStart(3, "0");

    return `${idConduce}_${consecutivo}`;

},

async agregarLinea(
    material,
    fechaProduccion,
    destino,
    tipo = "Tarima",
    camara = {}
) {

    const idLinea =
    Despachos.generarIdLinea();

	const ordenCreacion =
    Conduce.contadorLineas;

    let lote = "";
    let fechaVencimiento = "";

    if (fechaProduccion) {

        lote = Despachos.calcularLote(
            fechaProduccion
        );

        fechaVencimiento =
            Despachos.calcularVencimiento(
                fechaProduccion,
                material.vida_util
            );

    }

    const linea = {

        idLinea: idLinea,

        tipo: tipo,

        destino: destino,

        material: material.id,

        descripcion:
            material.descripcion,

        unidad:
            material.unidad_medida,

        fechaProduccion:
            fechaProduccion,

        lote: lote,

        fechaVencimiento:
            fechaVencimiento,

        base:
            Number(material.base || 0),

        altura:
            Number(material.altura || 0),

        recorte: 0,

        cantidad:
            Number(material.base || 0) *
            Number(material.altura || 0),

        idCamara:
            String(camara.idCamara || "").trim(),

        codigoCamara:
            String(camara.codigoCamara || "").trim(),

        observacionCamara:
            String(camara.observacionCamara || "").trim(),
			
		ordenCreacion: ordenCreacion,
		posicion: 0,

    };
	
	
    Conduce.detalle.push(linea);
	
	Despachos.normalizarDetalleCarga();

    Despachos.refrescarCarga();

    
},




async agregarRecorte(
    material,
    fechaProduccion,
    cantidad,
    destino
) {

    const idLinea =
    Despachos.generarIdLinea();

	const ordenCreacion =
    Conduce.contadorLineas;

    const lote =
        Despachos.calcularLote(
            fechaProduccion
        );

    const fechaVencimiento =
        Despachos.calcularVencimiento(
            fechaProduccion,
            material.vida_util
        );

    const linea = {

        idLinea:
			idLinea,

        tipo: "Recorte",

        destino: destino,

        material: material.id,

        descripcion:
            material.descripcion,

        unidad:
            material.unidad_medida,

        fechaProduccion:
            fechaProduccion,

        lote: lote,

        fechaVencimiento:
            fechaVencimiento,

        base: 0,

        altura: 0,

        recorte:
            Number(cantidad),

        cantidad:
            Number(cantidad),
			
		ordenCreacion:
			ordenCreacion,
		posicion: "",	

    };

		Conduce.detalle.push(linea);

		Despachos.normalizarDetalleCarga();
		Despachos.refrescarCarga();

		await Despachos.guardarCambios({
			silencioso: true,
			mostrarCargador: true
		});

},


normalizarDetalleCarga() {

    const destinosOrdenados = [
        Conduce.encabezado.destino1 || "",
        Conduce.encabezado.destino2 || ""
    ].filter(Boolean);

    const obtenerOrdenDestino = destino => {

        const indice = destinosOrdenados.indexOf(
            destino || ""
        );

        return indice === -1
            ? destinosOrdenados.length
            : indice;

    };

    const tarimas = Conduce.detalle
        .filter(linea => linea.tipo === "Tarima")
        .sort((a, b) => {

            const diferenciaDestino =
                obtenerOrdenDestino(a.destino) -
                obtenerOrdenDestino(b.destino);

            if (diferenciaDestino !== 0) {
                return diferenciaDestino;
            }

            return Number(a.ordenCreacion || a.idLinea || 0) -
                Number(b.ordenCreacion || b.idLinea || 0);

        });

    const recortes = Conduce.detalle
        .filter(linea => linea.tipo === "Recorte")
        .sort((a, b) => {

            const diferenciaDestino =
                obtenerOrdenDestino(a.destino) -
                obtenerOrdenDestino(b.destino);

            if (diferenciaDestino !== 0) {
                return diferenciaDestino;
            }

            return Number(a.ordenCreacion || a.idLinea || 0) -
                Number(b.ordenCreacion || b.idLinea || 0);

        });

    tarimas.forEach((linea, index) => {
        linea.posicion = index + 1;
    });

    recortes.forEach(linea => {
        linea.posicion = "";
    });

    Conduce.detalle = [
        ...tarimas,
        ...recortes
    ];

},



refrescarCarga() {

     const contador =  document.getElementById("contadorTarimas");

    const contenedor = document.getElementById("gridContenedor");

    const tbody =     document.getElementById("tablaCarga");

    if (!contador || !contenedor || !tbody) {
        return;
    }

    Despachos.normalizarDetalleCarga();

	

    const tarimas = Conduce.detalle.filter(linea => linea.tipo === "Tarima");
    const recortes = Conduce.detalle.filter(linea => linea.tipo === "Recorte");

    const totalTarimas = tarimas.length;

    contador.textContent = `${totalTarimas} / 18`;

    contenedor.innerHTML = "";

    const posiciones = [
    1, 2, 3, 4, 5, 6, 7, 8, 9,
    10, 11, 12, 13, 14, 15, 16, 17, 18
];

    posiciones.forEach(posicion => {

        const ocupada = posicion <= totalTarimas;

        contenedor.innerHTML += `
            <div
                class="espacio-contenedor ${ocupada ? "ocupado" : ""}"
                onclick="Despachos.resaltarFilaTarima(${posicion})"
                ondblclick="Despachos.editarPorPosicion(${posicion})"
            >
                ${String(posicion).padStart(2, "0")}
            </div>
        `;

    });

    tbody.innerHTML = "";

    if (tarimas.length === 0 && recortes.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="tabla-vacia">
                    No hay líneas agregadas.
                </td>
            </tr>
        `;

        return;

    }
	

    tarimas.forEach((linea, index) => {

        const posicion = linea.posicion;

        tbody.innerHTML += `
            <tr id="fila-pos-${posicion}">
                <td>${posicion}</td>
				<td>${linea.destino || "-"}</td>
                <td>
                    <strong>${linea.material}</strong><br>
                    <small>${linea.descripcion}</small><br>
                    <small><i class="fa-solid fa-warehouse"></i> ${linea.codigoCamara || "Sin cámara asignada"}</small>
                </td>
				<td>${linea.lote || "-"}</td>

                <td>${linea.fechaProduccion || "-"}</td>

                <td>${linea.fechaVencimiento || "-"}</td>

                <td>${linea.base} × ${linea.altura}</td>

                <td>${linea.cantidad}</td>

                <td>
                    <button class="btn-icono" onclick='Despachos.editarLinea(${JSON.stringify(linea.idLinea)})'>
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button class="btn-icono rojo" onclick='Despachos.eliminarLinea(${JSON.stringify(linea.idLinea)})'>
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;

    });

    if (recortes.length > 0) {

        tbody.innerHTML += `
            <tr class="fila-separador-recorte">
                <td colspan="9">Parciales</td>
            </tr>
        `;

        recortes.forEach(linea => {

            tbody.innerHTML += `
                <tr class="fila-recorte">
                    <td>—</td>
					<td>${linea.destino || "-"}</td>
                    <td>
                        <strong>${linea.material}</strong><br>
                        <small>${linea.descripcion}</small>
                    </td>					
                    <td>${linea.lote || "-"}</td>

                    <td>${linea.fechaProduccion || "-"}</td>

                    <td>${linea.fechaVencimiento || "-"}</td>

                    <td>—</td>

                    <td>${linea.cantidad}</td>

                    <td>
                        <button class="btn-icono" onclick='Despachos.editarLinea(${JSON.stringify(linea.idLinea)})'>
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button class="btn-icono rojo" onclick='Despachos.eliminarLinea(${JSON.stringify(linea.idLinea)})'>
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;

        });

    }

},

resaltarFilaTarima(posicion) {

    document.querySelectorAll("#tablaCarga tr").forEach(fila => {
        fila.classList.remove("fila-seleccionada");
    });

    const fila = document.getElementById(`fila-pos-${posicion}`);

    if (fila) {
        fila.classList.add("fila-seleccionada");
    }

},

editarPorPosicion(posicion) {

    const tarimas = Conduce.detalle.filter(linea => linea.tipo === "Tarima");
    const linea = tarimas[posicion - 1];

    if (!linea) return;

    Despachos.editarLinea(linea.idLinea);

},

async editarLinea(idLinea) {

    const linea = Conduce.detalle.find(
			item =>
				String(item.idLinea) ===
				String(idLinea)
		);

    if (!linea) {
        Despachos.notificar("No se encontró la línea seleccionada.", "error");
        return;
    }

    let disponibilidadEdicion = {
        accionSinExistencia: "BLOQUEAR",
        camaras: []
    };

    if (linea.tipo === "Tarima") {

        try {

            disponibilidadEdicion = await Despachos.ejecutarConCargador(
                "Consultando cámaras",
                "Estamos verificando el origen de la tarima.",
                () => Despachos.consultarDisponibilidadMaterialCamara(linea.material)
            );

        } catch (error) {

            Despachos.notificar(
                error.message || "No fue posible consultar las cámaras del material.",
                "error"
            );

            return;

        }

    }

    document.getElementById("tituloModal").textContent = "Editar Tarima";

    document.getElementById("contenidoModal").innerHTML = `

        <div class="formulario-conduce">

            <h3>${linea.descripcion}</h3>

            <div class="grid-form">

                <div class="campo">
                    <label>Material</label>
                    <input type="text" value="${linea.material}" readonly>
                </div>

                ${linea.tipo === "Tarima" ? `
                    <div class="campo">
                        <label for="editCamaraTarima">Cámara frigorífica de origen</label>
                        <select id="editCamaraTarima">
                            <option value="">Seleccione la cámara de origen</option>
                            ${Despachos.opcionesCamarasMaterial(
                                disponibilidadEdicion,
                                linea.idCamara
                            )}
                        </select>
                    </div>
                ` : ""}

                <div class="campo">
                    <label>Fecha producción</label>
                    <input type="date" id="editFechaProduccion" value="${linea.fechaProduccion || ""}">
                </div>

                <div class="campo">
                    <label>Base</label>
                    <input type="number" id="editBase" min="0" value="${linea.base}">
                </div>

                <div class="campo">
                    <label>Altura</label>
                    <input type="number" id="editAltura" min="0" value="${linea.altura}">
                </div>

                <div class="campo">
                    <label>Parcial</label>
                    <input type="number" id="editRecorte" min="0" value="${linea.recorte}">
                </div>

                <div class="campo">
                    <label>Cantidad</label>
                    <input type="number" id="editCantidad" value="${linea.cantidad}" readonly>
                </div>

            </div>

            <div class="acciones-modal">

                <button class="btn-secundario" id="btnCancelarEditar">
                    Cancelar
                </button>

                <button class="btn-verde" id="btnGuardarEditar">
                    Guardar cambios
                </button>

            </div>

        </div>
    `;

    const recalcular = () => {
        const base = Number(document.getElementById("editBase").value) || 0;
        const altura = Number(document.getElementById("editAltura").value) || 0;
        const recorte = Number(document.getElementById("editRecorte").value) || 0;

        document.getElementById("editCantidad").value = (base * altura) + recorte;
    };

    document.getElementById("editBase").oninput = recalcular;
    document.getElementById("editAltura").oninput = recalcular;
    document.getElementById("editRecorte").oninput = recalcular;

    document.getElementById("btnCancelarEditar").onclick = () => {
        Despachos.pasoCarga();
    };

    
     document.getElementById( "btnGuardarEditar").onclick = async () => {

    const fechaAnterior =
        linea.fechaProduccion || "";

    const fechaNueva =
        document.getElementById(
            "editFechaProduccion"
        ).value;

    if (linea.tipo === "Tarima") {

        const selectorCamaraEdicion =
            document.getElementById("editCamaraTarima");

        const camaraEdicion = disponibilidadEdicion.camaras.find(
            camara =>
                String(camara.idCamara) ===
                String(selectorCamaraEdicion?.value || "")
        );

        if (!camaraEdicion) {

            Despachos.notificar(
                "Debe seleccionar la cámara frigorífica de origen.",
                "error"
            );

            return;

        }

        linea.idCamara = String(camaraEdicion.idCamara || "").trim();
        linea.codigoCamara = String(camaraEdicion.codigo || "").trim();
        linea.observacionCamara =
            `Origen actualizado al editar tarima: ${linea.codigoCamara || linea.idCamara}`;

    }

    if (
        fechaNueva &&
        Despachos.fechaEsFutura(fechaNueva)
    ) {

        Despachos.notificar(
            "La fecha de fabricación no puede ser futura.",
            "error"
        );

        return;

    }

    linea.fechaProduccion =
        fechaNueva;

    linea.base = Number(
        document.getElementById(
            "editBase"
        ).value
    ) || 0;

    linea.altura = Number(
        document.getElementById(
            "editAltura"
        ).value
    ) || 0;

    linea.recorte = Number(
        document.getElementById(
            "editRecorte"
        ).value
    ) || 0;

    linea.cantidad =
        (linea.base * linea.altura) +
        linea.recorte;

    if (linea.fechaProduccion) {

        const materiales =
            await Despachos.ejecutarConCargador(
                "Consultando material",
                "Estamos verificando los datos del material.",
                () => Catalogos.cargarMateriales()
            );

        const material =
            (Array.isArray(materiales) ? materiales : [])
                .find(
                    item =>
                        String(item.id || "").trim() ===
                        String(linea.material || "").trim()
                );

        if (!material) {

            Despachos.notificar(
                `No fue posible localizar el material ${linea.material || ""} para calcular su vencimiento.`,
                "error"
            );

            return;
        }

        linea.lote =
            Despachos.calcularLote(
                linea.fechaProduccion
            );

        linea.fechaVencimiento =
            Despachos.calcularVencimiento(
                linea.fechaProduccion,
                material.vida_util
            );

    } else {

        linea.lote = "";
        linea.fechaVencimiento = "";

    }

    if (
        fechaAnterior !== fechaNueva &&
        fechaNueva !== ""
    ) {

        await Despachos.popupAplicarFecha(linea);
        return;

    }

    const guardado =
        await Despachos.guardarCambios({
            silencioso: true,
            mostrarCargador: true
        });

    if (!guardado) {
        return;
    }

    Despachos.notificar(
        "Tarima actualizada correctamente.",
        "exito"
    );

    Despachos.pasoCarga();

};
    

},


async eliminarLinea(idLinea) {

    const existe = Conduce.detalle.some(
			linea =>
				String(linea.idLinea) ===
				String(idLinea)
		);

    if (!existe) {

        Despachos.notificar(
            "No se encontró la línea seleccionada.",
            "error"
        );

        return;

    }

    Conduce.detalle = Conduce.detalle.filter(
			linea =>
				String(linea.idLinea) !==
				String(idLinea)
		);

    Despachos.normalizarDetalleCarga();
    Despachos.refrescarCarga();

    const guardado =
        await Despachos.guardarCambios({
            silencioso: true,
            mostrarCargador: true
        });

    if (!guardado) {
        return;
    }

    Despachos.notificar(
        "Línea eliminada y posiciones reorganizadas.",
        "exito"
    );

},

calcularLote(fechaProduccion) {

    const fecha = new Date(fechaProduccion + "T00:00:00");

    const inicioAno = new Date(fecha.getFullYear(), 0, 1);
    const dias = Math.floor((fecha - inicioAno) / (24 * 60 * 60 * 1000));

    const semana = Math.ceil((dias + inicioAno.getDay() + 1) / 7);
    const semanaTexto = String(semana).padStart(2, "0");
    const anoTexto = String(fecha.getFullYear()).slice(-2);

    return semanaTexto + anoTexto;

},

calcularVencimiento(fechaProduccion, vidaUtil) {

    const fecha = new Date(fechaProduccion + "T00:00:00");

    const meses = Number(String(vidaUtil).replace(",", ".")) * 12;

    fecha.setMonth(fecha.getMonth() + meses);

    return fecha.toISOString().split("T")[0];

},

fechaEsFutura(fecha) {

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    const fechaIngresada = new Date(fecha + "T00:00:00");

    return fechaIngresada > hoy;

},
  
  
  async popupAplicarFecha(lineaBase) {

    const mismasLineas = Conduce.detalle.filter(linea =>
        linea.material === lineaBase.material &&
        linea.idLinea !== lineaBase.idLinea
    );

    const guardarEdicion = async (aplicadaATodas = false) => {

        const guardado =
            await Despachos.guardarCambios({
                silencioso: true,
                mostrarCargador: true
            });

        if (!guardado) {
            return false;
        }

        Despachos.notificar(
            aplicadaATodas
                ? "Fecha aplicada al mismo material y cambios guardados correctamente."
                : "Tarima actualizada correctamente.",
            "exito"
        );

        Despachos.pasoCarga();
        return true;
    };

    if (mismasLineas.length === 0) {
        await guardarEdicion(false);
        return;
    }

    document.getElementById("tituloModal").textContent = "Aplicar fecha";

    document.getElementById("contenidoModal").innerHTML = `

        <div class="formulario-conduce">

            <h3>Aplicar fecha al mismo material</h3>

            <p>
                Hay <strong>${mismasLineas.length + 1}</strong> tarima(s) del material:
            </p>

            <h3>${lineaBase.descripcion}</h3>

            <p>
                ¿Quieres aplicar esta misma fecha de fabricación,
                lote y vencimiento a todas?
            </p>

            <div class="acciones-modal">

                <button class="btn-secundario" id="btnNoAplicarFecha">
                    No
                </button>

                <button class="btn-verde" id="btnSiAplicarFecha">
                    Sí, aplicar
                </button>

            </div>

        </div>

    `;

    document.getElementById("btnNoAplicarFecha").onclick = async () => {
        await guardarEdicion(false);
    };

    document.getElementById("btnSiAplicarFecha").onclick = async () => {

        mismasLineas.forEach(linea => {
            linea.fechaProduccion = lineaBase.fechaProduccion;
            linea.lote = lineaBase.lote;
            linea.fechaVencimiento = lineaBase.fechaVencimiento;
        });

        await guardarEdicion(true);

    };

},

validarPasoCarga() {

    const tarimas = Conduce.detalle.filter(
        linea => linea.tipo === "Tarima"
    );

    if (tarimas.length === 0) {
        Despachos.notificar(
            "Debe agregar al menos una tarima antes de continuar.",
            "error"
        );
        return;
    }

    if (tarimas.length > 18) {
        Despachos.notificar(
            "El contenedor no puede superar las 18 tarimas.",
            "error"
        );
        return;
    }

    const lineasIncompletas = Conduce.detalle.filter(linea =>
        !linea.fechaProduccion ||
        !linea.lote ||
        !linea.fechaVencimiento
    );

    if (lineasIncompletas.length > 0) {

        Despachos.notificar(
            `Hay ${lineasIncompletas.length} línea(s) sin fecha, lote o vencimiento.`,
            "error"
        );

        return;
    }

    const cantidadesInvalidas = Conduce.detalle.filter(
        linea => Number(linea.cantidad) <= 0
    );

    if (cantidadesInvalidas.length > 0) {
        Despachos.notificar(
            "Existen líneas con una cantidad inválida.",
            "error"
        );
        return;
    }

    Despachos.pasoCalidad();

},

async pasoCalidad() {

	Despachos.activarModalAsistente();

	const contenidoModal =
    document.getElementById("contenidoModal");

contenidoModal.classList.remove(
    "modo-visor-conduce"
);

contenidoModal.style.pointerEvents = "auto";
contenidoModal.style.overflowY = "auto";

    let personalCalidad = [];

    try {

        personalCalidad =
            await Catalogos.cargarCalidad();

        Despachos.activarModalAsistente();

    } catch (error) {

        console.error(
            "Error cargando Calidad:",
            error
        );

        Despachos.notificar(
            "No fue posible cargar el personal de Calidad.",
            "error"
        );

        return;

    }

    const opcionesCalidad =
        personalCalidad
            .map(persona => `

                <option
                    value="${persona.texto}"
                    ${
                        persona.texto ===
                        Conduce.encabezado.asistenteCalidad
                            ? "selected"
                            : ""
                    }
                >
                    ${persona.texto}
                </option>

            `)
            .join("");
			
			

    document.getElementById(
        "tituloModal"
    ).textContent = "Finalizar carga";

    document.getElementById(
        "contenidoModal"
    ).innerHTML = `

        <div class="pasos-asistente">

            <div class="paso completado">
                1. Información
            </div>

            <div class="paso completado">
                2. Destinos
            </div>

            <div class="paso completado">
                3. Carga
            </div>

            <div class="paso activo">
                4. Finalizar carga
            </div>
            
        </div>

        <div class="formulario-conduce">

            <div class="titulo-finalizar-carga">

					<h3>Finalizar carga</h3>

					<strong>
						${Conduce.encabezado.noConduce || "-"}
					</strong>

				</div>

            <div class="resumen-finalizar-carga">

                <div class="tarjeta-finalizar">

                    <h4>Información del despacho</h4>

                    <div class="dato-finalizar">
                        <span>Conduce</span>
                        <strong>
                            ${Conduce.encabezado.noConduce || "-"}
                        </strong>
                    </div>

                    <div class="dato-finalizar">
                        <span>Creado por</span>
                        <strong>
                            ${Conduce.encabezado.supervisor || "-"}
                        </strong>
                    </div>

                    <div class="dato-finalizar">
                        <span>Chofer</span>
                        <strong>
                            ${Conduce.encabezado.chofer || "-"}
                        </strong>
                    </div>

                    <div class="dato-finalizar">
                        <span>Unidad de carga</span>
                        <strong>
                            ${Conduce.encabezado.unidad || "-"}
                        </strong>
                    </div>

                </div>

                <div class="tarjeta-finalizar">

                    <h4>Destinos y precintos</h4>

                    <div class="destino-finalizar">

                        <strong>
                            ${Conduce.encabezado.destino1 || "-"}
                        </strong>

                        <span>
                            Precinto:
                            ${Conduce.encabezado.precinto1 || "-"}
                        </span>

                    </div>

                    ${
                        Number(
                            Conduce.encabezado.cantidadDestinos
                        ) === 2
                            ? `
                            <div class="destino-finalizar">

                                <strong>
                                    ${Conduce.encabezado.destino2 || "-"}
                                </strong>

                                <span>
                                    Precinto:
                                    ${Conduce.encabezado.precinto2 || "-"}
                                </span>

                            </div>
                            `
                            : ""
                    }

                </div>

            </div>

            <div class="grid-form finalizar-carga-form">

                <div class="campo">

                    <label>
                        Verificado por QA
                    </label>

                    <select id="asistenteCalidad">

                        <option value="">
                            Seleccione personal de Calidad
                        </option>

                        ${opcionesCalidad}

                    </select>

                </div>

                <div class="campo">

                    <label class="label-temperatura">
                        <i class="fa-solid fa-temperature-low"></i>
                        Temperatura del contenedor
                    </label>

                    <div class="campo-temperatura">

                        <input
                            type="number"
                            id="temperaturaContenedor"
                            step="0.1"
                            placeholder="-18.0"
                            value="${Conduce.encabezado.temperatura || ""}"
                        >

                        <span>°C</span>

                    </div>

                </div>
				
				<div class="campo campo-full">

    <label>
        Documentos SAP
    </label>

    <div class="grid-documentos-sap">

        <input
				type="text"
				id="documentoSAP1"
				placeholder="Documento SAP 1"
				maxlength="10"
				inputmode="numeric"
				value="${Conduce.encabezado.documentoSAP1 || ""}"
			>


        <input
				type="text"
				id="documentoSAP2"
				placeholder="Documento SAP 2"
				maxlength="10"
				inputmode="numeric"
				value="${Conduce.encabezado.documentoSAP2 || ""}"
			>



        <input
				type="text"
				id="documentoSAP3"
				placeholder="Documento SAP 3"
				maxlength="10"
				inputmode="numeric"
				value="${Conduce.encabezado.documentoSAP3 || ""}"
			>



		  <input
				type="text"
				id="documentoSAP4"
				placeholder="Documento SAP 4"
				maxlength="10"
				inputmode="numeric"
				value="${Conduce.encabezado.documentoSAP4 || ""}"
			>


    </div>

    <small class="ayuda-campo">
        Registre entre uno y cuatro números de movimiento.
    </small>

</div>

                <div class="campo campo-full">

                    <label>
                        Comentarios u observaciones
                    </label>

                    <textarea
                        id="observacionesFinalizarCarga"
                        placeholder="Registre cualquier observación de la carga..."
                    >${Conduce.encabezado.observaciones || ""}</textarea>

                </div>

            </div>

            <div class="barra-finalizar-carga">

					<button
						type="button"
						class="btn-accion-minimal btn-volver-minimal"
						id="btnVolverCarga"
						title="Volver a la carga"
					>
						<i class="fa-solid fa-arrow-left"></i>
					</button>

					<button
						type="button"
						class="btn-accion-minimal btn-guardar-minimal"
						id="btnGuardarFinalizarCarga"
						title="Guardar cambios"
					>
						<i class="fa-solid fa-floppy-disk"></i>
					</button>

					<button
						type="button"
						class="btn-accion-minimal btn-imprimir-minimal"
						id="btnImprimirConduceFinal"
						title="Despachar contenedor"
					>
						<i class="fa-solid fa-print"></i>
						<span>Despachar contenedor</span>
					</button>

					<button
						type="button"
						class="btn-resumen-finalizar"
						id="btnCompletarConduce"
					>
						Completar
						<i class="fa-solid fa-check"></i>
					</button>

				</div>


        </div>
    `;

[
    "documentoSAP1",
    "documentoSAP2",
    "documentoSAP3",
    "documentoSAP4"
].forEach(id => {

    const input =
        document.getElementById(id);

    input.addEventListener("input", () => {

        input.value =
            input.value
                .replace(/\D/g, "")
                .slice(0, 10);

    });

});



    const capturarDatos = () => {

        const asistenteCalidad =
            document.getElementById(
                "asistenteCalidad"
            ).value;

        const temperatura =
            document.getElementById(
                "temperaturaContenedor"
            ).value.trim();

        const observaciones =
            document.getElementById(
                "observacionesFinalizarCarga"
            ).value.trim();

        if (!asistenteCalidad) {

            Despachos.notificar(
                "Debe seleccionar el personal de Calidad.",
                "error"
            );

            return false;

        }

        if (temperatura === "") {

            Despachos.notificar(
                "Debe registrar la temperatura del contenedor.",
                "error"
            );

            return false;

        }

        const temperaturaNumero =
            Number(temperatura);

        if (!Number.isFinite(temperaturaNumero)) {

            Despachos.notificar(
                "La temperatura registrada no es válida.",
                "error"
            );

            return false;

        }

        if (
            temperaturaNumero < -40 ||
            temperaturaNumero > 20
        ) {

            Despachos.notificar(
                "Revise la temperatura registrada.",
                "advertencia"
            );

            return false;

        }

        Conduce.encabezado.asistenteCalidad =
            asistenteCalidad;

        Conduce.encabezado.temperatura =
            temperatura;

        Conduce.encabezado.observaciones =
            observaciones;
			
		Conduce.encabezado.observaciones =
			observaciones;

		Conduce.encabezado.documentoSAP1 =
			document.getElementById("documentoSAP1").value.trim();

		Conduce.encabezado.documentoSAP2 =
			document.getElementById("documentoSAP2").value.trim();

		Conduce.encabezado.documentoSAP3 =
			document.getElementById("documentoSAP3").value.trim();

		Conduce.encabezado.documentoSAP4 =
			document.getElementById("documentoSAP4").value.trim();

return true;


    };
	
	const validarDocumentosSAP = (
    exigirAlMenosUno = false
) => {

    const documentos = [
        Conduce.encabezado.documentoSAP1,
        Conduce.encabezado.documentoSAP2,
        Conduce.encabezado.documentoSAP3,
        Conduce.encabezado.documentoSAP4
    ]
        .map(valor => String(valor || "").trim())
        .filter(Boolean);

    if (
        exigirAlMenosUno &&
        documentos.length === 0
    ) {

        Despachos.notificar(
            "Debe registrar al menos un documento SAP.",
            "error"
        );

        return false;
    }

    const documentoInvalido =
        documentos.find(
            documento =>
                !/^\d{10}$/.test(documento)
        );

    if (documentoInvalido) {

        Despachos.notificar(
            "Cada documento SAP debe contener exactamente 10 dígitos.",
            "error"
        );

        return false;
    }

    const documentosUnicos =
        new Set(documentos);

    if (
        documentosUnicos.size !==
        documentos.length
    ) {

        Despachos.notificar(
            "No puede registrar el mismo documento SAP más de una vez.",
            "error"
        );

        return false;
    }

    return true;

};

    document.getElementById(
        "btnVolverCarga"
    ).onclick = () => {

        Despachos.pasoCarga();

    };

    document.getElementById(
        "btnGuardarFinalizarCarga"
    ).onclick = async () => {

        if (!capturarDatos()) {
            return;
        }
		
		if (!validarDocumentosSAP(false)) {
			return;
		}

        const guardado =
            await Despachos.guardarCambios({
                mostrarCargador: true
            });

        if (!guardado) {
            return;
        }

        Despachos.notificar(
            "Datos de la carga guardados correctamente.",
            "exito"
        );

    };
	
	document.getElementById(
    "btnImprimirConduceFinal"
).onclick = async () => {

    if (!capturarDatos()) {
        return;
    }
	if (!validarDocumentosSAP(false)) {
		return;
	}

    const guardado = await Despachos.guardarCambios({
        silencioso: true,
        mostrarCargador: true
    });

    if (!guardado) {
        return;
    }

    const respuesta = await Despachos.consultarBackendConCargador({

        action: "finalizarCarga",

        conduce: {
            encabezado: Conduce.encabezado,
            detalle: Conduce.detalle
        }

    }, "Preparando conduce", "Estamos guardando la carga antes de generar el documento.");

    if (!respuesta.ok) {

        Despachos.notificar(
            respuesta.mensaje ||
            "No fue posible preparar el conduce.",
            "error"
        );

        return;

    }

    Conduce.encabezado.estado =
        respuesta.data.estado;

    Conduce.encabezado.fechaDespacho =
        respuesta.data.fechaDespacho;

    await Despachos.imprimirConduceFinal();

};

 document.getElementById(
    "btnCompletarConduce"
).onclick = async () => {

    /*
     * =====================================================
     * VALIDACIONES RÁPIDAS
     * =====================================================
     *
     * Estas validaciones se realizan antes de mostrar
     * el cargador para evitar tener que abrirlo y cerrarlo
     * cuando falta información obligatoria.
     */

    if (!capturarDatos()) {
        return;
    }

    if (!validarDocumentosSAP(true)) {
        return;
    }

    const documentosSAP = [
        Conduce.encabezado.documentoSAP1,
        Conduce.encabezado.documentoSAP2,
        Conduce.encabezado.documentoSAP3,
        Conduce.encabezado.documentoSAP4
    ];

    if (!documentosSAP.some(Boolean)) {

        Despachos.notificar(
            "Debe registrar al menos un documento SAP.",
            "error"
        );

        return;

    }


    /*
     * =====================================================
     * MOSTRAR CARGADOR
     * =====================================================
     */

    if (
        window.CargadorSistema &&
        typeof CargadorSistema.mostrar ===
            "function"
    ) {

        CargadorSistema.mostrar(
            "Completando conduce",
            "Estamos finalizando el despacho y generando la documentación."
        );

    }


    /*
     * Permitimos que el navegador pinte el cargador
     * antes de iniciar las operaciones del proceso.
     */
    await new Promise(resolve =>
        setTimeout(resolve, 50)
    );


    try {

        /*
         * =================================================
         * GUARDAR LOS CAMBIOS PENDIENTES
         * =================================================
         */

        const guardado =
            await Despachos.guardarCambios({
                silencioso: true
            });

        if (!guardado) {

            Despachos.notificar(
                "No fue posible guardar los cambios antes de completar el conduce.",
                "error"
            );

            return;

        }


        /*
         * =================================================
         * COMPLETAR CONDUCE EN BACKEND
         * =================================================
         */

        const respuesta =
            await API.post({

                action:
                    "completarConduce",

                conduce: {

                    encabezado:
                        Conduce.encabezado,

                    detalle:
                        Conduce.detalle

                }

            });


        if (
            !respuesta ||
            !respuesta.ok
        ) {

            throw new Error(
                respuesta?.mensaje ||
                "No fue posible completar el conduce."
            );

        }


        /*
         * =================================================
         * ACTUALIZAR ESTADO LOCAL
         * =================================================
         */

        Conduce.encabezado.estado =
            respuesta.data.estado;

        Conduce.encabezado.fechaDespacho =
            respuesta.data.fechaDespacho;

        Conduce.encabezado.fechaCompletado =
            respuesta.data.fechaCompletado;


        /*
         * =================================================
         * GUARDAR PDF OFICIAL EN DRIVE
         * =================================================
         *
         * Si este proceso falla, NO anulamos el conduce,
         * porque ya fue completado correctamente.
         */

        try {

            const htmlConduce =
                await Despachos
                    .construirHTMLConduceFinal();


            if (htmlConduce) {

                const respuestaPDF =
                    await API.post({

                        action:
                            "guardarPDFConduce",

                        idConduce:
                            Conduce.encabezado.idConduce,

                        noConduce:
                            Conduce.encabezado.noConduce,

                        html:
                            htmlConduce

                    });


                if (
                    !respuestaPDF ||
                    !respuestaPDF.ok
                ) {

                    console.warn(
                        "El conduce fue completado, pero no fue posible guardar su PDF:",
                        respuestaPDF?.mensaje ||
                        "Error desconocido."
                    );

                    Despachos.notificar(
                        "El conduce fue completado, pero no se pudo guardar el PDF en Drive.",
                        "advertencia"
                    );

                } else {

                    /*
                     * =========================================
                     * ENVIAR DOCUMENTACIÓN POR CORREO
                     * =========================================
                     *
                     * Solo se intenta después de que el PDF
                     * del conduce fue guardado correctamente.
                     *
                     * El backend localizará:
                     * - PDF del conduce en Despacho.PDF_URL
                     * - PDF BASC en Inspeccion_Contenedores.PDF_URL
                     */

                    try {

                        const sesion =
                            JSON.parse(
                                localStorage.getItem(
                                    "sesion"
                                ) ||
                                sessionStorage.getItem(
                                    "sesion"
                                ) ||
                                "{}"
                            );


                        const usuarioEnvio =
                            sesion.usuario ||
                            sesion.nombre ||
                            "";


                        const respuestaCorreo =
                            await API.post({

                                action:
                                    "enviarDocumentacionDespacho",

                                idConduce:
                                    Conduce.encabezado.idConduce,

                                noConduce:
                                    Conduce.encabezado.noConduce,

                                usuario:
                                    usuarioEnvio

                            });


                        /*
                         * =====================================
                         * ENVÍO EXITOSO
                         * =====================================
                         */

                        if (
                            respuestaCorreo &&
                            respuestaCorreo.ok &&
                            respuestaCorreo.estado ===
                                "Enviado"
                        ) {

                            console.log(
                                "Documentación enviada correctamente por correo:",
                                respuestaCorreo
                            );

                        }


                        /*
                         * =====================================
                         * ENVÍO PENDIENTE
                         * =====================================
                         *
                         * Esto puede ocurrir, por ejemplo,
                         * si la inspección todavía no tiene
                         * su PDF disponible.
                         */

                        else if (
                            respuestaCorreo &&
                            respuestaCorreo.estado ===
                                "Pendiente"
                        ) {

                            console.warn(
                                "El envío de correo quedó pendiente:",
                                respuestaCorreo.mensaje
                            );

                            Despachos.notificar(
                                respuestaCorreo.mensaje ||
                                "El conduce fue completado, pero el envío de correo quedó pendiente.",
                                "advertencia"
                            );

                        }


                        /*
                         * =====================================
                         * ERROR DEVUELTO POR EL BACKEND
                         * =====================================
                         */

                        else {

                            console.warn(
                                "No fue posible enviar la documentación por correo:",
                                respuestaCorreo?.mensaje ||
                                "Error desconocido."
                            );

                            Despachos.notificar(
                                "El conduce fue completado y su PDF fue guardado, pero no fue posible enviar el correo.",
                                "advertencia"
                            );

                        }


                    } catch (errorCorreo) {

                        /*
                         * El correo es un servicio adicional.
                         * Su fallo nunca debe revertir
                         * un conduce que ya fue completado.
                         */

                        console.error(
                            "Error enviando documentación del despacho:",
                            errorCorreo
                        );

                        Despachos.notificar(
                            "El conduce fue completado y su PDF fue guardado, pero ocurrió un error al enviar el correo.",
                            "advertencia"
                        );

                    }

                }

            }

        } catch (errorPDF) {

            console.error(
                "Error guardando PDF del conduce:",
                errorPDF
            );

            Despachos.notificar(
                "El conduce fue completado, pero ocurrió un error al guardar el PDF.",
                "advertencia"
            );

        }


        /*
         * =================================================
         * IMPRIMIR COPIA DEL CONDUCE
         * =================================================
         */

        await Despachos
            .imprimirConduceFinal();


        /*
         * =================================================
         * NOTIFICACIÓN DE ÉXITO
         * =================================================
         */

        Despachos.notificar(
            respuesta.mensaje ||
            "Conduce completado correctamente.",
            "exito"
        );


        if (
            window.CacheOperativo &&
            typeof CacheOperativo.invalidarPrefijo === "function"
        ) {
            await CacheOperativo.invalidarPrefijo("despachos_");
        }


        /*
         * =================================================
         * CERRAR ASISTENTE Y RECARGAR DESPACHOS
         * =================================================
         */

        setTimeout(async () => {

            document
                .getElementById(
                    "modalSistema"
                )
                .classList.add(
                    "oculto"
                );

            Conduce.limpiar();

            await Despachos.cargar();

        }, 700);


    } catch (error) {

        /*
         * =================================================
         * ERROR GENERAL DEL PROCESO
         * =================================================
         */

        console.error(
            "Error completando conduce:",
            error
        );

        Despachos.notificar(
            error.message ||
            "No fue posible completar el conduce.",
            "error"
        );


    } finally {

        /*
         * =================================================
         * OCULTAR SIEMPRE EL CARGADOR
         * =================================================
         */

        if (
            window.CargadorSistema &&
            typeof CargadorSistema.ocultar ===
                "function"
        ) {

            CargadorSistema.ocultar();

        }

    }

};
},


mostrarResumenProvisional() {

    document.getElementById(
        "tituloModal"
    ).textContent = "Resumen";

    document.getElementById(
        "contenidoModal"
    ).innerHTML = `

        <div class="pasos-asistente">

            <div class="paso completado">
                1. Información
            </div>

            <div class="paso completado">
                2. Destinos
            </div>

            <div class="paso completado">
                3. Carga
            </div>

            <div class="paso completado">
                4. Finalizar carga
            </div>
           
        </div>

        <div class="formulario-conduce">

            <h3>Resumen del despacho</h3>

            <div class="tarjeta-finalizar">

                <div class="dato-finalizar">
                    <span>Conduce</span>
                    <strong>
                        ${Conduce.encabezado.noConduce || "-"}
                    </strong>
                </div>

                <div class="dato-finalizar">
                    <span>Estado</span>
                    <strong>
                        ${Conduce.encabezado.estado || "Despachado"}
                    </strong>
                </div>

                <div class="dato-finalizar">
                    <span>Verificado por QA</span>
                    <strong>
                        ${Conduce.encabezado.asistenteCalidad || "-"}
                    </strong>
                </div>

                <div class="dato-finalizar">
                    <span>Temperatura</span>
                    <strong>
                        ${Conduce.encabezado.temperatura || "-"} °C
                    </strong>
                </div>

            </div>

            <div class="acciones-modal">

                <button
                    class="btn-secundario"
                    id="btnVolverFinalizarCarga"
                >
                    Volver
                </button>

            </div>

        </div>
    `;

    document.getElementById(
        "btnVolverFinalizarCarga"
    ).onclick = () => {

        Despachos.pasoCalidad();

    };

},



async guardarCambios(opciones = {}) {

    const silencioso =
        opciones.silencioso === true;

    const mostrarCargador =
        opciones.mostrarCargador === true;

    const inicioCargador = Date.now();

    if (
        mostrarCargador &&
        typeof CargadorSistema !== "undefined" &&
        typeof CargadorSistema.mostrar === "function"
    ) {
        CargadorSistema.mostrar(
            "Guardando despacho",
            "Estamos registrando los cambios del conduce."
        );
    }

    try {

        const respuesta = await API.post({

            action: "guardarBorrador",

            conduce: {

                encabezado:
                    Conduce.encabezado,

                detalle:
                    Conduce.detalle

            }

        });

        if (!respuesta.ok) {

            Despachos.notificar(
                respuesta.mensaje ||
                "No fue posible guardar los cambios.",
                "error"
            );

            return false;

        }

        Conduce.encabezado.idConduce =
            respuesta.data.idConduce;

        Conduce.encabezado.noConduce =
            respuesta.data.noConduce;

        Conduce.encabezado.estado =
            respuesta.data.estado;

        /*
         * El backend ya habrá generado la numeración
         * correcta después de procesar esta marca.
         */
        Conduce.encabezado.requiereRenumeracion =
            false;

        if (!silencioso) {

            Despachos.notificar(
                respuesta.mensaje,
                "exito"
            );

        }

        return true;

    } catch (error) {

        console.error(
            "Error guardando el borrador:",
            error
        );

        Despachos.notificar(
            "No fue posible guardar. Los cambios permanecen abiertos en esta sesión.",
            "error"
        );

        return false;

    } finally {

        if (
            mostrarCargador &&
            typeof CargadorSistema !== "undefined" &&
            typeof CargadorSistema.ocultar === "function"
        ) {
            const tiempoTranscurrido =
                Date.now() - inicioCargador;

            const tiempoRestante =
                Math.max(0, 450 - tiempoTranscurrido);

            if (tiempoRestante > 0) {
                await new Promise(resolve =>
                    setTimeout(resolve, tiempoRestante)
                );
            }

            CargadorSistema.ocultar();
        }

    }

},




async imprimirBorrador() {

    if (Conduce.detalle.length === 0) {
        Despachos.notificar(
            "Debe agregar al menos una línea antes de imprimir.",
            "error"
        );
        return;
    }

    const configuracion =
        await Catalogos.cargarConfiguracion();

    const nombreConduce =
        configuracion.Nombre_Conduce ||
        "CONDUCE DE DESPACHO PRODUCTO TERMINADO";

    const versionConduce =
        configuracion.Version_Conduce ||
        "";

    const empresa =
        configuracion.Empresa ||
        "";

    const ubicacion =
        configuracion.Ubicacion ||
        "";

    const telefono =
        configuracion.Telefono ||
        "";

    const logoUrl =
        configuracion.LogoURL ||
        "";

    const logoDocumento =
        document.querySelector(".sidebar .logo img")?.src ||
        logoUrl;

    const noConduce =
        Conduce.encabezado.noConduce ||
        "Pendiente";

    // ==========================================
    // FORMATEAR FECHA PARA EL DOCUMENTO
    // ==========================================

    const formatearFechaHora = valor => {

        if (!valor) {
            return "";
        }

        const fecha = new Date(valor);

        if (isNaN(fecha.getTime())) {
            return String(valor);
        }

        return fecha.toLocaleString("es-DO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });

    };

    const fechaCarga =
    formatearFechaHora(
        Conduce.encabezado.fechaCreacion || new Date()
    );

    const fechaDespacho =
        formatearFechaHora(
            Conduce.encabezado.fechaCierre
        );
		
	Despachos.normalizarDetalleCarga();

    // ==========================================
    // SEPARAR TARIMAS Y RECORTES
    // ==========================================

    const tarimas = Conduce.detalle.filter(
        linea => linea.tipo === "Tarima"
    );

    const recortes = Conduce.detalle.filter(
        linea => linea.tipo === "Recorte"
    );

    const totalUnidades = Conduce.detalle.reduce(
        (total, linea) =>
            total + Number(linea.cantidad || 0),
        0
    );

    // ==========================================
    // FILAS DE TARIMAS
    // ==========================================

    const filasTarimas = tarimas.map(
        (linea, index) => `
            <tr>
                <td class="centrado">${index + 1}</td>
				<td>${linea.destino || "-"}</td>
                <td>${linea.material}</td>
                <td>${linea.descripcion}</td>
                <td class="centrado">${linea.lote || "-"}</td>
                <td class="centrado">${linea.fechaProduccion || "-"}</td>
                <td class="centrado">${linea.fechaVencimiento || "-"}</td>
                <td class="centrado">${linea.base} × ${linea.altura}</td>
                <td class="centrado">${linea.recorte || 0}</td>
                <td class="numero">${linea.cantidad}</td>
            </tr>
        `
    ).join("");

    // ==========================================
    // FILAS DE RECORTES
    // ==========================================

    const filasRecortes = recortes.map(
        linea => `
            <tr class="fila-recorte">
                <td class="centrado">—</td>
				<td>${linea.destino || "-"}</td>
                <td>${linea.material}</td>
                <td>${linea.descripcion}</td>
                <td class="centrado">${linea.lote || "-"}</td>
                <td class="centrado">${linea.fechaProduccion || "-"}</td>
                <td class="centrado">${linea.fechaVencimiento || "-"}</td>
                <td class="centrado">—</td>
                <td class="centrado">${linea.recorte || linea.cantidad}</td>
                <td class="numero">${linea.cantidad}</td>
            </tr>
        `
    ).join("");

    // ==========================================
    // AGRUPAR TOTALES POR MATERIAL
    // ==========================================

    const materialesAgrupados = {};

Conduce.detalle.forEach(linea => {

    const destino = linea.destino || "Sin destino";

    const clave =
        String(linea.material) + "|" + destino;

    if (!materialesAgrupados[clave]) {

        materialesAgrupados[clave] = {

            material: linea.material,

            descripcion: linea.descripcion,

            destino: destino,

            cantidad: 0

        };

    }

    materialesAgrupados[clave].cantidad +=
        Number(linea.cantidad || 0);

});

const materialesOrdenados =
    Object.values(materialesAgrupados)
        .sort((a, b) => {

            const compararDestino =
                String(a.destino).localeCompare(
                    String(b.destino),
                    "es",
                    {
                        sensitivity: "base"
                    }
                );

            if (compararDestino !== 0) {
                return compararDestino;
            }

            return String(a.material).localeCompare(
                String(b.material),
                "es",
                {
                    numeric: true
                }
            );

        });

const filasTotalesMaterial =
    materialesOrdenados
        .map(item => `

            <tr>

                <td>${item.material}</td>

                <td>${item.descripcion}</td>

                <td>${item.destino}</td>

                <td class="numero">
                    ${item.cantidad}
                </td>

            </tr>

        `)
        .join("");

    // ==========================================
    // ABRIR DOCUMENTO DE IMPRESIÓN
    // ==========================================

    const ventana = window.open("", "_blank");

    if (!ventana) {

        Despachos.notificar(
            "El navegador bloqueó la ventana de impresión.",
            "error"
        );

        return;
    }

    ventana.document.write(`
        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>
                Borrador de Conduce ${noConduce}
            </title>

            <style>

                @page{
                    size:A4 portrait;
                    margin:6mm;
                }

                *{
                    box-sizing:border-box;
                }

                html,
                body{
                    margin:0;
                    padding:0;
                }

                body{
                    background:#f7f7f7;
                    padding:4px;
                    color:#222;
                    font-family:Arial, sans-serif;
                    font-size:9px;
                }

                /* =====================================
                   ENCABEZADO CORPORATIVO
                ===================================== */

                .encabezado-documento{
                    display:grid;
                    grid-template-columns:78px 1fr 112px;
                    align-items:center;
                    gap:10px;

                    background:#fff;
                    border:1px solid #d5d5d5;
                    border-radius:11px;
                    padding:7px 10px;
                    margin-bottom:7px;

                    box-shadow:
                        0 3px 10px rgba(0,0,0,.10);
                }

                .logo-documento{
                    display:flex;
                    justify-content:flex-start;
                    align-items:center;
                }

                .logo-documento img{
                    width:65px;
                    max-height:65px;
                    object-fit:contain;
                }

                .centro-encabezado{
                    text-align:center;
                    min-width:0;
                }

                .empresa{
                    margin:0;
                    color:#D71920;
                    font-size:14px;
                    font-weight:800;
                }

                .datos-empresa{
                    margin-top:2px;
                    color:#444;
                    font-size:8px;
                    line-height:1.2;
                }

                .nombre-documento{
                    margin:6px 0 0;
                    color:#222;
                    font-size:16px;
                    font-weight:800;
                    white-space:nowrap;
                    text-transform:uppercase;
                }

                .tipo-documento{
                    margin-top:2px;
                    font-size:10px;
                    font-weight:700;
                }

                .version-documento{
                    margin-top:2px;
                    font-size:9px;
                    font-weight:700;
                }

                .numero-documento{
                    text-align:right;
                    padding:3px;
                }

                .numero-documento span{
                    display:block;
                    color:#777;
                    font-size:8px;
                }

                .numero-documento strong{
                    display:block;
                    margin-top:2px;
                    font-size:15px;
                    color:#222;
                }

                /* =====================================
                   BLOQUES OPERATIVOS
                ===================================== */

                .informacion-despacho{
					display:grid;
					grid-template-columns:1fr 1fr;
					gap:14px;
					margin-top:10px;
					margin-bottom:12px;
				}

                .bloque-informacion{
                    background:#fff;
                    border:1px solid #d5d5d5;
                    border-radius:10px;
                    padding:10px 12px;

                    box-shadow:
                        0 3px 10px rgba(0,0,0,.09);

                    font-size:10px;
                    line-height:1.2;
                }

                .fila-dato{
                    display:grid;
                    grid-template-columns:96px 1fr;
                    gap:4px;
                    align-items:center;
                    margin-bottom:3px;
                }

                .fila-dato:last-child{
                    margin-bottom:0;
                }

                .etiqueta{
                    font-weight:700;
                    white-space:nowrap;
                }

                .dato-manual{
                    display:block;
                    min-height:13px;
                    border-bottom:1px solid #555;
                }

                .temperatura{
                    color:#1677c8;
                    font-weight:700;
                }

                /* =====================================
                   FECHAS
                ===================================== */

                .fechas-despacho{
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:8px;
                    margin-bottom:6px;
                    padding-bottom:5px;
                    border-bottom:1px solid #ddd;
                }

                .fecha-bloque{
                    display:flex;
                    flex-direction:column;
                }

                .fecha-bloque span{
                    color:#777;
                    font-size:8px;
                    text-transform:uppercase;
                }

                .fecha-bloque strong{
                    margin-top:2px;
                    font-size:9px;
                }

                .fecha-vacia{
                    min-height:12px;
                    border-bottom:1px solid #555;
                }

                /* =====================================
                   DESTINOS
                ===================================== */

                .destino{
                    display:grid;
                    grid-template-columns:1fr 120px;
                    gap:8px;
                    align-items:center;
                    margin-bottom:5px;
                }

                .destino:last-child{
                    margin-bottom:0;
                }

                .destino-nombre{
                    font-weight:700;
                }

                .precinto{
                    text-align:left;
                    white-space:nowrap;
                }

                .precinto strong{
                    font-weight:700;
                }

                /* =====================================
                   TABLA PRINCIPAL
                ===================================== */

                .tabla-principal{
                    width:100%;
                    border-collapse:collapse;
                    table-layout:fixed;
					margin-top:4px;
                    background:#fff;
                    font-size:11px;
                }

                .tabla-principal th,
                .tabla-principal td{
                    border:1px solid #999;
                    padding:4x 4px;
                    vertical-align:middle;
                    line-height:1.08;
                }

                .tabla-principal th{
                    background:#ededed;
                    font-size:10px;
                    font-weight:700;
                    text-align:center;
                }

                .tabla-principal tbody tr:nth-child(even){
                    background:#fafafa;
                }

                .tabla-principal .fila-recorte{
                    background:#fff3dd !important;
                }

                .centrado{
                    text-align:center;
                }

                .numero{
                    text-align:right;
                }

                .col-pos{
                    width:4%;
                }

                .col-material{
                    width:9%;
                }

                .col-descripcion{
                    width:22%;
                }

                .col-lote{
                    width:7%;
                }

                .col-fecha{
                    width:11%;
                }

                .col-ba{
                    width:7%;
                }

                .col-recorte{
                    width:7%;
                }

                .col-cantidad{
                    width:8%;
                }

              /* =====================================
   PIE DEL DOCUMENTO
===================================== */

.pie-documento{
    width:100%;
    margin-top:10px;
}

.fila-resumen-totales{
    display:flex;
    flex-direction:row;
    align-items:flex-start;
    gap:12px;
    width:100%;
}

.tarjeta-pie{
    background:#fff;
    border:1px solid #d5d5d5;
    border-radius:10px;
    padding:9px 10px;
    box-sizing:border-box;
    box-shadow:0 2px 8px rgba(0,0,0,.09);
}

.tarjeta-pie h3{
    margin:0 0 5px;
    font-size:9px;
    text-align:center;
    text-transform:uppercase;
}

.totales-generales{
    flex:0 0 180px;
    width:180px;
    line-height:1.45;
    font-size:9px;
}

.totales-material{
    flex:1 1 auto;
    width:auto;
    min-width:0;
}

.tabla-materiales{
    width:100%;
    table-layout:fixed;
    border-collapse:collapse;
    font-size:10.5px;
}

.tabla-materiales th,
.tabla-materiales td{
    border:1px solid #aaa;
    padding:4px 5px;
}

.tabla-materiales th{
    background:#ededed;
    text-align:center;
}

.tabla-materiales th:nth-child(1),
.tabla-materiales td:nth-child(1){
    width:20%;
}

.tabla-materiales th:nth-child(2),
.tabla-materiales td:nth-child(2){
    width:36%;
}

.tabla-materiales th:nth-child(3),
.tabla-materiales td:nth-child(3){
    width:29%;
}

.tabla-materiales th:nth-child(4),
.tabla-materiales td:nth-child(4){
    width:15%;
    text-align:right;
}

.total-final-materiales{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-top:6px;
    padding:6px 8px;
    border-top:2px solid #555;
    font-size:11px;
    font-weight:700;
}

.total-final-materiales strong{
    font-size:13px;
}

.anotaciones{
    width:100%;
    margin-top:10px;
    min-height:70px;
}

.linea-anotacion{
    height:22px;
    border-bottom:1px solid #bbb;
}

.texto-observaciones{
    min-height:58px;
    padding:5px 2px;
    white-space:pre-wrap;
    font-size:10px;
    line-height:1.35;
}

.col-destino{
    width:12%;
}

@media print{

    body{
        background:#fff;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
    }

    .fila-resumen-totales{
        display:flex !important;
        flex-direction:row !important;
        align-items:flex-start !important;
        gap:12px !important;
        width:100% !important;
    }

    .totales-generales{
        flex:0 0 180px !important;
        width:180px !important;
    }

    .totales-material{
        flex:1 1 auto !important;
        width:auto !important;
        min-width:0 !important;
    }

    .encabezado-documento,
    .bloque-informacion,
    .tarjeta-pie{
        background:#fff !important;
        border:1px solid #ddd !important;
        border-radius:10px !important;
        box-shadow:none !important;
    }

}



            </style>

        </head>

        <body>

            <header class="encabezado-documento">

                <div class="logo-documento">

                    ${
                        logoDocumento
                            ? `
                            <img
                                src="${logoDocumento}"
                                alt="Logo Helados BON"
                            >
                            `
                            : ""
                    }

                </div>

                <div class="centro-encabezado">

                    <h2 class="empresa">
                        ${empresa}
                    </h2>

                    <div class="datos-empresa">

                        <div>
                            ${ubicacion}
                        </div>

                        <div>
                            Tel. ${telefono}
                        </div>

                    </div>

                    <h1 class="nombre-documento">
                        ${nombreConduce}
                    </h1>

                    <div class="tipo-documento">
                        (Borrador para cargar)
                    </div>

                    <div class="version-documento">
                        ${versionConduce}
                    </div>

                </div>

                <div class="numero-documento">

                    <span>
                        No. Conduce
                    </span>

                    <strong>
                        ${noConduce}
                    </strong>

                </div>

            </header>

            <section class="informacion-despacho">

                <div class="bloque-informacion">

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Creado por:
                        </span>

                        <span>
                            ${Conduce.encabezado.supervisor || "-"}
                        </span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Verificado por QA:
                        </span>

                        <span class="dato-manual"></span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Chofer:
                        </span>

                        <span>
                            ${Conduce.encabezado.chofer || "-"}
                        </span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Unidad de carga:
                        </span>

                        <span>
                            ${Conduce.encabezado.unidad || "-"}
                        </span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta temperatura">
                            🌡 Temperatura:
                        </span>

                        <span class="dato-manual"></span>

                    </div>

                </div>

                <div class="bloque-informacion">

                    <div class="fechas-despacho">

                        <div class="fecha-bloque">

                            <span>
                                Fecha de carga
                            </span>

                            <strong>
                                ${fechaCarga || "-"}
                            </strong>

                        </div>

                        <div class="fecha-bloque">

                            <span>
                                Fecha de despacho
                            </span>

                            ${
                                fechaDespacho
                                    ? `
                                    <strong>
                                        ${fechaDespacho}
                                    </strong>
                                    `
                                    : `
                                    <div class="fecha-vacia"></div>
                                    `
                            }

                        </div>

                    </div>

                    <div class="destino">

                        <div class="destino-nombre">
                            Destino 1.:
                            ${Conduce.encabezado.destino1 || "-"}
                        </div>

                        <div class="precinto">
                            <strong>Precinto:</strong>
                            ${Conduce.encabezado.precinto1 || "-"}
                        </div>

                    </div>

                    ${
                        Number(
                            Conduce.encabezado.cantidadDestinos
                        ) === 2
                            ? `
                            <div class="destino">

                                <div class="destino-nombre">
                                    Destino 2.:
                                    ${Conduce.encabezado.destino2 || "-"}
                                </div>

                                <div class="precinto">
                                    <strong>Precinto:</strong>
                                    ${Conduce.encabezado.precinto2 || "-"}
                                </div>

                            </div>
                            `
                            : ""
                    }

                </div>

            </section>

            <table class="tabla-principal">

                <thead>

                    <tr>

                        <th class="col-pos">Pos.</th>
						<th class="col-destino">Destino</th>
						<th class="col-material">Material</th>
						<th class="col-descripcion">Descripción</th>
						<th class="col-lote">Lote</th>
						<th class="col-fecha">F. Producción</th>
						<th class="col-fecha">Vence</th>
						<th class="col-ba">B × A</th>
						<th class="col-recorte">Parcial</th>
						<th class="col-cantidad">Cantidad</th>

                    </tr>

                </thead>

                <tbody>

                    ${filasTarimas}

                    ${filasRecortes}

                </tbody>

            </table>

            <footer class="pie-documento">

    <div class="fila-resumen-totales">

        <div class="tarjeta-pie totales-generales">

            <h3>Resumen general</h3>

            <div>
                <strong>Tarimas:</strong>
                ${tarimas.length}
            </div>

            <div>
                <strong>Parciales:</strong>
                ${recortes.length}
            </div>

        </div>

        <div class="tarjeta-pie totales-material">

            <h3>Totales por material</h3>

            <table class="tabla-materiales">

                <thead>
                    <tr>
                        <th>Material</th>
                        <th>Descripción</th>
                        <th>Destino</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${filasTotalesMaterial}
                </tbody>

            </table>

            <div class="total-final-materiales">

                <span>
                    TOTAL GENERAL DE UNIDADES
                </span>

                <strong>
                    ${totalUnidades}
                </strong>

            </div>

        </div>

    </div>

                <div class="tarjeta-pie anotaciones">

                    <h3>
                       Comentarios u observaciones
                    </h3>

                    <div class="linea-anotacion"></div>
                    <div class="linea-anotacion"></div>
                    <div class="linea-anotacion"></div>

                </div>

            </footer>

            <script>

                window.onload = function() {

                    setTimeout(function() {

                        window.print();

                    }, 500);

                };

            </script>

        </body>

        </html>
    `);

    ventana.document.close();

},
async obtenerLogoDashboard() {

    const imagen =
        document.querySelector(
            'img[src*="logo_dashboard"]'
        ) ||
        document.querySelector(
            ".sidebar .logo img"
        );


    if (!imagen) {
        return "";
    }


    /*
     * Evita que la generación del conduce quede esperando
     * indefinidamente si el navegador no termina de
     * decodificar la imagen.
     */
    try {

        await Promise.race([

            imagen.decode()
                .catch(
                    () => null
                ),

            new Promise(
                resolver =>
                    setTimeout(
                        resolver,
                        3000
                    )
            )

        ]);

    } catch (error) {

        console.warn(
            "No fue posible decodificar el logo:",
            error
        );

    }


    if (
        !imagen.naturalWidth ||
        !imagen.naturalHeight
    ) {

        console.warn(
            "El logo no tiene dimensiones válidas. El conduce continuará sin logo incrustado."
        );

        return imagen.src || "";

    }


    try {

        const canvas =
            document.createElement(
                "canvas"
            );


        canvas.width =
            imagen.naturalWidth;


        canvas.height =
            imagen.naturalHeight;


        const contexto =
            canvas.getContext(
                "2d"
            );


        if (!contexto) {
            return imagen.src || "";
        }


        contexto.drawImage(
            imagen,
            0,
            0
        );


        return canvas.toDataURL(
            "image/png"
        );


    } catch (error) {

        console.warn(
            "No fue posible convertir el logo a Base64:",
            error
        );

        return imagen.src || "";

    }

},

async construirHTMLConduceFinal() {

    if (Conduce.detalle.length === 0) {
        Despachos.notificar(
            "Debe agregar al menos una línea antes de imprimir.",
            "error"
        );
        return;
    }

    const configuracion =
        await Catalogos.cargarConfiguracion();

    const nombreConduce =
        configuracion.Nombre_Conduce ||
        "CONDUCE DE DESPACHO PRODUCTO TERMINADO";

    const versionConduce =
        configuracion.Version_Conduce ||
        "";

    const empresa =
        configuracion.Empresa ||
        "";

    const ubicacion =
        configuracion.Ubicacion ||
        "";

    const telefono =
        configuracion.Telefono ||
        "";

   const logoUrl =
    configuracion.LogoURL ||
    "";

	/*
	 * Para que el logo funcione tanto en la impresión
	 * del navegador como en el PDF generado por Apps Script,
	 * intentamos incrustarlo como Base64.
	 */
	let logoDocumento =
		await Despachos.obtenerLogoDashboard();

	if (!logoDocumento) {

		logoDocumento =
			document.querySelector(
				".sidebar .logo img"
			)?.src ||
			logoUrl;

	}

    const noConduce =
        Conduce.encabezado.noConduce ||
        "Pendiente";
		
	
    // ==========================================
    // FORMATEAR FECHA PARA EL DOCUMENTO
    // ==========================================

    const formatearFechaHora = valor => {

        if (!valor) {
            return "";
        }

        const fecha = new Date(valor);

        if (isNaN(fecha.getTime())) {
            return String(valor);
        }

        return fecha.toLocaleString("es-DO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });

    };

    const fechaCarga =
    formatearFechaHora(
        Conduce.encabezado.fechaCreacion || new Date()
    );

    const fechaDespacho =  formatearFechaHora(
        Conduce.encabezado.fechaDespacho
    );

		
	Despachos.normalizarDetalleCarga();

    // ==========================================
    // SEPARAR TARIMAS Y RECORTES
    // ==========================================

    const tarimas = Conduce.detalle.filter(
        linea => linea.tipo === "Tarima"
    );

    const recortes = Conduce.detalle.filter(
        linea => linea.tipo === "Recorte"
    );

    const totalUnidades = Conduce.detalle.reduce(
        (total, linea) =>
            total + Number(linea.cantidad || 0),
        0
    );

    // ==========================================
    // FILAS DE TARIMAS
    // ==========================================

    const filasTarimas = tarimas.map(
        (linea, index) => `
            <tr>
                <td class="centrado">${index + 1}</td>
				<td>${linea.destino || "-"}</td>
                <td>${linea.material}</td>
                <td>${linea.descripcion}</td>
                <td class="centrado">${linea.lote || "-"}</td>
                <td class="centrado">${linea.fechaProduccion || "-"}</td>
                <td class="centrado">${linea.fechaVencimiento || "-"}</td>
                <td class="centrado">${linea.base} × ${linea.altura}</td>
                <td class="centrado">${linea.recorte || 0}</td>
                <td class="numero">${linea.cantidad}</td>
            </tr>
        `
    ).join("");

    // ==========================================
    // FILAS DE RECORTES
    // ==========================================

    const filasRecortes = recortes.map(
        linea => `
            <tr class="fila-recorte">
                <td class="centrado">—</td>
				<td>${linea.destino || "-"}</td>
                <td>${linea.material}</td>
                <td>${linea.descripcion}</td>
                <td class="centrado">${linea.lote || "-"}</td>
                <td class="centrado">${linea.fechaProduccion || "-"}</td>
                <td class="centrado">${linea.fechaVencimiento || "-"}</td>
                <td class="centrado">—</td>
                <td class="centrado">${linea.recorte || linea.cantidad}</td>
                <td class="numero">${linea.cantidad}</td>
            </tr>
        `
    ).join("");

    // ==========================================
    // AGRUPAR TOTALES POR MATERIAL
    // ==========================================

    const materialesAgrupados = {};

Conduce.detalle.forEach(linea => {

    const destino = linea.destino || "Sin destino";

    const clave =
        String(linea.material) + "|" + destino;

    if (!materialesAgrupados[clave]) {

        materialesAgrupados[clave] = {

            material: linea.material,

            descripcion: linea.descripcion,

            destino: destino,

            cantidad: 0

        };

    }

    materialesAgrupados[clave].cantidad +=
        Number(linea.cantidad || 0);

});

const materialesOrdenados =
    Object.values(materialesAgrupados)
        .sort((a, b) => {

            const compararDestino =
                String(a.destino).localeCompare(
                    String(b.destino),
                    "es",
                    {
                        sensitivity: "base"
                    }
                );

            if (compararDestino !== 0) {
                return compararDestino;
            }

            return String(a.material).localeCompare(
                String(b.material),
                "es",
                {
                    numeric: true
                }
            );

        });

const filasTotalesMaterial =
    materialesOrdenados
        .map(item => `

            <tr>

                <td>${item.material}</td>

                <td>${item.descripcion}</td>

                <td>${item.destino}</td>

                <td class="numero">
                    ${item.cantidad}
                </td>

            </tr>

        `)
        .join("");

    // ==========================================
    // ABRIR DOCUMENTO DE IMPRESIÓN
    // ==========================================

const documentosSAP = [
    Conduce.encabezado.documentoSAP1,
    Conduce.encabezado.documentoSAP2,
    Conduce.encabezado.documentoSAP3,
    Conduce.encabezado.documentoSAP4
].map(valor => String(valor || "").trim());


    return `
        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>
                Conduce ${noConduce}
            </title>

            <style>

                @page{
                    size:A4 portrait;
                    margin:6mm;
                }

                *{
                    box-sizing:border-box;
                }

                html,
                body{
                    margin:0;
                    padding:0;
                }

                body{
                    background:#f7f7f7;
                    padding:4px;
                    color:#222;
                    font-family:Arial, sans-serif;
                    font-size:9px;
                }

                /* =====================================
                   ENCABEZADO CORPORATIVO
                ===================================== */

                .encabezado-documento{
                    display:grid;
                    grid-template-columns:78px 1fr 112px;
                    align-items:center;
                    gap:10px;

                    background:#fff;
                    border-radius:11px;
                    padding:7px 10px;
                    margin-bottom:7px;

                    box-shadow:
                        0 3px 10px rgba(0,0,0,.10);
                }

                .logo-documento{
                    display:flex;
                    justify-content:flex-start;
                    align-items:center;
                }

                .logo-documento img{
                    width:65px;
                    max-height:65px;
                    object-fit:contain;
                }

                .centro-encabezado{
                    text-align:center;
                    min-width:0;
                }

                .empresa{
                    margin:0;
                    color:#D71920;
                    font-size:14px;
                    font-weight:800;
                }

                .datos-empresa{
                    margin-top:2px;
                    color:#444;
                    font-size:8px;
                    line-height:1.2;
                }

                .nombre-documento{
                    margin:6px 0 0;
                    color:#222;
                    font-size:16px;
                    font-weight:800;
                    white-space:nowrap;
                    text-transform:uppercase;
                }

                .tipo-documento{
                    margin-top:2px;
                    font-size:10px;
                    font-weight:700;
                }

                .version-documento{
                    margin-top:2px;
                    font-size:9px;
                    font-weight:700;
                }

                .numero-documento{
                    text-align:right;
                    padding:3px;
                }

                .numero-documento span{
                    display:block;
                    color:#777;
                    font-size:8px;
                }

                .numero-documento strong{
                    display:block;
                    margin-top:2px;
                    font-size:15px;
                    color:#222;
                }

                /* =====================================
                   BLOQUES OPERATIVOS
                ===================================== */

                .informacion-despacho{
					display:grid;
					grid-template-columns:1fr 1fr;
					gap:14px;
					margin-top:10px;
					margin-bottom:12px;
				}

                .bloque-informacion{
                    background:#fff;
                    border-radius:10px;
                    padding:10px 12px;

                    box-shadow:
                        0 3px 10px rgba(0,0,0,.09);

                    font-size:10px;
                    line-height:1.2;
                }

                .fila-dato{
                    display:grid;
                    grid-template-columns:96px 1fr;
                    gap:4px;
                    align-items:center;
                    margin-bottom:3px;
                }

                .fila-dato:last-child{
                    margin-bottom:0;
                }

                .etiqueta{
                    font-weight:700;
                    white-space:nowrap;
                }

                .dato-manual{
                    display:block;
                    min-height:13px;
                    border-bottom:1px solid #555;
                }

                .temperatura{
                    color:#1677c8;
                    font-weight:700;
                }

                /* =====================================
                   FECHAS
                ===================================== */

                .fechas-despacho{
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:8px;
                    margin-bottom:6px;
                    padding-bottom:5px;
                    border-bottom:1px solid #ddd;
                }

                .fecha-bloque{
                    display:flex;
                    flex-direction:column;
                }

                .fecha-bloque span{
                    color:#777;
                    font-size:8px;
                    text-transform:uppercase;
                }

                .fecha-bloque strong{
                    margin-top:2px;
                    font-size:9px;
                }

                .fecha-vacia{
                    min-height:12px;
                    border-bottom:1px solid #555;
                }

                /* =====================================
                   DESTINOS
                ===================================== */

                .destino{
                    display:grid;
                    grid-template-columns:1fr 120px;
                    gap:8px;
                    align-items:center;
                    margin-bottom:5px;
                }

                .destino:last-child{
                    margin-bottom:0;
                }

                .destino-nombre{
                    font-weight:700;
                }

                .precinto{
                    text-align:left;
                    white-space:nowrap;
                }

                .precinto strong{
                    font-weight:700;
                }

                /* =====================================
                   TABLA PRINCIPAL
                ===================================== */

                .tabla-principal{
                    width:100%;
                    border-collapse:collapse;
                    table-layout:fixed;
					margin-top:4px;
                    background:#fff;
                    font-size:11px;
                }

                .tabla-principal th,
                .tabla-principal td{
                    border:1px solid #999;
                    padding:4px;
                    vertical-align:middle;
                    line-height:1.08;
                }

                .tabla-principal th{
                    background:#ededed;
                    font-size:10px;
                    font-weight:700;
                    text-align:center;
                }

                .tabla-principal tbody tr:nth-child(even){
                    background:#fafafa;
                }

                .tabla-principal .fila-recorte{
                    background:#fff3dd !important;
                }

                .centrado{
                    text-align:center;
                }

                .numero{
                    text-align:right;
                }

                .col-pos{
                    width:4%;
                }

                .col-material{
                    width:9%;
                }

                .col-descripcion{
                    width:22%;
                }

                .col-lote{
                    width:7%;
                }

                .col-fecha{
                    width:11%;
                }

                .col-ba{
                    width:7%;
                }

                .col-recorte{
                    width:7%;
                }

                .col-cantidad{
                    width:8%;
                }

                /* =====================================
                   PIE DEL DOCUMENTO
                ===================================== */

                .pie-documento{
                    display:grid;
                    grid-template-columns:180px minmax(0, 1fr);
                    gap:12px;
                    margin-top:10px;
                    align-items:start;
                }

                .columna-resumen{
                    display:flex;
                    flex-direction:column;
                    gap:8px;
                    min-width:0;
                }

                .tarjeta-pie{
                    background:#fff;
                    border:1px solid #d5d5d5;
                    border-radius:10px;
                    padding:9px 10px;
                    box-sizing:border-box;
                    box-shadow:0 2px 8px rgba(0,0,0,.09);
                }

                .tarjeta-pie h3{
                    margin:0 0 6px;
                    font-size:9px;
                    text-align:center;
                    text-transform:uppercase;
                }

                .totales-generales{
                    line-height:1.45;
                    font-size:9px;
                }

                .documentos-sap-resumen{
                    margin:0;
                }

                .grid-documentos-sap-impresion{
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:5px;
                    margin-top:6px;
                }

                .documento-sap-celda{
                    min-height:24px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:3px;
                    background:#f1f1f1;
                    border:1px solid #d6d6d6;
                    border-radius:4px;
                    font-size:9px;
                    font-weight:700;
                    overflow-wrap:anywhere;
                    text-align:center;
                }

                .totales-material{
                    width:100%;
                    min-width:0;
                }

                .tabla-materiales{
                    width:100%;
                    table-layout:fixed;
                    border-collapse:collapse;
                    font-size:10px;
                }

                .tabla-materiales th,
                .tabla-materiales td{
                    border:1px solid #aaa;
                    padding:4px 5px;
                }

                .tabla-materiales th{
                    background:#ededed;
                    text-align:center;
                }

                .tabla-materiales th:nth-child(1),
                .tabla-materiales td:nth-child(1){
                    width:20%;
                }

                .tabla-materiales th:nth-child(2),
                .tabla-materiales td:nth-child(2){
                    width:36%;
                }

                .tabla-materiales th:nth-child(3),
                .tabla-materiales td:nth-child(3){
                    width:29%;
                }

                .tabla-materiales th:nth-child(4),
                .tabla-materiales td:nth-child(4){
                    width:15%;
                    text-align:right;
                }

                .total-final-materiales{
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-top:6px;
                    padding:6px 8px;
                    border-top:2px solid #555;
                    font-size:11px;
                    font-weight:700;
                }

                .total-final-materiales strong{
                    font-size:13px;
                }

                .anotaciones{
                    grid-column:1 / -1;
                    min-height:90px;
                }

                .linea-anotacion{
                    height:22px;
                    border-bottom:1px solid #bbb;
                }

                .texto-observaciones{
                    min-height:58px;
                    padding:5px 2px;
                    white-space:pre-wrap;
                    font-size:10px;
                    line-height:1.35;
                }

                @media print{

                    body{
                        background:#fff;
                        -webkit-print-color-adjust:exact;
                        print-color-adjust:exact;
                    }

                    .encabezado-documento,
                    .bloque-informacion,
                    .tarjeta-pie{
                        background:#fff !important;
                        border:1px solid #d5d5d5 !important;
                        border-radius:10px !important;
                        box-shadow:none !important;
                    }

                    .encabezado-documento{
                        border-radius:11px !important;
                    }

                }

            </style>

        </head>

        <body>

            <header class="encabezado-documento">

                <div class="logo-documento">

                    ${
                        logoDocumento
                            ? `
                            <img
                                src="${logoDocumento}"
                                alt="Logo Helados BON"
                            >
                            `
                            : ""
                    }

                </div>

                <div class="centro-encabezado">

                    <h2 class="empresa">
                        ${empresa}
                    </h2>

                    <div class="datos-empresa">

                        <div>
                            ${ubicacion}
                        </div>

                        <div>
                            Tel. ${telefono}
                        </div>

                    </div>

                    <h1 class="nombre-documento">
                        ${nombreConduce}
                    </h1>


                    <div class="version-documento">
                        ${versionConduce}
                    </div>

                </div>

                <div class="numero-documento">

                    <span>
                        No. Conduce
                    </span>

                    <strong>
                        ${noConduce}
                    </strong>

                </div>

            </header>

            <section class="informacion-despacho">

                <div class="bloque-informacion">

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Creado por:
                        </span>

                        <span>
                            ${Conduce.encabezado.supervisor || "-"}
                        </span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Verificado por QA:
                        </span>

                        <span>
							${Conduce.encabezado.asistenteCalidad || "-"}
						</span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Chofer:
                        </span>

                        <span>
                            ${Conduce.encabezado.chofer || "-"}
                        </span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta">
                            Unidad de carga:
                        </span>

                        <span>
                            ${Conduce.encabezado.unidad || "-"}
                        </span>

                    </div>

                    <div class="fila-dato">

                        <span class="etiqueta temperatura">
                            🌡 Temperatura:
                        </span>

                        <span>
							${Conduce.encabezado.temperatura || "-"} °C
						</span>

                    </div>

                </div>

                <div class="bloque-informacion">

                    <div class="fechas-despacho">

                        <div class="fecha-bloque">

                            <span>
                                Fecha de carga
                            </span>

                            <strong>
                                ${fechaCarga || "-"}
                            </strong>

                        </div>

                        <div class="fecha-bloque">

                            <span>
                                Fecha de despacho
                            </span>

                            <strong>
								${fechaDespacho || "-"}
							</strong>

                        </div>

                    </div>

                    <div class="destino">

                        <div class="destino-nombre">
                            Destino 1.:
                            ${Conduce.encabezado.destino1 || "-"}
                        </div>

                        <div class="precinto">
                            <strong>Precinto:</strong>
                            ${Conduce.encabezado.precinto1 || "-"}
                        </div>

                    </div>

                    ${
                        Number(
                            Conduce.encabezado.cantidadDestinos
                        ) === 2
                            ? `
                            <div class="destino">

                                <div class="destino-nombre">
                                    Destino 2.:
                                    ${Conduce.encabezado.destino2 || "-"}
                                </div>

                                <div class="precinto">
                                    <strong>Precinto:</strong>
                                    ${Conduce.encabezado.precinto2 || "-"}
                                </div>

                            </div>
                            `
                            : ""
                    }

                </div>

            </section>

            <table class="tabla-principal">

                <thead>

                    <tr>

                        <th class="col-pos">Pos.</th>
						<th class="col-destino">Destino</th>
						<th class="col-material">Material</th>
						<th class="col-descripcion">Descripción</th>
						<th class="col-lote">Lote</th>
						<th class="col-fecha">F. Producción</th>
						<th class="col-fecha">Vence</th>
						<th class="col-ba">B × A</th>
						<th class="col-recorte">Parcial</th>
						<th class="col-cantidad">Cantidad</th>

                    </tr>

                </thead>

                <tbody>

                    ${filasTarimas}

                    ${filasRecortes}

                </tbody>

            </table>

            <footer class="pie-documento">

                <div class="columna-resumen">

                    <div class="tarjeta-pie totales-generales">

                        <h3>Resumen general</h3>

                        <div>
                            <strong>Tarimas:</strong>
                            ${tarimas.length}
                        </div>

                        <div>
                            <strong>Parciales:</strong>
                            ${recortes.length}
                        </div>

                    </div>

                    <div class="tarjeta-pie documentos-sap-resumen">

                        <h3>Documentos SAP</h3>

                        <div class="grid-documentos-sap-impresion">

                            ${[0, 1, 2, 3].map(indice => `
                                <div class="documento-sap-celda">
                                    ${documentosSAP[indice] || ""}
                                </div>
                            `).join("")}

                        </div>

                    </div>

                </div>

                <div class="tarjeta-pie totales-material">

                    <h3>Totales por material</h3>

                    <table class="tabla-materiales">

                        <thead>

                            <tr>
                                <th>Material</th>
                                <th>Descripción</th>
                                <th>Destino</th>
                                <th>Total</th>
                            </tr>

                        </thead>

                        <tbody>
                            ${filasTotalesMaterial}
                        </tbody>

                    </table>

                    <div class="total-final-materiales">

                        <span>
                            TOTAL GENERAL DE UNIDADES
                        </span>

                        <strong>
                            ${totalUnidades}
                        </strong>

                    </div>

                </div>

                <div class="tarjeta-pie anotaciones">

                    <h3>Comentarios u observaciones</h3>

                    ${
                        Conduce.encabezado.observaciones
                            ? `
                            <div class="texto-observaciones">
                                ${Conduce.encabezado.observaciones}
                            </div>
                            `
                            : `
                            <div class="linea-anotacion"></div>
                            <div class="linea-anotacion"></div>
                            <div class="linea-anotacion"></div>
                            `
                    }

                </div>

            </footer>



        </body>

        </html>
    `;

},

async imprimirConduceFinal() {

    const html =
        await Despachos.construirHTMLConduceFinal();

    if (!html) {
        return;
    }

    const ventana =
        window.open("", "_blank");

    if (!ventana) {

        Despachos.notificar(
            "El navegador bloqueó la ventana de impresión.",
            "error"
        );

        return;
    }

    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();

    ventana.onload = () => {

        setTimeout(() => {
            ventana.print();
        }, 500);

    };

},

async abrirVistaConduce(
    idConduce
) {

    /*
     * Reutilizamos el visor modal existente.
     * De esta manera, ningún conduce se abre
     * directamente en una pestaña completa.
     */
    await Despachos.verConduce(
        idConduce
    );

},

esVisorPdfMovil() {
    return window.matchMedia(
        "(max-width: 768px)"
    ).matches;
},

liberarPdfTemporalConduce() {
    if (Despachos.urlPdfTemporalConduce) {
        URL.revokeObjectURL(
            Despachos.urlPdfTemporalConduce
        );
        Despachos.urlPdfTemporalConduce = null;
    }
},

async esperarRecursosDocumentoConduce(documento) {
    if (
        documento.fonts &&
        documento.fonts.ready
    ) {
        try {
            await documento.fonts.ready;
        } catch (error) {
            console.warn(
                "No fue posible esperar las fuentes del conduce:",
                error
            );
        }
    }

    const imagenes = Array.from(
        documento.images || []
    );

    await Promise.all(
        imagenes.map(imagen => {
            if (imagen.complete) {
                return Promise.resolve();
            }

            return new Promise(resolve => {
                const finalizar = () => resolve();
                imagen.addEventListener(
                    "load",
                    finalizar,
                    { once: true }
                );
                imagen.addEventListener(
                    "error",
                    finalizar,
                    { once: true }
                );
                setTimeout(finalizar, 2500);
            });
        })
    );
},

async generarPdfTemporalConduce(
    htmlConduce,
    noConduce
) {
    if (typeof window.html2pdf !== "function") {
        throw new Error(
            "El generador PDF del navegador no está disponible."
        );
    }

    Despachos.liberarPdfTemporalConduce();

    const marcoTemporal =
        document.createElement("iframe");

    marcoTemporal.className =
        "marco-temporal-pdf-conduce";
    marcoTemporal.setAttribute(
        "aria-hidden",
        "true"
    );
    marcoTemporal.tabIndex = -1;

    document.body.appendChild(
        marcoTemporal
    );

    try {
        await new Promise((resolve, reject) => {
            const temporizador = setTimeout(
                () => reject(
                    new Error(
                        "El documento tardó demasiado en prepararse."
                    )
                ),
                10000
            );

            marcoTemporal.onload = () => {
                clearTimeout(temporizador);
                resolve();
            };

            marcoTemporal.srcdoc = htmlConduce;
        });

        const documento =
            marcoTemporal.contentDocument;

        if (!documento || !documento.body) {
            throw new Error(
                "No fue posible preparar el contenido del conduce."
            );
        }

        await Despachos
            .esperarRecursosDocumentoConduce(
                documento
            );

        documento.documentElement.style.width =
            "816px";
        documento.documentElement.style.minWidth =
            "816px";
        documento.body.style.width = "816px";
        documento.body.style.minWidth = "816px";
        documento.body.style.margin = "0";

        const nombreSeguro = String(
            noConduce || "Conduce"
        )
            .replace(/[^0-9A-Za-z_-]+/g, "-")
            .replace(/^-+|-+$/g, "") ||
            "Conduce";

        const blobPdf = await window
            .html2pdf()
            .set({
                margin: 0,
                filename:
                    `${nombreSeguro}.pdf`,
                image: {
                    type: "jpeg",
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff",
                    windowWidth: 816,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: "in",
                    format: "letter",
                    orientation: "portrait",
                    compress: true
                },
                pagebreak: {
                    mode: ["css", "legacy"]
                }
            })
            .from(documento.body)
            .outputPdf("blob");

        if (!(blobPdf instanceof Blob)) {
            throw new Error(
                "El navegador no pudo construir el PDF."
            );
        }

        Despachos.urlPdfTemporalConduce =
            URL.createObjectURL(blobPdf);

        return Despachos
            .urlPdfTemporalConduce;
    } finally {
        marcoTemporal.remove();
    }
},

async verConduce(idConduce) {

    if (!idConduce) {

        Despachos.notificar(
            "No se recibió el identificador del conduce.",
            "error"
        );

        return;

    }

    const respuesta = await Despachos.consultarBackendConCargador({
        action: "obtenerBorrador",
        idConduce: idConduce
    }, "Abriendo conduce", "Estamos preparando la visualización del despacho.");

    if (!respuesta.ok) {

        Despachos.notificar(
            respuesta.mensaje ||
            "No fue posible cargar el conduce.",
            "error"
        );

        return;

    }

    const datos =
        respuesta.data || {};

    const encabezado =
        datos.encabezado || {};

    const detalle =
        Array.isArray(datos.detalle)
            ? datos.detalle
            : [];

    Conduce.limpiar();

    Conduce.encabezado = {
        ...Conduce.encabezado,
        ...encabezado
    };

    Conduce.detalle = detalle;

    const htmlConduce =
        await Despachos.construirHTMLConduceFinal();

    if (!htmlConduce) {
        return;
    }

    let urlPdfMovil = null;

    if (Despachos.esVisorPdfMovil()) {
        try {
            urlPdfMovil = await Despachos
                .ejecutarConCargador(
                    "Preparando PDF del conduce",
                    "Organizando el documento para la pantalla móvil.",
                    () => Despachos
                        .generarPdfTemporalConduce(
                            htmlConduce,
                            encabezado.noConduce ||
                            idConduce
                        )
                );
        } catch (error) {
            console.warn(
                "No fue posible generar el PDF temporal. Se utilizará el visor habitual:",
                error
            );

            Despachos.notificar(
                "El PDF temporal no estuvo disponible. Se muestra la vista normal del conduce.",
                "advertencia"
            );
        }
    }

    const usarPdfMovil =
        Boolean(urlPdfMovil);

    const estado =
        String(
            encabezado.estado || "-"
        ).trim();

    const estadoClase =
        estado.toLowerCase();

    document.getElementById(
        "tituloModal"
    ).textContent =
        "Visualización del despacho";
		
	const contenidoModal =
    document.getElementById(
        "contenidoModal"
    );

	contenidoModal.classList.remove(
		"modo-centro-despachos"
	);

	contenidoModal.classList.add(
		"modo-visor-conduce"
	);

    document.getElementById(
        "contenidoModal"
    ).innerHTML = `

        <div class="visor-conduce-layout">

    <div class="contenedor-ajuste-hoja-conduce">

        <div
            class="visor-conduce-final${usarPdfMovil ? " visor-conduce-final--pdf" : ""}"
            id="hojaConduceVisor"
        >

            <span
                class="estado-visor-conduce ${estadoClase}"
            >
                ${estado}
            </span>

            <div class="area-documento-papel">

                <div class="hoja-documento-papel">

                    <iframe
                        id="iframeConduceFinal"
                        class="iframe-conduce-final"
                        title="${usarPdfMovil ? "Documento PDF del conduce" : "Vista del conduce final"}"
                    ></iframe>

                </div>

            </div>

        </div>

    </div>


    <div class="barra-visor-conduce">

        <button
            type="button"
            class="btn-secundario"
            id="btnCerrarVisorConduce"
        >
            Cerrar
        </button>

        <button
            type="button"
            class="btn-imprimir-vista"
            id="btnImprimirVisorConduce"
        >
            <i class="fa-solid fa-print"></i>
            Imprimir
        </button>

    </div>

</div>
    `;

    document
        .getElementById("modalSistema")
        .classList.remove("oculto");

    const iframe =
        document.getElementById(
            "iframeConduceFinal"
        );

    if (usarPdfMovil) {
        iframe.src = urlPdfMovil;
    } else {
        iframe.srcdoc = htmlConduce;
    }

    document.getElementById(
    "btnCerrarVisorConduce"
).onclick = async () => {

    Despachos
        .liberarPdfTemporalConduce();

    const volverAlCentro =
        Despachos
            .centroDespachosEstado
            .volverDesdeVisor === true;

    const contenidoModal =
        document.getElementById(
            "contenidoModal"
        );

    if (contenidoModal) {

        contenidoModal.classList.remove(
            "modo-visor-conduce"
        );

    }

    if (volverAlCentro) {

        Despachos
            .centroDespachosEstado
            .volverDesdeVisor = false;

        document.body.classList.add(
            "centro-despachos-abierto"
        );

        await Despachos
            .abrirCentroDespachos({
                preservarEstado: true
            });

        return;

    }

    document
        .getElementById(
            "modalSistema"
        )
        .classList.add(
            "oculto"
        );

};

    document.getElementById(
        "btnImprimirVisorConduce"
    ).onclick = async () => {

        if (
            usarPdfMovil &&
            Despachos.urlPdfTemporalConduce
        ) {
            const ventanaPdf = window.open(
                Despachos.urlPdfTemporalConduce,
                "_blank"
            );

            if (!ventanaPdf) {
                Despachos.notificar(
                    "El navegador bloqueó la apertura del PDF.",
                    "error"
                );
            }
            return;
        }

        await Despachos
            .imprimirConduceFinal();

    };

},




seleccionarUnidadPredeterminadaChofer(
    valorChofer,
    selectUnidad
) {

    const choferes =
        Array.isArray(
            Despachos.choferesDisponibles
        )
            ? Despachos.choferesDisponibles
            : [];

    const unidades =
        Array.isArray(
            Despachos.unidadesDisponibles
        )
            ? Despachos.unidadesDisponibles
            : [];

    const chofer =
        choferes.find(item =>
            item.texto === valorChofer
        );

    if (
        !chofer ||
        !chofer.contenedorPorDefecto ||
        !selectUnidad
    ) {
        return;
    }

    const predeterminado =
        String(
            chofer.contenedorPorDefecto
        ).trim();

    const unidad =
        unidades.find(item => {

            const id =
                String(
                    item.id || ""
                ).trim();

            const identificacion =
                String(
                    item.identificacion || ""
                ).trim();

            const texto =
                String(
                    item.texto || ""
                ).trim();

            return (
                id === predeterminado ||
                identificacion === predeterminado ||
                texto === predeterminado ||
                texto.startsWith(
                    predeterminado + " - "
                )
            );

        });

    if (unidad) {

        selectUnidad.value =
            unidad.texto;

    }

},

cerrarPanelUnidadTemporal() {

    const panel =
        document.getElementById(
            "panelUnidadTemporal"
        );

    if (panel) {
        panel.style.display = "none";
    }

    const identificacion =
        document.getElementById(
            "identificacionUnidadTemporal"
        );

    const tipo =
        document.getElementById(
            "tipoContenedorTemporal"
        );

    const tamano =
        document.getElementById(
            "tamanoContenedorTemporal"
        );

    const guardar =
        document.getElementById(
            "guardarUnidadFuturo"
        );

    const predeterminado =
        document.getElementById(
            "establecerUnidadPredeterminada"
        );

    if (identificacion) {
        identificacion.value = "";
    }

    if (tipo) {
        tipo.value = "";
    }

    if (tamano) {
        tamano.value = "";
    }

    if (guardar) {
        guardar.checked = false;
    }

    if (predeterminado) {
        predeterminado.checked = false;
        predeterminado.disabled = true;
    }

},

async aplicarUnidadTemporal() {

    const identificacion =
        String(
            document.getElementById(
                "identificacionUnidadTemporal"
            ).value || ""
        ).trim();

    const tipoContenedor =
        String(
            document.getElementById(
                "tipoContenedorTemporal"
            ).value || ""
        ).trim();

    const tamanoContenedor =
        String(
            document.getElementById(
                "tamanoContenedorTemporal"
            ).value || ""
        ).trim();

    const guardarParaFuturo =
        document.getElementById(
            "guardarUnidadFuturo"
        ).checked;

    const establecerPredeterminado =
        document.getElementById(
            "establecerUnidadPredeterminada"
        ).checked;

    const selectChofer =
        document.getElementById(
            "choferConduce"
        );

    const selectUnidad =
        document.getElementById(
            "unidadConduce"
        );

    if (!identificacion) {

        Despachos.notificar(
            "Debe indicar la identificación del contenedor.",
            "error"
        );

        return;

    }

    if (
        establecerPredeterminado &&
        !selectChofer.value
    ) {

        Despachos.notificar(
            "Debe seleccionar primero un chofer.",
            "error"
        );

        return;

    }

    if (!guardarParaFuturo) {

        const textoTemporal =
            "TEMP - " + identificacion;

        const opcion =
            document.createElement(
                "option"
            );

        opcion.value = textoTemporal;
        opcion.textContent =
            textoTemporal;

        selectUnidad.appendChild(opcion);
        selectUnidad.value =
            textoTemporal;

        Despachos.cerrarPanelUnidadTemporal();

        Despachos.notificar(
            "Contenedor temporal aplicado al despacho.",
            "exito"
        );

        return;

    }

    const choferes =
        Array.isArray(
            Despachos.choferesDisponibles
        )
            ? Despachos.choferesDisponibles
            : [];

    const chofer =
        choferes.find(item =>
            item.texto === selectChofer.value
        );

    try {

        const resultado =
            await Despachos.consultarBackendConCargador({
                action:
                    "guardarUnidadCargaNueva",

                identificacion:
                    identificacion,

                tipoContenedor:
                    tipoContenedor,

                tamanoContenedor:
                    tamanoContenedor,

                idChofer:
                    chofer
                        ? chofer.id
                        : "",

                establecerPredeterminado:
                    establecerPredeterminado
            }, "Guardando unidad", "Estamos registrando la unidad de carga y sus datos.");

        if (!resultado.ok) {

            Despachos.notificar(
                resultado.mensaje ||
                "No fue posible guardar el contenedor.",
                "error"
            );

            return;

        }

        const unidad =
            resultado.data &&
            resultado.data.unidad
                ? resultado.data.unidad
                : null;

        if (!unidad) {

            Despachos.notificar(
                "El servidor no devolvió la unidad guardada.",
                "error"
            );

            return;

        }

        const yaExiste =
            Array.from(
                selectUnidad.options
            ).some(
                opcion =>
                    opcion.value ===
                    unidad.texto
            );

        if (!yaExiste) {

            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                unidad.texto;

            opcion.textContent =
                unidad.texto;

            selectUnidad.appendChild(
                opcion
            );

        }

        selectUnidad.value =
            unidad.texto;

        if (
            !Array.isArray(
                Despachos.unidadesDisponibles
            )
        ) {

            Despachos.unidadesDisponibles =
                [];

        }

        const indiceUnidad =
            Despachos.unidadesDisponibles
                .findIndex(
                    item =>
                        item.id === unidad.id
                );

        if (indiceUnidad === -1) {

            Despachos.unidadesDisponibles.push(
                unidad
            );

        } else {

            Despachos.unidadesDisponibles[
                indiceUnidad
            ] = unidad;

        }

        if (
            establecerPredeterminado &&
            chofer
        ) {

            chofer.contenedorPorDefecto =
                unidad.id;

        }

        Despachos.cerrarPanelUnidadTemporal();

        Despachos.notificar(
            establecerPredeterminado
                ? "Contenedor guardado y establecido como predeterminado."
                : "Contenedor guardado para usos futuros.",
            "exito"
        );

    } catch (error) {

        console.error(
            "Error guardando contenedor:",
            error
        );

        Despachos.notificar(
            "No fue posible guardar el contenedor.",
            "error"
        );

    }

},


	notificar(mensaje, tipo = "info") {

    const notificacionAnterior = document.querySelector(".notificacion-sistema");

    if (notificacionAnterior) {
        notificacionAnterior.remove();
    }

    const notificacion = document.createElement("div");

    notificacion.className = `notificacion-sistema ${tipo}`;

    notificacion.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>${mensaje}</span>
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.classList.add("mostrar");
    }, 50);

    setTimeout(() => {
        notificacion.classList.remove("mostrar");

        setTimeout(() => {
            notificacion.remove();
        }, 300);

    }, 3000);

},
async cargarChoferes() {

    const select =
        document.getElementById(
            "choferConduce"
        );

    if (!select) {
        return;
    }

    try {

        const catalogo =
            await Catalogos.cargarChoferes();

        const choferes =
            Array.isArray(catalogo)
                ? catalogo
                : [];

        Despachos.choferesDisponibles =
            choferes;

        select.innerHTML = `
            <option
                value=""
                selected
                disabled
                hidden
            ></option>
        `;

        choferes.forEach(chofer => {

            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                chofer.texto;

            opcion.textContent =
                chofer.texto;

            select.appendChild(opcion);

        });

    } catch (error) {

        console.error(
            "Error cargando choferes:",
            error
        );

        select.innerHTML = `
            <option value="">
                Error al cargar choferes
            </option>
        `;

        Despachos.notificar(
            "No fue posible cargar los choferes.",
            "error"
        );

    }

},

async cargarUnidades() {

    const select =
        document.getElementById(
            "unidadConduce"
        );

    if (!select) {
        return;
    }

    try {

        const unidadesCatalogo =
            await Catalogos.cargarUnidades();

        const unidades =
            Array.isArray(unidadesCatalogo)
                ? unidadesCatalogo
                : [];

        const contenedores =
            unidades.filter(unidad => {

                const tipo =
                    String(
                        unidad.tipo ||
                        unidad.Tipo ||
                        unidad.tipoUnidad ||
                        unidad.tipo_unidad ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                return tipo === "contenedor";

            });

        Despachos.unidadesDisponibles =
            contenedores;

        select.innerHTML = `
            <option
                value=""
                selected
                disabled
                hidden
            ></option>
        `;

        contenedores.forEach(unidad => {

            const texto =
                String(
                    unidad.texto ||
                    unidad.identificacion ||
                    unidad.id ||
                    ""
                ).trim();

            if (!texto) {
                return;
            }

            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value = texto;
            opcion.textContent = texto;

            select.appendChild(opcion);

        });

        if (contenedores.length === 0) {

            select.innerHTML = `
                <option value="">
                    No hay contenedores disponibles
                </option>
            `;

        }

    } catch (error) {

        console.error(
            "Error cargando unidades de carga:",
            error
        );

        select.innerHTML = `
            <option value="">
                Error al cargar contenedores
            </option>
        `;

        Despachos.notificar(
            "No fue posible cargar los contenedores.",
            "error"
        );

    }

},

// =====================================================
// VISOR DE INSPECCIONES REALIZADAS
// =====================================================

async abrirInspeccionesRealizadas() {

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

        Despachos.notificar(
            "No se encontró la ventana del sistema.",
            "error"
        );

        return;

    }


    const estado =
        Despachos.listadoInspeccionesEstado;


    estado.desplazamiento =
        0;

    estado.total =
        0;

    estado.hayMas =
        false;

    estado.cargando =
        false;

    estado.registros =
        [];

    estado.inspectores =
        [];

    estado.filtros = {

        busqueda:
            "",

        mes:
            "",

        ano:
            "",

        estado:
            "",

        resultado:
            "",

        inspector:
            ""

    };


    titulo.textContent =
        "Inspecciones de contenedores";


    contenido.classList.remove(
        "modo-visor-conduce",
        "modo-centro-despachos"
    );

    contenido.classList.add(
        "modo-visor-inspecciones"
    );

    modal.classList.add(
        "modal-visor-inspecciones"
    );

    const observarCierre =
        new MutationObserver(() => {
            if (modal.classList.contains("oculto")) {
                contenido.classList.remove(
                    "modo-visor-inspecciones"
                );
                modal.classList.remove(
                    "modal-visor-inspecciones"
                );
                observarCierre.disconnect();
            }
        });

    observarCierre.observe(
        modal,
        {
            attributes: true,
            attributeFilter: ["class"]
        }
    );


    modal.classList.remove(
        "oculto"
    );


    Despachos
        .renderizarVisorInspecciones();


    Despachos
        .configurarEventosVisorInspecciones();


    await Despachos
        .cargarListadoInspecciones({
            reiniciar: true
        });

},

renderizarVisorInspecciones() {

    const contenido =
        document.getElementById(
            "contenidoModal"
        );


    if (!contenido) {
        return;
    }


    const anioActual =
        new Date()
            .getFullYear();


    const opcionesAnios =
        [];


    for (
        let anio = anioActual;
        anio >= anioActual - 10;
        anio--
    ) {

        opcionesAnios.push(`
            <option value="${anio}">
                ${anio}
            </option>
        `);

    }


    contenido.innerHTML = `

        <div class="visor-inspecciones">

            <details class="plegable-inspecciones plegable-indicadores-inspecciones">
                <summary>
                    <span><i class="fa-solid fa-chart-column"></i> Indicadores de inspección</span>
                    <i class="linea-plegable-inspecciones"></i>
                    <i class="fa-solid fa-chevron-down flecha-plegable-inspecciones"></i>
                </summary>

                <section
                    class="resumen-inspecciones contenido-plegable-inspecciones"
                    id="resumenInspecciones"
                ></section>
            </details>


            <details class="plegable-inspecciones plegable-filtros-inspecciones">
                <summary>
                    <span><i class="fa-solid fa-sliders"></i> Filtros de consulta</span>
                    <i class="linea-plegable-inspecciones"></i>
                    <i class="fa-solid fa-chevron-down flecha-plegable-inspecciones"></i>
                </summary>

            <section class="filtros-inspecciones contenido-plegable-inspecciones">

                <div
                    class="
                        filtro-inspecciones
                        filtro-busqueda-inspecciones
                    "
                >

                    <label for="buscarInspeccion">
                        Buscar
                    </label>

                    <div class="entrada-busqueda-inspecciones">

                        <i class="fa-solid fa-magnifying-glass"></i>

                        <input
                            type="search"
                            id="buscarInspeccion"
                            placeholder="Inspección, conduce, contenedor, chofer o inspector"
                            autocomplete="off"
                        >

                    </div>

                </div>


                <div class="filtro-inspecciones">

                    <label for="filtroMesInspeccion">
                        Mes
                    </label>

                    <select id="filtroMesInspeccion">

                        <option value="">
                            Todos
                        </option>

                        <option value="01">Enero</option>
                        <option value="02">Febrero</option>
                        <option value="03">Marzo</option>
                        <option value="04">Abril</option>
                        <option value="05">Mayo</option>
                        <option value="06">Junio</option>
                        <option value="07">Julio</option>
                        <option value="08">Agosto</option>
                        <option value="09">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>

                    </select>

                </div>


                <div class="filtro-inspecciones">

                    <label for="filtroAnoInspeccion">
                        Año
                    </label>

                    <select id="filtroAnoInspeccion">

                        <option value="">
                            Todos
                        </option>

                        ${opcionesAnios.join("")}

                    </select>

                </div>


                <div class="filtro-inspecciones">

                    <label for="filtroEstadoInspeccion">
                        Estado
                    </label>

                    <select id="filtroEstadoInspeccion">

                        <option value="">
                            Todos
                        </option>

                        <option value="Pendiente">
                            Pendiente
                        </option>

                        <option value="En proceso">
                            En proceso
                        </option>

                        <option value="Completada">
                            Completada
                        </option>

                        <option value="Completado">
                            Completado
                        </option>

                    </select>

                </div>


                <div class="filtro-inspecciones">

                    <label for="filtroResultadoInspeccion">
                        Resultado
                    </label>

                    <select id="filtroResultadoInspeccion">

                        <option value="">
                            Todos
                        </option>

                        <option value="Conforme">
                            Conforme
                        </option>

                        <option value="Con hallazgos">
                            Con hallazgos
                        </option>

                        <option value="No conforme">
                            No conforme
                        </option>

                        <option value="Pendiente">
                            Pendiente
                        </option>

                    </select>

                </div>


                <div class="filtro-inspecciones">

                    <label for="filtroInspectorInspeccion">
                        Inspector
                    </label>

                    <select id="filtroInspectorInspeccion">

                        <option value="">
                            Todos
                        </option>

                    </select>

                </div>


                <button
                    type="button"
                    id="btnLimpiarFiltrosInspecciones"
                    class="btn-limpiar-filtros-inspecciones"
                    title="Limpiar filtros"
                >

                    <i class="fa-solid fa-filter-circle-xmark"></i>

                    Limpiar

                </button>

            </section>
            </details>


            <div class="barra-resultados-inspecciones">

                <div
                    class="contador-resultados-inspecciones"
                    id="contadorResultadosInspecciones"
                >
                    Mostrando 0 de 0 inspecciones
                </div>


                <button
                    type="button"
                    id="btnCargarMasInspecciones"
                    class="btn-cargar-mas-inspecciones"
                    hidden
                >

                    <i class="fa-solid fa-plus"></i>

                    <span>
                        Cargar 10 más
                    </span>

                </button>

            </div>


            <section
                class="lista-inspecciones"
                id="listaInspecciones"
            >

                <div class="estado-carga-inspecciones">

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <span>
                        Cargando inspecciones realizadas.
                    </span>

                </div>

            </section>


            <div class="acciones-visor-inspecciones">

                <button
                    type="button"
                    id="btnCerrarVisorInspecciones"
                    class="btn-secundario"
                >
                    Cerrar
                </button>

            </div>

        </div>
    `;


    Despachos
        .renderizarResumenInspecciones(
            Despachos
                .listadoInspeccionesEstado
                .resumen
        );

},

claveUnicaInspeccion(item) {
    const registro = item || {};
    const id = String(
        registro.idInspeccion ||
        registro.ID_Inspeccion ||
        ""
    ).trim();

    if (id) {
        return `ID:${id.toUpperCase()}`;
    }

    return [
        registro.idConduce || "",
        registro.noConduce || "",
        registro.fechaHora ||
            registro.fechaInspeccion || "",
        registro.unidadCarga || ""
    ]
        .map(valor => String(valor).trim().toUpperCase())
        .join("|");
},

fechaOrdenInspeccion(item) {
    const valor = String(
        item?.fechaHora ||
        item?.fechaInspeccion ||
        item?.fecha ||
        ""
    ).trim();

    const fechaDirecta = Date.parse(valor);
    if (Number.isFinite(fechaDirecta)) {
        return fechaDirecta;
    }

    const coincidencia = valor.match(
        /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (coincidencia) {
        return new Date(
            Number(coincidencia[3]),
            Number(coincidencia[2]) - 1,
            Number(coincidencia[1]),
            Number(coincidencia[4] || 0),
            Number(coincidencia[5] || 0),
            Number(coincidencia[6] || 0)
        ).getTime();
    }

    return 0;
},

ordenarInspeccionesRecientes(registros) {
    return [...(Array.isArray(registros) ? registros : [])]
        .sort((a, b) => {
            const diferenciaFecha =
                Despachos.fechaOrdenInspeccion(b) -
                Despachos.fechaOrdenInspeccion(a);

            if (diferenciaFecha) {
                return diferenciaFecha;
            }

            const numeroId = item => {
                const partes = String(
                    item?.idInspeccion || ""
                ).match(/(\d+)(?!.*\d)/);
                return partes ? Number(partes[1]) : 0;
            };

            return numeroId(b) - numeroId(a);
        });
},

combinarInspeccionesSinDuplicados(
    actuales,
    nuevos
) {
    const mapa = new Map();

    [...(actuales || []), ...(nuevos || [])]
        .forEach(item => {
            const clave =
                Despachos.claveUnicaInspeccion(item);
            if (!mapa.has(clave)) {
                mapa.set(clave, item);
            }
        });

    return Despachos
        .ordenarInspeccionesRecientes(
            Array.from(mapa.values())
        );
},

async cargarListadoInspecciones(
    opciones = {}
) {

    const estado =
        Despachos
            .listadoInspeccionesEstado;


    if (estado.cargando) {
        return;
    }


    const reiniciar =
        opciones.reiniciar === true;


    const lista =
        document.getElementById(
            "listaInspecciones"
        );


    const botonCargarMas =
        document.getElementById(
            "btnCargarMasInspecciones"
        );


    if (!lista) {
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

    }

    const desplazamientoSolicitado =
        reiniciar
            ? 0
            : Math.max(
                Number(estado.desplazamiento || 0),
                estado.registros.length
            );


    estado.cargando =
        true;


    if (botonCargarMas) {

        botonCargarMas.disabled =
            true;

        botonCargarMas.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>

            <span>
                Cargando...
            </span>
        `;

    }


    if (
        window.CargadorSistema &&
        typeof CargadorSistema.mostrar ===
            "function"
    ) {

        CargadorSistema.mostrar(

            reiniciar
                ? "Consultando inspecciones"
                : "Cargando más inspecciones",

            reiniciar
                ? "Estamos aplicando los filtros seleccionados."
                : "Estamos consultando los siguientes registros."

        );

    }


    if (
        reiniciar &&
        estado.registros.length === 0
    ) {

        lista.innerHTML = `

            <div class="estado-carga-inspecciones">

                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    Cargando inspecciones realizadas.
                </span>

            </div>
        `;

    }


    try {

        const respuesta =
            await API.post({

                action:
                    "listarInspeccionesRealizadas",

                limite:
                    estado.limite,

                desplazamiento:
                    desplazamientoSolicitado,

                offset:
                    desplazamientoSolicitado,

                pagina:
                    Math.floor(
                        desplazamientoSolicitado /
                        estado.limite
                    ) + 1,

                orden:
                    "DESC",

                busqueda:
                    estado.filtros.busqueda,

                mes:
                    estado.filtros.mes,

                ano:
                    estado.filtros.ano,

                estado:
                    estado.filtros.estado,

                resultado:
                    estado.filtros.resultado,

                inspector:
                    estado.filtros.inspector

            });


        if (
            !respuesta ||
            !respuesta.ok
        ) {

            throw new Error(
                respuesta?.mensaje ||
                "No fue posible cargar las inspecciones."
            );

        }


        const datos =
            respuesta.data || {};


        const nuevosRegistros =
            Array.isArray(
                datos.registros
            )
                ? datos.registros
                : [];


        const cantidadAnterior =
            estado.registros.length;

        estado.registros =
            Despachos
                .combinarInspeccionesSinDuplicados(
                    reiniciar
                        ? []
                        : estado.registros,
                    nuevosRegistros
                );

        const cantidadAgregada =
            estado.registros.length -
            cantidadAnterior;


        estado.total =
            Number(
                datos.total || 0
            );


        estado.desplazamiento =
            desplazamientoSolicitado +
            nuevosRegistros.length;

        const siguienteServidor = Number(
            datos.siguienteDesplazamiento
        );

        if (
            Number.isFinite(siguienteServidor) &&
            siguienteServidor >
                estado.desplazamiento
        ) {
            estado.desplazamiento =
                siguienteServidor;
        }

        estado.hayMas =
            datos.hayMas === true &&
            estado.desplazamiento <
                estado.total;

        if (
            !reiniciar &&
            nuevosRegistros.length > 0 &&
            cantidadAgregada === 0
        ) {
            estado.hayMas = false;
            Despachos.notificar(
                "El servidor repitió la página anterior. Se detuvo la carga para evitar registros duplicados.",
                "advertencia"
            );
        }


        estado.resumen = {

            total:
                Number(
                    datos.resumen?.total || 0
                ),

            completadas:
                Number(
                    datos.resumen?.completadas || 0
                ),

            conformes:
                Number(
                    datos.resumen?.conformes || 0
                ),

            conHallazgos:
                Math.max(
                    Number(
                        datos.resumen?.conHallazgos || 0
                    ),
                    Math.max(
                        0,
                        Number(
                            datos.resumen?.completadas || 0
                        ) -
                        Number(
                            datos.resumen?.conformes || 0
                        )
                    )
                ),

            pendientes:
                Number(
                    datos.resumen?.pendientes || 0
                )

        };


        estado.inspectores =
            Array.isArray(
                datos.inspectores
            )
                ? datos.inspectores
                : estado.inspectores;


        Despachos
            .actualizarOpcionesInspectores();


        Despachos
            .renderizarResumenInspecciones(
                estado.resumen
            );


        Despachos
            .renderizarListaInspecciones(
                estado.registros,
                estado.total
            );


        Despachos
            .actualizarPaginacionInspecciones();


    } catch (error) {

        console.error(
            "Error cargando inspecciones paginadas:",
            error
        );


        if (
            estado.registros.length === 0
        ) {

            lista.innerHTML = `

                <div
                    class="
                        estado-vacio-inspecciones
                        estado-error-inspecciones
                    "
                >

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <strong>
                        No fue posible cargar las inspecciones
                    </strong>

                    <span>
                        ${
                            Despachos
                                .escaparHTMLInspecciones(
                                    error.message ||
                                    "Error desconocido."
                                )
                        }
                    </span>

                </div>
            `;

        }


        Despachos.notificar(
            error.message ||
            "No fue posible cargar las inspecciones.",
            "error"
        );


    } finally {

        estado.cargando =
            false;


        Despachos
            .actualizarPaginacionInspecciones();


        if (
            window.CargadorSistema &&
            typeof CargadorSistema.ocultar ===
                "function"
        ) {

            CargadorSistema.ocultar();

        }

    }

},


leerFiltrosInspecciones() {

    const estado =
        Despachos
            .listadoInspeccionesEstado;


    estado.filtros = {

        busqueda:
            String(
                document.getElementById(
                    "buscarInspeccion"
                )?.value || ""
            ).trim(),

        mes:
            String(
                document.getElementById(
                    "filtroMesInspeccion"
                )?.value || ""
            ).trim(),

        ano:
            String(
                document.getElementById(
                    "filtroAnoInspeccion"
                )?.value || ""
            ).trim(),

        estado:
            String(
                document.getElementById(
                    "filtroEstadoInspeccion"
                )?.value || ""
            ).trim(),

        resultado:
            String(
                document.getElementById(
                    "filtroResultadoInspeccion"
                )?.value || ""
            ).trim(),

        inspector:
            String(
                document.getElementById(
                    "filtroInspectorInspeccion"
                )?.value || ""
            ).trim()

    };

},


actualizarOpcionesInspectores() {

    const estado =
        Despachos
            .listadoInspeccionesEstado;


    const select =
        document.getElementById(
            "filtroInspectorInspeccion"
        );


    if (!select) {
        return;
    }


    const valorActual =
        String(
            select.value || ""
        );


    select.innerHTML = `

        <option value="">
            Todos
        </option>

        ${estado.inspectores
            .map(function(inspector) {

                const valor =
                    Despachos
                        .escaparHTMLInspecciones(
                            inspector
                        );

                return `
                    <option value="${valor}">
                        ${valor}
                    </option>
                `;

            })
            .join("")}
    `;


    const existe =
        estado.inspectores.some(
            function(inspector) {

                return (
                    String(inspector) ===
                    valorActual
                );

            }
        );


    select.value =
        existe
            ? valorActual
            : estado.filtros.inspector;

},


actualizarPaginacionInspecciones() {

    const estado =
        Despachos
            .listadoInspeccionesEstado;


    const contador =
        document.getElementById(
            "contadorResultadosInspecciones"
        );


    const boton =
        document.getElementById(
            "btnCargarMasInspecciones"
        );


    if (contador) {

        contador.textContent =
            `Mostrando ${
                estado.registros.length
            } de ${
                estado.total
            } inspección(es)`;

    }


    if (!boton) {
        return;
    }


    boton.hidden =
        !estado.hayMas;


    boton.disabled =
        estado.cargando;


    boton.innerHTML = `

        <i class="fa-solid fa-plus"></i>

        <span>
            Cargar ${estado.limite} más
        </span>
    `;

},


configurarEventosVisorInspecciones() {

    const controles = [

        "filtroMesInspeccion",
        "filtroAnoInspeccion",
        "filtroEstadoInspeccion",
        "filtroResultadoInspeccion",
        "filtroInspectorInspeccion"

    ];


    controles.forEach(
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

                    Despachos
                        .leerFiltrosInspecciones();


                    await Despachos
                        .cargarListadoInspecciones({
                            reiniciar: true
                        });

                };

        }
    );


    const inputBusqueda =
        document.getElementById(
            "buscarInspeccion"
        );


    let temporizadorBusqueda =
        null;


    if (inputBusqueda) {

        inputBusqueda.oninput =
            function() {

                clearTimeout(
                    temporizadorBusqueda
                );


                temporizadorBusqueda =
                    setTimeout(
                        async function() {

                            Despachos
                                .leerFiltrosInspecciones();


                            await Despachos
                                .cargarListadoInspecciones({
                                    reiniciar: true
                                });

                        },
                        650
                    );

            };

    }


    const botonCargarMas =
        document.getElementById(
            "btnCargarMasInspecciones"
        );


    if (botonCargarMas) {

        botonCargarMas.onclick =
            async function() {

                if (
                    botonCargarMas.disabled
                ) {
                    return;
                }


                await Despachos
                    .cargarListadoInspecciones();

            };

    }


    const botonLimpiar =
        document.getElementById(
            "btnLimpiarFiltrosInspecciones"
        );


    if (botonLimpiar) {

        botonLimpiar.onclick =
            async function() {

                const ids = [

                    "buscarInspeccion",
                    "filtroMesInspeccion",
                    "filtroAnoInspeccion",
                    "filtroEstadoInspeccion",
                    "filtroResultadoInspeccion",
                    "filtroInspectorInspeccion"

                ];


                ids.forEach(
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


                Despachos
                    .leerFiltrosInspecciones();


                await Despachos
                    .cargarListadoInspecciones({
                        reiniciar: true
                    });

            };

    }


    const botonCerrar =
        document.getElementById(
            "btnCerrarVisorInspecciones"
        );


    if (botonCerrar) {

        botonCerrar.onclick =
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

renderizarResumenInspecciones(
    resumen
) {

    const contenedor =
        document.getElementById(
            "resumenInspecciones"
        );


    if (!contenedor) {
        return;
    }


    const datos =
        resumen || {};


    const total =
        Number(
            datos.total || 0
        );


    const completadas =
        Number(
            datos.completadas || 0
        );


    const conformes =
        Number(
            datos.conformes || 0
        );


    const hallazgos =
        Math.max(
            Number(
                datos.conHallazgos || 0
            ),
            Math.max(
                0,
                completadas - conformes
            )
        );


    const pendientes =
        Number(
            datos.pendientes || 0
        );


    contenedor.innerHTML = `

        <article class="tarjeta-resumen-inspeccion total">

            <span>
                Total
            </span>

            <strong>
                ${total}
            </strong>

        </article>


        <article class="tarjeta-resumen-inspeccion completadas">

            <span>
                Completadas
            </span>

            <strong>
                ${completadas}
            </strong>

        </article>


        <article class="tarjeta-resumen-inspeccion conformes">

            <span>
                Conformes
            </span>

            <strong>
                ${conformes}
            </strong>

        </article>


        <article class="tarjeta-resumen-inspeccion hallazgos">

            <span>
                Con hallazgos
            </span>

            <strong>
                ${hallazgos}
            </strong>

        </article>


        <article class="tarjeta-resumen-inspeccion pendientes">

            <span>
                Pendientes
            </span>

            <strong>
                ${pendientes}
            </strong>

        </article>
    `;

},

renderizarListaInspecciones(inspecciones, totalOriginal) {

    const lista =
        document.getElementById(
            "listaInspecciones"
        );

    const contador =
        document.getElementById(
            "contadorResultadosInspecciones"
        );

    if (!lista || !contador) {
        return;
    }

    contador.textContent =
    `Mostrando ${
        inspecciones.length
    } de ${
        totalOriginal
    } inspección(es)`;

    if (inspecciones.length === 0) {

        lista.innerHTML = `
            <div class="estado-vacio-inspecciones">
                <i class="fa-regular fa-folder-open"></i>
                <strong>No se encontraron inspecciones</strong>
                <span>Modifica o limpia los filtros para ampliar la búsqueda.</span>
            </div>
        `;

        return;
    }

    let sesionActual = {};

    try {
        sesionActual = JSON.parse(
            localStorage.getItem("sesion") ||
            sessionStorage.getItem("sesion") ||
            "{}"
        );
    } catch (error) {
        sesionActual = {};
    }

    const esAdministrador =
        String(sesionActual.rol || "")
            .trim()
            .toLowerCase() ===
        "administrador";

    lista.innerHTML = inspecciones.map(item => {

        const estado =
            String(item.estado || "Pendiente").trim();

        const resultado =
            String(item.resultado || "Pendiente").trim();

        const claseEstado =
            Despachos.claseInspeccion(estado);

        const claseResultado =
            Despachos.claseInspeccion(resultado);

        const pdfUrl =
            String(item.pdfUrl || "").trim();
			
					
		const estadoNormalizado =
			estado
				.trim()
				.toLowerCase();

		const mostrarContinuar =
			!Despachos.esAnalista() &&
			!estadoNormalizado.startsWith(
				"complet"
			);

        return `
            <article class="tarjeta-inspeccion-realizada">

                <div class="cabecera-tarjeta-inspeccion">
                    <div>
                        <span>Inspección</span>
                        <strong>${Despachos.escaparHTMLInspecciones(item.idInspeccion || "-")}</strong>
                    </div>

                    <div class="etiquetas-inspeccion">
                        <span class="etiqueta-inspeccion ${claseEstado}">
                            ${Despachos.escaparHTMLInspecciones(estado)}
                        </span>
                        <span class="etiqueta-inspeccion ${claseResultado}">
                            ${Despachos.escaparHTMLInspecciones(resultado)}
                        </span>
                    </div>
                </div>

                <div class="datos-tarjeta-inspeccion">
                    <div>
                        <span>Conduce</span>
                        <strong>${Despachos.escaparHTMLInspecciones(item.noConduce || "-")}</strong>
                    </div>
                    <div>
                        <span>Fecha</span>
                        <strong>${Despachos.escaparHTMLInspecciones(item.fechaHora || item.fechaInspeccion || "-")}</strong>
                    </div>
                    <div>
                        <span>Inspector</span>
                        <strong>${Despachos.escaparHTMLInspecciones(item.inspector || "-")}</strong>
                    </div>
                    <div>
                        <span>Contenedor</span>
                        <strong>${Despachos.escaparHTMLInspecciones(item.unidadCarga || "-")}</strong>
                    </div>
                    <div>
                        <span>Chofer</span>
                        <strong>${Despachos.escaparHTMLInspecciones(item.chofer || "-")}</strong>
                    </div>
                    <div>
                        <span>No conformidades</span>
                        <strong>${Number(item.noConformidades || 0)}</strong>
                    </div>
                </div>

                <div class="pie-tarjeta-inspeccion">

					<span>
						<i class="fa-solid fa-camera"></i>
						${Number(item.totalEvidencias || 0)} evidencia(s)
					</span>

					<div class="acciones-tarjeta-inspeccion">

						${
							mostrarContinuar
								? `
									<button
										type="button"
										class="btn-continuar-inspeccion-realizada"
										data-id-conduce="${Despachos.escaparHTMLInspecciones(
											item.idConduce || ""
										)}"
										data-id-inspeccion="${Despachos.escaparHTMLInspecciones(
											item.idInspeccion || ""
										)}"
										title="Continuar inspección"
									>
										<i class="fa-solid fa-play"></i>
										Continuar
									</button>
								`
								: ""
						}

                        ${
                            esAdministrador &&
                            estadoNormalizado.startsWith("complet")
                                ? `
                                    <button
                                        type="button"
                                        class="btn-regenerar-pdf-inspeccion"
                                        data-id-inspeccion="${Despachos.escaparHTMLInspecciones(
                                            item.idInspeccion || ""
                                        )}"
                                        title="Regenerar el PDF con los datos actuales de Google Sheets"
                                    >
                                        <i class="fa-solid fa-rotate"></i>
                                        Regenerar PDF
                                    </button>
                                `
                                : ""
                        }

						<button
							type="button"
							class="btn-abrir-pdf-inspeccion"
							data-pdf-url="${Despachos.escaparHTMLInspecciones(pdfUrl)}"
							${pdfUrl ? "" : "disabled"}
							title="${pdfUrl ? "Abrir PDF" : "PDF no disponible"}"
						>
							<i class="fa-solid fa-file-pdf"></i>
							${pdfUrl ? "Abrir PDF" : "PDF no disponible"}
						</button>

					</div>

				</div>

            </article>
        `;

    }).join("");

    lista
        .querySelectorAll(
            ".btn-regenerar-pdf-inspeccion"
        )
        .forEach(boton => {

            boton.onclick = async () => {

                const idInspeccion =
                    String(
                        boton.dataset.idInspeccion || ""
                    ).trim();

                const confirmado =
                    await Despachos
                        .confirmarRegeneracionPDFInspeccion(
                            idInspeccion
                        );

                if (!confirmado) return;

                try {

                    const respuesta =
                        await Despachos.ejecutarConCargador(
                            "Regenerando PDF BASC",
                            "Estamos creando el documento con los datos corregidos.",
                            () => API.post({
                                action: "regenerarPDFInspeccionContenedor",
                                idInspeccion: idInspeccion,
                                rol: sesionActual.rol || "",
                                usuario:
                                    sesionActual.usuario ||
                                    sesionActual.nombre || "",
                                usuarioId:
                                    sesionActual.id ||
                                    sesionActual.usuarioId || ""
                            })
                        );

                    if (!respuesta || !respuesta.ok) {
                        throw new Error(
                            respuesta?.mensaje ||
                            "No fue posible regenerar el PDF."
                        );
                    }

                    const nuevaUrl =
                        String(
                            respuesta.data?.pdfUrl || ""
                        ).trim();

                    const botonPDF =
                        boton.closest(
                            ".tarjeta-inspeccion-realizada"
                        )?.querySelector(
                            ".btn-abrir-pdf-inspeccion"
                        );

                    if (botonPDF && nuevaUrl) {
                        botonPDF.dataset.pdfUrl = nuevaUrl;
                        botonPDF.disabled = false;
                    }

                    Despachos.notificar(
                        "PDF regenerado y vínculo actualizado correctamente.",
                        "exito"
                    );

                    if (nuevaUrl) {
                        window.open(
                            nuevaUrl,
                            "_blank",
                            "noopener,noreferrer"
                        );
                    }

                } catch (error) {

                    console.error(
                        "Error regenerando PDF de inspección:",
                        error
                    );

                    Despachos.notificar(
                        error.message ||
                        "No fue posible regenerar el PDF.",
                        "error"
                    );

                }

            };

        });

    lista
        .querySelectorAll(
            ".btn-abrir-pdf-inspeccion:not([disabled])"
        )
        .forEach(boton => {

            boton.onclick = () => {

                const url =
                    String(
                        boton.dataset.pdfUrl || ""
                    ).trim();

                if (!url) {
                    return;
                }

                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );
            };
        });
    lista
        .querySelectorAll(
            ".btn-continuar-inspeccion-realizada"
        )
        .forEach(boton => {

            boton.onclick = async () => {

                if (Despachos.denegarEdicionAnalista()) return;

                const idConduce =
                    String(
                        boton.dataset.idConduce || ""
                    ).trim();

                const idInspeccion =
                    String(
                        boton.dataset.idInspeccion || ""
                    ).trim();

                if (!idConduce) {

                    Despachos.notificar(
                        "No fue posible identificar el conduce asociado a la inspección.",
                        "error"
                    );

                    return;

                }

                if (
                    window.CargadorSistema &&
                    typeof CargadorSistema.mostrar ===
                        "function"
                ) {

                    CargadorSistema.mostrar(
                        "Cargando inspección",
                        "Estamos recuperando el último paso completado."
                    );

                }

                try {

                    /*
                     * Cerramos el listado actual antes de abrir
                     * el asistente de inspección.
                     */
                    const modal =
                        document.getElementById(
                            "modalSistema"
                        );

                    if (modal) {

                        modal.classList.add(
                            "oculto"
                        );

                    }

                    /*
                     * Abrir carga catálogos y prepara el
                     * asistente desde un estado limpio.
                     */
                    await InspeccionContenedores.abrir();

                    /*
                     * Reutilizamos el flujo existente.
                     * cargarDatosConduce termina llamando a
                     * revisarInspeccionActiva, que determina
                     * automáticamente el paso pendiente.
                     */
                    await InspeccionContenedores
                        .cargarDatosConduce(
                            idConduce
                        );

                    console.log(
                        "Inspección recuperada desde el listado:",
                        {
                            idInspeccion:
                                idInspeccion,

                            idConduce:
                                idConduce
                        }
                    );

                } catch (error) {

                    console.error(
                        "Error continuando inspección desde el listado:",
                        error
                    );

                    Despachos.notificar(
                        error.message ||
                        "No fue posible recuperar la inspección.",
                        "error"
                    );

                } finally {

                    if (
                        window.CargadorSistema &&
                        typeof CargadorSistema.ocultar ===
                            "function"
                    ) {

                        CargadorSistema.ocultar();

                    }

                }

            };

        });	
},


confirmarRegeneracionPDFInspeccion(idInspeccion) {

    return new Promise(resolve => {

        const modal = document.createElement("div");

        modal.className =
            "modal-confirmacion-friobox";

        modal.innerHTML = `
            <div class="modal-confirmacion-friobox__fondo"></div>
            <div class="modal-confirmacion-friobox__tarjeta">
                <div class="modal-confirmacion-friobox__icono">
                    <i class="fa-solid fa-file-circle-exclamation"></i>
                </div>
                <div class="modal-confirmacion-friobox__contenido">
                    <span>Acción administrativa</span>
                    <h3>
                        ¿Regenerar el PDF de
                        ${Despachos.escaparHTMLInspecciones(idInspeccion)}?
                    </h3>
                    <p>
                        Se leerán los datos actuales de Google Sheets.
                        El PDF anterior permanecerá en Drive y PDF_URL
                        apuntará al documento nuevo.
                    </p>
                    <div class="modal-confirmacion-friobox__acciones">
                        <button
                            type="button"
                            class="btn-confirmacion-friobox btn-confirmacion-friobox--no"
                            id="btnCancelarRegeneracionPDF"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            class="btn-confirmacion-friobox btn-confirmacion-friobox--si"
                            id="btnConfirmarRegeneracionPDF"
                        >
                            <i class="fa-solid fa-rotate"></i>
                            Regenerar PDF
                        </button>
                    </div>
                </div>
            </div>
        `;

        const cerrar = resultado => {
            modal.remove();
            resolve(resultado);
        };

        modal.querySelector(
            "#btnCancelarRegeneracionPDF"
        ).onclick = () => cerrar(false);

        modal.querySelector(
            "#btnConfirmarRegeneracionPDF"
        ).onclick = () => cerrar(true);

        modal.querySelector(
            ".modal-confirmacion-friobox__fondo"
        ).onclick = () => cerrar(false);

        document.body.appendChild(modal);

    });

},


claseInspeccion(valor) {

    const texto = String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    if (
        texto === "conforme" ||
        texto.startsWith("complet")
    ) {
        return "exito";
    }

    if (
        texto.includes("hallazgo") ||
        texto.includes("no cumple") ||
        texto === "anulada"
    ) {
        return "error";
    }

    if (
        texto.includes("proceso") ||
        texto === "pendiente" ||
        texto === "borrador"
    ) {
        return "advertencia";
    }

    return "neutral";

},


escaparHTMLInspecciones(valor) {

    return String(
        valor === null ||
        valor === undefined
            ? ""
            : valor
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

},

	

};

window.addEventListener(
    "resize",
    () => {

        if (
            document.getElementById(
                "hojaConduceVisor"
            )
        ) {

            Despachos
                .ajustarHojaConduceAlVisor();

        }

    }
);

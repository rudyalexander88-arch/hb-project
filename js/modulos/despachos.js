// ==========================================
// MÓDULO DESPACHOS
// Sistema Logístico PT
// ==========================================

window.Despachos = {

    async cargar() {

    const contenido =
        document.getElementById("contenidoPrincipal");

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

				<button
					id="btnVerTodosDespachos"
					class="btn-ver-todos-despachos"
				>
					<i class="fa-solid fa-table-list"></i>
					Ver todos los despachos
				</button>

				<button
					id="btnNuevoConduce"
					class="btn-rojo"
				>
					<i class="fa-solid fa-plus"></i>
					Nuevo Conduce
				</button>

			</div>

            </div>

            <div class="cards-resumen">

                <div class="card-resumen">
                    <h3>Abiertos</h3>
                    <span id="totalAbiertos">0</span>
                </div>

                <div
					class="card-resumen card-meta-despachos"
					id="cardMetaDespachos"
				>

					<h3>Completados Hoy</h3>

					<span id="totalCerrados">0</span>

					<div class="cumplimiento-meta">

						<span id="porcentajeMetaDespachos">
							0%
						</span>

						<small id="textoMetaDespachos">
							Meta: 0
						</small>

					</div>

				</div>

                <div class="card-resumen">

					<h3>Paquetes enviados hoy</h3>

					<span id="totalTarimas">0</span>

				</div>

            </div>

            <div class="paneles">

                <div class="panel panel-abiertos">

                    <h3>
                        <i class="fa-solid fa-folder-open"></i>
                        Conduces Abiertos
                    </h3>

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

                    <h3>
                        <i class="fa-solid fa-box-archive"></i>
                        Conduces Completados
                    </h3>

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

	document
		.getElementById("btnVerTodosDespachos")
		.addEventListener("click", () => {

			Despachos.notificar(
				"La consulta general de despachos será construida en el próximo módulo.",
				"advertencia"
			);

		});

    document
        .getElementById("btnNuevoConduce")
        .addEventListener("click", () => {

            Conduce.limpiar();
            Despachos.nuevoConduce();

        });

    await Despachos.cargarConducesAbiertos();
	
	await Despachos.cargarResumenDiario();

},


async cargarConducesAbiertos() {

    const tablaAbiertos =
        document.getElementById("tablaAbiertos");

    const tablaCompletados =
        document.getElementById("tablaDespachados");

    const totalAbiertos =
        document.getElementById("totalAbiertos");

    const totalLineas =
        document.getElementById("totalTarimas");

    if (
        !tablaAbiertos ||
        !tablaCompletados ||
        !totalAbiertos ||
        !totalLineas
    ) {
        return;
    }

    try {

        const [
            respuestaBorradores,
            respuestaEstados
        ] = await Promise.all([

            API.post({
                action: "listarBorradores"
            }),

            API.post({
                action: "listarDespachadosYCompletados"
            })

        ]);

        const borradores =
            respuestaBorradores.ok &&
            Array.isArray(respuestaBorradores.data)
                ? respuestaBorradores.data
                : [];

        const estadosPosteriores =
            respuestaEstados.ok &&
            Array.isArray(respuestaEstados.data)
                ? respuestaEstados.data
                : [];

        const despachados =
            estadosPosteriores.filter(item =>
                String(item.estado || "")
                    .trim()
                    .toLowerCase() === "despachado"
            );

        const completados =
            estadosPosteriores.filter(item =>
                String(item.estado || "")
                    .trim()
                    .toLowerCase() === "completado"
            );

        const conducesAbiertos = [
            ...borradores.map(item => ({
                ...item,
                estado: "Borrador",
                fechaTabla:
                    item.fechaCreacion ||
                    item.fecha ||
                    ""
            })),
            ...despachados.map(item => ({
                ...item,
                fechaTabla:
                    item.fecha ||
                    item.fechaCreacion ||
                    ""
            }))
        ];

        totalAbiertos.textContent =
            conducesAbiertos.length;

        totalLineas.textContent =
            conducesAbiertos.reduce(
                (total, item) =>
                    total +
                    Number(item.totalLineas || 0),
                0
            );

        if (!respuestaBorradores.ok || !respuestaEstados.ok) {

            const mensaje =
                !respuestaBorradores.ok
                    ? respuestaBorradores.mensaje
                    : respuestaEstados.mensaje;

            Despachos.notificar(
                mensaje ||
                "No fue posible cargar todos los conduces.",
                "error"
            );

        }

        if (conducesAbiertos.length === 0) {

            tablaAbiertos.innerHTML = `
                <tr>
                    <td colspan="6" class="tabla-vacia">
                        No hay conduces abiertos.
                    </td>
                </tr>
            `;

        } else {

            tablaAbiertos.innerHTML =
                conducesAbiertos.map(item => {

                    const estado =
                        String(
                            item.estado || "Borrador"
                        ).trim();

                    const estadoNormalizado =
                        estado.toLowerCase();

                    const realizadoPor =
                        item.realizadoPor ||
                        item.supervisor ||
                        "-";

                    const fecha =
                        item.fechaTabla
                            ? String(
                                item.fechaTabla
                            ).split(" ")[0]
                            : "-";

                    const botonAccion =
                        estadoNormalizado === "despachado"
                            ? `
                            <button
                                type="button"
                                class="btn-editar-despacho btn-continuar-despacho"
                                data-id-conduce="${item.idConduce}"
                                title="Continuar en Finalizar carga"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            `
                            : `
                            <button
                                type="button"
                                class="btn-continuar-borrador"
                                data-id-conduce="${item.idConduce}"
                                title="Continuar carga"
                            >
                                <i class="fa-solid fa-play"></i>
                            </button>
                            `;

                    return `
                        <tr class="${estadoNormalizado}">

                            <td>
                                <strong>
                                    ${item.noConduce || "-"}
                                </strong>

                                <small class="estado-conduce ${estadoNormalizado}">
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
                                ${Number(item.totalLineas || 0)}
                            </td>

                            <td class="numero">
                                ${Number(
                                    item.totalUnidades || 0
                                ).toLocaleString("es-DO")}
                            </td>

                            <td class="acciones-despacho">
                                ${botonAccion}
                            </td>

                        </tr>
                    `;

                }).join("");

        }

        const sesion = JSON.parse(
            localStorage.getItem("sesion") ||
            sessionStorage.getItem("sesion") ||
            "{}"
        );

        const rol =
            String(sesion.rol || "")
                .trim()
                .toLowerCase();

        const puedeReabrirCompletado =
            rol === "administrador" ||
            rol === "encargado";

        if (completados.length === 0) {

            tablaCompletados.innerHTML = `
                <tr>
                    <td colspan="6" class="tabla-vacia">
                        No hay conduces completados.
                    </td>
                </tr>
            `;

        } else {

            tablaCompletados.innerHTML =
                completados.map(item => {

                    const fecha =
                        item.fecha
                            ? String(
                                item.fecha
                            ).split(" ")[0]
                            : "-";

                    const realizadoPor =
                        item.realizadoPor ||
                        item.supervisor ||
                        "-";

                    let botones = `
                        <button
                            type="button"
                            class="btn-ver-despacho"
                            data-id-conduce="${item.idConduce}"
                            title="Ver conduce"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    `;

                    if (puedeReabrirCompletado) {

                        botones += `
                            <button
                                type="button"
                                class="btn-editar-despacho btn-abrir-completado"
                                data-id-conduce="${item.idConduce}"
                                title="Abrir asistente en Finalizar carga"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        `;

                    }

                    return `
                        <tr class="completado">

                            <td>
                                <strong>
                                    ${item.noConduce || "-"}
                                </strong>

                                <small class="estado-conduce completado">
                                    Completado
                                </small>
                            </td>

                            <td>
                                ${realizadoPor}
                            </td>

                            <td class="fecha-conduce">
                                ${fecha}
                            </td>

                            <td class="centrado">
                                ${Number(item.totalLineas || 0)}
                            </td>

                            <td class="numero">
                                ${Number(
                                    item.totalUnidades || 0
                                ).toLocaleString("es-DO")}
                            </td>

                            <td class="acciones-despacho">
                                ${botones}
                            </td>

                        </tr>
                    `;

                }).join("");

        }

        document
            .querySelectorAll(
                ".btn-continuar-borrador"
            )
            .forEach(boton => {

                boton.onclick = async () => {

                    await Despachos.continuarBorrador(
                        boton.dataset.idConduce
                    );

                };

            });

        document
            .querySelectorAll(
                ".btn-continuar-despacho"
            )
            .forEach(boton => {

                boton.onclick = async () => {

                    await Despachos.continuarBorrador(
                        boton.dataset.idConduce
                    );

                };

            });

        document
            .querySelectorAll(
                ".btn-ver-despacho"
            )
            .forEach(boton => {

                boton.onclick = async () => {

                    await Despachos.abrirVistaConduce(
                        boton.dataset.idConduce
                    );

                };

            });

        document
            .querySelectorAll(
                ".btn-abrir-completado"
            )
            .forEach(boton => {

                boton.onclick = async () => {

                    await Despachos.continuarBorrador(
                        boton.dataset.idConduce,
                        {
                            permitirCompletado: true
                        }
                    );

                };

            });

    } catch (error) {

        console.error(
            "Error cargando el dashboard de despachos:",
            error
        );

        tablaAbiertos.innerHTML = `
            <tr>
                <td colspan="6" class="tabla-vacia">
                    No fue posible cargar los conduces abiertos.
                </td>
            </tr>
        `;

        tablaCompletados.innerHTML = `
            <tr>
                <td colspan="6" class="tabla-vacia">
                    No fue posible cargar los conduces completados.
                </td>
            </tr>
        `;

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

    if (!idConduce) {

        Despachos.notificar(
            "No se recibió el identificador del conduce.",
            "error"
        );

        return;

    }

    try {

        const respuesta = await API.post({
            action: "obtenerBorrador",
            idConduce: idConduce
        });

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

        if (modal) {
            modal.classList.remove("oculto");
        }

        if (
            estado === "despachado" ||
            estado === "completado"
        ) {

            await Despachos.pasoCalidad();

        } else {

            Despachos.pasoCarga();

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

    const respuesta = await API.post({
        action: "obtenerBorrador",
        idConduce: idConduce
    });

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




   nuevoConduce() {

    document.getElementById("tituloModal").textContent = "Asistente de Despacho";

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
                    <input type="text" id="supervisorConduce" readonly>
                </div>

                <div class="campo">
                    <label>Chofer</label>
                    <select id="choferConduce">
                        <option value="">Cargando choferes...</option>
                    </select>
                </div>

                <div class="campo">
                    <label>Unidad de carga</label>
                    <select id="unidadConduce">
                        <option value="">Cargando unidades...</option>
                    </select>
                </div>

                <div class="campo">
                    <label>Cantidad de destinos</label>
                    <select id="cantidadDestinos">
                        <option value="1">1 destino</option>
                        <option value="2">2 destinos</option>
                    </select>
                </div>

            </div>

            <div class="acciones-modal">

                <button class="btn-secundario" id="btnCancelarConduce">
                    Cancelar
                </button>

                <button class="btn-verde" id="btnPasoDestinos">
                    Siguiente
                    <i class="fa-solid fa-arrow-right"></i>
                </button>

            </div>

        </div>
    `;

    const usuario = JSON.parse(
    localStorage.getItem("sesion") || sessionStorage.getItem("sesion")
);
    document.getElementById("supervisorConduce").value = usuario.nombre;

    Despachos.cargarChoferes();
    Despachos.cargarUnidades();

    document.getElementById("btnCancelarConduce").onclick = () => {

    document
        .getElementById("modalSistema")
        .classList.add("oculto");

    Conduce.limpiar();

    document.getElementById("tituloModal").textContent = "";
    document.getElementById("contenidoModal").innerHTML = "";

};

    document.getElementById("btnPasoDestinos").onclick = () => {

        const chofer = document.getElementById("choferConduce").value;
        const unidad = document.getElementById("unidadConduce").value;

        if (chofer === "") {
            Despachos.notificar("Debe seleccionar un chofer.", "error");
            return;
        }

        if (unidad === "") {
            Despachos.notificar("Debe seleccionar una unidad de carga.", "error");
            return;
        }
		
	Conduce.encabezado.supervisor = usuario.nombre;
	Conduce.encabezado.chofer = chofer;
	Conduce.encabezado.unidad = unidad;
	Conduce.encabezado.cantidadDestinos = Number(
    document.getElementById("cantidadDestinos").value
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
			Conduce.encabezado.usuarioCreador = usuario.usuario || usuario.nombre;
		}

        Despachos.pasoDestinos();

    };

    document.getElementById("modalSistema").classList.remove("oculto");

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

        const destino1 =
            document.getElementById("destino1").value;

        const precinto1 =
            document.getElementById("precinto1").value.trim();

        const destino2 = cantidadDestinos === "2"
            ? document.getElementById("destino2").value
            : "";

        const precinto2 = cantidadDestinos === "2"
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

        const precinto1EsAnterior =
            precinto1 === Conduce.encabezado.precinto1;

        if (!precinto1EsAnterior) {

            const validar1 = await API.post({
                action: "validarPrecinto",
                no_precinto: precinto1
            });

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

            const validar2 = await API.post({
                action: "validarPrecinto",
                no_precinto: precinto2
            });

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
            silencioso: true
        });

        if (!guardado) {
            return;
        }

        Despachos.pasoCarga();

    };

},



pasoCarga() {

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
                Agregar Recorte
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

    document.getElementById("btnPasoResumen").onclick = () => {
    Despachos.validarPasoCarga();
	};
	
	document.getElementById("btnGuardarBorrador").onclick = async () => {

    await Despachos.guardarCambios();

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

},

async editarInformacionConduce() {

    const choferes = await Catalogos.cargarChoferes();
    const unidades = await Catalogos.cargarUnidades();

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
                        <option value="">Seleccione un chofer</option>
                        ${opcionesChoferes}
                    </select>
                </div>

                <div class="campo">
                    <label>Unidad de carga</label>

                    <select id="editarUnidad">
                        <option value="">Seleccione una unidad</option>
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

            const validacion1 = await API.post({
                action: "validarPrecinto",
                no_precinto: precinto1
            });

            if (!validacion1.ok) {

                Despachos.notificar(
                    validacion1.mensaje,
                    "error"
                );

                return;

            }

        }

        if (precinto2Cambio) {

            const validacion2 = await API.post({
                action: "validarPrecinto",
                no_precinto: precinto2
            });

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
            silencioso: true
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



async modalAgregarTarima() {

    const materiales = await Catalogos.cargarMateriales();

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
	
			inputBuscar.addEventListener("input", () => {

			inputBuscar.value =
				inputBuscar.value.replace(/\D/g, "");

		});

    inputBuscar.addEventListener("input", () => {

        const texto = inputBuscar.value.toLowerCase().trim();

        inputMaterial.value = "";
        lista.innerHTML = "";

        if (texto.length < 2) {
            return;
        }

        const resultados = materiales
            .filter(material =>
                material.id.toLowerCase().includes(texto) ||
                material.descripcion.toLowerCase().includes(texto)
            )
            .slice(0, 10);

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

    document.getElementById("btnCancelarTarima").onclick = () => {
        Despachos.pasoCarga();
    };

    document.getElementById("btnGuardarTarima").onclick = async () => {

        const idMaterial = inputMaterial.value;
        const fechaProduccion = document.getElementById("fechaProduccionTarima").value;
        const cantidadTarimas = Number(document.getElementById("cantidadTarimas").value);
		const destino = Number(Conduce.encabezado.cantidadDestinos) === 2
								? document.getElementById("destinoTarima").value
								: Conduce.encabezado.destino1;

        if (idMaterial === "") {
            Despachos.notificar("Debe seleccionar un material válido de la lista.", "error");
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

        if ((Conduce.detalle.length + cantidadTarimas) > 18) {
            Despachos.notificar("No puede exceder las 18 posiciones del contenedor.", "error");
            return;
        }

        const material = materiales.find(m => m.id === idMaterial);

        for (let i = 0; i < cantidadTarimas; i++) {
            Despachos.agregarLinea(material, fechaProduccion, destino);
        }
		
		const guardado = await Despachos.guardarCambios({
			silencioso: true
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

    const materiales = await Catalogos.cargarMateriales();

    document.getElementById("tituloModal").textContent = "Agregar Recorte";

    document.getElementById("contenidoModal").innerHTML = `

        <div class="formulario-conduce">

            <h3>Datos del Recorte</h3>

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
            <label>Destino del recorte</label>

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

                    <label>Cantidad del recorte</label>

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

                    Agregar Recorte

                </button>

            </div>

        </div>
    `;

    const inputBuscar = document.getElementById("buscarMaterialRecorte");
    const inputMaterial = document.getElementById("materialRecorte");
    const lista = document.getElementById("sugerenciasMaterialRecorte");
	
	inputBuscar.addEventListener("input", () => {

    inputBuscar.value =
        inputBuscar.value.replace(/\D/g, "");

});

    inputBuscar.addEventListener("input", () => {

        const texto = inputBuscar.value.toLowerCase().trim();

        inputMaterial.value = "";
        lista.innerHTML = "";

        if (texto.length < 2) {
            return;
        }

        const resultados = materiales
            .filter(material =>
                material.id.toLowerCase().includes(texto) ||
                material.descripcion.toLowerCase().includes(texto)
            )
            .slice(0, 10);

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
		
		if (!destino) { Despachos.notificar("Debe seleccionar el destino del recorte.", "error" );
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
                "La cantidad del recorte debe ser mayor que cero.",
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
            `Recorte de ${cantidad} ${material.unidad_medida} agregado correctamente.`,
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
    tipo = "Tarima"
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
			silencioso: true
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
                    <small>${linea.descripcion}</small>
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
                <td colspan="9">Recortes</td>
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

editarLinea(idLinea) {

    const linea = Conduce.detalle.find(
			item =>
				String(item.idLinea) ===
				String(idLinea)
		);

    if (!linea) {
        Despachos.notificar("No se encontró la línea seleccionada.", "error");
        return;
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
                    <label>Recorte</label>
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

        const material =
            Catalogos.cache.materiales.find(
                item =>
                    item.id === linea.material
            );

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

    /*
     * Si cambió la fecha, el popup permitirá decidir
     * si se aplica a las demás líneas.
     */
    if (
        fechaAnterior !== fechaNueva &&
        fechaNueva !== ""
    ) {

        Despachos.popupAplicarFecha(linea);

        return;

    }

    await Despachos.guardarCambios({
        silencioso: true
    });

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

    await Despachos.guardarCambios({
        silencioso: true
    });

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
  
  
  popupAplicarFecha(lineaBase) {

    const mismasLineas = Conduce.detalle.filter(linea =>
        linea.material === lineaBase.material &&
        linea.idLinea !== lineaBase.idLinea
    );

    if (mismasLineas.length === 0) {
        Despachos.pasoCarga();
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

    document.getElementById("btnNoAplicarFecha").onclick = () => {
        Despachos.pasoCarga();
    };

    document.getElementById("btnSiAplicarFecha").onclick = () => {

        mismasLineas.forEach(linea => {
            linea.fechaProduccion = lineaBase.fechaProduccion;
            linea.lote = lineaBase.lote;
            linea.fechaVencimiento = lineaBase.fechaVencimiento;
        });

        Despachos.notificar("Fecha aplicada al mismo material.", "exito");
        Despachos.pasoCarga();

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
						title="Imprimir conduce"
					>
						<i class="fa-solid fa-print"></i>
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
            await Despachos.guardarCambios();

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
        silencioso: true
    });

    if (!guardado) {
        return;
    }

    const respuesta = await API.post({

        action: "finalizarCarga",

        conduce: {
            encabezado: Conduce.encabezado,
            detalle: Conduce.detalle
        }

    });

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

    const guardado =
        await Despachos.guardarCambios({
            silencioso: true
        });

    if (!guardado) {
        return;
    }

    const respuesta = await API.post({

        action: "completarConduce",

        conduce: {
            encabezado: Conduce.encabezado,
            detalle: Conduce.detalle
        }

    });

    if (!respuesta.ok) {

        Despachos.notificar(
            respuesta.mensaje ||
            "No fue posible completar el conduce.",
            "error"
        );

        return;

    }

    Conduce.encabezado.estado =
        respuesta.data.estado;

    Conduce.encabezado.fechaCompletado =
        respuesta.data.fechaCompletado;

    /*
     * Imprime la copia de archivo con los
     * documentos SAP ya incorporados.
     */
    await Despachos.imprimirConduceFinal();

    Despachos.notificar(
        respuesta.mensaje,
        "exito"
    );

    setTimeout(async () => {

        document
            .getElementById("modalSistema")
            .classList.add("oculto");

        Conduce.limpiar();

        await Despachos.cargar();

    }, 700);

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
						<th class="col-recorte">Recorte</th>
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
                <strong>Recortes:</strong>
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
        );

    if (!imagen) {
        return "";
    }

    await imagen.decode().catch(() => {});

    const canvas =
        document.createElement("canvas");

    canvas.width =
        imagen.naturalWidth;

    canvas.height =
        imagen.naturalHeight;

    const contexto =
        canvas.getContext("2d");

    contexto.drawImage(
        imagen,
        0,
        0
    );

    return canvas.toDataURL("image/png");

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
                        box-shadow:none;
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
						<th class="col-recorte">Recorte</th>
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
                            <strong>Recortes:</strong>
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

async abrirVistaConduce(idConduce) {

    const respuesta = await API.post({
        action: "obtenerBorrador",
        idConduce: idConduce
    });

    if (!respuesta.ok) {

        Despachos.notificar(
            respuesta.mensaje ||
            "No fue posible cargar el conduce.",
            "error"
        );

        return;
    }

    Conduce.limpiar();

    Conduce.encabezado = {
        ...Conduce.encabezado,
        ...respuesta.data.encabezado
    };

    Conduce.detalle =
        Array.isArray(respuesta.data.detalle)
            ? respuesta.data.detalle
            : [];

    const html =
        await Despachos.construirHTMLConduceFinal();

    const ventana =
        window.open("", "_blank");

    if (!ventana) {

        Despachos.notificar(
            "El navegador bloqueó la ventana.",
            "error"
        );

        return;
    }

    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();

},

async verConduce(idConduce) {

    if (!idConduce) {

        Despachos.notificar(
            "No se recibió el identificador del conduce.",
            "error"
        );

        return;

    }

    const respuesta = await API.post({
        action: "obtenerBorrador",
        idConduce: idConduce
    });

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

    document.getElementById(
        "contenidoModal"
    ).innerHTML = `

        <div class="visor-conduce-final">

            <span
                class="estado-visor-conduce ${estadoClase}"
            >
                ${estado}
            </span>

            <iframe
                id="iframeConduceFinal"
                class="iframe-conduce-final"
                title="Vista del conduce final"
            ></iframe>

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

    iframe.srcdoc = htmlConduce;

    document.getElementById(
        "btnCerrarVisorConduce"
    ).onclick = () => {

        document
            .getElementById("modalSistema")
            .classList.add("oculto");

    };

    document.getElementById(
        "btnImprimirVisorConduce"
    ).onclick = async () => {

        await Despachos.imprimirConduceFinal();

    };

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

    const select = document.getElementById("choferConduce");
    const choferes = await Catalogos.cargarChoferes();

    select.innerHTML = `<option value="">Seleccione un chofer</option>`;

    choferes.forEach(chofer => {
        select.innerHTML += `
            <option value="${chofer.texto}">
                ${chofer.texto}
            </option>
        `;
    });

},

async cargarUnidades() {

    const select = document.getElementById("unidadConduce");
    const unidades = await Catalogos.cargarUnidades();

    select.innerHTML = `<option value="">Seleccione una unidad</option>`;

    unidades.forEach(unidad => {
        select.innerHTML += `
            <option value="${unidad.texto}">
                ${unidad.texto}
            </option>
        `;
    });

},
	

};


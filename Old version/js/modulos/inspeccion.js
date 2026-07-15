// ======================================================
// INSPECCION.JS
// Asistente de inspección de contenedores
// ======================================================

const InspeccionContenedores = {

    pasoActual: 1,

    conduces: [],

    chasis: [],

    catalogo: [],

    datosConduce: null,

    idInspeccion: "",

    respuestasBASC: {},

    evidenciasPorCategoria: {},

    evidenciasCargando: {},

    categoriaActivaBASC: "",

    configuracion: {},

    guardadosCategoriaBASC: {},

    temporizadoresGuardadoBASC: {},

    guardadoCategoriaEnCurso: {},

    categoriasBASC: [
        { nombre: "Afuera y debajo", codigo: "Z01", icono: "fa-truck-ramp-box", orden: 1 },
        { nombre: "Puertas interiores y exteriores", codigo: "Z02", icono: "fa-door-closed", orden: 2 },
        { nombre: "Laterales exteriores", codigo: "Z03", icono: "fa-arrows-left-right", orden: 3 },
        { nombre: "Laterales interiores", codigo: "Z04", icono: "fa-left-right", orden: 4 },
        { nombre: "Frontal interior y exterior", codigo: "Z05", icono: "fa-ruler-horizontal", orden: 5 },
        { nombre: "Techo interior y exterior", codigo: "Z06", icono: "fa-up-long", orden: 6 },
        { nombre: "Suelo interior", codigo: "Z07", icono: "fa-layer-group", orden: 7 },
        { nombre: "Equipos auxiliares y refrigeración", codigo: "Z08", icono: "fa-snowflake", orden: 8 },
        { nombre: "Cabina del chofer", codigo: "Z09", icono: "fa-truck-front", orden: 9 }
    ],


    async abrir() {

        const modal =
            document.getElementById(
                "modalSistema"
            );

        const contenidoModal =
            document.getElementById(
                "contenidoModal"
            );

        if (!modal || !contenidoModal) {

            console.error(
                "No se encontró el modal principal."
            );

            return;

        }

        this.pasoActual = 1;
        this.datosConduce = null;
        this.idInspeccion = "";
        this.respuestasBASC = {};
        this.evidenciasPorCategoria = {};
        this.evidenciasCargando = {};
        this.categoriaActivaBASC = "";
        this.configuracion = {};
        this.guardadosCategoriaBASC = {};
        this.temporizadoresGuardadoBASC = {};
        this.guardadoCategoriaEnCurso = {};

        modal.classList.remove("oculto");

        contenidoModal.innerHTML = `
            <section class="asistente-inspeccion">

                <div class="inspeccion-cargando">

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <span>
                        Cargando información de inspección...
                    </span>

                </div>

            </section>
        `;

        try {

            await this.cargarDatosIniciales();

            this.mostrarPasoInformacion();

        } catch (error) {

            console.error(
                "Error abriendo inspección:",
                error
            );

            contenidoModal.innerHTML = `
                <section class="asistente-inspeccion">

                    <div class="inspeccion-error">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <strong>
                            No fue posible abrir el asistente.
                        </strong>

                        <span>
                            ${
                                error.message ||
                                "Error desconocido."
                            }
                        </span>

                    </div>

                </section>
            `;

        }

    },


    async cargarDatosIniciales() {

        const [
            respuestaConduces,
            respuestaChasis,
            respuestaCatalogo,
            respuestaConfiguracion
        ] = await Promise.all([

            API.post({
                action:
                    "listarConducesInspeccion"
            }),

            API.post({
                action:
                    "listarChasisInspeccion"
            }),

            API.post({
                action:
                    "listarCatalogoInspeccion"
            }),

            API.post({
                action:
                    "listarConfiguracion"
            })

        ]);

        if (!respuestaConduces.ok) {

            throw new Error(
                respuestaConduces.mensaje ||
                "No fue posible cargar los conduces."
            );

        }

        if (!respuestaChasis.ok) {

            throw new Error(
                respuestaChasis.mensaje ||
                "No fue posible cargar los chasis."
            );

        }

        if (!respuestaCatalogo.ok) {

            throw new Error(
                respuestaCatalogo.mensaje ||
                "No fue posible cargar el catálogo."
            );

        }

        if (!respuestaConfiguracion.ok) {

            throw new Error(
                respuestaConfiguracion.mensaje ||
                "No fue posible cargar la configuración."
            );

        }

        this.conduces =
            Array.isArray(respuestaConduces.data)
                ? respuestaConduces.data
                : [];

        this.chasis =
            Array.isArray(respuestaChasis.data)
                ? respuestaChasis.data
                : [];

        this.catalogo =
            Array.isArray(respuestaCatalogo.data)
                ? respuestaCatalogo.data
                : [];

        this.configuracion =
            respuestaConfiguracion.data &&
            typeof respuestaConfiguracion.data ===
                "object"
                ? respuestaConfiguracion.data
                : {};

    },

obtenerNombreCentro(
    destino
) {

    const texto =
        String(destino || "").trim();

    if (!texto) {
        return "";
    }

    const partes =
        texto.split(" - ");

    return partes.length > 1
        ? partes.slice(1).join(" - ").trim()
        : texto;

},


extraerIdentificacionUnidad(
    unidad
) {

    const texto =
        String(unidad || "").trim();

    if (!texto) {
        return "";
    }

    const partes =
        texto.split(" - ");

    return partes.length > 1
        ? partes.slice(1).join(" - ").trim()
        : texto;

},


formatearTamanoContenedor(
    tamano
) {

    const texto =
        String(tamano || "").trim();

    if (!texto) {
        return "-";
    }

    if (
        texto === '20"' ||
        texto === "20"
    ) {
        return "20 pies";
    }

    if (
        texto === '40"' ||
        texto === "40"
    ) {
        return "40 pies";
    }

    return texto;

},

    mostrarPasoInformacion() {

        const contenidoModal =
            document.getElementById(
                "contenidoModal"
            );

        const opcionesConduces =
            this.conduces.length > 0
                ? this.conduces
                    .map(item => {

						const destinoVisible =
							this.obtenerNombreCentro(
								item.destino1
							);

						const unidadVisible =
							this.extraerIdentificacionUnidad(
								item.unidadCarga
							);

						return `
							<option
								value="${item.idConduce}"
							>
								${item.noConduce || "-"}
								•
								${destinoVisible || "-"}
								•
								${unidadVisible || "-"}
							</option>
						`;

					})
                    .join("")
                : `
                    <option value="">
                        No hay conduces disponibles
                    </option>
                `;

        contenidoModal.innerHTML = `
            <section class="asistente-inspeccion">

                <div class="inspeccion-pasos">

                    <div class="paso-inspeccion activo">
                        1. Información
                    </div>

                    <div class="paso-inspeccion">
                         2. Inspección BASC
                    </div>

                    <div class="paso-inspeccion">
                        3. Evidencias
                    </div>

                    <div class="paso-inspeccion">
                        4. Finalizar
                    </div>

                </div>

                <div class="inspeccion-encabezado">

                    <div>
                        <h2>
                            Inspección de contenedor
                        </h2>

                        <p>
                            Seleccione un despacho en borrador
                            para iniciar la revisión.
                        </p>
                    </div>

                    <span class="estado-inspeccion">
                        Sin iniciar
                    </span>

                </div>

                <div class="tarjeta-inspeccion">

                    <div class="campo-inspeccion campo-completo">

                        <label for="inspeccionConduce">
                            Seleccionar despacho
                        </label>

                        <select id="inspeccionConduce">

                            <option value="">
                                Seleccione un despacho
                            </option>

                            ${opcionesConduces}

                        </select>

                    </div>

                </div>

                <div
                    id="datosInspeccionConduce"
                    class="datos-inspeccion-vacios"
                >

                    <i class="fa-solid fa-truck-ramp-box"></i>

                    <span>
                        Seleccione un despacho para cargar
                        los datos del contenedor.
                    </span>

                </div>

                <div class="acciones-inspeccion">

                    <button
                        type="button"
                        id="btnCancelarInspeccion"
                        class="btn-secundario-inspeccion"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        id="btnIniciarRevision"
                        class="btn-iniciar-inspeccion"
                        disabled
                    >
                        Iniciar revisión

                        <i class="fa-solid fa-arrow-right"></i>
                    </button>

                </div>

            </section>
        `;

        this.configurarEventosPasoInformacion();

    },


    configurarEventosPasoInformacion() {

        const selectConduce =
            document.getElementById(
                "inspeccionConduce"
            );

        const btnCancelar =
            document.getElementById(
                "btnCancelarInspeccion"
            );

        const btnIniciar =
            document.getElementById(
                "btnIniciarRevision"
            );

        if (selectConduce) {

            selectConduce.addEventListener(
                "change",
                async evento => {

                    const idConduce =
                        evento.target.value;

                    if (!idConduce) {

                        this.datosConduce = null;

                        this.mostrarDatosConduceVacios();

                        return;

                    }

                    await this.cargarDatosConduce(
                        idConduce
                    );

                }
            );

        }

        if (btnCancelar) {

            btnCancelar.addEventListener(
                "click",
                () => {

                    const modal =
                        document.getElementById(
                            "modalSistema"
                        );

                    modal.classList.add("oculto");

                }
            );

        }

        if (btnIniciar) {

            btnIniciar.addEventListener(
                "click",
                async () => {

                    if (!this.datosConduce) {

                        if (
                            window.Despachos &&
                            typeof Despachos.notificar ===
                                "function"
                        ) {

                            Despachos.notificar(
                                "Debe seleccionar un despacho antes de iniciar la revisión.",
                                "error"
                            );

                        }

                        return;

                    }

                    await this.iniciarInspeccionBase(
                        btnIniciar
                    );

                }
            );

        }

    },



    obtenerInspectorActual() {

        const clavesSesion = [
            "usuario",
            "usuarioSesion",
            "usuarioActual",
            "sesionUsuario",
            "sesion"
        ];

        let usuario = {};

        for (const clave of clavesSesion) {

            const valor =
                localStorage.getItem(clave) ||
                sessionStorage.getItem(clave);

            if (!valor) {
                continue;
            }

            try {

                const datos =
                    JSON.parse(valor);

                if (
                    datos &&
                    typeof datos === "object"
                ) {

                    usuario =
                        datos.usuario &&
                        typeof datos.usuario === "object"
                            ? datos.usuario
                            : datos;

                    break;

                }

            } catch (error) {

                console.warn(
                    `No fue posible leer la sesión almacenada en "${clave}".`,
                    error
                );

            }

        }

        return {

            id:
                String(
                    usuario.idEmpleado ||
                    usuario.IDEmpleado ||
                    usuario.idempleado ||
                    usuario.id ||
                    ""
                ).trim(),

            nombre:
                String(
                    usuario.nombre ||
                    usuario.Nombre ||
                    usuario.usuario ||
                    usuario.Usuario ||
                    ""
                ).trim()

        };

    },


    async iniciarInspeccionBase(
        boton
    ) {

        const despacho =
            this.datosConduce &&
            this.datosConduce.despacho
                ? this.datosConduce.despacho
                : {};

        const idConduce =
            String(
                despacho.idConduce ||
                despacho.ID_Conduce ||
                ""
            ).trim();

        if (!idConduce) {

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    "El despacho seleccionado no contiene un ID de conduce válido.",
                    "error"
                );

            }

            return;

        }

        const contenidoOriginal =
            boton ? boton.innerHTML : "";

        try {

            if (boton) {

                boton.disabled = true;
                boton.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Creando inspección...
                `;

            }

            console.log(
                "Creando datos base de inspección:",
                idConduce
            );

            const inspector =
                this.obtenerInspectorActual();

            const respuesta =
                await API.post({

                    action:
                        "iniciarInspeccionContenedor",

                    idConduce:
                        idConduce,

                    inspectorId:
                        inspector.id,

                    inspectorNombre:
                        inspector.nombre

                });

            console.log(
                "Respuesta iniciarInspeccionContenedor:",
                respuesta
            );

            if (!respuesta || !respuesta.ok) {

                throw new Error(
                    respuesta && respuesta.mensaje
                        ? respuesta.mensaje
                        : "No fue posible crear los datos base de la inspección."
                );

            }

            const datosRespuesta =
                respuesta.data &&
                typeof respuesta.data === "object"
                    ? respuesta.data
                    : {};

            this.idInspeccion =
                String(
                    datosRespuesta.idInspeccion ||
                    datosRespuesta.ID_Inspeccion ||
                    respuesta.idInspeccion ||
                    respuesta.ID_Inspeccion ||
                    ""
                ).trim();

            if (!this.idInspeccion) {

                console.warn(
                    "La inspección fue creada, pero el backend no devolvió ID_Inspeccion.",
                    respuesta
                );

            }

            this.pasoActual = 2;
            this.mostrarPasoBASC();

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    "Inspección iniciada correctamente.",
                    "exito"
                );

            }

        } catch (error) {

            console.error(
                "Error creando la inspección base:",
                error
            );

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    error.message ||
                    "No fue posible iniciar la inspección.",
                    "error"
                );

            }

        } finally {

            if (boton && document.body.contains(boton)) {

                boton.disabled = false;
                boton.innerHTML = contenidoOriginal;

            }

        }

    },

    async cargarDatosConduce(
        idConduce
    ) {

        const contenedor =
            document.getElementById(
                "datosInspeccionConduce"
            );

        contenedor.innerHTML = `
            <div class="inspeccion-cargando">

                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    Cargando datos del despacho...
                </span>

            </div>
        `;

        const respuesta =
            await API.post({

                action:
                    "obtenerDatosConduceInspeccion",

                idConduce:
                    idConduce

            });

        if (!respuesta.ok) {

            this.datosConduce = null;

            contenedor.innerHTML = `
                <div class="inspeccion-error">

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <span>
                        ${
                            respuesta.mensaje ||
                            "No fue posible cargar el despacho."
                        }
                    </span>

                </div>
            `;

            return;

        }

        this.datosConduce =
            respuesta.data;

        this.mostrarDatosConduce();

        await this.revisarInspeccionActiva(
            idConduce
        );

    },





    async revisarInspeccionActiva(
        idConduce
    ) {

        const respuesta =
            await API.post({

                action:
                    "obtenerInspeccionActiva",

                idConduce:
                    idConduce

            });

        if (!respuesta || !respuesta.ok) {

            console.error(
                "No fue posible consultar la inspección activa:",
                respuesta
            );

            return;

        }

        if (!respuesta.data) {
            return;
        }

        const inspeccion =
            respuesta.data.inspeccion &&
            typeof respuesta.data.inspeccion ===
                "object"
                ? respuesta.data.inspeccion
                : {};

        const detalle =
            Array.isArray(
                respuesta.data.detalle
            )
                ? respuesta.data.detalle
                : [];

        this.idInspeccion =
            String(
                inspeccion.idInspeccion ||
                inspeccion.ID_Inspeccion ||
                ""
            ).trim();

        this.cargarRespuestasGuardadasBASC(
            detalle
        );

        await this.cargarEvidenciasGuardadas();

        const grupos =
            this.agruparCatalogoBASC();

        const categorias =
            this.obtenerCategoriasOrdenadasBASC(
                grupos
            );

        const primeraPendiente =
            categorias.find(categoria => {

                const puntos =
                    grupos[categoria] || [];

                return !this.obtenerResumenCategoriaBASC(
                    categoria,
                    puntos
                ).completada;

            });

        if (primeraPendiente) {

            this.categoriaActivaBASC =
                primeraPendiente;

            this.pasoActual = 2;
            this.mostrarPasoBASC();

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    "Se recuperó la inspección en proceso.",
                    "exito"
                );

            }

            return;

        }

        if (
            detalle.length > 0 &&
            detalle.length >=
                this.catalogo.length
        ) {

            this.pasoActual = 3;
            this.mostrarPasoEvidencias();

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    "La revisión BASC ya estaba completada. Se retomó en Evidencias.",
                    "exito"
                );

            }

        }

    },


    cargarRespuestasGuardadasBASC(
        detalle
    ) {

        this.respuestasBASC = {};
        this.guardadosCategoriaBASC = {};

        detalle.forEach(item => {

            const codigo =
                String(
                    item.codigoPunto ||
                    item.codigo ||
                    ""
                ).trim();

            if (!codigo) {
                return;
            }

            this.respuestasBASC[codigo] = {

                estado:
                    String(
                        item.resultado ||
                        item.estado ||
                        ""
                    ).trim(),

                observacion:
                    String(
                        item.observacion || ""
                    ).trim()

            };

        });

        const grupos =
            this.agruparCatalogoBASC();

        Object.keys(grupos)
            .forEach(categoria => {

                const resumen =
                    this.obtenerResumenCategoriaBASC(
                        categoria,
                        grupos[categoria]
                    );

                if (resumen.completada) {

                    this.guardadosCategoriaBASC[
                        categoria
                    ] =
                        this.obtenerFirmaCategoriaBASC(
                            categoria
                        );

                }

            });

    },


    crearFichaDocumentalInspeccion(
        estadoTexto = "En proceso"
    ) {

        const versionBASC =
            String(
                this.configuracion
                    .Version_BASC || ""
            ).trim();

        const estandarBASC =
            String(
                this.configuracion
                    .Estandar_BASC || ""
            ).trim();

        const formulario =
            String(
                this.configuracion
                    .Version_Formulario_Inspeccion ||
                (
                    this.datosConduce
                        ? this.datosConduce
                            .versionFormulario || ""
                        : ""
                )
            ).trim();

        const despacho =
            this.datosConduce &&
            this.datosConduce.despacho
                ? this.datosConduce.despacho
                : {};

        const contenedor =
            this.datosConduce &&
            this.datosConduce.contenedor
                ? this.datosConduce.contenedor
                : {};

        return `
            <section class="ficha-documental-inspeccion">

                <div class="ficha-documental-inspeccion__titulo">

                    <div>

                        <span>
                            Registro oficial
                        </span>

                        <h3>
                            INSPECCIÓN DE CONTENEDORES
                        </h3>

                    </div>

                    <div class="estado-documental-inspeccion">

                        <span class="estado-documental-inspeccion__punto"></span>

                        ${estadoTexto}

                    </div>

                </div>

                <div class="ficha-documental-inspeccion__datos">

                    <div>

                        <span>Conduce</span>

                        <strong>
                            ${despacho.noConduce || "-"}
                        </strong>

                    </div>

                    <div>

                        <span>Contenedor</span>

                        <strong>
                            ${contenedor.identificacion || "-"}
                        </strong>

                    </div>

                    <div>

                        <span>
                            ${
                                versionBASC
                                    ? `BASC ${versionBASC}`
                                    : "BASC"
                            }
                        </span>

                        <strong>
                            ${estandarBASC || "-"}
                        </strong>

                    </div>

                    <div>

                        <span>Versión Formulario</span>

                        <strong>
                            ${formulario || "-"}
                        </strong>

                    </div>

                </div>

            </section>
        `;

    },



    normalizarCategoriaBASC(
        categoria
    ) {

        const texto = String(categoria || "Sin categoría")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();

        const equivalencias = {
            "afuera y debajo": "Afuera y debajo",

            "puertas": "Puertas interiores y exteriores",
            "puertas exteriores e interiores": "Puertas interiores y exteriores",
            "puertas interiores y exteriores": "Puertas interiores y exteriores",
            "puertas (exteriores e interiores)": "Puertas interiores y exteriores",

            "lado derecho exterior": "Laterales exteriores",
            "lado izquierdo exterior": "Laterales exteriores",
            "exterior - lado derecho": "Laterales exteriores",
            "exterior - lado izquierdo": "Laterales exteriores",
            "laterales exteriores": "Laterales exteriores",

            "lado derecho interior": "Laterales interiores",
            "lado izquierdo interior": "Laterales interiores",
            "interior - lado derecho": "Laterales interiores",
            "interior - lado izquierdo": "Laterales interiores",
            "laterales interiores": "Laterales interiores",

            "frontal exterior": "Frontal interior y exterior",
            "frontal interior": "Frontal interior y exterior",
            "frontal interior y exterior": "Frontal interior y exterior",

            "techo": "Techo interior y exterior",
            "techo interior y exterior": "Techo interior y exterior",
            "techo (interior y exterior)": "Techo interior y exterior",

            "suelo interior": "Suelo interior",
            "interior - piso": "Suelo interior",

            "unidad genset": "Equipos auxiliares y refrigeración",
            "genset": "Equipos auxiliares y refrigeración",
            "unidad refrigerante": "Equipos auxiliares y refrigeración",
            "refrigeracion": "Equipos auxiliares y refrigeración",
            "equipos auxiliares y refrigeracion": "Equipos auxiliares y refrigeración",
            "equipos auxiliares y refrigeración": "Equipos auxiliares y refrigeración",

            "cabina del chofer": "Cabina del chofer"
        };

        return equivalencias[texto] || String(categoria || "Sin categoría").trim();

    },


    obtenerConfiguracionCategoriaBASC(
        categoria
    ) {

        const nombre = this.normalizarCategoriaBASC(categoria);

        return this.categoriasBASC.find(item => item.nombre === nombre) || {
            nombre: nombre,
            codigo: "",
            icono: "fa-clipboard-check",
            orden: 999
        };

    },


    obtenerCategoriasOrdenadasBASC(
        grupos
    ) {

        return Object.keys(grupos).sort((categoriaA, categoriaB) => {
            const configA = this.obtenerConfiguracionCategoriaBASC(categoriaA);
            const configB = this.obtenerConfiguracionCategoriaBASC(categoriaB);
            return configA.orden - configB.orden;
        });

    },


    obtenerCodigoZonaCategoria(
        puntos
    ) {

        const primerCodigo =
            Array.isArray(puntos)
                ? puntos.find(item =>
                    String(
                        item.codigoZonaEvidencia || ""
                    ).trim()
                )
                : null;

        return primerCodigo
            ? String(
                primerCodigo.codigoZonaEvidencia
            ).trim()
            : "";

    },


    obtenerRespuestaBASC(
        codigo
    ) {

        const clave =
            String(codigo || "").trim();

        if (!this.respuestasBASC[clave]) {

            this.respuestasBASC[clave] = {
                estado: "",
                observacion: ""
            };

        }

        return this.respuestasBASC[clave];

    },


    agruparCatalogoBASC() {

        const grupos = {};

        this.catalogo
            .slice()
            .sort(function(a, b) {

                return (
                    Number(a.orden || 0) -
                    Number(b.orden || 0)
                );

            })
            .forEach(item => {

                const categoria =
                    this.normalizarCategoriaBASC(
                        item.categoria
                    );

                if (!grupos[categoria]) {
                    grupos[categoria] = [];
                }

                grupos[categoria].push(item);

            });

        return grupos;

    },


    obtenerResumenCategoriaBASC(
        categoria,
        puntos
    ) {

        let respondidos = 0;
        let noCumple = 0;

        puntos.forEach(punto => {

            const respuesta =
                this.respuestasBASC[
                    String(
                        punto.codigo || ""
                    ).trim()
                ];

            if (respuesta && respuesta.estado) {
                respondidos++;
            }

            if (
                respuesta &&
                respuesta.estado === "No cumple"
            ) {
                noCumple++;
            }

        });

        return {
            total: puntos.length,
            respondidos: respondidos,
            noCumple: noCumple,
            completada:
                puntos.length > 0 &&
                respondidos === puntos.length,
            evidencia:
                Array.isArray(
                    this.evidenciasPorCategoria[categoria]
                ) &&
                this.evidenciasPorCategoria[categoria].length > 0
        };

    },


    obtenerClaseEstadoCategoria(
        resumen
    ) {

        if (resumen.completada) {
            return "completa";
        }

        if (resumen.respondidos > 0) {
            return "en-proceso";
        }

        return "pendiente";

    },


    mostrarPasoBASC() {

        const contenidoModal =
            document.getElementById(
                "contenidoModal"
            );

        if (!contenidoModal) {
            return;
        }

        const grupos =
            this.agruparCatalogoBASC();

        const categorias =
            this.obtenerCategoriasOrdenadasBASC(grupos);

        if (
            !this.categoriaActivaBASC &&
            categorias.length > 0
        ) {
            this.categoriaActivaBASC = categorias[0];
        }

        contenidoModal.innerHTML = `
            <section class="asistente-inspeccion">

                <div class="inspeccion-pasos">
                    <div class="paso-inspeccion completado">1. Información</div>
                    <div class="paso-inspeccion activo">2. Inspección BASC</div>
                    <div class="paso-inspeccion">3. Evidencias</div>
                    <div class="paso-inspeccion">4. Finalizar</div>
                </div>

                <div class="inspeccion-encabezado">
                    <div>
                        <h2>Inspección BASC</h2>
                        <p>Seleccione una zona, revise sus puntos y registre el resultado.</p>
                    </div>
                    <span class="estado-inspeccion">En proceso</span>
                </div>

                ${
                    this.crearFichaDocumentalInspeccion(
                        "En proceso"
                    )
                }

                <div class="panel-progreso-inspeccion">
                    <div class="progreso-inspeccion-principal">
                        <div class="progreso-circular-basc">
                            <strong id="porcentajeGeneralBASC">0%</strong>
                            <span>completado</span>
                        </div>
                        <div class="progreso-inspeccion-info">
                            <span>Progreso general</span>
                            <strong id="textoProgresoBASC">0 de ${this.catalogo.length}</strong>
                            <div class="barra-progreso-basc">
                                <div id="barraProgresoBASC" class="barra-progreso-basc__relleno" style="width:0%;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="dato-inspeccion-resumen">
                        <span>Conduce</span>
                        <strong>${this.datosConduce && this.datosConduce.despacho ? this.datosConduce.despacho.noConduce || "-" : "-"}</strong>
                    </div>
                    <div class="dato-inspeccion-resumen">
                        <span>Contenedor</span>
                        <strong>${this.datosConduce && this.datosConduce.contenedor ? this.datosConduce.contenedor.identificacion || "-" : "-"}</strong>
                    </div>
                </div>

                <div class="layout-paso-basc">
                    <aside class="mapa-zonas-basc">
                        <div class="mapa-zonas-basc__encabezado">
                            <div>
                                <h3>Zonas del contenedor</h3>
                                <p>Cada zona requiere al menos una fotografía en el Paso 3.</p>
                            </div>
                            <i class="fa-solid fa-box"></i>
                        </div>
                        <div class="grid-zonas-basc">
                            ${categorias.map(categoria => {
                                const puntos = grupos[categoria];
                                const resumen = this.obtenerResumenCategoriaBASC(categoria, puntos);
                                const claseEstado = this.obtenerClaseEstadoCategoria(resumen);
                                const activa = categoria === this.categoriaActivaBASC;
                                const configuracionCategoria = this.obtenerConfiguracionCategoriaBASC(categoria);
                                const codigoZona = configuracionCategoria.codigo || this.obtenerCodigoZonaCategoria(puntos);
                                return `
                                    <button type="button" class="tarjeta-zona-basc ${claseEstado} ${activa ? "activa" : ""}" data-categoria="${categoria}">
                                        <div class="tarjeta-zona-basc__superior">
                                            <span class="codigo-zona-basc"><i class="fa-solid ${configuracionCategoria.icono}"></i> ${codigoZona || "Zona"}</span>
                                            <span class="estado-zona-basc">${resumen.completada ? '<i class="fa-solid fa-check"></i>' : `${resumen.respondidos}/${resumen.total}`}</span>
                                        </div>
                                        <strong>${categoria}</strong>
                                        <div class="tarjeta-zona-basc__pie">
                                            <span>${resumen.noCumple > 0 ? `${resumen.noCumple} hallazgo(s)` : (resumen.completada ? "Revisión completada" : "Pendiente de revisión")}</span>
                                            <span class="indicador-evidencia-zona"><i class="fa-solid fa-camera"></i>1 foto mínima</span>
                                        </div>
                                    </button>
                                `;
                            }).join("")}
                        </div>
                    </aside>
                    <main class="detalle-zona-basc">
                        <div id="contenidoZonaBASC"></div>
                    </main>
                </div>

                <div class="acciones-inspeccion acciones-paso-basc">
                    <button type="button" id="btnVolverInformacionInspeccion" class="btn-secundario-inspeccion">
                        <i class="fa-solid fa-arrow-left"></i> Volver
                    </button>
                    <div class="acciones-basc-derecha">
                        <span id="mensajeValidacionBASC" class="mensaje-validacion-basc"></span>
                        <button type="button" id="btnContinuarEvidencias" class="btn-iniciar-inspeccion">
                            Evidencias <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </section>
        `;

        this.dibujarCategoriaActivaBASC();
        this.configurarEventosPasoBASC();
        this.actualizarProgresoBASC();

    },


    dibujarCategoriaActivaBASC() {

        const contenedor =
            document.getElementById(
                "contenidoZonaBASC"
            );

        if (!contenedor) {
            return;
        }

        const grupos =
            this.agruparCatalogoBASC();

        const categoria =
            this.categoriaActivaBASC;

        const puntos =
            grupos[categoria] || [];

        if (puntos.length === 0) {
            contenedor.innerHTML = `<div class="zona-basc-vacia"><i class="fa-solid fa-list-check"></i><strong>No hay puntos disponibles.</strong></div>`;
            return;
        }

        const resumen =
            this.obtenerResumenCategoriaBASC(
                categoria,
                puntos
            );

        contenedor.innerHTML = `
            <div class="encabezado-detalle-zona">
                <div>
                    <span>Zona seleccionada</span>
                    <h3>${categoria}</h3>
                    <p id="textoResumenCategoriaActivaBASC">${resumen.respondidos} de ${resumen.total} puntos revisados.</p>
                </div>
                <div
                    id="estadoCategoriaActivaBASC"
                    class="estado-detalle-zona ${this.obtenerClaseEstadoCategoria(resumen)}"
                >
                    ${resumen.completada ? '<i class="fa-solid fa-circle-check"></i> Completada' : '<i class="fa-solid fa-clock"></i> En revisión'}
                </div>
            </div>

            <div class="lista-puntos-basc">
                ${puntos.map((punto, indice) => {
                    const codigo = String(punto.codigo || `PUNTO_${indice}`).trim();
                    const respuesta = this.obtenerRespuestaBASC(codigo);
                    return `
                        <article class="punto-basc" data-codigo="${codigo}">
                            <div class="punto-basc-identificacion">
                                <span class="numero-punto-basc">${indice + 1}</span>
                                <div>
                                    <span class="codigo-punto-basc">${codigo}</span>
                                    <p>${punto.descripcion || "Punto de inspección"}</p>
                                </div>
                            </div>

                            <div class="opciones-resultado-basc">
                                <label class="opcion-resultado-basc cumple ${respuesta.estado === "Cumple" ? "seleccionada" : ""}">
                                    <input type="radio" name="resultadoBASC_${codigo}" value="Cumple" ${respuesta.estado === "Cumple" ? "checked" : ""}>
                                    <span><i class="fa-solid fa-check"></i>Cumple</span>
                                </label>
                                <label class="opcion-resultado-basc no-cumple ${respuesta.estado === "No cumple" ? "seleccionada" : ""}">
                                    <input type="radio" name="resultadoBASC_${codigo}" value="No cumple" ${respuesta.estado === "No cumple" ? "checked" : ""}>
                                    <span><i class="fa-solid fa-xmark"></i>No cumple</span>
                                </label>
                                <label class="opcion-resultado-basc no-aplica ${respuesta.estado === "No aplica" ? "seleccionada" : ""}">
                                    <input type="radio" name="resultadoBASC_${codigo}" value="No aplica" ${respuesta.estado === "No aplica" ? "checked" : ""}>
                                    <span><i class="fa-solid fa-minus"></i>No aplica</span>
                                </label>
                            </div>

                            <div class="campo-observacion-basc ${respuesta.estado === "No cumple" ? "visible" : ""}" id="contenedorObservacionBASC_${codigo}">
                                <label for="observacionBASC_${codigo}">Observación del hallazgo <strong>*</strong></label>
                                <textarea id="observacionBASC_${codigo}" rows="3" placeholder="Describa la condición encontrada...">${respuesta.observacion || ""}</textarea>
                                <small>Esta observación es obligatoria.</small>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        `;

        this.configurarEventosPuntosBASC();

    },




    obtenerDetalleCategoriaBASC(
        categoria
    ) {

        return this.catalogo
            .filter(punto =>
                this.normalizarCategoriaBASC(
                    punto.categoria
                ) === categoria
            )
            .map(punto => {

                const codigo =
                    String(
                        punto.codigo || ""
                    ).trim();

                const respuesta =
                    this.obtenerRespuestaBASC(
                        codigo
                    );

                return {

                    codigoPunto:
                        codigo,

                    categoria:
                        categoria,

                    codigoZonaEvidencia:
                        String(
                            punto.codigoZonaEvidencia ||
                            ""
                        ).trim(),

                    resultado:
                        respuesta.estado || "",

                    observacion:
                        String(
                            respuesta.observacion || ""
                        ).trim()

                };

            });

    },


    obtenerFirmaCategoriaBASC(
        categoria
    ) {

        return JSON.stringify(
            this.obtenerDetalleCategoriaBASC(
                categoria
            )
        );

    },


    categoriaBASCListaParaGuardar(
        categoria
    ) {

        const grupos =
            this.agruparCatalogoBASC();

        const puntos =
            grupos[categoria] || [];

        if (puntos.length === 0) {
            return false;
        }

        return puntos.every(punto => {

            const codigo =
                String(
                    punto.codigo || ""
                ).trim();

            const respuesta =
                this.obtenerRespuestaBASC(
                    codigo
                );

            if (!respuesta.estado) {
                return false;
            }

            if (
                respuesta.estado ===
                    "No cumple" &&
                !String(
                    respuesta.observacion || ""
                ).trim()
            ) {
                return false;
            }

            return true;

        });

    },


    programarGuardadoCategoriaBASC(
        categoria
    ) {

        if (
            !this.idInspeccion ||
            !categoria
        ) {
            return;
        }

        if (
            this.temporizadoresGuardadoBASC[
                categoria
            ]
        ) {

            clearTimeout(
                this.temporizadoresGuardadoBASC[
                    categoria
                ]
            );

        }

        this.temporizadoresGuardadoBASC[
            categoria
        ] = setTimeout(
            () => {

                this.guardarCategoriaBASC(
                    categoria
                ).catch(error => {

                    console.error(
                        "Error en guardado automático de categoría:",
                        error
                    );

                    if (
                        window.Despachos &&
                        typeof Despachos.notificar ===
                            "function"
                    ) {

                        Despachos.notificar(
                            error.message ||
                            "No fue posible guardar automáticamente la categoría.",
                            "error"
                        );

                    }

                });

            },
            500
        );

    },


    async guardarCategoriaBASC(
        categoria
    ) {

        if (
            !this.categoriaBASCListaParaGuardar(
                categoria
            )
        ) {
            return false;
        }

        if (
            this.guardadoCategoriaEnCurso[
                categoria
            ]
        ) {

            return this.guardadoCategoriaEnCurso[
                categoria
            ];

        }

        const firmaActual =
            this.obtenerFirmaCategoriaBASC(
                categoria
            );

        if (
            this.guardadosCategoriaBASC[
                categoria
            ] === firmaActual
        ) {
            return true;
        }

        const inspector =
            this.obtenerInspectorActual();

        const promesa =
            API.post({

                action:
                    "guardarDetalleInspeccion",

                idInspeccion:
                    this.idInspeccion,

                detalle:
                    this.obtenerDetalleCategoriaBASC(
                        categoria
                    ),

                usuario:
                    inspector.nombre

            })
            .then(respuesta => {

                if (
                    !respuesta ||
                    !respuesta.ok
                ) {

                    throw new Error(
                        respuesta &&
                        respuesta.mensaje
                            ? respuesta.mensaje
                            : "No fue posible guardar la categoría."
                    );

                }

                this.guardadosCategoriaBASC[
                    categoria
                ] = firmaActual;

                console.log(
                    "Categoría guardada automáticamente:",
                    categoria
                );

                return true;

            })
            .finally(() => {

                delete this
                    .guardadoCategoriaEnCurso[
                        categoria
                    ];

            });

        this.guardadoCategoriaEnCurso[
            categoria
        ] = promesa;

        return promesa;

    },


    obtenerDetalleInspeccionBASC() {

        return this.catalogo.map(punto => {

            const codigo =
                String(
                    punto.codigo || ""
                ).trim();

            const respuesta =
                this.obtenerRespuestaBASC(
                    codigo
                );

            return {

                codigoPunto:
                    codigo,

                categoria:
                    this.normalizarCategoriaBASC(
                        punto.categoria
                    ),

                codigoZonaEvidencia:
                    String(
                        punto.codigoZonaEvidencia || ""
                    ).trim(),

                resultado:
                    respuesta.estado || "",

                observacion:
                    String(
                        respuesta.observacion || ""
                    ).trim()

            };

        });

    },


    async sincronizarCategoriasPendientesBASC(
        boton
    ) {

        const grupos =
            this.agruparCatalogoBASC();

        const categorias =
            this.obtenerCategoriasOrdenadasBASC(
                grupos
            );

        const contenidoOriginal =
            boton ? boton.innerHTML : "";

        try {

            if (boton) {

                boton.disabled = true;

                boton.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Verificando revisión...
                `;

            }

            for (const categoria of categorias) {

                if (
                    !this.categoriaBASCListaParaGuardar(
                        categoria
                    )
                ) {

                    throw new Error(
                        `La categoría "${categoria}" todavía no está completa.`
                    );

                }

                await this.guardarCategoriaBASC(
                    categoria
                );

            }

            const categoriasNoSincronizadas =
                categorias.filter(categoria => {

                    return (
                        this.guardadosCategoriaBASC[
                            categoria
                        ] !==
                        this.obtenerFirmaCategoriaBASC(
                            categoria
                        )
                    );

                });

            if (
                categoriasNoSincronizadas.length > 0
            ) {

                throw new Error(
                    "No fue posible confirmar el guardado de todas las categorías."
                );

            }

            return true;

        } finally {

            if (
                boton &&
                document.body.contains(boton)
            ) {

                boton.disabled = false;
                boton.innerHTML = contenidoOriginal;

            }

        }

    },


    async guardarDetalleInspeccionBASC(
        boton
    ) {

        const idInspeccion =
            String(
                this.idInspeccion || ""
            ).trim();

        if (!idInspeccion) {

            throw new Error(
                "No existe un ID de inspección activo."
            );

        }

        const detalle =
            this.obtenerDetalleInspeccionBASC();

        if (detalle.length === 0) {

            throw new Error(
                "No existen puntos BASC para guardar."
            );

        }

        const inspector =
            this.obtenerInspectorActual();

        const contenidoOriginal =
            boton ? boton.innerHTML : "";

        try {

            if (boton) {

                boton.disabled = true;

                boton.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Guardando revisión...
                `;

            }

            console.log(
                "Guardando detalle de inspección:",
                {
                    idInspeccion:
                        idInspeccion,

                    detalle:
                        detalle,

                    usuario:
                        inspector.nombre
                }
            );

            const respuesta =
                await API.post({

                    action:
                        "guardarDetalleInspeccion",

                    idInspeccion:
                        idInspeccion,

                    detalle:
                        detalle,

                    usuario:
                        inspector.nombre

                });

            console.log(
                "Respuesta guardarDetalleInspeccion:",
                respuesta
            );

            if (
                !respuesta ||
                !respuesta.ok
            ) {

                throw new Error(
                    respuesta &&
                    respuesta.mensaje
                        ? respuesta.mensaje
                        : "No fue posible guardar los puntos de inspección."
                );

            }

            return true;

        } finally {

            if (
                boton &&
                document.body.contains(boton)
            ) {

                boton.disabled = false;
                boton.innerHTML = contenidoOriginal;

            }

        }

    },


    configurarEventosPasoBASC() {

        document.querySelectorAll(".tarjeta-zona-basc").forEach(boton => {
            boton.addEventListener("click", async () => {

                const categoriaAnterior =
                    this.categoriaActivaBASC;

                if (
                    categoriaAnterior &&
                    categoriaAnterior !==
                        boton.dataset.categoria
                ) {

                    try {

                        await this.guardarCategoriaBASC(
                            categoriaAnterior
                        );

                    } catch (error) {

                        console.error(
                            "No fue posible guardar la categoría anterior:",
                            error
                        );

                    }

                }

                this.categoriaActivaBASC =
                    boton.dataset.categoria;

                document.querySelectorAll(".tarjeta-zona-basc").forEach(item => {
                    item.classList.toggle("activa", item === boton);
                });

                this.dibujarCategoriaActivaBASC();

            });
        });

        const btnVolver = document.getElementById("btnVolverInformacionInspeccion");
        if (btnVolver) {
            btnVolver.addEventListener("click", () => {
                this.pasoActual = 1;
                this.mostrarPasoInformacion();
                const select = document.getElementById("inspeccionConduce");
                const idConduce = this.datosConduce && this.datosConduce.despacho ? this.datosConduce.despacho.idConduce || "" : "";
                if (select && idConduce) {
                    select.value = idConduce;
                    this.mostrarDatosConduce();
                }
            });
        }

        const btnContinuar =
            document.getElementById(
                "btnContinuarEvidencias"
            );

        if (btnContinuar) {

            btnContinuar.addEventListener(
                "click",
                async () => {

                    if (!this.validarPasoBASC()) {
                        return;
                    }

                    try {

                        await this.sincronizarCategoriasPendientesBASC(
                            btnContinuar
                        );

                        this.pasoActual = 3;
                        this.mostrarPasoEvidencias();

                        if (
                            window.Despachos &&
                            typeof Despachos.notificar ===
                                "function"
                        ) {

                            Despachos.notificar(
                                "Revisión BASC sincronizada correctamente.",
                                "exito"
                            );

                        }

                    } catch (error) {

                        console.error(
                            "Error guardando puntos BASC:",
                            error
                        );

                        if (
                            window.Despachos &&
                            typeof Despachos.notificar ===
                                "function"
                        ) {

                            Despachos.notificar(
                                error.message ||
                                "No fue posible guardar la revisión BASC.",
                                "error"
                            );

                        }

                    }

                }
            );

        }

    },


    configurarEventosPuntosBASC() {

        document.querySelectorAll('.punto-basc input[type="radio"]').forEach(input => {
            input.addEventListener("change", evento => {
                const punto = evento.target.closest(".punto-basc");
                if (!punto) return;
                const codigo = punto.dataset.codigo;
                const respuesta = this.obtenerRespuestaBASC(codigo);
                respuesta.estado = evento.target.value;
                punto.querySelectorAll(".opcion-resultado-basc").forEach(opcion => opcion.classList.remove("seleccionada"));
                evento.target.closest(".opcion-resultado-basc").classList.add("seleccionada");
                const contenedorObservacion = document.getElementById(`contenedorObservacionBASC_${codigo}`);
                if (contenedorObservacion) {
                    contenedorObservacion.classList.toggle("visible", respuesta.estado === "No cumple");
                }
                if (respuesta.estado !== "No cumple") {
                    respuesta.observacion = "";
                    const textarea = document.getElementById(`observacionBASC_${codigo}`);
                    if (textarea) textarea.value = "";
                }
                punto.classList.remove("punto-basc-error");
                this.actualizarProgresoBASC();

                this.programarGuardadoCategoriaBASC(
                    this.categoriaActivaBASC
                );
            });
        });

        document.querySelectorAll('.campo-observacion-basc textarea').forEach(textarea => {
            textarea.addEventListener("input", evento => {
                const codigo = evento.target.id.replace("observacionBASC_", "");
                const respuesta = this.obtenerRespuestaBASC(codigo);
                respuesta.observacion = evento.target.value;
                const punto = evento.target.closest(".punto-basc");

                if (
                    punto &&
                    evento.target.value.trim()
                ) {
                    punto.classList.remove(
                        "punto-basc-error"
                    );
                }

                this.programarGuardadoCategoriaBASC(
                    this.categoriaActivaBASC
                );
            });
        });

    },


    actualizarEstadoCategoriaActivaBASC() {

        const grupos =
            this.agruparCatalogoBASC();

        const categoria =
            this.categoriaActivaBASC;

        const puntos =
            grupos[categoria] || [];

        const resumen =
            this.obtenerResumenCategoriaBASC(
                categoria,
                puntos
            );

        const textoResumen =
            document.getElementById(
                "textoResumenCategoriaActivaBASC"
            );

        const estadoCategoria =
            document.getElementById(
                "estadoCategoriaActivaBASC"
            );

        if (textoResumen) {

            textoResumen.textContent =
                `${resumen.respondidos} de ${resumen.total} puntos revisados.`;

        }

        if (estadoCategoria) {

            estadoCategoria.classList.remove(
                "pendiente",
                "en-proceso",
                "completa"
            );

            estadoCategoria.classList.add(
                this.obtenerClaseEstadoCategoria(
                    resumen
                )
            );

            estadoCategoria.innerHTML =
                resumen.completada
                    ? '<i class="fa-solid fa-circle-check"></i> Completada'
                    : '<i class="fa-solid fa-clock"></i> En revisión';

        }

    },


    actualizarProgresoBASC() {

        const total = this.catalogo.length;
        let respondidos = 0;

        this.catalogo.forEach(punto => {
            const codigo = String(punto.codigo || "").trim();
            const respuesta = this.respuestasBASC[codigo];
            if (respuesta && respuesta.estado) respondidos++;
        });

        const porcentaje = total > 0 ? Math.round((respondidos / total) * 100) : 0;
        const texto = document.getElementById("textoProgresoBASC");
        const porcentajeElemento = document.getElementById("porcentajeGeneralBASC");
        const barra = document.getElementById("barraProgresoBASC");
        if (texto) texto.textContent = `${respondidos} de ${total}`;
        if (porcentajeElemento) porcentajeElemento.textContent = `${porcentaje}%`;
        if (barra) barra.style.width = `${porcentaje}%`;

        const grupos = this.agruparCatalogoBASC();
        document.querySelectorAll(".tarjeta-zona-basc").forEach(tarjeta => {
            const categoria = tarjeta.dataset.categoria;
            const puntos = grupos[categoria] || [];
            const resumen = this.obtenerResumenCategoriaBASC(categoria, puntos);
            tarjeta.classList.remove("pendiente", "en-proceso", "completa");
            tarjeta.classList.add(this.obtenerClaseEstadoCategoria(resumen));
            const estado = tarjeta.querySelector(".estado-zona-basc");
            if (estado) estado.innerHTML = resumen.completada ? '<i class="fa-solid fa-check"></i>' : `${resumen.respondidos}/${resumen.total}`;
        });

        this.actualizarEstadoCategoriaActivaBASC();

    },


    validarPasoBASC() {

        let primerCodigoInvalido = "";
        let faltanRespuestas = 0;
        let faltanObservaciones = 0;

        this.catalogo.forEach(punto => {
            const codigo = String(punto.codigo || "").trim();
            const respuesta = this.obtenerRespuestaBASC(codigo);
            let invalido = false;
            if (!respuesta.estado) {
                faltanRespuestas++;
                invalido = true;
            }
            if (respuesta.estado === "No cumple" && !String(respuesta.observacion || "").trim()) {
                faltanObservaciones++;
                invalido = true;
            }
            if (invalido && !primerCodigoInvalido) primerCodigoInvalido = codigo;
        });

        const mensaje = document.getElementById("mensajeValidacionBASC");
        if (faltanRespuestas === 0 && faltanObservaciones === 0) {
            if (mensaje) mensaje.textContent = "";
            return true;
        }

        const partes = [];
        if (faltanRespuestas > 0) partes.push(`${faltanRespuestas} punto(s) sin responder`);
        if (faltanObservaciones > 0) partes.push(`${faltanObservaciones} observación(es) requerida(s)`);
        if (mensaje) mensaje.textContent = partes.join(" · ");

        if (primerCodigoInvalido) {
            const puntoCatalogo = this.catalogo.find(item => String(item.codigo || "").trim() === primerCodigoInvalido);
            if (puntoCatalogo) {
                this.categoriaActivaBASC = this.normalizarCategoriaBASC(puntoCatalogo.categoria);
                this.mostrarPasoBASC();
                setTimeout(() => {
                    const punto = document.querySelector(`.punto-basc[data-codigo="${primerCodigoInvalido}"]`);
                    if (punto) {
                        punto.classList.add("punto-basc-error");
                        punto.scrollIntoView({behavior:"smooth", block:"center"});
                    }
                }, 50);
            }
        }

        if (window.Despachos && typeof Despachos.notificar === "function") {
            Despachos.notificar("Debe completar todos los puntos BASC antes de continuar.", "error");
        }
        return false;

    },


    async cargarEvidenciasGuardadas() {
        const idInspeccion = String(this.idInspeccion || "").trim();
        if (!idInspeccion) return;
        const respuesta = await API.post({ action: "listarEvidenciasInspeccion", idInspeccion });
        if (!respuesta || !respuesta.ok) {
            console.error("No fue posible cargar evidencias:", respuesta);
            return;
        }
        this.evidenciasPorCategoria = {};
        (Array.isArray(respuesta.data) ? respuesta.data : []).forEach(evidencia => {
            const categoria = this.normalizarCategoriaBASC(evidencia.zonaInspeccion || evidencia.categoria || "");
            if (!categoria) return;
            if (!this.evidenciasPorCategoria[categoria]) this.evidenciasPorCategoria[categoria] = [];
            this.evidenciasPorCategoria[categoria].push(evidencia);
        });
    },

    obtenerCodigoZonaBASC(categoria) {
        return String(this.obtenerConfiguracionCategoriaBASC(categoria).codigo || "").trim();
    },

    leerArchivoComoBase64(archivo) {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = () => {
                const resultado = String(lector.result || "");
                resolve(resultado.includes(",") ? resultado.split(",")[1] : resultado);
            };
            lector.onerror = () => reject(new Error(`No fue posible leer ${archivo.name}.`));
            lector.readAsDataURL(archivo);
        });
    },

    async subirEvidenciaInspeccion(categoria, archivo) {
        const idInspeccion = String(this.idInspeccion || "").trim();
        if (!idInspeccion) throw new Error("No existe una inspección activa.");
        const codigoZona = this.obtenerCodigoZonaBASC(categoria);
        const inspector = this.obtenerInspectorActual();
        const respuesta = await API.post({
            action: "subirEvidenciaInspeccion",
            idInspeccion,
            codigoZona,
            zonaInspeccion: categoria,
            nombreOriginal: archivo.name || "",
            tipoArchivo: archivo.type || "application/octet-stream",
            tamanoBytes: Number(archivo.size || 0),
            archivoBase64: await this.leerArchivoComoBase64(archivo),
            usuario: inspector.nombre,
            observacion: ""
        });
        if (!respuesta || !respuesta.ok) throw new Error(respuesta?.mensaje || "No fue posible guardar la evidencia.");
        return respuesta.data;
    },

    async subirArchivosEvidenciaCategoria(categoria, archivos) {
        if (!archivos.length) return;
        this.evidenciasCargando[categoria] = true;
        this.mostrarPasoEvidencias();
        try {
            for (const archivo of archivos) {
                const evidencia = await this.subirEvidenciaInspeccion(categoria, archivo);
                if (!this.evidenciasPorCategoria[categoria]) this.evidenciasPorCategoria[categoria] = [];
                this.evidenciasPorCategoria[categoria].push(evidencia);
            }
            if (window.Despachos?.notificar) Despachos.notificar("Evidencia guardada correctamente.", "exito");
        } finally {
            delete this.evidenciasCargando[categoria];
            this.mostrarPasoEvidencias();
        }
    },

    async eliminarEvidenciaInspeccion(categoria, indice) {
        const lista = this.evidenciasPorCategoria[categoria] || [];
        const evidencia = lista[indice];
        if (!evidencia) return;
        const respuesta = await API.post({
            action: "eliminarEvidenciaInspeccion",
            idEvidencia: evidencia.idEvidencia || evidencia.ID_Evidencia || "",
            archivoId: evidencia.archivoId || evidencia.Archivo_ID || ""
        });
        if (!respuesta || !respuesta.ok) throw new Error(respuesta?.mensaje || "No fue posible eliminar la evidencia.");
        lista.splice(indice, 1);
    },

    mostrarPasoEvidencias() {

        const contenidoModal = document.getElementById("contenidoModal");
        if (!contenidoModal) return;
        const grupos = this.agruparCatalogoBASC();
        const categorias = this.obtenerCategoriasOrdenadasBASC(grupos);

        contenidoModal.innerHTML = `
            <section class="asistente-inspeccion">
                <div class="inspeccion-pasos">
                    <div class="paso-inspeccion completado">1. Información</div>
                    <div class="paso-inspeccion completado">2. Inspección BASC</div>
                    <div class="paso-inspeccion activo">3. Evidencias</div>
                    <div class="paso-inspeccion">4. Finalizar</div>
                </div>

                <div class="inspeccion-encabezado">
                    <div>
                        <h2>Evidencias de inspección</h2>
                        <p>Registre al menos una fotografía por cada categoría inspeccionada.</p>
                    </div>
                    <span class="estado-inspeccion">Evidencias</span>
                </div>

                ${
                    this.crearFichaDocumentalInspeccion(
                        "Evidencias"
                    )
                }

                <div class="aviso-evidencias-basc">
                    <i class="fa-solid fa-shield-halved"></i>
                    <div>
                        <strong>Evidencia obligatoria</strong>
                        <p>Las fotografías comprueban que la inspección fue realizada, incluso cuando todos los puntos cumplen.</p>
                    </div>
                </div>

                <div class="grid-evidencias-categorias">
                    ${categorias.map(categoria => {
                        const puntos = grupos[categoria];
                        const configuracionCategoria = this.obtenerConfiguracionCategoriaBASC(categoria);
                        const codigoZona = configuracionCategoria.codigo || this.obtenerCodigoZonaCategoria(puntos);
                        const archivos = this.evidenciasPorCategoria[categoria] || [];
                        return `
                            <article class="tarjeta-evidencia-categoria ${archivos.length > 0 ? "completa" : "pendiente"}" data-categoria="${categoria}">
                                <div class="tarjeta-evidencia-categoria__encabezado">
                                    <div><span><i class="fa-solid ${configuracionCategoria.icono}"></i> ${codigoZona || "Zona"}</span><h3>${categoria}</h3></div>
                                    <div class="estado-evidencia-categoria">${archivos.length > 0 ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-camera"></i>'}</div>
                                </div>
                                <p>Fotografía general que demuestre la revisión de esta zona.</p>
                                <label class="boton-cargar-evidencia">
                                    <input type="file" accept="image/*" capture="environment" data-categoria="${categoria}" multiple ${this.evidenciasCargando[categoria] ? "disabled" : ""}>
                                    <i class="fa-solid fa-camera"></i>
                                    <span>${archivos.length > 0 ? "Agregar más fotos" : "Tomar o seleccionar foto"}</span>
                                </label>
                                <div class="lista-evidencias-categoria" id="listaEvidencias_${this.convertirCategoriaId(categoria)}">
                                    ${this.crearVistaArchivosEvidencia(categoria)}
                                </div>
                            </article>
                        `;
                    }).join("")}
                </div>

                <div class="acciones-inspeccion">
                    <button type="button" id="btnVolverPasoBASC" class="btn-secundario-inspeccion"><i class="fa-solid fa-arrow-left"></i> Volver</button>
                    <button type="button" id="btnContinuarFinalizarInspeccion" class="btn-iniciar-inspeccion">Continuar <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </section>
        `;

        this.configurarEventosPasoEvidencias();

    },


    convertirCategoriaId(categoria) {
        return String(categoria || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "_");
    },


    crearVistaArchivosEvidencia(categoria) {
        const archivos = this.evidenciasPorCategoria[categoria] || [];
        if (this.evidenciasCargando[categoria]) return `<span class="sin-evidencia-categoria"><i class="fa-solid fa-spinner fa-spin"></i> Guardando fotografía...</span>`;
        if (archivos.length === 0) return `<span class="sin-evidencia-categoria">Sin fotografía registrada</span>`;
        return archivos.map((archivo, indice) => {
            const nombre = archivo.nombreArchivo || archivo.Nombre_Archivo || archivo.name || `Evidencia ${indice + 1}`;
            const url = archivo.archivoUrl || archivo.Archivo_URL || "";
            return `<div class="archivo-evidencia-categoria"><i class="fa-solid fa-image"></i>${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${nombre}</a>` : `<span>${nombre}</span>`}<button type="button" data-categoria="${categoria}" data-indice="${indice}" class="btn-eliminar-evidencia" title="Eliminar fotografía"><i class="fa-solid fa-xmark"></i></button></div>`;
        }).join("");
    },


    configurarEventosPasoEvidencias() {
        document.querySelectorAll('.boton-cargar-evidencia input[type="file"]').forEach(input => {
            input.addEventListener("change", async evento => {
                const categoria = evento.target.dataset.categoria;
                const archivos = Array.from(evento.target.files || []);
                if (!archivos.length) return;
                try {
                    await this.subirArchivosEvidenciaCategoria(categoria, archivos);
                } catch (error) {
                    delete this.evidenciasCargando[categoria];
                    this.mostrarPasoEvidencias();
                    if (window.Despachos?.notificar) Despachos.notificar(error.message || "No fue posible guardar la evidencia.", "error");
                }
            });
        });

        document.querySelectorAll(".btn-eliminar-evidencia").forEach(boton => {
            boton.addEventListener("click", async () => {
                boton.disabled = true;
                try {
                    await this.eliminarEvidenciaInspeccion(boton.dataset.categoria, Number(boton.dataset.indice));
                    this.mostrarPasoEvidencias();
                    if (window.Despachos?.notificar) Despachos.notificar("Evidencia eliminada correctamente.", "exito");
                } catch (error) {
                    boton.disabled = false;
                    if (window.Despachos?.notificar) Despachos.notificar(error.message || "No fue posible eliminar la evidencia.", "error");
                }
            });
        });

        const btnVolver = document.getElementById("btnVolverPasoBASC");
        if (btnVolver) btnVolver.addEventListener("click", () => { this.pasoActual = 2; this.mostrarPasoBASC(); });

        const btnContinuar = document.getElementById("btnContinuarFinalizarInspeccion");
        if (btnContinuar) {
            btnContinuar.addEventListener("click", async () => {
                btnContinuar.disabled = true;
                try {
                    await this.cargarEvidenciasGuardadas();
                    this.mostrarPasoEvidencias();
                    if (!this.validarEvidenciasPorCategoria()) return;
                    this.pasoActual = 4;
                    if (window.Despachos?.notificar) Despachos.notificar("Todas las evidencias fueron almacenadas correctamente.", "exito");
                } finally {
                    if (document.body.contains(btnContinuar)) btnContinuar.disabled = false;
                }
            });
        }
    },


    validarEvidenciasPorCategoria() {

        const grupos = this.agruparCatalogoBASC();
        const categorias = this.obtenerCategoriasOrdenadasBASC(grupos);
        const pendientes = categorias.filter(categoria => {
            const archivos = this.evidenciasPorCategoria[categoria];
            return !Array.isArray(archivos) || archivos.length === 0;
        });

        if (pendientes.length === 0) return true;

        const primeraPendiente = document.querySelector(`.tarjeta-evidencia-categoria[data-categoria="${pendientes[0]}"]`);
        if (primeraPendiente) {
            primeraPendiente.classList.add("evidencia-error");
            primeraPendiente.scrollIntoView({behavior:"smooth", block:"center"});
        }

        if (window.Despachos && typeof Despachos.notificar === "function") {
            Despachos.notificar(`Falta evidencia en ${pendientes.length} categoría(s).`, "error");
        }
        return false;

    },



    mostrarDatosConduceVacios() {

        const contenedor =
            document.getElementById(
                "datosInspeccionConduce"
            );

        const btnIniciar =
            document.getElementById(
                "btnIniciarRevision"
            );

        if (contenedor) {

            contenedor.className =
                "datos-inspeccion-vacios";

            contenedor.innerHTML = `
                <i class="fa-solid fa-truck-ramp-box"></i>

                <span>
                    Seleccione un despacho para cargar
                    los datos del contenedor.
                </span>
            `;

        }

        if (btnIniciar) {

            btnIniciar.disabled = true;

        }

    },


    mostrarDatosConduce() {

        const contenedor =
            document.getElementById(
                "datosInspeccionConduce"
            );

        const btnIniciar =
            document.getElementById(
                "btnIniciarRevision"
            );

        const datos =
            this.datosConduce;

        const despacho =
            datos.despacho || {};

        const chofer =
            datos.chofer || {};

        const unidad =
            datos.contenedor || {};

        const sellos =
            Array.isArray(datos.sellos)
                ? datos.sellos
                : [];

        const selloDestino1 =
            sellos.find(item =>
                Number(item.orden || 0) === 1
            ) || {};

        const selloDestino2 =
            sellos.find(item =>
                Number(item.orden || 0) === 2
            ) || {};

        contenedor.className =
            "grid-datos-inspeccion";

        contenedor.innerHTML = `
            <div class="tarjeta-inspeccion">

                <h3>
                    Datos del despacho
                </h3>
				<div class="fila-dato-inspeccion">
					<span>Puerto de salida</span>
					<strong>
						${datos.empresaOrigen || "-"}
					</strong>
				</div>				
                <div class="fila-dato-inspeccion">
                    <span>Conduce</span>
                    <strong>
                        ${despacho.noConduce || "-"}
                    </strong>
                </div>

                <div class="fila-dato-inspeccion">
                    <span>Destino 1</span>
                    <strong>
                        ${despacho.destino1 || "-"}
                    </strong>
                </div>

                <div class="fila-dato-inspeccion">
                    <span>Destino 2</span>
                    <strong>
                        ${despacho.destino2 || "-"}
                    </strong>
                </div>
				<div class="fila-dato-inspeccion">
					<span>Supervisor</span>
					<strong>
						${despacho.supervisor || "-"}
					</strong>
				</div>

                <div class="fila-dato-inspeccion">
                    <span>Chofer</span>
                    <strong>
                        ${chofer.nombre || despacho.chofer || "-"}
                    </strong>
                </div>					
				<div class="fila-dato-inspeccion">
					<span>Cantidad de destinos</span>
					<strong>
						${Number(despacho.cantidadDestinos || 1)}
					</strong>
				</div>

            </div>

            <div class="tarjeta-inspeccion">

                <h3>
                    Contenedor
                </h3>				
                <div class="fila-dato-inspeccion">
                    <span>Identificación</span>
                    <strong>
                        ${unidad.identificacion || "-"}
                    </strong>
                </div>

                <div class="fila-dato-inspeccion">
                    <span>Tipo</span>
                    <strong>
                        ${unidad.tipo || "-"}
                    </strong>
                </div>

                <div class="fila-dato-inspeccion">
					<span>Tamaño</span>
					<strong>
						${
							this.formatearTamanoContenedor(
								unidad.tamano
							)
						}
					</strong>
				</div>				
				<div class="fila-dato-inspeccion">
					<span>Chasis sugerido</span>
					<strong>
						${chofer.chasisPorDefecto || "-"}
					</strong>
				</div>
				
				<div class="fila-dato-inspeccion">
					<span>Transporte</span>
					<strong>
						${datos.tipoTransporte || "Terrestre"}
					</strong>
				</div>
                <div class="fila-dato-inspeccion">
                    <span>Sello destino 1</span>
                    <strong>
                        ${
                            selloDestino1.numero ||
                            despacho.precinto1 ||
                            "-"
                        }
                    </strong>
                </div>

                ${
                    Number(
                        despacho.cantidadDestinos || 1
                    ) === 2
                        ? `
                        <div class="fila-dato-inspeccion">
                            <span>Sello destino 2</span>
                            <strong>
                                ${
                                    selloDestino2.numero ||
                                    despacho.precinto2 ||
                                    "-"
                                }
                            </strong>
                        </div>
                        `
                        : ""
                }

            </div>
        `;

        if (btnIniciar) {

            btnIniciar.disabled = false;

        }

    }

};
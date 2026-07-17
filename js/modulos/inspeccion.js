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

    evidenciasLocalesPorCategoria: {},

	evidenciasLocalesCargadasPara: "",

	cargandoEvidenciasLocales: false,

	modalEvidenciaLocalAbierto: false,

    nombreBaseDatosEvidencias: "SistemaLogisticoPT_EvidenciasBASC",

    versionBaseDatosEvidencias: 1,

    categoriaActivaBASC: "",

    configuracion: {},

    guardadosCategoriaBASC: {},

    temporizadoresGuardadoBASC: {},

        guardadoCategoriaEnCurso: {},
    selloLlegada: "",
    
        categoriasBASC: [
        { nombre: "Afuera y debajo", codigo: "Z01", icono: "fa-truck-ramp-box", orden: 1 },
        { nombre: "Puertas interiores y exteriores", codigo: "Z02", icono: "fa-door-closed", orden: 2 },
        { nombre: "Laterales exteriores", codigo: "Z03", icono: "fa-arrows-left-right", orden: 3 },
        { nombre: "Laterales interiores", codigo: "Z04", icono: "fa-left-right", orden: 4 },
        { nombre: "Frontal interior y exterior", codigo: "Z05", icono: "fa-ruler-horizontal", orden: 5 },
        { nombre: "Techo interior y exterior", codigo: "Z06", icono: "fa-up-long", orden: 6 },
        { nombre: "Suelo interior", codigo: "Z07", icono: "fa-layer-group", orden: 7 },
        { nombre: "Equipos auxiliares y refrigeración", codigo: "Z08", icono: "fa-snowflake", orden: 8 },
        { nombre: "Cabina del chofer", codigo: "Z09", icono: "fa-truck-front", orden: 9 },
        { nombre: "Sello de llegada", codigo: "Z10", icono: "fa-lock", orden: 10 }
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
			
					const tituloModal =
			document.getElementById(
				"tituloModal"
			);

		if (tituloModal) {

			tituloModal.textContent =
				"Asistente de Inspección de Contenedores";

		}

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
        this.evidenciasLocalesPorCategoria = {};
		this.evidenciasLocalesCargadasPara = "";
		this.cargandoEvidenciasLocales = false;
		this.modalEvidenciaLocalAbierto = false;
        this.categoriaActivaBASC = "";
        this.configuracion = {};
		this.guardadosCategoriaBASC = {};
        this.temporizadoresGuardadoBASC = {};
        this.guardadoCategoriaEnCurso = {};
        this.selloLlegada = "";

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


    async guardarCategoriaBASC(categoria) {

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

                setTimeout(
                    () => {

                        this.solicitarEvidenciaLocalCategoria(
                            categoria
                        );

                    },
                    150
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

						try {

							await this.cargarEvidenciasLocalesInspeccion();

						} catch (error) {

							console.error(
								"Error recuperando evidencias locales:",
								error
							);

						}

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
	
	    abrirBaseDatosEvidenciasLocales() {

        return new Promise(
            (resolve, reject) => {

                if (!window.indexedDB) {

                    reject(
                        new Error(
                            "Este navegador no permite guardar fotografías localmente."
                        )
                    );

                    return;

                }

                const solicitud =
                    indexedDB.open(
                        this.nombreBaseDatosEvidencias,
                        this.versionBaseDatosEvidencias
                    );

                solicitud.onupgradeneeded =
                    evento => {

                        const baseDatos =
                            evento.target.result;

                        if (
                            !baseDatos.objectStoreNames.contains(
                                "evidencias"
                            )
                        ) {

                            const almacen =
                                baseDatos.createObjectStore(
                                    "evidencias",
                                    {
                                        keyPath: "id"
                                    }
                                );

                            almacen.createIndex(
                                "idInspeccion",
                                "idInspeccion",
                                {
                                    unique: false
                                }
                            );

                            almacen.createIndex(
                                "categoria",
                                "categoria",
                                {
                                    unique: false
                                }
                            );

                        }

                    };

                solicitud.onsuccess =
                    evento => {

                        resolve(
                            evento.target.result
                        );

                    };

                solicitud.onerror =
                    () => {

                        reject(
                            new Error(
                                "No fue posible abrir el almacenamiento local de evidencias."
                            )
                        );

                    };

            }
        );

    },


    crearIdEvidenciaLocal(
        idInspeccion,
        categoria
    ) {

        const inspeccion =
            String(
                idInspeccion || ""
            ).trim();

        const categoriaNormalizada =
            this.normalizarCategoriaBASC(
                categoria
            );

        return `${inspeccion}::${categoriaNormalizada}`;

    },


    async guardarEvidenciaLocal(
        categoria,
        archivo
    ) {

        const idInspeccion =
            String(
                this.idInspeccion || ""
            ).trim();

        const categoriaNormalizada =
            this.normalizarCategoriaBASC(
                categoria
            );

        if (!idInspeccion) {

            throw new Error(
                "No existe una inspección activa."
            );

        }

        if (!categoriaNormalizada) {

            throw new Error(
                "No se pudo identificar la categoría de la evidencia."
            );

        }

        if (!archivo) {

            throw new Error(
                "No se seleccionó ninguna fotografía."
            );

        }

        if (
            archivo.type &&
            !String(
                archivo.type
            ).startsWith("image/")
        ) {

            throw new Error(
                "El archivo seleccionado debe ser una imagen."
            );

        }

        const baseDatos =
            await this.abrirBaseDatosEvidenciasLocales();

        const registro = {

            id:
                this.crearIdEvidenciaLocal(
                    idInspeccion,
                    categoriaNormalizada
                ),

            idInspeccion,

            categoria:
                categoriaNormalizada,

            codigoZona:
                this.obtenerCodigoZonaBASC(
                    categoriaNormalizada
                ),

            nombreArchivo:
                archivo.name ||
                `Evidencia_${Date.now()}.jpg`,

            tipoArchivo:
                archivo.type ||
                "image/jpeg",

            tamanoBytes:
                Number(
                    archivo.size || 0
                ),

            archivo,

            fechaCaptura:
                new Date().toISOString(),

            estado:
                "Pendiente"

        };

        await new Promise(
            (resolve, reject) => {

                const transaccion =
                    baseDatos.transaction(
                        ["evidencias"],
                        "readwrite"
                    );

                const almacen =
                    transaccion.objectStore(
                        "evidencias"
                    );

                almacen.put(
                    registro
                );

                transaccion.oncomplete =
                    () => {

                        resolve();

                    };

                transaccion.onerror =
                    () => {

                        reject(
                            new Error(
                                "No fue posible guardar la fotografía localmente."
                            )
                        );

                    };

                transaccion.onabort =
                    () => {

                        reject(
                            new Error(
                                "El almacenamiento local de la fotografía fue cancelado."
                            )
                        );

                    };

            }
        );

        baseDatos.close();

        this.evidenciasLocalesPorCategoria[
            categoriaNormalizada
        ] = registro;

        return registro;

    },


    crearSelectorEvidenciaLocal(
        categoria
    ) {

        const input =
            document.createElement(
                "input"
            );

        input.type = "file";

        input.accept =
            "image/jpeg,image/png,image/webp,image/*";

        input.capture =
            "environment";

        input.style.display =
            "none";

        document.body.appendChild(
            input
        );

        input.addEventListener(
            "change",
            async evento => {

                const archivo =
                    evento.target.files &&
                    evento.target.files[0]
                        ? evento.target.files[0]
                        : null;

                try {

                    if (!archivo) {
                        return;
                    }

                    await this.guardarEvidenciaLocal(
                        categoria,
                        archivo
                    );

                    if (
                        window.Despachos &&
                        typeof Despachos.notificar ===
                            "function"
                    ) {

                        Despachos.notificar(
                            "Fotografía guardada localmente. Podrá subirla en el Paso 3.",
                            "exito"
                        );

                    }

                } catch (error) {

                    console.error(
                        "Error guardando evidencia local:",
                        error
                    );

                    if (
                        window.Despachos &&
                        typeof Despachos.notificar ===
                            "function"
                    ) {

                        Despachos.notificar(
                            error.message ||
                            "No fue posible guardar la fotografía localmente.",
                            "error"
                        );

                    }

                } finally {

                    input.remove();

                }

            },
            {
                once: true
            }
        );

        input.click();

    },


    cerrarModalEvidenciaLocal() {

        const modal =
            document.getElementById(
                "modalEvidenciaLocalBASC"
            );

        if (modal) {

            modal.remove();

        }

        this.modalEvidenciaLocalAbierto =
            false;

				},


				solicitarEvidenciaLocalCategoria(
				categoria
			) {

				console.log(
					"Entró solicitarEvidenciaLocalCategoria:",
					categoria
				);

				const categoriaNormalizada =
					this.normalizarCategoriaBASC(
						categoria
					);

					const modalExistente =
				document.getElementById(
					"modalEvidenciaLocalBASC"
				);

			/*
			 * Si la variable quedó bloqueada en true,
			 * pero el modal realmente no existe,
			 * restauramos el estado para permitir abrirlo.
			 */
			if (
				this.modalEvidenciaLocalAbierto &&
				!modalExistente
			) {

				console.warn(
					"Se restauró el estado del modal de evidencia local."
				);

				this.modalEvidenciaLocalAbierto =
					false;

			}

			console.log(
				"Estado antes de mostrar modal:",
				{
					categoriaOriginal:
						categoria,

					categoriaNormalizada:
						categoriaNormalizada,

					modalAbierto:
						this.modalEvidenciaLocalAbierto,

					modalExistente:
						Boolean(
							modalExistente
							)
					}
				);

				if (!categoriaNormalizada) {

					console.warn(
						"No se abrió el modal porque la categoría no pudo normalizarse.",
						categoria
					);

					return;

				}

				if (
					this.modalEvidenciaLocalAbierto ||
					modalExistente
				) {

					console.warn(
						"No se abrió el modal porque ya existe otro modal de evidencia local."
					);

					return;

				}

				this.modalEvidenciaLocalAbierto =
					true;

        const modal =
            document.createElement(
                "div"
            );

        modal.id =
            "modalEvidenciaLocalBASC";

        modal.className =
            "modal-evidencia-local-basc";

        modal.innerHTML = `
            <div class="modal-evidencia-local-contenido">

                <div class="modal-evidencia-local-icono">
                    <i class="fa-solid fa-camera"></i>
                </div>

                <div class="modal-evidencia-local-texto">

                    <h3>
                        La categoría se guardó correctamente.
                    </h3>

                    <p>
                        ¿Desea registrar la evidencia fotográfica ahora?
                    </p>

                    <span>
                        La fotografía quedará pendiente de subir en el Paso 3.
                    </span>

                </div>

                <div class="modal-evidencia-local-acciones">

                    <button
                        type="button"
                        id="btnContinuarSinEvidenciaLocal"
                        class="btn-evidencia-local-secundario"
                    >
                        Continuar
                    </button>

                    <button
                        type="button"
                        id="btnRegistrarEvidenciaLocal"
                        class="btn-evidencia-local-principal"
                    >
                        <i class="fa-solid fa-camera"></i>
                        Registrar evidencia
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(
            modal
        );

        const botonContinuar =
            document.getElementById(
                "btnContinuarSinEvidenciaLocal"
            );

        const botonRegistrar =
            document.getElementById(
                "btnRegistrarEvidenciaLocal"
            );

        if (botonContinuar) {

            botonContinuar.addEventListener(
                "click",
                () => {

                    this.cerrarModalEvidenciaLocal();

                }
            );

        }

        if (botonRegistrar) {

            botonRegistrar.addEventListener(
                "click",
                () => {

                    this.cerrarModalEvidenciaLocal();

                    this.crearSelectorEvidenciaLocal(
                        categoriaNormalizada
                    );

                }
            );

        }

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

    const contenidoModal =
        document.getElementById(
            "contenidoModal"
        );

    if (!contenidoModal) {
        return;
    }

    const idInspeccionActual =
        String(
            this.idInspeccion || ""
        ).trim();

    /*
     * Recupera automáticamente las fotografías locales
     * cuando el Paso 3 se abre por primera vez para esta
     * inspección.
     *
     * Esto también cubre inspecciones reanudadas que entran
     * directamente al Paso 3.
     */
    if (
        idInspeccionActual &&
        this.evidenciasLocalesCargadasPara !==
            idInspeccionActual &&
        !this.cargandoEvidenciasLocales
    ) {

        this.cargandoEvidenciasLocales =
            true;

        this.cargarEvidenciasLocalesInspeccion()
            .then(() => {

                this.evidenciasLocalesCargadasPara =
                    idInspeccionActual;

                console.log(
                    "Evidencias locales recuperadas:",
                    this.evidenciasLocalesPorCategoria
                );

            })
            .catch(error => {

                console.error(
                    "No fue posible recuperar las evidencias locales:",
                    error
                );

            })
            .finally(() => {

                this.cargandoEvidenciasLocales =
                    false;

                /*
                 * Volvemos a dibujar el Paso 3 ahora que
                 * IndexedDB ya respondió.
                 */
                this.mostrarPasoEvidencias();

            });

    }

        const grupos =
            this.agruparCatalogoBASC();

        const categorias =
            this.obtenerCategoriasOrdenadasBASC(
                grupos
            );

        const categoriaSello =
            "Sello de llegada";

        const configuracionSello =
            this.obtenerConfiguracionCategoriaBASC(
                categoriaSello
            );

        const evidenciasSello =
            this.evidenciasPorCategoria[
                categoriaSello
            ] || [];

        const selloActual =
            String(
                this.selloLlegada || ""
            ).trim();

        contenidoModal.innerHTML = `
            <section class="asistente-inspeccion">

               

                <div class="inspeccion-pasos">

                    <div class="paso-inspeccion completado">
                        1. Información
                    </div>

                    <div class="paso-inspeccion completado">
                        2. Inspección BASC
                    </div>

                    <div class="paso-inspeccion activo">
                        3. Evidencias
                    </div>

                    <div class="paso-inspeccion">
                        4. Finalizar
                    </div>

                </div>

                <div class="inspeccion-encabezado">

                    <div>

                        <h2>
                            Evidencias de inspección
                        </h2>

                        <p>
                            Registre una fotografía por cada zona
                            y la evidencia del sello de llegada.
                        </p>

                    </div>

                    <span class="estado-inspeccion">
                        10 evidencias
                    </span>

                </div>

                ${
                    this.crearFichaDocumentalInspeccion(
                        "Evidencias"
                    )
                }

                <div class="aviso-evidencias-basc">

                    <i class="fa-solid fa-shield-halved"></i>

                    <div>

                        <strong>
                            Evidencia obligatoria
                        </strong>

                        <p>
                            Debe registrar las nueve fotografías
                            de inspección, el número del sello de
                            llegada y su evidencia fotográfica.
                        </p>

                    </div>

                </div>

                <div class="grid-evidencias-categorias">

                    ${
                        categorias.map(categoria => {

                            const puntos =
                                grupos[categoria];

                            const configuracionCategoria =
                                this.obtenerConfiguracionCategoriaBASC(
                                    categoria
                                );

                            const codigoZona =
                                configuracionCategoria.codigo ||
                                this.obtenerCodigoZonaCategoria(
                                    puntos
                                );

                            const archivos =
                                this.evidenciasPorCategoria[
                                    categoria
                                ] || [];

                            return `
                                <article
                                    class="
                                        tarjeta-evidencia-categoria
                                        ${
                                            archivos.length > 0
                                                ? "completa"
                                                : "pendiente"
                                        }
                                    "
                                    data-categoria="${categoria}"
                                >

                                    <div class="tarjeta-evidencia-categoria__encabezado">

                                        <div>

                                            <span>
                                                <i class="fa-solid ${configuracionCategoria.icono}"></i>
                                                ${codigoZona || "Zona"}
                                            </span>

                                            <h3>
                                                ${categoria}
                                            </h3>

                                        </div>

                                        <div class="estado-evidencia-categoria">

                                            ${
                                                archivos.length > 0
                                                    ? '<i class="fa-solid fa-circle-check"></i>'
                                                    : '<i class="fa-solid fa-camera"></i>'
                                            }

                                        </div>

                                    </div>

                                    <p>
                                        Fotografía general que demuestre
                                        la revisión de esta zona.
                                    </p>

                                    <label class="boton-cargar-evidencia">

                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            data-categoria="${categoria}"
                                            multiple
                                            ${
                                                this.evidenciasCargando[
                                                    categoria
                                                ]
                                                    ? "disabled"
                                                    : ""
                                            }
                                        >

                                        <i class="fa-solid fa-camera"></i>

                                        <span>
                                            ${
                                                archivos.length > 0
                                                    ? "Agregar más fotos"
                                                    : "Tomar o seleccionar foto"
                                            }
                                        </span>

                                    </label>

                                    <div
                                        class="lista-evidencias-categoria"
                                        id="listaEvidencias_${this.convertirCategoriaId(categoria)}"
                                    >
                                        ${
                                            this.crearVistaArchivosEvidencia(
                                                categoria
                                            )
                                        }
                                    </div>

                                </article>
                            `;

                        }).join("")
                    }

                    <article
                        class="
                            tarjeta-evidencia-categoria
                            tarjeta-evidencia-sello-llegada
                            ${
                                evidenciasSello.length > 0 &&
                                selloActual
                                    ? "completa"
                                    : "pendiente"
                            }
                        "
                        data-categoria="${categoriaSello}"
                    >

                        <div class="tarjeta-evidencia-categoria__encabezado">

                            <div>

                                <span>
                                    <i class="fa-solid ${configuracionSello.icono}"></i>
                                    Z10
                                </span>

                                <h3>
                                    Sello de llegada
                                </h3>

                            </div>

                            <div class="estado-evidencia-categoria">

                                ${
                                    evidenciasSello.length > 0 &&
                                    selloActual
                                        ? '<i class="fa-solid fa-circle-check"></i>'
                                        : '<i class="fa-solid fa-lock"></i>'
                                }

                            </div>

                        </div>

                        <p>
                            Registre el número encontrado al momento
                            de recibir el contenedor y tome una
                            fotografía donde pueda identificarse.
                        </p>

                        <div class="campo-sello-llegada-evidencia">

                            <label for="selloLlegadaPasoEvidencias">
                                Número del sello de llegada
                            </label>

                            <input
                                type="text"
                                id="selloLlegadaPasoEvidencias"
                                value="${selloActual}"
                                placeholder="Ej.: SL-456781"
                                autocomplete="off"
                            >

                        </div>

                        <label class="boton-cargar-evidencia">

                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                data-categoria="${categoriaSello}"
                                ${
                                    this.evidenciasCargando[
                                        categoriaSello
                                    ]
                                        ? "disabled"
                                        : ""
                                }
                            >

                            <i class="fa-solid fa-camera"></i>

                            <span>
                                ${
                                    evidenciasSello.length > 0
                                        ? "Cambiar o agregar fotografía"
                                        : "Tomar o seleccionar foto"
                                }
                            </span>

                        </label>

                        <div
                            class="lista-evidencias-categoria"
                            id="listaEvidencias_${this.convertirCategoriaId(categoriaSello)}"
                        >
                            ${
                                this.crearVistaArchivosEvidencia(
                                    categoriaSello
                                )
                            }
                        </div>

                    </article>

                </div>

                <div class="acciones-inspeccion">

                    <button
                        type="button"
                        id="btnVolverPasoBASC"
                        class="btn-secundario-inspeccion"
                    >
                        <i class="fa-solid fa-arrow-left"></i>
                        Volver
                    </button>

                    <button
                        type="button"
                        id="btnContinuarFinalizarInspeccion"
                        class="btn-iniciar-inspeccion"
                    >
                        Continuar
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>

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


    async cargarEvidenciasLocalesInspeccion() {

        const idInspeccion =
            String(
                this.idInspeccion || ""
            ).trim();

        if (!idInspeccion) {
            return;
        }

        const baseDatos =
            await this.abrirBaseDatosEvidenciasLocales();

        const registros =
            await new Promise(
                (resolve, reject) => {

                    const transaccion =
                        baseDatos.transaction(
                            ["evidencias"],
                            "readonly"
                        );

                    const almacen =
                        transaccion.objectStore(
                            "evidencias"
                        );

                    const indice =
                        almacen.index(
                            "idInspeccion"
                        );

                    const solicitud =
                        indice.getAll(
                            idInspeccion
                        );

                    solicitud.onsuccess =
                        () => {

                            resolve(
                                solicitud.result || []
                            );

                        };

                    solicitud.onerror =
                        () => {

                            reject(
                                new Error(
                                    "No fue posible recuperar las evidencias locales."
                                )
                            );

                        };

                }
            );

        baseDatos.close();

        this.evidenciasLocalesPorCategoria = {};

        registros.forEach(
            registro => {

                const categoria =
                    this.normalizarCategoriaBASC(
                        registro.categoria
                    );

                if (categoria) {

                    this.evidenciasLocalesPorCategoria[
                        categoria
                    ] = registro;

                }

            }
        );

    },


    obtenerEvidenciaLocalCategoria(
        categoria
    ) {

        const categoriaNormalizada =
            this.normalizarCategoriaBASC(
                categoria
            );

        return (
            this.evidenciasLocalesPorCategoria[
                categoriaNormalizada
            ] || null
        );

    },


    async eliminarEvidenciaLocalCategoria(
        categoria
    ) {

        const categoriaNormalizada =
            this.normalizarCategoriaBASC(
                categoria
            );

        const evidenciaLocal =
            this.obtenerEvidenciaLocalCategoria(
                categoriaNormalizada
            );

        if (!evidenciaLocal) {
            return;
        }

        const baseDatos =
            await this.abrirBaseDatosEvidenciasLocales();

        await new Promise(
            (resolve, reject) => {

                const transaccion =
                    baseDatos.transaction(
                        ["evidencias"],
                        "readwrite"
                    );

                const almacen =
                    transaccion.objectStore(
                        "evidencias"
                    );

                almacen.delete(
                    evidenciaLocal.id
                );

                transaccion.oncomplete =
                    () => {

                        resolve();

                    };

                transaccion.onerror =
                    () => {

                        reject(
                            new Error(
                                "No fue posible eliminar la evidencia local."
                            )
                        );

                    };

            }
        );

        baseDatos.close();

        delete this.evidenciasLocalesPorCategoria[
            categoriaNormalizada
        ];

    },


    async subirEvidenciaLocalCategoria(
        categoria
    ) {

        const categoriaNormalizada =
            this.normalizarCategoriaBASC(
                categoria
            );

        const evidenciaLocal =
            this.obtenerEvidenciaLocalCategoria(
                categoriaNormalizada
            );

        if (
            !evidenciaLocal ||
            !evidenciaLocal.archivo
        ) {

            throw new Error(
                "No se encontró la fotografía local pendiente."
            );

        }

        await this.subirArchivosEvidenciaCategoria(
            categoriaNormalizada,
            [evidenciaLocal.archivo]
        );

        await this.eliminarEvidenciaLocalCategoria(
            categoriaNormalizada
        );

    },


        crearVistaArchivosEvidencia(
        categoria
    ) {

        const categoriaNormalizada =
            this.normalizarCategoriaBASC(
                categoria
            );

        const archivos =
            this.evidenciasPorCategoria[
                categoriaNormalizada
            ] || [];

        const evidenciaLocal =
            this.obtenerEvidenciaLocalCategoria(
                categoriaNormalizada
            );
		if (
			this.cargandoEvidenciasLocales &&
			!evidenciaLocal &&
			archivos.length === 0
		) {

			return `
				<span class="sin-evidencia-categoria">
					<i class="fa-solid fa-spinner fa-spin"></i>
					Buscando fotografía local...
				</span>
			`;

		}

        if (
            this.evidenciasCargando[
                categoriaNormalizada
            ]
        ) {

            return `
                <span class="sin-evidencia-categoria">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Guardando fotografía...
                </span>
            `;

        }

        const vistaLocal =
            evidenciaLocal
                ? `
                    <div class="evidencia-local-pendiente">

                        <div class="evidencia-local-pendiente__info">

                            <i class="fa-solid fa-mobile-screen-button"></i>

                            <div>
                                <strong>
                                    Pendiente de subir
                                </strong>

                                <span>
                                    ${
                                        evidenciaLocal.nombreArchivo ||
                                        "Fotografía local"
                                    }
                                </span>
                            </div>

                        </div>

                        <div class="evidencia-local-pendiente__acciones">

                            <button
                                type="button"
                                class="btn-eliminar-evidencia-local"
                                data-categoria="${categoriaNormalizada}"
                                title="Eliminar fotografía local"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                            <button
                                type="button"
                                class="btn-subir-evidencia-local"
                                data-categoria="${categoriaNormalizada}"
                            >
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                Subir
                            </button>

                        </div>

                    </div>
                `
                : "";

        const vistaServidor =
            archivos.map(
                (archivo, indice) => {

                    const nombre =
                        archivo.nombreArchivo ||
                        archivo.Nombre_Archivo ||
                        archivo.name ||
                        `Evidencia ${indice + 1}`;

                    const url =
                        archivo.archivoUrl ||
                        archivo.Archivo_URL ||
                        "";

                    return `
                        <div class="archivo-evidencia-categoria">

                            <i class="fa-solid fa-image"></i>

                            ${
                                url
                                    ? `
                                        <a
                                            href="${url}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            ${nombre}
                                        </a>
                                    `
                                    : `
                                        <span>
                                            ${nombre}
                                        </span>
                                    `
                            }

                            <button
                                type="button"
                                data-categoria="${categoriaNormalizada}"
                                data-indice="${indice}"
                                class="btn-eliminar-evidencia"
                                title="Eliminar fotografía"
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </button>

                        </div>
                    `;

                }
            ).join("");

        if (
            !evidenciaLocal &&
            archivos.length === 0
        ) {

            return `
                <span class="sin-evidencia-categoria">
                    Sin fotografía registrada
                </span>
            `;

        }

        return `
            ${vistaLocal}
            ${vistaServidor}
        `;

    },


      configurarEventosPasoEvidencias() {

        const inputSelloLlegada =
            document.getElementById(
                "selloLlegadaPasoEvidencias"
            );

        if (inputSelloLlegada) {

            inputSelloLlegada.addEventListener(
                "input",
                evento => {

                    this.selloLlegada =
                        String(
                            evento.target.value || ""
                        ).trim();

                }
            );

        }

        document
            .querySelectorAll(
                '.boton-cargar-evidencia input[type="file"]'
            )
            .forEach(input => {

                input.addEventListener(
                    "change",
                    async evento => {

                        const categoria =
                            evento.target.dataset.categoria;

                        const archivos =
                            Array.from(
                                evento.target.files || []
                            );

                        if (!archivos.length) {
                            return;
                        }

                        const campoSello =
                            document.getElementById(
                                "selloLlegadaPasoEvidencias"
                            );

                        if (campoSello) {

                            this.selloLlegada =
                                String(
                                    campoSello.value || ""
                                ).trim();

                        }

                        try {

                            await this.subirArchivosEvidenciaCategoria(
                                categoria,
                                archivos
                            );

                        } catch (error) {

                            delete this.evidenciasCargando[
                                categoria
                            ];

                            this.mostrarPasoEvidencias();

                            if (
                                window.Despachos &&
                                typeof Despachos.notificar ===
                                    "function"
                            ) {

                                Despachos.notificar(
                                    error.message ||
                                    "No fue posible guardar la evidencia.",
                                    "error"
                                );

                            }

                        }

                    }
                );

            });
			
			        document
            .querySelectorAll(
                ".btn-subir-evidencia-local"
            )
            .forEach(
                boton => {

                    boton.addEventListener(
                        "click",
                        async () => {

                            const categoria =
                                boton.dataset.categoria;

                            const contenidoOriginal =
                                boton.innerHTML;

                            try {

                                boton.disabled =
                                    true;

                                boton.innerHTML = `
                                    <i class="fa-solid fa-spinner fa-spin"></i>
                                    Subiendo...
                                `;

                                await this.subirEvidenciaLocalCategoria(
                                    categoria
                                );

                                this.mostrarPasoEvidencias();

                                if (
                                    window.Despachos &&
                                    typeof Despachos.notificar ===
                                        "function"
                                ) {

                                    Despachos.notificar(
                                        "La evidencia local fue subida correctamente.",
                                        "exito"
                                    );

                                }

                            } catch (error) {

                                console.error(
                                    "Error subiendo evidencia local:",
                                    error
                                );

                                boton.disabled =
                                    false;

                                boton.innerHTML =
                                    contenidoOriginal;

                                if (
                                    window.Despachos &&
                                    typeof Despachos.notificar ===
                                        "function"
                                ) {

                                    Despachos.notificar(
                                        error.message ||
                                        "No fue posible subir la evidencia local.",
                                        "error"
                                    );

                                }

                            }

                        }
                    );

                }
            );


        document
            .querySelectorAll(
                ".btn-eliminar-evidencia-local"
            )
            .forEach(
                boton => {

                    boton.addEventListener(
                        "click",
                        async () => {

                            const categoria =
                                boton.dataset.categoria;

                            try {

                                boton.disabled =
                                    true;

                                await this.eliminarEvidenciaLocalCategoria(
                                    categoria
                                );

                                this.mostrarPasoEvidencias();

                                if (
                                    window.Despachos &&
                                    typeof Despachos.notificar ===
                                        "function"
                                ) {

                                    Despachos.notificar(
                                        "La fotografía local fue eliminada.",
                                        "advertencia"
                                    );

                                }

                            } catch (error) {

                                console.error(
                                    "Error eliminando evidencia local:",
                                    error
                                );

                                boton.disabled =
                                    false;

                                if (
                                    window.Despachos &&
                                    typeof Despachos.notificar ===
                                        "function"
                                ) {

                                    Despachos.notificar(
                                        error.message ||
                                        "No fue posible eliminar la fotografía local.",
                                        "error"
                                    );

                                }

                            }

                        }
                    );

                }
            );

        document
            .querySelectorAll(
                ".btn-eliminar-evidencia"
            )
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    async () => {

                        boton.disabled = true;

                        const campoSello =
                            document.getElementById(
                                "selloLlegadaPasoEvidencias"
                            );

                        if (campoSello) {

                            this.selloLlegada =
                                String(
                                    campoSello.value || ""
                                ).trim();

                        }

                        try {

                            await this.eliminarEvidenciaInspeccion(
                                boton.dataset.categoria,
                                Number(
                                    boton.dataset.indice
                                )
                            );

                            this.mostrarPasoEvidencias();

                            if (
                                window.Despachos &&
                                typeof Despachos.notificar ===
                                    "function"
                            ) {

                                Despachos.notificar(
                                    "Evidencia eliminada correctamente.",
                                    "exito"
                                );

                            }

                        } catch (error) {

                            boton.disabled = false;

                            if (
                                window.Despachos &&
                                typeof Despachos.notificar ===
                                    "function"
                            ) {

                                Despachos.notificar(
                                    error.message ||
                                    "No fue posible eliminar la evidencia.",
                                    "error"
                                );

                            }

                        }

                    }
                );

            });

        const btnVolver =
            document.getElementById(
                "btnVolverPasoBASC"
            );

        if (btnVolver) {

            btnVolver.addEventListener(
                "click",
                () => {

                    const campoSello =
                        document.getElementById(
                            "selloLlegadaPasoEvidencias"
                        );

                    if (campoSello) {

                        this.selloLlegada =
                            String(
                                campoSello.value || ""
                            ).trim();

                    }

                    this.pasoActual = 2;
                    this.mostrarPasoBASC();

                }
            );

        }

        const btnContinuar =
            document.getElementById(
                "btnContinuarFinalizarInspeccion"
            );

        if (btnContinuar) {

            btnContinuar.addEventListener(
                "click",
                async () => {

                    this.selloLlegada =
                        String(
                            document
                                .getElementById(
                                    "selloLlegadaPasoEvidencias"
                                )
                                ?.value || ""
                        ).trim();

                    btnContinuar.disabled = true;

                    try {

                        await this.cargarEvidenciasGuardadas();

                        if (
                            !this.validarEvidenciasPorCategoria()
                        ) {
                            return;
                        }

                        this.pasoActual = 4;
                        this.mostrarPasoFinalizar();

                    } finally {

                        if (
                            document.body.contains(
                                btnContinuar
                            )
                        ) {

                            btnContinuar.disabled = false;

                        }

                    }

                }
            );

        }

    },

       validarEvidenciasPorCategoria() {

        const grupos =
            this.agruparCatalogoBASC();

        const categorias =
            this.obtenerCategoriasOrdenadasBASC(
                grupos
            );

        const pendientes =
            categorias.filter(categoria => {

                const archivos =
                    this.evidenciasPorCategoria[
                        categoria
                    ];

                return (
                    !Array.isArray(archivos) ||
                    archivos.length === 0
                );

            });

        if (pendientes.length > 0) {

            const primeraPendiente =
                document.querySelector(
                    `.tarjeta-evidencia-categoria[data-categoria="${pendientes[0]}"]`
                );

            if (primeraPendiente) {

                primeraPendiente.classList.add(
                    "evidencia-error"
                );

                primeraPendiente.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    `Falta evidencia en ${pendientes.length} zona(s) de inspección.`,
                    "error"
                );

            }

            return false;

        }

        const categoriaSello =
            "Sello de llegada";

        const tarjetaSello =
            document.querySelector(
                `.tarjeta-evidencia-categoria[data-categoria="${categoriaSello}"]`
            );

        const campoSello =
            document.getElementById(
                "selloLlegadaPasoEvidencias"
            );

        this.selloLlegada =
            String(
                campoSello?.value ||
                this.selloLlegada ||
                ""
            ).trim();

        if (!this.selloLlegada) {

            if (tarjetaSello) {

                tarjetaSello.classList.add(
                    "evidencia-error"
                );

                tarjetaSello.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

            if (campoSello) {
                campoSello.focus();
            }

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    "Debe registrar el número del sello de llegada.",
                    "error"
                );

            }

            return false;

        }

        const evidenciasSello =
            this.evidenciasPorCategoria[
                categoriaSello
            ];

        if (
            !Array.isArray(evidenciasSello) ||
            evidenciasSello.length === 0
        ) {

            if (tarjetaSello) {

                tarjetaSello.classList.add(
                    "evidencia-error"
                );

                tarjetaSello.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

            if (
                window.Despachos &&
                typeof Despachos.notificar ===
                    "function"
            ) {

                Despachos.notificar(
                    "Debe registrar la evidencia fotográfica del sello de llegada.",
                    "error"
                );

            }

            return false;

        }

        return true;

    },




    obtenerResumenFinalInspeccion() {

        let cumple = 0;
        let noCumple = 0;
        let noAplica = 0;

        this.catalogo.forEach(punto => {

            const respuesta =
                this.respuestasBASC[
                    String(
                        punto.codigo || ""
                    ).trim()
                ] || {};

            if (respuesta.estado === "Cumple") cumple++;
            if (respuesta.estado === "No cumple") noCumple++;
            if (respuesta.estado === "No aplica") noAplica++;

        });

        const totalEvidencias =
            Object.values(
                this.evidenciasPorCategoria
            ).reduce(
                (total, evidencias) =>
                    total +
                    (
                        Array.isArray(evidencias)
                            ? evidencias.length
                            : 0
                    ),
                0
            );

        return {
            total: this.catalogo.length,
            cumple: cumple,
            noCumple: noCumple,
            noAplica: noAplica,
            totalEvidencias: totalEvidencias,
            resultado:
                noCumple > 0
                    ? "Con hallazgos"
                    : "Conforme"
        };

    },


    obtenerSelloLlegadaSugerido() {

        const despacho =
            this.datosConduce?.despacho || {};

        const sellos =
            Array.isArray(
                this.datosConduce?.sellos
            )
                ? this.datosConduce.sellos
                : [];

        const cantidadDestinos =
            Number(
                despacho.cantidadDestinos || 1
            );

        const ordenLlegada =
            cantidadDestinos === 2
                ? 2
                : 1;

        const selloLlegada =
            sellos.find(item =>
                Number(item.orden || 0) ===
                    ordenLlegada
            ) || {};

        return String(
            selloLlegada.numero ||
            (
                ordenLlegada === 2
                    ? despacho.precinto2
                    : despacho.precinto1
            ) ||
            ""
        ).trim();

    },


    mostrarPasoFinalizar() {

        const contenidoModal =
            document.getElementById(
                "contenidoModal"
            );

        if (!contenidoModal) return;

        const resumen =
            this.obtenerResumenFinalInspeccion();

        const despacho =
            this.datosConduce?.despacho || {};

        const contenedor =
            this.datosConduce?.contenedor || {};

        const chofer =
            this.datosConduce?.chofer || {};

        const sellos =
            Array.isArray(
                this.datosConduce?.sellos
            )
                ? this.datosConduce.sellos
                : [];

        const selloDestino1 =
            sellos.find(item =>
                Number(item.orden || 0) === 1
            ) || {};

        const selloDestino2 =
            sellos.find(item =>
                Number(item.orden || 0) === 2
            ) || {};

        const inspector =
            this.obtenerInspectorActual();

                const selloLlegadaSugerido =
            String(
                this.selloLlegada ||
                this.obtenerSelloLlegadaSugerido() ||
                ""
            ).trim();

        contenidoModal.innerHTML = `
            <section class="asistente-inspeccion">
			
                <div class="inspeccion-pasos">
                    <div class="paso-inspeccion completado">1. Información</div>
                    <div class="paso-inspeccion completado">2. Inspección BASC</div>
                    <div class="paso-inspeccion completado">3. Evidencias</div>
                    <div class="paso-inspeccion activo">4. Finalizar</div>
                </div>

                <div class="inspeccion-encabezado">
                    <div>
                        <h2>Finalizar inspección</h2>
                        <p>Revise el resumen antes de cerrar y generar el documento oficial.</p>
                    </div>
                    <span class="estado-inspeccion">Revisión final</span>
                </div>

                ${this.crearFichaDocumentalInspeccion("Revisión final")}

                <div class="resumen-final-inspeccion">
                    <article class="tarjeta-resumen-final">
                        <span>Total de puntos</span>
                        <strong>${resumen.total}</strong>
                    </article>
                    <article class="tarjeta-resumen-final resumen-cumple">
                        <span>Cumple</span>
                        <strong>${resumen.cumple}</strong>
                    </article>
                    <article class="tarjeta-resumen-final resumen-no-cumple">
                        <span>No cumple</span>
                        <strong>${resumen.noCumple}</strong>
                    </article>
                    <article class="tarjeta-resumen-final">
                        <span>No aplica</span>
                        <strong>${resumen.noAplica}</strong>
                    </article>
                    <article class="tarjeta-resumen-final">
                        <span>Evidencias activas</span>
                        <strong>${resumen.totalEvidencias}</strong>
                    </article>
                    <article class="tarjeta-resumen-final">
                        <span>Resultado preliminar</span>
                        <strong>${resumen.resultado}</strong>
                    </article>
                </div>

                <div class="grid-final-inspeccion">

                    <div class="tarjeta-inspeccion">

                        <h3>Datos del despacho</h3>

                        <div class="fila-dato-inspeccion">
                            <span>Puerto de salida</span>
                            <strong>${this.datosConduce?.empresaOrigen || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Conduce</span>
                            <strong>${despacho.noConduce || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Destino 1</span>
                            <strong>${despacho.destino1 || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Destino 2</span>
                            <strong>${despacho.destino2 || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Supervisor</span>
                            <strong>${despacho.supervisor || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Chofer</span>
                            <strong>${chofer.nombre || despacho.chofer || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Inspector</span>
                            <strong>${inspector.nombre || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Cantidad de destinos</span>
                            <strong>${Number(despacho.cantidadDestinos || 1)}</strong>
                        </div>

                    </div>

                    <div class="tarjeta-inspeccion">

                        <h3>Contenedor</h3>

                        <div class="fila-dato-inspeccion">
                            <span>Identificación</span>
                            <strong>${contenedor.identificacion || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Tipo</span>
                            <strong>${contenedor.tipo || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Tamaño</span>
                            <strong>${this.formatearTamanoContenedor(contenedor.tamano)}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Chasis sugerido</span>
                            <strong>${chofer.chasisPorDefecto || "-"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Transporte</span>
                            <strong>${this.datosConduce?.tipoTransporte || "Terrestre"}</strong>
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>Sello destino 1</span>
                            <strong>${selloDestino1.numero || despacho.precinto1 || "-"}</strong>
                        </div>

                        ${
                            Number(
                                despacho.cantidadDestinos || 1
                            ) === 2
                                ? `
                                    <div class="fila-dato-inspeccion">
                                        <span>Sello destino 2</span>
                                        <strong>${selloDestino2.numero || despacho.precinto2 || "-"}</strong>
                                    </div>
                                `
                                : ""
                        }

                        <div class="campo-inspeccion campo-completo">
                            <label for="selloLlegadaInspeccion">
                                Sello de llegada
                            </label>

                            <input
                                type="text"
                                id="selloLlegadaInspeccion"
                                value="${selloLlegadaSugerido}"
                                placeholder="Registre el sello verificado a la llegada"
                                autocomplete="off"
                            >
                        </div>

                        <div class="fila-dato-inspeccion">
                            <span>ID de inspección</span>
                            <strong>${this.idInspeccion || "-"}</strong>
                        </div>

                    </div>

                </div>

                <div class="tarjeta-inspeccion observaciones-finales-inspeccion">

                    <h3>Observaciones generales</h3>

                    <div class="campo-inspeccion campo-completo">
                        <label for="observacionesFinalesInspeccion">
                            Comentario de cierre
                        </label>

                        <textarea
                            id="observacionesFinalesInspeccion"
                            rows="5"
                            placeholder="Agregue una observación general si corresponde..."
                        ></textarea>
                    </div>

                </div>

                <div class="aviso-final-inspeccion">
                    <i class="fa-solid fa-file-pdf"></i>
                    <div>
                        <strong>Al finalizar se generará el PDF oficial.</strong>
                        <p>
                            La inspección quedará marcada como completada y el documento se guardará junto a sus evidencias.
                        </p>
                    </div>
                </div>

                <div class="acciones-inspeccion">
                    <button
                        type="button"
                        id="btnVolverEvidenciasInspeccion"
                        class="btn-secundario-inspeccion"
                    >
                        <i class="fa-solid fa-arrow-left"></i>
                        Volver a evidencias
                    </button>

                    <button
                        type="button"
                        id="btnFinalizarInspeccion"
                        class="btn-iniciar-inspeccion"
                    >
                        <i class="fa-solid fa-circle-check"></i>
                        Finalizar y generar PDF
                    </button>
                </div>

            </section>
        `;

        this.configurarEventosPasoFinalizar();

    },


    configurarEventosPasoFinalizar() {

        const btnVolver =
            document.getElementById(
                "btnVolverEvidenciasInspeccion"
            );

        const btnFinalizar =
            document.getElementById(
                "btnFinalizarInspeccion"
            );

        if (btnVolver) {

            btnVolver.addEventListener(
                "click",
                () => {

                    this.pasoActual = 3;
                    this.mostrarPasoEvidencias();

                }
            );

        }

        if (btnFinalizar) {

            btnFinalizar.addEventListener(
                "click",
                async () => {

                    await this.finalizarInspeccion(
                        btnFinalizar
                    );

                }
            );

        }

    },


    async obtenerLogoDashboardBase64() {

        const selectores = [
            'img[src*="logo_dashboard"]',
            '#logoDashboard',
            '.logo-dashboard img',
            '.sidebar-logo img',
            '.dashboard-logo img',
            'header img[src*="logo"]'
        ];

        let imagen = null;

        for (const selector of selectores) {

            imagen =
                document.querySelector(
                    selector
                );

            if (imagen) {
                break;
            }

        }

        if (!imagen) {
            return "";
        }

        try {

            if (!imagen.complete) {

                await new Promise(resolve => {

                    imagen.addEventListener(
                        "load",
                        resolve,
                        {
                            once: true
                        }
                    );

                    setTimeout(
                        resolve,
                        1500
                    );

                });

            }

            const ancho =
                imagen.naturalWidth ||
                imagen.width;

            const alto =
                imagen.naturalHeight ||
                imagen.height;

            if (!ancho || !alto) {
                return "";
            }

            const canvas =
                document.createElement(
                    "canvas"
                );

            canvas.width = ancho;
            canvas.height = alto;

            const contexto =
                canvas.getContext(
                    "2d"
                );

            contexto.drawImage(
                imagen,
                0,
                0,
                ancho,
                alto
            );

            return canvas.toDataURL(
                "image/png"
            );

        } catch (errorCanvas) {

            console.warn(
                "No fue posible convertir el logo del dashboard mediante canvas:",
                errorCanvas
            );

        }

        try {

            const respuesta =
                await fetch(
                    imagen.currentSrc ||
                    imagen.src
                );

            if (!respuesta.ok) {
                return "";
            }

            const blob =
                await respuesta.blob();

            return await new Promise(
                (resolve, reject) => {

                    const lector =
                        new FileReader();

                    lector.onload = () =>
                        resolve(
                            String(
                                lector.result || ""
                            )
                        );

                    lector.onerror =
                        reject;

                    lector.readAsDataURL(
                        blob
                    );

                }
            );

        } catch (errorFetch) {

            console.warn(
                "No fue posible leer el logo del dashboard:",
                errorFetch
            );

            return "";

        }

    },


    async finalizarInspeccion(
        boton
    ) {

        const observaciones =
            String(
                document
                    .getElementById(
                        "observacionesFinalesInspeccion"
                    )
                    ?.value || ""
            ).trim();

        const selloLlegada =
            String(
                document
                    .getElementById(
                        "selloLlegadaInspeccion"
                    )
                    ?.value || ""
            ).trim();

        if (!selloLlegada) {

            if (window.Despachos?.notificar) {
                Despachos.notificar(
                    "Debe registrar el sello de llegada antes de finalizar.",
                    "error"
                );
            }

            document
                .getElementById(
                    "selloLlegadaInspeccion"
                )
                ?.focus();

            return;

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
                    Generando documento...
                `;
            }

            await this.cargarEvidenciasGuardadas();

            if (!this.validarEvidenciasPorCategoria()) {
                throw new Error(
                    "Todas las zonas deben conservar al menos una evidencia activa."
                );
            }

            const logoEmpresaBase64 =
                await this
                    .obtenerLogoDashboardBase64();

            const respuesta =
                await API.post({
                    action:
                        "finalizarInspeccionContenedor",
                    idInspeccion:
                        this.idInspeccion,
                    observacionesGenerales:
                        observaciones,
                    selloLlegada:
                        selloLlegada,
                    usuario:
                        inspector.nombre,
                    logoEmpresaBase64:
                        logoEmpresaBase64
                });

            if (!respuesta || !respuesta.ok) {
                throw new Error(
                    respuesta?.mensaje ||
                    "No fue posible finalizar la inspección."
                );
            }

            this.mostrarInspeccionFinalizada(
                respuesta.data || {}
            );

            if (window.Despachos?.notificar) {
                Despachos.notificar(
                    "Inspección finalizada y PDF generado correctamente.",
                    "exito"
                );
            }

        } catch (error) {

            console.error(
                "Error finalizando inspección:",
                error
            );

            if (window.Despachos?.notificar) {
                Despachos.notificar(
                    error.message ||
                    "No fue posible finalizar la inspección.",
                    "error"
                );
            }

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


    mostrarInspeccionFinalizada(
        datos
    ) {

        const contenidoModal =
            document.getElementById(
                "contenidoModal"
            );

        if (!contenidoModal) return;

        const pdfUrl =
            String(
                datos.pdfUrl ||
                datos.PDF_URL ||
                ""
            ).trim();

        contenidoModal.innerHTML = `
            <section class="asistente-inspeccion">

                <div class="resultado-final-inspeccion">

                    <div class="resultado-final-inspeccion__icono">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>

                    <span>Inspección completada</span>

                    <h2>El registro fue cerrado correctamente</h2>

                    <p>
                        El PDF oficial quedó guardado junto a las evidencias de la inspección.
                    </p>

                    <div class="resultado-final-inspeccion__datos">
                        <div>
                            <span>ID de inspección</span>
                            <strong>${this.idInspeccion || "-"}</strong>
                        </div>

                        <div>
                            <span>Resultado</span>
                            <strong>${datos.resultado || "-"}</strong>
                        </div>

                        <div>
                            <span>Total de evidencias</span>
                            <strong>${datos.totalEvidencias || 0}</strong>
                        </div>
                    </div>

                    <div class="acciones-inspeccion acciones-finalizadas">

                        ${
                            pdfUrl
                                ? `
                                    <a
                                        href="${pdfUrl}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="btn-secundario-inspeccion enlace-boton-inspeccion"
                                    >
                                        <i class="fa-solid fa-file-pdf"></i>
                                        Abrir PDF
                                    </a>

                                    <button
                                        type="button"
                                        id="btnImprimirPDFInspeccion"
                                        class="btn-secundario-inspeccion"
                                        data-url="${pdfUrl}"
                                    >
                                        <i class="fa-solid fa-print"></i>
                                        Imprimir
                                    </button>
                                `
                                : ""
                        }

                        <button
                            type="button"
                            id="btnCerrarInspeccionFinalizada"
                            class="btn-iniciar-inspeccion"
                        >
                            Cerrar
                        </button>
                    </div>

                </div>

            </section>
        `;

        document
            .getElementById(
                "btnImprimirPDFInspeccion"
            )
            ?.addEventListener(
                "click",
                evento => {

                    const url =
                        evento.currentTarget
                            .dataset.url;

                    if (url) {
                        window.open(
                            url,
                            "_blank",
                            "noopener"
                        );
                    }

                }
            );

        document
            .getElementById(
                "btnCerrarInspeccionFinalizada"
            )
            ?.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "modalSistema"
                        )
                        ?.classList.add(
                            "oculto"
                        );

                }
            );

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
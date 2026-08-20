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
    cargandoDesempeno: false,
    graficoDesempeno: null,


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
        await this.actualizarDesempenoRecepciones();
        await this.actualizarAvisosInicio();

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

        const puedeGestionarAsistencia =
            window.AsistenciaPersonal &&
            typeof AsistenciaPersonal.puedeGestionar === "function" &&
            AsistenciaPersonal.puedeGestionar();


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
                        <div class="inicio-card-encabezado">
                            <div class="inicio-card-icono"><i class="fa-solid fa-bullhorn"></i></div>
                            <div>
                                <span class="inicio-card-etiqueta">Comunicación</span>
                                <h3>Avisos</h3>
                            </div>
                        </div>
                        <p>Los avisos generales y por rol aparecerán en este espacio.</p>

                        <button
                            type="button"
                            class="inicio-card-boton secundario"
                            id="btnVerAvisosInicio"
                        >
                            <i class="fa-regular fa-eye"></i>
                            Ver avisos
                        </button>
                    </article>

                    ${this.construirTarjetasDesempenoInicio(rol)}


                    ${
                        puedeHorasExtras
                            ? `
                                <article class="inicio-card inicio-card-horas-extra">
                                    <div class="inicio-card-encabezado">
                                      <div class="inicio-card-icono"><i class="fa-solid fa-clock"></i></div>
                                      <div>
                                        <span class="inicio-card-etiqueta">
                                            Jornada adicional
                                        </span>
                                        <h3>Horas extras</h3>
                                      </div>
                                    </div>
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
                                    <div class="inicio-card-encabezado">
                                      <div class="inicio-card-icono"><i class="fa-solid fa-helmet-safety"></i></div>
                                      <div>
                                        <span class="inicio-card-etiqueta">
                                            Seguridad personal
                                        </span>
                                        <h3>EPP</h3>
                                      </div>
                                    </div>
                                    <p>
                                            ${
                                                puedeGestionarEPP
                                                    ? "Consulte solicitudes pendientes y entregas."
                                                    : "Solicite reemplazo y consulte su historial de EPP."
                                            }
                                    </p>

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

                    ${
                        puedeGestionarAsistencia
                            ? `
                                <article class="inicio-card inicio-card-asistencia">
                                    ${
                                        AsistenciaPersonal.puedeGestionar()
                                            ? `<button type="button" class="inicio-personal-extra" id="btnTrabajoExtraInicio">
                                                <i class="fa-solid fa-clock"></i> ${AsistenciaPersonal.puedeCrearExtras() ? "Registrar trab. extra" : "Asignar trab. extra"}
                                               </button>`
                                            : ""
                                    }
                                    <div class="inicio-card-encabezado">
                                        <div class="inicio-card-icono"><i class="fa-solid fa-user-check"></i></div>
                                        <div><span class="inicio-card-etiqueta">Centro operativo</span><h3>Gestión del personal</h3></div>
                                    </div>
                                    <p>Registre asistencia, vacaciones, beneficios y novedades disciplinarias.</p>
                                    <div class="inicio-personal-accesos">
                                        <button type="button" id="btnAsistenciaInicio"><i class="fa-solid fa-calendar-check"></i> Asistencia</button>
                                        <button type="button" id="btnVacacionesInicio"><i class="fa-solid fa-umbrella-beach"></i> Vacaciones</button>
                                        <button type="button" id="btnBonoInicio"><i class="fa-solid fa-face-smile"></i> Bono</button>
                                        <button type="button" id="btnAmonestacionInicio"><i class="fa-solid fa-file-signature"></i> Amonestación</button>
                                    </div>
                                </article>`
                            : ""
                    }

                </div>

            </section>
        `;

    },


    async actualizarAvisosInicio() {
        if (!window.AsistenciaPersonal || typeof AsistenciaPersonal.cargarAvisos !== "function") return;
        const datos = await AsistenciaPersonal.cargarAvisos();
        const total = Number(datos && datos.total || 0);
        const boton = document.getElementById("btnVerAvisosInicio");
        if (boton && total > 0) boton.innerHTML = `<i class="fa-solid fa-bell"></i> Ver avisos (${total})`;
        if (total > 0 && !sessionStorage.getItem("avisosAsistenciaMostrados")) {
            sessionStorage.setItem("avisosAsistenciaMostrados","SI");
            await AsistenciaPersonal.abrirAvisos();
        }
    },


    construirTarjetasDesempenoInicio(rol) {
        const tipo = this.tipoPanelDesempeno(rol);
        if (tipo === "OCULTO") return "";

        if (tipo === "PERSONAL") {
            return `
                <article class="inicio-card inicio-card-desempeno inicio-card-desempeno-personal">
                    <div class="inicio-card-encabezado">
                        <div class="inicio-card-icono"><i class="fa-solid fa-chart-line"></i></div>
                        <div><span class="inicio-card-etiqueta">Mi rendimiento</span><h3>Desempeño mensual</h3></div>
                    </div>
                    <p>Actividad registrada a su nombre en recepciones finalizadas.</p>
                    <div id="desempenoRecepcionesInicio" class="inicio-desempeno-cargando"><i class="fa-solid fa-spinner fa-spin"></i> Consultando actividad...</div>
                </article>`;
        }

        return `
            <article class="inicio-card inicio-card-supervisores">
                <div class="inicio-card-encabezado">
                    <div class="inicio-card-icono"><i class="fa-solid fa-chart-line"></i></div>
                    <div><span class="inicio-card-etiqueta">Rendimiento operativo</span><h3>Supervisores</h3></div>
                </div>
                <p>Despachos completados y exactitud del período.</p>
                <div id="desempenoRecepcionesInicio" class="inicio-desempeno-cargando"><i class="fa-solid fa-spinner fa-spin"></i> Consultando supervisores...</div>
            </article>
            <article class="inicio-card inicio-card-auxiliares">
                <div class="inicio-card-encabezado">
                    <div class="inicio-card-icono"><i class="fa-solid fa-users"></i></div>
                    <div><span class="inicio-card-etiqueta">Rendimiento operativo</span><h3>Colaboradores destacados</h3></div>
                </div>
                <p>Auxiliares con mayor actividad en recepciones finalizadas.</p>
                <div id="desempenoAuxiliaresInicio" class="inicio-desempeno-cargando"><i class="fa-solid fa-spinner fa-spin"></i> Consultando colaboradores...</div>
            </article>`;
    },


    async actualizarDesempenoRecepciones() {

        if (this.cargandoDesempeno) return;

        const contenedor = document.getElementById("desempenoRecepcionesInicio");
        if (!contenedor || !window.API || typeof API.post !== "function") return;

        const sesion = Sistema.obtenerSesion() || {};
        const tipoPanel = this.tipoPanelDesempeno(sesion.rol);
        if (tipoPanel === "OCULTO") return;

        this.cargandoDesempeno = true;
        CargadorSistema.mostrar(
            tipoPanel === "PERSONAL" ? "Cargando su desempeño" : "Cargando desempeño operativo",
            tipoPanel === "PERSONAL"
                ? "Consultando las recepciones finalizadas a su nombre."
                : "Consultando el desempeño de supervisores y colaboradores."
        );

        try {
            const respuesta = await API.post(
                tipoPanel === "PERSONAL"
                    ? {action:"obtenerDesempenoRecepcionesUsuario"}
                    : {action:"obtenerPanelDesempenoOperativo",periodo:this.periodoDesempeno || "MES"}
            );

            if (!respuesta || respuesta.ok !== true) {
                throw new Error(
                    respuesta && respuesta.mensaje
                        ? respuesta.mensaje
                        : "No fue posible consultar su desempeño."
                );
            }

            if (tipoPanel === "PERSONAL") {
                this.renderDesempenoRecepciones(respuesta.data || {});
            } else {
                this.renderPanelDesempenoOperativo(respuesta.data || {});
            }
        } catch (error) {
            contenedor.innerHTML = `
                <div class="inicio-desempeno-vacio">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span>${this.escapar(error.message || "No fue posible cargar el desempeño.")}</span>
                </div>`;
        } finally {
            this.cargandoDesempeno = false;
            CargadorSistema.ocultar();
        }

    },


    tipoPanelDesempeno(rol) {
        const clave = String(rol || "").trim().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (clave.includes("ANALISTA")) return "OCULTO";
        if (clave.includes("ADMINISTRADOR") || clave.includes("ENCARGADO") || clave.includes("SUPERVISOR")) return "OPERATIVO";
        if (clave.includes("AUXILIAR") || clave.includes("MONTACARGUISTA")) return "PERSONAL";
        return "OCULTO";
    },


    renderPanelDesempenoOperativo(datos) {
        const contenedor = document.getElementById("desempenoRecepcionesInicio");
        const contenedorAuxiliares = document.getElementById("desempenoAuxiliaresInicio");
        if (!contenedor) return;
        const supervisores = Array.isArray(datos.supervisores) ? datos.supervisores : [];
        const auxiliares = Array.isArray(datos.auxiliares) ? datos.auxiliares : [];
        const gerencia = datos.alcance === "GERENCIA";

        contenedor.innerHTML = `
            <section class="inicio-rendimiento-supervisores">
                <div class="inicio-rendimiento-cabecera">
                    <div><strong>Desempeño de supervisores</strong><span>Despachos completados y exactitud por unidades.</span></div>
                    <div class="inicio-rendimiento-periodo">
                        <button type="button" data-periodo="SEMANA" class="${datos.periodo === "SEMANA" ? "activo" : ""}">Semana</button>
                        <button type="button" data-periodo="MES" class="${datos.periodo !== "SEMANA" ? "activo" : ""}">Mes</button>
                    </div>
                </div>
                ${supervisores.length
                    ? `<div class="inicio-rendimiento-grafica"><canvas id="graficaSupervisoresInicio"></canvas></div>`
                    : `<div class="inicio-desempeno-vacio">No hay despachos completados en este período.</div>`}
            </section>`;

        if (contenedorAuxiliares) {
            contenedorAuxiliares.innerHTML = gerencia ? `
                <section class="inicio-rendimiento-auxiliares">
                    <div class="inicio-rendimiento-cabecera">
                        <div><strong>Auxiliares destacados</strong><span>Recepciones finalizadas durante el período.</span></div>
                        <button type="button" id="btnVerTodosAuxiliares" class="inicio-rendimiento-ver-todos">Ver todos</button>
                    </div>
                    <div class="inicio-auxiliares-destacados">
                        ${auxiliares.slice(0,3).map((item, indice) => `
                            <article><span class="inicio-auxiliar-posicion">#${indice + 1}</span><strong>${this.escapar(item.nombre)}</strong>
                            <small>${this.formatearNumeroDesempeno(item.tarimas)} tarimas · ${this.formatearNumeroDesempeno(item.unidades)} cajas/cubos · ${this.formatearNumeroDesempeno(item.recepciones)} recepciones</small></article>`).join("") || "<p class='inicio-desempeno-vacio'>Aún no hay actividad registrada.</p>"}
                    </div>
                </section>` : `<div class="inicio-desempeno-vacio">La comparación de auxiliares está disponible para Encargados y Administradores.</div>`;
        }

        contenedor.querySelectorAll("[data-periodo]").forEach(boton => {
            boton.addEventListener("click", async () => {
                this.periodoDesempeno = boton.dataset.periodo;
                await this.actualizarDesempenoRecepciones();
            });
        });
        const verTodos = document.getElementById("btnVerTodosAuxiliares");
        if (verTodos) verTodos.addEventListener("click", () => this.abrirTodosAuxiliares(auxiliares, datos.periodo));
        this.graficarSupervisores(supervisores);
    },


    graficarSupervisores(supervisores) {
        if (this.graficoDesempeno && typeof this.graficoDesempeno.destroy === "function") this.graficoDesempeno.destroy();
        const lienzo = document.getElementById("graficaSupervisoresInicio");
        if (!lienzo || typeof Chart === "undefined") return;
        this.graficoDesempeno = new Chart(lienzo, {
            data:{labels:supervisores.map(item => item.nombre),datasets:[
                {type:"bar",label:"Despachos",data:supervisores.map(item => Number(item.despachos || 0)),backgroundColor:"#ed1b2fcc",borderRadius:5,yAxisID:"y"},
                {type:"line",label:"Exactitud %",data:supervisores.map(item => Number(item.tasaExactitud || 0)),borderColor:"#1976d2",backgroundColor:"#1976d2",tension:.25,pointRadius:3,yAxisID:"y1"}
            ]},
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{boxWidth:8,font:{size:9}}}},scales:{
                x:{grid:{display:false},ticks:{font:{size:8}}},
                y:{beginAtZero:true,position:"left",ticks:{precision:0,font:{size:8}},grid:{color:"#eef0f3"}},
                y1:{beginAtZero:true,max:100,position:"right",ticks:{callback:v => v + "%",font:{size:8}},grid:{display:false}}
            }}
        });
    },


    abrirTodosAuxiliares(auxiliares, periodo) {
        const anterior = document.getElementById("modalRendimientoAuxiliares");
        if (anterior) anterior.remove();
        const modal = document.createElement("div");
        modal.id = "modalRendimientoAuxiliares";
        modal.className = "inicio-modal-rendimiento";
        modal.innerHTML = `<div class="inicio-modal-rendimiento-ventana">
            <header><div><span>Rendimiento operativo</span><h3>Todos los auxiliares · ${periodo === "SEMANA" ? "Semana" : "Mes"}</h3></div><button type="button" data-cerrar>&times;</button></header>
            <div class="inicio-modal-rendimiento-lista">
                ${auxiliares.map((item, indice) => `<article><b>#${indice + 1}</b><div><strong>${this.escapar(item.nombre)}</strong><small>${this.escapar(item.idEmpleado || "")}</small></div><span>${this.formatearNumeroDesempeno(item.tarimas)} tarimas</span><span>${this.formatearNumeroDesempeno(item.unidades)} cajas/cubos</span><span>${this.formatearNumeroDesempeno(item.recepciones)} recepciones</span></article>`).join("") || "<p>No hay auxiliares con actividad en el período.</p>"}
            </div></div>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-cerrar]").addEventListener("click", () => modal.remove());
        modal.addEventListener("click", evento => { if (evento.target === modal) modal.remove(); });
    },


    renderDesempenoRecepciones(datos) {

        const contenedor = document.getElementById("desempenoRecepcionesInicio");
        if (!contenedor) return;

        const resumen = datos.resumen || {};
        const evolucion = Array.isArray(datos.evolucion) ? datos.evolucion : [];

        contenedor.innerHTML = `
            <div class="inicio-desempeno-metricas">
                <div><span>Tarimas</span><strong>${this.formatearNumeroDesempeno(resumen.tarimas)}</strong></div>
                <div><span>Cajas/cubos</span><strong>${this.formatearNumeroDesempeno(resumen.unidades)}</strong></div>
                <div><span>Recepciones</span><strong>${this.formatearNumeroDesempeno(resumen.recepciones)}</strong></div>
                <div><span>Posiciones</span><strong>${this.formatearNumeroDesempeno(resumen.posiciones)}</strong></div>
            </div>
            <div class="inicio-desempeno-grafica">
                <canvas id="graficaDesempenoRecepcionesInicio"></canvas>
            </div>
            <small class="inicio-desempeno-nota">
                Las tareas colaborativas se incorporarán cuando el Centro de Avisos registre participantes.
            </small>`;

        if (this.graficoDesempeno && typeof this.graficoDesempeno.destroy === "function") {
            this.graficoDesempeno.destroy();
        }

        const lienzo = document.getElementById("graficaDesempenoRecepcionesInicio");
        if (!lienzo || typeof Chart === "undefined") return;

        this.graficoDesempeno = new Chart(lienzo, {
            type:"line",
            data:{
                labels:evolucion.map(item => item.etiqueta || item.clave),
                datasets:[
                    {
                        label:"Tarimas",
                        data:evolucion.map(item => Number(item.tarimas || 0)),
                        borderColor:"#ed1b2f",
                        backgroundColor:"#ed1b2f18",
                        tension:.32,
                        borderWidth:2,
                        pointRadius:2,
                        yAxisID:"y"
                    },
                    {
                        label:"Cajas/cubos",
                        data:evolucion.map(item => Number(item.unidades || 0)),
                        borderColor:"#1976d2",
                        backgroundColor:"#1976d218",
                        tension:.32,
                        borderWidth:2,
                        pointRadius:2,
                        yAxisID:"y1"
                    }
                ]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                plugins:{legend:{display:true,position:"bottom",labels:{boxWidth:8,font:{size:9}}}},
                scales:{
                    x:{grid:{display:false},ticks:{font:{size:8},maxRotation:0}},
                    y:{beginAtZero:true,position:"left",ticks:{font:{size:8},precision:0},grid:{color:"#eef0f3"}},
                    y1:{beginAtZero:true,position:"right",ticks:{font:{size:8},precision:0},grid:{display:false}}
                }
            }
        });

    },


    formatearNumeroDesempeno(valor) {
        return Number(valor || 0).toLocaleString("es-DO", {maximumFractionDigits:0});
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
                () => window.AsistenciaPersonal
                    ? AsistenciaPersonal.abrirAvisos()
                    : Sistema.info("El Centro de Avisos no está disponible.")
            );

        }


        const accesosPersonal = [
            ["btnAsistenciaInicio","ASISTENCIA"],
            ["btnVacacionesInicio","VACACIONES"],
            ["btnBonoInicio","BONO"],
            ["btnAmonestacionInicio","AMONESTACION"]
        ];
        accesosPersonal.forEach(([id,tipo]) => {
            const boton = document.getElementById(id);
            if (boton) boton.addEventListener("click", () => AsistenciaPersonal.abrir(tipo));
        });

        const botonTrabajoExtra = document.getElementById("btnTrabajoExtraInicio");
        if (botonTrabajoExtra) botonTrabajoExtra.addEventListener("click", () => AsistenciaPersonal.abrirTrabajoExtra());


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

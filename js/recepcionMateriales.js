/**
 * RECEPCIONMATERIALES.JS
 * Sistema Logístico PT - Helados BON
 */

window.RecepcionMateriales = {

  esGerencia() {
    const sesion = API.obtenerSesion() || {};
    const rol = String(sesion.rol || "").trim().toUpperCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
    return rol === "GERENCIA" || rol === "GERENTE";
  },

  puedeEditar(permiso) {
    return !this.esGerencia() && Sistema.tienePermiso(permiso);
  },

  puedeAdministrarRecepciones() {
    const sesion = this.obtenerSesion();
    const rol = String(sesion.rol || sesion.Rol || "")
      .trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return rol === "ADMINISTRADOR" || rol === "ENCARGADO";
  },

  renderAccionesAdministrativas(item) {
    if (!this.puedeAdministrarRecepciones()) return "";
    const id = this.escapar(item.idRecepcion || "");
    return `
      <div class="acciones-admin-recepcion" aria-label="Administrar recepción">
        <button type="button" class="accion-admin-recepcion" data-admin-recepcion="editar" data-id-recepcion="${id}" title="Editar recepción" aria-label="Editar recepción">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button type="button" class="accion-admin-recepcion" data-admin-recepcion="vincular" data-id-recepcion="${id}" title="Vincular recepciones" aria-label="Vincular recepciones">
          <i class="fa-solid fa-link"></i>
        </button>
        <button type="button" class="accion-admin-recepcion eliminar" data-admin-recepcion="anular" data-id-recepcion="${id}" title="Anular recepción" aria-label="Anular recepción">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>`;
  },

  estado: {
    camaras: [],
    recepcionesAbiertas: [],
    recepcionesRecientes: [],
    recepcionActual: null,
    materialSeleccionado: null,
    resultadosMateriales: [],
    distribucion: {},
    camaraActiva: "",
    origenTraslado: "Carritos",
    horaInicioIngreso: "",
    participantesIngreso: [],
    colaboradoresRecepcion: null,
    elementoEnfoqueAnterior: null,
    resumenAcumulado: null,
    tieneRegistrosPrevios: false,
    analiticaOperativa: [],
    frecuenciaAnalitica: "DIA",
    graficasOperativas: [],
    historico: [],
    historicoOffset: 0,
    historicoLimite: 10,
    historicoHayMas: false,
    historicoTotal: 0
  },


  async cargar() {

    /*
     * Protección: si un modal anterior dejó el bloqueo activo,
     * se restablece el desplazamiento del módulo.
     */
    document.body.classList.remove(
      "asistente-recepcion-abierto"
    );

    const contenedor =
      document.getElementById("contenidoPrincipal");

    if (!contenedor) {
      console.error("No existe #contenidoPrincipal.");
      return;
    }

    this.estado.recepcionActual = null;
    this.estado.recepcionesRecientes = [];
    this.estado.materialSeleccionado = null;
    this.estado.resultadosMateriales = [];
    this.estado.distribucion = {};
    this.estado.horaInicioIngreso = "";
    this.estado.resumenAcumulado = null;
    this.estado.tieneRegistrosPrevios = false;

    contenedor.innerHTML = `
      <section class="recepcion-materiales">

        <header class="recepcion-encabezado">

          <div class="recepcion-encabezado-identidad">
            <span class="recepcion-encabezado-etiqueta">Operación de almacén</span>
            <h2>
              <i class="fa-solid fa-dolly" aria-hidden="true"></i>
              <span>Recepción de materiales</span>
            </h2>
            <p>
              Registre el ingreso de los materiales y su distribución
              entre las cámaras.
            </p>
          </div>

          <div class="recepcion-encabezado-acciones">

            <button
              type="button"
              id="btnActualizarRecepciones"
              class="btn-recepcion secundario"
            >
              <i class="fa-solid fa-arrows-rotate"></i>
              Actualizar
            </button>

            ${
              (
                Sistema.tieneAccesoModulo(
                  "VERIFICACION_RECEPCIONES"
                ) &&
                Sistema.tienePermiso(
                  "VERIFICACION_RECEPCIONES_VER"
                )
              )
                ? `
                    <button
                      type="button"
                      id="btnVerificarRecepciones"
                      class="btn-recepcion secundario"
                    >
                      <i class="fa-solid fa-clipboard-check"></i>
                      Verificar recepciones
                    </button>
                  `
                : ""
            }

            ${
              this.puedeEditar(
                "RECEPCIONES_CREAR"
              )
                ? `
                    <button
                      type="button"
                      id="btnNuevaRecepcionMateriales"
                      class="btn-recepcion principal"
                    >
                      <i class="fa-solid fa-plus"></i>
                      Nueva recepción
                    </button>
                  `
                : ""
            }

          </div>

        </header>

        <div
          id="panelRecepcionMateriales"
          class="recepcion-panel"
        >
          <div class="recepcion-vacia">
            <i class="fa-solid fa-snowflake"></i>
            <strong>Cargando recepciones...</strong>
          </div>
        </div>

      </section>
    `;

    const botonNuevaRecepcion =
      document.getElementById(
        "btnNuevaRecepcionMateriales"
      );

    if (botonNuevaRecepcion) {

      botonNuevaRecepcion.onclick =
        () => this.abrirAsistenteNueva();

    }


    const botonActualizarRecepciones =
      document.getElementById(
        "btnActualizarRecepciones"
      );

    if (botonActualizarRecepciones) {

      botonActualizarRecepciones.onclick =
        async () => {

          if (
            window.CacheOperativo &&
            typeof CacheOperativo.invalidarPrefijo === "function"
          ) {
            await CacheOperativo.invalidarPrefijo("recepciones_");
          }

          await this.cargarCatalogos({
            forzarCache: true
          });

          this.notificar(
            "Recepciones actualizadas correctamente.",
            "exito"
          );

        };

    }


    const botonVerificarRecepciones =
      document.getElementById(
        "btnVerificarRecepciones"
      );

    if (botonVerificarRecepciones) {

      botonVerificarRecepciones.onclick =
        async () => {

          if (
            window.VerificacionRecepciones &&
            typeof window.VerificacionRecepciones.abrir ===
              "function"
          ) {

            await window.VerificacionRecepciones.abrir();

          } else {

            this.notificar(
              "No fue posible abrir la verificación de recepciones.",
              "error"
            );

          }

        };

    }


this.configurarScrollInterno();


await this.cargarCatalogos();

  },


  asegurarModalAsistente() {

    let modal =
      document.getElementById(
        "modalRecepcionMateriales"
      );

    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = "modalRecepcionMateriales";
    modal.className =
      "modal-asistente-recepcion oculto";

    modal.innerHTML = `
      <div class="modal-asistente-recepcion-contenido">

        <header class="modal-asistente-recepcion-header">
          <h2 id="tituloAsistenteRecepcion">
            Asistente de Recepción
          </h2>

          <button
            type="button"
            id="btnCerrarAsistenteRecepcion"
            aria-label="Cerrar asistente"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div
          id="contenidoAsistenteRecepcion"
          class="modal-asistente-recepcion-cuerpo"
        ></div>

      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById("btnCerrarAsistenteRecepcion")
      .onclick = () => this.cerrarAsistente();

    modal.addEventListener("click", evento => {
      if (evento.target === modal) {
        this.cerrarAsistente();
      }
    });

    return modal;

  },


  abrirAsistente(titulo) {

    const modal = this.asegurarModalAsistente();

    this.estado.elementoEnfoqueAnterior = document.activeElement;

    const tituloElemento =
      document.getElementById(
        "tituloAsistenteRecepcion"
      );

    if (tituloElemento) {
      tituloElemento.textContent =
        titulo || "Asistente de Recepción";
    }

    modal.classList.remove("oculto");
    modal.removeAttribute("inert");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add(
      "asistente-recepcion-abierto"
    );

  },


  async cerrarAsistente() {

    const modal =
      document.getElementById(
        "modalRecepcionMateriales"
      );

    if (modal) {
      if (modal.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      modal.classList.add("oculto");
      modal.setAttribute("inert", "");
      modal.setAttribute("aria-hidden", "true");
    }

    const devolverEnfoque = this.estado.elementoEnfoqueAnterior;
    if (devolverEnfoque && document.contains(devolverEnfoque)) {
      devolverEnfoque.focus({ preventScroll: true });
    }

    document.body.classList.remove(
      "asistente-recepcion-abierto"
    );

    this.estado.recepcionActual = null;
    this.estado.materialSeleccionado = null;
    this.estado.resultadosMateriales = [];
    this.estado.distribucion = {};
    this.estado.camaraActiva = "";
    this.estado.horaInicioIngreso = "";
    this.estado.participantesIngreso = [];
    this.estado.resumenAcumulado = null;
    this.estado.tieneRegistrosPrevios = false;

    await this.cargarCatalogos();

  },


  obtenerContenedorAsistente() {

    return document.getElementById(
      "contenidoAsistenteRecepcion"
    );

  },


  abrirAsistenteNueva() {

    if (this.esGerencia()) {
      Sistema.advertencia("Gerencia dispone únicamente de consulta en Recepciones.");
      return;
    }

    if (
      !Sistema.exigirPermiso(
        "RECEPCIONES_CREAR",
        "No tiene permiso para crear recepciones."
      )
    ) {
      return;
    }

    this.estado.recepcionActual = null;
    this.estado.materialSeleccionado = null;
    this.estado.resultadosMateriales = [];
    this.estado.distribucion = {};
    this.estado.camaraActiva = "";
    this.estado.horaInicioIngreso = "";
    this.estado.participantesIngreso = [];
    this.estado.resumenAcumulado = null;
    this.estado.tieneRegistrosPrevios = false;

    this.abrirAsistente(
      "Asistente de Recepción"
    );

    this.renderSeleccionMaterial();

  },

configurarScrollInterno() {

  const modulo =
    document.querySelector(
      ".recepcion-materiales"
    );


  if (!modulo) {
    return;
  }


  const actualizarAltura =
    () => {

      const posicion =
        modulo.getBoundingClientRect();


      const margenInferior =
        18;


      const alturaDisponible =
        Math.max(
          420,
          window.innerHeight -
          posicion.top -
          margenInferior
        );


      modulo.style.setProperty(
        "--alto-modulo-recepciones",
        alturaDisponible + "px"
      );

    };


  actualizarAltura();


  if (
    !this._eventoResizeRecepciones
  ) {

    this._eventoResizeRecepciones =
      () => {

        window.requestAnimationFrame(
          actualizarAltura
        );

      };


    window.addEventListener(
      "resize",
      this._eventoResizeRecepciones
    );

  }

},

  async cargarCatalogos(opciones = {}) {

    /*
     * Evita solicitudes duplicadas cuando el dashboard intenta
     * montar el mismo módulo más de una vez mientras la primera
     * consulta todavía está en curso.
     */
    if (this._cargaCatalogosEnCurso) {
      return this._cargaCatalogosEnCurso;
    }

    this._cargaCatalogosEnCurso =
      this.cargarCatalogosInterno(opciones);

    try {
      return await this._cargaCatalogosEnCurso;
    } finally {
      this._cargaCatalogosEnCurso = null;
    }

  },


  async cargarCatalogosInterno(opciones = {}) {

    this.mostrarCarga(
      "Cargando recepciones",
      "Consultando procesos abiertos y actividad reciente."
    );

    try {

      const cacheRecepciones =
        window.CacheOperativo &&
        typeof CacheOperativo.obtener === "function"
          ? await CacheOperativo.obtener(
              "recepciones_resumen_diario",
              {permitirVencido: true}
            )
          : null;

      const usarCache =
        opciones.forzarCache !== true &&
        cacheRecepciones &&
        cacheRecepciones.vigente === true;

      const datosCache =
        cacheRecepciones && cacheRecepciones.datos
          ? cacheRecepciones.datos
          : {};

      const resultados =
        await Promise.all([

          API.post({
            action:
              "obtenerCatalogosRecepcionMateriales",
            limite:
              50
          }),

          usarCache
            ? Promise.resolve({
                ok: true,
                data: Array.isArray(datosCache.recepcionesRecientes)
                  ? datosCache.recepcionesRecientes
                  : []
              })
            : API.post({
                action:
                  "listarRecepcionesRecientes",
                limite:
                  6
              }),

          this.puedeVerAnaliticaOperativa()
            ? (
                usarCache &&
                datosCache.frecuenciaAnalitica === this.estado.frecuenciaAnalitica
                  ? Promise.resolve({
                      ok: true,
                      data: {
                        serie: Array.isArray(datosCache.analiticaOperativa)
                          ? datosCache.analiticaOperativa
                          : []
                      }
                    })
                  : API.post({
                      action:"obtenerAnaliticaOperativaRecepciones",
                      frecuencia:this.estado.frecuenciaAnalitica
                    })
              )
            : Promise.resolve({ok:true,data:{serie:[]}})

        ]);


      const respuestaCatalogos =
        resultados[0];


      const respuestaRecientes =
        resultados[1];

      const respuestaAnalitica =
        resultados[2];


      if (
        !respuestaCatalogos ||
        respuestaCatalogos.ok !== true
      ) {

        throw new Error(
          respuestaCatalogos &&
          respuestaCatalogos.mensaje
            ? respuestaCatalogos.mensaje
            : "No fue posible cargar los catálogos."
        );

      }


      const datos =
        respuestaCatalogos.data ||
        {};


      this.estado.camaras =
        Array.isArray(
          datos.camaras
        )
          ? datos.camaras
          : [];


      this.estado.recepcionesAbiertas =
        Array.isArray(
          datos.recepcionesAbiertas
        )
          ? datos.recepcionesAbiertas
          : [];


      this.estado.recepcionesRecientes =
        respuestaRecientes &&
        respuestaRecientes.ok === true &&
        Array.isArray(
          respuestaRecientes.data
        )
          ? respuestaRecientes.data
          : (
              Array.isArray(datosCache.recepcionesRecientes)
                ? datosCache.recepcionesRecientes
                : []
            );

      this.estado.analiticaOperativa =
        respuestaAnalitica &&
        respuestaAnalitica.ok === true &&
        respuestaAnalitica.data &&
        Array.isArray(respuestaAnalitica.data.serie)
          ? respuestaAnalitica.data.serie
          : (
              Array.isArray(datosCache.analiticaOperativa)
                ? datosCache.analiticaOperativa
                : []
            );


      if (
        !usarCache &&
        respuestaRecientes &&
        respuestaRecientes.ok === true &&
        window.CacheOperativo &&
        typeof CacheOperativo.guardar === "function"
      ) {

        await CacheOperativo.guardar(
          "recepciones_resumen_diario",
          {
            recepcionesRecientes:
              this.estado.recepcionesRecientes,
            analiticaOperativa:
              this.estado.analiticaOperativa,
            frecuenciaAnalitica:
              this.estado.frecuenciaAnalitica
          }
        );

      }


      this.renderRecepcionesAbiertas();
      this.renderGraficasOperativas();

    } catch (error) {

      this.renderError(
        error.message ||
        "No fue posible cargar el módulo."
      );

    } finally {

      this.ocultarCarga();

    }

  },


  renderRecepcionesAbiertas() {

    document.body.classList.remove(
      "asistente-recepcion-abierto"
    );

    const panel =
      document.getElementById("panelRecepcionMateriales");

    if (!panel) {
      return;
    }

    const lista = this.estado.recepcionesAbiertas;

    const totalTarimas = lista.reduce(
      (total, item) =>
        total + Number(item.totalTarimas || 0),
      0
    );

    const totalPosiciones = lista.reduce(
      (total, item) =>
        total + Number(
          item.totalPosicionesOcupadas || 0
        ),
      0
    );

    const conParcial = lista.filter(
      item => Number(item.totalParciales || 0) > 0
    ).length;

    panel.innerHTML = `
      <section class="centro-recepciones">

        <div class="indicadores-recepciones">

          <article class="indicador-recepcion rojo">
            <span>Recepciones abiertas</span>
            <strong>${lista.length}</strong>
            <small>Procesos pendientes de cierre</small>
          </article>

          <article class="indicador-recepcion verde">
            <span>Tarimas registradas</span>
            <strong>
              ${this.formatearNumero(totalTarimas)}
            </strong>
            <small>En recepciones actualmente abiertas</small>
          </article>

          <article class="indicador-recepcion azul">
            <span>Bultos recibidos</span>
            <strong>
              ${this.formatearNumero(
                lista.reduce(
                  (total, item) =>
                    total + Number(item.totalUnidades || 0),
                  0
                )
              )}
            </strong>
            <small>
              ${this.formatearNumero(totalPosiciones)} posiciones ocupadas
            </small>
          </article>

          <article class="indicador-recepcion naranja">
            <span>Recepciones con parcial</span>
            <strong>${conParcial}</strong>
            <small>Procesos abiertos con parciales</small>
          </article>

        </div>

        ${this.puedeVerAnaliticaOperativa() ? `
        <details
          id="desplegableIndicadoresRecepcion"
          class="plegable-recepciones plegable-indicadores-recepcion"
        >
          <summary>
            <span>
              <small>Comportamiento operativo</small>
              <strong>Indicadores de recepción</strong>
            </span>
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </summary>

          <div class="contenido-plegable-recepciones">
            <header class="encabezado-interior-plegable-recepciones">
              <p>Evolución de recepciones finalizadas por período.</p>
              <select id="frecuenciaAnaliticaRecepciones" class="selector-periodo-recepciones">
                <option value="DIA" ${this.estado.frecuenciaAnalitica === "DIA" ? "selected" : ""}>Día</option>
                <option value="SEMANA" ${this.estado.frecuenciaAnalitica === "SEMANA" ? "selected" : ""}>Semana</option>
                <option value="MES" ${this.estado.frecuenciaAnalitica === "MES" ? "selected" : ""}>Mes</option>
              </select>
            </header>

            <div class="graficas-operativas-recepciones">
              ${this.renderLienzoAnalitica("Tarimas recibidas", "graficaTarimasRecepciones", "fa-layer-group")}
              ${this.renderLienzoAnalitica("Cajas y cubos recibidos", "graficaUnidadesRecepciones", "fa-boxes-stacked")}
              ${this.renderLienzoAnalitica("Posiciones ocupadas", "graficaPosicionesRecepciones", "fa-warehouse")}
            </div>
          </div>
        </details>
        ` : ""}

        <section class="bloque-centro-recepciones">

          <header class="encabezado-bloque-recepciones">
            <div>
              <span>Operación actual</span>
              <h3>Recepciones abiertas</h3>
              <p>
                Continúe los procesos que todavía no han sido
                finalizados.
              </p>
            </div>
          </header>

          <div class="recepciones-abiertas-grid">
            ${
              lista.length
                ? lista.map(
                    item => this.renderTarjetaRecepcion(item)
                  ).join("")
                : `
                  <article class="recepcion-vacia compacta">
                    <i class="fa-solid fa-inbox"></i>
                    <h3>No hay recepciones abiertas</h3>
                    <p>
                      Inicie una nueva recepción cuando
                      Producción entregue material.
                    </p>
                  </article>
                `
            }
          </div>

        </section>

        <details class="plegable-recepciones plegable-completadas-recepcion" open>
          <summary>
            <span>
              <small>Seguimiento</small>
              <strong>Recepciones completadas</strong>
            </span>
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </summary>

          <div class="contenido-plegable-recepciones">
            <header class="encabezado-interior-plegable-recepciones completadas">
              <p>Recepciones cerradas recientemente, ordenadas desde la más nueva.</p>
              <button
                type="button"
                id="btnHistoricoRecepciones"
                class="btn-recepcion secundario"
              >
                <i class="fa-solid fa-clock-rotate-left"></i>
                Ver histórico
              </button>
            </header>

            ${this.renderActividadReciente()}
          </div>
        </details>

      </section>
    `;

    panel
      .querySelectorAll("[data-abrir-recepcion]")
      .forEach(boton => {
        boton.onclick = () => {
          this.abrirRecepcion(
            boton.dataset.abrirRecepcion
          );
        };
      });

    panel.querySelectorAll("[data-admin-recepcion]").forEach(boton => {
      boton.onclick = evento => {
        evento.preventDefault();
        evento.stopPropagation();
        this.administrarRecepcion(
          boton.dataset.adminRecepcion,
          boton.dataset.idRecepcion
        );
      };
    });

    const historico =
      document.getElementById("btnHistoricoRecepciones");

    if (historico) {
      historico.onclick = () => this.abrirHistoricoRecepciones();
    }

    const frecuencia = document.getElementById("frecuenciaAnaliticaRecepciones");
    if (frecuencia) {
      frecuencia.onchange = () => this.cargarAnaliticaOperativa(frecuencia.value);
    }

    const desplegableIndicadores =
      document.getElementById("desplegableIndicadoresRecepcion");

    if (desplegableIndicadores) {
      desplegableIndicadores.addEventListener("toggle", () => {
        if (!desplegableIndicadores.open) return;
        window.requestAnimationFrame(() => this.renderGraficasOperativas());
      });
    }

  },


  puedeVerAnaliticaOperativa() {
    const sesion = Sistema.obtenerSesion() || {};
    const rol = typeof Sistema.normalizarPermiso === "function"
      ? Sistema.normalizarPermiso(sesion.rol)
      : String(sesion.rol || "").trim().toUpperCase();
    return rol.indexOf("AUXILIAR") === -1 && rol.indexOf("MONTACARGUISTA") === -1;
  },


  renderLienzoAnalitica(titulo, id, icono) {
    return `
      <article class="mini-grafica-recepcion">
        <header>
          <i class="fa-solid ${icono}"></i>
          <span>${this.escapar(titulo)}</span>
        </header>
        <div><canvas id="${id}"></canvas></div>
      </article>`;
  },


  async cargarAnaliticaOperativa(frecuencia) {
    this.estado.frecuenciaAnalitica = frecuencia || "DIA";
    this.mostrarCarga(
      "Actualizando indicadores",
      "Consultando la actividad de recepciones finalizadas."
    );
    try {
      const respuesta = await API.post({
        action:"obtenerAnaliticaOperativaRecepciones",
        frecuencia:this.estado.frecuenciaAnalitica
      });
      if (!respuesta || respuesta.ok !== true) {
        throw new Error(respuesta && respuesta.mensaje ? respuesta.mensaje : "No fue posible cargar los indicadores.");
      }
      this.estado.analiticaOperativa = respuesta.data && Array.isArray(respuesta.data.serie)
        ? respuesta.data.serie
        : [];
      this.renderGraficasOperativas();
    } catch (error) {
      this.notificar(error.message, "error");
    } finally {
      this.ocultarCarga();
    }
  },


  renderGraficasOperativas() {
    if (!this.puedeVerAnaliticaOperativa() || typeof Chart === "undefined") return;

    const desplegable = document.getElementById("desplegableIndicadoresRecepcion");
    if (desplegable && !desplegable.open) return;

    (this.estado.graficasOperativas || []).forEach(grafica => {
      if (grafica && typeof grafica.destroy === "function") grafica.destroy();
    });
    this.estado.graficasOperativas = [];

    const serie = Array.isArray(this.estado.analiticaOperativa)
      ? this.estado.analiticaOperativa
      : [];
    const etiquetas = serie.map(item => item.etiqueta || item.clave);
    const configuraciones = [
      {id:"graficaTarimasRecepciones", campo:"tarimas", color:"#d71920"},
      {id:"graficaUnidadesRecepciones", campo:"unidades", color:"#1976d2"},
      {id:"graficaPosicionesRecepciones", campo:"posiciones", color:"#218838"}
    ];

    configuraciones.forEach(config => {
      const lienzo = document.getElementById(config.id);
      if (!lienzo) return;
      const grafica = new Chart(lienzo, {
        type:"line",
        data:{
          labels:etiquetas,
          datasets:[{
            data:serie.map(item => Number(item[config.campo] || 0)),
            borderColor:config.color,
            backgroundColor:config.color + "18",
            fill:true,
            tension:.32,
            borderWidth:2,
            pointRadius:2,
            pointHoverRadius:4
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{
            x:{grid:{display:false},ticks:{font:{size:8},maxRotation:0,autoSkip:true,maxTicksLimit:6}},
            y:{beginAtZero:true,grid:{color:"#eef0f3"},ticks:{font:{size:8},precision:0,maxTicksLimit:4}}
          }
        }
      });
      this.estado.graficasOperativas.push(grafica);
    });
  },


  abrirHistoricoRecepciones() {
    this.estado.historico = [];
    this.estado.historicoOffset = 0;
    this.estado.historicoHayMas = false;

    const contenido = `
      <section class="historico-recepciones-modal">
        <header class="historico-recepciones-controles">
          <span class="historico-recepciones-identidad">CONSULTA OPERATIVA</span>
          <label class="historico-recepciones-limite">
            <span>Mostrar:</span>
            <select id="limiteHistoricoRecepciones">
              <option value="10">10 recep.</option>
              <option value="30">30 recep.</option>
            </select>
          </label>
        </header>
        <div id="listaHistoricoRecepciones" class="lista-historico-recepciones">
          <div class="estado-proximo-recepciones"><i class="fa-solid fa-spinner fa-spin"></i><span>Cargando histórico...</span></div>
        </div>
        <footer class="historico-recepciones-pie">
          <span id="resumenHistoricoRecepciones"></span>
          <button type="button" id="btnCargarMasHistoricoRecepciones" class="btn-recepcion secundario" hidden>
            <i class="fa-solid fa-plus"></i> Cargar más
          </button>
        </footer>
      </section>`;

    Sistema.abrirModal("Histórico de recepciones", contenido, {clase:"modal-historico-recepciones"});

    const cerrarModal = document.getElementById("cerrarModal");
    if (cerrarModal && cerrarModal.dataset.limpiezaHistoricoRecepciones !== "true") {
      cerrarModal.dataset.limpiezaHistoricoRecepciones = "true";
      cerrarModal.addEventListener("click", () => {
        const modalContenido = document.querySelector("#modalSistema .modal-contenido");
        if (modalContenido) modalContenido.classList.remove("modal-historico-recepciones");
      });
    }

    const selector = document.getElementById("limiteHistoricoRecepciones");
    const cargarMas = document.getElementById("btnCargarMasHistoricoRecepciones");
    if (selector) {
      selector.value = String(this.estado.historicoLimite);
      selector.onchange = () => {
        this.estado.historicoLimite = Number(selector.value);
        this.estado.historico = [];
        this.estado.historicoOffset = 0;
        this.cargarHistoricoRecepciones(false);
      };
    }
    if (cargarMas) cargarMas.onclick = () => this.cargarHistoricoRecepciones(true);
    this.cargarHistoricoRecepciones(false);
  },


  async cargarHistoricoRecepciones(anexar) {
    const claveCache =
      "recepciones_historico_" +
      String(this.estado.historicoLimite);

    if (
      !anexar &&
      window.CacheOperativo &&
      typeof CacheOperativo.obtener === "function"
    ) {

      const cache = await CacheOperativo.obtener(
        claveCache
      );

      const datosCache = cache && cache.datos;

      if (
        datosCache &&
        Array.isArray(datosCache.registros)
      ) {

        this.estado.historico =
          datosCache.registros;

        this.estado.historicoOffset =
          Number(
            datosCache.offset ||
            datosCache.registros.length
          );

        this.estado.historicoHayMas =
          datosCache.hayMas === true;

        this.estado.historicoTotal =
          Number(datosCache.total || 0);

        this.renderHistoricoRecepciones();
        return;

      }

    }

    this.mostrarCarga("Cargando histórico", "Consultando recepciones registradas.");
    try {
      const respuesta = await API.post({
        action:"obtenerHistoricoRecepciones",
        offset:anexar ? this.estado.historicoOffset : 0,
        limite:this.estado.historicoLimite
      });
      if (!respuesta || respuesta.ok !== true) {
        throw new Error(respuesta && respuesta.mensaje ? respuesta.mensaje : "No fue posible consultar el histórico.");
      }
      const datos = respuesta.data || {};
      const nuevos = Array.isArray(datos.registros) ? datos.registros : [];
      this.estado.historico = anexar ? this.estado.historico.concat(nuevos) : nuevos;
      this.estado.historicoOffset = Number(datos.offset || 0) + nuevos.length;
      this.estado.historicoHayMas = datos.hayMas === true;
      this.estado.historicoTotal = Number(datos.total || 0);

      if (
        window.CacheOperativo &&
        typeof CacheOperativo.guardar === "function"
      ) {

        await CacheOperativo.guardar(
          claveCache,
          {
            registros:
              this.estado.historico,
            offset:
              this.estado.historicoOffset,
            hayMas:
              this.estado.historicoHayMas,
            total:
              this.estado.historicoTotal
          }
        );

      }

      this.renderHistoricoRecepciones();
    } catch (error) {
      this.notificar(error.message, "error");
    } finally {
      this.ocultarCarga();
    }
  },


  renderHistoricoRecepciones() {
    const lista = document.getElementById("listaHistoricoRecepciones");
    const boton = document.getElementById("btnCargarMasHistoricoRecepciones");
    const resumen = document.getElementById("resumenHistoricoRecepciones");
    if (!lista) return;

    const registros = this.estado.historico || [];
    let grupoEstado = "";
    let grupoMes = "";
    let grupoSemana = "";
    let html = "";

    registros.forEach(item => {
      if (item.grupoEstado !== grupoEstado) {
        grupoEstado = item.grupoEstado;
        grupoMes = "";
        grupoSemana = "";
        html += `<div class="historico-grupo-estado ${grupoEstado.toLowerCase()}">${this.escapar(grupoEstado)}</div>`;
      }

      const fecha = item.fecha ? new Date(item.fecha + "T00:00:00") : null;
      const mes = fecha && !isNaN(fecha.getTime())
        ? fecha.toLocaleDateString("es-DO", {month:"long",year:"numeric"})
        : "Sin fecha";
      const semana = fecha && !isNaN(fecha.getTime()) ? this.claveSemanaRecepcion(fecha) : "sin-semana";

      if (mes !== grupoMes) {
        grupoMes = mes;
        grupoSemana = "";
        html += `<div class="historico-grupo-mes">${this.escapar(mes)}</div>`;
      }
      if (semana !== grupoSemana) {
        grupoSemana = semana;
        html += `<div class="historico-separador-semana"><span>${this.escapar(this.etiquetaSemanaRecepcion(fecha))}</span></div>`;
      }

      html += this.renderFilaHistoricoRecepcion(item);
    });

    lista.innerHTML = html || `<div class="estado-proximo-recepciones"><i class="fa-solid fa-box-archive"></i><span>No existen recepciones para mostrar.</span></div>`;
    lista.querySelectorAll("[data-admin-recepcion]").forEach(boton => {
      boton.onclick = evento => {
        evento.preventDefault();
        evento.stopPropagation();
        this.administrarRecepcion(
          boton.dataset.adminRecepcion,
          boton.dataset.idRecepcion
        );
      };
    });
    if (boton) boton.hidden = !this.estado.historicoHayMas;
    if (resumen) resumen.textContent = `Mostrando ${registros.length} de ${this.estado.historicoTotal} recepciones`;
  },


  renderFilaHistoricoRecepcion(item) {
    return `
      <article class="fila-historico-recepcion">
        <div class="fila-historico-identidad">
          <span>${this.escapar(item.idRecepcion || "-")}</span>
          <strong>${this.escapar(item.detalle || item.material || "Recepción")}</strong>
          <small>${this.escapar(this.formatearFechaLegible(item.fecha))} · ${this.escapar(item.usuarioNombre || "Sin responsable")}</small>
        </div>
        <span class="fila-historico-estado ${String(item.grupoEstado || "").toLowerCase()}">${this.escapar(item.estado)}</span>
        <div class="fila-historico-metrica"><span>Tarimas</span><strong>${this.formatearNumero(item.totalTarimas)}</strong></div>
        <div class="fila-historico-metrica"><span>Cajas/cubos</span><strong>${this.formatearNumero(item.totalUnidades)}</strong></div>
        <div class="fila-historico-metrica"><span>Posiciones</span><strong>${this.formatearNumero(item.totalPosiciones)}</strong></div>
        <div class="fila-historico-metrica"><span>Duración</span><strong>${this.formatearNumero(item.duracionMinutos)} min</strong></div>
        ${this.renderAccionesAdministrativas(item)}
      </article>`;
  },


  claveSemanaRecepcion(fecha) {
    const lunes = new Date(fecha);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    return `${lunes.getFullYear()}-${lunes.getMonth()}-${lunes.getDate()}`;
  },


  etiquetaSemanaRecepcion(fecha) {
    if (!fecha || isNaN(fecha.getTime())) return "Semana sin fecha";
    const lunes = new Date(fecha);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return `Semana ${lunes.toLocaleDateString("es-DO", {day:"2-digit",month:"short"})} - ${domingo.toLocaleDateString("es-DO", {day:"2-digit",month:"short"})}`;
  },


  renderActividadReciente() {

    const listaBase =
      Array.isArray(
        this.estado.recepcionesRecientes
      )
        ? this.estado.recepcionesRecientes
        : [];


    const lista =
      [...listaBase]
        .sort(
          (a, b) => {

            const diferencia =
              this.obtenerMarcaTiempoRecepcion(
                b
              ) -
              this.obtenerMarcaTiempoRecepcion(
                a
              );

            if (diferencia !== 0) {
              return diferencia;
            }

            return String(
              b.idRecepcion || ""
            ).localeCompare(
              String(
                a.idRecepcion || ""
              ),
              "es",
              {
                numeric: true
              }
            );

          }
        );


    if (!lista.length) {

      return `

        <div class="estado-proximo-recepciones">

          <i class="fa-solid fa-box-archive"></i>

          <span>
            Todavía no hay recepciones finalizadas recientes
            para mostrar.
          </span>

        </div>

      `;

    }


    return `

      <div class="lista-recepciones-recientes">

        ${lista
          .map(
            item =>
              this.renderRecepcionReciente(
                item
              )
          )
          .join("")}

      </div>

    `;

  },


  renderRecepcionReciente(
    item
  ) {

    const auxiliares =
      Array.isArray(
        item.auxiliares
      )
        ? item.auxiliares
        : [];


    const camaras =
      Array.isArray(
        item.camaras
      )
        ? item.camaras
        : [];


    return `

      <article class="tarjeta-recepcion-reciente">

        <div class="recepcion-reciente-icono">
          <i class="fa-solid fa-circle-check"></i>
        </div>

        <div class="recepcion-reciente-contenido">

          <header>

            <div>
              <span>Recepción finalizada</span>

              <h4>
                ${this.escapar(
                  item.descripcion ||
                  "Material recibido"
                )}
              </h4>

              <small>
                ${this.escapar(
                  item.idRecepcion ||
                  "-"
                )}
              </small>
            </div>

            <time>
              ${this.escapar(
                this.formatearFechaLegible(
                  item.fecha
                )
              )}

              <strong>
                ${this.escapar(
                  this.formatearHoraRecepcion(
                    item.horaFinal ||
                    item.horaInicio
                  )
                )}
              </strong>
            </time>

          </header>

          <div class="metricas-recepcion-reciente">

            <div>
              <span>Tarimas</span>
              <strong>
                ${this.formatearNumero(
                  item.totalTarimas
                )}
              </strong>
            </div>

            <div>
              <span>Parciales</span>
              <strong>
                ${this.formatearNumero(
                  item.totalParciales
                )}
              </strong>
            </div>

            <div>
              <span>Bultos</span>
              <strong>
                ${this.formatearNumero(
                  item.totalUnidades
                )}
              </strong>
            </div>

            <div>
              <span>Duración</span>
              <strong>
                ${this.formatearNumero(
                  item.duracionMinutos
                )}
                min
              </strong>
            </div>

          </div>

          <footer>

            <div>
              <i class="fa-solid fa-user-group"></i>
              <span>
                ${
                  auxiliares.length
                    ? auxiliares
                        .map(
                          auxiliar =>
                            this.escapar(
                              auxiliar.nombre ||
                              auxiliar.id
                            )
                        )
                        .join(", ")
                    : "Sin auxiliar identificado"
                }
              </span>
            </div>

            <div>
              <i class="fa-solid fa-warehouse"></i>
              <span>
                ${
                  camaras.length
                    ? camaras
                        .map(
                          camara =>
                            this.escapar(
                              camara.codigo ||
                              camara.nombre
                            )
                        )
                        .join(", ")
                    : "Sin cámara identificada"
                }
              </span>
            </div>

            ${this.renderAccionesAdministrativas(item)}

          </footer>

        </div>

      </article>

    `;

  },


  renderTarjetaRecepcion(item) {

    const camaras =
      Array.isArray(item.camarasUtilizadas)
        ? item.camarasUtilizadas
        : [];

    const titulo =
      item.descripcion ||
      item.detalle ||
      item.material ||
      "Recepción pendiente de material";

    return `
      <article class="tarjeta-recepcion-abierta">

        <div class="tarjeta-recepcion-franja"></div>

        <header>

          <div>
            <span>Producto en recepción</span>

            <h3>
              ${this.escapar(titulo)}
            </h3>

            <small>
              ${this.escapar(item.idRecepcion || "-")}
            </small>
          </div>

          <span class="estado-recepcion-abierta">
            ${this.escapar(item.estado || "ABIERTA")}
          </span>

        </header>

        <div class="tarjeta-recepcion-datos ampliada">

          <div>
            <span>Hora de inicio</span>
            <strong>
              ${this.escapar(
                this.formatearHoraRecepcion(
                  item.horaInicio
                )
              )}
            </strong>
          </div>

          <div>
            <span>Tarimas</span>
            <strong>
              ${this.formatearNumero(item.totalTarimas)}
            </strong>
          </div>

          <div>
            <span>Parciales</span>
            <strong>
              ${this.formatearNumero(item.totalParciales)}
            </strong>
          </div>

          <div>
            <span>Bultos recibidos</span>
            <strong>
              ${this.formatearNumero(
                item.totalUnidades
              )}
            </strong>
          </div>

          <div>
            <span>Posiciones ocupadas</span>
            <strong>
              ${this.formatearNumero(
                item.totalPosicionesOcupadas
              )}
            </strong>
          </div>

          <div>
            <span>Cámaras utilizadas</span>
            <strong>
              ${this.formatearNumero(item.cantidadCamaras)}
            </strong>
          </div>

          <div>
            <span>Último auxiliar</span>
            <strong>
              ${this.escapar(
                item.ultimoAuxiliarNombre ||
                item.usuarioNombre ||
                "-"
              )}
            </strong>
          </div>

        </div>

        ${
          camaras.length
            ? `
              <div class="camaras-tarjeta-recepcion">
                ${camaras
                  .map(
                    camara => `
                      <span>
                        ${this.escapar(
                          camara.codigo ||
                          camara.nombre
                        )}
                      </span>
                    `
                  )
                  .join("")}
              </div>
            `
            : ""
        }

        ${
          this.puedeEditar(
            "RECEPCIONES_CONTINUAR"
          )
            ? `
                <button
                  type="button"
                  class="btn-recepcion continuar"
                  data-abrir-recepcion="${this.escapar(
                    item.idRecepcion
                  )}"
                >
                  <i class="fa-solid fa-arrow-right"></i>
                  Continuar recepción
                </button>
              `
            : ""
        }

        ${this.renderAccionesAdministrativas(item)}

      </article>
    `;

  },

  async administrarRecepcion(accion, idRecepcion) {
    if (!this.puedeAdministrarRecepciones()) {
      this.notificar("Esta acción está reservada para Encargado y Administrador.", "advertencia");
      return;
    }
    if (accion === "anular") {
      this.abrirConfirmacionAnulacion(idRecepcion);
      return;
    }
    this.mostrarCarga("Consultando recepción", "Preparando las entradas registradas.");
    try {
      const respuesta = await API.post({
        action: accion === "vincular" ? "listarRecepcionesVinculables" : "obtenerAdministracionRecepcion",
        idRecepcion
      });
      if (!respuesta || respuesta.ok !== true) throw new Error(respuesta && respuesta.mensaje || "No fue posible consultar la recepción.");
      if (accion === "vincular") this.abrirVinculacionRecepciones(idRecepcion, respuesta.data || {});
      else this.abrirEdicionRecepcion(respuesta.data || {});
    } catch (error) {
      this.notificar(error.message, "error");
    } finally {
      this.ocultarCarga();
    }
  },

  abrirEdicionRecepcion(datos) {
    const recepcion = datos.recepcion || {};
    const detalles = Array.isArray(datos.detalles) ? datos.detalles : [];
    const camaras = Array.isArray(datos.camaras) ? datos.camaras : this.estado.camaras;
    const contenido = `
      <section class="administrar-recepcion-modal">
        <p class="admin-recepcion-ayuda">Cada tarjeta corresponde a una entrada real. Al guardar se recalculan el encabezado, los movimientos y la ocupación.</p>
        <section class="material-administrable-recepcion">
          <label>Código del material<input id="materialEdicionRecepcion" type="text" value="${this.escapar(recepcion.material || "")}" autocomplete="off" required></label>
          <label>Descripción<input id="descripcionEdicionRecepcion" type="text" value="${this.escapar(recepcion.detalle || recepcion.descripcion || "")}" autocomplete="off" required></label>
          <p>El código debe existir y estar activo en el catálogo de materiales.</p>
        </section>
        <div class="entradas-administrables-recepcion">
          ${detalles.map((d, indice) => `
            <article class="entrada-administrable-recepcion" data-id-detalle="${this.escapar(d.idDetalle)}">
              <header><strong>${this.escapar(d.auxiliarNombre || "Colaborador no identificado")}</strong><span>Entrada ${indice + 1}</span></header>
              <div class="campos-entrada-administrable">
                <label>Origen<select data-campo="origenTraslado"><option value="Carritos" ${String(d.origenTraslado).toUpperCase()==="CARRITOS"?"selected":""}>Carritos</option><option value="Túnel" ${String(d.origenTraslado).toUpperCase().indexOf("TUN")===0?"selected":""}>Túnel</option></select></label>
                <label>Hora<input data-campo="horaRegistro" type="time" value="${this.escapar(d.horaRegistro || "")}"></label>
                <label>Cámara<select data-campo="idCamara">${camaras.map(c => `<option value="${this.escapar(c.idCamara || c.id)}" ${(c.idCamara||c.id)===d.idCamara?"selected":""}>${this.escapar(c.codigo || c.nombre || c.idCamara)}</option>`).join("")}</select></label>
                <label>Tarimas completas<input data-campo="tarimasCompletas" type="number" min="0" value="${Number(d.tarimasCompletas || 0)}"></label>
                <label>Unidades parciales<input data-campo="parcialUnidades" type="number" min="0" value="${Number(d.parcialUnidades || 0)}"></label>
                <label>Posiciones<input data-campo="posicionesOcupadas" type="number" min="0" value="${Number(d.posicionesOcupadas || 0)}"></label>
              </div>
            </article>`).join("")}
        </div>
        <label class="motivo-admin-recepcion">Motivo de la corrección<textarea id="motivoEdicionRecepcion" rows="2" required></textarea></label>
        <footer class="acciones-modal-recepcion"><button type="button" class="btn-recepcion secundario" id="cancelarEdicionRecepcion">Cancelar</button><button type="button" class="btn-recepcion principal" id="guardarEdicionRecepcion"><i class="fa-solid fa-floppy-disk"></i> Guardar cambios</button></footer>
      </section>`;
    Sistema.abrirModal(this.escapar(recepcion.detalle || recepcion.material || "Editar recepción"), contenido, {clase:"modal-administrar-recepcion"});
    document.getElementById("cancelarEdicionRecepcion").onclick = () => Sistema.cerrarModal();
    document.getElementById("guardarEdicionRecepcion").onclick = () => this.guardarEdicionRecepcion(recepcion.idRecepcion);
  },

  async guardarEdicionRecepcion(idRecepcion) {
    const motivo = String(document.getElementById("motivoEdicionRecepcion").value || "").trim();
    if (!motivo) { this.notificar("Indique el motivo de la corrección.", "advertencia"); return; }
    const material = String(document.getElementById("materialEdicionRecepcion").value || "").trim();
    const descripcion = String(document.getElementById("descripcionEdicionRecepcion").value || "").trim();
    if (!material || !descripcion) { this.notificar("Indique el material y su descripción.", "advertencia"); return; }
    const detalles = Array.from(document.querySelectorAll(".entrada-administrable-recepcion")).map(tarjeta => {
      const valor = campo => tarjeta.querySelector(`[data-campo="${campo}"]`).value;
      return {idDetalle:tarjeta.dataset.idDetalle, origenTraslado:valor("origenTraslado"), horaRegistro:valor("horaRegistro"), idCamara:valor("idCamara"), tarimasCompletas:Number(valor("tarimasCompletas")), parcialUnidades:Number(valor("parcialUnidades")), posicionesOcupadas:Number(valor("posicionesOcupadas"))};
    });
    await this.ejecutarAdministracionRecepcion("editarRecepcionAdministrativa", {idRecepcion, material, descripcion, motivo, detalles}, "Recepción corregida correctamente.");
  },

  abrirVinculacionRecepciones(idRecepcion, datos) {
    const candidatas = Array.isArray(datos.recepciones) ? datos.recepciones : [];
    const contenido = `<section class="administrar-recepcion-modal"><p class="admin-recepcion-ayuda">Seleccione la recepción que se integrará a la principal. Las entradas y movimientos conservarán su trazabilidad.</p><div class="lista-vinculables-recepcion">${candidatas.length ? candidatas.map(item => `<label><input type="radio" name="recepcionSecundaria" value="${this.escapar(item.idRecepcion)}"><span><strong>${this.escapar(item.idRecepcion)}</strong><small>${this.escapar(item.fecha || "")} · ${this.formatearNumero(item.totalUnidades || 0)} bultos</small></span></label>`).join("") : "<p>No hay otra recepción del mismo material disponible.</p>"}</div><label class="motivo-admin-recepcion">Motivo de la vinculación<textarea id="motivoVincularRecepcion" rows="2"></textarea></label><footer class="acciones-modal-recepcion"><button type="button" class="btn-recepcion secundario" id="cancelarVinculacionRecepcion">Cancelar</button><button type="button" class="btn-recepcion principal" id="confirmarVinculacionRecepcion" ${candidatas.length?"":"disabled"}><i class="fa-solid fa-link"></i> Unificar</button></footer></section>`;
    Sistema.abrirModal("Vincular recepciones", contenido, {clase:"modal-administrar-recepcion"});
    document.getElementById("cancelarVinculacionRecepcion").onclick = () => Sistema.cerrarModal();
    document.getElementById("confirmarVinculacionRecepcion").onclick = () => {
      const elegida = document.querySelector('[name="recepcionSecundaria"]:checked');
      const motivo = String(document.getElementById("motivoVincularRecepcion").value || "").trim();
      if (!elegida || !motivo) { this.notificar("Seleccione la recepción e indique el motivo.", "advertencia"); return; }
      this.ejecutarAdministracionRecepcion("vincularRecepcionesAdministrativas", {idRecepcionPrincipal:idRecepcion, idRecepcionSecundaria:elegida.value, motivo}, "Recepciones unificadas correctamente.");
    };
  },

  abrirConfirmacionAnulacion(idRecepcion) {
    const contenido = `<section class="confirmacion-anular-recepcion"><div class="icono-confirmacion-anular"><i class="fa-solid fa-trash-can"></i></div><h3>¿Anular esta recepción?</h3><p>Se conservará el encabezado como acuse de auditoría. Se eliminarán los detalles y movimientos asociados y se reconstruirá la ocupación.</p><label>Motivo de la anulación<textarea id="motivoAnularRecepcion" rows="3"></textarea></label><footer><button type="button" class="btn-recepcion secundario" id="cancelarAnulacionRecepcion">Cancelar</button><button type="button" class="btn-recepcion peligro" id="confirmarAnulacionRecepcion">Anular recepción</button></footer></section>`;
    Sistema.abrirModal("Validar anulación", contenido, {clase:"modal-confirmacion-recepcion", compacto:true});
    document.getElementById("cancelarAnulacionRecepcion").onclick = () => Sistema.cerrarModal();
    document.getElementById("confirmarAnulacionRecepcion").onclick = () => {
      const motivo = String(document.getElementById("motivoAnularRecepcion").value || "").trim();
      if (!motivo) { this.notificar("Indique el motivo de la anulación.", "advertencia"); return; }
      this.ejecutarAdministracionRecepcion("anularRecepcionAdministrativa", {idRecepcion, motivo}, "Recepción anulada y ocupación reconstruida.");
    };
  },

  async ejecutarAdministracionRecepcion(action, datos, mensaje) {
    this.mostrarCarga("Actualizando recepción", "Sincronizando detalles, movimientos e inventario.");
    try {
      const respuesta = await API.post(Object.assign({action}, datos));
      if (!respuesta || respuesta.ok !== true) throw new Error(respuesta && respuesta.mensaje || "No fue posible completar la operación.");
      Sistema.cerrarModal();
      if (window.CacheOperativo && CacheOperativo.invalidarPrefijo) await CacheOperativo.invalidarPrefijo("recepciones_");
      await this.cargarCatalogos({forzarCache:true});
      this.notificar(mensaje, "exito");
    } catch (error) {
      this.notificar(error.message, "error");
    } finally {
      this.ocultarCarga();
    }
  },


  mostrarInicioNuevaRecepcion() {

    const panel =
      this.obtenerContenedorAsistente();

    if (!panel) {
      return;
    }

    if (!this.estado.materialSeleccionado) {
      this.renderSeleccionMaterial();
      return;
    }

    panel.innerHTML = `
      <section class="recepcion-paso">

        <header class="recepcion-paso-encabezado">

          <button
            type="button"
            id="btnVolverRecepciones"
            class="btn-icono-recepcion"
          >
            <i class="fa-solid fa-arrow-left"></i>
          </button>

          <div>
            <span>${this.escapar(this.estado.materialSeleccionado.descripcion || "Nueva recepción")}</span>
            <h3>¿Cómo recibiste el material?</h3>
          </div>

        </header>

        <div class="origen-recepcion-grid">

          <button
            type="button"
            class="opcion-origen-recepcion"
            data-origen="Carritos"
          >
            <i class="fa-solid fa-dolly"></i>
            <strong>Carritos</strong>
            <span>Traslado desde Producción.</span>
          </button>

          <button
            type="button"
            class="opcion-origen-recepcion"
            data-origen="Túnel refrigerador"
          >
            <i class="fa-solid fa-temperature-low"></i>
            <strong>Túnel refrigerador</strong>
            <span>Entrada directa desde el túnel.</span>
          </button>

        </div>

        <div class="campo-hora-inicio-recepcion">
          <label for="inputHoraInicioRecepcion">
            Hora en que comenzó a recibir
          </label>

          <input
            type="time"
            id="inputHoraInicioRecepcion"
            step="60"
            required
          >

          <small>
            Indique la hora real de inicio. La hora final se registrará automáticamente al guardar.
          </small>
        </div>

        <div class="recepcion-acciones-finales">
          <button
            type="button"
            id="btnIniciarRecepcion"
            class="btn-recepcion principal"
          >
            <i class="fa-solid fa-play"></i>
            Continuar
          </button>
        </div>

      </section>
    `;

    this.estado.origenTraslado = "";

    panel
      .querySelectorAll("[data-origen]")
      .forEach(boton => {

        boton.onclick = () => {

          panel
            .querySelectorAll("[data-origen]")
            .forEach(item => {
              item.classList.remove("activo");
            });

          boton.classList.add("activo");

          this.estado.origenTraslado =
            boton.dataset.origen;

        };

      });

    document
      .getElementById("btnVolverRecepciones")
      .onclick = () => this.renderSeleccionMaterial();

    document
      .getElementById("btnIniciarRecepcion")
      .onclick = () => {

        if (!this.estado.origenTraslado) {
          this.notificar("Seleccione la vía por la que recibió el material.", "advertencia");
          return;
        }

        const inputHora =
          document.getElementById(
            "inputHoraInicioRecepcion"
          );

        const horaInicio =
          inputHora
            ? String(inputHora.value || "").trim()
            : "";

        if (!horaInicio) {

          this.notificar(
            "Indique la hora en que comenzó a recibir el material.",
            "advertencia"
          );

          return;
        }

        this.estado.horaInicioIngreso =
          horaInicio;

        this.estado.recepcionActual = {
          idRecepcion: "",
          turno: "",
          horaInicio: horaInicio,
          material: this.estado.materialSeleccionado.id || this.estado.materialSeleccionado.material,
          detalle: this.estado.materialSeleccionado.descripcion || "",
          estado: "PENDIENTE DISTRIBUCION"
        };

        this.mostrarParticipantesIngreso();

      };

  },


  async iniciarNuevaRecepcion() {

    /*
     * Compatibilidad con referencias antiguas.
     * Esta función ya no escribe en Google Sheets sin material.
     * La creación real se realiza exclusivamente desde
     * crearRecepcionConMaterial(material).
     */
    if (!this.estado.horaInicioIngreso) {
      this.notificar(
        "Indique la hora real de inicio antes de seleccionar el material.",
        "advertencia"
      );
      this.mostrarInicioNuevaRecepcion();
      return;
    }

    this.estado.recepcionActual = {
      idRecepcion: "",
      turno: "",
      horaInicio: this.estado.horaInicioIngreso,
      estado: "PENDIENTE MATERIAL"
    };

    this.renderSeleccionMaterial();

  },


  async crearRecepcionConMaterial(material) {

    const sesion = this.obtenerSesion();

    const codigoMaterial = String(
      material && (material.id || material.material) || ""
    ).trim();

    const detalleMaterial = String(
      material && material.descripcion || ""
    ).trim();

    if (!codigoMaterial) {
      this.notificar(
        "Debe seleccionar un material antes de iniciar la recepción.",
        "advertencia"
      );
      return;
    }

    this.mostrarCarga(
      "Validando material",
      "Comprobando si existe una recepción en curso."
    );

    try {

      const respuesta = await API.post({
        action: "iniciarRecepcionMateriales",
        usuarioId:
          sesion.id ||
          sesion.ID_Usuario ||
          sesion.usuario ||
          "",
        usuarioNombre:
          sesion.nombre ||
          sesion.Nombre ||
          "Usuario",
        soloValidar: true,
        material:
          codigoMaterial,
        detalle:
          detalleMaterial
      });

      if (
        respuesta &&
        respuesta.ok !== true &&
        respuesta.codigo === "RECEPCION_MATERIAL_EN_CURSO" &&
        respuesta.data &&
        respuesta.data.recepcionExistente
      ) {
        this.mostrarRecepcionMaterialEnCurso(
          respuesta.data.recepcionExistente,
          codigoMaterial,
          detalleMaterial
        );
        return;
      }

      if (!respuesta || respuesta.ok !== true) {
        throw new Error(
          respuesta && respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible iniciar la recepción."
        );
      }

      this.estado.recepcionActual = null;
      this.estado.materialSeleccionado = material;
      this.estado.distribucion = {};
      this.estado.camaraActiva = "";
      this.estado.resumenAcumulado = null;
      this.estado.tieneRegistrosPrevios = false;

      const titulo = document.getElementById(
        "tituloAsistenteRecepcion"
      );

      if (titulo) {
        titulo.textContent = detalleMaterial || codigoMaterial;
      }

      this.mostrarInicioNuevaRecepcion();

    } catch (error) {

      this.notificar(
        error.message ||
        "No fue posible validar el material.",
        "error"
      );

    } finally {
      this.ocultarCarga();
    }

  },


  mostrarRecepcionMaterialEnCurso(
    recepcion,
    material,
    detalle
  ) {

    const panel = this.obtenerContenedorAsistente();

    if (!panel) {
      return;
    }

    panel.innerHTML = `
      <section class="recepcion-paso recepcion-material-en-curso">

        <div class="recepcion-en-curso-icono">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <span class="recepcion-en-curso-etiqueta">
          Recepción existente
        </span>

        <h3>
          Ya existe una recepción en curso de este material
        </h3>

        <div class="recepcion-en-curso-material">
          <strong>${this.escapar(material)}</strong>
          <span>${this.escapar(detalle || recepcion.detalle || "")}</span>
        </div>

        <p>
          Producción todavía no ha finalizado la recepción de este material.
          Continúe la recepción existente antes de crear una nueva.
        </p>

        <div class="recepcion-en-curso-datos">
          <span>Recepción</span>
          <strong>${this.escapar(recepcion.idRecepcion || "-")}</strong>
        </div>

        <div class="recepcion-acciones-finales">
          <button
            type="button"
            id="btnVolverSeleccionMaterial"
            class="btn-recepcion secundario"
          >
            <i class="fa-solid fa-arrow-left"></i>
            Volver
          </button>

          <button
            type="button"
            id="btnContinuarRecepcionExistente"
            class="btn-recepcion principal"
          >
            <i class="fa-solid fa-arrow-right"></i>
            Continuar recepción
          </button>
        </div>

      </section>
    `;

    document
      .getElementById("btnVolverSeleccionMaterial")
      .onclick = () => this.renderSeleccionMaterial();

    document
      .getElementById("btnContinuarRecepcionExistente")
      .onclick = () =>
        this.abrirRecepcion(
          recepcion.idRecepcion
        );

  },


  async abrirRecepcion(idRecepcion) {

    if (this.esGerencia()) {
      Sistema.advertencia("Gerencia dispone únicamente de consulta en Recepciones.");
      return;
    }

    if (
      !Sistema.exigirPermiso(
        "RECEPCIONES_CONTINUAR",
        "No tiene permiso para continuar recepciones."
      )
    ) {
      return;
    }

    this.estado.horaInicioIngreso = "";

    this.abrirAsistente(
      "Continuar Recepción"
    );

    this.mostrarCarga(
      "Abriendo recepción",
      "Consultando el avance acumulado."
    );

    try {

      const respuesta = await API.post({
        action: "obtenerRecepcionMateriales",
        idRecepcion: idRecepcion
      });

      if (!respuesta || respuesta.ok !== true) {
        throw new Error(
          respuesta && respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible abrir la recepción."
        );
      }

      this.estado.recepcionActual =
        respuesta.data.recepcion;

      const detalles =
        Array.isArray(respuesta.data.detalles)
          ? respuesta.data.detalles
          : [];

      this.estado.tieneRegistrosPrevios =
        detalles.length > 0;

      this.estado.distribucion = {};

		/*
		 * Ninguna cámara se selecciona automáticamente.
		 * El auxiliar debe pulsar la cámara correcta.
		 */
		this.estado.camaraActiva = "";

      if (detalles.length) {

        const primero = detalles[0];
        const ultimo =
          detalles[detalles.length - 1];

        const camarasUsadas = {};

        detalles.forEach(item => {

          if (!item.idCamara) {
            return;
          }

          camarasUsadas[item.idCamara] = {
            idCamara: item.idCamara,
            codigo:
              item.camaraCodigo ||
              item.idCamara,
            nombre:
              item.camaraNombre ||
              item.idCamara
          };

        });

        this.estado.materialSeleccionado = {
          id: primero.material,
          material: primero.material,
          descripcion: primero.descripcion,
          baseEstandar: primero.baseEstandar,
          alturaEstandar: primero.alturaEstandar,
          cantidadEstandarPallet:
            primero.cantidadEstandarPallet,
          umb: primero.umb,
          um: primero.um
        };

        this.estado.resumenAcumulado = {
          totalTarimas:
            Number(
              this.estado.recepcionActual
                .totalTarimas || 0
            ),
          totalParciales:
            Number(
              this.estado.recepcionActual
                .totalParciales || 0
            ),
          totalPosiciones:
            Number(
              this.estado.recepcionActual
                .totalPosicionesOcupadas || 0
            ),
          totalUnidades:
            Number(
              this.estado.recepcionActual
                .totalUnidades || 0
            ),
          camaras:
            Object.values(camarasUsadas),
          ultimoAuxiliar:
            ultimo.auxiliarNombre || "-",
          ultimaHora:
            ultimo.horaRegistro || "-"
        };

        const titulo =
          document.getElementById(
            "tituloAsistenteRecepcion"
          );

        if (titulo) {
          titulo.textContent =
            this.estado.materialSeleccionado
              .descripcion ||
            (
              "Recepción · " +
              this.estado.recepcionActual
                .idRecepcion
            );
        }

        /*
         * Los ingresos anteriores son históricos.
         * El nuevo registro comienza con campos vacíos.
         */
        this.estado.distribucion = {};
        this.estado.horaInicioIngreso = "";

        this.mostrarOrigenNuevoIngreso();

      } else {

        this.estado.resumenAcumulado = null;

        /*
         * Una recepción puede tener su material guardado en el
         * encabezado aunque todavía no posea líneas de detalle.
         * Continuarla no debe pedir nuevamente el producto ni crear
         * otra recepción: se recupera su ficha y se solicita únicamente
         * el origen y la hora del nuevo ingreso.
         */
        const recepcion =
          this.estado.recepcionActual || {};

        const codigoMaterial = String(
          recepcion.material ||
          recepcion.Material ||
          ""
        ).trim();

        const titulo =
          document.getElementById(
            "tituloAsistenteRecepcion"
          );

        if (codigoMaterial) {

          const respuestaMaterial = await API.post({
            action: "buscarMaterialesRecepcionMateriales",
            busqueda: codigoMaterial,
            limite: 20
          });

          if (!respuestaMaterial || respuestaMaterial.ok !== true) {
            throw new Error(
              respuestaMaterial && respuestaMaterial.mensaje
                ? respuestaMaterial.mensaje
                : "No fue posible recuperar el material de la recepción."
            );
          }

          const materiales =
            Array.isArray(respuestaMaterial.data)
              ? respuestaMaterial.data
              : Array.isArray(
                  respuestaMaterial.data &&
                  respuestaMaterial.data.materiales
                )
                ? respuestaMaterial.data.materiales
                : [];

          const materialExistente = materiales.find(item =>
            String(
              item.id ||
              item.material ||
              item.ID_Material ||
              ""
            ).trim() === codigoMaterial
          );

          if (!materialExistente) {
            throw new Error(
              "El material " +
              codigoMaterial +
              " de esta recepción no está disponible en el catálogo."
            );
          }

          this.estado.materialSeleccionado = {
            ...materialExistente,
            id:
              materialExistente.id ||
              materialExistente.material ||
              codigoMaterial,
            material:
              materialExistente.material ||
              materialExistente.id ||
              codigoMaterial,
            descripcion:
              materialExistente.descripcion ||
              recepcion.detalle ||
              recepcion.Detalle ||
              ""
          };

          if (titulo) {
            titulo.textContent =
              this.estado.materialSeleccionado.descripcion ||
              ("Recepción · " + recepcion.idRecepcion);
          }

          this.estado.distribucion = {};
          this.estado.horaInicioIngreso = "";

          this.mostrarOrigenNuevoIngreso();

          return;
        }

        this.estado.materialSeleccionado = null;

        if (titulo) {
          titulo.textContent =
            "Recepción · " +
            recepcion.idRecepcion;
        }

        /* Compatibilidad con encabezados antiguos sin material. */
        this.renderSeleccionMaterial();

      }

    } catch (error) {

      this.notificar(
        error.message ||
        "No fue posible abrir la recepción.",
        "error"
      );

    } finally {

      this.ocultarCarga();

    }

  },


  renderBarraRecepcion() {

    const r = this.estado.recepcionActual || {};

    return `
      <div class="barra-recepcion-actual">

        <div>
          <span>Recepción</span>
          <strong>
            ${this.escapar(r.idRecepcion || "-")}
          </strong>
        </div>

        <div>
          <span>Turno</span>
          <strong>
            ${this.escapar(r.turno || "-")}
          </strong>
        </div>

        <div>
          <span>Hora inicio</span>
          <strong>
            ${this.escapar(
              this.formatearHoraRecepcion(
                r.horaInicio
              )
            )}
          </strong>
        </div>

        <button
          type="button"
          id="btnSalirRecepcionActual"
          class="btn-recepcion secundario"
        >
          <i class="fa-solid fa-arrow-left"></i>
          Recepciones
        </button>

      </div>
    `;

  },


  renderSeleccionMaterial() {

    const panel =
      this.obtenerContenedorAsistente();

    if (!panel) {
      return;
    }

    panel.innerHTML = `
      ${this.estado.recepcionActual && this.estado.recepcionActual.idRecepcion ? this.renderBarraRecepcion() : ""}

      ${this.renderAvanceAcumuladoRecepcion()}

      <section class="recepcion-paso">

        <header class="recepcion-paso-encabezado">
          <div class="numero-paso-recepcion">1</div>
          <div>
            <span>Selección del producto</span>
            <h3>¿Qué material estás recibiendo?</h3>
          </div>
        </header>

        <div class="buscador-material-recepcion">
          <i class="fa-solid fa-magnifying-glass"></i>

          <input
            type="search"
            id="inputBuscarMaterialRecepcion"
            placeholder="Escribe código o descripción"
            autocomplete="off"
          >

          <button
            type="button"
            id="btnEscanearMaterialRecepcion"
            aria-label="Escanear código"
          >
            <i class="fa-solid fa-qrcode"></i>
          </button>
        </div>

        <div
          id="resultadosMaterialRecepcion"
          class="resultados-material-recepcion"
        >
          <div class="ayuda-busqueda-recepcion">
            <i class="fa-solid fa-circle-info"></i>
            <span>
              Escribe al menos 2 caracteres.
            </span>
          </div>
        </div>

      </section>
    `;

    const botonSalirRecepcion = document.getElementById("btnSalirRecepcionActual");
    if (botonSalirRecepcion) {
      botonSalirRecepcion.onclick = () => this.cerrarAsistente();
    }

    const input =
      document.getElementById(
        "inputBuscarMaterialRecepcion"
      );

    let temporizador = null;

    input.oninput = () => {

      window.clearTimeout(temporizador);

      temporizador = window.setTimeout(
        () => this.buscarMaterial(input.value),
        300
      );

    };

    document
      .getElementById("btnEscanearMaterialRecepcion")
      .onclick = () => {

        this.notificar(
          "El lector QR se conectará en la siguiente etapa.",
          "advertencia"
        );

      };

  },


  async buscarMaterial(valor) {

    const busqueda =
      String(valor || "").trim();

    const contenedor =
      document.getElementById(
        "resultadosMaterialRecepcion"
      );

    if (!contenedor) {
      return;
    }

    if (busqueda.length < 2) {

      contenedor.innerHTML = `
        <div class="ayuda-busqueda-recepcion">
          <i class="fa-solid fa-circle-info"></i>
          <span>Escribe al menos 2 caracteres.</span>
        </div>
      `;

      return;
    }

    contenedor.innerHTML = `
      <div class="busqueda-material-cargando">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Buscando materiales...
      </div>
    `;

    try {

      const respuesta = await API.post({
        action: "buscarMaterialesRecepcionMateriales",
        busqueda: busqueda,
        limite: 20
      });

      if (!respuesta || respuesta.ok !== true) {
        throw new Error(
          respuesta && respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible buscar materiales."
        );
      }

      this.estado.resultadosMateriales =
        Array.isArray(respuesta.data)
          ? respuesta.data
          : [];

      this.renderResultadosMateriales();

    } catch (error) {

      contenedor.innerHTML = `
        <div class="error-busqueda-recepcion">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${this.escapar(error.message)}</span>
        </div>
      `;

    }

  },


  renderResultadosMateriales() {

    const contenedor =
      document.getElementById(
        "resultadosMaterialRecepcion"
      );

    const lista = this.estado.resultadosMateriales;

    if (!contenedor) {
      return;
    }

    if (!lista.length) {

      contenedor.innerHTML = `
        <div class="recepcion-vacia compacta">
          <p>No se encontraron materiales activos.</p>
        </div>
      `;

      return;
    }

    contenedor.innerHTML =
      lista.map(material => `
        <button
          type="button"
          class="resultado-material-recepcion"
          data-material="${this.escapar(
            material.id || material.material
          )}"
        >
          <div>
            <strong>
              ${this.escapar(
                material.id || material.material
              )}
            </strong>
            <span>
              ${this.escapar(material.descripcion)}
            </span>
          </div>

          <div class="estandar-material-recepcion">
            <span>Estándar pallet</span>
            <strong>
              ${this.formatearNumero(
                material.cantidadEstandarPallet
              )}
            </strong>
          </div>

          <i class="fa-solid fa-chevron-right"></i>
        </button>
      `).join("");

    contenedor
      .querySelectorAll("[data-material]")
      .forEach(boton => {

        boton.onclick = () => {

          const material = lista.find(item =>
            String(item.id || item.material) ===
            boton.dataset.material
          );

          if (!material) {
            return;
          }

          /*
           * Si todavía no existe un ID de recepción, estamos creando
           * una nueva. La validación del material se hace ANTES de
           * insertar cualquier encabezado en Google Sheets.
           */
          if (
            !this.estado.recepcionActual ||
            !this.estado.recepcionActual.idRecepcion
          ) {
            this.crearRecepcionConMaterial(material);
            return;
          }

          this.estado.materialSeleccionado = material;
          this.estado.distribucion = {};

          /*
           * Ninguna cámara queda seleccionada automáticamente.
           * El auxiliar debe indicar primero dónde colocó el material.
           */
          this.estado.camaraActiva = "";
          this.renderDistribucionCamaras();

        };

      });

  },


  renderAvanceAcumuladoRecepcion() {

    if (
      !this.estado.tieneRegistrosPrevios ||
      !this.estado.resumenAcumulado
    ) {
      return "";
    }

    const resumen =
      this.estado.resumenAcumulado;

    const material =
      this.estado.materialSeleccionado || {};

    const camaras =
      Array.isArray(resumen.camaras)
        ? resumen.camaras
        : [];

    return `
      <article class="avance-acumulado-recepcion">

        <header>

          <div>
            <span>Avance acumulado</span>

            <h3>
              ${this.escapar(
                material.descripcion ||
                "Material en recepción"
              )}
            </h3>

            <small>
              ${this.escapar(
                material.id ||
                material.material ||
                ""
              )}
            </small>
          </div>

          <div class="ultimo-ingreso-recepcion">
            <span>Último ingreso</span>

            <strong>
              ${this.escapar(
                resumen.ultimoAuxiliar || "-"
              )}
            </strong>

            <small>
              ${this.escapar(
                resumen.ultimaHora || "-"
              )}
            </small>
          </div>

        </header>

        <div class="metricas-avance-recepcion">

          <div>
            <span>Tarimas</span>
            <strong>
              ${this.formatearNumero(
                resumen.totalTarimas
              )}
            </strong>
          </div>

          <div>
            <span>Parciales</span>
            <strong>
              ${this.formatearNumero(
                resumen.totalParciales
              )}
            </strong>
          </div>

          <div>
            <span>Posiciones</span>
            <strong>
              ${this.formatearNumero(
                resumen.totalPosiciones
              )}
            </strong>
          </div>

          <div>
            <span>Unidades</span>
            <strong>
              ${this.formatearNumero(
                resumen.totalUnidades
              )}
            </strong>
          </div>

        </div>

        <div class="camaras-avance-recepcion">

          <span>Cámaras utilizadas</span>

          <div>
            ${
              camaras.length
                ? camaras
                    .map(
                      camara => `
                        <span class="etiqueta-camara-avance">
                          ${this.escapar(
                            camara.codigo ||
                            camara.nombre
                          )}
                        </span>
                      `
                    )
                    .join("")
                : `
                    <span class="sin-camaras-avance">
                      Sin cámaras registradas
                    </span>
                  `
            }
          </div>

        </div>

      </article>

      <div class="separador-nuevo-ingreso">
        <span>Nuevo ingreso</span>
        <strong>
          Registra solamente lo recibido ahora.
        </strong>
      </div>
    `;

  },


  async mostrarParticipantesIngreso() {

    const panel = this.obtenerContenedorAsistente();
    if (!panel || !this.estado.materialSeleccionado) return;

    if (!Array.isArray(this.estado.colaboradoresRecepcion)) {
      this.mostrarCarga("Cargando colaboradores", "Preparando los participantes de la recepción.");
      try {
        const respuesta = await API.post({ action: "listarAuxiliaresRecepcionMateriales" });
        if (!respuesta || respuesta.ok !== true) {
          throw new Error(respuesta && respuesta.mensaje || "No fue posible consultar los colaboradores.");
        }
        this.estado.colaboradoresRecepcion = Array.isArray(respuesta.data && respuesta.data.colaboradores)
          ? respuesta.data.colaboradores
          : [];
      } catch (error) {
        this.notificar(error.message || "No fue posible cargar los colaboradores.", "error");
        return;
      } finally {
        this.ocultarCarga();
      }
    }

    const sesion = this.obtenerSesion();
    const idActual = String(sesion.id || sesion.ID_Usuario || sesion.IDEmpleado || sesion.usuario || "").trim();
    const nombreActual = String(sesion.nombre || sesion.Nombre || "Usuario").trim();
    const opciones = this.estado.colaboradoresRecepcion
      .filter(colaborador => String(colaborador.id || "").trim() !== idActual)
      .map(colaborador => `<option value="${this.escapar(colaborador.id)}">${this.escapar(colaborador.nombre)}${colaborador.turno ? " · " + this.escapar(colaborador.turno) : ""}</option>`)
      .join("");

    panel.innerHTML = `
      ${this.estado.recepcionActual && this.estado.recepcionActual.idRecepcion ? this.renderBarraRecepcion() : ""}
      <section class="recepcion-paso recepcion-participantes-paso">
        <header class="recepcion-paso-encabezado">
          <button type="button" id="btnVolverOrigenParticipantes" class="btn-icono-recepcion" aria-label="Volver al origen"><i class="fa-solid fa-arrow-left"></i></button>
          <div><span>Equipo de recepción</span><h3>¿Quiénes participaron en este ingreso?</h3></div>
        </header>
        <div class="recepcion-participante-principal"><i class="fa-solid fa-user-check"></i><div><strong>${this.escapar(nombreActual)}</strong><span>Responsable que registra la recepción</span></div></div>
        <p class="recepcion-participantes-ayuda">Puedes agregar hasta cuatro compañeros adicionales. Si trabajaste solo, continúa sin seleccionar ninguno.</p>
        <div class="recepcion-participantes-grid">${[0,1,2,3].map(indice => `<label>Colaborador ${indice + 2}<select class="recepcion-participante-select" data-participante="${indice}"><option value="">Seleccionar colaborador...</option>${opciones}</select></label>`).join("")}</div>
        <div class="recepcion-acciones-finales"><button type="button" id="btnConfirmarParticipantesRecepcion" class="btn-recepcion principal"><i class="fa-solid fa-arrow-right"></i> Continuar</button></div>
      </section>`;

    panel.querySelectorAll(".recepcion-participante-select").forEach(select => {
      select.addEventListener("change", () => {
        const seleccionados = new Set(Array.from(panel.querySelectorAll(".recepcion-participante-select"))
          .map(item => item.value).filter(Boolean));
        panel.querySelectorAll(".recepcion-participante-select").forEach(item => {
          Array.from(item.options).forEach(opcion => {
            opcion.disabled = Boolean(opcion.value && opcion.value !== item.value && seleccionados.has(opcion.value));
          });
        });
      });
    });

    document.getElementById("btnVolverOrigenParticipantes").onclick = () => {
      if (this.estado.recepcionActual && this.estado.recepcionActual.idRecepcion) {
        this.mostrarOrigenNuevoIngreso();
      } else {
        this.mostrarInicioNuevaRecepcion();
      }
    };

    document.getElementById("btnConfirmarParticipantesRecepcion").onclick = () => {
      this.estado.participantesIngreso = Array.from(panel.querySelectorAll(".recepcion-participante-select"))
        .map(select => this.estado.colaboradoresRecepcion.find(colaborador => String(colaborador.id) === select.value))
        .filter(Boolean)
        .map(colaborador => ({ id: colaborador.id, nombre: colaborador.nombre }));
      this.renderDistribucionCamaras();
    };

    const botonSalir = document.getElementById("btnSalirRecepcionActual");
    if (botonSalir) botonSalir.onclick = () => this.cerrarAsistente();
  },

mostrarOrigenNuevoIngreso() {

  const panel =
    this.obtenerContenedorAsistente();


  if (!panel) {
    return;
  }


  this.estado.origenTraslado =
    "";

  this.estado.horaInicioIngreso =
    "";


  panel.innerHTML = `

    ${this.renderBarraRecepcion()}


    ${this.renderAvanceAcumuladoRecepcion()}


    <section class="recepcion-paso">

      <header class="recepcion-paso-encabezado">

        <div class="numero-paso-recepcion">
          1
        </div>

        <div>

          <span>
            Nuevo ingreso
          </span>

          <h3>
            ¿Cómo recibiste este material ahora?
          </h3>

        </div>

      </header>


      <p class="ayuda-origen-nuevo-ingreso">

        Selecciona la vía utilizada únicamente para este nuevo ingreso.
        Los registros anteriores no serán modificados.

      </p>


      <div class="origen-recepcion-grid">

        <button
          type="button"
          class="opcion-origen-recepcion"
          data-origen-nuevo-ingreso="Carritos"
        >

          <i class="fa-solid fa-dolly"></i>

          <strong>
            Carritos
          </strong>

          <span>
            Traslado desde Producción por carritos.
          </span>

        </button>


        <button
          type="button"
          class="opcion-origen-recepcion"
          data-origen-nuevo-ingreso="Túnel refrigerador"
        >

          <i class="fa-solid fa-temperature-low"></i>

          <strong>
            Túnel refrigerador
          </strong>

          <span>
            Entrada directa desde el túnel.
          </span>

        </button>

      </div>


      <div class="campo-hora-inicio-recepcion">

        <label for="inputHoraInicioNuevoIngreso">
          Hora en que comenzó a recibir
        </label>

        <input
          type="time"
          id="inputHoraInicioNuevoIngreso"
          step="60"
          required
        >

        <small>
          Indique la hora real de inicio de este ingreso. La hora final se registrará automáticamente al guardar.
        </small>

      </div>


      <div class="recepcion-acciones-finales">

        <button
          type="button"
          id="btnContinuarOrigenNuevoIngreso"
          class="btn-recepcion principal"
          disabled
        >

          <i class="fa-solid fa-arrow-right"></i>

          Continuar

        </button>

      </div>

    </section>

  `;


  const botonContinuar =
    document.getElementById(
      "btnContinuarOrigenNuevoIngreso"
    );


  panel
    .querySelectorAll(
      "[data-origen-nuevo-ingreso]"
    )
    .forEach(
      boton => {

        boton.onclick =
          () => {

            panel
              .querySelectorAll(
                "[data-origen-nuevo-ingreso]"
              )
              .forEach(
                item => {

                  item.classList.remove(
                    "activo"
                  );

                }
              );


            boton.classList.add(
              "activo"
            );


            this.estado.origenTraslado =
              boton.dataset
                .origenNuevoIngreso;


            if (botonContinuar) {

              botonContinuar.disabled =
                false;

            }

          };

      }
    );


  if (botonContinuar) {

    botonContinuar.onclick =
      () => {

        if (
          !this.estado.origenTraslado
        ) {

          this.notificar(
            "Seleccione la vía utilizada para este ingreso.",
            "advertencia"
          );

          return;

        }


        const inputHora =
          document.getElementById(
            "inputHoraInicioNuevoIngreso"
          );


        const horaInicio =
          inputHora
            ? String(inputHora.value || "").trim()
            : "";


        if (!horaInicio) {

          this.notificar(
            "Indique la hora en que comenzó a recibir este ingreso.",
            "advertencia"
          );

          return;

        }


        this.estado.horaInicioIngreso =
          horaInicio;


        this.mostrarParticipantesIngreso();

      };

  }


  const salir =
    document.getElementById(
      "btnSalirRecepcionActual"
    );


  if (salir) {

    salir.onclick =
      () => this.cerrarAsistente();

  }

},

  renderDistribucionCamaras() {

    const panel =
      this.obtenerContenedorAsistente();

    if (!panel) {
      return;
    }

    const material =
      this.estado.materialSeleccionado || {};

    panel.innerHTML = `
      ${this.renderBarraRecepcion()}

      <section class="recepcion-paso">

        <header class="recepcion-paso-encabezado">
          <div class="numero-paso-recepcion">2</div>
          <div>
            <span>Distribución por cámaras</span>
            <h3>¿Dónde colocaste el material?</h3>
          </div>
        </header>

        <article class="material-seleccionado-recepcion">
          <div class="material-seleccionado-icono">
            <i class="fa-solid fa-box-open"></i>
          </div>

          <div>
            <span>Material seleccionado</span>
            <strong>
              ${this.escapar(
                material.id || material.material || "-"
              )}
            </strong>
            <p>
              ${this.escapar(material.descripcion || "-")}
            </p>
          </div>

          <div class="material-estandar-destacado">
            <span>Estándar pallet</span>
            <strong>
              ${this.formatearNumero(
                material.cantidadEstandarPallet
              )}
            </strong>
          </div>
        </article>

        <div class="pestanas-camaras-recepcion">
          ${this.renderPestanasCamaras()}
        </div>

        <div id="contenidoCamaraRecepcion">
          ${this.renderCamaraActiva()}
        </div>

        <div class="resumen-distribucion-recepcion">
          ${this.renderResumenDistribucion()}
        </div>

        <div class="recepcion-acciones-finales">

          ${
            !this.estado.tieneRegistrosPrevios
              ? `
                  <button
                    type="button"
                    id="btnCambiarMaterialRecepcion"
                    class="btn-recepcion secundario"
                  >
                    <i class="fa-solid fa-rotate-left"></i>
                    Cambiar material
                  </button>
                `
              : ""
          }

          <button
            type="button"
            id="btnGuardarDistribucionRecepcion"
            class="btn-recepcion principal"
          >
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar material
          </button>
        </div>

      </section>
    `;

    this.conectarEventosDistribucion();

  },


  renderPestanasCamaras() {

    return this.estado.camaras.map(camara => {

      const datos =
        this.obtenerDatosCamara(camara.idCamara);

      const usada =
        Number(datos.tarimasCompletas || 0) > 0 ||
        Number(datos.parcialUnidades || 0) > 0;

      const activa =
        camara.idCamara === this.estado.camaraActiva;

      return `
        <button
          type="button"
          class="
            pestana-camara-recepcion
            ${usada ? "completada" : "sin-usar"}
            ${activa ? "activa" : ""}
          "
          data-camara="${this.escapar(
            camara.idCamara
          )}"
        >
          <span>
            ${this.escapar(
              camara.codigo || camara.nombre
            )}
          </span>

          <small>
            ${this.escapar(camara.nombre)}
          </small>

          <i class="fa-solid ${
            usada
              ? "fa-circle-check"
              : "fa-circle"
          }"></i>
        </button>
      `;

    }).join("");

  },


  renderCamaraActiva() {
if (
  !this.estado.camaraActiva
) {

  return `

    <div class="estado-seleccionar-camara-recepcion">

      <div class="estado-seleccionar-camara-icono">

        <i class="fa-solid fa-hand-pointer"></i>

      </div>

      <div>

        <strong>
          Selecciona una cámara
        </strong>

        <span>
          Pulsa la cámara donde colocaste el material
          para registrar las tarimas y el parcial.
        </span>

      </div>

    </div>

  `;

}

    const camara = this.estado.camaras.find(
      item => item.idCamara === this.estado.camaraActiva
    );

    if (!camara) {
      return `
        <div class="recepcion-vacia compacta">
          <p>No existen cámaras activas.</p>
        </div>
      `;
    }

    const datos =
      this.obtenerDatosCamara(camara.idCamara);

    const estandar =
      Number(
        this.estado.materialSeleccionado
          .cantidadEstandarPallet || 0
      );

    const posiciones =
      this.calcularPosiciones(datos);

    const unidades =
      this.calcularUnidades(datos);

    const tieneParcial =
      Number(datos.parcialUnidades || 0) > 0;

    const porcentaje =
      estandar > 0
        ? Math.min(
            100,
            Math.round(
              Number(datos.parcialUnidades || 0) /
              estandar *
              100
            )
          )
        : 0;

    return `
      <article class="tarjeta-camara-captura">

        <header>
          <div>
            <span>Cámara activa</span>
            <h4>${this.escapar(camara.nombre)}</h4>
          </div>

          <div class="capacidad-camara-recepcion">
            <span>Capacidad</span>
            <strong>
              ${this.formatearNumero(
                camara.capacidadPosiciones
              )}
            </strong>
            <small>posiciones</small>
          </div>
        </header>

        <div class="campo-pregunta-recepcion">

          <label for="inputTarimasCamara">
            ¿Cuántas tarimas completas colocaste aquí?
          </label>

          <div class="control-numero-recepcion">

            <button
              type="button"
              data-ajustar-tarimas="-1"
            >
              <i class="fa-solid fa-minus"></i>
            </button>

            <input
              type="number"
              id="inputTarimasCamara"
              min="0"
              step="1"
              value="${Number(
                datos.tarimasCompletas || 0
              )}"
            >

            <button
              type="button"
              data-ajustar-tarimas="1"
            >
              <i class="fa-solid fa-plus"></i>
            </button>

          </div>

        </div>

        <div class="campo-pregunta-recepcion">

          <span class="etiqueta-pregunta-recepcion">
            ¿Colocaste un parcial?
          </span>

          <div class="selector-binario-recepcion">

            <button
              type="button"
              data-tiene-parcial="NO"
              class="${!tieneParcial ? "activo" : ""}"
            >
              No
            </button>

            <button
              type="button"
              data-tiene-parcial="SI"
              class="${tieneParcial ? "activo" : ""}"
            >
              Sí
            </button>

          </div>

        </div>

        ${
          tieneParcial
            ? `
              <div class="bloque-parcial-recepcion">

                <div class="campo-pregunta-recepcion">
                  <label for="inputParcialCamara">
                    ¿Cuántas unidades tiene el parcial?
                  </label>

                  <input
                    type="number"
                    id="inputParcialCamara"
                    class="input-parcial-recepcion"
                    min="1"
                    max="${Math.max(0, estandar - 1)}"
                    value="${Number(
                      datos.parcialUnidades || 0
                    )}"
                  >
                </div>

                <div class="progreso-parcial-recepcion">
                  <div>
                    <span>Parcial</span>
                    <strong>
                      ${this.formatearNumero(
                        datos.parcialUnidades
                      )}
                      /
                      ${this.formatearNumero(estandar)}
                    </strong>
                  </div>

                  <div class="barra-progreso-parcial">
                    <span style="width:${porcentaje}%"></span>
                  </div>
                </div>

                <div class="campo-pregunta-recepcion">
                  <span class="etiqueta-pregunta-recepcion">
                    ¿El parcial ocupa una posición?
                  </span>

                  <div class="selector-binario-recepcion">

                    <button
                      type="button"
                      data-parcial-posicion="NO"
                      class="${
                        datos.parcialOcupaPosicion !== "SI"
                          ? "activo"
                          : ""
                      }"
                    >
                      No
                    </button>

                    <button
                      type="button"
                      data-parcial-posicion="SI"
                      class="${
                        datos.parcialOcupaPosicion === "SI"
                          ? "activo"
                          : ""
                      }"
                    >
                      Sí
                    </button>

                  </div>
                </div>

              </div>
            `
            : ""
        }

        <footer class="resultado-camara-recepcion">

          <div>
            <span>Posiciones</span>
            <strong>
              ${this.formatearNumero(posiciones)}
            </strong>
          </div>

          <div>
            <span>Unidades</span>
            <strong>
              ${this.formatearNumero(unidades)}
            </strong>
          </div>

        </footer>

      </article>
    `;

  },


  conectarEventosDistribucion() {

    document
      .querySelectorAll("[data-camara]")
      .forEach(boton => {

        boton.onclick =
  () => {

    const idCamara =
      boton.dataset.camara;


    if (!idCamara) {
      return;
    }


    this.estado.camaraActiva =
      idCamara;


    this.renderDistribucionCamaras();


    /*
     * Después del render, desplaza suavemente
     * el formulario hacia la zona visible.
     */
    requestAnimationFrame(
      () => {

        const contenido =
          document.getElementById(
            "contenidoCamaraRecepcion"
          );


        if (contenido) {

          contenido.classList.add(
            "camara-recepcion-desplegada"
          );


          contenido.scrollIntoView({
            behavior:
              "smooth",

            block:
              "nearest"
          });

        }

      }
    );

  };

      });

    document
      .getElementById("btnSalirRecepcionActual")
      .onclick = () => this.cerrarAsistente();

    const cambiarMaterial =
      document.getElementById(
        "btnCambiarMaterialRecepcion"
      );

    if (cambiarMaterial) {

      cambiarMaterial.onclick = () => {
        this.estado.materialSeleccionado = null;
        this.estado.distribucion = {};
        this.renderSeleccionMaterial();
      };

    }

    document
      .getElementById("btnGuardarDistribucionRecepcion")
      .onclick = () => this.guardarDistribucion();

    const inputTarimas =
      document.getElementById("inputTarimasCamara");

    if (inputTarimas) {

      inputTarimas.onchange = () => {

        const datos =
          this.obtenerDatosCamara(
            this.estado.camaraActiva
          );

        datos.tarimasCompletas =
          Math.max(
            0,
            Math.trunc(
              Number(inputTarimas.value || 0)
            )
          );

        this.estado.distribucion[
          this.estado.camaraActiva
        ] = datos;

        this.renderDistribucionCamaras();

      };

    }

    document
      .querySelectorAll("[data-ajustar-tarimas]")
      .forEach(boton => {

        boton.onclick = () => {

          const datos =
            this.obtenerDatosCamara(
              this.estado.camaraActiva
            );

          datos.tarimasCompletas =
            Math.max(
              0,
              Number(datos.tarimasCompletas || 0) +
              Number(
                boton.dataset.ajustarTarimas
              )
            );

          this.estado.distribucion[
            this.estado.camaraActiva
          ] = datos;

          this.renderDistribucionCamaras();

        };

      });

    document
      .querySelectorAll("[data-tiene-parcial]")
      .forEach(boton => {

        boton.onclick = () => {

          const datos =
            this.obtenerDatosCamara(
              this.estado.camaraActiva
            );

          if (boton.dataset.tieneParcial === "SI") {
            datos.parcialUnidades =
              Math.max(
                1,
                Number(datos.parcialUnidades || 1)
              );
          } else {
            datos.parcialUnidades = 0;
            datos.parcialOcupaPosicion = "NO";
          }

          this.estado.distribucion[
            this.estado.camaraActiva
          ] = datos;

          this.renderDistribucionCamaras();

        };

      });

    const inputParcial =
      document.getElementById("inputParcialCamara");

    if (inputParcial) {

      inputParcial.onchange = () => {

        const datos =
          this.obtenerDatosCamara(
            this.estado.camaraActiva
          );

        datos.parcialUnidades =
          Math.max(
            0,
            Math.trunc(
              Number(inputParcial.value || 0)
            )
          );

        this.estado.distribucion[
          this.estado.camaraActiva
        ] = datos;

        this.renderDistribucionCamaras();

      };

    }

    document
      .querySelectorAll("[data-parcial-posicion]")
      .forEach(boton => {

        boton.onclick = () => {

          const datos =
            this.obtenerDatosCamara(
              this.estado.camaraActiva
            );

          datos.parcialOcupaPosicion =
            boton.dataset.parcialPosicion;

          this.estado.distribucion[
            this.estado.camaraActiva
          ] = datos;

          this.renderDistribucionCamaras();

        };

      });

  },


  obtenerDatosCamara(idCamara) {

    return Object.assign(
      {
        idCamara: idCamara,
        tarimasCompletas: 0,
        parcialUnidades: 0,
        parcialOcupaPosicion: "NO"
      },
      this.estado.distribucion[idCamara] || {}
    );

  },


  calcularPosiciones(datos) {

    return (
      Math.max(
        0,
        Math.trunc(
          Number(datos.tarimasCompletas || 0)
        )
      ) +
      (
        Number(datos.parcialUnidades || 0) > 0 &&
        datos.parcialOcupaPosicion === "SI"
          ? 1
          : 0
      )
    );

  },


  calcularUnidades(datos) {

    const estandar =
      Number(
        this.estado.materialSeleccionado
          .cantidadEstandarPallet || 0
      );

    return (
      Math.max(
        0,
        Math.trunc(
          Number(datos.tarimasCompletas || 0)
        )
      ) *
      estandar
    ) +
    Math.max(
      0,
      Math.trunc(
        Number(datos.parcialUnidades || 0)
      )
    );

  },


  obtenerDistribucionUtilizada() {

    return Object.values(
      this.estado.distribucion
    ).filter(item =>
      Number(item.tarimasCompletas || 0) > 0 ||
      Number(item.parcialUnidades || 0) > 0
    );

  },


  renderResumenDistribucion() {

    const lista =
      this.obtenerDistribucionUtilizada();

    const totales = lista.reduce(
      (acumulado, item) => {

        acumulado.tarimas +=
          Number(item.tarimasCompletas || 0);

        if (Number(item.parcialUnidades || 0) > 0) {
          acumulado.parciales++;
        }

        acumulado.posiciones +=
          this.calcularPosiciones(item);

        acumulado.unidades +=
          this.calcularUnidades(item);

        return acumulado;

      },
      {
        tarimas: 0,
        parciales: 0,
        posiciones: 0,
        unidades: 0
      }
    );

    return `
      <header>
        <span>Resumen de distribución</span>
        <strong>
          ${lista.length}
          ${
            lista.length === 1
              ? "cámara utilizada"
              : "cámaras utilizadas"
          }
        </strong>
      </header>

      <div class="resumen-distribucion-metricas">

        <div>
          <span>Tarimas</span>
          <strong>
            ${this.formatearNumero(totales.tarimas)}
          </strong>
        </div>

        <div>
          <span>Parciales</span>
          <strong>
            ${this.formatearNumero(totales.parciales)}
          </strong>
        </div>

        <div>
          <span>Posiciones</span>
          <strong>
            ${this.formatearNumero(totales.posiciones)}
          </strong>
        </div>

        <div>
          <span>Unidades</span>
          <strong>
            ${this.formatearNumero(totales.unidades)}
          </strong>
        </div>

      </div>
    `;

  },


 async guardarDistribucion() {

  const distribucion =
    this.obtenerDistribucionUtilizada();


  if (!distribucion.length) {

    this.notificar(
      "Registre tarimas o un parcial en al menos una cámara.",
      "advertencia"
    );

    return;

  }

  if (distribucion.reduce((total, item) => total + Number(item.tarimasCompletas || 0), 0) <= 0) {
    this.notificar("Debe registrar por lo menos una tarima para guardar la recepción.", "advertencia");
    return;
  }


  const fechaProduccion =
    await this.solicitarFechaProduccion();


  if (!fechaProduccion) {
    return;
  }


  const sesion =
    this.obtenerSesion();


  const recepcion =
    this.estado.recepcionActual;


  const material =
    this.estado.materialSeleccionado;


  let cargadorActivo =
    false;

	const origenIngreso =
	  this.estado.origenTraslado ||
	  (
		this.estado.recepcionActual
		  ? (
			  this.estado.recepcionActual.origenTraslado ||
			  this.estado.recepcionActual.Origen_Traslado ||
			  ""
			)
		  : ""
	  );


	if (!origenIngreso) {

	  this.notificar(
		"No se pudo recuperar la vía seleccionada. Regrese y seleccione Carritos o Túnel.",
		"advertencia"
	  );

	  return;

	}


    const horaInicioIngreso =
      String(
        this.estado.horaInicioIngreso ||
        ""
      ).trim();


    if (!horaInicioIngreso) {

      this.notificar(
        "No se encontró la hora de inicio de este ingreso. Regrese y selecciónela nuevamente.",
        "advertencia"
      );

      return;

    }

  try {

    /*
     * ETAPA 1:
     * Guardar las líneas de distribución.
     */
    this.mostrarCarga(
      "Guardando distribución",
      "Registrando el material en las cámaras seleccionadas."
    );


    cargadorActivo =
      true;


    const respuesta =
      await API.post({

        action:
          "guardarDistribucionMaterialRecepcion",

        idRecepcion:
          recepcion && recepcion.idRecepcion || "",

        material:
          material.id ||
          material.material,

        fechaProduccion:
          fechaProduccion,
		  
		origenTraslado:
			origenIngreso,

        horaInicio:
          horaInicioIngreso,

        auxiliarId:
          sesion.id ||
          sesion.ID_Usuario ||
          sesion.usuario ||
          "",

        auxiliarNombre:
          sesion.nombre ||
          sesion.Nombre ||
          "Usuario",

        detalle:
          material.descripcion || "",

        participantes:
          this.estado.participantesIngreso || [],

        distribucion:
          distribucion

      });


    if (
      !respuesta ||
      respuesta.ok !== true
    ) {

      throw new Error(
        respuesta &&
        respuesta.mensaje
          ? respuesta.mensaje
          : "No fue posible guardar la distribución."
      );

    }

    if (respuesta.data && respuesta.data.idRecepcion) {
      this.estado.recepcionActual = Object.assign({}, this.estado.recepcionActual || {}, {
        idRecepcion: respuesta.data.idRecepcion,
        material: material.id || material.material,
        detalle: material.descripcion || "",
        horaInicio: horaInicioIngreso,
        origenTraslado: origenIngreso
      });
    }


    /*
     * Las líneas ya fueron guardadas.
     * Se oculta el cargador para permitir responder
     * la pregunta sobre el estado de Producción.
     */
    this.ocultarCarga();


    cargadorActivo =
      false;


    this.notificar(
      respuesta.mensaje ||
      "Material guardado correctamente.",
      "exito"
    );


    /*
     * ETAPA 2:
     * Preguntar si Producción terminó.
     */
    const produccionFinalizada =
      await this.preguntarProduccionFinalizada();


    /*
     * ETAPA 3:
     * Actualizar el estado del encabezado.
     */
    this.mostrarCarga(
      produccionFinalizada
        ? "Finalizando recepción"
        : "Manteniendo recepción abierta",

      produccionFinalizada
        ? "Registrando el cierre del proceso productivo."
        : "Preparando la recepción para el próximo ingreso."
    );


    cargadorActivo =
      true;


    await this.actualizarEstadoProduccion(
      produccionFinalizada
        ? "SI"
        : "NO"
    );


    this.ocultarCarga();


    cargadorActivo =
      false;


    /*
     * ETAPA 4:
     * Cerrar el asistente y actualizar el centro.
     */
    await this.cerrarAsistenteDespuesDeGuardar();


  } catch (error) {

    this.notificar(
      error &&
      error.message
        ? error.message
        : "No fue posible completar la recepción.",
      "error"
    );


  } finally {

    /*
     * Evita dejar el cargador visible cuando ocurre
     * un error en cualquiera de las etapas.
     */
    if (cargadorActivo) {

      this.ocultarCarga(
        true
      );

    }

  }

},


 solicitarFechaProduccion() {

			  return new Promise(
				resolver => {

				  const modalAsistente =
			  document.querySelector(
				".modal-asistente-recepcion:not(.oculto)"
			  ) ||
			  document.querySelector(
				".modal-asistente-recepcion"
			  );


			if (!modalAsistente) {

			  this.notificar(
				"No se encontró el asistente de recepción.",
				"error"
			  );

			  resolver("");

			  return;

			}


      const existente =
        document.getElementById(
          "submodalFechaProduccionRecepcion"
        );


      if (existente) {

        existente.remove();

      }


      const hoy =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );


      const submodal =
        document.createElement(
          "div"
        );


      submodal.id =
        "submodalFechaProduccionRecepcion";


      submodal.className =
        "submodal-recepcion";


      submodal.innerHTML = `

        <div class="submodal-recepcion-contenido">

          <header class="submodal-recepcion-header">

            <div class="submodal-recepcion-icono">

              <i class="fa-solid fa-calendar-days"></i>

            </div>

            <div>

              <span>
                Datos de producción
              </span>

              <h3>
                Confirma la fecha de producción
              </h3>

            </div>

          </header>


          <div class="submodal-recepcion-cuerpo">

            <p>
              Selecciona la fecha indicada en la etiqueta del material.
              El sistema calculará automáticamente el lote y el vencimiento.
            </p>


            <label
              for="inputFechaProduccionRecepcion"
            >
              Fecha de producción
            </label>


            <input
              type="date"
              id="inputFechaProduccionRecepcion"
              value="${hoy}"
              max="${hoy}"
            >

          </div>


          <footer class="submodal-recepcion-acciones">

            <button
              type="button"
              id="btnCancelarFechaProduccion"
              class="btn-recepcion secundario"
            >

              Cancelar

            </button>


            <button
              type="button"
              id="btnConfirmarFechaProduccion"
              class="btn-recepcion principal"
            >

              <i class="fa-solid fa-check"></i>

              Confirmar y guardar

            </button>

          </footer>

        </div>

      `;


      modalAsistente.appendChild(
        submodal
      );


      const cerrar =
        valor => {

          submodal.remove();

          resolver(
            valor
          );

        };


      document
        .getElementById(
          "btnCancelarFechaProduccion"
        )
        .onclick =
          () => {

            cerrar("");

          };


      document
        .getElementById(
          "btnConfirmarFechaProduccion"
        )
        .onclick =
          () => {

            const input =
              document.getElementById(
                "inputFechaProduccionRecepcion"
              );


            const valor =
              input
                ? input.value
                : "";


            if (!valor) {

              this.notificar(
                "Debe indicar la fecha de producción.",
                "advertencia"
              );

              return;

            }


            cerrar(
              valor
            );

          };


      submodal.onclick =
        evento => {

          if (
            evento.target ===
            submodal
          ) {

            cerrar("");

          }

        };

    }
  );

},

  preguntarProduccionFinalizada() {

    return new Promise(resolver => {

      const modalAsistente =
        document.querySelector(
          ".modal-asistente-recepcion:not(.oculto)"
        ) ||
        document.querySelector(
          ".modal-asistente-recepcion"
        );

      if (!modalAsistente) {
        resolver(false);
        return;
      }

      const anterior =
        document.getElementById(
          "submodalProduccionFinalizadaRecepcion"
        );

      if (anterior) {
        anterior.remove();
      }

      const submodal = document.createElement("div");

      submodal.id =
        "submodalProduccionFinalizadaRecepcion";

      submodal.className = "submodal-recepcion";

      submodal.innerHTML = `
        <div class="submodal-recepcion-contenido">

          <header class="submodal-recepcion-header">
            <div class="submodal-recepcion-icono">
              <i class="fa-solid fa-industry"></i>
            </div>
            <div>
              <span>Estado de producción</span>
              <h3>¿Producción terminó este material?</h3>
            </div>
          </header>

          <div class="submodal-recepcion-cuerpo">
            <p>
              Si Producción continuará fabricando este mismo material,
              mantenga la recepción abierta para el próximo ingreso.
            </p>

            <div class="alerta-cierre-produccion">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div>
                <strong>Finalice solo cuando Producción cambie de material</strong>
                <span>
                  Deslice completamente únicamente si está seguro de que
                  Producción no continuará fabricando este material.
                </span>
              </div>
            </div>

            <div class="deslizador-finalizar-produccion">
              <div class="deslizador-finalizar-texto">
                <i class="fa-solid fa-arrow-right"></i>
                Deslice para confirmar cierre definitivo
              </div>
              <input
                type="range"
                id="sliderFinalizarProduccion"
                min="0"
                max="100"
                value="0"
                step="1"
                aria-label="Deslice para confirmar que Producción terminó el material"
              >
            </div>
          </div>

          <footer class="submodal-recepcion-acciones">
            <button
              type="button"
              id="btnProduccionContinua"
              class="btn-recepcion secundario"
            >
              <i class="fa-solid fa-clock-rotate-left"></i>
              Producción continuará
            </button>
          </footer>

        </div>
      `;

      modalAsistente.appendChild(submodal);

      let resuelto = false;

      const cerrar = valor => {
        if (resuelto) return;
        resuelto = true;
        submodal.remove();
        resolver(valor);
      };

      document
        .getElementById("btnProduccionContinua")
        .onclick = () => cerrar(false);

      const slider =
        document.getElementById(
          "sliderFinalizarProduccion"
        );

      slider.oninput = () => {
        const valor = Number(slider.value || 0);
        submodal.style.setProperty(
          "--avance-cierre-produccion",
          valor + "%"
        );
      };

      slider.onchange = () => {
        const valor = Number(slider.value || 0);

        if (valor >= 95) {
          slider.value = "100";
          submodal.style.setProperty(
            "--avance-cierre-produccion",
            "100%"
          );

          window.setTimeout(
            () => cerrar(true),
            180
          );
          return;
        }

        slider.value = "0";
        submodal.style.setProperty(
          "--avance-cierre-produccion",
          "0%"
        );
      };

    });

  },

  async actualizarEstadoProduccion(valor) {

    const recepcion =
      this.estado.recepcionActual || {};

    const respuesta = await API.post({
      action:
        "finalizarOContinuarRecepcionMateriales",
      idRecepcion:
        recepcion.idRecepcion,
      produccionFinalizada:
        valor
    });

    if (!respuesta || respuesta.ok !== true) {
      throw new Error(
        respuesta && respuesta.mensaje
          ? respuesta.mensaje
          : "No fue posible actualizar el estado de la recepción."
      );
    }

    this.notificar(
      respuesta.mensaje ||
      "Estado de la recepción actualizado.",
      "exito"
    );

    if (
      String(valor || "").toUpperCase() === "SI" &&
      window.CacheOperativo &&
      typeof CacheOperativo.invalidarPrefijo === "function"
    ) {
      await CacheOperativo.invalidarPrefijo("recepciones_");
    }

  },


/**
 * Cierra el asistente después de guardar una recepción
 * y actualiza el centro de gestión.
 */
async cerrarAsistenteDespuesDeGuardar() {

  const submodalFecha =
    document.getElementById(
      "submodalFechaProduccionRecepcion"
    );

  if (submodalFecha) {
    submodalFecha.remove();
  }

  const submodalProduccion =
    document.getElementById(
      "submodalProduccionFinalizadaRecepcion"
    );

  if (submodalProduccion) {
    submodalProduccion.remove();
  }


  const modalAsistente =
    document.querySelector(
      ".modal-asistente-recepcion"
    );


  if (modalAsistente) {

    if (modalAsistente.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    modalAsistente.classList.add(
      "oculto"
    );

    modalAsistente.setAttribute("inert", "");

    modalAsistente.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  document.body.classList.remove(
    "asistente-recepcion-abierto"
  );


  this.estado.recepcionActual =
    null;


  this.estado.materialSeleccionado =
    null;


  this.estado.resultadosMateriales =
    [];


  this.estado.distribucion =
    {};


  this.estado.camaraActiva =
    "";

  this.estado.participantesIngreso = [];

  this.estado.resumenAcumulado =
    null;

  this.estado.tieneRegistrosPrevios =
    false;


  await this.cargarCatalogos();

},

  renderError(mensaje) {

    const panel =
      document.getElementById("panelRecepcionMateriales");

    if (!panel) {
      return;
    }

    panel.innerHTML = `
      <div class="error-modulo-recepcion">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>No fue posible cargar Recepciones</h3>
        <p>${this.escapar(mensaje)}</p>
        <button
          type="button"
          id="btnReintentarRecepciones"
          class="btn-recepcion principal"
        >
          Reintentar
        </button>
      </div>
    `;

    document
      .getElementById("btnReintentarRecepciones")
      .onclick = () => this.cargarCatalogos();

  },


  obtenerSesion() {

    try {

      return JSON.parse(
        localStorage.getItem("sesion") ||
        sessionStorage.getItem("sesion") ||
        "{}"
      );

    } catch (error) {

      return {};

    }

  },


  mostrarCarga(titulo, mensaje) {

    if (
      window.CargadorSistema &&
      typeof window.CargadorSistema.mostrar ===
        "function"
    ) {
      window.CargadorSistema.mostrar(
        titulo,
        mensaje
      );
    }

  },


  ocultarCarga() {

    if (
      window.CargadorSistema &&
      typeof window.CargadorSistema.ocultar ===
        "function"
    ) {
      window.CargadorSistema.ocultar();
    }

  },


  notificar(mensaje, tipo) {

    if (
      window.Sistema &&
      typeof window.Sistema.notificar ===
        "function"
    ) {
      window.Sistema.notificar(mensaje, tipo);
      return;
    }

    if (typeof mostrarNotificacion === "function") {
      mostrarNotificacion(mensaje, tipo);
      return;
    }

    console.log(mensaje);

  },


  obtenerMarcaTiempoRecepcion(
    item
  ) {

    const registro =
      item || {};

    const valorFecha =
      registro.fechaFinalizacion ||
      registro.fechaFinal ||
      registro.fechaCierre ||
      registro.fecha ||
      "";

    const valorHora =
      registro.horaFinal ||
      registro.horaCierre ||
      registro.horaInicio ||
      "00:00:00";

    let anio;
    let mes;
    let dia;

    if (
      valorFecha instanceof Date &&
      !isNaN(valorFecha.getTime())
    ) {

      anio = valorFecha.getFullYear();
      mes = valorFecha.getMonth();
      dia = valorFecha.getDate();

    } else {

      const textoFecha =
        String(valorFecha || "").trim();

      const fechaIso =
        textoFecha.match(
          /^(\d{4})-(\d{1,2})-(\d{1,2})/
        );

      const fechaLatina =
        textoFecha.match(
          /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/
        );

      if (fechaIso) {

        anio = Number(fechaIso[1]);
        mes = Number(fechaIso[2]) - 1;
        dia = Number(fechaIso[3]);

      } else if (fechaLatina) {

        anio = Number(fechaLatina[3]);
        mes = Number(fechaLatina[2]) - 1;
        dia = Number(fechaLatina[1]);

      } else {

        const fechaInterpretada =
          new Date(textoFecha);

        if (isNaN(fechaInterpretada.getTime())) {
          return 0;
        }

        anio = fechaInterpretada.getFullYear();
        mes = fechaInterpretada.getMonth();
        dia = fechaInterpretada.getDate();

      }

    }

    let horas = 0;
    let minutos = 0;
    let segundos = 0;

    if (
      valorHora instanceof Date &&
      !isNaN(valorHora.getTime())
    ) {

      horas = valorHora.getHours();
      minutos = valorHora.getMinutes();
      segundos = valorHora.getSeconds();

    } else {

      const coincidenciaHora =
        String(valorHora || "")
          .match(
            /(\d{1,2}):(\d{2})(?::(\d{2}))?/
          );

      if (coincidenciaHora) {

        horas = Number(coincidenciaHora[1]);
        minutos = Number(coincidenciaHora[2]);
        segundos = Number(
          coincidenciaHora[3] || 0
        );

      }

    }

    return new Date(
      anio,
      mes,
      dia,
      horas,
      minutos,
      segundos
    ).getTime();

  },


  formatearFechaLegible(
    valor
  ) {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {

      return "-";

    }


    let fecha =
      null;


    if (
      valor instanceof Date &&
      !isNaN(
        valor.getTime()
      )
    ) {

      fecha =
        new Date(
          valor
        );

    } else {

      const texto =
        String(
          valor
        ).trim();


      const iso =
        texto.match(
          /^(\d{4})-(\d{2})-(\d{2})/
        );


      if (iso) {

        fecha =
          new Date(
            Number(
              iso[1]
            ),
            Number(
              iso[2]
            ) -
            1,
            Number(
              iso[3]
            )
          );

      } else {

        const posible =
          new Date(
            texto
          );


        if (
          !isNaN(
            posible.getTime()
          )
        ) {

          fecha =
            posible;

        }

      }

    }


    if (!fecha) {

      return String(
        valor
      );

    }


    return fecha.toLocaleDateString(
      "es-DO",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric"
      }
    );

  },


  formatearHoraRecepcion(valor) {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "-";
    }

    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return valor.toLocaleTimeString(
        "es-DO",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }
      );
    }

    const texto = String(valor).trim();

    const horaSimple = texto.match(
      /(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$)/
    );

    if (horaSimple) {
      return (
        String(horaSimple[1]).padStart(2, "0") +
        ":" +
        horaSimple[2] +
        ":" +
        (horaSimple[3] || "00")
      );
    }

    const fecha = new Date(texto);

    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleTimeString(
        "es-DO",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }
      );
    }

    return texto;

  },


  formatearNumero(valor) {

    return Number(valor || 0).toLocaleString(
      "es-DO",
      {
        maximumFractionDigits: 0
      }
    );

  },


  escapar(valor) {

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

  }

};

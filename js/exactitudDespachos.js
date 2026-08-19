/**
 * ============================================================
 * EXACTITUDDESPACHOS.JS
 * Sistema Logístico PT - Helados BON
 * ============================================================
 *
 * Reconstruido desde cero.
 *
 * PRINCIPIOS DEL MÓDULO
 * ------------------------------------------------------------
 * 1. El backend es la única fuente de verdad.
 * 2. El frontend no calcula estados de negocio.
 * 3. La verificación física se guarda por material.
 * 4. El documento SAP se registra una sola vez por operación
 *    de corrección general.
 * 5. Las tarjetas de materiales son desplegables.
 * 6. Verificado y Resuelto abren en modo consulta.
 * 7. El lápiz permite editar una verificación cerrada.
 * 8. Toda consulta backend utiliza CargadorSistema.
 *
 * ACCIONES BACKEND UTILIZADAS
 * ------------------------------------------------------------
 * obtenerCentroExactitudDespachos
 * iniciarVerificacionDespacho
 * obtenerVerificacionDespacho
 * guardarLineaVerificacionDespacho
 * guardarCorreccionGeneralVerificacionDespacho
 * ============================================================
 */

window.ExactitudDespachos = {

  /**
   * Estado interno exclusivo del módulo.
   */
  estado: {

    centroAbierto:
      false,

    limite:
      10,

    desplazamiento:
      0,

    total:
      0,

    hayMas:
      false,

    registros:
      [],

    resumen:
      {},

    evolucion:
      [],

    supervisores:
      [],

    filtros:
      {},

    paquete:
      null,

    modoVista:
      "EDICION",

    materialesAbiertos:
      {},

    correccionesTemporales:
      {},

    consultando:
      false

  },


  graficoExactitud:
    null,


  graficoDesviaciones:
    null,


  /**
   * Inicializa únicamente la tarjeta.
   */
  iniciar() {

    this.inicializarAccesoDirecto();
    this.prepararTarjeta();
    this.cargarTarjeta();

  },


  inicializarAccesoDirecto() {

    const acceso =
      document.getElementById(
        "menuVerificacionDespachos"
      );

    if (!acceso) {
      return;
    }

    const permitido = Boolean(
      window.Sistema &&
      (
        (
          typeof Sistema.esAdministrador === "function" &&
          Sistema.esAdministrador()
        ) ||
        (
          typeof Sistema.tieneAccesoModulo === "function" &&
          Sistema.tieneAccesoModulo("VERIFICACION_DESPACHOS")
        ) ||
        (
          typeof Sistema.tienePermiso === "function" &&
          (
            Sistema.tienePermiso("VERIFICACION_DESPACHOS_VER") ||
            Sistema.tienePermiso("VERIFICAR_DESPACHOS")
          )
        )
      )
    );

    acceso.hidden = !permitido;

    if (!permitido) {
      acceso.onclick = null;
      return;
    }

    acceso.onclick = async () => {

      document
        .querySelectorAll(".sidebar li.active")
        .forEach(item => item.classList.remove("active"));

      acceso.classList.add("active");

      const sidebar = document.getElementById("sidebarPrincipal");
      const fondo = document.getElementById("fondoMenuMovil");
      const boton = document.getElementById("btnMenuMovil");

      if (sidebar) sidebar.classList.remove("sidebar-abierto");
      if (fondo) fondo.classList.remove("visible");
      document.body.classList.remove("menu-movil-abierto");

      if (boton) {
        boton.innerHTML = '<i class="fa-solid fa-bars"></i>';
        boton.setAttribute("aria-expanded", "false");
      }

      await this.abrirCentro();

    };

  },


  /**
   * Conserva la tarjeta base del dashboard.
   *
   * El CSS será responsable de igualarla visualmente
   * con las demás tarjetas.
   */
  prepararTarjeta() {

    const tarjetas =
      document.querySelectorAll(
        ".cards .card"
      );


    const tarjeta =
      document.getElementById(
        "cardExactitudDespachos"
      ) ||
      (
        tarjetas.length >= 3
          ? tarjetas[2]
          : null
      );


    if (!tarjeta) {
      return;
    }


    tarjeta.id =
      "cardExactitudDespachos";


    tarjeta.classList.add(
      "card-indicador",
      "card-exactitud-despachos"
    );


    tarjeta.innerHTML = `

      <h3 class="titulo-card-exactitud">
        Exactitud de Despachos
      </h3>

      <div class="card-indicador-icono">

        <i class="fa-solid fa-bullseye"></i>

      </div>

      <h1 id="valorExactitudDespachos">
        --
      </h1>

      <p
        id="resumenExactitudDespachos"
        class="resumen-card-exactitud"
      >
        Cargando información...
      </p>

      <button
        type="button"
        id="btnAbrirCentroExactitud"
        class="btn-card-indicador"
      >

        <i class="fa-solid fa-clipboard-check"></i>

        Asistente de verificación

      </button>

    `;


    const boton =
      document.getElementById(
        "btnAbrirCentroExactitud"
      );


    if (boton) {

      boton.onclick =
        evento => {

          evento.preventDefault();

          this.abrirCentro();

        };

    }

  },


  /**
   * Devuelve el rango del mes actual.
   */
  obtenerRangoMesActual() {

    const hoy =
      new Date();


    const desde =
      new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        1
      );


    const hasta =
      new Date(
        hoy.getFullYear(),
        hoy.getMonth() + 1,
        0
      );


    return {

      fechaDesde:
        this.formatearFechaISO(
          desde
        ),

      fechaHasta:
        this.formatearFechaISO(
          hasta
        )

    };

  },


  /**
   * Carga el indicador mensual de la tarjeta.
   */
  async cargarTarjeta() {

    try {

      const rango =
        this.obtenerRangoMesActual();


      const respuesta =
        await API.post({

          action:
            "obtenerCentroExactitudDespachos",

          fechaDesde:
            rango.fechaDesde,

          fechaHasta:
            rango.fechaHasta,

          agrupacion:
            "MES",

          limite:
            1,

          desplazamiento:
            0

        });


      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible cargar el indicador."
        );

      }


      this.pintarTarjeta(
        respuesta.data &&
        respuesta.data.resumen
          ? respuesta.data.resumen
          : {}
      );


    } catch (error) {

      console.error(
        "Error cargando tarjeta de exactitud:",
        error
      );


      this.pintarTarjeta(
        {}
      );

    }

  },


  /**
   * Pinta únicamente el valor y el resumen inferior.
   */
  pintarTarjeta(
    resumen
  ) {

    const valor =
      document.getElementById(
        "valorExactitudDespachos"
      );


    const detalle =
      document.getElementById(
        "resumenExactitudDespachos"
      );


    if (valor) {

      valor.textContent =
        this.formatearPorcentaje(
          resumen.tasaExactitud
        );

    }


    if (detalle) {

      detalle.textContent =
        this.formatearNumero(
          resumen.despachosVerificados
        ) +
        " despachos verificados · " +
        this.formatearNumero(
          resumen.bultosPendientes
        ) +
        " bultos pendientes";

    }

  },


  /**
   * Abre el Centro de Exactitud.
   */
  async abrirCentro() {

    const rango =
      this.obtenerRangoMesActual();


    this.estado.filtros = {

      fechaDesde:
        rango.fechaDesde,

      fechaHasta:
        rango.fechaHasta,

      busqueda:
        "",

      supervisor:
        "",

      estado:
        "",

      resultado:
        "",

      resolucion:
        "",

      tipoDiferencia:
        "",

      agrupacion:
        "DIA",

      soloPendientes:
        false

    };


    this.estado.desplazamiento =
      0;


    this.estado.registros =
      [];


    this.mostrarCarga(
      "Cargando exactitud",
      "Consultando verificaciones y conduces."
    );


    try {

      await this.consultarCentro(
        true
      );


      Sistema.abrirModal(

        "Centro de Exactitud de Despachos",

        this.renderCentro(),

        {
          clase:
            "modal-centro-exactitud"
        }

      );


      this.estado.centroAbierto =
        true;


      this.conectarEventosCentro();
      this.actualizarCentro();


    } catch (error) {

      console.error(
        "Error abriendo Centro de Exactitud:",
        error
      );


      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible abrir el Centro de Exactitud.",
        "error"
      );


    } finally {

      this.ocultarCarga();

    }

  },


  /**
   * Consulta el Centro de Exactitud.
   *
   * No calcula ni transforma estados.
   */
  async consultarCentro(
    reiniciar
  ) {

    if (
      this.estado.consultando
    ) {
      return;
    }


    this.estado.consultando =
      true;


    try {

      if (reiniciar) {

        this.estado.desplazamiento =
          0;

        this.estado.registros =
          [];

      }


      const filtros =
        this.estado.filtros ||
        {};


      const respuesta =
        await API.post({

          action:
            "obtenerCentroExactitudDespachos",

          limite:
            this.estado.limite,

          desplazamiento:
            this.estado.desplazamiento,

          fechaDesde:
            filtros.fechaDesde || "",

          fechaHasta:
            filtros.fechaHasta || "",

          busqueda:
            filtros.busqueda || "",

          supervisor:
            filtros.supervisor || "",

          estado:
            filtros.estado || "",

          resultado:
            filtros.resultado || "",

          resolucion:
            filtros.resolucion || "",

          tipoDiferencia:
            filtros.tipoDiferencia || "",

          agrupacion:
            filtros.agrupacion || "DIA",

          soloPendientes:
            filtros.soloPendientes === true

        });


      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible consultar la exactitud."
        );

      }


      const datos =
        respuesta.data ||
        {};


      const nuevos =
        Array.isArray(
          datos.registros
        )
          ? datos.registros
          : [];


      this.estado.registros =
        reiniciar
          ? nuevos
          : this.estado.registros.concat(
              nuevos
            );


      this.estado.resumen =
        datos.resumen ||
        {};


      this.estado.evolucion =
        Array.isArray(
          datos.evolucion
        )
          ? datos.evolucion
          : [];


      this.estado.supervisores =
        Array.isArray(
          datos.supervisores
        )
          ? datos.supervisores
          : [];


      this.estado.total =
        Number(
          datos.total || 0
        );


      this.estado.hayMas =
        datos.hayMas === true;


      this.estado.desplazamiento =
        Number(
          datos.siguienteDesplazamiento ||
          this.estado.registros.length
        );


    } finally {

      this.estado.consultando =
        false;

    }

  },


  /**
   * Render principal del Centro.
   */
  renderCentro() {

    const filtros =
      this.estado.filtros ||
      {};


    return `

      <section class="centro-exactitud">

        <div class="exactitud-kpis">

          ${this.renderKPIsCentro()}

        </div>


        <div class="exactitud-filtros">

          <div class="campo-exactitud">

            <label for="exFechaDesde">
              Fecha desde
            </label>

            <input
              type="date"
              id="exFechaDesde"
              value="${this.escapar(
                filtros.fechaDesde
              )}"
            >

          </div>


          <div class="campo-exactitud">

            <label for="exFechaHasta">
              Fecha hasta
            </label>

            <input
              type="date"
              id="exFechaHasta"
              value="${this.escapar(
                filtros.fechaHasta
              )}"
            >

          </div>


          <div class="campo-exactitud campo-exactitud-busqueda">

            <label for="exBusqueda">
              Buscar
            </label>

            <input
              type="search"
              id="exBusqueda"
              value="${this.escapar(
                filtros.busqueda
              )}"
              placeholder="Conduce, chofer o centro"
            >

          </div>


          <div class="campo-exactitud">

            <label for="exSupervisor">
              Supervisor
            </label>

            <select id="exSupervisor">

              <option value="">
                Todos
              </option>

              ${this.renderOpcionesSupervisores()}

            </select>

          </div>


          <div class="campo-exactitud">

            <label for="exEstado">
              Estado
            </label>

            <select id="exEstado">

              <option value="">
                Todos
              </option>

              <option value="Sin iniciar">
                Sin iniciar
              </option>

              <option value="En proceso">
                En proceso
              </option>

              <option value="Verificado">
                Verificado
              </option>

              <option value="Resuelto">
                Resuelto
              </option>

              <option value="Anulada">
                Anulada
              </option>

            </select>

          </div>


          <div class="campo-exactitud">

            <label for="exResultado">
              Resultado
            </label>

            <select id="exResultado">

              <option value="">
                Todos
              </option>

              <option value="CONFORME">
                Conforme
              </option>

              <option value="CON DIFERENCIAS">
                Con diferencias
              </option>

            </select>

          </div>


          <div class="campo-exactitud">

            <label for="exResolucion">
              Resolución
            </label>

            <select id="exResolucion">

              <option value="">
                Todas
              </option>

              <option value="NO APLICA">
                No aplica
              </option>

              <option value="PENDIENTE">
                Pendiente
              </option>

              <option value="PARCIALMENTE RESUELTA">
                Parcialmente resuelta
              </option>

              <option value="RESUELTA">
                Resuelta
              </option>

            </select>

          </div>


          <div class="campo-exactitud">

            <label for="exTipoDiferencia">
              Tipo de diferencia
            </label>

            <select id="exTipoDiferencia">

              <option value="">
                Todas
              </option>

              <option value="FALTANTE">
                Faltante
              </option>

              <option value="SOBRANTE">
                Sobrante
              </option>

              <option value="SIN DIFERENCIA">
                Sin diferencia
              </option>

            </select>

          </div>


          <div class="campo-exactitud">

            <label for="exAgrupacion">
              Agrupar por
            </label>

            <select id="exAgrupacion">

              <option value="DIA">
                Día
              </option>

              <option value="SEMANA">
                Semana
              </option>

              <option value="MES">
                Mes
              </option>

              <option value="ANIO">
                Año
              </option>

            </select>

          </div>


          <label class="check-exactitud">

            <input
              type="checkbox"
              id="exSoloPendientes"
              ${
                filtros.soloPendientes
                  ? "checked"
                  : ""
              }
            >

            <span>
              Solo pendientes
            </span>

          </label>


          <div class="acciones-filtros-exactitud">

            <button
              type="button"
              id="btnConsultarExactitud"
              class="btn-exactitud principal"
            >

              <i class="fa-solid fa-magnifying-glass"></i>

              Consultar

            </button>


            <button
              type="button"
              id="btnLimpiarExactitud"
              class="btn-exactitud secundario"
            >

              <i class="fa-solid fa-filter-circle-xmark"></i>

              Limpiar

            </button>


            <button
              type="button"
              id="btnPDFExactitud"
              class="btn-exactitud pdf"
            >

              <i class="fa-solid fa-file-pdf"></i>

              PDF

            </button>

          </div>

        </div>


        <div class="exactitud-graficos">

          <article class="grafico-exactitud-card">

            <canvas id="graficoEvolucionExactitud"></canvas>

          </article>

          <article class="grafico-exactitud-card">

            <canvas id="graficoDesviacionesExactitud"></canvas>

          </article>

        </div>


        <div class="exactitud-listado-encabezado">

          <span id="contadorExactitud"></span>

          <button
            type="button"
            id="btnCargarMasExactitud"
            class="btn-exactitud cargar"
          >

            <i class="fa-solid fa-plus"></i>

            Cargar 10 más

          </button>

        </div>


        <div
          id="listaConducesExactitud"
          class="lista-conduces-exactitud"
        >

          ${this.renderListadoConduces()}

        </div>

      </section>

    `;

  },


  /**
   * KPIs del Centro.
   */
  renderKPIsCentro() {

    const resumen =
      this.estado.resumen ||
      {};


    const indicadores = [

      {
        etiqueta:
          "Tasa de exactitud",

        valor:
          this.formatearPorcentaje(
            resumen.tasaExactitud
          )
      },

      {
        etiqueta:
          "Tasa de error",

        valor:
          this.formatearPorcentaje(
            resumen.tasaError
          )
      },

      {
        etiqueta:
          "Bultos traspasados",

        valor:
          this.formatearNumero(
            resumen.bultosTraspasados
          )
      },

      {
        etiqueta:
          "Bultos desviados",

        valor:
          this.formatearNumero(
            resumen.bultosDesviados
          )
      },

      {
        etiqueta:
          "Bultos corregidos",

        valor:
          this.formatearNumero(
            resumen.bultosCorregidos
          )
      },

      {
        etiqueta:
          "Bultos pendientes",

        valor:
          this.formatearNumero(
            resumen.bultosPendientes
          )
      },

      {
        etiqueta:
          "Valor desviaciones",

        valor:
          this.formatearMoneda(
            resumen.valorDesviaciones
          )
      },

      {
        etiqueta:
          "Valor pendiente",

        valor:
          this.formatearMoneda(
            resumen.valorPendiente
          )
      }

    ];


    return indicadores
      .map(
        item => `

          <article class="kpi-exactitud">

            <span>
              ${item.etiqueta}
            </span>

            <strong>
              ${item.valor}
            </strong>

          </article>

        `
      )
      .join("");

  },


  /**
   * Supervisores suministrados por backend.
   */
  renderOpcionesSupervisores() {

    const seleccionado =
      String(
        this.estado.filtros.supervisor ||
        ""
      );


    return (
      this.estado.supervisores ||
      []
    )
      .map(
        nombre => `

          <option
            value="${this.escapar(nombre)}"
            ${
              String(nombre) === seleccionado
                ? "selected"
                : ""
            }
          >
            ${this.escapar(nombre)}
          </option>

        `
      )
      .join("");

  },


  /**
   * El frontend solo interpreta la presentación recibida.
   *
   * No usa cantidades ni KPIs para decidir el estado.
   */
  obtenerPresentacionRegistro(
    registro
  ) {

    const presentacion =
      registro.presentacion &&
      typeof registro.presentacion === "object"

        ? registro.presentacion

        : {};


    const estado =
      String(
        presentacion.estadoVisible ||
        presentacion.estadoVerificacion ||
        registro.estadoVisual ||
        registro.estadoVerificacion ||
        "Sin iniciar"
      ).trim();


    const accion =
      String(
        presentacion.accion ||
        registro.accion ||
        this.accionPorEstadoBackend(
          estado
        )
      )
        .trim()
        .toUpperCase();


    const textoBoton =
      String(
        presentacion.textoBoton ||
        registro.textoBoton ||
        this.textoBotonPorAccion(
          accion,
          estado
        )
      ).trim();


    const claseVisual =
      String(
        presentacion.claseVisual ||
        registro.claseVisual ||
        this.clasePorEstadoBackend(
          estado
        )
      )
        .trim()
        .toLowerCase();


    const modoApertura =
      String(
        presentacion.modoApertura ||
        registro.modoApertura ||
        (
          accion === "VER" ||
          accion === "CONSULTAR"
            ? "CONSULTA"
            : "EDICION"
        )
      )
        .trim()
        .toUpperCase();


    return {

      estado:
        estado,

      accion:
        accion,

      textoBoton:
        textoBoton,

      claseVisual:
        claseVisual,

      modoApertura:
        modoApertura

    };

  },


  /**
   * Fallback basado exclusivamente en Estado_Verificacion.
   */
  accionPorEstadoBackend(
    estado
  ) {

    const normalizado =
      this.normalizarTexto(
        estado
      );


    if (
      normalizado === "verificado"
    ) {
      return "VER";
    }


    if (
      normalizado === "resuelto"
    ) {
      return "CONSULTAR";
    }


    if (
      normalizado === "en proceso"
    ) {
      return "CONTINUAR";
    }


    if (
      normalizado === "anulada"
    ) {
      return "VER";
    }


    return "INICIAR";

  },


  textoBotonPorAccion(
    accion,
    estado
  ) {

    if (
      accion === "VER"
    ) {
      return "Ver";
    }


    if (
      accion === "CONSULTAR"
    ) {
      return "Consultar";
    }


    if (
      accion === "CONTINUAR"
    ) {
      return "Continuar";
    }


    if (
      this.normalizarTexto(
        estado
      ) === "sin iniciar"
    ) {
      return "Iniciar";
    }


    return "Verificar";

  },


  clasePorEstadoBackend(
    estado
  ) {

    const normalizado =
      this.normalizarTexto(
        estado
      );


    if (
      normalizado === "verificado"
    ) {
      return "verificado";
    }


    if (
      normalizado === "resuelto"
    ) {
      return "resuelto";
    }


    if (
      normalizado === "en proceso"
    ) {
      return "en-proceso";
    }


    if (
      normalizado === "anulada"
    ) {
      return "anulada";
    }


    return "sin-iniciar";

  },


  /**
   * Listado paginado de conduces.
   */
  renderListadoConduces() {

    const registros =
      this.estado.registros ||
      [];


    if (
      registros.length === 0
    ) {

      return `

        <div class="vacio-exactitud">

          <i class="fa-solid fa-clipboard-check"></i>

          <strong>
            No se encontraron conduces.
          </strong>

          <span>
            Modifique los filtros e intente nuevamente.
          </span>

        </div>

      `;

    }


    return registros
      .map(
        registro => {

          const presentacion =
            this.obtenerPresentacionRegistro(
              registro
            );


          return `

            <article
              class="
                fila-conduce-exactitud
                estado-${this.escapar(
                  presentacion.claseVisual
                )}
              "
            >

              <div>

                <span>
                  Conduce
                </span>

                <strong>
                  ${this.escapar(
                    registro.noConduce
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Supervisor
                </span>

                <strong>
                  ${this.escapar(
                    registro.supervisor ||
                    "-"
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Chofer
                </span>

                <strong>
                  ${this.escapar(
                    registro.chofer ||
                    "-"
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Centro
                </span>

                <strong>
                  ${this.escapar(
                    registro.centros ||
                    registro.centrosDestino ||
                    "-"
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Exactitud
                </span>

                <strong>
                  ${this.formatearPorcentaje(
                    registro.exactitud
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Estado
                </span>

                <strong class="texto-estado-exactitud">
                  ${this.escapar(
                    presentacion.estado
                  )}
                </strong>

              </div>


              <button
                type="button"
                class="
                  btn-accion-exactitud
                  accion-${this.escapar(
                    presentacion.claseVisual
                  )}
                "
                data-accion="${this.escapar(
                  presentacion.accion
                )}"
                data-modo="${this.escapar(
                  presentacion.modoApertura
                )}"
                data-id-conduce="${this.escapar(
                  registro.idConduce
                )}"
                data-id-verificacion="${this.escapar(
                  registro.idVerificacion ||
                  ""
                )}"
              >

                ${this.escapar(
                  presentacion.textoBoton
                )}

              </button>

            </article>

          `;

        }
      )
      .join("");

  },


  /**
   * Eventos del Centro.
   */
  conectarEventosCentro() {

    const consultar =
      document.getElementById(
        "btnConsultarExactitud"
      );


    const limpiar =
      document.getElementById(
        "btnLimpiarExactitud"
      );


    const cargarMas =
      document.getElementById(
        "btnCargarMasExactitud"
      );


    const pdf =
      document.getElementById(
        "btnPDFExactitud"
      );


    const listado =
      document.getElementById(
        "listaConducesExactitud"
      );


    if (consultar) {

      consultar.onclick =
        evento => {

          evento.preventDefault();

          this.aplicarFiltros();

        };

    }


    if (limpiar) {

      limpiar.onclick =
        evento => {

          evento.preventDefault();

          this.limpiarFiltros();

        };

    }


    if (cargarMas) {

      cargarMas.onclick =
        evento => {

          evento.preventDefault();

          this.cargarMas();

        };

    }


    if (pdf) {

      pdf.onclick =
        evento => {

          evento.preventDefault();

          this.generarPDFCentroExactitud();

        };

    }


    if (listado) {

      listado.onclick =
        evento => {

          const boton =
            evento.target.closest(
              ".btn-accion-exactitud"
            );


          if (!boton) {
            return;
          }


          evento.preventDefault();


          this.abrirVerificacion({

            accion:
              boton.dataset.accion,

            modo:
              boton.dataset.modo,

            idConduce:
              boton.dataset.idConduce,

            idVerificacion:
              boton.dataset.idVerificacion

          });

        };

    }


    this.restaurarFiltrosCentro();

  },


  /**
   * Lee todos los filtros.
   */
  leerFiltrosCentro() {

    const valor =
      id => {

        const elemento =
          document.getElementById(
            id
          );


        return elemento
          ? String(
              elemento.value ||
              ""
            ).trim()
          : "";

      };


    const pendientes =
      document.getElementById(
        "exSoloPendientes"
      );


    this.estado.filtros = {

      fechaDesde:
        valor(
          "exFechaDesde"
        ),

      fechaHasta:
        valor(
          "exFechaHasta"
        ),

      busqueda:
        valor(
          "exBusqueda"
        ),

      supervisor:
        valor(
          "exSupervisor"
        ),

      estado:
        valor(
          "exEstado"
        ),

      resultado:
        valor(
          "exResultado"
        ),

      resolucion:
        valor(
          "exResolucion"
        ),

      tipoDiferencia:
        valor(
          "exTipoDiferencia"
        ),

      agrupacion:
        valor(
          "exAgrupacion"
        ) || "DIA",

      soloPendientes:
        pendientes
          ? pendientes.checked
          : false

    };

  },


  restaurarFiltrosCentro() {

    const asignar =
      (
        id,
        valor
      ) => {

        const elemento =
          document.getElementById(
            id
          );


        if (elemento) {

          elemento.value =
            valor || "";

        }

      };


    asignar(
      "exSupervisor",
      this.estado.filtros.supervisor
    );


    asignar(
      "exEstado",
      this.estado.filtros.estado
    );


    asignar(
      "exResultado",
      this.estado.filtros.resultado
    );


    asignar(
      "exResolucion",
      this.estado.filtros.resolucion
    );


    asignar(
      "exTipoDiferencia",
      this.estado.filtros.tipoDiferencia
    );


    asignar(
      "exAgrupacion",
      this.estado.filtros.agrupacion ||
      "DIA"
    );

  },


  async aplicarFiltros() {

    this.leerFiltrosCentro();


    this.mostrarCarga(
      "Consultando exactitud",
      "Aplicando los filtros seleccionados."
    );


    try {

      await this.consultarCentro(
        true
      );


      this.actualizarCentro();


      this.notificar(

        this.estado.total > 0
          ? "Filtros aplicados correctamente."
          : "No se encontraron conduces con esos filtros.",

        this.estado.total > 0
          ? "exito"
          : "info"

      );


    } catch (error) {

      console.error(
        "Error aplicando filtros:",
        error
      );


      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible aplicar los filtros.",
        "error"
      );


    } finally {

      this.ocultarCarga();

    }

  },


  async limpiarFiltros() {

    const rango =
      this.obtenerRangoMesActual();


    this.estado.filtros = {

      fechaDesde:
        rango.fechaDesde,

      fechaHasta:
        rango.fechaHasta,

      busqueda:
        "",

      supervisor:
        "",

      estado:
        "",

      resultado:
        "",

      resolucion:
        "",

      tipoDiferencia:
        "",

      agrupacion:
        "DIA",

      soloPendientes:
        false

    };


    this.mostrarCarga(
      "Restableciendo filtros",
      "Consultando el período actual."
    );


    try {

      await this.consultarCentro(
        true
      );


      const contenedor =
        document.querySelector(
          ".centro-exactitud"
        );


      if (contenedor) {

        contenedor.outerHTML =
          this.renderCentro();

      }


      this.conectarEventosCentro();
      this.actualizarCentro();


    } catch (error) {

      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible restablecer los filtros.",
        "error"
      );


    } finally {

      this.ocultarCarga();

    }

  },


  async cargarMas() {

    if (
      !this.estado.hayMas
    ) {
      return;
    }


    this.mostrarCarga(
      "Cargando más",
      "Consultando el siguiente bloque."
    );


    try {

      await this.consultarCentro(
        false
      );


      this.actualizarCentro();


    } catch (error) {

      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible cargar más conduces.",
        "error"
      );


    } finally {

      this.ocultarCarga();

    }

  },


  actualizarCentro() {

    const kpis =
      document.querySelector(
        ".exactitud-kpis"
      );


    const listado =
      document.getElementById(
        "listaConducesExactitud"
      );


    const contador =
      document.getElementById(
        "contadorExactitud"
      );


    const botonMas =
      document.getElementById(
        "btnCargarMasExactitud"
      );


    if (kpis) {

      kpis.innerHTML =
        this.renderKPIsCentro();

    }


    if (listado) {

      listado.innerHTML =
        this.renderListadoConduces();

    }


    if (contador) {

      contador.textContent =
        "Mostrando " +
        this.estado.registros.length +
        " de " +
        this.estado.total +
        " conduces";

    }


    if (botonMas) {

      botonMas.hidden =
        !this.estado.hayMas;

    }


    this.pintarTarjeta(
      this.estado.resumen
    );


    this.renderGraficosCentro();

  },


  renderGraficosCentro() {

    if (
      typeof Chart === "undefined"
    ) {
      return;
    }


    if (
      this.graficoExactitud
    ) {

      this.graficoExactitud.destroy();

    }


    if (
      this.graficoDesviaciones
    ) {

      this.graficoDesviaciones.destroy();

    }


    const evolucion =
      this.estado.evolucion ||
      [];


    const resumen =
      this.estado.resumen ||
      {};


    const canvasEvolucion =
      document.getElementById(
        "graficoEvolucionExactitud"
      );


    const canvasDesviaciones =
      document.getElementById(
        "graficoDesviacionesExactitud"
      );


    if (canvasEvolucion) {

      this.graficoExactitud =
        new Chart(
          canvasEvolucion,
          {

            type:
              "line",

            data: {

              labels:
                evolucion.map(
                  item => item.etiqueta
                ),

              datasets: [

                {

                  label:
                    "Exactitud %",

                  data:
                    evolucion.map(
                      item => item.exactitud
                    ),

                  tension:
                    0.25

                }

              ]

            },

            options: {

              responsive:
                true,

              maintainAspectRatio:
                false,

              scales: {

                y: {

                  min:
                    0,

                  max:
                    100

                }

              }

            }

          }
        );

    }


       if (canvasDesviaciones) {

      /*
       * Composición de las desviaciones detectadas.
       */
      const faltantes =
        Number(
          resumen.faltantes || 0
        );


      const sobrantes =
        Number(
          resumen.sobrantes || 0
        );


      const corregidos =
        Number(
          resumen.bultosCorregidos || 0
        );


      const pendientes =
        Number(
          resumen.bultosPendientes || 0
        );


      const totalDesviaciones =
        faltantes +
        sobrantes;


      /*
       * El resumen actual entrega el total corregido,
       * pero no lo separa entre faltantes y sobrantes.
       *
       * Para la representación visual se distribuye
       * proporcionalmente según la composición de las
       * desviaciones detectadas.
       */
      const corregidosFaltantes =
        totalDesviaciones > 0
          ? Math.round(
              corregidos *
              (
                faltantes /
                totalDesviaciones
              )
            )
          : 0;


      const corregidosSobrantes =
        Math.max(
          0,
          corregidos -
          corregidosFaltantes
        );


      /*
       * Distribución proporcional de los pendientes.
       * Se parte de lo que permanece después de considerar
       * la composición de los bultos corregidos.
       */
      const faltantesRestantes =
        Math.max(
          0,
          faltantes -
          corregidosFaltantes
        );


      const sobrantesRestantes =
        Math.max(
          0,
          sobrantes -
          corregidosSobrantes
        );


      const totalRestante =
        faltantesRestantes +
        sobrantesRestantes;


      const pendientesFaltantes =
        totalRestante > 0
          ? Math.round(
              pendientes *
              (
                faltantesRestantes /
                totalRestante
              )
            )
          : 0;


      const pendientesSobrantes =
        Math.max(
          0,
          pendientes -
          pendientesFaltantes
        );


      this.graficoDesviaciones =
        new Chart(
          canvasDesviaciones,
          {

            type:
              "bar",

            data: {

              labels: [

                "Faltantes",
                "Sobrantes",
                "Corregidos",
                "Pendientes"

              ],

              datasets: [

                {

                  label:
                    "Faltantes",

                  data: [

                    faltantes,
                    0,
                    corregidosFaltantes,
                    pendientesFaltantes

                  ],

                  backgroundColor:
                    "#D71920",

                  borderColor:
                    "#B9141A",

                  borderWidth:
                    1,

                  borderRadius:
                    5,

                  stack:
                    "desviaciones"

                },


                {

                  label:
                    "Sobrantes",

                  data: [

                    0,
                    sobrantes,
                    corregidosSobrantes,
                    pendientesSobrantes

                  ],

                  backgroundColor:
                    "#F7941D",

                  borderColor:
                    "#D9780F",

                  borderWidth:
                    1,

                  borderRadius:
                    5,

                  stack:
                    "desviaciones"

                }

              ]

            },

            options: {

              responsive:
                true,

              maintainAspectRatio:
                false,

              plugins: {

                /*
                 * Se elimina la leyenda superior porque
                 * cada columna ya está identificada por
                 * su etiqueta inferior.
                 */
                legend: {

                  display:
                    false

                },


                tooltip: {

                  mode:
                    "index",

                  intersect:
                    false,

                  callbacks: {

                    footer:
                      elementos => {

                        if (
                          !elementos ||
                          elementos.length === 0
                        ) {

                          return "";

                        }


                        const indice =
                          elementos[0]
                            .dataIndex;


                        const totales = [

                          faltantes,
                          sobrantes,
                          corregidos,
                          pendientes

                        ];


                        return (
                          "Total: " +
                          this.formatearNumero(
                            totales[indice] || 0
                          )
                        );

                      }

                  }

                }

              },


              interaction: {

                mode:
                  "index",

                intersect:
                  false

              },


              scales: {

                x: {

                  stacked:
                    true,

                  grid: {

                    display:
                      false

                  }

                },


                y: {

                  stacked:
                    true,

                  beginAtZero:
                    true,

                  ticks: {

                    precision:
                      0

                  },

                  grid: {

                    color:
                      "rgba(0, 0, 0, 0.06)"

                  }

                }

              }

            }

          }
        );

    }
  },


  /**
   * Abre, inicia o recupera una verificación.
   */
  async abrirVerificacion(
    parametros
  ) {

    const datos =
      parametros ||
      {};


    const accion =
      String(
        datos.accion ||
        ""
      )
        .trim()
        .toUpperCase();


    const modo =
      String(
        datos.modo ||
        (
          accion === "VER" ||
          accion === "CONSULTAR"
            ? "CONSULTA"
            : "EDICION"
        )
      )
        .trim()
        .toUpperCase();


    const sesion =
      this.obtenerSesion();


    this.mostrarCarga(

      accion === "INICIAR"
        ? "Iniciando verificación"
        : "Cargando verificación",

      "Consultando los materiales del conduce."

    );


    try {

      let respuesta;


      if (
        accion === "INICIAR" ||
        accion === "VERIFICAR"
      ) {

        respuesta =
          await API.post({

            action:
              "iniciarVerificacionDespacho",

            idConduce:
              datos.idConduce,

            analistaId:
              sesion.id ||
              sesion.idUsuario ||
              sesion.ID_Usuario ||
              "",

            analistaNombre:
              sesion.nombre ||
              sesion.Nombre ||
              sesion.nombreCompleto ||
              "Analista"

          });


      } else {

        if (
          !datos.idVerificacion
        ) {

          throw new Error(
            "No se recibió el ID de la verificación."
          );

        }


        respuesta =
          await API.post({

            action:
              "obtenerVerificacionDespacho",

            idVerificacion:
              datos.idVerificacion

          });

      }


      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible abrir la verificación."
        );

      }


      this.estado.paquete =
        respuesta.data ||
        {};


      this.estado.modoVista =
        modo;


      this.estado.materialesAbiertos =
        {};


      this.estado.correccionesTemporales =
        {};


      this.abrirVistaVerificacion();


    } catch (error) {

      console.error(
        "Error abriendo verificación:",
        error
      );


      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible abrir la verificación.",
        "error"
      );


    } finally {

      this.ocultarCarga();

    }

  },


  abrirVistaVerificacion() {

    const paquete =
      this.estado.paquete ||
      {};


    const conduce =
      paquete.conduce ||
      {};


    Sistema.abrirModal(

      "Verificación · " +
      this.escapar(
        conduce.noConduce ||
        conduce.No_Conduce ||
        "Conduce"
      ),

      this.renderVistaVerificacion(),

      {
        clase:
          "modal-asistente-verificacion"
      }

    );


    this.conectarEventosVerificacion();

  },


  /**
   * Obtiene el estado real del encabezado.
   *
   * No se calcula desde el resumen.
   */
  obtenerEstadoPaquete() {

    const paquete =
      this.estado.paquete ||
      {};


    const verificacion =
      paquete.verificacion ||
      {};


    const presentacion =
      paquete.presentacion &&
      typeof paquete.presentacion === "object"

        ? paquete.presentacion

        : {};


    return String(
      presentacion.estadoVisible ||
      presentacion.estadoVerificacion ||
      verificacion.Estado_Verificacion ||
      "En proceso"
    ).trim();

  },


  renderVistaVerificacion() {

    const paquete =
      this.estado.paquete ||
      {};


    const conduce =
      paquete.conduce ||
      {};


    const verificacion =
      paquete.verificacion ||
      {};


    const modoConsulta =
      this.estado.modoVista ===
      "CONSULTA";


    const estadoActual =
      this.obtenerEstadoPaquete();


    const claseEstado =
      this.clasePorEstadoBackend(
        estadoActual
      );


    return `

      <section class="asistente-verificacion-despacho">

        <header class="encabezado-asistente-verificacion">

          <div>

            <span>
              Conduce
            </span>

            <strong>
              ${this.escapar(
                conduce.noConduce ||
                conduce.No_Conduce ||
                "-"
              )}
            </strong>

          </div>


          <div>

            <span>
              Supervisor
            </span>

            <strong>
              ${this.escapar(
                conduce.supervisor ||
                verificacion.Supervisor_Despacho ||
                "-"
              )}
            </strong>

          </div>


          <div>

            <span>
              Chofer
            </span>

            <strong>
              ${this.escapar(
                conduce.chofer ||
                verificacion.Chofer ||
                "-"
              )}
            </strong>

          </div>


          <div>

            <span>
              Centros
            </span>

            <strong>
              ${this.escapar(
                conduce.centrosDestino ||
                verificacion.Centros_Destino ||
                "-"
              )}
            </strong>

          </div>


          <div class="acciones-encabezado-verificacion">

            <span
              class="
                estado-general-verificacion
                ${this.escapar(
                  claseEstado
                )}
              "
            >
              ${this.escapar(
                estadoActual
              )}
            </span>


            ${
              modoConsulta
                ? `

                  <button
                    type="button"
                    id="btnEditarVerificacion"
                    class="btn-editar-verificacion"
                  >

                    <i class="fa-solid fa-pen"></i>

                    Editar

                  </button>

                `
                : ""
            }


            <button
              type="button"
              id="btnVolverCentroExactitud"
              class="btn-exactitud secundario"
            >

              <i class="fa-solid fa-arrow-left"></i>

              Volver

            </button>

          </div>

        </header>


        <div
          id="resumenVerificacionActual"
          class="resumen-asistente-verificacion"
        >

          ${this.renderResumenVerificacion()}

        </div>


        <div class="ayuda-asistente-verificacion">

          <i class="fa-solid fa-circle-info"></i>

          <span>

            ${
              modoConsulta
                ? "Vista de consulta. Use el lápiz para habilitar una corrección o edición."
                : "Despliegue cada material, registre la cantidad física y guarde la verificación."
            }

          </span>

        </div>


        <div
          id="listaMaterialesVerificacion"
          class="lista-materiales-verificacion"
        >

          ${this.renderMaterialesVerificacion()}

        </div>


        ${this.renderCorreccionGeneral()}

      </section>

    `;

  },


  renderResumenVerificacion() {

    const paquete =
      this.estado.paquete ||
      {};


    const resumen =
      paquete.resumen ||
      {};


    const indicadores = [

      {
        etiqueta:
          "Materiales",

        valor:
          resumen.totalMateriales
      },

      {
        etiqueta:
          "Verificados",

        valor:
          resumen.materialesVerificados
      },

      {
        etiqueta:
          "Pendientes",

        valor:
          resumen.materialesPendientesVerificar
      },

      {
        etiqueta:
          "Con diferencias",

        valor:
          resumen.materialesConDiferencia
      },

      {
        etiqueta:
          "Faltantes",

        valor:
          resumen.totalFaltante
      },

      {
        etiqueta:
          "Sobrantes",

        valor:
          resumen.totalSobrante
      },

      {
        etiqueta:
          "Corregidos",

        valor:
          resumen.totalCantidadCorregida
      },

      {
        etiqueta:
          "Pendiente resolver",

        valor:
          resumen.totalDiferenciaPendiente
      }

    ];


    return indicadores
      .map(
        item => `

          <article class="kpi-asistente-verificacion">

            <span>
              ${item.etiqueta}
            </span>

            <strong>
              ${this.formatearNumero(
                item.valor
              )}
            </strong>

          </article>

        `
      )
      .join("");

  },


  renderMaterialesVerificacion() {

    const paquete =
      this.estado.paquete ||
      {};


    const detalle =
      Array.isArray(
        paquete.detalle
      )
        ? paquete.detalle
        : [];


    if (
      detalle.length === 0
    ) {

      return `

        <div class="vacio-exactitud">

          No existen materiales para verificar.

        </div>

      `;

    }


    return detalle
      .map(
        linea =>
          this.renderTarjetaMaterial(
            linea
          )
      )
      .join("");

  },


  renderTarjetaMaterial(
    linea
  ) {

    const idDetalle =
      String(
        linea.ID_Detalle_Verificacion ||
        ""
      );


    const abierto =
      this.estado.materialesAbiertos[
        idDetalle
      ] === true;


    const modoConsulta =
      this.estado.modoVista ===
      "CONSULTA";


    const tieneCantidad =
      this.tieneValor(
        linea.Cantidad_Verificada
      );


    const diferencia =
      tieneCantidad
        ? Number(
            linea.Diferencia || 0
          )
        : null;


    const tieneDiferencia =
      diferencia !== null &&
      diferencia !== 0;


    const estadoLinea =
      String(
        linea.Estado_Resolucion ||
        (
          tieneCantidad
            ? "SIN DIFERENCIA"
            : "PENDIENTE DE VERIFICAR"
        )
      ).trim();


    const claseLinea =
      this.claseEstadoLinea(
        estadoLinea,
        tieneDiferencia
      );


    return `

      <article
        class="
          tarjeta-material-verificacion
          ${this.escapar(
            claseLinea
          )}
        "
        data-id-detalle="${this.escapar(
          idDetalle
        )}"
      >

        <button
          type="button"
          class="cabecera-desplegable-material"
          data-id-detalle="${this.escapar(
            idDetalle
          )}"
          aria-expanded="${
            abierto
              ? "true"
              : "false"
          }"
        >

          <div class="identidad-material-verificacion">

            <strong>
              ${this.escapar(
                linea.Material ||
                "-"
              )}
            </strong>

            <span>
              ${this.escapar(
                linea.Descripcion ||
                ""
              )}
            </span>

            <small>

              ${this.escapar(
                linea.Centro_Destino ||
                ""
              )}

              ${
                linea.UM
                  ? " · " +
                    this.escapar(
                      linea.UM
                    )
                  : ""
              }

            </small>

          </div>


          <div class="resumen-linea-material">

            <span>

              Sistema:
              <strong>
                ${this.formatearNumero(
                  linea.Cantidad_Sistema
                )}
              </strong>

            </span>

            <span>

              Verificado:
              <strong>
                ${
                  tieneCantidad
                    ? this.formatearNumero(
                        linea.Cantidad_Verificada
                      )
                    : "--"
                }
              </strong>

            </span>

            <span>

              Diferencia:
              <strong>

                ${
                  diferencia === null
                    ? "--"
                    : diferencia > 0
                      ? "+" +
                        this.formatearNumero(
                          diferencia
                        )
                      : this.formatearNumero(
                          diferencia
                        )
                }

              </strong>

            </span>

          </div>


          <span
            class="
              estado-linea-material
              ${this.escapar(
                claseLinea
              )}
            "
          >
            ${this.escapar(
              estadoLinea
            )}
          </span>


          <i
            class="
              fa-solid
              ${
                abierto
                  ? "fa-chevron-up"
                  : "fa-chevron-down"
              }
            "
          ></i>

        </button>


        <div
          class="contenido-material-verificacion"
          ${
            abierto
              ? ""
              : "hidden"
          }
        >

          <div class="campos-verificacion-material">

            <div class="campo-material-verificacion">

              <label>
                Cantidad sistema
              </label>

              <input
                type="text"
                value="${this.escapar(
                  linea.Cantidad_Sistema
                )}"
                disabled
              >

            </div>


            <div class="campo-material-verificacion">

              <label>
                Cantidad verificada
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                class="input-cantidad-verificada"
                value="${
                  tieneCantidad
                    ? this.escapar(
                        linea.Cantidad_Verificada
                      )
                    : ""
                }"
                ${
                  modoConsulta
                    ? "disabled"
                    : ""
                }
              >

            </div>


            <div class="campo-material-verificacion">

              <label>
                Tarimas sistema
              </label>

              <input
                type="text"
                value="${this.escapar(
                  linea.Tarimas_Sistema
                )}"
                disabled
              >

            </div>


            <div class="campo-material-verificacion">

              <label>
                Tarimas verificadas
              </label>

              <input
                type="number"
                min="0"
                step="1"
                class="input-tarimas-verificadas"
                value="${this.escapar(
                  linea.Tarimas_Verificadas
                )}"
                ${
                  modoConsulta
                    ? "disabled"
                    : ""
                }
              >

            </div>

          </div>


          <div class="detalle-resultado-material">

            <span>

              Tipo:
              <strong>
                ${this.escapar(
                  linea.Tipo_Diferencia ||
                  "PENDIENTE"
                )}
              </strong>

            </span>

            <span>

              Corregido:
              <strong>
                ${this.formatearNumero(
                  linea.Cantidad_Correccion
                )}
              </strong>

            </span>

            <span>

              Pendiente:
              <strong>
                ${this.formatearNumero(
                  this.valorPendienteLinea(
                    linea
                  )
                )}
              </strong>

            </span>

            <span>

              SAP:
              <strong>
                ${this.escapar(
                  linea.Documento_SAP_Correccion ||
                  "Sin registrar"
                )}
              </strong>

            </span>

          </div>


          ${
            !modoConsulta
              ? `

                <div class="acciones-material-verificacion">

                  <button
                    type="button"
                    class="btn-guardar-linea-verificacion"
                    data-id-detalle="${this.escapar(
                      idDetalle
                    )}"
                  >

                    <i class="fa-solid fa-floppy-disk"></i>

                    Guardar verificación

                  </button>

                </div>

              `
              : ""
          }


          ${
            tieneDiferencia
              ? this.renderCamposCorreccionMaterial(
                  linea,
                  modoConsulta
                )
              : ""
          }

        </div>

      </article>

    `;

  },


  /**
   * Campos de corrección por material.
   *
   * No contienen documento SAP.
   */
  renderCamposCorreccionMaterial(
    linea,
    modoConsulta
  ) {

    const idDetalle =
      String(
        linea.ID_Detalle_Verificacion ||
        ""
      );

    const temporal =
      this.estado.correccionesTemporales[
        idDetalle
      ] ||
      {};

    const tipoSeleccionado =
      String(
        temporal.tipoCorreccion ||
        linea.Tipo_Correccion ||
        ""
      ).trim();

    const esCruce =
      this.esTipoCruceMaterial(
        tipoSeleccionado
      );

    return `

      <div class="bloque-correccion-material">

        <div class="titulo-correccion-material">

          <i class="fa-solid fa-triangle-exclamation"></i>

          Corrección del material

        </div>


        <div class="campos-correccion-material">

          <div class="campo-correccion-material">

            <label>
              Cantidad a corregir
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              class="input-correccion-cantidad"
              value="${this.escapar(
                temporal.cantidadCorreccion ||
                ""
              )}"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

          </div>


          <div class="campo-correccion-material">

            <label>
              Tipo de corrección
            </label>

            <select
              class="input-correccion-tipo"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

              ${this.renderOpcionesTipoCorreccion(
                tipoSeleccionado
              )}

            </select>

          </div>


          <div class="campo-correccion-material">

            <label>
              Causa
            </label>

            <input
              type="text"
              class="input-correccion-causa"
              value="${this.escapar(
                temporal.causaDiferencia ||
                linea.Causa_Diferencia ||
                ""
              )}"
              placeholder="Causa de la diferencia"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

          </div>


          <div class="campo-correccion-material">

            <label>
              Comentario
            </label>

            <textarea
              class="input-correccion-comentario"
              rows="2"
              placeholder="Detalle de la corrección"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >${this.escapar(
              temporal.comentarioDiferencia ||
              linea.Comentario_Diferencia ||
              ""
            )}</textarea>

          </div>

        </div>


        <div
          class="panel-cruce-material"
          ${
            esCruce
              ? ""
              : "hidden"
          }
        >

          ${this.renderCamposCruceMaterial(
            temporal.materialCruce ||
            {},
            modoConsulta
          )}

        </div>


        ${
          !modoConsulta
            ? `

              <label class="seleccionar-correccion-material">

                <input
                  type="checkbox"
                  class="check-incluir-correccion"
                  data-id-detalle="${this.escapar(
                    idDetalle
                  )}"
                  ${
                    temporal.incluir
                      ? "checked"
                      : ""
                  }
                >

                <span>
                  Incluir este material en la próxima corrección SAP
                </span>

              </label>

            `
            : ""
        }

      </div>

    `;

  },


  renderCamposCruceMaterial(
    materialCruce,
    modoConsulta
  ) {

    const datos =
      materialCruce ||
      {};

    const cantidadPrincipal =
      datos.cantidadPrincipal ||
      "";

    const recorte =
      datos.recorte ||
      "";

    const total =
      Number(
        cantidadPrincipal || 0
      ) +
      Number(
        recorte || 0
      );

    return `

      <section class="contenido-cruce-material">

        <div class="encabezado-cruce-material">

          <div>

            <span>
              Material realmente despachado
            </span>

            <strong>
              Busque y seleccione el material encontrado físicamente.
            </strong>

          </div>

          <i class="fa-solid fa-right-left"></i>

        </div>


        <div class="buscador-cruce-material">

          <label>
            Material destino
          </label>

          <div class="control-busqueda-cruce-material">

            <input
              type="search"
              class="input-busqueda-material-cruce"
              placeholder="Código o descripción"
              autocomplete="off"
              value="${this.escapar(
                datos.textoBusqueda ||
                datos.descripcion ||
                datos.material ||
                ""
              )}"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

            <button
              type="button"
              class="btn-buscar-material-cruce"
              title="Buscar material"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

              <i class="fa-solid fa-magnifying-glass"></i>

            </button>

          </div>


          <div
            class="resultados-material-cruce"
            hidden
          ></div>

        </div>


        <input
          type="hidden"
          class="input-cruce-material-id"
          value="${this.escapar(
            datos.material ||
            ""
          )}"
        >


        <div class="datos-material-cruce">

          <div>
            <span>Código</span>
            <strong class="dato-cruce-material">${this.escapar(datos.material || "-")}</strong>
          </div>

          <div>
            <span>Descripción</span>
            <strong class="dato-cruce-descripcion">${this.escapar(datos.descripcion || "-")}</strong>
          </div>

          <div>
            <span>UM</span>
            <strong class="dato-cruce-um">${this.escapar(datos.um || "-")}</strong>
          </div>

          <div>
            <span>UMB</span>
            <strong class="dato-cruce-umb">${this.escapar(datos.umb || "-")}</strong>
          </div>

          <div>
            <span>Base estándar</span>
            <strong class="dato-cruce-base">${this.escapar(datos.base || "-")}</strong>
          </div>

          <div>
            <span>Altura estándar</span>
            <strong class="dato-cruce-altura">${this.escapar(datos.altura || "-")}</strong>
          </div>

          <div>
            <span>Estándar pallet</span>
            <strong class="dato-cruce-estandar">${this.escapar(datos.estandarPallet || "-")}</strong>
          </div>

          <div>
            <span>Vida útil</span>
            <strong class="dato-cruce-vida-util">${
              datos.vidaUtilAnios
                ? this.escapar(datos.vidaUtilAnios) + " años"
                : "-"
            }</strong>
          </div>

        </div>


        <div class="campos-datos-cruce-material">

          <div class="campo-correccion-material">

            <label>
              Cantidad principal
            </label>

            <input
              type="number"
              min="1"
              step="1"
              class="input-cruce-cantidad-principal"
              value="${this.escapar(
                cantidadPrincipal
              )}"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

            <small>
              No puede superar el estándar pallet.
            </small>

          </div>


          <div class="campo-correccion-material">

            <label>
              Recorte adicional
            </label>

            <input
              type="number"
              min="0"
              step="1"
              class="input-cruce-recorte"
              value="${this.escapar(
                recorte
              )}"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

          </div>


          <div class="campo-correccion-material">

            <label>
              Total material agregado
            </label>

            <input
              type="text"
              class="input-cruce-total"
              value="${this.escapar(
                total
              )}"
              disabled
            >

          </div>


          <div class="campo-correccion-material">

            <label>
              Fecha de fabricación
            </label>

            <input
              type="date"
              class="input-cruce-fecha-produccion"
              value="${this.escapar(
                datos.fechaProduccion ||
                ""
              )}"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

          </div>

        </div>


        <div class="nota-cruce-material">

          <i class="fa-solid fa-circle-info"></i>

          <span>
            El lote y el vencimiento serán calculados automáticamente al guardar.
          </span>

        </div>

      </section>

    `;

  },


  renderOpcionesTipoCorreccion(
    seleccionado
  ) {

    const opciones = [

      ["", "Seleccionar"],

      [
        "REPOSICIÓN DE FALTANTE",
        "Reposición de faltante"
      ],

      [
        "RETORNO DE SOBRANTE",
        "Retorno de sobrante"
      ],

      [
        "AJUSTE DOCUMENTAL",
        "Ajuste documental"
      ],

      [
        "CORRECCIÓN DE CONTEO",
        "Corrección de conteo"
      ],

      [
        "CRUCE DE MATERIAL",
        "Cruce de material"
      ],

      [
        "OTRA",
        "Otra"
      ]

    ];

    return opciones
      .map(
        opcion => `

          <option
            value="${this.escapar(
              opcion[0]
            )}"
            ${
              String(
                opcion[0]
              ) ===
              String(
                seleccionado ||
                ""
              )
                ? "selected"
                : ""
            }
          >

            ${this.escapar(
              opcion[1]
            )}

          </option>

        `
      )
      .join("");

  },


  esTipoCruceMaterial(
    valor
  ) {

    return String(
      valor || ""
    )
      .trim()
      .toUpperCase() ===
      "CRUCE DE MATERIAL";

  },


  /**
   * Sección SAP general.
   */
  renderCorreccionGeneral() {

    const modoConsulta =
      this.estado.modoVista ===
      "CONSULTA";


    const detalle =
      Array.isArray(
        this.estado.paquete &&
        this.estado.paquete.detalle
      )
        ? this.estado.paquete.detalle
        : [];


    const existenDiferencias =
      detalle.some(
        linea =>
          Number(
            linea.Diferencia || 0
          ) !== 0
      );


    if (
      !existenDiferencias
    ) {
      return "";
    }


    return `

      <section class="correccion-general-despacho">

        <div class="encabezado-correccion-general">

          <div>

            <span>
              Corrección del despacho
            </span>

            <strong>
              Un documento SAP puede corregir varios materiales.
            </strong>

          </div>

          <i class="fa-solid fa-file-invoice"></i>

        </div>


        <div class="campos-correccion-general">

          <div class="campo-correccion-general">

            <label for="documentoSAPCorreccionGeneral">
              Documento SAP
            </label>

            <input
              type="text"
              id="documentoSAPCorreccionGeneral"
              placeholder="4900012456"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            >

            <small>
              Puede ingresar varios documentos separados por
              -, | o ~.
            </small>

          </div>


          <div class="campo-correccion-general">

            <label for="comentarioCorreccionGeneral">
              Comentario general
            </label>

            <textarea
              id="comentarioCorreccionGeneral"
              rows="3"
              placeholder="Comentario de la operación de corrección"
              ${
                modoConsulta
                  ? "disabled"
                  : ""
              }
            ></textarea>

          </div>

        </div>


        ${
          !modoConsulta
            ? `

              <div class="pie-correccion-general">

                <span id="contadorMaterialesCorreccion">
                  0 materiales seleccionados
                </span>

                <button
                  type="button"
                  id="btnGuardarCorreccionGeneral"
                  class="btn-guardar-correccion-general"
                >

                  <i class="fa-solid fa-floppy-disk"></i>

                  Guardar corrección

                </button>

              </div>

            `
            : ""
        }

      </section>

    `;

  },


  conectarEventosVerificacion() {

    const volver =
      document.getElementById(
        "btnVolverCentroExactitud"
      );

    const editar =
      document.getElementById(
        "btnEditarVerificacion"
      );

    const lista =
      document.getElementById(
        "listaMaterialesVerificacion"
      );

    const guardarGeneral =
      document.getElementById(
        "btnGuardarCorreccionGeneral"
      );


    if (volver) {

      volver.onclick =
        evento => {

          evento.preventDefault();

          this.abrirCentro();

        };

    }


    if (editar) {

      editar.onclick =
        evento => {

          evento.preventDefault();

          this.estado.modoVista =
            "EDICION";

          this.abrirVistaVerificacion();

          this.notificar(
            "Modo edición habilitado.",
            "info"
          );

        };

    }


    if (lista) {

      lista.onclick =
        async evento => {

          const cabecera =
            evento.target.closest(
              ".cabecera-desplegable-material"
            );

          if (cabecera) {

            evento.preventDefault();

            this.alternarMaterial(
              cabecera.dataset.idDetalle
            );

            return;

          }


          const guardarLinea =
            evento.target.closest(
              ".btn-guardar-linea-verificacion"
            );

          if (guardarLinea) {

            evento.preventDefault();

            this.guardarLineaDesdeTarjeta(
              guardarLinea
            );

            return;

          }


          const buscarMaterial =
            evento.target.closest(
              ".btn-buscar-material-cruce"
            );

          if (buscarMaterial) {

            evento.preventDefault();

            const tarjeta =
              buscarMaterial.closest(
                ".tarjeta-material-verificacion"
              );

            if (tarjeta) {

              await this.buscarMaterialesCruceDesdeTarjeta(
                tarjeta
              );

            }

            return;

          }


          const opcionMaterial =
            evento.target.closest(
              ".opcion-material-cruce"
            );

          if (opcionMaterial) {

            evento.preventDefault();

            const tarjeta =
              opcionMaterial.closest(
                ".tarjeta-material-verificacion"
              );

            if (tarjeta) {

              this.seleccionarMaterialCruce(
                tarjeta,
                opcionMaterial.dataset.material
              );

            }

          }

        };


      lista.oninput =
        evento => {

          const tarjeta =
            evento.target.closest(
              ".tarjeta-material-verificacion"
            );

          if (!tarjeta) {
            return;
          }

          if (
            evento.target.matches(
              ".input-correccion-cantidad, " +
              ".input-correccion-causa, " +
              ".input-correccion-comentario, " +
              ".input-cruce-cantidad-principal, " +
              ".input-cruce-recorte, " +
              ".input-cruce-fecha-produccion"
            )
          ) {

            this.actualizarTotalCruceMaterial(
              tarjeta
            );

            this.capturarCorreccionTemporal(
              tarjeta
            );

          }

        };


      lista.onchange =
        async evento => {

          const tarjeta =
            evento.target.closest(
              ".tarjeta-material-verificacion"
            );

          if (!tarjeta) {
            return;
          }


          if (
            evento.target.matches(
              ".input-correccion-tipo"
            )
          ) {

            this.capturarCorreccionTemporal(
              tarjeta
            );

            const panel =
              tarjeta.querySelector(
                ".panel-cruce-material"
              );

            if (panel) {

              panel.hidden =
                !this.esTipoCruceMaterial(
                  evento.target.value
                );

            }

            if (
              this.esTipoCruceMaterial(
                evento.target.value
              )
            ) {

              await this.cargarCatalogoMaterialesCruce();

            }

          }


          const check =
            evento.target.closest(
              ".check-incluir-correccion"
            );

          if (check) {

            this.capturarCorreccionTemporal(
              tarjeta
            );

            this.actualizarContadorCorrecciones();

          }

        };


      lista.onkeydown =
        async evento => {

          if (
            evento.key !== "Enter" ||
            !evento.target.matches(
              ".input-busqueda-material-cruce"
            )
          ) {
            return;
          }

          evento.preventDefault();

          const tarjeta =
            evento.target.closest(
              ".tarjeta-material-verificacion"
            );

          if (tarjeta) {

            await this.buscarMaterialesCruceDesdeTarjeta(
              tarjeta
            );

          }

        };

    }


    if (guardarGeneral) {

      guardarGeneral.onclick =
        evento => {

          evento.preventDefault();

          this.guardarCorreccionGeneral();

        };

    }


    this.actualizarContadorCorrecciones();

  },


  alternarMaterial(
    idDetalle
  ) {

    this.estado.materialesAbiertos[
      idDetalle
    ] =
      !this.estado.materialesAbiertos[
        idDetalle
      ];


    const lista =
      document.getElementById(
        "listaMaterialesVerificacion"
      );


    if (lista) {

      lista.innerHTML =
        this.renderMaterialesVerificacion();

    }


    this.conectarEventosVerificacion();

  },


  /**
   * Guarda únicamente la verificación física.
   */
  async guardarLineaDesdeTarjeta(
    boton
  ) {

    const tarjeta =
      boton.closest(
        ".tarjeta-material-verificacion"
      );


    if (!tarjeta) {
      return;
    }


    const idDetalle =
      tarjeta.dataset.idDetalle;


    const cantidad =
      tarjeta.querySelector(
        ".input-cantidad-verificada"
      );


    const tarimas =
      tarjeta.querySelector(
        ".input-tarimas-verificadas"
      );


    if (
      !cantidad ||
      String(
        cantidad.value
      ).trim() === ""
    ) {

      this.notificar(
        "Debe indicar la cantidad verificada.",
        "advertencia"
      );

      return;

    }


    const sesion =
      this.obtenerSesion();


    const payload = {

      action:
        "guardarLineaVerificacionDespacho",

      idDetalleVerificacion:
        idDetalle,

      cantidadVerificada:
        cantidad.value,

      analistaNombre:
        sesion.nombre ||
        sesion.Nombre ||
        sesion.nombreCompleto ||
        "Analista"

    };


    if (
      tarimas &&
      String(
        tarimas.value
      ).trim() !== ""
    ) {

      payload.tarimasVerificadas =
        tarimas.value;

    }


    this.mostrarCarga(
      "Guardando verificación",
      "Calculando la diferencia del material."
    );


    try {

      const respuesta =
        await API.post(
          payload
        );


      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible guardar el material."
        );

      }


      await this.recargarPaqueteActual();


      this.notificar(
        respuesta.mensaje ||
        "Material guardado correctamente.",
        "exito"
      );


    } catch (error) {

      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible guardar el material.",
        "error"
      );


    } finally {

      this.ocultarCarga();

    }

  },


  capturarCorreccionTemporal(
    tarjeta
  ) {

    const idDetalle =
      tarjeta.dataset.idDetalle;

    if (!idDetalle) {
      return;
    }


    const obtener =
      selector =>
        tarjeta.querySelector(
          selector
        );


    const cantidad =
      obtener(
        ".input-correccion-cantidad"
      );

    const tipo =
      obtener(
        ".input-correccion-tipo"
      );

    const causa =
      obtener(
        ".input-correccion-causa"
      );

    const comentario =
      obtener(
        ".input-correccion-comentario"
      );

    const incluir =
      obtener(
        ".check-incluir-correccion"
      );

    const materialId =
      obtener(
        ".input-cruce-material-id"
      );

    const busqueda =
      obtener(
        ".input-busqueda-material-cruce"
      );

    const principal =
      obtener(
        ".input-cruce-cantidad-principal"
      );

    const recorte =
      obtener(
        ".input-cruce-recorte"
      );

    const fecha =
      obtener(
        ".input-cruce-fecha-produccion"
      );


    const anterior =
      this.estado.correccionesTemporales[
        idDetalle
      ] ||
      {};


    const catalogo =
      Array.isArray(
        this.estado.catalogoMaterialesCruce
      )
        ? this.estado.catalogoMaterialesCruce
        : [];


    const seleccionado =
      catalogo.find(
        item =>
          String(
            item.material ||
            ""
          ) ===
          String(
            materialId
              ? materialId.value
              : ""
          )
      ) ||
      anterior.materialCruce ||
      {};


    this.estado.correccionesTemporales[
      idDetalle
    ] = {

      incluir:
        incluir
          ? incluir.checked
          : false,

      cantidadCorreccion:
        cantidad
          ? cantidad.value
          : "",

      tipoCorreccion:
        tipo
          ? tipo.value
          : "",

      causaDiferencia:
        causa
          ? causa.value
          : "",

      comentarioDiferencia:
        comentario
          ? comentario.value
          : "",

      materialCruce: {

        material:
          materialId
            ? materialId.value
            : "",

        textoBusqueda:
          busqueda
            ? busqueda.value
            : "",

        descripcion:
          seleccionado.descripcion ||
          "",

        unidadMedida:
          seleccionado.unidadMedida ||
          "",

        um:
          seleccionado.um ||
          "",

        umb:
          seleccionado.umb ||
          "",

        base:
          seleccionado.base ||
          "",

        altura:
          seleccionado.altura ||
          "",

        estandarPallet:
          seleccionado.estandarPallet ||
          "",

        vidaUtilAnios:
          seleccionado.vidaUtilAnios ||
          "",

        cantidadPrincipal:
          principal
            ? principal.value
            : "",

        recorte:
          recorte
            ? recorte.value
            : "0",

        fechaProduccion:
          fecha
            ? fecha.value
            : ""

      }

    };

  },


  obtenerCorreccionesSeleccionadas() {

    return Object
      .keys(
        this.estado.correccionesTemporales
      )
      .map(
        idDetalle => {

          const item =
            this.estado.correccionesTemporales[
              idDetalle
            ];

          return {

            idDetalleVerificacion:
              idDetalle,

            cantidadCorreccion:
              item.cantidadCorreccion,

            tipoCorreccion:
              item.tipoCorreccion,

            causaDiferencia:
              item.causaDiferencia,

            comentarioDiferencia:
              item.comentarioDiferencia,

            materialCruce:
              this.esTipoCruceMaterial(
                item.tipoCorreccion
              )
                ? item.materialCruce ||
                  null
                : null,

            incluir:
              item.incluir === true

          };

        }
      )
      .filter(
        item => item.incluir
      );

  },


  async cargarCatalogoMaterialesCruce() {

    if (
      Array.isArray(
        this.estado.catalogoMaterialesCruce
      ) &&
      this.estado.catalogoMaterialesCruce.length > 0
    ) {

      return this.estado.catalogoMaterialesCruce;

    }


    this.mostrarCarga(
      "Cargando materiales",
      "Consultando el catálogo para el cruce."
    );


    try {

      const respuesta =
        await API.post({

          action:
            "listarMateriales"

        });


      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible cargar los materiales."
        );

      }


      const registros =
        Array.isArray(
          respuesta.data
        )
          ? respuesta.data
          : [];


      this.estado.catalogoMaterialesCruce =
        registros
          .map(
            item =>
              this.normalizarMaterialCruceCatalogo(
                item
              )
          )
          .filter(
            item =>
              item.material
          );


      return this.estado.catalogoMaterialesCruce;


    } finally {

      this.ocultarCarga();

    }

  },


  normalizarMaterialCruceCatalogo(
    item
  ) {

    const material =
      String(
        item.id ||
        item.ID_Material ||
        item.idMaterial ||
        item.Material ||
        item.material ||
        ""
      ).trim();


    const base =
      Number(
        item.base ||
        item.Base_Estandar ||
        item.baseEstandar ||
        0
      );


    const altura =
      Number(
        item.altura ||
        item.Altura_Estandar ||
        item.alturaEstandar ||
        0
      );


    return {

      material:
        material,

      descripcion:
        String(
          item.descripcion ||
          item.Descripcion ||
          ""
        ).trim(),

      unidadMedida:
        String(
          item.unidad_medida ||
          item.Unidad_Medida ||
          item.unidadMedida ||
          ""
        ).trim(),

      um:
        String(
          item.um ||
          item.UM ||
          ""
        ).trim(),

      umb:
        Number(
          item.umb ||
          item.UMB ||
          0
        ),

      base:
        base,

      altura:
        altura,

      estandarPallet:
        Number(
          item.estandarPallet ||
          item.Estandar_Pallet ||
          (
            base *
            altura
          ) ||
          0
        ),

      vidaUtilAnios:
        Number(
          item.vida_util ||
          item.Vida_Util_Años ||
          item.vidaUtilAnios ||
          0
        )

    };

  },


  async buscarMaterialesCruceDesdeTarjeta(
    tarjeta
  ) {

    const input =
      tarjeta.querySelector(
        ".input-busqueda-material-cruce"
      );


    const contenedor =
      tarjeta.querySelector(
        ".resultados-material-cruce"
      );


    if (
      !input ||
      !contenedor
    ) {
      return;
    }


    const texto =
      String(
        input.value ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      texto.length < 2
    ) {

      this.notificar(
        "Escriba al menos dos caracteres para buscar.",
        "advertencia"
      );

      return;

    }


    const catalogo =
      await this.cargarCatalogoMaterialesCruce();


    const resultados =
      catalogo
        .filter(
          item =>
            String(
              item.material ||
              ""
            )
              .toLowerCase()
              .includes(
                texto
              ) ||
            String(
              item.descripcion ||
              ""
            )
              .toLowerCase()
              .includes(
                texto
              )
        )
        .slice(
          0,
          15
        );


    if (
      resultados.length === 0
    ) {

      contenedor.innerHTML = `

        <div class="resultado-material-cruce-vacio">

          No se encontraron materiales.

        </div>

      `;

      contenedor.hidden =
        false;

      return;

    }


    contenedor.innerHTML =
      resultados
        .map(
          item => `

            <button
              type="button"
              class="opcion-material-cruce"
              data-material="${this.escapar(
                item.material
              )}"
            >

              <strong>
                ${this.escapar(
                  item.material
                )}
              </strong>

              <span>
                ${this.escapar(
                  item.descripcion
                )}
              </span>

              <small>
                ${
                  item.um
                    ? this.escapar(
                        item.um
                      ) + " · "
                    : ""
                }

                Estándar:
                ${this.escapar(
                  item.estandarPallet
                )}
              </small>

            </button>

          `
        )
        .join("");


    contenedor.hidden =
      false;

  },


  seleccionarMaterialCruce(
    tarjeta,
    materialId
  ) {

    const catalogo =
      Array.isArray(
        this.estado.catalogoMaterialesCruce
      )
        ? this.estado.catalogoMaterialesCruce
        : [];


    const material =
      catalogo.find(
        item =>
          String(
            item.material
          ) ===
          String(
            materialId
          )
      );


    if (!material) {

      this.notificar(
        "No fue posible identificar el material seleccionado.",
        "error"
      );

      return;

    }


    const texto =
      (
        selector,
        valor
      ) => {

        const elemento =
          tarjeta.querySelector(
            selector
          );

        if (elemento) {

          elemento.textContent =
            valor === "" ||
            valor === null ||
            typeof valor === "undefined"
              ? "-"
              : valor;

        }

      };


    const id =
      tarjeta.querySelector(
        ".input-cruce-material-id"
      );

    const busqueda =
      tarjeta.querySelector(
        ".input-busqueda-material-cruce"
      );

    const cantidad =
      tarjeta.querySelector(
        ".input-cruce-cantidad-principal"
      );

    const resultados =
      tarjeta.querySelector(
        ".resultados-material-cruce"
      );


    if (id) {

      id.value =
        material.material;

    }


    if (busqueda) {

      busqueda.value =
        material.material +
        " - " +
        material.descripcion;

    }


    if (
      cantidad &&
      !String(
        cantidad.value ||
        ""
      ).trim()
    ) {

      cantidad.value =
        material.estandarPallet ||
        "";

    }


    texto(
      ".dato-cruce-material",
      material.material
    );

    texto(
      ".dato-cruce-descripcion",
      material.descripcion
    );

    texto(
      ".dato-cruce-um",
      material.um
    );

    texto(
      ".dato-cruce-umb",
      material.umb
    );

    texto(
      ".dato-cruce-base",
      material.base
    );

    texto(
      ".dato-cruce-altura",
      material.altura
    );

    texto(
      ".dato-cruce-estandar",
      material.estandarPallet
    );

    texto(
      ".dato-cruce-vida-util",
      material.vidaUtilAnios
        ? material.vidaUtilAnios +
          " años"
        : "-"
    );


    if (resultados) {

      resultados.hidden =
        true;

    }


    this.actualizarTotalCruceMaterial(
      tarjeta
    );

    this.capturarCorreccionTemporal(
      tarjeta
    );

  },


  actualizarTotalCruceMaterial(
    tarjeta
  ) {

    const principal =
      tarjeta.querySelector(
        ".input-cruce-cantidad-principal"
      );

    const recorte =
      tarjeta.querySelector(
        ".input-cruce-recorte"
      );

    const total =
      tarjeta.querySelector(
        ".input-cruce-total"
      );


    if (!total) {
      return;
    }


    total.value =
      Number(
        principal
          ? principal.value || 0
          : 0
      ) +
      Number(
        recorte
          ? recorte.value || 0
          : 0
      );

  },


  actualizarContadorCorrecciones() {

    const contador =
      document.getElementById(
        "contadorMaterialesCorreccion"
      );


    if (!contador) {
      return;
    }


    const cantidad =
      this.obtenerCorreccionesSeleccionadas()
        .length;


    contador.textContent =
      cantidad +
      (
        cantidad === 1
          ? " material seleccionado"
          : " materiales seleccionados"
      );

  },


  /**
   * Guarda un SAP para varias líneas.
   */
  async guardarCorreccionGeneral() {

    const correcciones =
      this.obtenerCorreccionesSeleccionadas();


    if (
      correcciones.length === 0
    ) {

      this.notificar(
        "Seleccione al menos un material para corregir.",
        "advertencia"
      );

      return;

    }


    for (
      let i = 0;
      i < correcciones.length;
      i++
    ) {

      if (
        String(
          correcciones[i]
            .cantidadCorreccion ||
          ""
        ).trim() === ""
      ) {

        this.notificar(
          "Debe indicar la cantidad corregida de todos los materiales seleccionados.",
          "advertencia"
        );

        return;

      }


      if (
        !String(
          correcciones[i]
            .tipoCorreccion ||
          ""
        ).trim()
      ) {

        this.notificar(
          "Debe seleccionar el tipo de corrección de todos los materiales.",
          "advertencia"
        );

        return;

      }

      if (
        this.esTipoCruceMaterial(
          correcciones[i]
            .tipoCorreccion
        )
      ) {

        const cruce =
          correcciones[i]
            .materialCruce ||
          {};


        if (
          !String(
            cruce.material ||
            ""
          ).trim()
        ) {

          this.notificar(
            "Debe seleccionar el material destino del cruce.",
            "advertencia"
          );

          return;

        }


        if (
          Number(
            cruce.cantidadPrincipal ||
            0
          ) <= 0
        ) {

          this.notificar(
            "Debe indicar una cantidad principal válida para el material cruzado.",
            "advertencia"
          );

          return;

        }


        if (
          !String(
            cruce.fechaProduccion ||
            ""
          ).trim()
        ) {

          this.notificar(
            "Debe indicar la fecha de fabricación del material cruzado.",
            "advertencia"
          );

          return;

        }

      }

    }


    const documento =
      document.getElementById(
        "documentoSAPCorreccionGeneral"
      );


    const comentario =
      document.getElementById(
        "comentarioCorreccionGeneral"
      );


    if (
      !documento ||
      !String(
        documento.value ||
        ""
      ).trim()
    ) {

      this.notificar(
        "Debe registrar el documento SAP de la corrección.",
        "advertencia"
      );

      return;

    }


    const paquete =
      this.estado.paquete ||
      {};


    const verificacion =
      paquete.verificacion ||
      {};


    const sesion =
      this.obtenerSesion();


    const corregidoPor =
      sesion.nombre ||
      sesion.Nombre ||
      sesion.nombreCompleto ||
      "Analista";


    this.mostrarCarga(
      "Guardando corrección",
      "Validando el documento SAP y actualizando los materiales."
    );


    try {

      /*
       * =====================================================
       * 1. REGISTRAR CORRECCIÓN Y MODIFICAR EL CONDUCE
       * =====================================================
       */
      const respuesta =
        await API.post({

          action:
            "guardarCorreccionGeneralVerificacionDespacho",

          idVerificacion:
            verificacion.ID_Verificacion,

          documentoSAP:
            documento.value,

          comentarioGeneral:
            comentario
              ? comentario.value
              : "",

          corregidoPor:
            corregidoPor,

          correcciones:
            correcciones.map(
              item => ({

                idDetalleVerificacion:
                  item.idDetalleVerificacion,

                cantidadCorreccion:
                  item.cantidadCorreccion,

                tipoCorreccion:
                  item.tipoCorreccion,

                causaDiferencia:
                  item.causaDiferencia,

                comentarioDiferencia:
                  item.comentarioDiferencia,

                materialCruce:
                  item.materialCruce ||
                  null

              })
            )

        });


      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible guardar la corrección."
        );

      }


      const resultadoCorreccion =
        respuesta.data ||
        {};


      const conduceCorregido =
        resultadoCorreccion
          .conduceCorregido ||
        null;


      if (
        !conduceCorregido ||
        !conduceCorregido.conduce
      ) {

        throw new Error(
          "La corrección fue registrada, pero el backend no devolvió el conduce corregido para generar su documento."
        );

      }


      /*
       * =====================================================
       * 2. CONSTRUIR EL HTML OFICIAL DEL CONDUCE
       * =====================================================
       *
       * Reutilizamos exactamente el generador que ya funciona
       * en despachos.js. El estado global de Conduce se conserva
       * y se restaura al finalizar para no alterar otros módulos.
       */
		/*
		 * Cerramos la etapa anterior antes de abrir la siguiente.
		 * Esto mantiene equilibrado el contador interno del cargador.
		 */
		this.ocultarCarga();


		this.mostrarCarga(
		  "Generando conduce corregido",
		  "Recalculando el documento oficial con las cantidades verificadas."
		);


      const htmlCorregido =
        await this.construirHTMLConduceCorregido(
          conduceCorregido.conduce
        );


      if (!htmlCorregido) {

        throw new Error(
          "No fue posible construir el HTML del conduce corregido."
        );

      }


      /*
       * =====================================================
       * 3. GUARDAR PDF VERSIONADO EN DRIVE
       * =====================================================
       */
      /*
	 * Cerramos la etapa de generación antes de mostrar la etapa
	 * de guardado del PDF.
	 */
	this.ocultarCarga();


	this.mostrarCarga(
	  "Guardando PDF corregido",
	  "Creando una nueva versión sin eliminar el conduce original."
	);

      const respuestaPDF =
        await API.post({

          action:
            "guardarPDFConduce",

          idConduce:
            conduceCorregido.idConduce,

          noConduce:
            conduceCorregido.noConduce,

          html:
            htmlCorregido,

          tipoDocumento:
            "CORRECCION",

          corregidoPor:
            corregidoPor,

          documentoSAP:
            documento.value,

          comentarioCorreccion:
            comentario
              ? comentario.value
              : ""

        });


      if (
        !respuestaPDF ||
        !respuestaPDF.ok
      ) {

        throw new Error(
          respuestaPDF &&
          respuestaPDF.mensaje
            ? (
                "La corrección fue aplicada al conduce, pero no fue posible generar el PDF: " +
                respuestaPDF.mensaje
              )
            : "La corrección fue aplicada al conduce, pero no fue posible generar el PDF."
        );

      }


      const pdf =
        respuestaPDF.data ||
        {};


      this.estado.correccionesTemporales =
        {};


      await this.recargarPaqueteActual();


      /*
       * =====================================================
       * 4. RESULTADO VISIBLE PARA EL USUARIO
       * =====================================================
       */
      this.mostrarResultadoCorreccion({

        noConduce:
          conduceCorregido.noConduce,

        materialesCorregidos:
          resultadoCorreccion.operacion &&
          resultadoCorreccion.operacion
            .materialesCorregidos
              ? resultadoCorreccion.operacion
                  .materialesCorregidos
              : correcciones.length,

        totalLineas:
          conduceCorregido.totalLineas,

        totalUnidades:
          conduceCorregido.totalUnidades,

        numeroCorreccion:
          pdf.numeroCorreccion,

        nombreArchivo:
          pdf.nombreArchivo,

        archivoUrl:
          pdf.archivoUrl,

        carpetaUrl:
          pdf.carpetaUrl,

        originalConservado:
          pdf.originalConservado === true

      });


      this.notificar(
        "Corrección aplicada y PDF generado correctamente.",
        "exito"
      );


    } catch (error) {

      console.error(
        "Error guardando la corrección general:",
        error
      );


      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible guardar la corrección.",
        "error"
      );


    } finally {

      this.ocultarCarga();

    }

  },


  /**
   * Construye el HTML oficial reutilizando despachos.js.
   *
   * No modifica permanentemente el estado global de Conduce.
   */
 async construirHTMLConduceCorregido(
  conduce
) {

  if (
    !window.Despachos ||
    typeof Despachos
      .construirHTMLConduceFinal !==
      "function"
  ) {

    throw new Error(
      "El generador oficial de conduces no está cargado. Verifique que despachos.js esté incluido antes de exactitudDespachos.js."
    );

  }


  /*
   * Conduce está declarado directamente en despachos.js.
   * Puede existir como variable global aunque no aparezca
   * dentro de window.
   */
  if (
    typeof Conduce ===
    "undefined"
  ) {

    throw new Error(
      "El estado interno del módulo de despachos no está disponible."
    );

  }


  const datos =
    conduce ||
    {};


  if (
    !datos.encabezado ||
    !Array.isArray(
      datos.detalle
    )
  ) {

    throw new Error(
      "El conduce corregido no contiene encabezado y detalle válidos."
    );

  }


  if (
    datos.detalle.length === 0
  ) {

    throw new Error(
      "El conduce corregido no contiene líneas para generar el documento."
    );

  }


  /*
   * Conservamos el estado verdadero usado por despachos.js.
   */
  const encabezadoAnterior =
    Conduce.encabezado;


  const detalleAnterior =
    Conduce.detalle;


  try {

    /*
     * Cargamos temporalmente el conduce corregido dentro del
     * mismo objeto que utiliza construirHTMLConduceFinal().
     */
    Conduce.encabezado =
      JSON.parse(
        JSON.stringify(
          datos.encabezado
        )
      );


    Conduce.detalle =
      JSON.parse(
        JSON.stringify(
          datos.detalle
        )
      );


    console.log(
      "Generando PDF corregido:",
      {
        noConduce:
          Conduce.encabezado
            .noConduce,

        totalLineas:
          Conduce.detalle.length,

        primeraLinea:
          Conduce.detalle[0]
      }
    );


    const html =
      await Promise.race([

        Despachos
          .construirHTMLConduceFinal(),

        new Promise(
          (
            resolver,
            rechazar
          ) => {

            setTimeout(
              () => {

                rechazar(
                  new Error(
                    "La generación del conduce corregido superó el tiempo máximo permitido."
                  )
                );

              },
              30000
            );

          }
        )

      ]);


    if (
      !html ||
      typeof html !==
      "string"
    ) {

      throw new Error(
        "El generador oficial no devolvió el HTML del conduce corregido."
      );

    }


    return html;


  } finally {

    /*
     * Restauramos el estado anterior para no afectar el
     * asistente normal de despachos.
     */
    Conduce.encabezado =
      encabezadoAnterior;


    Conduce.detalle =
      detalleAnterior;

  }

},


  /**
   * Presenta el resultado completo de la corrección.
   */
  mostrarResultadoCorreccion(
    datos
  ) {

    const resultado =
      datos ||
      {};


    const urlPDF =
      String(
        resultado.archivoUrl ||
        ""
      ).trim();


    const urlCarpeta =
      String(
        resultado.carpetaUrl ||
        ""
      ).trim();


    const contenido = `

      <section class="resultado-correccion-despacho">

        <div class="resultado-correccion-icono">

          <i class="fa-solid fa-circle-check"></i>

        </div>


        <div class="resultado-correccion-encabezado">

          <span>
            Corrección completada
          </span>

          <h3>
            Conduce ${this.escapar(
              resultado.noConduce ||
              "-"
            )}
          </h3>

          <p>
            El documento corregido fue creado como una nueva
            versión. El conduce original permanece almacenado
            en la misma carpeta de Drive.
          </p>

        </div>


        <div class="resultado-correccion-resumen">

          <article>

            <span>
              Materiales corregidos
            </span>

            <strong>
              ${this.formatearNumero(
				  resultado.materialesCorregidos
				)}
            </strong>

          </article>


          <article>

            <span>
              Líneas del conduce
            </span>

            <strong>
              ${this.formatearNumero(
				  resultado.totalLineas
				)}
            </strong>

          </article>


          <article>

            <span>
              Unidades vigentes
            </span>

            <strong>
              ${this.formatearNumero(
				  resultado.totalUnidades
				)}
            </strong>

          </article>


          <article>

            <span>
              Versión
            </span>

            <strong>
              Corrección ${String(
                Number(
                  resultado.numeroCorreccion ||
                  0
                )
              ).padStart(
                2,
                "0"
              )}
            </strong>

          </article>

        </div>


        <div class="resultado-correccion-archivo">

          <i class="fa-solid fa-file-pdf"></i>

          <div>

            <span>
              Documento vigente
            </span>

            <strong>
              ${this.escapar(
                resultado.nombreArchivo ||
                "PDF corregido"
              )}
            </strong>

          </div>

        </div>


        <div class="resultado-correccion-nota">

          <i class="fa-solid fa-shield-halved"></i>

          <span>
            El PDF contiene la marca visual
            <strong>CORRECCIÓN</strong> y su información de
            trazabilidad.
          </span>

        </div>


        <div class="resultado-correccion-acciones">

          ${
            urlPDF
              ? `

                <button
                  type="button"
                  id="btnVerPDFCorreccion"
                  class="btn-resultado-correccion principal"
                >

                  <i class="fa-solid fa-eye"></i>

                  Ver PDF

                </button>


                <button
                  type="button"
                  id="btnImprimirPDFCorreccion"
                  class="btn-resultado-correccion secundario"
                >

                  <i class="fa-solid fa-print"></i>

                  Imprimir

                </button>

              `
              : ""
          }


          ${
            urlCarpeta
              ? `

                <button
                  type="button"
                  id="btnAbrirCarpetaCorreccion"
                  class="btn-resultado-correccion secundario"
                >

                  <i class="fa-brands fa-google-drive"></i>

                  Ver carpeta

                </button>

              `
              : ""
          }


          <button
            type="button"
            id="btnCerrarResultadoCorreccion"
            class="btn-resultado-correccion cerrar"
          >

            <i class="fa-solid fa-xmark"></i>

            Cerrar

          </button>

        </div>

      </section>

    `;


    Sistema.abrirModal(
      "Resultado de la corrección",
      contenido,
      {
        clase:
          "modal-resultado-correccion"
      }
    );


    const verPDF =
      document.getElementById(
        "btnVerPDFCorreccion"
      );


    const imprimir =
      document.getElementById(
        "btnImprimirPDFCorreccion"
      );


    const carpeta =
      document.getElementById(
        "btnAbrirCarpetaCorreccion"
      );


    const cerrar =
      document.getElementById(
        "btnCerrarResultadoCorreccion"
      );


    if (verPDF) {

      verPDF.onclick =
        () => {

          window.open(
            urlPDF,
            "_blank",
            "noopener,noreferrer"
          );

        };

    }


    if (imprimir) {

      imprimir.onclick =
        () => {

          const ventana =
            window.open(
              urlPDF,
              "_blank",
              "noopener,noreferrer"
            );


          if (!ventana) {

            this.notificar(
              "El navegador bloqueó la ventana de impresión.",
              "advertencia"
            );

            return;

          }


          /*
           * Drive puede requerir cargar primero su visor.
           * Por eso abrimos el PDF en una pestaña independiente
           * y el usuario utiliza la impresión del visor.
           */
          this.notificar(
            "El PDF fue abierto. Utilice el botón de impresión del visor.",
            "info"
          );

        };

    }


    if (carpeta) {

      carpeta.onclick =
        () => {

          window.open(
            urlCarpeta,
            "_blank",
            "noopener,noreferrer"
          );

        };

    }


    if (cerrar) {

      cerrar.onclick =
        () => {

          const modal =
            document.getElementById(
              "modalSistema"
            );


          if (modal) {

            modal.classList.add(
              "oculto"
            );

          }


          this.abrirCentro();

        };

    }

  },


  /**
   * Reconsulta el backend después de cada escritura.
   *
   * Garantiza que el frontend no invente estados.
   */
  async recargarPaqueteActual() {

    const paquete =
      this.estado.paquete ||
      {};


    const verificacion =
      paquete.verificacion ||
      {};


    const idVerificacion =
      String(
        verificacion.ID_Verificacion ||
        ""
      ).trim();


    if (!idVerificacion) {

      throw new Error(
        "No fue posible identificar la verificación actual."
      );

    }


    const respuesta =
      await API.post({

        action:
          "obtenerVerificacionDespacho",

        idVerificacion:
          idVerificacion

      });


    if (
      !respuesta ||
      !respuesta.ok
    ) {

      throw new Error(
        respuesta &&
        respuesta.mensaje
          ? respuesta.mensaje
          : "No fue posible actualizar la verificación."
      );

    }


    this.estado.paquete =
      respuesta.data ||
      {};


    this.abrirVistaVerificacion();

  },


  valorPendienteLinea(
    linea
  ) {

    if (
      linea.Diferencia_Pendiente === "" ||
      linea.Diferencia_Pendiente === null ||
      linea.Diferencia_Pendiente === undefined
    ) {

      return Math.abs(
        Number(
          linea.Diferencia || 0
        )
      );

    }


    return Math.abs(
      Number(
        linea.Diferencia_Pendiente ||
        0
      )
    );

  },


  claseEstadoLinea(
    estado,
    tieneDiferencia
  ) {

    const normalizado =
      this.normalizarTexto(
        estado
      );


    if (
      normalizado === "resuelta"
    ) {
      return "resuelta";
    }


    if (
      normalizado ===
      "parcialmente resuelta"
    ) {
      return "parcial";
    }


    if (
      normalizado === "pendiente" ||
      tieneDiferencia
    ) {
      return "diferencia";
    }


    if (
      normalizado ===
      "pendiente de verificar"
    ) {
      return "pendiente";
    }


    return "conforme";

  },


  /**
   * Genera el PDF temporal del Centro de Exactitud.
   *
   * Usa los filtros activos y consulta todas las páginas
   * del resultado sin modificar el listado visible.
   */
  async generarPDFCentroExactitud() {

    this.leerFiltrosCentro();


    const boton =
      document.getElementById(
        "btnPDFExactitud"
      );


    if (
      Number(
        this.estado.total || 0
      ) <= 0
    ) {

      this.notificar(
        "No existen conduces con los filtros actuales para generar el PDF.",
        "advertencia"
      );

      return;

    }


    if (boton) {

      boton.disabled =
        true;

      boton.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Generando...

      `;

    }


    this.mostrarCarga(
      "Generando reporte",
      "Preparando el informe de exactitud con los filtros seleccionados."
    );


    try {

      const registros =
        await this.obtenerTodosRegistrosReporteExactitud();


      if (
        registros.length === 0
      ) {

        throw new Error(
          "No existen registros disponibles para el informe."
        );

      }


      const graficos =
        this.capturarGraficosReporteExactitud();


      const sesion =
        this.obtenerSesion();


      const generadoPor =
        sesion.nombre ||
        sesion.Nombre ||
        sesion.nombreCompleto ||
        sesion.usuario ||
        "Usuario del sistema";


      const respuesta =
        await API.post({

          action:
            "generarPDFCentroExactitudDespachos",

          filtros:
            Object.assign(
              {},
              this.estado.filtros
            ),

          resumen:
            Object.assign(
              {},
              this.estado.resumen
            ),

          evolucion:
            Array.isArray(
              this.estado.evolucion
            )
              ? this.estado.evolucion
              : [],

          registros:
            registros,

          graficoExactitudBase64:
            graficos.exactitud,

          graficoDesviacionesBase64:
            graficos.desviaciones,

          generadoPor:
            generadoPor

        });


      const resultado =
        respuesta &&
        respuesta.data &&
        !respuesta.base64
          ? respuesta.data
          : respuesta;


      if (
        !resultado ||
        resultado.exito !== true
      ) {

        throw new Error(
          resultado &&
          resultado.mensaje
            ? resultado.mensaje
            : "No fue posible generar el reporte de exactitud."
        );

      }


      if (!resultado.base64) {

        throw new Error(
          "El servidor no devolvió el contenido del PDF."
        );

      }


      this.abrirPDFBase64Exactitud(
        resultado.base64,
        resultado.nombreArchivo ||
        "Reporte_Exactitud_Despachos.pdf"
      );


      this.notificar(
        resultado.mensaje ||
        "Reporte de exactitud generado correctamente.",
        "exito"
      );


    } catch (error) {

      console.error(
        "Error generando el PDF de exactitud:",
        error
      );


      this.notificar(
        error &&
        error.message
          ? error.message
          : "No fue posible generar el PDF de exactitud.",
        "error"
      );


    } finally {

      this.ocultarCarga();


      if (boton) {

        boton.disabled =
          false;

        boton.innerHTML = `

          <i class="fa-solid fa-file-pdf"></i>

          PDF

        `;

      }

    }

  },


  /**
   * Consulta todos los registros filtrados en bloques de 50.
   *
   * El backend limita cada consulta a 50 registros.
   */
  async obtenerTodosRegistrosReporteExactitud() {

    const filtros =
      this.estado.filtros ||
      {};


    const registros = [];

    let desplazamiento =
      0;

    let hayMas =
      true;

    let seguridad =
      0;


    while (
      hayMas &&
      seguridad < 500
    ) {

      const respuesta =
        await API.post({

          action:
            "obtenerCentroExactitudDespachos",

          limite:
            50,

          desplazamiento:
            desplazamiento,

          fechaDesde:
            filtros.fechaDesde || "",

          fechaHasta:
            filtros.fechaHasta || "",

          busqueda:
            filtros.busqueda || "",

          supervisor:
            filtros.supervisor || "",

          estado:
            filtros.estado || "",

          resultado:
            filtros.resultado || "",

          resolucion:
            filtros.resolucion || "",

          tipoDiferencia:
            filtros.tipoDiferencia || "",

          agrupacion:
            filtros.agrupacion || "DIA",

          soloPendientes:
            filtros.soloPendientes === true

        });


      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible cargar todos los registros del reporte."
        );

      }


      const datos =
        respuesta.data ||
        {};


      const pagina =
        Array.isArray(
          datos.registros
        )
          ? datos.registros
          : [];


      registros.push(
        ...pagina
      );


      hayMas =
        datos.hayMas === true;


      desplazamiento =
        Number(
          datos.siguienteDesplazamiento ||
          registros.length
        );


      seguridad++;

    }


    if (
      seguridad >= 500
    ) {

      throw new Error(
        "La consulta del reporte superó el límite de páginas permitido."
      );

    }


    return registros;

  },


  /**
   * Captura ambos gráficos actuales como imágenes PNG.
   */
   /**
   * Captura los gráficos para el PDF en un tamaño controlado.
   *
   * No altera los canvas visibles. Crea copias comprimidas
   * para evitar solicitudes y respuestas Base64 excesivas.
   */
  capturarGraficosReporteExactitud() {

    const capturarComprimido =
      (
        idCanvas,
        anchoMaximo,
        altoMaximo
      ) => {

        try {

          const origen =
            document.getElementById(
              idCanvas
            );


          if (
            !origen ||
            typeof origen.toDataURL !==
              "function"
          ) {

            return "";

          }


          const anchoOrigen =
            Number(
              origen.width ||
              origen.clientWidth ||
              0
            );


          const altoOrigen =
            Number(
              origen.height ||
              origen.clientHeight ||
              0
            );


          if (
            anchoOrigen <= 0 ||
            altoOrigen <= 0
          ) {

            return "";

          }


          const escala =
            Math.min(
              1,
              anchoMaximo /
                anchoOrigen,
              altoMaximo /
                altoOrigen
            );


          const anchoDestino =
            Math.max(
              1,
              Math.round(
                anchoOrigen *
                escala
              )
            );


          const altoDestino =
            Math.max(
              1,
              Math.round(
                altoOrigen *
                escala
              )
            );


          const copia =
            document.createElement(
              "canvas"
            );


          copia.width =
            anchoDestino;


          copia.height =
            altoDestino;


          const contexto =
            copia.getContext(
              "2d"
            );


          if (!contexto) {

            return "";

          }


          /*
           * Fondo blanco necesario porque JPEG no admite
           * transparencia.
           */
          contexto.fillStyle =
            "#FFFFFF";


          contexto.fillRect(
            0,
            0,
            anchoDestino,
            altoDestino
          );


          contexto.drawImage(
            origen,
            0,
            0,
            anchoOrigen,
            altoOrigen,
            0,
            0,
            anchoDestino,
            altoDestino
          );


          /*
           * JPEG reduce considerablemente el peso frente al PNG
           * generado directamente por Chart.js.
           */
          return copia.toDataURL(
            "image/jpeg",
            0.78
          );


        } catch (error) {

          console.warn(
            "No fue posible capturar el gráfico " +
            idCanvas +
            ":",
            error
          );


          return "";

        }

      };


    return {

      exactitud:
        capturarComprimido(
          "graficoEvolucionExactitud",
          900,
          420
        ),

      desviaciones:
        capturarComprimido(
          "graficoDesviacionesExactitud",
          760,
          420
        )

    };

  },

  /**
   * Abre un PDF Base64 en una pestaña nueva.
   */
  abrirPDFBase64Exactitud(
    base64,
    nombreArchivo
  ) {

    const binario =
      window.atob(
        String(
          base64 || ""
        )
      );


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
        binario.charCodeAt(
          i
        );

    }


    const blob =
      new Blob(
        [
          bytes
        ],
        {
          type:
            "application/pdf"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const ventana =
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );


    if (!ventana) {

      const enlace =
        document.createElement(
          "a"
        );


      enlace.href =
        url;


      enlace.download =
        nombreArchivo ||
        "Reporte_Exactitud_Despachos.pdf";


      document.body.appendChild(
        enlace
      );


      enlace.click();
      enlace.remove();

    }


    window.setTimeout(
      () => {

        URL.revokeObjectURL(
          url
        );

      },
      120000
    );

  },


  obtenerSesion() {

    try {

      return JSON.parse(

        localStorage.getItem(
          "sesion"
        ) ||

        sessionStorage.getItem(
          "sesion"
        ) ||

        "{}"

      );


    } catch (error) {

      return {};

    }

  },


  mostrarCarga(
    titulo,
    mensaje
  ) {

    if (
      window.CargadorSistema &&
      typeof CargadorSistema.mostrar ===
        "function"
    ) {

      CargadorSistema.mostrar(
        titulo,
        mensaje
      );

      return;

    }


    if (
      window.Sistema &&
      typeof Sistema.mostrarCarga ===
        "function"
    ) {

      Sistema.mostrarCarga(
        titulo,
        mensaje
      );

    }

  },


  ocultarCarga() {

    if (
      window.CargadorSistema &&
      typeof CargadorSistema.ocultar ===
        "function"
    ) {

      CargadorSistema.ocultar();

      return;

    }


    if (
      window.Sistema &&
      typeof Sistema.ocultarCarga ===
        "function"
    ) {

      Sistema.ocultarCarga();

    }

  },


  notificar(
    mensaje,
    tipo
  ) {

    const tipoSeguro =
      tipo ||
      "info";


    if (
      window.Sistema &&
      typeof Sistema[
        tipoSeguro
      ] === "function"
    ) {

      Sistema[
        tipoSeguro
      ](
        mensaje
      );

      return;

    }


    console.log(
      tipoSeguro,
      mensaje
    );

  },


  tieneValor(
    valor
  ) {

    return String(
      valor === null ||
      valor === undefined
        ? ""
        : valor
    ).trim() !== "";

  },


  normalizarTexto(
    valor
  ) {

    return String(
      valor || ""
    )
      .trim()
      .toLowerCase()
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );

  },


  formatearFechaISO(
    fecha
  ) {

    return [

      fecha.getFullYear(),

      String(
        fecha.getMonth() + 1
      ).padStart(
        2,
        "0"
      ),

      String(
        fecha.getDate()
      ).padStart(
        2,
        "0"
      )

    ].join("-");

  },


  formatearNumero(
    valor
  ) {

    return Number(
      valor || 0
    ).toLocaleString(
      "en-US",
      {
        maximumFractionDigits:
          2
      }
    );

  },


  formatearPorcentaje(
    valor
  ) {

    return Number(
      valor || 0
    ).toFixed(
      2
    ) + "%";

  },


  formatearMoneda(
    valor
  ) {

    return "RD$ " +
      Number(
        valor || 0
      ).toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      );

  },


  escapar(
    valor
  ) {

    return String(
      valor === null ||
      valor === undefined
        ? ""
        : valor
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

  }

};


document.addEventListener(

  "DOMContentLoaded",

  function() {

    /*
     * La tarjeta se construye inmediatamente para mantener
     * la misma apariencia del Dashboard.
     *
     * Su consulta al backend se ejecuta después, de forma
     * secuencial, desde DashboardIndicadores.
     */
    ExactitudDespachos.prepararTarjeta();
    ExactitudDespachos.inicializarAccesoDirecto();

  }

);

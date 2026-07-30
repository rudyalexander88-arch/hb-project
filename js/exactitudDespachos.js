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

    this.prepararTarjeta();
    this.cargarTarjeta();

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
                    "Bultos",

                  data: [

                    resumen.faltantes || 0,
                    resumen.sobrantes || 0,
                    resumen.bultosCorregidos || 0,
                    resumen.bultosPendientes || 0

                  ]

                }

              ]

            },

            options: {

              responsive:
                true,

              maintainAspectRatio:
                false

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
                temporal.tipoCorreccion ||
                linea.Tipo_Correccion
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


  renderOpcionesTipoCorreccion(
    seleccionado
  ) {

    const opciones = [

      "",

      "REPOSICIÓN DE FALTANTE",

      "RETORNO DE SOBRANTE",

      "AJUSTE DOCUMENTAL",

      "CORRECCIÓN DE CONTEO",

      "OTRA"

    ];


    return opciones
      .map(
        valor => `

          <option
            value="${this.escapar(
              valor
            )}"
            ${
              String(valor) ===
              String(
                seleccionado ||
                ""
              )
                ? "selected"
                : ""
            }
          >

            ${
              valor ||
              "Seleccionar"
            }

          </option>

        `
      )
      .join("");

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
        evento => {

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
              ".input-correccion-tipo, " +
              ".input-correccion-causa, " +
              ".input-correccion-comentario"
            )
          ) {

            this.capturarCorreccionTemporal(
              tarjeta
            );

          }

        };


      lista.onchange =
        evento => {

          const check =
            evento.target.closest(
              ".check-incluir-correccion"
            );


          if (check) {

            const tarjeta =
              check.closest(
                ".tarjeta-material-verificacion"
              );


            if (tarjeta) {

              this.capturarCorreccionTemporal(
                tarjeta
              );

              this.actualizarContadorCorrecciones();

            }

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


    const cantidad =
      tarjeta.querySelector(
        ".input-correccion-cantidad"
      );


    const tipo =
      tarjeta.querySelector(
        ".input-correccion-tipo"
      );


    const causa =
      tarjeta.querySelector(
        ".input-correccion-causa"
      );


    const comentario =
      tarjeta.querySelector(
        ".input-correccion-comentario"
      );


    const incluir =
      tarjeta.querySelector(
        ".check-incluir-correccion"
      );


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
          : ""

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

            incluir:
              item.incluir === true

          };

        }
      )
      .filter(
        item => item.incluir
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


    this.mostrarCarga(
      "Guardando corrección",
      "Actualizando los materiales y el documento SAP."
    );


    try {

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
            sesion.nombre ||
            sesion.Nombre ||
            sesion.nombreCompleto ||
            "Analista",

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
                  item.comentarioDiferencia

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


      this.estado.correccionesTemporales =
        {};


      await this.recargarPaqueteActual();


      this.notificar(
        respuesta.mensaje ||
        "Corrección guardada correctamente.",
        "exito"
      );


    } catch (error) {

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

    ExactitudDespachos.iniciar();

  }

);

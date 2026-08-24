/**
 * ============================================================
 * VERIFICACIONRECEPCIONES.JS
 * Sistema Logístico PT - Helados BON
 * ============================================================
 *
 * Requiere:
 * - api.js
 * - Sistema.js
 * - dashboard.js (CargadorSistema)
 * - VerificacionRecepciones.gs
 */

window.VerificacionRecepciones = {

  estado: {
    recepciones: [],
    offset: 0,
    limite: 12,
    vistaListado: "filas",
    hayMas: false,
    totalPendientes: 0,
    indicadores: {},
    graficas: {},
    recepcionActual: null,
    personalProduccion: [],
    supervisoresPT: [],
    lineasProduccion: [],
    horaInicio: "",
    fechaInicioMs: 0
  },


  /* ==========================================================
   * ACCESO
   * ========================================================== */

  tienePermiso(permiso) {

    if (
      !window.Sistema ||
      typeof Sistema.tienePermiso !== "function"
    ) {
      return false;
    }

    return Sistema.tienePermiso(
      permiso
    );

  },


  puedeAbrir() {

    if (
      !window.Sistema ||
      typeof Sistema.tieneAccesoModulo !== "function"
    ) {
      return false;
    }

    return (
      Sistema.tieneAccesoModulo(
        "VERIFICACION_RECEPCIONES"
      ) ||
      this.tienePermiso(
        "VERIFICACION_RECEPCIONES_VER"
      )
    );

  },


  inicializarAccesoDirecto() {

    const acceso =
      document.getElementById(
        "menuVerificacionRecepciones"
      );

    if (!acceso) {
      return;
    }

    const permitido =
      this.puedeAbrir();

    acceso.hidden = !permitido;

    if (!permitido) {
      acceso.onclick = null;
      return;
    }

    acceso.onclick =
      async () => {

        document
          .querySelectorAll(
            ".sidebar li.active"
          )
          .forEach(item => {
            item.classList.remove("active");
          });

        acceso.classList.add("active");

        const botonMenuMovil =
          document.getElementById(
            "btnMenuMovil"
          );

        if (
          botonMenuMovil &&
          botonMenuMovil.getAttribute(
            "aria-expanded"
          ) === "true"
        ) {
          botonMenuMovil.click();
        }

        await this.abrir();

      };

  },


  /* ==========================================================
   * API
   * ========================================================== */

  async post(
    datos,
    titulo,
    mensaje
  ) {

    if (
      !window.API ||
      typeof API.post !== "function"
    ) {
      throw new Error(
        "API no está disponible."
      );
    }

    if (
      !window.CargadorSistema ||
      typeof CargadorSistema.mostrar !== "function" ||
      typeof CargadorSistema.ocultar !== "function"
    ) {
      throw new Error(
        "CargadorSistema no está disponible."
      );
    }

    CargadorSistema.mostrar(
      titulo || "Consultando información",
      mensaje || "Espere un momento."
    );

    try {

      const respuesta =
        await API.post(datos);

      if (
        !respuesta ||
        !respuesta.ok
      ) {

        throw new Error(
          respuesta &&
          respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible completar la operación."
        );

      }

      return respuesta;

    } finally {

      CargadorSistema.ocultar();

    }

  },


  /* ==========================================================
   * APERTURA DEL CENTRO
   * ========================================================== */

  async abrir() {

    if (!this.puedeAbrir()) {

      if (
        window.Sistema &&
        typeof Sistema.advertencia === "function"
      ) {
        Sistema.advertencia(
          "No tiene permiso para acceder a la verificación de recepciones.",
          4200
        );
      }

      return;
    }

    const contenedor =
      document.getElementById(
        "contenidoPrincipal"
      );

    if (!contenedor) {

      console.error(
        "No existe #contenidoPrincipal."
      );

      return;
    }

    this.estado.recepciones = [];
    this.estado.offset = 0;
    this.estado.hayMas = false;
    this.estado.totalPendientes = 0;
    this.estado.indicadores = {};
    this.estado.graficas = {};
    this.estado.vistaListado = "filas";
    this.estado.recepcionActual = null;

    contenedor.innerHTML =
      this.construirVistaCentro();

    this.conectarEventosCentro();

    this.configurarScrollInterno();

    await this.cargarInicial();

  },


  construirVistaCentro() {

    return `
      <section class="vr-centro">

        <header class="vr-encabezado">

          <div class="vr-encabezado-texto">
            <span class="vr-eyebrow">
              Control de inventario
            </span>

            <h2>
              Verificación de Recepciones
            </h2>

            <p>
              Compare lo recibido por PT, lo declarado por Producción,
              lo registrado en SAP y el conteo físico.
            </p>
          </div>

          <div class="vr-encabezado-acciones">

            <button
              type="button"
              id="btnVrVolverRecepciones"
              class="vr-btn secundario vr-btn-volver"
            >
              <i class="fa-solid fa-arrow-left"></i>
              Volver
            </button>

            <button
              type="button"
              id="btnVrEnviarReporte"
              class="vr-btn secundario vr-btn-reporte"
              title="Enviar ahora el reporte de correcciones pendientes"
            >
              <i class="fa-solid fa-paper-plane"></i>
              <span>Enviar reporte</span>
            </button>

            <div
              class="vr-selector-vista"
              role="group"
              aria-label="Forma de mostrar las recepciones"
            >
              <button
                type="button"
                class="vr-btn-vista"
                data-vr-vista="tarjetas"
                aria-label="Ver como tarjetas"
                aria-pressed="false"
                title="Vista de tarjetas"
              >
                <i class="fa-solid fa-grip"></i>
              </button>

              <button
                type="button"
                class="vr-btn-vista activo"
                data-vr-vista="filas"
                aria-label="Ver como filas"
                aria-pressed="true"
                title="Vista de filas"
              >
                <i class="fa-solid fa-list"></i>
              </button>
            </div>

            <div class="vr-encabezado-resumen">
              <span>Pendientes</span>
              <strong id="vrTotalPendientes">0</strong>
            </div>

          </div>

        </header>

        <div class="vr-ayuda">
          <i class="fa-solid fa-circle-info"></i>
          <span>
            Las desviaciones valorizables se determinan comparando
            el conteo físico del analista contra SAP.
          </span>
        </div>

        <section
          id="vrResumenAnalitico"
          class="vr-resumen-analitico"
        ></section>

        <section class="vr-registros-panel">

          <div
            id="vrListaRecepciones"
            class="vr-lista vista-filas"
          >
            <div class="vr-vacio">
              <i class="fa-solid fa-boxes-stacked"></i>
              <strong>Cargando recepciones pendientes...</strong>
            </div>
          </div>

        </section>

      </section>
    `;

  },


  conectarEventosCentro() {

    const btnVolver =
      document.getElementById(
        "btnVrVolverRecepciones"
      );

    if (btnVolver) {

      btnVolver.onclick =
        () => this.volverARecepciones();

    }

    const btnEnviarReporte =
      document.getElementById(
        "btnVrEnviarReporte"
      );

    if (btnEnviarReporte) {

      btnEnviarReporte.onclick =
        () => this.confirmarEnvioReporteManual();

    }

    document
      .querySelectorAll(
        "[data-vr-vista]"
      )
      .forEach(
        boton => {

          boton.onclick =
            () => this.cambiarVistaListado(
              boton.getAttribute(
                "data-vr-vista"
              )
            );

        }
      );

  },


  confirmarEnvioReporteManual() {

    if (
      !window.Sistema ||
      typeof Sistema.abrirModal !== "function"
    ) {
      this.mostrarAdvertencia(
        "No fue posible abrir la confirmación de envío."
      );
      return;
    }

    const contenido = `
      <section class="vr-confirmacion-reporte vr-selector-reporte">
        <div class="vr-confirmacion-reporte-icono">
          <i class="fa-solid fa-chart-pie"></i>
        </div>

        <h3>Seleccione el reporte que desea enviar</h3>

        <div class="vr-reporte-campos">
          <label>
            <span>Tipo de reporte</span>
            <select id="vrTipoReporteManual">
              <option value="PENDIENTES">
                Pendientes de corrección
              </option>
              <option value="GENERAL">
                Reporte general de desviaciones
              </option>
            </select>
          </label>

          <label id="vrGrupoPeriodoReporte" class="deshabilitado">
            <span>Período del reporte general</span>
            <select id="vrPeriodoReporteManual" disabled>
              <option value="SEMANAL">Semana actual</option>
              <option value="QUINCENAL">Quincena actual</option>
              <option value="MENSUAL" selected>Mes actual</option>
              <option value="TRIMESTRAL">Trimestre actual</option>
              <option value="SEMESTRAL">Semestre actual</option>
              <option value="ANUAL">Año actual</option>
            </select>
          </label>
        </div>

        <p id="vrDescripcionReporteManual">
          Se enviará la fotografía actual de correcciones pendientes.
        </p>

        <div class="vr-confirmacion-reporte-acciones">
          <button
            type="button"
            id="btnVrCancelarReporte"
            class="vr-btn secundario"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="btnVrConfirmarReporte"
            class="vr-btn principal"
          >
            <i class="fa-solid fa-paper-plane"></i>
            Enviar reporte
          </button>
        </div>
      </section>
    `;

    const abierto =
      Sistema.abrirModal(
        "Envío manual del reporte",
        contenido,
        {
          compacto:true,
          enfocar:"#btnVrConfirmarReporte"
        }
      );

    if (!abierto) {
      return;
    }

    const cancelar =
      document.getElementById(
        "btnVrCancelarReporte"
      );

    const confirmar =
      document.getElementById(
        "btnVrConfirmarReporte"
      );

    const tipoReporte =
      document.getElementById(
        "vrTipoReporteManual"
      );

    const periodoReporte =
      document.getElementById(
        "vrPeriodoReporteManual"
      );

    const grupoPeriodo =
      document.getElementById(
        "vrGrupoPeriodoReporte"
      );

    const descripcion =
      document.getElementById(
        "vrDescripcionReporteManual"
      );

    const actualizarTipo = () => {
      const esGeneral =
        tipoReporte &&
        tipoReporte.value === "GENERAL";

      if (periodoReporte) {
        periodoReporte.disabled = !esGeneral;
      }

      if (grupoPeriodo) {
        grupoPeriodo.classList.toggle(
          "deshabilitado",
          !esGeneral
        );
      }

      if (descripcion) {
        descripcion.textContent = esGeneral
          ? "Se enviará el histórico completo de desviaciones del período seleccionado, incluyendo las ya corregidas."
          : "Se enviará la fotografía actual de correcciones pendientes.";
      }
    };

    if (tipoReporte) {
      tipoReporte.onchange = actualizarTipo;
    }

    if (cancelar) {
      cancelar.onclick =
        () => Sistema.cerrarModal();
    }

    if (confirmar) {
      confirmar.onclick =
        async () => {
          const tipo =
            tipoReporte
              ? tipoReporte.value
              : "PENDIENTES";

          const periodo =
            periodoReporte
              ? periodoReporte.value
              : "MENSUAL";

          Sistema.cerrarModal();
          await this.enviarReporteManual(
            tipo,
            periodo
          );
        };
    }

    actualizarTipo();

  },


  async enviarReporteManual(
    tipo = "PENDIENTES",
    periodo = "MENSUAL"
  ) {

    try {

      const respuesta =
        await this.post(
          {
            action:
              tipo === "GENERAL"
                ? "enviarReporteGeneralDesviacionesRecepcionManual"
                : "enviarReporteSemanalVerificacionesRecepcionManual",
            periodo:
              periodo
          },
          "Enviando reporte",
          tipo === "GENERAL"
            ? "Analizando desviaciones del período y creando gráficos."
            : "Preparando pendientes, gráficos y correos."
        );

      const destinatarios =
        Array.isArray(respuesta.destinatarios)
          ? respuesta.destinatarios.length
          : 0;

      const pendientes = Number(
        tipo === "GENERAL"
          ? respuesta.totalPendientes || 0
          : respuesta.pendientes || 0
      );

      const valor = Number(
        tipo === "GENERAL"
          ? respuesta.valorOriginal || 0
          : respuesta.valorTotal || 0
      );

      const valorTexto =
        new Intl.NumberFormat(
          "es-DO",
          {
            style:"currency",
            currency:"DOP",
            minimumFractionDigits:2,
            maximumFractionDigits:2
          }
        ).format(valor);

      const mensaje = tipo === "GENERAL"
        ? "Reporte general enviado a " + destinatarios +
          " destinatario" + (destinatarios === 1 ? "" : "s") +
          ". Desviaciones: " + Number(respuesta.totalDesviaciones || 0) +
          ". Valor original: " + valorTexto + "."
        : "Reporte de pendientes enviado a " + destinatarios +
          " destinatario" + (destinatarios === 1 ? "" : "s") +
          ". Pendientes: " + pendientes +
          ". Valor total: " + valorTexto + ".";

      if (
        window.Sistema &&
        typeof Sistema.exito === "function"
      ) {
        Sistema.exito(mensaje, 6500);
      }

    } catch (error) {

      console.error(
        "Error enviando reporte manual:",
        error
      );

      if (
        window.Sistema &&
        typeof Sistema.error === "function"
      ) {
        Sistema.error(
          error.message ||
          "No fue posible enviar el reporte.",
          6500
        );
      }

    }

  },


  configurarScrollInterno() {

    const centro =
      document.querySelector(
        ".vr-centro"
      );

    if (!centro) {
      return;
    }

    const actualizarAltura =
      () => {

        if (!centro.isConnected) {
          return;
        }

        const posicion =
          centro.getBoundingClientRect();

        const margenInferior =
          18;

        const alturaDisponible =
          Math.max(
            320,
            window.innerHeight -
            posicion.top -
            margenInferior
          );

        centro.style.setProperty(
          "--alto-centro-verificacion",
          alturaDisponible + "px"
        );

      };

    actualizarAltura();

    window.requestAnimationFrame(
      actualizarAltura
    );

    if (
      this._eventoResizeVerificacion
    ) {
      window.removeEventListener(
        "resize",
        this._eventoResizeVerificacion
      );
    }

    this._eventoResizeVerificacion =
      () => {
        window.requestAnimationFrame(
          actualizarAltura
        );
      };

    window.addEventListener(
      "resize",
      this._eventoResizeVerificacion
    );

  },


  volverARecepciones() {

    document
      .querySelectorAll(
        ".sidebar li.active"
      )
      .forEach(item => {
        item.classList.remove("active");
      });

    const accesoRecepciones =
      document.getElementById(
        "menuRecepciones"
      );

    if (accesoRecepciones) {
      accesoRecepciones.classList.add("active");
    }

    if (
      window.RecepcionMateriales &&
      typeof window.RecepcionMateriales.cargar ===
        "function"
    ) {

      window.RecepcionMateriales.cargar();
      return;

    }

    this.mostrarAdvertencia(
      "No fue posible volver al centro de recepciones."
    );

  },


  cambiarVistaListado(vista) {

    const nuevaVista =
      vista === "filas"
        ? "filas"
        : "tarjetas";

    this.estado.vistaListado =
      nuevaVista;

    const lista =
      document.getElementById(
        "vrListaRecepciones"
      );

    if (lista) {
      lista.classList.toggle(
        "vista-tarjetas",
        nuevaVista === "tarjetas"
      );

      lista.classList.toggle(
        "vista-filas",
        nuevaVista === "filas"
      );
    }

    document
      .querySelectorAll(
        "[data-vr-vista]"
      )
      .forEach(
        boton => {

          const activo =
            boton.getAttribute(
              "data-vr-vista"
            ) === nuevaVista;

          boton.classList.toggle(
            "activo",
            activo
          );

          boton.setAttribute(
            "aria-pressed",
            String(activo)
          );

        }
      );

  },


  async cargarInicial() {

    try {

      const respuesta =
        await this.post(
          {
            action:
              "listarRecepcionesPendientesVerificacion",
            offset:
              0,
            limite:
              this.estado.limite
          },
          "Cargando verificaciones",
          "Consultando recepciones finalizadas pendientes."
        );

      this.estado.recepciones =
        Array.isArray(
          respuesta.recepciones
        )
          ? respuesta.recepciones
          : [];

      this.estado.offset =
        Number(
          respuesta.siguienteOffset ||
          this.estado.recepciones.length
        );

      this.estado.hayMas =
        Boolean(
          respuesta.hayMas
        );

      this.estado.totalPendientes =
        Number(
          respuesta.totalPendientes ||
          0
        );

      this.estado.indicadores =
        respuesta.indicadores || {};

      this.estado.graficas =
        respuesta.graficas || {};

      this.renderizarLista();
      this.renderizarResumenAnalitico();

    } catch (error) {

      console.error(
        "Error cargando verificaciones pendientes:",
        error
      );

      this.mostrarError(
        error.message ||
        "No fue posible cargar las recepciones."
      );

    }

  },


  async cargarMas() {

    try {

      const respuesta =
        await this.post(
          {
            action:
              "listarRecepcionesPendientesVerificacion",
            offset:
              this.estado.offset,
            limite:
              this.estado.limite
          },
          "Cargando más recepciones",
          "Consultando los siguientes registros pendientes."
        );

      const nuevas =
        Array.isArray(
          respuesta.recepciones
        )
          ? respuesta.recepciones
          : [];

      this.estado.recepciones =
        this.estado.recepciones.concat(
          nuevas
        );

      this.estado.offset =
        Number(
          respuesta.siguienteOffset ||
          this.estado.recepciones.length
        );

      this.estado.hayMas =
        Boolean(
          respuesta.hayMas
        );

      this.estado.totalPendientes =
        Number(
          respuesta.totalPendientes ||
          this.estado.totalPendientes
        );

      this.estado.indicadores =
        respuesta.indicadores ||
        this.estado.indicadores;

      this.estado.graficas =
        respuesta.graficas ||
        this.estado.graficas;

      this.renderizarLista();
      this.renderizarResumenAnalitico();

    } catch (error) {

      console.error(
        "Error cargando más recepciones:",
        error
      );

      this.mostrarError(
        error.message ||
        "No fue posible cargar más recepciones."
      );

    }

  },


  renderizarLista() {

    const contenedor =
      document.getElementById(
        "vrListaRecepciones"
      );

    const total =
      document.getElementById(
        "vrTotalPendientes"
      );

    if (total) {
      total.textContent =
        this.formatearNumero(
          this.estado.totalPendientes
        );
    }

    if (!contenedor) {
      return;
    }

    this.cambiarVistaListado(
      this.estado.vistaListado
    );

    if (
      !this.estado.recepciones.length
    ) {

      contenedor.innerHTML = `
        <div class="vr-vacio exito">
          <i class="fa-solid fa-circle-check"></i>
          <strong>No hay recepciones pendientes de verificación.</strong>
          <span>
            Las recepciones finalizadas aparecerán aquí automáticamente.
          </span>
        </div>
      `;

      return;
    }

    contenedor.innerHTML =
      this.estado.recepciones
        .map(
          item =>
            this.construirTarjetaRecepcion(
              item
            )
        )
        .join("") +
      (
        this.estado.hayMas
          ? `
              <div class="vr-paginacion">
                <button
                  type="button"
                  id="btnVrCargarMas"
                  class="vr-btn secundario"
                >
                  <i class="fa-solid fa-plus"></i>
                  Cargar 12 registros más
                </button>
              </div>
            `
          : ""
      );

    const btnMas =
      document.getElementById(
        "btnVrCargarMas"
      );

    if (btnMas) {
      btnMas.onclick =
        () => this.cargarMas();
    }

    contenedor
      .querySelectorAll(
        "[data-vr-verificar]"
      )
      .forEach(
        boton => {

          boton.onclick =
            () => {

              const id =
                boton.getAttribute(
                  "data-vr-verificar"
                );

              this.iniciarVerificacion(
                id
              );

            };

        }
      );

    contenedor
      .querySelectorAll(
        "[data-vr-corregir]"
      )
      .forEach(
        boton => {

          boton.onclick =
            () => {

              const id =
                boton.getAttribute(
                  "data-vr-corregir"
                );

              this.iniciarVerificacion(
                id,
                true
              );

            };

        }
      );

  },


  renderizarResumenAnalitico() {

    const contenedor =
      document.getElementById(
        "vrResumenAnalitico"
      );

    if (!contenedor) {
      return;
    }

    const i =
      this.estado.indicadores || {};

    const estados =
      Array.isArray(
        (this.estado.graficas || {}).estados
      )
        ? this.estado.graficas.estados
        : [];

    const tipos =
      Array.isArray(
        (this.estado.graficas || {}).tipos
      )
        ? this.estado.graficas.tipos
        : [];

    const maxEstado =
      Math.max(
        1,
        ...estados.map(x => Number(x.valor || 0))
      );

    const maxTipo =
      Math.max(
        1,
        ...tipos.map(x => Number(x.valor || 0))
      );

    contenedor.innerHTML = `
      <div class="vr-indicadores">
        ${this.construirIndicador("Por verificar", i.pendientesVerificacion, "amarillo")}
        ${this.construirIndicador("Corrección pendiente", i.pendientesCorreccion, "rojo")}
        ${this.construirIndicador("Completadas", i.completadas, "verde")}
        ${this.construirIndicador("Valor pendiente", this.formatearMoneda(i.valorPendiente), "azul")}
      </div>

      <div class="vr-graficas">
        ${this.construirGraficaBarras("Estado de verificaciones", estados, maxEstado)}
        ${this.construirGraficaBarras("Tipo de desviación", tipos, maxTipo)}
      </div>
    `;

  },


  construirIndicador(etiqueta, valor, clase) {

    return `
      <article class="vr-indicador ${clase}">
        <span>${this.escapar(etiqueta)}</span>
        <strong>${this.escapar(valor === undefined ? 0 : valor)}</strong>
      </article>
    `;

  },


  construirGraficaBarras(titulo, datos, maximo) {

    return `
      <article class="vr-grafica">
        <h3>${this.escapar(titulo)}</h3>
        <div class="vr-grafica-barras">
          ${
            datos.length
              ? datos.map(item => {
                  const valor = Number(item.valor || 0);
                  const ancho = Math.max(3, (valor / maximo) * 100);
                  return `
                    <div class="vr-grafica-fila">
                      <span>${this.escapar(item.etiqueta || "-")}</span>
                      <div><i style="width:${ancho}%"></i></div>
                      <strong>${this.formatearNumero(valor)}</strong>
                    </div>
                  `;
                }).join("")
              : `<span class="vr-grafica-vacia">Sin datos registrados</span>`
          }
        </div>
      </article>
    `;

  },


  construirTarjetaRecepcion(item) {

    const material =
      item.material || "-";

    const detalle =
      item.detalle || "Sin descripción";

    const estadoVista =
      item.estadoVista ||
      "PENDIENTE_VERIFICACION";

    const claseEstado =
      estadoVista === "PENDIENTE_CORRECCION"
        ? "correccion"
        : estadoVista === "COMPLETADA"
          ? "completada"
          : "pendiente";

    const textoEstado =
      estadoVista === "PENDIENTE_CORRECCION"
        ? "Corrección pendiente"
        : estadoVista === "COMPLETADA"
          ? "Completada"
          : "Por verificar";

    return `
      <article class="vr-tarjeta vr-tarjeta-${claseEstado}">

        <div class="vr-tarjeta-cabecera">

          <div class="vr-tarjeta-identidad">

            <div class="vr-material-linea">
              <span class="vr-codigo">
                ${this.escapar(material)}
              </span>

              ${
                estadoVista === "PENDIENTE_CORRECCION"
                  ? `
                      <span class="vr-desviacion-tarjeta">
                        ${this.formatearMoneda(item.valorPendiente)}
                      </span>
                    `
                  : ""
              }
            </div>

            <h3>
              ${this.escapar(detalle)}
            </h3>

            <small class="vr-id-recepcion">
              ${this.escapar(item.idRecepcion || "-")}
            </small>

            <div class="vr-fila-resumen">
              <span>${this.formatearNumero(item.totalTarimas)} tarimas</span>
              <span>${this.formatearNumero(item.totalUnidades)} unidades</span>
            </div>
          </div>

          <span class="vr-estado ${claseEstado}">
            ${textoEstado}
          </span>

        </div>

        <div class="vr-tarjeta-datos">

          <div>
            <span>Fecha</span>
            <strong>
              ${this.escapar(
                this.formatearFecha(
                  item.fecha
                )
              )}
            </strong>
          </div>

          <div>
            <span>Tarimas</span>
            <strong>
              ${this.formatearNumero(
                item.totalTarimas
              )}
            </strong>
          </div>

          <div>
            <span>Registro PT</span>
            <strong>
              ${this.formatearNumero(
                item.totalUnidades
              )}
            </strong>
          </div>

        </div>

        ${
          estadoVista === "PENDIENTE_VERIFICACION" &&
          this.tienePermiso(
            "VERIFICACION_RECEPCIONES_INICIAR"
          )
            ? `
              <button
                type="button"
                class="vr-btn principal"
                data-vr-verificar="${this.escapar(
                  item.idRecepcion || ""
                )}"
              >
                <i class="fa-solid fa-clipboard-check"></i>
                Verificar
              </button>
            `
            : estadoVista === "PENDIENTE_CORRECCION" &&
              this.tienePermiso(
                "VERIFICACION_RECEPCIONES_CERRAR"
              )
              ? `
                  <button
                    type="button"
                    class="vr-btn vr-btn-corregir"
                    data-vr-corregir="${this.escapar(
                      item.idRecepcion || ""
                    )}"
                  >
                    <i class="fa-solid fa-pen-to-square"></i>
                    Corregir
                  </button>
                `
            : `
              <div class="vr-resultado-listado ${claseEstado}">
                ${
                  estadoVista === "PENDIENTE_CORRECCION"
                    ? `
                        <span>Pendiente</span>
                        <strong>
                          ${this.formatearConSigno(item.desviacionPendiente)}
                          · ${this.formatearMoneda(item.valorPendiente)}
                        </strong>
                      `
                    : `
                        <i class="fa-solid fa-circle-check"></i>
                        <strong>Verificación completada</strong>
                      `
                }
              </div>
            `
        }

      </article>
    `;

  },


  /* ==========================================================
   * ASISTENTE
   * ========================================================== */

  asegurarModal() {

    let modal =
      document.getElementById(
        "modalVerificacionRecepciones"
      );

    if (modal) {
      return modal;
    }

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "modalVerificacionRecepciones";

    modal.className =
      "vr-modal oculto";

    modal.innerHTML = `
      <div class="vr-modal-dialog">

        <header class="vr-modal-header">
          <div>
            <span>
              Asistente de verificación
            </span>

            <h2 id="vrTituloModal">
              Verificación de Recepción
            </h2>
          </div>

          <button
            type="button"
            id="btnVrCerrarModal"
            class="vr-btn-icono"
            aria-label="Cerrar"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div
          id="vrContenidoModal"
          class="vr-modal-body"
        ></div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    document
      .getElementById(
        "btnVrCerrarModal"
      )
      .onclick =
        () => this.cerrarModal();

    modal.addEventListener(
      "click",
      evento => {

        if (
          evento.target === modal
        ) {
          this.cerrarModal();
        }

      }
    );

    return modal;

  },


  abrirModal() {

    const modal =
      this.asegurarModal();

    modal.classList.remove(
      "oculto"
    );

    document.body.classList.add(
      "vr-modal-abierto"
    );

  },


  cerrarModal() {

    const modal =
      document.getElementById(
        "modalVerificacionRecepciones"
      );

    if (modal) {
      modal.classList.add(
        "oculto"
      );
    }

    document.body.classList.remove(
      "vr-modal-abierto"
    );

  },


  async iniciarVerificacion(
    idRecepcion,
    modoCorreccion = false
  ) {

    if (
      !(
        modoCorreccion
          ? this.tienePermiso(
              "VERIFICACION_RECEPCIONES_CERRAR"
            )
          : this.tienePermiso(
              "VERIFICACION_RECEPCIONES_INICIAR"
            )
      )
    ) {

      this.mostrarAdvertencia(
        modoCorreccion
          ? "No tiene permiso para corregir verificaciones."
          : "No tiene permiso para iniciar verificaciones."
      );

      return;
    }

    try {

      const resultados =
        await Promise.all([
          this.post(
            {
              action:
                "obtenerDatosRecepcionParaVerificacion",
              idRecepcion:
                idRecepcion,
              incluirVerificacion:
                modoCorreccion
            },
            "Preparando verificación",
            "Consultando la recepción seleccionada."
          ),
          this.cargarCatalogosAsistente()
        ]);

      const respuestaRecepcion =
        resultados[0];

      this.estado.recepcionActual =
        respuestaRecepcion.recepcion;

      this.estado.recepcionActual.esCorreccion =
        Boolean(
          modoCorreccion ||
          this.estado.recepcionActual.esCorreccion
        );

      this.estado.fechaInicioMs =
        Date.now();

      this.estado.horaInicio =
        this.obtenerHoraActual();

      this.abrirModal();

      this.renderizarFormulario();

    } catch (error) {

      console.error(
        "Error iniciando verificación:",
        error
      );

      this.mostrarError(
        error.message ||
        "No fue posible iniciar la verificación."
      );

    }

  },


  async cargarCatalogosAsistente() {

    if (
      this.estado.personalProduccion.length &&
      this.estado.supervisoresPT.length &&
      this.estado.lineasProduccion.length
    ) {
      return;
    }

    const respuestaPersonal =
      await this.post(
        {
          action:
            "listarPersonalProduccion"
        },
        "Cargando personal",
        "Consultando colaboradores de Producción."
      );

    const respuestaSupervisores =
      await this.post(
        {
          action:
            "listarSupervisoresPT"
        },
        "Cargando supervisores",
        "Consultando supervisores PT activos."
      );

    const respuestaLineas =
      await this.post(
        {
          action:
            "listarLineasProduccion"
        },
        "Cargando líneas",
        "Consultando líneas de Producción."
      );

    this.estado.personalProduccion =
      Array.isArray(
        respuestaPersonal.personal
      )
        ? respuestaPersonal.personal
        : [];

    this.estado.supervisoresPT =
      Array.isArray(
        respuestaSupervisores.supervisores
      )
        ? respuestaSupervisores.supervisores
        : [];

    this.estado.lineasProduccion =
      Array.isArray(
        respuestaLineas.lineas
      )
        ? respuestaLineas.lineas
        : [];

  },


  renderizarFormulario() {

    const panel =
      document.getElementById(
        "vrContenidoModal"
      );

    const r =
      this.estado.recepcionActual;

    if (!panel || !r) {
      return;
    }

    const tituloModal =
      document.getElementById(
        "vrTituloModal"
      );

    if (tituloModal) {
      tituloModal.textContent =
        r.esCorreccion
          ? "Corrección de Recepción"
          : "Verificación de Recepción";
    }

    const colaboradores =
      Array.isArray(
        r.colaboradoresPT
      )
        ? r.colaboradoresPT
        : [];

    panel.innerHTML = `
      <div class="vr-asistente">

        <section class="vr-bloque vr-resumen-recepcion">

          <div class="vr-resumen-material">
            <span class="vr-codigo">
              ${this.escapar(r.material || "-")}
            </span>

            <div>
              <h3>
                ${this.escapar(r.descripcion || "-")}
              </h3>

              <p>
                Recepción
                ${this.escapar(r.idRecepcion || "-")}
              </p>
            </div>
          </div>

          <div class="vr-grid-resumen">

            <div>
              <span>UM</span>
              <strong>
                ${this.escapar(r.um || "-")}
              </strong>
            </div>

            <div>
              <span>UMB</span>
              <strong>
                ${this.formatearNumero(r.umb)}
              </strong>
            </div>

            <div>
              <span>Recibido PT</span>
              <strong>
                ${this.formatearNumero(r.cantidadPT)}
              </strong>
            </div>

            <div>
              <span>Valor bulto</span>
              <strong>
                ${this.formatearMoneda(r.valorBulto)}
              </strong>
            </div>

          </div>

          <div class="vr-colaboradores">

            <span>Colaboradores PT participantes</span>

            <div class="vr-chips">
              ${
                colaboradores.length
                  ? colaboradores
                      .map(
                        c => `
                          <span class="vr-chip">
                            <i class="fa-solid fa-user"></i>
                            ${this.escapar(c.nombre || c.id || "-")}
                          </span>
                        `
                      )
                      .join("")
                  : `
                      <span class="vr-chip tenue">
                        Sin colaboradores identificados
                      </span>
                    `
              }
            </div>

          </div>

        </section>

        <section class="vr-bloque">

          <div class="vr-bloque-titulo">
            <i class="fa-solid fa-user-gear"></i>
            <div>
              <h3>Responsables del proceso</h3>
              <p>
                Identifique Producción, línea y supervisor PT de turno.
              </p>
            </div>
          </div>

          <div class="vr-grid-form">

            <label>
              <span>Responsable Producción</span>
              <select id="vrResponsableProduccion">
                <option value="">
                  Seleccione...
                </option>
                ${this.construirOpcionesPersonal()}
              </select>
            </label>

            <label>
              <span>Línea de Producción</span>
              <select id="vrLineaProduccion">
                <option value="">
                  Seleccione...
                </option>
                ${this.construirOpcionesLineas()}
              </select>
            </label>

            <label>
              <span>Supervisor PT</span>
              <select id="vrSupervisorPT">
                <option value="">
                  Seleccione...
                </option>
                ${this.construirOpcionesSupervisores()}
              </select>
            </label>

          </div>

        </section>

        <section class="vr-bloque">

          <div class="vr-bloque-titulo">
            <i class="fa-solid fa-scale-balanced"></i>
            <div>
              <h3>Comparación de cantidades</h3>
              <p>
                Todas las cantidades están expresadas en cajas, cubos
                o el empaque comercial correspondiente.
              </p>
            </div>
          </div>

          <div class="vr-comparacion">

            <div class="vr-campo-cantidad automatico">
              <span>PT recibió</span>
              <strong id="vrCantidadPT">
                ${this.formatearNumero(r.cantidadPT)}
              </strong>
              <small>Automático</small>
            </div>

            <label class="vr-campo-cantidad">
              <span>Libro Producción</span>
              <input
                type="number"
                id="vrCantidadLibro"
                min="0"
                step="1"
                inputmode="numeric"
                placeholder="0"
                value="${this.escapar(r.cantidadLibroProduccion || 0)}"
                ${r.esCorreccion ? "readonly" : ""}
              >
            </label>

            <label class="vr-campo-cantidad">
              <span>SAP</span>
              <input
                type="number"
                id="vrCantidadSAP"
                min="0"
                step="1"
                inputmode="numeric"
                placeholder="0"
                value="${this.escapar(r.cantidadSAP || 0)}"
                ${r.esCorreccion ? "readonly" : ""}
              >
            </label>

            <label class="vr-campo-cantidad destacado">
              <span>Conteo Analista</span>
              <input
                type="number"
                id="vrCantidadFisica"
                min="0"
                step="1"
                inputmode="numeric"
                placeholder="0"
                value="${this.escapar(r.cantidadVerificada || 0)}"
                ${r.esCorreccion ? "readonly" : ""}
              >
            </label>

          </div>

          <div
            id="vrPanelDiferencias"
            class="vr-panel-diferencias"
          >
            ${this.construirPanelSinDatos()}
          </div>

        </section>

        <section class="vr-bloque">

          <div class="vr-bloque-titulo">
            <i class="fa-solid fa-rotate"></i>
            <div>
              <h3>Corrección y seguimiento</h3>
              <p>
                La corrección reduce la diferencia pendiente, pero
                conserva el histórico original.
              </p>
            </div>
          </div>

          <div class="vr-grid-form">

            <label>
              <span>Cantidad corregida</span>
              <input
                type="number"
                id="vrCantidadCorregida"
                min="0"
                step="1"
                value="${this.escapar(r.cantidadCorregida || 0)}"
                inputmode="numeric"
              >
            </label>

            <label class="vr-campo-completo">
              <span>Comentario del analista</span>
              <textarea
                id="vrComentario"
                rows="4"
                placeholder="Agregue observaciones, causas o contexto de la verificación."
              >${this.escapar(r.comentarioAnalista || "")}</textarea>
            </label>

          </div>

        </section>

        <div class="vr-acciones">

          <button
            type="button"
            id="btnVrCancelar"
            class="vr-btn secundario"
          >
            Cancelar
          </button>

          ${
            this.tienePermiso(
              "VERIFICACION_RECEPCIONES_CERRAR"
            )
              ? `
                <button
                  type="button"
                  id="btnVrGuardar"
                  class="vr-btn principal"
                >
                  <i class="fa-solid fa-floppy-disk"></i>
                  ${
                    r.esCorreccion
                      ? "Guardar corrección"
                      : "Guardar verificación"
                  }
                </button>
              `
              : ""
          }

        </div>

      </div>
    `;

    this.conectarEventosFormulario();

    this.precargarResponsablesFormulario();

    this.actualizarComparacion();

  },


  precargarResponsablesFormulario() {

    const r =
      this.estado.recepcionActual || {};

    const asignaciones = [
      [
        "vrResponsableProduccion",
        r.responsableProduccionId,
        r.responsableProduccionNombre
      ],
      [
        "vrLineaProduccion",
        r.lineaProduccion,
        r.lineaProduccion
      ],
      [
        "vrSupervisorPT",
        r.supervisorPTId,
        r.supervisorPTNombre
      ]
    ];

    asignaciones.forEach(
      item => {

        const campo =
          document.getElementById(
            item[0]
          );

        const valor =
          String(item[1] || "");

        if (
          campo &&
          valor
        ) {

          const existe =
            Array.from(campo.options).some(
              opcion => opcion.value === valor
            );

          if (!existe) {
            const opcion =
              document.createElement("option");

            opcion.value = valor;
            opcion.textContent =
              String(item[2] || valor);

            campo.appendChild(opcion);
          }

          campo.value = valor;
        }

      }
    );

  },


  construirOpcionesPersonal() {

    return this.estado.personalProduccion
      .map(
        p => `
          <option
            value="${this.escapar(p.idProduccion || "")}"
            data-nombre="${this.escapar(p.nombre || "")}"
            data-linea="${this.escapar(p.lineaProduccion || "")}"
          >
            ${this.escapar(p.nombre || "-")}
            ${p.lineaProduccion ? " · " + this.escapar(p.lineaProduccion) : ""}
          </option>
        `
      )
      .join("");

  },


  construirOpcionesLineas() {

    return this.estado.lineasProduccion
      .map(
        linea => `
          <option value="${this.escapar(linea)}">
            ${this.escapar(linea)}
          </option>
        `
      )
      .join("");

  },


  construirOpcionesSupervisores() {

    return this.estado.supervisoresPT
      .map(
        s => `
          <option
            value="${this.escapar(s.idEmpleado || "")}"
            data-nombre="${this.escapar(s.nombre || "")}"
          >
            ${this.escapar(s.nombre || "-")}
          </option>
        `
      )
      .join("");

  },


  conectarEventosFormulario() {

    [
      "vrCantidadLibro",
      "vrCantidadSAP",
      "vrCantidadFisica",
      "vrCantidadCorregida"
    ].forEach(
      id => {

        const campo =
          document.getElementById(id);

        if (campo) {

          campo.addEventListener(
            "input",
            () => this.actualizarComparacion()
          );

        }

      }
    );

    const responsable =
      document.getElementById(
        "vrResponsableProduccion"
      );

    if (responsable) {

      responsable.addEventListener(
        "change",
        () => {

          const opcion =
            responsable.options[
              responsable.selectedIndex
            ];

          const linea =
            opcion
              ? opcion.getAttribute(
                  "data-linea"
                )
              : "";

          const campoLinea =
            document.getElementById(
              "vrLineaProduccion"
            );

          if (
            campoLinea &&
            linea
          ) {

            const existe =
              Array.from(
                campoLinea.options
              ).some(
                item =>
                  item.value === linea
              );

            if (existe) {
              campoLinea.value =
                linea;
            }

          }

        }
      );

    }

    const cancelar =
      document.getElementById(
        "btnVrCancelar"
      );

    if (cancelar) {

      cancelar.onclick =
        () => this.cerrarModal();

    }

    const guardar =
      document.getElementById(
        "btnVrGuardar"
      );

    if (guardar) {

      guardar.onclick =
        () => this.guardar();

    }

  },


  /* ==========================================================
   * COMPARACIÓN EN VIVO
   * ========================================================== */

  obtenerValoresFormulario() {

    const r =
      this.estado.recepcionActual ||
      {};

    return {
      pt:
        this.numero(
          r.cantidadPT
        ),

      libro:
        this.numeroCampo(
          "vrCantidadLibro"
        ),

      sap:
        this.numeroCampo(
          "vrCantidadSAP"
        ),

      fisico:
        this.numeroCampo(
          "vrCantidadFisica"
        ),

      corregida:
        Math.max(
          0,
          this.numeroCampo(
            "vrCantidadCorregida"
          )
        ),

      valorBulto:
        this.numero(
          r.valorBulto
        )
    };

  },


  actualizarComparacion() {

    const panel =
      document.getElementById(
        "vrPanelDiferencias"
      );

    if (!panel) {
      return;
    }

    const libro =
      document.getElementById(
        "vrCantidadLibro"
      );

    const sap =
      document.getElementById(
        "vrCantidadSAP"
      );

    const fisico =
      document.getElementById(
        "vrCantidadFisica"
      );

    if (
      !libro ||
      !sap ||
      !fisico ||
      libro.value === "" ||
      sap.value === "" ||
      fisico.value === ""
    ) {

      panel.innerHTML =
        this.construirPanelSinDatos();

      return;
    }

    const v =
      this.obtenerValoresFormulario();

    const diferencias = {
      libroPT:
        this.redondear(
          v.pt - v.libro
        ),

      libroSAP:
        this.redondear(
          v.sap - v.libro
        ),

      ptSAP:
        this.redondear(
          v.sap - v.pt
        ),

      ptFisico:
        this.redondear(
          v.fisico - v.pt
        ),

      sapFisico:
        this.redondear(
          v.fisico - v.sap
        )
    };

    const diagnostico =
      this.clasificar(
        v.libro,
        v.pt,
        v.sap,
        v.fisico
      );

    const desviacion =
      diferencias.sapFisico;

    const tipo =
      desviacion > 0
        ? "SOBRANTE"
        : desviacion < 0
          ? "FALTANTE"
          : "SIN DESVIACIÓN";

    const corregida =
      Math.min(
        v.corregida,
        Math.abs(
          desviacion
        )
      );

    const pendiente =
      Math.max(
        0,
        Math.abs(
          desviacion
        ) -
        corregida
      );

    const valorOriginal =
      this.redondear(
        Math.abs(
          desviacion
        ) *
        v.valorBulto
      );

    const valorPendiente =
      this.redondear(
        pendiente *
        v.valorBulto
      );

    panel.innerHTML =
      this.construirResultadoComparacion({
        valores:
          v,
        diferencias:
          diferencias,
        diagnostico:
          diagnostico,
        desviacion:
          desviacion,
        tipo:
          tipo,
        corregida:
          corregida,
        pendiente:
          pendiente,
        valorOriginal:
          valorOriginal,
        valorPendiente:
          valorPendiente
      });

  },


  construirPanelSinDatos() {

    return `
      <div class="vr-sin-comparacion">
        <i class="fa-solid fa-calculator"></i>
        <span>
          Complete Libro Producción, SAP y Conteo Analista
          para ver las diferencias.
        </span>
      </div>
    `;

  },


  construirResultadoComparacion(datos) {

    const d =
      datos.diferencias;

    const clase =
      datos.tipo === "FALTANTE"
        ? "faltante"
        : datos.tipo === "SOBRANTE"
          ? "sobrante"
          : "correcto";

    return `
      <div class="vr-diferencias-grid">

        <div>
          <span>Libro → PT</span>
          <strong>
            ${this.formatearConSigno(d.libroPT)}
          </strong>
        </div>

        <div>
          <span>Libro → SAP</span>
          <strong>
            ${this.formatearConSigno(d.libroSAP)}
          </strong>
        </div>

        <div>
          <span>PT → SAP</span>
          <strong>
            ${this.formatearConSigno(d.ptSAP)}
          </strong>
        </div>

        <div>
          <span>PT → Físico</span>
          <strong>
            ${this.formatearConSigno(d.ptFisico)}
          </strong>
        </div>

      </div>

      <div class="vr-diagnostico ${clase}">

        <div class="vr-diagnostico-icono">
          <i class="${
            datos.tipo === "FALTANTE"
              ? "fa-solid fa-triangle-exclamation"
              : datos.tipo === "SOBRANTE"
                ? "fa-solid fa-box-open"
                : "fa-solid fa-circle-check"
          }"></i>
        </div>

        <div class="vr-diagnostico-contenido">

          <span>Diagnóstico</span>

          <h3>
            ${this.escapar(datos.tipo)}
          </h3>

          <p>
            ${this.escapar(datos.diagnostico.mensaje)}
          </p>

          <div class="vr-diagnostico-numeros">

            <div>
              <span>SAP</span>
              <strong>
                ${this.formatearNumero(datos.valores.sap)}
              </strong>
            </div>

            <div>
              <span>Físico</span>
              <strong>
                ${this.formatearNumero(datos.valores.fisico)}
              </strong>
            </div>

            <div>
              <span>Diferencia</span>
              <strong>
                ${this.formatearConSigno(datos.desviacion)}
              </strong>
            </div>

            <div>
              <span>Valor desviación</span>
              <strong>
                ${this.formatearMoneda(datos.valorOriginal)}
              </strong>
            </div>

          </div>

          ${
            datos.desviacion !== 0
              ? `
                <div class="vr-seguimiento">
                  <span>
                    Corregido:
                    <strong>
                      ${this.formatearNumero(datos.corregida)}
                    </strong>
                  </span>

                  <span>
                    Pendiente:
                    <strong>
                      ${this.formatearNumero(datos.pendiente)}
                    </strong>
                  </span>

                  <span>
                    Valor pendiente:
                    <strong>
                      ${this.formatearMoneda(datos.valorPendiente)}
                    </strong>
                  </span>
                </div>
              `
              : ""
          }

        </div>

      </div>
    `;

  },


  clasificar(
    libro,
    pt,
    sap,
    fisico
  ) {

    if (
      libro === pt &&
      pt === sap &&
      sap === fisico
    ) {

      return {
        tipo:
          "SIN DIFERENCIA",
        mensaje:
          "Los cuatro registros coinciden."
      };

    }

    if (
      pt === sap &&
      sap === fisico &&
      libro !== fisico
    ) {

      return {
        tipo:
          "ERROR REGISTRO PRODUCCIÓN",
        mensaje:
          "Producción presenta una diferencia en su registro, pero SAP, PT y el conteo físico coinciden."
      };

    }

    if (
      libro === sap &&
      sap === fisico &&
      pt !== fisico
    ) {

      return {
        tipo:
          "ERROR REGISTRO PT",
        mensaje:
          "PT presenta una diferencia de registro, pero Producción, SAP y el conteo físico coinciden."
      };

    }

    if (
      sap !== fisico
    ) {

      if (
        fisico > sap
      ) {

        return {
          tipo:
            "DESVIACIÓN INVENTARIO",
          mensaje:
            "Producción colocó de menos en el sistema SAP. Existe material físico sin reflejarse completamente en SAP."
        };

      }

      return {
        tipo:
          "DESVIACIÓN INVENTARIO",
        mensaje:
          "Producción colocó de más en el sistema SAP. SAP refleja material que no está disponible físicamente."
      };

    }

    return {
      tipo:
        "MÚLTIPLE",
      mensaje:
        "SAP coincide con el conteo físico, pero existen diferencias entre los registros de Producción y/o PT."
    };

  },


  /* ==========================================================
   * GUARDAR
   * ========================================================== */

  async guardar() {

    if (
      !this.tienePermiso(
        "VERIFICACION_RECEPCIONES_CERRAR"
      )
    ) {

      this.mostrarAdvertencia(
        "No tiene permiso para guardar verificaciones."
      );

      return;
    }

    const r =
      this.estado.recepcionActual;

    if (!r) {
      return;
    }

    const responsable =
      document.getElementById(
        "vrResponsableProduccion"
      );

    const linea =
      document.getElementById(
        "vrLineaProduccion"
      );

    const supervisor =
      document.getElementById(
        "vrSupervisorPT"
      );

    const libro =
      document.getElementById(
        "vrCantidadLibro"
      );

    const sap =
      document.getElementById(
        "vrCantidadSAP"
      );

    const fisico =
      document.getElementById(
        "vrCantidadFisica"
      );

    if (
      !responsable ||
      !responsable.value
    ) {
      this.mostrarAdvertencia(
        "Seleccione el responsable de Producción."
      );
      return;
    }

    if (
      !linea ||
      !linea.value
    ) {
      this.mostrarAdvertencia(
        "Seleccione la línea de Producción."
      );
      return;
    }

    if (
      !supervisor ||
      !supervisor.value
    ) {
      this.mostrarAdvertencia(
        "Seleccione el supervisor PT."
      );
      return;
    }

    if (
      !libro ||
      libro.value === "" ||
      !sap ||
      sap.value === "" ||
      !fisico ||
      fisico.value === ""
    ) {
      this.mostrarAdvertencia(
        "Complete las cantidades de Libro Producción, SAP y Conteo Analista."
      );
      return;
    }

    const opcionProduccion =
      responsable.options[
        responsable.selectedIndex
      ];

    const opcionSupervisor =
      supervisor.options[
        supervisor.selectedIndex
      ];

    const sesion =
      window.API &&
      typeof API.obtenerSesion === "function"
        ? API.obtenerSesion()
        : (
            window.Sistema &&
            typeof Sistema.obtenerSesion === "function"
              ? Sistema.obtenerSesion()
              : {}
          );

    const duracionMinutos =
      Math.max(
        0,
        Math.round(
          (
            Date.now() -
            this.estado.fechaInicioMs
          ) /
          60000
        )
      );

    try {

      const respuesta =
        await this.post(
          {
            action:
              "guardarVerificacionRecepcion",

            idRecepcion:
              r.idRecepcion,

            cantidadLibroProduccion:
              this.numeroCampo(
                "vrCantidadLibro"
              ),

            cantidadSAP:
              this.numeroCampo(
                "vrCantidadSAP"
              ),

            cantidadVerificada:
              this.numeroCampo(
                "vrCantidadFisica"
              ),

            cantidadCorregida:
              this.numeroCampo(
                "vrCantidadCorregida"
              ),

            lineaProduccion:
              linea.value,

            responsableProduccionId:
              responsable.value,

            responsableProduccionNombre:
              opcionProduccion
                ? opcionProduccion.getAttribute(
                    "data-nombre"
                  ) || opcionProduccion.textContent.trim()
                : "",

            supervisorPTId:
              supervisor.value,

            supervisorPTNombre:
              opcionSupervisor
                ? opcionSupervisor.getAttribute(
                    "data-nombre"
                  ) || opcionSupervisor.textContent.trim()
                : "",

            analistaId:
              sesion &&
              sesion.idEmpleado
                ? sesion.idEmpleado
                : "",

            analistaNombre:
              sesion &&
              sesion.nombre
                ? sesion.nombre
                : "",

            comentarioAnalista:
              (
                document.getElementById(
                  "vrComentario"
                ) || {}
              ).value || "",

            horaInicio:
              this.estado.horaInicio,

            duracionMinutos:
              duracionMinutos
          },
          "Guardando verificación",
          "Registrando resultados, responsables y desviaciones."
        );

      this.cerrarModal();

      if (
        window.Sistema &&
        typeof Sistema.exito === "function"
      ) {

        Sistema.exito(
          respuesta.mensaje ||
          "Verificación registrada correctamente.",
          4200
        );

      }

      await this.cargarInicial();

    } catch (error) {

      console.error(
        "Error guardando verificación:",
        error
      );

      this.mostrarError(
        error.message ||
        "No fue posible guardar la verificación."
      );

    }

  },


  /* ==========================================================
   * UTILIDADES
   * ========================================================== */

  numeroCampo(id) {

    const campo =
      document.getElementById(id);

    return this.numero(
      campo
        ? campo.value
        : 0
    );

  },


  numero(valor) {

    const numero =
      Number(valor);

    return Number.isFinite(numero)
      ? numero
      : 0;

  },


  redondear(valor) {

    return Math.round(
      (
        this.numero(valor) +
        Number.EPSILON
      ) *
      100
    ) / 100;

  },


  obtenerHoraActual() {

    const ahora =
      new Date();

    return [
      String(
        ahora.getHours()
      ).padStart(2, "0"),
      String(
        ahora.getMinutes()
      ).padStart(2, "0"),
      String(
        ahora.getSeconds()
      ).padStart(2, "0")
    ].join(":");

  },


  formatearNumero(valor) {

    return new Intl.NumberFormat(
      "es-DO",
      {
        maximumFractionDigits:
          2
      }
    ).format(
      this.numero(valor)
    );

  },


  formatearMoneda(valor) {

    return new Intl.NumberFormat(
      "es-DO",
      {
        style:
          "currency",
        currency:
          "DOP",
        minimumFractionDigits:
          2
      }
    ).format(
      this.numero(valor)
    );

  },


  formatearConSigno(valor) {

    const numero =
      this.redondear(valor);

    if (numero > 0) {
      return "+" +
        this.formatearNumero(
          numero
        );
    }

    return this.formatearNumero(
      numero
    );

  },


  formatearFecha(valor) {

    if (!valor) {
      return "-";
    }

    const texto =
      String(valor);

    const fecha =
      new Date(
        texto.replace(
          " ",
          "T"
        )
      );

    if (
      !isNaN(
        fecha.getTime()
      )
    ) {

      return new Intl.DateTimeFormat(
        "es-DO",
        {
          day:
            "2-digit",
          month:
            "2-digit",
          year:
            "numeric"
        }
      ).format(fecha);

    }

    return texto;

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

  },


  mostrarError(mensaje) {

    if (
      window.Sistema &&
      typeof Sistema.error === "function"
    ) {

      Sistema.error(
        mensaje,
        5000
      );

      return;
    }

    console.error(mensaje);

  },


  mostrarAdvertencia(mensaje) {

    if (
      window.Sistema &&
      typeof Sistema.advertencia === "function"
    ) {

      Sistema.advertencia(
        mensaje,
        4200
      );

      return;
    }

    console.warn(mensaje);

  }

};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      window.VerificacionRecepciones
        .inicializarAccesoDirecto();
    }
  );
} else {
  window.VerificacionRecepciones
    .inicializarAccesoDirecto();
}

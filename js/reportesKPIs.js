/**
 * REPORTESKPIS.JS
 * Tablero departamental de Reportes & KPIs.
 *
 * Requiere: API, Sistema, Chart.js y ReportesKPIs.css.
 */

window.ReportesKPIs = {
  pestanaActiva: "indicadores",
  // Valores disponibles: "hojas" o "segmentadas".
  estiloPestanas: "hojas",
  versionCache: "1",
  prefijoCache: "bon_reportes_kpi",
  horaCorte: 18,
  minutoCorte: 15,
  cargando: false,
  datos: {},
  graficas: [],
  dialogoReporte: null,
  focoAntesDialogo: null,
  manejarTecladoDialogo: null,

  puedeVer() {
    const sesion = this.obtenerSesion();
    const rol = this.clave(sesion.rol || sesion.Rol);
    return ["ANALISTA", "SUPERVISOR", "ENCARGADO", "ADMINISTRADOR", "GERENCIA", "GERENTE"]
      .some(item => rol === item || rol.indexOf(item) >= 0);
  },

  obtenerSesion() {
    if (window.Sistema && typeof Sistema.obtenerSesion === "function") {
      return Sistema.obtenerSesion() || {};
    }
    try {
      return JSON.parse(localStorage.getItem("sesion") || sessionStorage.getItem("sesion") || "{}") || {};
    } catch (error) {
      return {};
    }
  },

  claveCache() {
    const sesion = this.obtenerSesion();
    const usuario = this.clave(
      sesion.idEmpleado || sesion.IDEmpleado || sesion.usuario ||
      sesion.Usuario || sesion.nombre || sesion.Nombre || "USUARIO"
    );
    const rol = this.clave(sesion.rol || sesion.Rol || "SIN_ROL");
    return `${this.prefijoCache}_${usuario}_${rol}`;
  },

  fechaISO(fecha) {
    return [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, "0"),
      String(fecha.getDate()).padStart(2, "0")
    ].join("-");
  },

  identificadorCorteVigente(fecha = new Date()) {
    const referencia = new Date(fecha);
    const corteHoy = new Date(
      referencia.getFullYear(),
      referencia.getMonth(),
      referencia.getDate(),
      this.horaCorte,
      this.minutoCorte,
      0,
      0
    );
    if (referencia < corteHoy) referencia.setDate(referencia.getDate() - 1);
    return this.fechaISO(referencia);
  },

  esDatoVigente(datos) {
    return Boolean(
      datos &&
      datos.fechaCarga &&
      datos.corteId === this.identificadorCorteVigente() &&
      datos.rango &&
      datos.rango.mes === this.rangoMesActual().mes
    );
  },

  leerCache(permitirVencido = false) {
    try {
      const contenido = localStorage.getItem(this.claveCache());
      if (!contenido) return null;
      const paquete = JSON.parse(contenido);
      if (!paquete || paquete.version !== this.versionCache || !paquete.datos) {
        localStorage.removeItem(this.claveCache());
        return null;
      }
      const datos = paquete.datos;
      const fechaCarga = new Date(datos.fechaCarga);
      if (Number.isNaN(fechaCarga.getTime())) {
        localStorage.removeItem(this.claveCache());
        return null;
      }
      datos.fechaCarga = fechaCarga;
      if (!permitirVencido && !this.esDatoVigente(datos)) return null;
      return datos;
    } catch (error) {
      console.warn("No fue posible leer el caché de Reportes & KPIs:", error);
      return null;
    }
  },

  guardarCache(datos) {
    try {
      localStorage.setItem(this.claveCache(), JSON.stringify({
        version: this.versionCache,
        guardadoEn: new Date().toISOString(),
        datos: datos
      }));
    } catch (error) {
      console.warn("No fue posible guardar el caché de Reportes & KPIs:", error);
    }
  },

  formatearFechaCorte(corteId) {
    const partes = String(corteId || "").split("-").map(Number);
    if (partes.length !== 3 || partes.some(valor => !Number.isFinite(valor))) return "";
    return new Date(partes[0], partes[1] - 1, partes[2]).toLocaleDateString(
      "es-DO",
      {day: "2-digit", month: "2-digit", year: "numeric"}
    );
  },

  async cargar() {
    const contenedor = document.getElementById("contenidoPrincipal");
    if (!contenedor) {
      console.error("No existe #contenidoPrincipal.");
      return;
    }
    if (!this.puedeVer()) {
      Sistema.advertencia("No tiene acceso a Reportes & KPIs.", 4200);
      return;
    }

    this.destruirGraficas();
    contenedor.innerHTML = this.construirModulo();
    this.conectarEventos();
    this.cambiarPestana(this.pestanaActiva || "indicadores");
    if (this.pestanaActiva === "indicadores") await this.cargarIndicadores();
  },

  construirModulo() {
    return `
      <section class="rk-modulo" aria-labelledby="rkTitulo">
        <header class="rk-encabezado">
          <div>
            <span class="rk-sobrelinea">Vista departamental</span>
            <h2 id="rkTitulo">Reportes &amp; KPIs</h2>
            <p>Lectura rápida de despacho, recepción, decomisos y ocupación.</p>
          </div>
          <button type="button" id="rkActualizar" class="rk-btn rk-btn-principal">
            <i class="fa-solid fa-arrows-rotate"></i>
            Actualizar
          </button>
        </header>

        <nav id="rkPestanas" class="rk-pestanas rk-pestanas--${this.estiloPestanas === "segmentadas" ? "segmentadas" : "hojas"}" role="tablist" aria-label="Secciones de Reportes y KPIs">
          <button type="button" id="rkTabIndicadores" role="tab" data-rk-tab="indicadores" aria-controls="rkPanelIndicadores">
            <i class="fa-solid fa-chart-line"></i>
            Indicadores
          </button>
          <button type="button" id="rkTabReportes" role="tab" data-rk-tab="reportes" aria-controls="rkPanelReportes">
            <i class="fa-solid fa-file-lines"></i>
            Reportes
          </button>
        </nav>

        <section id="rkPanelIndicadores" class="rk-panel" role="tabpanel" aria-labelledby="rkTabIndicadores">
          ${this.construirEstadoInicial()}
        </section>

        <section id="rkPanelReportes" class="rk-panel" role="tabpanel" aria-labelledby="rkTabReportes" hidden>
          ${this.construirPestanaReportes()}
        </section>
      </section>
    `;
  },

  construirEstadoInicial() {
    return `
      <div class="rk-estado rk-cargando-local">
        <i class="fa-solid fa-chart-pie"></i>
        <strong>Preparando indicadores</strong>
        <span>Consolidando la información del mes actual.</span>
      </div>
    `;
  },

  construirPestanaReportes() {
    return `
      <section class="rk-reportes-preparacion">
        <div class="rk-reportes-icono"><i class="fa-solid fa-sliders"></i></div>
        <div>
          <span class="rk-sobrelinea">Segunda etapa</span>
          <h3>Estrategia de filtros para reportes</h3>
          <p>
            Esta pestaña queda reservada para definir los filtros, plantillas,
            formatos PDF/PPTX y destinatarios antes de conectar la exportación.
          </p>
        </div>
      </section>
      <div class="rk-filtros-futuros">
        ${this.tarjetaFutura("Período", "Día, semana, mes y rango personalizado", "fa-calendar-days")}
        ${this.tarjetaFutura("Proceso", "Despacho, recepción, decomiso y ocupación", "fa-diagram-project")}
        ${this.tarjetaFutura("Responsables", "Producción, PT, analistas y supervisores", "fa-users")}
        ${this.tarjetaFutura("Salida", "PDF, PowerPoint y envío por correo", "fa-file-export")}
      </div>
      <div class="rk-nota-filtros">
        <i class="fa-solid fa-circle-info"></i>
        <span>Esta pestaña todavía no ejecuta consultas ni envíos.</span>
      </div>
    `;
  },

  tarjetaFutura(titulo, texto, icono) {
    return `
      <article class="rk-filtro-futuro">
        <i class="fa-solid ${icono}"></i>
        <div><strong>${this.escapar(titulo)}</strong><span>${this.escapar(texto)}</span></div>
      </article>
    `;
  },

  conectarEventos() {
    document.querySelectorAll("[data-rk-tab]").forEach(boton => {
      boton.addEventListener("click", () => this.cambiarPestana(boton.dataset.rkTab));
    });
    const actualizar = document.getElementById("rkActualizar");
    if (actualizar) actualizar.addEventListener("click", () => this.cargarIndicadores(true));
  },

  conectarAccionesReporte() {
    const enviar = document.getElementById("rkEnviarReporte");
    const imprimir = document.getElementById("rkImprimirReporte");
    const exportar = document.getElementById("rkExportarReporte");
    if (enviar) enviar.addEventListener("click", () => this.abrirDialogoReporte("enviar"));
    if (imprimir) imprimir.addEventListener("click", () => window.print());
    if (exportar) exportar.addEventListener("click", () => this.abrirDialogoReporte("exportar"));
  },

  abrirDialogoReporte(modo) {
    const esEnvio = modo === "enviar";
    const titulo = esEnvio ? "Enviar Reportes & KPIs" : "Exportar Reportes & KPIs";
    this.cerrarDialogoReporte(true);
    this.focoAntesDialogo = document.activeElement;

    const correosConfigurados = this.obtenerCorreosConfigurados();
    const selectorCorreos = esEnvio ? `
      <details class="rk-dialogo-plegable" ${correosConfigurados.length ? "open" : ""}>
        <summary>
          <span><i class="fa-solid fa-address-book"></i> Correos de Configuración</span>
          <i class="fa-solid fa-chevron-down rk-plegable-flecha" aria-hidden="true"></i>
        </summary>
        <div class="rk-dialogo-plegable-contenido">
          ${correosConfigurados.length ? `
            <div class="rk-lista-correos" role="group" aria-label="Correos configurados">
              ${correosConfigurados.map((correo, indice) => `
                <label class="rk-correo-opcion">
                  <input type="checkbox" name="rkCorreoConfigurado" value="${this.escapar(correo)}" ${indice === 0 ? "checked" : ""}>
                  <span>${this.escapar(correo)}</span>
                </label>
              `).join("")}
            </div>
          ` : `<p class="rk-sin-correos">No hay correos de Reportes & KPIs definidos en Configuración.</p>`}
        </div>
      </details>
      <label class="rk-campo-dialogo" for="rkCorreoReporte">
        <span>Otro correo destinatario <small>(opcional)</small></span>
        <input id="rkCorreoReporte" type="text" inputmode="email" autocomplete="email" placeholder="correo@empresa.com; otro@empresa.com">
      </label>
      <small class="rk-ayuda-dialogo">Puede seleccionar los correos configurados y agregar otros separados por coma o punto y coma.</small>
    ` : "";

    document.body.insertAdjacentHTML("beforeend", `
      <div id="rkDialogoFondo" class="rk-dialogo-fondo" data-modo="${esEnvio ? "enviar" : "exportar"}">
        <section class="rk-dialogo-tarjeta" role="dialog" aria-modal="true" aria-labelledby="rkDialogoTitulo">
          <header class="rk-dialogo-encabezado">
            <div>
              <span>${esEnvio ? "Distribución" : "Documento"}</span>
              <h3 id="rkDialogoTitulo">${titulo}</h3>
            </div>
            <button type="button" id="rkCerrarDialogo" class="rk-dialogo-cerrar" aria-label="Cerrar">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>
          <form id="rkFormularioReporte" class="rk-form-reporte">
            ${selectorCorreos}
            <fieldset class="rk-formatos" aria-label="Formato del archivo">
              <legend>Formato</legend>
              <label class="rk-formato-opcion">
                <input type="radio" name="rkFormatoReporte" value="PDF" checked>
                <span class="rk-radio-circulo" aria-hidden="true"></span>
                <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>
                <span><strong>PDF</strong><small>Documento listo para compartir o imprimir</small></span>
              </label>
              <label class="rk-formato-opcion">
                <input type="radio" name="rkFormatoReporte" value="PPTX">
                <span class="rk-radio-circulo" aria-hidden="true"></span>
                <i class="fa-solid fa-file-powerpoint" aria-hidden="true"></i>
                <span><strong>PowerPoint</strong><small>Presentación editable en formato PPTX</small></span>
              </label>
            </fieldset>
            <div class="rk-form-acciones">
              <button type="button" id="rkCancelarReporte" class="rk-dialogo-boton rk-dialogo-boton-secundario">Cancelar</button>
              <button type="submit" id="rkConfirmarReporte" class="rk-dialogo-boton rk-dialogo-boton-principal">
                <i class="fa-solid ${esEnvio ? "fa-paper-plane" : "fa-download"}"></i>
                ${esEnvio ? "Enviar" : "Exportar"}
              </button>
            </div>
          </form>
        </section>
      </div>
    `);

    this.dialogoReporte = document.getElementById("rkDialogoFondo");
    document.body.classList.add("rk-dialogo-abierto");
    requestAnimationFrame(() => this.dialogoReporte && this.dialogoReporte.classList.add("visible"));

    const cerrar = () => this.cerrarDialogoReporte();
    document.getElementById("rkCerrarDialogo")?.addEventListener("click", cerrar);
    document.getElementById("rkCancelarReporte")?.addEventListener("click", cerrar);
    const formulario = document.getElementById("rkFormularioReporte");
    if (formulario) formulario.onsubmit = async evento => {
      evento.preventDefault();
      const formatoSeleccionado = formulario.querySelector("input[name='rkFormatoReporte']:checked");
      const formato = formatoSeleccionado ? formatoSeleccionado.value : "PDF";
      const correoEntrada = document.getElementById("rkCorreoReporte");
      const correosMarcados = Array.from(formulario.querySelectorAll("input[name='rkCorreoConfigurado']:checked"))
        .map(campo => campo.value.trim()).filter(Boolean);
      const adicionales = correoEntrada ? correoEntrada.value.split(/[;,]/).map(valor => valor.trim()).filter(Boolean) : [];
      const correoDestino = Array.from(new Set(correosMarcados.concat(adicionales))).join(",");
      if (esEnvio && !correoDestino) {
        Sistema.advertencia("Seleccione o escriba al menos un correo destinatario.", 4200);
        return;
      }
      await this.procesarSalidaReporte(esEnvio, formato, correoDestino);
    };

    this.manejarTecladoDialogo = evento => {
      if (!this.dialogoReporte) return;
      if (evento.key === "Escape") {
        evento.preventDefault();
        this.cerrarDialogoReporte();
        return;
      }
      if (evento.key !== "Tab") return;
      const focos = Array.from(this.dialogoReporte.querySelectorAll("button, input, summary, [tabindex]:not([tabindex='-1'])"))
        .filter(elemento => !elemento.disabled && elemento.getClientRects().length);
      if (!focos.length) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", this.manejarTecladoDialogo);
    setTimeout(() => document.getElementById("rkCerrarDialogo")?.focus(), 30);
  },

  obtenerCorreosConfigurados() {
    const complemento = this.extraerData(this.datos.complemento);
    const lista = Array.isArray(complemento.correosConfigurados) ? complemento.correosConfigurados : [];
    return Array.from(new Set(lista.map(correo => String(correo || "").trim()).filter(correo => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))));
  },

  cerrarDialogoReporte(inmediato = false) {
    const fondo = this.dialogoReporte || document.getElementById("rkDialogoFondo");
    if (!fondo) return;
    if (fondo.contains(document.activeElement)) document.activeElement.blur();
    fondo.classList.remove("visible");
    fondo.inert = true;
    document.body.classList.remove("rk-dialogo-abierto");
    if (this.manejarTecladoDialogo) document.removeEventListener("keydown", this.manejarTecladoDialogo);
    this.manejarTecladoDialogo = null;
    this.dialogoReporte = null;
    const retirar = () => fondo.remove();
    if (inmediato) retirar(); else setTimeout(retirar, 190);
    const foco = this.focoAntesDialogo;
    this.focoAntesDialogo = null;
    if (!inmediato && foco && document.contains(foco)) setTimeout(() => foco.focus(), 200);
  },

  async procesarSalidaReporte(esEnvio, formato, correoDestino) {
    const action = esEnvio ? "enviarArchivoReportesKPI" : "generarArchivoReportesKPI";
    Sistema.mostrarCarga(
      esEnvio ? "Enviando Reportes & KPIs" : "Generando archivo",
      `Preparando el reporte en formato ${formato}.`
    );
    try {
      const respuesta = await API.post({
        action: action,
        formato: formato,
        correo: correoDestino,
        resumen: this.construirResumenExportacion()
      });
      if (!respuesta || respuesta.ok === false) {
        throw new Error(respuesta && respuesta.mensaje ? respuesta.mensaje : "No fue posible generar el reporte.");
      }
      const contenido = respuesta.data || respuesta;
      if (esEnvio) {
        this.cerrarDialogoReporte();
        Sistema.exito(`Reporte enviado a ${contenido.correo || correoDestino || "el correo configurado"}.`);
      } else {
        const archivo = contenido.archivo || contenido;
        this.descargarArchivo(archivo);
        this.cerrarDialogoReporte();
        Sistema.exito("El reporte fue generado correctamente.");
      }
    } catch (error) {
      Sistema.error(error.message || String(error));
    } finally {
      Sistema.ocultarCarga();
    }
  },

  construirResumenExportacion() {
    const exactitudData = this.extraerData(this.datos.exactitud);
    const exactitud = exactitudData.resumen || {};
    const complemento = this.extraerData(this.datos.complemento);
    const recepcion = complemento.resumenRecepciones || {};
    const metas = Array.isArray(this.datos.metas && this.datos.metas.metas) ? this.datos.metas.metas : [];
    const resumenMeta = this.resumirMetas(metas);
    const decomisos = this.extraerData(this.datos.decomisos).indicadores || {};
    const ocupacion = this.extraerData(this.datos.ocupacion);
    const despacho = this.resumenMontoDesviaciones(exactitud);
    const reduccion = this.calcularReduccionDecomiso(decomisos);
    const indicadores = [
      {nombre: "Exactitud de despacho", valor: this.porcentaje(exactitud.tasaExactitud), detalle: "Sobre bultos verificados"},
      {nombre: "Tasa de error en despacho", valor: this.porcentaje(exactitud.tasaError), detalle: this.numero(exactitud.bultosDesviados) + " bultos desviados"},
      {nombre: "Recepciones verificadas", valor: this.numero(recepcion.totalVerificaciones), detalle: this.numero(recepcion.conDesviacion) + " con desviación"},
      {nombre: "Tasa de error en recepción", valor: this.porcentaje(recepcion.tasaError), detalle: "Según verificaciones del período"},
      {nombre: "Ocupación de cámaras", valor: this.porcentaje(ocupacion.porcentajeOcupacion || ocupacion.porcentaje), detalle: this.numero(ocupacion.posicionesDisponibles || ocupacion.disponibles) + " posiciones disponibles"},
      {nombre: "Meta de despachos", valor: this.porcentaje(resumenMeta.cumplimiento), detalle: this.numero(resumenMeta.realizados) + " realizados de " + this.numero(resumenMeta.meta)},
      {nombre: "Meta de reducción de decomiso", valor: this.porcentaje(reduccion.avanceMeta), detalle: "Reducción real " + this.porcentaje(reduccion.reduccionReal)},
      {nombre: "Desviaciones de despacho - total", valor: this.moneda(despacho.total), detalle: "Detectado en el período"},
      {nombre: "Desviaciones de despacho - corregido", valor: this.moneda(despacho.corregido), detalle: this.porcentaje(despacho.resolucion) + " resuelto"},
      {nombre: "Desviaciones de despacho - pendiente", valor: this.moneda(despacho.pendiente), detalle: "Requiere seguimiento"},
      {nombre: "Desviaciones de recepción - total", valor: this.moneda(recepcion.montoTotal), detalle: "Detectado en el período"},
      {nombre: "Desviaciones de recepción - corregido", valor: this.moneda(recepcion.montoCorregido), detalle: this.porcentaje(recepcion.resolucionPorcentaje) + " resuelto"},
      {nombre: "Desviaciones de recepción - pendiente", valor: this.moneda(recepcion.montoPendiente), detalle: "Requiere seguimiento"},
      {nombre: "Valor de decomisos", valor: this.moneda(decomisos.valorTotal), detalle: this.numero(decomisos.pendientes) + " pendientes de aprobación"}
    ];
    return {
      titulo: "Reportes & KPIs",
      periodo: this.datos.rango && this.datos.rango.mes ? this.datos.rango.mes : "",
      corte: this.datos.corteId || "",
      generadoEn: new Date().toISOString(),
      generadoPor: this.obtenerSesion().nombre || this.obtenerSesion().Nombre || "",
      metricas: {
        exactitudDespacho: this.valorNumero(exactitud.tasaExactitud),
        errorDespacho: this.valorNumero(exactitud.tasaError),
        errorRecepcion: this.valorNumero(recepcion.tasaError),
        ocupacionCamaras: this.valorNumero(ocupacion.porcentajeOcupacion || ocupacion.porcentaje),
        metaDespachos: this.valorNumero(resumenMeta.cumplimiento),
        metaDecomiso: this.valorNumero(reduccion.avanceMeta),
        desviacionesDespacho: {
          total: this.valorNumero(despacho.total),
          corregido: this.valorNumero(despacho.corregido),
          pendiente: this.valorNumero(despacho.pendiente)
        },
        desviacionesRecepcion: {
          total: this.valorNumero(recepcion.montoTotal),
          corregido: this.valorNumero(recepcion.montoCorregido),
          pendiente: this.valorNumero(recepcion.montoPendiente)
        }
      },
      evolucionDespacho: (exactitudData.evolucion || []).slice(-16),
      evolucionRecepcion: (complemento.evolucionRecepciones || []).slice(-16),
      indicadores: indicadores,
      responsablesProduccion: (complemento.responsablesProduccion || []).slice(0, 8),
      responsablesPT: (complemento.responsablesPT || []).slice(0, 8)
    };
  },

  descargarArchivo(archivo) {
    if (!archivo || !archivo.base64) throw new Error("El servidor no devolvió el archivo solicitado.");
    const binario = atob(archivo.base64);
    const bytes = new Uint8Array(binario.length);
    for (let indice = 0; indice < binario.length; indice += 1) bytes[indice] = binario.charCodeAt(indice);
    const enlace = document.createElement("a");
    const url = URL.createObjectURL(new Blob([bytes], {type: archivo.mimeType || "application/octet-stream"}));
    enlace.href = url;
    enlace.download = archivo.nombre || "Reportes_KPIs";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  },

  configurarEstiloPestanas(estilo) {
    this.estiloPestanas = estilo === "segmentadas" ? "segmentadas" : "hojas";
    const navegacion = document.getElementById("rkPestanas");
    if (!navegacion) return;
    navegacion.classList.toggle("rk-pestanas--hojas", this.estiloPestanas === "hojas");
    navegacion.classList.toggle("rk-pestanas--segmentadas", this.estiloPestanas === "segmentadas");
  },

  cambiarPestana(nombre) {
    this.pestanaActiva = nombre === "reportes" ? "reportes" : "indicadores";
    document.querySelectorAll("[data-rk-tab]").forEach(boton => {
      const activa = boton.dataset.rkTab === this.pestanaActiva;
      boton.classList.toggle("activo", activa);
      boton.setAttribute("aria-selected", activa ? "true" : "false");
      boton.tabIndex = activa ? 0 : -1;
    });
    const indicadores = document.getElementById("rkPanelIndicadores");
    const reportes = document.getElementById("rkPanelReportes");
    if (indicadores) indicadores.hidden = this.pestanaActiva !== "indicadores";
    if (reportes) reportes.hidden = this.pestanaActiva !== "reportes";
    const actualizar = document.getElementById("rkActualizar");
    if (actualizar) actualizar.hidden = this.pestanaActiva !== "indicadores";
  },

  async cargarIndicadores(forzar) {
    if (this.cargando) return;
    if (!forzar) {
      if (this.esDatoVigente(this.datos)) {
        this.renderizarIndicadores();
        return;
      }
      const datosGuardados = this.leerCache();
      if (datosGuardados) {
        this.datos = datosGuardados;
        this.renderizarIndicadores();
        return;
      }
    }

    this.cargando = true;
    Sistema.mostrarCarga("Cargando Reportes & KPIs", "Consolidando los indicadores del mes actual.");
    try {
      const rango = this.rangoMesActual();
      const peticiones = {
        exactitud: {
          action: "obtenerCentroExactitudDespachos",
          fechaDesde: rango.fechaDesde,
          fechaHasta: rango.fechaHasta,
          agrupacion: "DIA",
          limite: 1,
          desplazamiento: 0
        },
        metas: {action: "listarMetasDiarias", accion: "listarMetasDiarias", mes: rango.mes},
        recepciones: {action: "obtenerAnaliticaOperativaRecepciones", frecuencia: "DIA"},
        complemento: {
          action: "obtenerComplementoReportesKPI",
          fechaDesde: rango.fechaDesde,
          fechaHasta: rango.fechaHasta
        },
        decomisos: {
          action: "obtenerDecomisosAlmacen",
          desde: rango.mes,
          hasta: rango.mes,
          pagina: 1,
          limite: 10
        },
        ocupacion: {action: "obtenerIndicadorOcupacionCamaras"}
      };

      const claves = Object.keys(peticiones);
      const respuestas = await Promise.all(claves.map(clave => this.consultaSegura(peticiones[clave])));
      const consultaCompleta = respuestas.every(respuesta => respuesta && respuesta.ok !== false);
      const respaldo = consultaCompleta ? null : this.leerCache(true);
      if (respaldo) {
        this.datos = respaldo;
        this.renderizarIndicadores();
        Sistema.advertencia("No fue posible actualizar todos los indicadores. Se muestra el último corte disponible.", 5200);
        return;
      }
      this.datos = {
        fechaCarga: new Date(),
        corteId: this.identificadorCorteVigente(),
        rango: rango
      };
      claves.forEach((clave, indice) => { this.datos[clave] = respuestas[indice]; });
      if (consultaCompleta) this.guardarCache(this.datos);
      this.renderizarIndicadores();
    } catch (error) {
      console.error("Error cargando Reportes & KPIs:", error);
      const respaldo = this.leerCache(true);
      if (respaldo) {
        this.datos = respaldo;
        this.renderizarIndicadores();
        Sistema.advertencia("Se muestra el último corte disponible porque la actualización falló.", 5200);
      } else {
        this.renderizarError(error.message || "No fue posible cargar los indicadores.");
      }
    } finally {
      this.cargando = false;
      Sistema.ocultarCarga();
    }
  },

  async consultaSegura(datos) {
    try {
      const respuesta = await API.post(datos);
      if (!respuesta || respuesta.ok === false) {
        return {ok: false, mensaje: respuesta && respuesta.mensaje ? respuesta.mensaje : "Consulta no disponible."};
      }
      return respuesta;
    } catch (error) {
      return {ok: false, mensaje: error.message || "Consulta no disponible."};
    }
  },

  renderizarIndicadores() {
    const panel = document.getElementById("rkPanelIndicadores");
    if (!panel) return;

    const exactitudData = this.extraerData(this.datos.exactitud);
    const exactitud = exactitudData.resumen || {};
    const complemento = this.extraerData(this.datos.complemento);
    const recepcion = complemento.resumenRecepciones || {};
    const metas = Array.isArray(this.datos.metas && this.datos.metas.metas) ? this.datos.metas.metas : [];
    const resumenMeta = this.resumirMetas(metas);
    const recepcionesSerie = this.extraerData(this.datos.recepciones).serie || [];
    const decomisos = this.extraerData(this.datos.decomisos).indicadores || {};
    const ocupacion = this.extraerData(this.datos.ocupacion);
    const montoDespacho = this.resumenMontoDesviaciones(exactitud);
    const reduccion = this.calcularReduccionDecomiso(decomisos);
    const fechaCargaValor = this.datos.fechaCarga instanceof Date
      ? this.datos.fechaCarga
      : new Date(this.datos.fechaCarga);
    const fechaCarga = Number.isNaN(fechaCargaValor.getTime())
      ? ""
      : fechaCargaValor.toLocaleString("es-DO", {dateStyle: "short", timeStyle: "short"});
    const fechaCorte = this.formatearFechaCorte(this.datos.corteId);

    this.destruirGraficas();
    panel.innerHTML = `
      <header class="rk-encabezado-documento" aria-hidden="true">
        <div class="rk-documento-marca"><img src="../img/icon.png" alt=""><strong>Helados BON</strong></div>
        <div class="rk-documento-titulo"><strong>Sistema Logístico Productos Terminados</strong><span>REPORTE DE INDICADORES DEPARTAMENTALES</span></div>
        <div class="rk-documento-codigo"><span>Documento KPI</span><strong>${this.escapar(this.datos.corteId || "Corte actual")}</strong></div>
      </header>
      <div class="rk-acciones-reporte" aria-label="Acciones del reporte">
        <button type="button" id="rkEnviarReporte" class="rk-btn rk-btn-secundario"><i class="fa-solid fa-envelope"></i> Enviar</button>
        <button type="button" id="rkImprimirReporte" class="rk-btn rk-btn-secundario"><i class="fa-solid fa-print"></i> Imprimir</button>
        <button type="button" id="rkExportarReporte" class="rk-btn rk-btn-secundario"><i class="fa-solid fa-file-export"></i> Exportar</button>
      </div>
      <div class="rk-periodo">
        <div><i class="fa-solid fa-calendar"></i><span>Mes actual: <strong>${this.escapar(this.datos.rango.mes)}</strong></span></div>
        <small>Corte ${this.escapar(fechaCorte)} · consultado ${this.escapar(fechaCarga)}</small>
      </div>

      <section class="rk-kpis-principales">
        ${this.kpi("Exactitud de despacho", this.porcentaje(exactitud.tasaExactitud), "fa-bullseye", "verde", "Sobre bultos verificados")}
        ${this.kpi("Tasa de error en despacho", this.porcentaje(exactitud.tasaError), "fa-triangle-exclamation", "rojo", this.numero(exactitud.bultosDesviados) + " bultos desviados")}
        ${this.kpi("Recepciones verificadas", this.numero(recepcion.totalVerificaciones), "fa-boxes-stacked", "azul", this.numero(recepcion.conDesviacion) + " con desviación")}
        ${this.kpi("Tasa de error en recepción", this.porcentaje(recepcion.tasaError), "fa-magnifying-glass-chart", "naranja", "Según verificaciones del período")}
        ${this.kpi("Ocupación de cámaras", this.porcentaje(ocupacion.porcentajeOcupacion || ocupacion.porcentaje), "fa-warehouse", "morado", this.numero(ocupacion.posicionesDisponibles || ocupacion.disponibles) + " posiciones disponibles")}
      </section>

      <section class="rk-grid-metas">
        ${this.velocimetro("Meta de despachos", resumenMeta.cumplimiento, this.numero(resumenMeta.realizados) + " realizados de " + this.numero(resumenMeta.meta), resumenMeta.cumplimiento >= 100 ? "Meta alcanzada o superada" : this.porcentaje(100 - resumenMeta.cumplimiento) + " para llegar a la meta")}
        ${this.velocimetro("Meta de reducción de decomiso", reduccion.avanceMeta, "Reducción real " + this.porcentaje(reduccion.reduccionReal) + " · meta " + this.porcentaje(reduccion.meta), reduccion.avanceMeta >= 100 ? "Meta alcanzada o superada" : this.porcentaje(100 - reduccion.avanceMeta) + " para completar la meta")}
      </section>

      <section class="rk-bloque">
        <header class="rk-bloque-titulo">
          <div><span>Control monetario</span><h3>Desviaciones de despacho</h3></div>
          <strong>${this.porcentaje(montoDespacho.resolucion)} resuelto</strong>
        </header>
        ${this.trioMontos(montoDespacho, "despacho")}
      </section>

      <section class="rk-bloque">
        <header class="rk-bloque-titulo">
          <div><span>Control monetario</span><h3>Desviaciones de recepción</h3></div>
          <strong>${this.porcentaje(recepcion.resolucionPorcentaje)} resuelto</strong>
        </header>
        ${this.trioMontos({total: recepcion.montoTotal, corregido: recepcion.montoCorregido, pendiente: recepcion.montoPendiente}, "recepción")}
      </section>

      <section class="rk-grid-graficas">
        ${this.tarjetaGrafica("Evolución de exactitud", "Despacho por día", "rkGraficaExactitud")}
        ${this.tarjetaGrafica("Actividad de recepción", "Tarimas y posiciones registradas", "rkGraficaRecepciones")}
      </section>

      <section class="rk-grid-responsables">
        <article class="rk-bloque rk-bloque-responsables">
          <header class="rk-bloque-titulo">
            <div><span>Mapa de calor</span><h3>Responsables de Producción por monto desviado</h3></div>
          </header>
          ${this.mapaCalor(complemento.responsablesProduccion || [])}
        </article>
        <article class="rk-bloque rk-bloque-responsables">
          <header class="rk-bloque-titulo">
            <div><span>Seguimiento PT</span><h3>Responsables PT</h3></div>
          </header>
          ${this.rankingResponsables(complemento.responsablesPT || [])}
        </article>
      </section>

      <section class="rk-bloque">
        <header class="rk-bloque-titulo">
          <div><span>Decomisos</span><h3>Valor registrado del período</h3></div>
          <strong>Meta de reducción ${this.porcentaje(decomisos.metaReduccion)}</strong>
        </header>
        <div class="rk-decomiso-resumen">
          <div><span>Valor registrado</span><strong>${this.moneda(decomisos.valorTotal)}</strong></div>
          <div><span>Pendientes de aprobación</span><strong>${this.numero(decomisos.pendientes)}</strong></div>
          <div><span>Aprobados</span><strong>${this.numero(decomisos.aprobados)}</strong></div>
        </div>
      </section>
    `;

    this.crearGraficaExactitud(exactitudData.evolucion || []);
    this.crearGraficaRecepciones(recepcionesSerie);
    this.conectarAccionesReporte();
  },

  kpi(etiqueta, valor, icono, clase, detalle) {
    return `
      <article class="rk-kpi rk-${clase}">
        <div class="rk-kpi-icono"><i class="fa-solid ${icono}"></i></div>
        <span>${this.escapar(etiqueta)}</span>
        <strong>${this.escapar(valor)}</strong>
        <small>${this.escapar(detalle)}</small>
      </article>
    `;
  },

  velocimetro(titulo, porcentaje, detalle, estado) {
    const valor = Math.max(0, this.valorNumero(porcentaje));
    const limitado = Math.min(100, valor);
    const angulo = -90 + limitado * 1.8;
    const clase = valor >= 100 ? "verde" : valor >= 85 ? "amarillo" : valor >= 60 ? "naranja" : "rojo";
    return `
      <article class="rk-velocimetro rk-velocimetro-${clase}">
        <div class="rk-velocimetro-texto">
          <span>Objetivo mensual</span>
          <h3>${this.escapar(titulo)}</h3>
          <strong>${this.porcentaje(valor)}</strong>
          <p>${this.escapar(detalle)}</p>
          <small>${this.escapar(estado)}</small>
        </div>
        <div class="rk-medidor" role="img" aria-label="${this.escapar(titulo)}: ${this.porcentaje(valor)}">
          <svg viewBox="0 0 220 126" aria-hidden="true">
            <path class="rk-medidor-fondo" pathLength="100" d="M 20 108 A 90 90 0 0 1 200 108"></path>
            <path class="rk-medidor-avance" pathLength="100" stroke-dasharray="${limitado} 100" d="M 20 108 A 90 90 0 0 1 200 108"></path>
            <g class="rk-aguja" style="transform:rotate(${angulo}deg)">
              <line x1="110" y1="108" x2="110" y2="35"></line>
            </g>
            <circle cx="110" cy="108" r="8"></circle>
            <text x="17" y="124">0</text>
            <text x="177" y="124">100% meta</text>
          </svg>
        </div>
      </article>
    `;
  },

  trioMontos(datos, proceso) {
    const total = this.valorNumero(datos.total);
    const pendiente = this.valorNumero(datos.pendiente);
    const corregido = datos.corregido === undefined
      ? Math.max(0, total - pendiente)
      : this.valorNumero(datos.corregido);
    return `
      <div class="rk-trio-montos" aria-label="Montos de desviaciones de ${this.escapar(proceso)}">
        <article class="rk-monto total"><span>Monto total de desviaciones</span><strong>${this.moneda(total)}</strong><small>Detectado en el período</small></article>
        <article class="rk-monto corregido"><span>Monto corregido</span><strong>${this.moneda(corregido)}</strong><small>Desviación resuelta</small></article>
        <article class="rk-monto pendiente"><span>Monto pendiente</span><strong>${this.moneda(pendiente)}</strong><small>Requiere seguimiento</small></article>
      </div>
    `;
  },

  tarjetaGrafica(titulo, subtitulo, id) {
    return `
      <article class="rk-bloque rk-grafica-card">
        <header class="rk-bloque-titulo"><div><span>${this.escapar(subtitulo)}</span><h3>${this.escapar(titulo)}</h3></div></header>
        <div class="rk-lienzo"><canvas id="${id}"></canvas></div>
      </article>
    `;
  },

  mapaCalor(lista) {
    if (!Array.isArray(lista) || !lista.length) return this.sinDatos("Todavía no hay desviaciones valorizadas por responsable.");
    const maximo = Math.max(1, ...lista.map(item => this.valorNumero(item.montoTotal)));
    return `<div class="rk-mapa-calor">${lista.slice(0, 8).map((item, indice) => {
      const intensidad = Math.max(12, Math.round(this.valorNumero(item.montoTotal) / maximo * 100));
      return `
        <article class="rk-calor" style="--rk-intensidad:${intensidad}%">
          <div><span>${indice + 1}</span><strong>${this.escapar(item.nombre || "Sin asignar")}</strong><small>${this.escapar(item.grupo || "")}</small></div>
          <strong>${this.moneda(item.montoTotal)}</strong>
          <small>Corregido ${this.moneda(item.montoCorregido)} · Pendiente ${this.moneda(item.montoPendiente)}</small>
        </article>
      `;
    }).join("")}</div>`;
  },

  rankingResponsables(lista) {
    if (!Array.isArray(lista) || !lista.length) return this.sinDatos("Todavía no hay desviaciones valorizadas por responsable PT.");
    return `<div class="rk-ranking">${lista.slice(0, 8).map((item, indice) => `
      <article>
        <span class="rk-posicion">${indice + 1}</span>
        <div><strong>${this.escapar(item.nombre || "Sin asignar")}</strong><small>${this.numero(item.casos)} casos</small></div>
        <div class="rk-ranking-montos"><strong>${this.moneda(item.montoTotal)}</strong><small>${this.moneda(item.montoPendiente)} pendiente</small></div>
      </article>
    `).join("")}</div>`;
  },

  sinDatos(texto) {
    return `<div class="rk-sin-datos"><i class="fa-regular fa-folder-open"></i><span>${this.escapar(texto)}</span></div>`;
  },

  resumenMontoDesviaciones(resumen) {
    const total = this.valorNumero(resumen.valorDesviaciones);
    const pendiente = this.valorNumero(resumen.valorPendiente);
    const corregidoInformado = this.valorNumero(resumen.valorCorregido);
    const corregido = corregidoInformado > 0 ? corregidoInformado : Math.max(0, total - pendiente);
    return {
      total: total,
      corregido: corregido,
      pendiente: pendiente,
      resolucion: total > 0 ? corregido / total * 100 : 0
    };
  },

  resumirMetas(lista) {
    const meta = lista.reduce((suma, item) => suma + this.valorNumero(item.metaDespachos), 0);
    const realizados = lista.reduce((suma, item) => suma + this.valorNumero(item.despachosRealizados), 0);
    return {meta: meta, realizados: realizados, cumplimiento: meta > 0 ? realizados / meta * 100 : 0};
  },

  calcularReduccionDecomiso(indicadores) {
    const serie = Array.isArray(indicadores.porMes) ? indicadores.porMes : [];
    const meta = this.valorNumero(indicadores.metaReduccion);
    let reduccionReal = 0;
    if (serie.length > 1) {
      const inicial = this.valorNumero(serie[0].valor);
      const final = this.valorNumero(serie[serie.length - 1].valor);
      reduccionReal = inicial > 0 ? Math.max(0, (inicial - final) / inicial * 100) : 0;
    }
    return {meta: meta, reduccionReal: reduccionReal, avanceMeta: meta > 0 ? reduccionReal / meta * 100 : 0};
  },

  crearGraficaExactitud(serie) {
    const lienzo = document.getElementById("rkGraficaExactitud");
    if (!lienzo || typeof Chart === "undefined") return;
    const datos = Array.isArray(serie) ? serie : [];
    if (!datos.length) return this.marcarGraficaVacia(lienzo, "Sin evolución de despacho en el período.");
    const grafica = new Chart(lienzo, {
      type: "line",
      data: {
        labels: datos.map(item => item.etiqueta || item.fecha || item.periodo || ""),
        datasets: [
          {label: "Exactitud", data: datos.map(item => this.valorNumero(item.tasaExactitud || item.exactitud)), borderColor: "#2aa866", backgroundColor: "rgba(42,168,102,.12)", tension: .3, fill: true},
          {label: "Error", data: datos.map(item => this.valorNumero(item.tasaError || item.error)), borderColor: "#e12536", backgroundColor: "rgba(225,37,54,.08)", tension: .3, fill: false}
        ]
      },
      options: this.opcionesGraficaPorcentaje()
    });
    this.graficas.push(grafica);
  },

  crearGraficaRecepciones(serie) {
    const lienzo = document.getElementById("rkGraficaRecepciones");
    if (!lienzo || typeof Chart === "undefined") return;
    const datos = Array.isArray(serie) ? serie : [];
    if (!datos.length) return this.marcarGraficaVacia(lienzo, "Sin actividad de recepción en el período.");
    const grafica = new Chart(lienzo, {
      type: "bar",
      data: {
        labels: datos.map(item => item.etiqueta || item.clave || ""),
        datasets: [
          {label: "Tarimas", data: datos.map(item => this.valorNumero(item.tarimas)), backgroundColor: "rgba(209,31,60,.82)", borderRadius: 5},
          {label: "Posiciones", data: datos.map(item => this.valorNumero(item.posiciones)), backgroundColor: "rgba(65,125,189,.78)", borderRadius: 5}
        ]
      },
      options: this.opcionesGraficaBase()
    });
    this.graficas.push(grafica);
  },

  opcionesGraficaPorcentaje() {
    const opciones = this.opcionesGraficaBase();
    opciones.scales.y.max = 100;
    opciones.scales.y.ticks.callback = valor => valor + "%";
    return opciones;
  },

  opcionesGraficaBase() {
    const oscuro = document.documentElement.dataset.tema === "oscuro";
    const texto = oscuro ? "#cbd5e1" : "#526070";
    const rejilla = oscuro ? "rgba(148,163,184,.15)" : "rgba(82,96,112,.13)";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {legend: {labels: {color: texto, boxWidth: 12, usePointStyle: true}}},
      scales: {
        x: {ticks: {color: texto, maxRotation: 0, autoSkip: true}, grid: {display: false}},
        y: {beginAtZero: true, ticks: {color: texto}, grid: {color: rejilla}}
      }
    };
  },

  marcarGraficaVacia(lienzo, mensaje) {
    const contenedor = lienzo.parentElement;
    if (contenedor) contenedor.innerHTML = this.sinDatos(mensaje);
  },

  destruirGraficas() {
    (this.graficas || []).forEach(grafica => {
      if (grafica && typeof grafica.destroy === "function") grafica.destroy();
    });
    this.graficas = [];
  },

  renderizarError(mensaje) {
    const panel = document.getElementById("rkPanelIndicadores");
    if (!panel) return;
    panel.innerHTML = `<div class="rk-estado rk-error"><i class="fa-solid fa-circle-exclamation"></i><strong>No fue posible cargar el tablero</strong><span>${this.escapar(mensaje)}</span><button type="button" id="rkReintentar" class="rk-btn rk-btn-principal">Reintentar</button></div>`;
    const boton = document.getElementById("rkReintentar");
    if (boton) boton.onclick = () => this.cargarIndicadores(true);
  },

  extraerData(respuesta) {
    if (!respuesta || respuesta.ok === false) return {};
    return respuesta.data || respuesta.ocupacion || respuesta;
  },

  rangoMesActual() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    const iso = fecha => [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, "0"), String(fecha.getDate()).padStart(2, "0")].join("-");
    return {fechaDesde: iso(inicio), fechaHasta: iso(fin), mes: iso(inicio).slice(0, 7)};
  },

  valorNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  },

  numero(valor) {
    return new Intl.NumberFormat("es-DO", {maximumFractionDigits: 2}).format(this.valorNumero(valor));
  },

  porcentaje(valor) {
    return new Intl.NumberFormat("es-DO", {minimumFractionDigits: 0, maximumFractionDigits: 1}).format(this.valorNumero(valor)) + "%";
  },

  moneda(valor) {
    return new Intl.NumberFormat("es-DO", {style: "currency", currency: "DOP", minimumFractionDigits: 2}).format(this.valorNumero(valor));
  },

  clave(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  },

  escapar(valor) {
    const nodo = document.createElement("div");
    nodo.textContent = String(valor === undefined || valor === null ? "" : valor);
    return nodo.innerHTML;
  }
};

window.addEventListener("bon:tema-cambiado", () => {
  if (window.ReportesKPIs && ReportesKPIs.pestanaActiva === "indicadores" && ReportesKPIs.datos.fechaCarga) {
    ReportesKPIs.renderizarIndicadores();
  }
});

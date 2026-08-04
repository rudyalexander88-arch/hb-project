/**
 * RECEPCIONMATERIALES.JS
 * Sistema Logístico PT - Helados BON
 */

window.RecepcionMateriales = {

  estado: {
    camaras: [],
    recepcionesAbiertas: [],
    recepcionActual: null,
    materialSeleccionado: null,
    resultadosMateriales: [],
    distribucion: {},
    camaraActiva: "",
    origenTraslado: "Carritos"
  },


  async cargar() {

    const contenedor =
      document.getElementById("contenidoPrincipal");

    if (!contenedor) {
      console.error("No existe #contenidoPrincipal.");
      return;
    }

    this.estado.recepcionActual = null;
    this.estado.materialSeleccionado = null;
    this.estado.resultadosMateriales = [];
    this.estado.distribucion = {};

    contenedor.innerHTML = `
      <section class="recepcion-materiales">

        <header class="recepcion-encabezado">

          <div>
            <span>Operación de almacén</span>
            <h2>Recepción de materiales</h2>
            <p>
              Registre una recepción productiva y distribuya
              el material entre las cámaras utilizadas.
            </p>
          </div>

          <button
            type="button"
            id="btnNuevaRecepcionMateriales"
            class="btn-recepcion principal"
          >
            <i class="fa-solid fa-plus"></i>
            Nueva recepción
          </button>

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

    document
      .getElementById("btnNuevaRecepcionMateriales")
      .onclick = () => this.mostrarInicioNuevaRecepcion();

    await this.cargarCatalogos();

  },


  async cargarCatalogos() {

    this.mostrarCarga(
      "Cargando recepciones",
      "Consultando cámaras y recepciones abiertas."
    );

    try {

      const sesion = this.obtenerSesion();

      const respuesta = await API.post({
        action: "obtenerCatalogosRecepcionMateriales",
        usuarioId:
          sesion.id ||
          sesion.ID_Usuario ||
          sesion.usuario ||
          "",
        limite: 50
      });

      if (!respuesta || respuesta.ok !== true) {
        throw new Error(
          respuesta && respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible cargar los catálogos."
        );
      }

      const datos = respuesta.data || {};

      this.estado.camaras =
        Array.isArray(datos.camaras)
          ? datos.camaras
          : [];

      this.estado.recepcionesAbiertas =
        Array.isArray(datos.recepcionesAbiertas)
          ? datos.recepcionesAbiertas
          : [];

      this.renderRecepcionesAbiertas();

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

    const panel =
      document.getElementById("panelRecepcionMateriales");

    if (!panel) {
      return;
    }

    const lista = this.estado.recepcionesAbiertas;

    panel.innerHTML = `
      <div class="recepcion-resumen-superior">
        <div>
          <span>Recepciones abiertas</span>
          <strong>${lista.length}</strong>
        </div>
        <p>
          Continúe una recepción existente o inicie una nueva.
        </p>
      </div>

      <div class="recepciones-abiertas-grid">
        ${
          lista.length
            ? lista.map(
                item => this.renderTarjetaRecepcion(item)
              ).join("")
            : `
              <article class="recepcion-vacia">
                <i class="fa-solid fa-inbox"></i>
                <h3>No hay recepciones abiertas</h3>
                <p>
                  Inicie una nueva recepción cuando Producción
                  entregue material.
                </p>
              </article>
            `
        }
      </div>
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

  },


  renderTarjetaRecepcion(item) {

    return `
      <article class="tarjeta-recepcion-abierta">

        <div class="tarjeta-recepcion-franja"></div>

        <header>
          <div>
            <span>Recepción</span>
            <strong>
              ${this.escapar(item.idRecepcion || "-")}
            </strong>
          </div>

          <span class="estado-recepcion-abierta">
            ${this.escapar(item.estado || "ABIERTA")}
          </span>
        </header>

        <div class="tarjeta-recepcion-datos">
          <div>
            <span>Auxiliar</span>
            <strong>
              ${this.escapar(item.usuarioNombre || "-")}
            </strong>
          </div>

          <div>
            <span>Turno</span>
            <strong>
              ${this.escapar(item.turno || "-")}
            </strong>
          </div>

          <div>
            <span>Tarimas</span>
            <strong>
              ${this.formatearNumero(item.totalTarimas)}
            </strong>
          </div>

          <div>
            <span>Posiciones</span>
            <strong>
              ${this.formatearNumero(
                item.totalPosicionesOcupadas
              )}
            </strong>
          </div>
        </div>

        <button
          type="button"
          class="btn-recepcion continuar"
          data-abrir-recepcion="${this.escapar(
            item.idRecepcion
          )}"
        >
          <i class="fa-solid fa-arrow-right"></i>
          Continuar
        </button>

      </article>
    `;

  },


  mostrarInicioNuevaRecepcion() {

    const panel =
      document.getElementById("panelRecepcionMateriales");

    if (!panel) {
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
            <span>Nueva recepción</span>
            <h3>¿Cómo recibiste el material?</h3>
          </div>

        </header>

        <div class="origen-recepcion-grid">

          <button
            type="button"
            class="opcion-origen-recepcion activo"
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

        <div class="recepcion-acciones-finales">
          <button
            type="button"
            id="btnIniciarRecepcion"
            class="btn-recepcion principal"
          >
            <i class="fa-solid fa-play"></i>
            Iniciar recepción
          </button>
        </div>

      </section>
    `;

    this.estado.origenTraslado = "Carritos";

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
      .onclick = () => this.renderRecepcionesAbiertas();

    document
      .getElementById("btnIniciarRecepcion")
      .onclick = () => this.iniciarNuevaRecepcion();

  },


  async iniciarNuevaRecepcion() {

    const sesion = this.obtenerSesion();

    this.mostrarCarga(
      "Iniciando recepción",
      "Registrando usuario, hora y turno."
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
        origenTraslado:
          this.estado.origenTraslado
      });

      if (!respuesta || respuesta.ok !== true) {
        throw new Error(
          respuesta && respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible iniciar la recepción."
        );
      }

      this.estado.recepcionActual =
        respuesta.data.recepcion;

      this.renderSeleccionMaterial();

      this.notificar(
        respuesta.mensaje ||
        "Recepción iniciada correctamente.",
        "exito"
      );

    } catch (error) {

      this.notificar(
        error.message ||
        "No fue posible iniciar la recepción.",
        "error"
      );

    } finally {

      this.ocultarCarga();

    }

  },


  async abrirRecepcion(idRecepcion) {

    this.mostrarCarga(
      "Abriendo recepción",
      "Consultando el detalle registrado."
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

      if (detalles.length) {

        const primero = detalles[0];

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

        this.estado.distribucion = {};

        detalles.forEach(item => {

          this.estado.distribucion[item.idCamara] = {
            idCamara: item.idCamara,
            tarimasCompletas:
              Number(item.tarimasCompletas || 0),
            parcialUnidades:
              Number(item.parcialUnidades || 0),
            parcialOcupaPosicion:
              item.parcialOcupaPosicion || "NO"
          };

        });

        this.estado.camaraActiva =
          detalles[0].idCamara ||
          (
            this.estado.camaras[0]
              ? this.estado.camaras[0].idCamara
              : ""
          );

        this.renderDistribucionCamaras();

      } else {

        this.estado.materialSeleccionado = null;
        this.estado.distribucion = {};
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
            ${this.escapar(r.horaInicio || "-")}
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
      document.getElementById("panelRecepcionMateriales");

    if (!panel) {
      return;
    }

    panel.innerHTML = `
      ${this.renderBarraRecepcion()}

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

    document
      .getElementById("btnSalirRecepcionActual")
      .onclick = () => this.cargarCatalogos();

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

          this.estado.materialSeleccionado = material;
          this.estado.distribucion = {};
          this.estado.camaraActiva =
            this.estado.camaras[0]
              ? this.estado.camaras[0].idCamara
              : "";

          this.renderDistribucionCamaras();

        };

      });

  },


  renderDistribucionCamaras() {

    const panel =
      document.getElementById("panelRecepcionMateriales");

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
          <button
            type="button"
            id="btnCambiarMaterialRecepcion"
            class="btn-recepcion secundario"
          >
            <i class="fa-solid fa-rotate-left"></i>
            Cambiar material
          </button>

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

        boton.onclick = () => {
          this.estado.camaraActiva =
            boton.dataset.camara;
          this.renderDistribucionCamaras();
        };

      });

    document
      .getElementById("btnSalirRecepcionActual")
      .onclick = () => this.cargarCatalogos();

    document
      .getElementById("btnCambiarMaterialRecepcion")
      .onclick = () => {
        this.estado.materialSeleccionado = null;
        this.estado.distribucion = {};
        this.renderSeleccionMaterial();
      };

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

    const fechaProduccion =
      await this.solicitarFechaProduccion();

    if (!fechaProduccion) {
      return;
    }

    const sesion = this.obtenerSesion();
    const recepcion = this.estado.recepcionActual;
    const material = this.estado.materialSeleccionado;

    this.mostrarCarga(
      "Guardando distribución",
      "Registrando el material en las cámaras seleccionadas."
    );

    try {

      const respuesta = await API.post({
        action:
          "guardarDistribucionMaterialRecepcion",
        idRecepcion:
          recepcion.idRecepcion,
        material:
          material.id || material.material,
        fechaProduccion:
          fechaProduccion,
        auxiliarId:
          sesion.id ||
          sesion.ID_Usuario ||
          sesion.usuario ||
          "",
        auxiliarNombre:
          sesion.nombre ||
          sesion.Nombre ||
          "Usuario",
        distribucion:
          distribucion
      });

      if (!respuesta || respuesta.ok !== true) {
        throw new Error(
          respuesta && respuesta.mensaje
            ? respuesta.mensaje
            : "No fue posible guardar la distribución."
        );
      }

      this.notificar(
        respuesta.mensaje ||
        "Material guardado correctamente.",
        "exito"
      );

      await this.abrirRecepcion(
        recepcion.idRecepcion
      );

    } catch (error) {

      this.notificar(
        error.message ||
        "No fue posible guardar la distribución.",
        "error"
      );

    } finally {

      this.ocultarCarga();

    }

  },


  solicitarFechaProduccion() {

    return new Promise(resolver => {

      const modal =
        document.getElementById("modalSistema");

      const titulo =
        document.getElementById("tituloModal");

      const contenido =
        document.getElementById("contenidoModal");

      if (!modal || !titulo || !contenido) {
        resolver("");
        return;
      }

      const hoy =
        new Date().toISOString().slice(0, 10);

      titulo.textContent = "Fecha de producción";

      contenido.innerHTML = `
        <div class="modal-fecha-produccion-recepcion">

          <p>
            Confirme la fecha indicada en la etiqueta.
          </p>

          <input
            type="date"
            id="inputFechaProduccionRecepcion"
            value="${hoy}"
          >

          <div class="recepcion-acciones-finales">

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
              Confirmar
            </button>

          </div>
        </div>
      `;

      modal.classList.remove("oculto");

      const cerrar = valor => {
        modal.classList.add("oculto");
        contenido.innerHTML = "";
        resolver(valor);
      };

      document
        .getElementById("btnCancelarFechaProduccion")
        .onclick = () => cerrar("");

      document
        .getElementById("btnConfirmarFechaProduccion")
        .onclick = () => {

          const valor =
            document.getElementById(
              "inputFechaProduccionRecepcion"
            ).value;

          if (!valor) {
            this.notificar(
              "Debe indicar la fecha de producción.",
              "advertencia"
            );
            return;
          }

          cerrar(valor);

        };

    });

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

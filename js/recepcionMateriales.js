/**
 * RECEPCIONMATERIALES.JS
 * Sistema Logístico PT - Helados BON
 */

window.RecepcionMateriales = {

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
    resumenAcumulado: null,
    tieneRegistrosPrevios: false
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
    this.estado.resumenAcumulado = null;
    this.estado.tieneRegistrosPrevios = false;

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
  .getElementById(
    "btnNuevaRecepcionMateriales"
  )
  .onclick =
    () => this.abrirAsistenteNueva();


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

    const tituloElemento =
      document.getElementById(
        "tituloAsistenteRecepcion"
      );

    if (tituloElemento) {
      tituloElemento.textContent =
        titulo || "Asistente de Recepción";
    }

    modal.classList.remove("oculto");
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
      modal.classList.add("oculto");
      modal.setAttribute("aria-hidden", "true");
    }

    document.body.classList.remove(
      "asistente-recepcion-abierto"
    );

    this.estado.recepcionActual = null;
    this.estado.materialSeleccionado = null;
    this.estado.resultadosMateriales = [];
    this.estado.distribucion = {};
    this.estado.camaraActiva = "";
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

    this.estado.recepcionActual = null;
    this.estado.materialSeleccionado = null;
    this.estado.resultadosMateriales = [];
    this.estado.distribucion = {};
    this.estado.camaraActiva = "";
    this.estado.resumenAcumulado = null;
    this.estado.tieneRegistrosPrevios = false;

    this.abrirAsistente(
      "Asistente de Recepción"
    );

    this.mostrarInicioNuevaRecepcion();

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

  async cargarCatalogos() {

    this.mostrarCarga(
      "Cargando recepciones",
      "Consultando procesos abiertos y actividad reciente."
    );

    try {

      const resultados =
        await Promise.all([

          API.post({
            action:
              "obtenerCatalogosRecepcionMateriales",
            limite:
              50
          }),

          API.post({
            action:
              "listarRecepcionesRecientes",
            limite:
              6
          })

        ]);


      const respuestaCatalogos =
        resultados[0];


      const respuestaRecientes =
        resultados[1];


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

        <div class="rejilla-inferior-recepciones">

          <section class="bloque-centro-recepciones">
            <header class="encabezado-bloque-recepciones compacto">
              <div>
                <span>Seguimiento</span>
                <h3>Actividad reciente</h3>
                <p>
                  Este espacio mostrará las recepciones cerradas
                  cuando conectemos la consulta histórica.
                </p>
              </div>

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
          </section>

          <section class="bloque-centro-recepciones">
            <header class="encabezado-bloque-recepciones compacto">
              <div>
                <span>Mi rendimiento</span>
                <h3>Desempeño del colaborador</h3>
                <p>
                  Los indicadores personales se conectarán con
                  las recepciones finalizadas del usuario.
                </p>
              </div>
            </header>

            <div class="metricas-colaborador-recepcion">
              <div>
                <span>Abiertas</span>
                <strong>${lista.length}</strong>
              </div>
              <div>
                <span>Tarimas</span>
                <strong>
                  ${this.formatearNumero(totalTarimas)}
                </strong>
              </div>
              <div>
                <span>Posiciones</span>
                <strong>
                  ${this.formatearNumero(totalPosiciones)}
                </strong>
              </div>
            </div>
          </section>

        </div>

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

    const historico =
      document.getElementById("btnHistoricoRecepciones");

    if (historico) {
      historico.onclick = () => {
        this.notificar(
          "La consulta histórica se conectará en la siguiente etapa.",
          "advertencia"
        );
      };
    }

  },


  renderActividadReciente() {

    const lista =
      Array.isArray(
        this.estado.recepcionesRecientes
      )
        ? this.estado.recepcionesRecientes
        : [];


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

      </article>
    `;

  },


  mostrarInicioNuevaRecepcion() {

    const panel =
      this.obtenerContenedorAsistente();

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
      .onclick = () => this.cerrarAsistente();

    document
      .getElementById("btnIniciarRecepcion")
      .onclick = () => this.iniciarNuevaRecepcion();

  },


  async iniciarNuevaRecepcion() {

    const sesion = this.obtenerSesion();
	
	const origenSeleccionado =
	this.estado.origenTraslado;

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
		
		/*
		 * La respuesta del backend reemplaza la recepción actual,
		 * pero la vía seleccionada pertenece al ingreso que todavía
		 * se está capturando.
		 */
		this.estado.origenTraslado =
		  origenSeleccionado;

      this.estado.resumenAcumulado = null;
      this.estado.tieneRegistrosPrevios = false;

      const titulo =
        document.getElementById(
          "tituloAsistenteRecepcion"
        );

      if (titulo) {
        titulo.textContent =
          "Recepción · " +
          this.estado.recepcionActual.idRecepcion;
      }

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
      this.estado.camaraActiva =
        this.estado.camaras[0]
          ? this.estado.camaras[0].idCamara
          : "";

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

        this.renderDistribucionCamaras();

      } else {

        this.estado.materialSeleccionado = null;
        this.estado.resumenAcumulado = null;

        const titulo =
          document.getElementById(
            "tituloAsistenteRecepcion"
          );

        if (titulo) {
          titulo.textContent =
            "Recepción · " +
            this.estado.recepcionActual.idRecepcion;
        }

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
      ${this.renderBarraRecepcion()}

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

    document
      .getElementById("btnSalirRecepcionActual")
      .onclick = () => this.cerrarAsistente();

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


mostrarOrigenNuevoIngreso() {

  const panel =
    this.obtenerContenedorAsistente();


  if (!panel) {
    return;
  }


  this.estado.origenTraslado =
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


        this.renderDistribucionCamaras();

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
          recepcion.idRecepcion,

        material:
          material.id ||
          material.material,

        fechaProduccion:
          fechaProduccion,
		  
		origenTraslado:
			origenIngreso,

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

      const submodal =
        document.createElement("div");

      submodal.id =
        "submodalProduccionFinalizadaRecepcion";

      submodal.className =
        "submodal-recepcion";

      submodal.innerHTML = `
        <div class="submodal-recepcion-contenido">

          <header class="submodal-recepcion-header">

            <div class="submodal-recepcion-icono">
              <i class="fa-solid fa-industry"></i>
            </div>

            <div>
              <span>Estado de producción</span>
              <h3>
                ¿Producción terminó este material?
              </h3>
            </div>

          </header>

          <div class="submodal-recepcion-cuerpo">
            <p>
              Si todavía continuarán fabricando, la orden
              permanecerá abierta para que otro auxiliar pueda
              registrar el próximo ingreso del mismo material.
            </p>
          </div>

          <footer
            class="submodal-recepcion-acciones dos-opciones"
          >

            <button
              type="button"
              id="btnProduccionContinua"
              class="btn-recepcion secundario"
            >
              <i class="fa-solid fa-clock-rotate-left"></i>
              No, continuará
            </button>

            <button
              type="button"
              id="btnProduccionFinalizada"
              class="btn-recepcion principal"
            >
              <i class="fa-solid fa-circle-check"></i>
              Sí, finalizar recepción
            </button>

          </footer>

        </div>
      `;

      modalAsistente.appendChild(submodal);

      const cerrar = valor => {
        submodal.remove();
        resolver(valor);
      };

      document
        .getElementById("btnProduccionContinua")
        .onclick = () => cerrar(false);

      document
        .getElementById("btnProduccionFinalizada")
        .onclick = () => cerrar(true);

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

    modalAsistente.classList.add(
      "oculto"
    );

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

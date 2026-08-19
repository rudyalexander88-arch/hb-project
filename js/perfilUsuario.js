/**
 * PERFILUSUARIO.JS
 * Autogestión del perfil del colaborador.
 */

window.PerfilUsuario = {
  perfil:null,

  inicializar() {
    const botones = document.querySelectorAll("[data-perfil-usuario]");

    botones.forEach(boton => {
      if (boton.dataset.perfilInicializado === "true") return;
      boton.dataset.perfilInicializado = "true";
      boton.addEventListener("click", () => this.abrir());
    });

    const cerrarModal = document.getElementById("cerrarModal");
    if (cerrarModal && cerrarModal.dataset.limpiezaPerfil !== "true") {
      cerrarModal.dataset.limpiezaPerfil = "true";
      cerrarModal.addEventListener("click", () => this.limpiarClaseModal());
    }
  },

  async post(datos, titulo, mensaje) {
    if (!window.API || typeof API.post !== "function") {
      throw new Error("API no está disponible.");
    }

    if (!window.CargadorSistema) {
      throw new Error("CargadorSistema no está disponible.");
    }

    CargadorSistema.mostrar(titulo, mensaje);

    try {
      const resultado = await API.post(datos);
      if (!resultado || !resultado.ok) {
        throw new Error(
          resultado && resultado.mensaje
            ? resultado.mensaje
            : "No fue posible completar la operación."
        );
      }
      return resultado;
    } finally {
      CargadorSistema.ocultar();
    }
  },

  async abrir() {
    this.cerrarMenuMovil();

    try {
      const respuesta = await this.post(
        {action:"obtenerPerfilUsuario"},
        "Cargando su perfil",
        "Estamos consultando sus datos personales."
      );

      this.perfil = respuesta.data && respuesta.data.perfil
        ? respuesta.data.perfil
        : {};

      this.mostrarFormulario();
    } catch (error) {
      this.notificar(error.message, "error");
    }
  },

  mostrarFormulario() {
    if (!window.Sistema || typeof Sistema.abrirModal !== "function") {
      this.notificar("El modal del sistema no está disponible.", "error");
      return;
    }

    const p = this.perfil || {};
    const contenedor = document.createElement("div");
    contenedor.className = "perfil-usuario";
    contenedor.innerHTML = `
      <div class="perfil-usuario-intro">
        <div class="perfil-usuario-avatar">
          <i class="fa-solid fa-user"></i>
        </div>
        <div>
          <span>CUENTA DEL COLABORADOR</span>
          <h3>${this.escapar(p.nombre || "Usuario")}</h3>
          <p>Actualice sus datos de contacto o cambie su contraseña.</p>
        </div>
      </div>

      <form id="formPerfilUsuario" autocomplete="off">
        <section class="perfil-seccion">
          <div class="perfil-seccion-titulo">
            <i class="fa-solid fa-id-badge"></i>
            <div>
              <h4>Información laboral</h4>
              <p>Estos datos son administrados por el sistema.</p>
            </div>
          </div>

          <div class="perfil-grid perfil-grid-tres">
            ${this.campoLectura("ID de empleado", p.idEmpleado)}
            ${this.campoLectura("Nombre", p.nombre)}
            ${this.campoLectura("Rol", p.rol)}
          </div>
        </section>

        <section class="perfil-seccion">
          <div class="perfil-seccion-titulo perfil-seccion-titulo-con-accion">
            <i class="fa-solid fa-address-card"></i>
            <div>
              <h4>Datos personales</h4>
              <p>Complete la información utilizada para contacto interno.</p>
            </div>
            <button type="button" class="perfil-btn-editar" id="btnEditarDatosPersonales">
              <i class="fa-solid fa-pen"></i>
              Editar
            </button>
          </div>

          <div class="perfil-grid perfil-grid-dos">
            <label class="perfil-campo">
              <span>Cédula</span>
              <input id="perfilCedula" data-campo-personal inputmode="numeric" maxlength="13"
                placeholder="000-0000000-0" value="${this.escapar(this.formatearCedula(p.cedula))}">
            </label>

            <label class="perfil-campo">
              <span>Número de teléfono</span>
              <input id="perfilTelefono" data-campo-personal inputmode="tel" maxlength="14"
                placeholder="(809) 000-0000" value="${this.escapar(this.formatearTelefono(p.numeroTelefono))}">
            </label>

            <label class="perfil-campo perfil-campo-ancho">
              <span>Correo electrónico</span>
              <input id="perfilCorreo" data-campo-personal type="email" maxlength="120"
                placeholder="nombre@empresa.com" value="${this.escapar(p.correo || "")}">
            </label>

            <label class="perfil-campo">
              <span>¿Tiene hijos?</span>
              <select id="perfilTieneHijos" data-campo-personal>
                <option value="" ${p.tieneHijos ? "" : "selected"}>Seleccione...</option>
                <option value="NO" ${p.tieneHijos === "NO" ? "selected" : ""}>No</option>
                <option value="SI" ${p.tieneHijos === "SI" ? "selected" : ""}>Sí</option>
              </select>
            </label>

            <label class="perfil-campo">
              <span>Cantidad de hijos</span>
              <input id="perfilCantidadHijos" data-campo-personal type="number" min="0" max="30"
                value="${p.tieneHijos ? Number(p.cantidadHijos || 0) : ""}">
            </label>
          </div>
        </section>

        <section class="perfil-seccion perfil-seccion-seguridad">
          <div class="perfil-seccion-titulo">
            <i class="fa-solid fa-lock"></i>
            <div>
              <h4>Cambiar contraseña</h4>
              <p>Déjelo vacío si solo desea actualizar sus datos personales.</p>
            </div>
          </div>

          <div class="perfil-grid perfil-grid-tres">
            ${this.campoPassword("perfilPasswordActual", "Contraseña actual")}
            ${this.campoPassword("perfilPasswordNueva", "Nueva contraseña")}
            ${this.campoPassword("perfilPasswordConfirmar", "Confirmar contraseña")}
          </div>

          <div class="perfil-alerta-seguridad">
            <i class="fa-solid fa-shield-halved"></i>
            Al cambiar la contraseña, su sesión se cerrará inmediatamente.
          </div>
        </section>

        <div class="perfil-acciones">
          <button type="button" class="perfil-btn perfil-btn-secundario" id="btnCancelarPerfil">
            Cancelar
          </button>
          <button type="submit" class="perfil-btn perfil-btn-guardar">
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar cambios
          </button>
        </div>
      </form>
    `;

    Sistema.abrirModal("Mi perfil", contenedor, {clase:"modal-contenido-perfil"});
    this.conectarFormulario();
  },

  conectarFormulario() {
    const form = document.getElementById("formPerfilUsuario");
    const tieneHijos = document.getElementById("perfilTieneHijos");
    const cantidad = document.getElementById("perfilCantidadHijos");
    const cedula = document.getElementById("perfilCedula");
    const telefono = document.getElementById("perfilTelefono");
    const cancelar = document.getElementById("btnCancelarPerfil");
    const editar = document.getElementById("btnEditarDatosPersonales");

    [
      "perfilPasswordActual",
      "perfilPasswordNueva",
      "perfilPasswordConfirmar"
    ].forEach(id => {
      const campo = document.getElementById(id);
      if (!campo) return;

      campo.type = "password";

      const boton = campo.parentElement
        ? campo.parentElement.querySelector("button")
        : null;
      const icono = boton ? boton.querySelector("i") : null;

      if (icono) icono.className = "fa-solid fa-eye";
      if (boton) boton.setAttribute("aria-label", "Mostrar contraseña");
    });

    const valoresExistentes = {
      perfilCedula:Boolean(this.perfil && this.perfil.cedula),
      perfilTelefono:Boolean(this.perfil && this.perfil.numeroTelefono),
      perfilCorreo:Boolean(this.perfil && this.perfil.correo),
      perfilTieneHijos:Boolean(this.perfil && this.perfil.tieneHijos),
      perfilCantidadHijos:Boolean(
        this.perfil &&
        this.perfil.tieneHijos === "SI" &&
        Number(this.perfil.cantidadHijos || 0) > 0
      )
    };

    Object.keys(valoresExistentes).forEach(id => {
      const campo = document.getElementById(id);
      if (campo && valoresExistentes[id]) {
        campo.disabled = true;
        campo.dataset.bloqueadoPorDatos = "true";
      }
    });

    const hayDatosExistentes = Object.values(valoresExistentes).some(Boolean);
    editar.hidden = !hayDatosExistentes;

    const actualizarHijos = () => {
      const habilitado = tieneHijos.value === "SI";
      const bloqueadoPorDatos = cantidad.dataset.bloqueadoPorDatos === "true";
      cantidad.disabled = !habilitado || bloqueadoPorDatos;
      if (tieneHijos.value === "NO") cantidad.value = "0";
      if (!tieneHijos.value) cantidad.value = "";
      if (habilitado && Number(cantidad.value) < 1) cantidad.value = "1";
    };

    tieneHijos.addEventListener("change", actualizarHijos);
    cedula.addEventListener("input", () => {
      cedula.value = this.formatearCedula(this.soloDigitos(cedula.value));
    });
    telefono.addEventListener("input", () => {
      telefono.value = this.formatearTelefono(this.soloDigitos(telefono.value));
    });
    editar.addEventListener("click", () => {
      document.querySelectorAll("[data-campo-personal]").forEach(campo => {
        campo.dataset.bloqueadoPorDatos = "false";
        campo.disabled = false;
      });
      editar.hidden = true;
      actualizarHijos();
      const primerCampo = document.getElementById("perfilCedula");
      if (primerCampo) primerCampo.focus();
    });
    cancelar.addEventListener("click", () => this.cerrarModalPerfil());
    form.addEventListener("submit", event => {
      event.preventDefault();
      this.guardar();
    });

    actualizarHijos();
  },

  async guardar() {
    const datos = this.leerFormulario();
    const error = this.validar(datos);
    if (error) {
      this.notificar(error, "advertencia");
      return;
    }

    try {
      const respuesta = await this.post(
        Object.assign({action:"actualizarPerfilUsuario"}, datos),
        "Guardando su perfil",
        "Estamos actualizando sus datos de forma segura."
      );

      const resultado = respuesta.data || {};

      if (resultado.cerrarSesion) {
        CargadorSistema.mostrar(
          "Contraseña actualizada",
          "Por seguridad, iniciaremos una nueva sesión."
        );
        API.limpiarSesion();
        window.location.href = "../index.html";
        return;
      }

      this.perfil = resultado.perfil || this.perfil;
      this.cerrarModalPerfil();
      this.notificar(respuesta.mensaje || "Perfil actualizado correctamente.", "exito");
    } catch (error) {
      this.notificar(error.message, "error");
    }
  },

  leerFormulario() {
    return {
      cedula:this.soloDigitos(document.getElementById("perfilCedula").value),
      numeroTelefono:this.soloDigitos(document.getElementById("perfilTelefono").value),
      correo:document.getElementById("perfilCorreo").value.trim(),
      tieneHijos:document.getElementById("perfilTieneHijos").value,
      cantidadHijos:Number(document.getElementById("perfilCantidadHijos").value || 0),
      passwordActual:document.getElementById("perfilPasswordActual").value,
      passwordNueva:document.getElementById("perfilPasswordNueva").value,
      confirmarPassword:document.getElementById("perfilPasswordConfirmar").value
    };
  },

  validar(datos) {
    if (datos.cedula && datos.cedula.length !== 11) {
      return "La cédula debe contener 11 dígitos.";
    }
    if (datos.numeroTelefono && datos.numeroTelefono.length !== 10) {
      return "El teléfono debe contener 10 dígitos.";
    }
    if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
      return "Ingrese un correo electrónico válido.";
    }
    if (datos.tieneHijos === "SI" && datos.cantidadHijos < 1) {
      return "Indique la cantidad de hijos.";
    }

    const cambiaPassword = Boolean(
      datos.passwordActual || datos.passwordNueva || datos.confirmarPassword
    );
    if (cambiaPassword && !datos.passwordActual) return "Ingrese su contraseña actual.";
    if (cambiaPassword && datos.passwordNueva.length < 6) {
      return "La nueva contraseña debe tener al menos 6 caracteres.";
    }
    if (cambiaPassword && datos.passwordNueva !== datos.confirmarPassword) {
      return "La confirmación de la contraseña no coincide.";
    }
    return "";
  },

  campoLectura(etiqueta, valor) {
    return `
      <label class="perfil-campo perfil-campo-bloqueado">
        <span>${this.escapar(etiqueta)}</span>
        <input value="${this.escapar(valor || "")}" readonly tabindex="-1">
      </label>`;
  },

  campoPassword(id, etiqueta) {
    return `
      <label class="perfil-campo perfil-campo-password">
        <span>${this.escapar(etiqueta)}</span>
        <div class="perfil-password-control">
          <input id="${id}" type="password" autocomplete="new-password">
          <button type="button" aria-label="Mostrar contraseña"
            onclick="PerfilUsuario.alternarPassword('${id}', this)">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </label>`;
  },

  alternarPassword(id, boton) {
    const campo = document.getElementById(id);
    if (!campo) return;
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    const icono = boton.querySelector("i");
    if (icono) icono.className = mostrar ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    boton.setAttribute(
      "aria-label",
      mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
    );
  },

  cerrarModalPerfil() {
    if (window.Sistema && typeof Sistema.cerrarModal === "function") {
      Sistema.cerrarModal();
    }
    this.limpiarClaseModal();
  },

  limpiarClaseModal() {
    const contenido = document.querySelector("#modalSistema .modal-contenido");
    if (contenido) contenido.classList.remove("modal-contenido-perfil");
  },

  cerrarMenuMovil() {
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
  },

  notificar(mensaje, tipo) {
    if (window.Sistema && typeof Sistema.notificar === "function") {
      Sistema.notificar(mensaje, tipo);
    } else {
      console.error(mensaje);
    }
  },

  soloDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  },

  formatearCedula(valor) {
    const d = this.soloDigitos(valor).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 10) return `${d.slice(0,3)}-${d.slice(3)}`;
    return `${d.slice(0,3)}-${d.slice(3,10)}-${d.slice(10)}`;
  },

  formatearTelefono(valor) {
    const d = this.soloDigitos(valor).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  },

  escapar(valor) {
    if (window.Sistema && typeof Sistema.escaparHTML === "function") {
      return Sistema.escaparHTML(String(valor == null ? "" : valor));
    }
    return String(valor == null ? "" : valor)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.PerfilUsuario.inicializar();
});

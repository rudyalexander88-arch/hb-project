/**
 * CACHEOPERATIVO.JS
 * Caché local reutilizable para listas históricas del Sistema Logístico PT.
 *
 * - Usa IndexedDB para evitar los límites de localStorage.
 * - Separa los datos por usuario y rol.
 * - Admite corte diario y validación por versión del módulo.
 * - Nunca sustituye las validaciones ni los permisos del backend.
 */
(function iniciarCacheOperativo(global) {
  "use strict";

  const NOMBRE_BD = "BON_Cache_Operativo";
  const ALMACEN = "entradas";
  const VERSION_BD = 1;
  const VERSION_ESQUEMA = "1";
  const PREFIJO_RESPALDO = "bon_cache_operativo_";
  const HORA_CORTE = 18;
  const MINUTO_CORTE = 15;
  const RETENCION_DIAS = 62;

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9_-]+/g, "_");
  }

  function obtenerSesion() {
    if (global.Sistema && typeof global.Sistema.obtenerSesion === "function") {
      return global.Sistema.obtenerSesion() || {};
    }
    try {
      return JSON.parse(
        global.localStorage.getItem("sesion") ||
        global.sessionStorage.getItem("sesion") ||
        "{}"
      ) || {};
    } catch (error) {
      return {};
    }
  }

  function contextoSesion() {
    const sesion = obtenerSesion();
    const usuario = normalizar(
      sesion.idEmpleado || sesion.IDEmpleado || sesion.usuario ||
      sesion.Usuario || sesion.nombre || sesion.Nombre || "USUARIO"
    );
    const rol = normalizar(sesion.rol || sesion.Rol || "SIN_ROL");
    return {usuario, rol};
  }

  function fechaISO(fecha) {
    return [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, "0"),
      String(fecha.getDate()).padStart(2, "0")
    ].join("-");
  }

  function corteVigente(fecha = new Date()) {
    const referencia = new Date(fecha);
    const corteHoy = new Date(
      referencia.getFullYear(),
      referencia.getMonth(),
      referencia.getDate(),
      HORA_CORTE,
      MINUTO_CORTE,
      0,
      0
    );
    if (referencia < corteHoy) referencia.setDate(referencia.getDate() - 1);
    return fechaISO(referencia);
  }

  function construirId(clave) {
    const contexto = contextoSesion();
    return [contexto.usuario, contexto.rol, normalizar(clave)].join("::");
  }

  function abrirBaseDatos() {
    return new Promise((resolver, rechazar) => {
      if (!global.indexedDB) {
        rechazar(new Error("IndexedDB no está disponible."));
        return;
      }
      const solicitud = global.indexedDB.open(NOMBRE_BD, VERSION_BD);
      solicitud.onupgradeneeded = evento => {
        const baseDatos = evento.target.result;
        if (!baseDatos.objectStoreNames.contains(ALMACEN)) {
          const almacen = baseDatos.createObjectStore(ALMACEN, {keyPath: "id"});
          almacen.createIndex("guardadoEn", "guardadoEn", {unique: false});
        }
      };
      solicitud.onsuccess = () => resolver(solicitud.result);
      solicitud.onerror = () => rechazar(solicitud.error || new Error("No fue posible abrir IndexedDB."));
    });
  }

  async function operar(modo, operacion) {
    const baseDatos = await abrirBaseDatos();
    try {
      return await new Promise((resolver, rechazar) => {
        const transaccion = baseDatos.transaction(ALMACEN, modo);
        const almacen = transaccion.objectStore(ALMACEN);
        let resultado;
        transaccion.oncomplete = () => resolver(resultado);
        transaccion.onerror = () => rechazar(transaccion.error || new Error("Falló la operación de caché."));
        transaccion.onabort = () => rechazar(transaccion.error || new Error("La operación de caché fue cancelada."));
        resultado = operacion(almacen, valor => { resultado = valor; });
      });
    } finally {
      baseDatos.close();
    }
  }

  async function leerIndexedDB(id) {
    return operar("readonly", (almacen, asignar) => {
      const solicitud = almacen.get(id);
      solicitud.onsuccess = () => asignar(solicitud.result || null);
      return null;
    });
  }

  async function escribirIndexedDB(registro) {
    return operar("readwrite", almacen => almacen.put(registro));
  }

  async function eliminarIndexedDB(id) {
    return operar("readwrite", almacen => almacen.delete(id));
  }

  function claveRespaldo(id) {
    return PREFIJO_RESPALDO + id;
  }

  function leerRespaldo(id) {
    try {
      const contenido = global.localStorage.getItem(claveRespaldo(id));
      return contenido ? JSON.parse(contenido) : null;
    } catch (error) {
      return null;
    }
  }

  function escribirRespaldo(registro) {
    try {
      global.localStorage.setItem(claveRespaldo(registro.id), JSON.stringify(registro));
    } catch (error) {
      console.warn("No fue posible guardar el respaldo del caché operativo:", error);
    }
  }

  function eliminarRespaldo(id) {
    try {
      global.localStorage.removeItem(claveRespaldo(id));
    } catch (error) {
      console.warn("No fue posible eliminar el respaldo del caché operativo:", error);
    }
  }

  async function leerRegistro(id) {
    try {
      return await leerIndexedDB(id);
    } catch (error) {
      return leerRespaldo(id);
    }
  }

  async function guardarRegistro(registro) {
    try {
      await escribirIndexedDB(registro);
    } catch (error) {
      escribirRespaldo(registro);
    }
  }

  async function borrarRegistro(id) {
    try {
      await eliminarIndexedDB(id);
    } catch (error) {
      eliminarRespaldo(id);
    }
  }

  global.CacheOperativo = {
    version: VERSION_ESQUEMA,
    horaCorte: HORA_CORTE,
    minutoCorte: MINUTO_CORTE,

    corteVigente,

    async obtener(clave, opciones = {}) {
      const id = construirId(clave);
      const registro = await leerRegistro(id);
      if (!registro || registro.version !== VERSION_ESQUEMA) return null;
      const vigente = registro.corteId === corteVigente();
      if (!vigente && opciones.permitirVencido !== true) return null;
      return {
        datos: registro.datos,
        meta: registro.meta || {},
        vigente,
        corteId: registro.corteId,
        guardadoEn: registro.guardadoEn
      };
    },

    async guardar(clave, datos, opciones = {}) {
      const contexto = contextoSesion();
      const registro = {
        id: construirId(clave),
        clave: normalizar(clave),
        usuario: contexto.usuario,
        rol: contexto.rol,
        version: VERSION_ESQUEMA,
        corteId: corteVigente(),
        guardadoEn: Date.now(),
        datos,
        meta: opciones.meta && typeof opciones.meta === "object" ? opciones.meta : {}
      };
      await guardarRegistro(registro);
      this.limpiarAntiguos().catch(() => {});
      return registro;
    },

    async eliminar(clave) {
      await borrarRegistro(construirId(clave));
    },

    async invalidarPrefijo(prefijo) {
      const contexto = contextoSesion();
      const prefijoNormalizado = normalizar(prefijo);
      try {
        const baseDatos = await abrirBaseDatos();
        await new Promise((resolver, rechazar) => {
          const transaccion = baseDatos.transaction(ALMACEN, "readwrite");
          const almacen = transaccion.objectStore(ALMACEN);
          const solicitud = almacen.openCursor();
          solicitud.onsuccess = evento => {
            const cursor = evento.target.result;
            if (!cursor) return;
            const valor = cursor.value || {};
            if (
              valor.usuario === contexto.usuario &&
              valor.rol === contexto.rol &&
              String(valor.clave || "").startsWith(prefijoNormalizado)
            ) cursor.delete();
            cursor.continue();
          };
          transaccion.oncomplete = resolver;
          transaccion.onerror = () => rechazar(transaccion.error);
        });
        baseDatos.close();
      } catch (error) {
        Object.keys(global.localStorage || {}).forEach(claveLocal => {
          if (claveLocal.startsWith(PREFIJO_RESPALDO + contexto.usuario + "::" + contexto.rol + "::" + prefijoNormalizado)) {
            global.localStorage.removeItem(claveLocal);
          }
        });
      }
    },

    async limpiarAntiguos() {
      const limite = Date.now() - RETENCION_DIAS * 24 * 60 * 60 * 1000;
      try {
        const baseDatos = await abrirBaseDatos();
        await new Promise((resolver, rechazar) => {
          const transaccion = baseDatos.transaction(ALMACEN, "readwrite");
          const almacen = transaccion.objectStore(ALMACEN);
          const solicitud = almacen.openCursor();
          solicitud.onsuccess = evento => {
            const cursor = evento.target.result;
            if (!cursor) return;
            if (Number(cursor.value && cursor.value.guardadoEn || 0) < limite) cursor.delete();
            cursor.continue();
          };
          transaccion.oncomplete = resolver;
          transaccion.onerror = () => rechazar(transaccion.error);
        });
        baseDatos.close();
      } catch (error) {
        return false;
      }
      return true;
    }
  };
})(window);

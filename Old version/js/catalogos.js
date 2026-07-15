// ==========================================
// CATÁLOGOS DEL SISTEMA
// ==========================================

const Catalogos = {

    cache: {
        choferes: [],
		calidad: [],
        unidades: [],
        centros: [],
        precintos: [],
        materiales: [],
        configuracion: null
    },

    async cargarChoferes() {

        if (this.cache.choferes.length > 0) return this.cache.choferes;

        const respuesta = await API.post({ action: "listarChoferes" });

        if (respuesta.ok) this.cache.choferes = respuesta.data;

        return this.cache.choferes;

    },
	
	async cargarCalidad() {

    if (
        Catalogos.cache.calidad &&
        Catalogos.cache.calidad.length > 0
    ) {
        return Catalogos.cache.calidad;
    }

    const respuesta = await API.post({
        action: "listarPersonalCalidad"
    });

    if (!respuesta.ok) {
        throw new Error(
            respuesta.mensaje ||
            "No fue posible cargar el personal de Calidad."
        );
    }

    Catalogos.cache.calidad =
        Array.isArray(respuesta.data)
            ? respuesta.data
            : [];

    return Catalogos.cache.calidad;

},

    async cargarUnidades() {

        if (this.cache.unidades.length > 0) return this.cache.unidades;

        const respuesta = await API.post({ action: "listarUnidadesCarga" });

        if (respuesta.ok) this.cache.unidades = respuesta.data;

        return this.cache.unidades;

    },

    async cargarCentros() {

        if (this.cache.centros.length > 0) return this.cache.centros;

        const respuesta = await API.post({ action: "listarCentros" });

        if (respuesta.ok) this.cache.centros = respuesta.data;

        return this.cache.centros;

    },

    async cargarPrecintos() {

        if (this.cache.precintos.length > 0) return this.cache.precintos;

        const respuesta = await API.post({ action: "listarPrecintosDisponibles" });

        if (respuesta.ok) this.cache.precintos = respuesta.data;

        return this.cache.precintos;

    },

    async cargarMateriales() {

        if (this.cache.materiales.length > 0) return this.cache.materiales;

        const respuesta = await API.post({ action: "listarMateriales" });

        if (respuesta.ok) this.cache.materiales = respuesta.data;

        return this.cache.materiales;

    },

    async cargarConfiguracion() {

        if (this.cache.configuracion) return this.cache.configuracion;

        const respuesta = await API.post({ action: "listarConfiguracion" });

        if (respuesta.ok) this.cache.configuracion = respuesta.data;

        return this.cache.configuracion;

    }

};
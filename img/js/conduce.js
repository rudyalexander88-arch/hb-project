// ==========================================
// CONDUCE EN MEMORIA
// Sistema Logístico PT
// ==========================================

const Conduce = {

    encabezado: {
        supervisor: "",
        chofer: "",
        unidad: "",
        cantidadDestinos: 1,
        destino1: "",
        destino2: "",
        precinto1: "",
        precinto2: "",
		asistenteCalidad: "",
		temperatura: "",
		documentoSAP1: "",
		documentoSAP2: "",
		documentoSAP3: "",
		documentoSAP4: "",
		revisionUrl: ""
    },

    contadorLineas: 0,

    detalle: [],

    limpiar() {
        this.encabezado = {
            supervisor: "",
            chofer: "",
            unidad: "",
            cantidadDestinos: 1,
            destino1: "",
            destino2: "",
            precinto1: "",
            precinto2: "",
			asistenteCalidad: "",
			temperatura: "",
			documentoSAP1: "",
			documentoSAP2: "",
			documentoSAP3: "",
			documentoSAP4: "",
			revisionUrl: ""
        };

        this.contadorLineas = 0;
        this.detalle = [];
    }

};
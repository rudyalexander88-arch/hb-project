// GESTIONEPP.JS - Sistema Logístico PT - Helados BON
window.GestionEPP={
 datos:null,solicitudes:[],pagina:1,limite:12,hayMas:false,camara:null,evidencia:null,cargando:false,
 async abrir(){
  if(this.cargando)return;this.cargando=true;CargadorSistema.mostrar("Cargando EPP","Consultando solicitudes e inventario.");
  try{const r=await API.post({action:"obtenerInicioGestionEPP"});if(!r?.ok)throw new Error(r?.mensaje||"No fue posible abrir el módulo.");
   this.datos=r.data||{};this.pagina=1;this.solicitudes=[];this.evidencia=null;this.detenerCamara();
   Sistema.abrirModal("Gestión de EPP",this.plantilla(),{clase:"modal-gestion-epp"});this.eventosBase();this.cargando=false;await this.cargarSolicitudes(true);
  }catch(e){Sistema.error(e.message||"No fue posible abrir EPP.");}finally{CargadorSistema.ocultar();this.cargando=false;}
 },
 plantilla(){const p=this.datos.permisos||{};return`<section class="epp-modulo"><nav class="epp-tabs">
  <button class="activo" data-epp-tab="SOLICITUDES"><i class="fa-solid fa-clipboard-list"></i>Solicitudes</button>
  ${p.inventario?`<button data-epp-tab="INVENTARIO"><i class="fa-solid fa-boxes-stacked"></i>Inventario</button>`:""}
  ${p.gestionar?`<button data-epp-tab="ENTRADAS"><i class="fa-solid fa-box-open"></i>Entradas</button>`:""}
  ${p.ajustar?`<button data-epp-tab="AJUSTES"><i class="fa-solid fa-sliders"></i>Ajustes</button>`:""}
  ${p.compras?`<button data-epp-tab="COMPRAS"><i class="fa-solid fa-cart-shopping"></i>Compras</button>`:""}
  ${p.reportes?`<button data-epp-tab="REPORTES"><i class="fa-solid fa-chart-column"></i>Reportes</button>`:""}</nav>
  <div id="eppContenido" class="epp-contenido"></div></section>`;},
 eventosBase(){document.querySelectorAll("[data-epp-tab]").forEach(b=>b.onclick=()=>this.cambiarTab(b.dataset.eppTab));
  document.getElementById("cerrarModal")?.addEventListener("click",()=>this.detenerCamara(),{once:true});},
 async cambiarTab(t){this.detenerCamara();this.evidencia=null;document.querySelectorAll("[data-epp-tab]").forEach(b=>b.classList.toggle("activo",b.dataset.eppTab===t));
  if(t==="SOLICITUDES")this.renderSolicitudes();if(t==="INVENTARIO")this.renderInventario();if(t==="ENTRADAS")this.renderMovimiento("ENTRADA");
  if(t==="AJUSTES"&&this.datos.permisos?.ajustar)this.renderMovimiento("AJUSTE");if(t==="COMPRAS")this.renderCompras();if(t==="REPORTES")await this.cargarReporte("MES");},
 async cargarSolicitudes(reiniciar){if(this.cargando)return;if(reiniciar){this.pagina=1;this.solicitudes=[];}this.cargando=true;
  CargadorSistema.mostrar("Cargando solicitudes","Organizando los registros de EPP.");
  try{const r=await API.post({action:"listarSolicitudesEPP",pagina:this.pagina,limite:this.limite,
   estado:document.getElementById("eppFiltroEstado")?.value||"TODAS",buscar:document.getElementById("eppBuscar")?.value||""});
   if(!r?.ok)throw new Error(r?.mensaje||"No fue posible consultar solicitudes.");const d=r.data||{};
   this.solicitudes=reiniciar?(d.registros||[]):this.solicitudes.concat(d.registros||[]);this.hayMas=d.hayMas===true;this.renderSolicitudes();
  }catch(e){Sistema.error(e.message);}finally{CargadorSistema.ocultar();this.cargando=false;}
 },
 renderSolicitudes(){const c=document.getElementById("eppContenido");if(!c)return;const p=this.datos.permisos||{};
  c.innerHTML=`<header class="epp-toolbar"><div><span>${p.gestionar?"GESTIÓN OPERATIVA":"SEGURIDAD PERSONAL"}</span><h3>${p.gestionar?"Solicitudes de colaboradores":"Mis solicitudes"}</h3></div>
  <div class="epp-toolbar-acciones"><button type="button" id="eppAlternarFiltros" class="epp-alternar-filtros" aria-expanded="false" aria-controls="eppPanelFiltros"><span><i class="fa-solid fa-sliders"></i>Filtros</span><i class="fa-solid fa-chevron-down"></i></button>
  <div id="eppPanelFiltros" class="epp-panel-filtros"><input id="eppBuscar" type="search" placeholder="Buscar..."><select id="eppFiltroEstado">
  <option value="TODAS">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="PENDIENTE_AUTORIZACION">Por autorizar</option>
  <option value="COMPROMETIDA">Con compromiso</option><option value="ENTREGADA">Entregadas</option><option value="RECHAZADA">Rechazadas</option></select></div>
  ${p.solicitar?`<button id="eppNuevaSolicitud" class="epp-btn primario"><i class="fa-solid fa-plus"></i>Nueva solicitud</button>`:""}</div></header>
  <div class="epp-listado">${this.solicitudes.length?this.solicitudes.map(r=>this.tarjetaSolicitud(r)).join(""):`<div class="epp-vacio"><i class="fa-solid fa-shield-halved"></i><strong>No hay solicitudes</strong></div>`}</div>
  ${this.hayMas?`<div class="epp-cargar-mas"><button id="eppCargarMas" class="epp-btn secundario"><i class="fa-solid fa-plus"></i>Cargar ${this.limite} más</button></div>`:""}`;
  this.eventosSolicitudes();
 },
 tarjetaSolicitud(r){const s=r.semaforo||{},e=this.clave(r.Estado_Solicitud),p=this.datos.permisos||{};
  const activa=["PENDIENTE","COMPROMETIDA","PENDIENTE AUTORIZACION","AUTORIZADA"].includes(e);
  const entregar=p.gestionar&&["PENDIENTE","COMPROMETIDA","AUTORIZADA"].includes(e)&&!(this.clave(r.Requiere_Autorizacion)==="SI"&&e!=="AUTORIZADA");
  return`<article class="epp-solicitud semaforo-${String(s.nivel||"CERRADA").toLowerCase()}"><div class="epp-solicitud-icono">${this.icono(r.Tipo_EPP)}</div>
  <div class="epp-solicitud-info"><div class="epp-solicitud-superior"><div><small>${this.esc(r.ID_Solicitud)}</small><h4>${this.esc(r.Tipo_EPP)} ${r.Talla&&r.Talla!=="UNICA"?"· "+this.esc(r.Talla):""}</h4></div>
  <span class="epp-estado">${this.estado(r.Estado_Solicitud)}</span></div>${p.gestionar?`<strong>${this.esc(r.Colaborador_Nombre)}</strong>`:""}
  <div class="epp-meta"><span>${this.fecha(r.Fecha_Solicitud)}</span><span>${r.Cantidad_Solicitada} ${this.plural(r.Unidad_Medida,r.Cantidad_Solicitada)}</span>
  ${activa?`<span>${s.diasAtraso?s.diasAtraso+" días de atraso":s.diasPendientes+" días restantes"}</span>`:""}
  ${r.Fecha_Compromiso?`<span>Compromiso ${this.fecha(r.Fecha_Compromiso)}</span>`:""}</div>
  ${activa?`<div class="epp-progreso"><i style="width:${Math.min(100,+s.porcentaje||0)}%"></i></div>`:""}</div>
  ${p.gestionar?`<div class="epp-acciones-tarjeta">${p.autorizar&&e==="PENDIENTE AUTORIZACION"?`<button data-autorizar="${r.ID_Solicitud}" class="epp-btn verde">Autorizar</button>`:""}
  ${entregar?`<button data-entregar="${r.ID_Solicitud}" class="epp-btn primario">Entregar</button>`:""}
  ${activa?`<button data-compromiso="${r.ID_Solicitud}" class="epp-btn secundario">Compromiso</button><button data-rechazar="${r.ID_Solicitud}" class="epp-btn peligro">Rechazar</button>`:""}</div>`:""}</article>`;
 },
 eventosSolicitudes(){document.getElementById("eppNuevaSolicitud")?.addEventListener("click",()=>this.formSolicitud());
  document.getElementById("eppAlternarFiltros")?.addEventListener("click",e=>{const b=e.currentTarget,p=document.getElementById("eppPanelFiltros"),a=b.getAttribute("aria-expanded")!=="true";b.setAttribute("aria-expanded",String(a));p?.classList.toggle("epp-panel-filtros-abierto",a);});
  document.getElementById("eppCargarMas")?.addEventListener("click",()=>{this.pagina++;this.cargarSolicitudes(false);});
  document.getElementById("eppFiltroEstado")?.addEventListener("change",()=>this.cargarSolicitudes(true));
  let t;document.getElementById("eppBuscar")?.addEventListener("input",()=>{clearTimeout(t);t=setTimeout(()=>this.cargarSolicitudes(true),350);});
  document.querySelectorAll("[data-entregar]").forEach(b=>b.onclick=()=>this.entregar(b.dataset.entregar,b));
  document.querySelectorAll("[data-autorizar]").forEach(b=>b.onclick=()=>this.autorizar(b.dataset.autorizar,b));
  document.querySelectorAll("[data-compromiso]").forEach(b=>b.onclick=()=>this.compromiso(b.dataset.compromiso));
  document.querySelectorAll("[data-rechazar]").forEach(b=>b.onclick=()=>this.rechazar(b.dataset.rechazar));
 },
 formSolicitud(){const c=document.getElementById("eppContenido"),inv=this.datos.inventario||[],tipos=[...new Set(inv.map(i=>i.Tipo_EPP))];
  const motivos=this.datos.catalogos?.motivosSolicitud?.length?this.datos.catalogos.motivosSolicitud:["Consumible","Reemplazo","Deterioro"];
  c.innerHTML=`<section class="epp-formulario"><button id="eppVolver" class="epp-volver"><i class="fa-solid fa-arrow-left"></i>Volver</button>
  <header><div class="epp-form-icono"><i class="fa-solid fa-helmet-safety"></i></div><div><span>SOLICITUD PERSONAL</span><h3>Solicitar EPP</h3><p>Complete la información requerida.</p></div></header>
  <div class="epp-grid-form"><label>Tipo<select id="eppTipo"><option value="">Seleccione EPP...</option>${tipos.map(v=>`<option>${this.esc(v)}</option>`).join("")}</select></label>
  <label>Talla<select id="eppTalla"><option value="">Seleccione talla...</option></select></label><label>Motivo<select id="eppMotivo"><option value="">Seleccione motivo...</option>
  ${motivos.map(v=>`<option>${this.esc(v)}</option>`).join("")}</select></label><label class="ancho">Comentario<textarea id="eppComentario" rows="3" placeholder="Opcional"></textarea></label>
  <label class="ancho">Justificación excepcional<textarea id="eppJustificacion" rows="3" placeholder="Solo si recibió este EPP hace menos de 15 días"></textarea></label></div>
  <div id="eppCamara" class="epp-camara-bloque oculto"><strong>Evidencia tomada ahora</strong><span>No se permite seleccionar desde la galería.</span>
  <video id="eppVideo" playsinline autoplay muted></video><canvas id="eppCanvas" class="oculto"></canvas><img id="eppPrevia" class="oculto" alt="Vista previa">
  <div><button id="eppAbrirCamara" class="epp-btn secundario">Abrir cámara</button><button id="eppTomarFoto" class="epp-btn primario oculto">Tomar foto</button>
  <button id="eppRepetirFoto" class="epp-btn secundario oculto">Repetir</button></div></div><div id="eppCantidad" class="epp-nota"></div>
  <div class="epp-form-acciones"><button id="eppGuardar" class="epp-btn primario"><i class="fa-solid fa-floppy-disk"></i>Enviar solicitud</button></div></section>`;
  document.getElementById("eppVolver").onclick=()=>{this.detenerCamara();this.renderSolicitudes();};document.getElementById("eppTipo").onchange=()=>this.cambioTipo();
  document.getElementById("eppAbrirCamara").onclick=()=>this.abrirCamara();document.getElementById("eppTomarFoto").onclick=()=>this.tomarFoto();
  document.getElementById("eppRepetirFoto").onclick=()=>this.repetirFoto();document.getElementById("eppGuardar").onclick=e=>this.guardarSolicitud(e.currentTarget);
 },
 cambioTipo(){this.detenerCamara();this.evidencia=null;const tipo=document.getElementById("eppTipo").value,regs=(this.datos.inventario||[]).filter(i=>i.Tipo_EPP===tipo),t=document.getElementById("eppTalla");
  t.innerHTML=`<option value="">Seleccione talla...</option>`+regs.map(i=>`<option>${this.esc(i.Talla||"UNICA")}</option>`).join("");if(regs.length===1&&(regs[0].Talla||"UNICA")==="UNICA")t.value="UNICA";
  const reglas=this.datos.reglas||{},foto=(reglas.evidenciaObligatoria||[]).some(v=>this.clave(v)===this.clave(tipo));document.getElementById("eppCamara").classList.toggle("oculto",!foto);
  const cantidad=this.clave(tipo)===this.clave(reglas.tipoGuantesVerdes)?reglas.guantesVerdesPorEntrega:1;document.getElementById("eppCantidad").innerHTML=tipo?`Se solicitarán <strong>${cantidad}</strong> ${this.plural(regs[0]?.Unidad_Medida||"UNIDAD",cantidad)}.`:"";
 },
 async abrirCamara(){try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("La cámara directa no está disponible.");this.camara=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
  const v=document.getElementById("eppVideo");v.srcObject=this.camara;v.classList.add("activo");document.getElementById("eppAbrirCamara").classList.add("oculto");document.getElementById("eppTomarFoto").classList.remove("oculto");
 }catch(e){Sistema.error(e.message||"Revise el permiso de cámara.");}},
 tomarFoto(){const v=document.getElementById("eppVideo"),c=document.getElementById("eppCanvas"),i=document.getElementById("eppPrevia");if(!v?.videoWidth)return Sistema.error("La cámara aún no está lista.");
  const x=Math.min(1,1280/v.videoWidth);c.width=Math.round(v.videoWidth*x);c.height=Math.round(v.videoHeight*x);c.getContext("2d").drawImage(v,0,0,c.width,c.height);this.evidencia=c.toDataURL("image/jpeg",.72);
  i.src=this.evidencia;i.classList.remove("oculto");v.classList.remove("activo");document.getElementById("eppTomarFoto").classList.add("oculto");document.getElementById("eppRepetirFoto").classList.remove("oculto");this.detenerCamara();},
 repetirFoto(){this.evidencia=null;document.getElementById("eppPrevia").classList.add("oculto");document.getElementById("eppRepetirFoto").classList.add("oculto");document.getElementById("eppAbrirCamara").classList.remove("oculto");},
 detenerCamara(){if(this.camara)this.camara.getTracks().forEach(p=>p.stop());this.camara=null;},
 async guardarSolicitud(b){const tipo=document.getElementById("eppTipo").value,talla=document.getElementById("eppTalla").value,motivo=document.getElementById("eppMotivo").value;
  const foto=(this.datos.reglas?.evidenciaObligatoria||[]).some(v=>this.clave(v)===this.clave(tipo));if(!tipo||!talla||!motivo)return Sistema.error("Complete tipo, talla y motivo.");if(foto&&!this.evidencia)return Sistema.error("Debe tomar la fotografía.");
  await this.ejecutar(b,"Enviando solicitud","Registrando su solicitud.",{action:"crearSolicitudEPP",tipoEPP:tipo,talla:talla,motivoSolicitud:motivo,comentario:document.getElementById("eppComentario").value,
   justificacionAutorizacion:document.getElementById("eppJustificacion").value,evidenciaBase64:this.evidencia||"",evidenciaMime:"image/jpeg"},async r=>{Sistema.exito(r.mensaje);await this.refrescarTodo();});},
 async entregar(id, b) {
  const solicitud = (this.solicitudes || []).find(
    registro => String(registro.ID_Solicitud) === String(id)
  ) || {};

  const tipoEPP = solicitud.Tipo_EPP || "Equipo de protección personal";

  const talla = solicitud.Talla && solicitud.Talla !== "UNICA"
    ? ` · Talla ${solicitud.Talla}`
    : "";

  const colaborador =
    solicitud.Colaborador_Nombre || "Colaborador solicitante";

  const confirmacion = await new Promise(resolve => {
    const anterior = document.getElementById("eppConfirmacionEntrega");

    if (anterior) {
      anterior.remove();
    }

    const focoAnterior = document.activeElement;

    const escapar = valor =>
      String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const capa = document.createElement("div");

    capa.id = "eppConfirmacionEntrega";
    capa.className = "epp-confirmacion-overlay";

    capa.setAttribute("role", "dialog");
    capa.setAttribute("aria-modal", "true");
    capa.setAttribute("aria-labelledby", "eppConfirmacionTitulo");

    capa.innerHTML = `
      <section class="epp-confirmacion-dialogo">
        <header class="epp-confirmacion-encabezado">
          <span class="epp-confirmacion-icono">
            <i class="fas fa-box-open"></i>
          </span>

          <div>
            <small>SEGURIDAD PERSONAL</small>

            <h3 id="eppConfirmacionTitulo">
              Confirmar entrega
            </h3>
          </div>

          <button
            type="button"
            class="epp-confirmacion-cerrar"
            aria-label="Cerrar"
            data-epp-cancelar
          >
            <i class="fas fa-times"></i>
          </button>
        </header>

        <div class="epp-confirmacion-contenido">
          <p>
            ¿Confirma la entrega del siguiente equipo de protección?
          </p>

          <article class="epp-confirmacion-detalle">
            <div>
              <span>Colaborador</span>

              <strong>
                ${escapar(colaborador)}
              </strong>
            </div>

            <div>
              <span>Equipo solicitado</span>

              <strong>
                ${escapar(tipoEPP + talla)}
              </strong>
            </div>
          </article>

          <p class="epp-confirmacion-advertencia">
            <i class="fas fa-info-circle"></i>
            El inventario se actualizará automáticamente.
          </p>
        </div>

        <footer class="epp-confirmacion-acciones">
          <button
            type="button"
            class="epp-confirmacion-btn secundario"
            data-epp-cancelar
          >
            Cancelar
          </button>

          <button
            type="button"
            class="epp-confirmacion-btn primario"
            data-epp-confirmar
          >
            <i class="fas fa-check"></i>
            Confirmar entrega
          </button>
        </footer>
      </section>
    `;

    let resuelto = false;

    const cerrar = resultado => {
      if (resuelto) {
        return;
      }

      resuelto = true;

      document.removeEventListener("keydown", manejarTeclado);

      capa.remove();

      if (
        focoAnterior &&
        document.contains(focoAnterior) &&
        typeof focoAnterior.focus === "function"
      ) {
        focoAnterior.focus();
      }

      resolve(resultado);
    };

    const manejarTeclado = evento => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar(false);
      }
    };

    capa.addEventListener("click", evento => {
      if (
        evento.target === capa ||
        evento.target.closest("[data-epp-cancelar]")
      ) {
        cerrar(false);
        return;
      }

      if (evento.target.closest("[data-epp-confirmar]")) {
        cerrar(true);
      }
    });

    document.addEventListener("keydown", manejarTeclado);

    document.body.appendChild(capa);

    requestAnimationFrame(() => {
      const botonConfirmar = capa.querySelector(
        "[data-epp-confirmar]"
      );

      if (botonConfirmar) {
        botonConfirmar.focus();
      }
    });
  });

  if (!confirmacion) {
    return;
  }

  await this.ejecutar(
    b,
    "Registrando entrega",
    "Actualizando inventario.",
    {
      action: "entregarSolicitudEPP",
      idSolicitud: id
    },
    async respuesta => {
      Sistema.exito(respuesta.mensaje);
      await this.refrescarTodo();
    }
  );
},
 async autorizar(id,b){if(confirm("¿Autorizar solicitud excepcional?"))await this.ejecutar(b,"Autorizando","Registrando autorización.",{action:"autorizarSolicitudEPP",idSolicitud:id},async r=>{Sistema.exito(r.mensaje);await this.refrescarTodo();});},
 compromiso(id){const f=prompt("Fecha de compromiso (AAAA-MM-DD):"),m=f&&prompt("Motivo:");if(f&&m)this.ejecutar(null,"Guardando compromiso","Actualizando solicitud.",{action:"establecerCompromisoEPP",idSolicitud:id,fechaCompromiso:f,motivoCompromiso:m},async r=>{Sistema.exito(r.mensaje);await this.refrescarTodo();});},
 rechazar(id){const m=prompt("Justifique el rechazo:");if(m)this.ejecutar(null,"Rechazando","Registrando decisión.",{action:"rechazarSolicitudEPP",idSolicitud:id,motivoRechazo:m},async r=>{Sistema.exito(r.mensaje);await this.refrescarTodo();});},
 async refrescarTodo(){const r=await API.post({action:"obtenerInicioGestionEPP"});if(!r?.ok)throw new Error(r?.mensaje||"No fue posible actualizar.");this.datos=r.data;
  this.cargando=false;await this.cargarSolicitudes(true);},

 agruparInventario(){const grupos=new Map();(this.datos.inventario||[]).forEach(i=>{const k=this.clave(i.Tipo_EPP);if(!grupos.has(k))grupos.set(k,{tipo:i.Tipo_EPP,items:[],actual:0,minimo:0,objetivo:0});
  const g=grupos.get(k);g.items.push(i);g.actual+=Number(i.Stock_Actual)||0;g.minimo+=Number(i.Stock_Minimo)||0;g.objetivo+=Number(i.Stock_Objetivo)||0;});return[...grupos.values()];},
 nivelInventario(i){const a=Number(i.Stock_Actual)||0,m=Number(i.Stock_Minimo)||0,o=Number(i.Stock_Objetivo)||0;return a<=m?"bajo":a<o?"medio":"bien";},
 nivelGrupo(g){return g.items.some(i=>this.nivelInventario(i)==="bajo")?"bajo":g.items.some(i=>this.nivelInventario(i)==="medio")?"medio":"bien";},
 nombreTalla(i){return i.Talla&&this.clave(i.Talla)!=="UNICA"?"Talla "+this.esc(i.Talla):"Talla única";},
 cabeceraGrupo(g,compras){const t=g.items.length===1?"1 presentación":`${g.items.length} tallas`;return`<summary class="epp-familia-cabecera"><span class="epp-familia-icono">${this.icono(g.tipo)}</span>
  <span class="epp-familia-identidad"><strong>${this.esc(g.tipo)}</strong><small>${t}${compras?` · ${g.actual} disponibles`:""}</small></span>
  ${compras?`<span class="epp-familia-resumen">Objetivo ${this.num(g.objetivo)}</span>`:`<span class="epp-familia-existencia"><strong>${this.num(g.actual)}</strong><small>mín. ${this.num(g.minimo)}</small></span>`}
  <i class="fa-solid fa-chevron-down epp-familia-flecha"></i></summary>`;},
 renderInventario(){const c=document.getElementById("eppContenido"),grupos=this.agruparInventario();c.innerHTML=`<header class="epp-toolbar"><div><span>EXISTENCIAS</span><h3>Inventario disponible</h3></div></header>
  <div class="epp-inventario-grid">${grupos.map(g=>`<details class="epp-familia epp-familia-inventario stock-${this.nivelGrupo(g)}">${this.cabeceraGrupo(g,false)}
  <div class="epp-familia-tallas">${g.items.map(i=>this.stock(i)).join("")}</div></details>`).join("")||`<div class="epp-vacio">No hay equipos registrados.</div>`}</div>`;},
 stock(i){const a=+i.Stock_Actual||0,m=+i.Stock_Minimo||0,o=+i.Stock_Objetivo||0,n=this.nivelInventario(i);return`<article class="epp-talla-stock stock-${n}">
  <div class="epp-talla-datos"><strong>${this.nombreTalla(i)}</strong><small>${this.esc(i.ID_EPP)}</small></div><div class="epp-talla-cantidad"><strong>${this.num(a)}</strong><small>mín. ${this.num(m)} · obj. ${this.num(o)}</small></div>
  ${a<o?`<span class="epp-talla-reposicion"><i class="fa-solid fa-arrow-trend-up"></i>Reponer ${this.num(o-a)}</span>`:""}</article>`;},
 movimiento(tipo){this.cambiarTab(tipo==="ENTRADA"?"ENTRADAS":"AJUSTES");},
 renderMovimiento(tipo){const ajuste=tipo==="AJUSTE",c=document.getElementById("eppContenido"),inv=this.datos.inventario||[];
  if(ajuste&&!this.datos.permisos?.ajustar)return Sistema.error("Su rol no puede ajustar el inventario.");
  const motivos=this.datos.catalogos?.motivosAjuste||[],motivosEntrada=this.datos.catalogos?.motivosEntrada||[];
  c.innerHTML=`<section class="epp-formulario epp-formulario-movimiento"><button id="eppMovimientoVolver" class="epp-volver"><i class="fa-solid fa-arrow-left"></i>Volver al inventario</button>
  <header><div class="epp-form-icono"><i class="fa-solid ${ajuste?"fa-sliders":"fa-box-open"}"></i></div><div><span>${ajuste?"CONTROL DE EXISTENCIAS":"RECEPCIÓN DE EQUIPOS"}</span>
  <h3>${ajuste?"Ajustar inventario":"Registrar entrada"}</h3><p>${ajuste?"Corrija una diferencia documentada en las existencias.":"Registre la recepción de equipos de protección."}</p></div></header>
  <form id="eppMovimientoForm"><div class="epp-grid-form epp-movimiento-grid"><label class="ancho">Equipo de protección<select id="eppMovimientoEquipo" required>
  <option value="">Seleccione un EPP...</option>${inv.map(i=>`<option value="${this.esc(i.ID_EPP)}">${this.esc(i.Tipo_EPP)}${i.Talla&&i.Talla!=="UNICA"?" · Talla "+this.esc(i.Talla):""} · ${this.esc(i.ID_EPP)}</option>`).join("")}</select></label>
  <label>${ajuste?"Cantidad a ajustar":"Cantidad recibida"}<input id="eppMovimientoCantidad" type="number" step="1" ${ajuste?"":"min=\"1\""} placeholder="${ajuste?"Ej.: -2 o 3":"Ej.: 12"}" required></label>
  <label>Valor unitario<input id="eppMovimientoValor" type="number" min="0" step="0.01" placeholder="Conservar valor actual"></label>
  ${ajuste?"":`<label class="ancho">Número de factura<input id="eppMovimientoFactura" type="text" maxlength="60" placeholder="Ej.: FAC-2026-0145" required></label>`}
  <label class="ancho">Motivo${!ajuste?`<select id="eppMovimientoMotivo" required><option value="">${motivosEntrada.length?"Seleccione un motivo...":"Configure Motivo_Entrada_EPP en Catalogos"}</option>${motivosEntrada.map(m=>`<option value="${this.esc(m)}">${this.esc(m)}</option>`).join("")}</select>`:
  motivos.length?`<select id="eppMovimientoMotivo" required><option value="">Seleccione un motivo...</option>${motivos.map(m=>`<option value="${this.esc(m)}">${this.esc(m)}</option>`).join("")}</select>`:
  `<input id="eppMovimientoMotivo" type="text" placeholder="Indique el motivo del ajuste" required>`}</label></div>
  <div id="eppMovimientoResumen" class="epp-movimiento-resumen oculto"></div>
  <div class="epp-form-acciones"><button id="eppMovimientoGuardar" class="epp-btn ${ajuste?"secundario":"primario"}" type="submit"><i class="fa-solid fa-floppy-disk"></i>${ajuste?"Guardar ajuste":"Guardar entrada"}</button></div></form></section>`;
  document.getElementById("eppMovimientoVolver").onclick=()=>this.cambiarTab("INVENTARIO");
  document.getElementById("eppMovimientoEquipo").onchange=()=>this.actualizarResumenMovimiento(ajuste);
  document.getElementById("eppMovimientoCantidad").oninput=()=>this.actualizarResumenMovimiento(ajuste);
  document.getElementById("eppMovimientoForm").onsubmit=e=>{e.preventDefault();this.guardarMovimiento(tipo,document.getElementById("eppMovimientoGuardar"));};},
 actualizarResumenMovimiento(ajuste){const id=document.getElementById("eppMovimientoEquipo")?.value,q=Number(document.getElementById("eppMovimientoCantidad")?.value||0),
  e=(this.datos.inventario||[]).find(i=>String(i.ID_EPP)===String(id)),r=document.getElementById("eppMovimientoResumen");if(!r)return;if(!e){r.classList.add("oculto");return;}
  const actual=Number(e.Stock_Actual||0),total=actual+q;r.classList.remove("oculto");r.classList.toggle("epp-movimiento-invalido",total<0);
  r.innerHTML=`<span>Existencia actual <strong>${this.num(actual)}</strong></span><span>${ajuste?"Ajuste":"Entrada"} <strong>${q>0?"+":""}${this.num(q)}</strong></span><span>Existencia resultante <strong>${this.num(total)}</strong></span>`;},
 async guardarMovimiento(tipo,b){const ajuste=tipo==="AJUSTE",id=document.getElementById("eppMovimientoEquipo")?.value,q=Number(document.getElementById("eppMovimientoCantidad")?.value||0),
  motivo=document.getElementById("eppMovimientoMotivo")?.value.trim(),factura=document.getElementById("eppMovimientoFactura")?.value.trim()||"",valor=document.getElementById("eppMovimientoValor")?.value,e=(this.datos.inventario||[]).find(i=>String(i.ID_EPP)===String(id));
  if(!id||!e)return Sistema.error("Seleccione el EPP.");if(!q||(!ajuste&&q<1))return Sistema.error(ajuste?"Indique una cantidad positiva o negativa.":"La cantidad recibida debe ser mayor que cero.");
  if(ajuste&&Number(e.Stock_Actual||0)+q<0)return Sistema.error("El ajuste dejaría el inventario negativo.");if(!ajuste&&!factura)return Sistema.error("Indique el número de factura.");if(!motivo)return Sistema.error("Seleccione el motivo del movimiento.");
  await this.ejecutar(b,ajuste?"Guardando ajuste":"Registrando entrada","Actualizando las existencias del equipo.",{action:ajuste?"ajustarInventarioEPP":"registrarEntradaInventarioEPP",idEPP:id,cantidad:q,motivo:motivo,numeroFactura:ajuste?"":factura,valorUnitario:valor},
  async r=>{await this.refrescarTodo();this.cambiarTab("INVENTARIO");Sistema.exito(ajuste?r.mensaje:`Entrada registrada. Recuerda enviar la factura ${factura} a Finanzas para gestión de pago.`);});},

 renderCompras(){const c=document.getElementById("eppContenido"),ms=this.datos.catalogos?.motivosCompra?.length?this.datos.catalogos.motivosCompra:["Consumible","Nuevo ingreso","Reemplazo"],grupos=this.agruparInventario();
  c.innerHTML=`<header class="epp-toolbar"><div><span>ABASTECIMIENTO</span><h3>Solicitud de compra</h3></div></header><div class="epp-compra-lista">${grupos.map(g=>
  `<details class="epp-familia epp-familia-compra stock-${this.nivelGrupo(g)}">${this.cabeceraGrupo(g,true)}<div class="epp-compra-tallas">${g.items.map(i=>
  `<label class="epp-compra-item"><input type="checkbox" data-compra="${this.esc(i.ID_EPP)}"><span class="epp-compra-identidad"><strong>${this.nombreTalla(i)}</strong><small>${this.esc(i.ID_EPP)}</small></span>
  <small class="epp-compra-existencia">Stock ${this.num(i.Stock_Actual)} / objetivo ${this.num(i.Stock_Objetivo)}</small><input type="number" min="1" data-cantidad="${this.esc(i.ID_EPP)}" placeholder="Cantidad"><select data-motivo="${this.esc(i.ID_EPP)}">
  <option value="">Motivo...</option>${ms.map(m=>`<option>${this.esc(m)}</option>`).join("")}</select></label>`).join("")}</div></details>`).join("")||`<div class="epp-vacio">No hay equipos disponibles para solicitar.</div>`}</div><div class="epp-form-acciones"><button id="eppEnviarCompra" class="epp-btn primario"><i class="fa-solid fa-paper-plane"></i>Enviar compra</button></div>`;
  document.getElementById("eppEnviarCompra").onclick=e=>this.enviarCompra(e.currentTarget);},
 async enviarCompra(b){const items=[...document.querySelectorAll("[data-compra]:checked")].map(c=>({idEPP:c.dataset.compra,cantidad:document.querySelector(`[data-cantidad="${CSS.escape(c.dataset.compra)}"]`).value,motivo:document.querySelector(`[data-motivo="${CSS.escape(c.dataset.compra)}"]`).value}));
  if(!items.length||items.some(i=>!i.cantidad||!i.motivo))return Sistema.error("Complete cantidad y motivo.");await this.ejecutar(b,"Enviando compra","Preparando correo.",{action:"enviarSolicitudCompraEPP",items:items},r=>Sistema.exito(r.mensaje));},

 async cargarReporte(periodo){CargadorSistema.mostrar("Cargando reporte","Consultando entregas.");try{const r=await API.post({action:"obtenerReporteEntregasEPP",periodo:periodo});if(!r?.ok)throw new Error(r?.mensaje||"No fue posible consultar.");this.renderReporte(r.data||{},periodo);}catch(e){Sistema.error(e.message);}finally{CargadorSistema.ocultar();}},
 renderReporte(d,p){const c=document.getElementById("eppContenido");c.innerHTML=`<header class="epp-toolbar"><div><span>TRAZABILIDAD</span><h3>Entregas de EPP</h3></div><select id="eppPeriodo"><option value="MES">Mes</option><option value="TRIMESTRE">Trimestre</option><option value="SEMESTRE">Semestre</option><option value="ANO">Año</option></select></header>
  <div class="epp-kpis"><article><small>Entregas</small><strong>${this.num(d.totalEntregas)}</strong></article><article><small>Unidades/pares</small><strong>${this.num(d.totalCantidad)}</strong></article><article><small>Valor</small><strong>${this.moneda(d.totalValor)}</strong></article></div>
  <div class="epp-reporte-lista">${(d.porTipo||[]).map(i=>`<article>${this.icono(i.tipoEPP)}<strong>${this.esc(i.tipoEPP)}</strong><span>${this.num(i.cantidad)}</span><b>${this.moneda(i.valor)}</b></article>`).join("")||"Sin entregas."}</div>`;
  document.getElementById("eppPeriodo").value=p;document.getElementById("eppPeriodo").onchange=e=>this.cargarReporte(e.target.value);},

 async ejecutar(b,t,d,s,ok){if(this.cargando)return;this.cargando=true;if(b)b.disabled=true;CargadorSistema.mostrar(t,d);try{const r=await API.post(s);if(!r?.ok)throw new Error(r?.mensaje||"Operación no completada.");await ok(r);}catch(e){Sistema.error(e.message);}finally{CargadorSistema.ocultar();if(b)b.disabled=false;this.cargando=false;}},
 icono(t){const c=this.clave(t);if(c.includes("ABRIGO"))return`<i class="fa-solid fa-shirt"></i>`;if(c.includes("BOTA"))return`<i class="fa-solid fa-shoe-prints"></i>`;if(c.includes("GUANTE"))return`<i class="fa-solid fa-mitten"></i>`;if(c.includes("PASAMONT"))return`<i class="fa-solid fa-user-ninja"></i>`;if(c.includes("MEDIA"))return`<i class="fa-solid fa-socks"></i>`;return`<i class="fa-solid fa-helmet-safety"></i>`;},
 estado(v){return String(v||"").replace(/_/g," ").toLowerCase().replace(/\b\w/g,l=>l.toUpperCase());},fecha(v){const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(v||"-");},
 plural(u,c){return this.clave(u)==="PAR"?(+c===1?"par":"pares"):(+c===1?"unidad":"unidades");},clave(v){return String(v||"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/_/g," ").replace(/\s+/g," ").toUpperCase();},
 esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");},num(v){return Number(v||0).toLocaleString("es-DO",{maximumFractionDigits:2});},moneda(v){return"RD$"+Number(v||0).toLocaleString("es-DO",{minimumFractionDigits:2,maximumFractionDigits:2});}
};

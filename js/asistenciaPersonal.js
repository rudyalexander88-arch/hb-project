/** ASISTENCIAPERSONAL.JS */
window.AsistenciaPersonal = {
  datos:null,
  pendientes:[],
  turnoActual:"4-3 A",

  puedeGestionar() {
    const s=Sistema.obtenerSesion()||{};
    const r=String(s.rol||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
    return r.includes("SUPERVISOR")||r.includes("ENCARGADO")||r.includes("ADMINISTRADOR");
  },

  async abrir() {
    if(!this.puedeGestionar()){Sistema.info("Su rol no puede gestionar asistencia.");return;}
    this.cargar("Cargando asistencia","Consultando colaboradores y registros del día.");
    try{
      const r=await API.post({action:"obtenerResumenAsistenciaPersonal",fecha:this.hoy(),turno:this.turnoActual});
      if(!r||!r.ok)throw new Error(r&&r.mensaje?r.mensaje:"No fue posible cargar la asistencia.");
      this.datos=r.data||{};
      Sistema.abrirModal("Gestión de asistencia",this.render(),{clase:"modal-asistencia-personal"});
      this.eventos();
    }catch(e){Sistema.error(e.message||"No fue posible abrir asistencia.");}
    finally{this.ocultar();}
  },

  render(){
    const d=this.datos||{}, colaboradores=Array.isArray(d.colaboradores)?d.colaboradores:[];
    return `<section class="ap-modulo">
      <div class="ap-tabs">
        <button class="activo" data-ap-tab="asistencia"><i class="fa-solid fa-calendar-check"></i> Asistencia</button>
        <button data-ap-tab="amonestacion"><i class="fa-solid fa-file-circle-exclamation"></i> Otra amonestación</button>
        <button data-ap-tab="pendientes"><i class="fa-solid fa-upload"></i> Documentos pendientes</button>
      </div>
      <div class="ap-panel" data-ap-panel="asistencia">
        <div class="ap-filtros"><label>Fecha<input id="apFecha" type="date" value="${this.e(d.fecha||this.hoy())}"></label>
          <label>Turno<select id="apTurno">${["4-3 A","4-3 B","A","B","C"].map(t=>`<option value="${t}" ${String(d.turno||this.turnoActual)===t?"selected":""}>${t}</option>`).join("")}</select></label>
          <div class="ap-resumen"><span>${d.resumen?d.resumen.registrados||0:0}</span> registrados hoy</div></div>
        <div class="ap-lista-colaboradores">
          ${colaboradores.map(c=>this.filaColaborador(c)).join("")||"<div class='ap-vacio'>No hay colaboradores activos.</div>"}
        </div>
        <div class="ap-acciones"><button id="apGuardarAsistencia"><i class="fa-solid fa-floppy-disk"></i> Guardar asistencia</button></div>
      </div>
      <div class="ap-panel" data-ap-panel="amonestacion" hidden>${this.formAmonestacion(colaboradores)}</div>
      <div class="ap-panel" data-ap-panel="pendientes" hidden><div id="apPendientes"><div class="ap-vacio">Pulse consultar para cargar documentos pendientes.</div></div><div class="ap-acciones"><button id="apCargarPendientes">Consultar pendientes</button></div></div>
    </section>`;
  },

  filaColaborador(c){
    const r=c.registro||{}, estado=String(r.Estado_Asistencia||"");
    return `<article class="ap-colaborador" data-empleado-id="${this.e(c.idEmpleado)}">
      <div class="ap-identidad"><span class="ap-avatar"><i class="fa-solid fa-user"></i></span><div><strong>${this.e(c.nombre)}</strong><small>${this.e(c.rol)} · ${this.e(c.idEmpleado)}</small></div></div>
      <label>Estado<select class="ap-estado"><option value="">Sin registrar</option><option value="ASISTIO" ${estado==="ASISTIO"?"selected":""}>Asistió</option><option value="FALTO" ${estado==="FALTO"?"selected":""}>Faltó</option><option value="VACACIONES" ${estado==="VACACIONES"?"selected":""}>Vacaciones</option></select></label>
      <label class="ap-campo-falta" ${estado==="FALTO"?"":"hidden"}>Clasificación<select class="ap-tipo"><option value="">Seleccione</option>${["INJUSTIFICADA","JUSTIFICADA","LICENCIA"].map(t=>`<option ${String(r.Tipo_Inasistencia||"")===t?"selected":""}>${t}</option>`).join("")}</select></label>
      <label class="ap-vacaciones" ${estado==="VACACIONES"?"":"hidden"}>Hasta<input type="date" class="ap-fin-vacaciones"></label>
      <label class="ap-comentario">Comentario<input class="ap-comentario-input" value="${this.e(r.Comentario||"")}" placeholder="Opcional"></label>
    </article>`;
  },

  formAmonestacion(colaboradores){return `<div class="ap-form-amonestacion">
    <header><i class="fa-solid fa-file-circle-exclamation"></i><div><strong>Registrar otra amonestación</strong><span>Para incidencias distintas de una inasistencia.</span></div></header>
    <div class="ap-grid-form"><label>Colaborador<select id="apAmoEmpleado"><option value="">Seleccione...</option>${colaboradores.map(c=>`<option value="${this.e(c.idEmpleado)}">${this.e(c.nombre)}</option>`).join("")}</select></label>
    <label>Fecha<input type="date" id="apAmoFecha" value="${this.hoy()}"></label><label class="ancho">Causa<input id="apAmoCausa" placeholder="Indique la causa"></label>
    <label class="ancho">Comentario<textarea id="apAmoComentario" rows="4"></textarea></label></div>
    <div class="ap-acciones"><button id="apGuardarAmonestacion">Registrar amonestación</button></div></div>`;},

  eventos(){
    document.querySelectorAll("[data-ap-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-ap-tab]").forEach(x=>x.classList.toggle("activo",x===b));document.querySelectorAll("[data-ap-panel]").forEach(p=>p.hidden=p.dataset.apPanel!==b.dataset.apTab);});
    document.querySelectorAll(".ap-estado").forEach(s=>s.onchange=()=>{const f=s.closest(".ap-colaborador");f.querySelector(".ap-campo-falta").hidden=s.value!=="FALTO";f.querySelector(".ap-vacaciones").hidden=s.value!=="VACACIONES";});
    const fecha=document.getElementById("apFecha"),turno=document.getElementById("apTurno");
    if(fecha)fecha.onchange=()=>this.recargarFecha(fecha.value,turno?turno.value:this.turnoActual);
    if(turno)turno.onchange=()=>{this.turnoActual=turno.value;this.recargarFecha(fecha?fecha.value:this.hoy(),turno.value);};
    const guardar=document.getElementById("apGuardarAsistencia");if(guardar)guardar.onclick=()=>this.guardarAsistencia();
    const amo=document.getElementById("apGuardarAmonestacion");if(amo)amo.onclick=()=>this.guardarAmonestacion();
    const pendientes=document.getElementById("apCargarPendientes");if(pendientes)pendientes.onclick=()=>this.cargarPendientes();
  },

  async recargarFecha(fecha,turno){this.turnoActual=turno||this.turnoActual;this.cargar("Actualizando asistencia","Consultando la fecha y el turno seleccionados.");try{const r=await API.post({action:"obtenerResumenAsistenciaPersonal",fecha:fecha,turno:this.turnoActual});if(!r||!r.ok)throw new Error(r.mensaje);this.datos=r.data;Sistema.abrirModal("Gestión de asistencia",this.render(),{clase:"modal-asistencia-personal"});this.eventos();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},

  async guardarAsistencia(){
    const registros=[];
    document.querySelectorAll(".ap-colaborador").forEach(f=>{const estado=f.querySelector(".ap-estado").value;if(!estado)return;registros.push({empleadoId:f.dataset.empleadoId,estadoAsistencia:estado,tipoInasistencia:f.querySelector(".ap-tipo").value,comentario:f.querySelector(".ap-comentario-input").value,fechaFinVacaciones:f.querySelector(".ap-fin-vacaciones").value});});
    if(!registros.length){Sistema.info("Seleccione el estado de al menos un colaborador.");return;}
    const fechaGuardada=document.getElementById("apFecha").value,turnoGuardado=document.getElementById("apTurno").value;this.turnoActual=turnoGuardado;
    this.cargar("Guardando asistencia","Registrando el turno y actualizando el listado.");
    try{const r=await API.post({action:"guardarAsistenciaPersonal",fecha:fechaGuardada,turno:turnoGuardado,registros:registros});if(!r||!r.ok)throw new Error(r&&r.mensaje?r.mensaje:"No fue posible guardar.");const actualizado=await API.post({action:"obtenerResumenAsistenciaPersonal",fecha:fechaGuardada,turno:turnoGuardado});if(!actualizado||!actualizado.ok)throw new Error(actualizado&&actualizado.mensaje?actualizado.mensaje:"Se guardó, pero no fue posible actualizar la vista.");this.datos=actualizado.data;Sistema.abrirModal("Gestión de asistencia",this.render(),{clase:"modal-asistencia-personal"});this.eventos();Sistema.exito(r.mensaje||"Asistencia guardada y actualizada.");}catch(e){Sistema.error(e.message);}finally{this.ocultar();}
  },

  async guardarAmonestacion(){const empleado=document.getElementById("apAmoEmpleado").value,causa=document.getElementById("apAmoCausa").value;if(!empleado||!causa){Sistema.info("Seleccione el colaborador e indique la causa.");return;}this.cargar("Registrando amonestación","Creando el seguimiento y notificando a Gestión Humana.");try{const r=await API.post({action:"registrarAmonestacionPersonal",empleadoId:empleado,fechaIncidencia:document.getElementById("apAmoFecha").value,causa:causa,comentario:document.getElementById("apAmoComentario").value});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},

  async cargarPendientes(){this.cargar("Consultando documentos","Buscando amonestaciones pendientes.");try{const r=await API.post({action:"listarAmonestacionesPendientes"});if(!r||!r.ok)throw new Error(r.mensaje);this.pendientes=r.data.registros||[];const c=document.getElementById("apPendientes");c.innerHTML=this.pendientes.map(x=>`<article class="ap-pendiente"><div><strong>${this.e(x.Empleado_Nombre)}</strong><span>${this.e(x.Causa)} · ${this.e(x.Fecha_Incidencia)}</span></div><input type="file" accept="application/pdf" data-ap-archivo="${this.e(x.ID_Amonestacion)}"><button data-ap-subir="${this.e(x.ID_Amonestacion)}">Subir PDF</button></article>`).join("")||"<div class='ap-vacio'>No existen documentos pendientes.</div>";c.querySelectorAll("[data-ap-subir]").forEach(b=>b.onclick=()=>this.subirDocumento(b.dataset.apSubir));}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},

  async subirDocumento(id){const input=document.querySelector(`[data-ap-archivo="${id}"]`),archivo=input&&input.files?input.files[0]:null;if(!archivo){Sistema.info("Seleccione el documento PDF.");return;}if(archivo.type!=="application/pdf"){Sistema.info("El documento debe estar en formato PDF.");return;}if(archivo.size>8*1024*1024){Sistema.info("El PDF no puede superar 8 MB.");return;}this.cargar("Guardando amonestación","Subiendo el expediente y respondiendo el correo de GGHH.");try{const base64=await this.base64(archivo);const r=await API.post({action:"subirDocumentoAmonestacion",idAmonestacion:id,archivoBase64:base64});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);await this.cargarPendientes();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},

  async cargarAvisos(){try{const r=await API.post({action:"obtenerAvisosAsistenciaUsuario"});return r&&r.ok?r.data:{avisos:[],total:0};}catch(e){return{avisos:[],total:0};}},
  async abrirAvisos(){this.cargar("Cargando avisos","Consultando sus comunicaciones pendientes.");try{const d=await this.cargarAvisos(),avisos=d.avisos||[];Sistema.abrirModal("Mis avisos",`<section class="ap-avisos">${avisos.map(a=>`<article><i class="fa-solid fa-bell"></i><div><strong>${this.e(a.Titulo)}</strong><p>${this.e(a.Mensaje)}</p><small>${this.e(a.Fecha_Creacion)}</small></div><button data-ap-leer="${this.e(a.ID_Aviso)}">Marcar leído</button></article>`).join("")||"<div class='ap-vacio'>No tiene avisos pendientes.</div>"}</section>`,{compacto:true});document.querySelectorAll("[data-ap-leer]").forEach(b=>b.onclick=async()=>{await API.post({action:"marcarAvisoAsistenciaLeido",idAviso:b.dataset.apLeer});b.closest("article").remove();});}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
  base64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]||"");r.onerror=rej;r.readAsDataURL(file);});},
  cargar(t,m){if(window.CargadorSistema)CargadorSistema.mostrar(t,m);},ocultar(){if(window.CargadorSistema)CargadorSistema.ocultar();},
  hoy(){const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;},
  e(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
};

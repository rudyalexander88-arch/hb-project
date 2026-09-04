/** ASISTENCIAPERSONAL.JS · UTF-8 · Gestión de personal y avisos. */
window.AsistenciaPersonal={
 datos:null,catalogos:null,turnoActual:"A",coberturas:[],
 puedeGestionar(){const s=Sistema.obtenerSesion()||{},r=this.n(s.rol);return r.includes("SUPERVISOR")||r.includes("ENCARGADO")||r.includes("ADMINISTRADOR");},
 puedeCrearExtras(){const s=Sistema.obtenerSesion()||{},r=this.n(s.rol);return r.includes("ENCARGADO")||r.includes("ADMINISTRADOR");},
 async abrir(tipo){if(!this.puedeGestionar()){Sistema.info("Su rol no puede gestionar personal.");return;}tipo=this.n(tipo||"ASISTENCIA");if(tipo==="ASISTENCIA")return this.abrirAsistencia();if(tipo==="VACACIONES")return this.abrirVacaciones();if(tipo==="BONO")return this.abrirBono();if(tipo==="AMONESTACION")return this.abrirAmonestacion();},
 async abrirAsistencia(fecha,turno){fecha=fecha||this.hoy();turno=turno||this.turnoActual;this.cargar("Cargando asistencia","Consultando el personal esperado del turno.");try{const r=await API.post({action:"obtenerResumenAsistenciaPersonal",fecha,turno});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible cargar la asistencia.");this.datos=r.data||{};this.turnoActual=turno;this.coberturas=[];this.modal("Asistencia del personal",this.renderAsistencia());this.eventosAsistencia();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 renderAsistencia(){const d=this.datos||{},cols=d.colaboradores||[],novedades=d.noRequeridos||[];return `<section class="ap-modulo"><div class="ap-filtros"><label>Fecha<input id="apFecha" type="date" value="${this.e(d.fecha||this.hoy())}"></label><label>Turno<select id="apTurno">${["4-3 A","4-3 B","A","B","C"].map(t=>`<option ${String(d.turno)===t?"selected":""}>${t}</option>`).join("")}</select></label><div class="ap-resumen"><span>${cols.length}</span> esperados</div></div>${novedades.length?`<div class="ap-no-requeridos"><strong>No requeridos en esta fecha</strong>${novedades.map(x=>`<span>${this.e(x.nombre)} · ${this.e(x.tipo)}</span>`).join("")}</div>`:""}<div class="ap-lista-colaboradores">${cols.map(c=>this.filaAsistencia(c)).join("")||"<div class='ap-vacio'>No hay colaboradores esperados.</div>"}<div id="apCoberturasLista"></div></div><div class="ap-agregar-cobertura"><strong>Agregar colaborador de otro turno</strong><div class="ap-buscador"><input id="apBuscarCobertura" placeholder="Escriba nombre, apellido o código"><div id="apResultadosCobertura"></div></div></div><div class="ap-acciones"><button id="apGuardarAsistencia"><i class="fa-solid fa-floppy-disk"></i> Guardar asistencia</button></div></section>`;},
 filaAsistencia(c){const r=c.registro||{},estado=this.n(r.Estado_Asistencia||"");return `<article class="ap-colaborador" data-empleado-id="${this.e(c.idEmpleado)}" data-cobertura="NO"><div class="ap-identidad"><span class="ap-avatar"><i class="fa-solid fa-user"></i></span><div><strong>${this.e(c.nombre)}</strong><small>${this.e(c.rol)} · ${this.e(c.idEmpleado)}</small></div></div><label>Estado<select class="ap-estado"><option value="">Sin registrar</option><option value="ASISTIO" ${estado==="ASISTIO"?"selected":""}>Asistió</option><option value="FALTO" ${estado==="FALTO"?"selected":""}>Faltó</option></select></label><label class="ap-campo-falta" ${estado==="FALTO"?"":"hidden"}>Razón<select class="ap-tipo"><option value="">Seleccione</option>${["INJUSTIFICADA","MEDICA","OTRA JUSTIFICADA"].map(t=>`<option ${this.n(r.Tipo_Inasistencia)===t?"selected":""}>${t}</option>`).join("")}</select></label><label class="ap-detalle" ${this.n(r.Tipo_Inasistencia)==="OTRA JUSTIFICADA"?"":"hidden"}>Detalle<input class="ap-detalle-input" value="${this.e(r.Detalle_Justificacion||"")}"></label><label class="ap-comentario">Comentario<input class="ap-comentario-input" value="${this.e(r.Comentario||"")}" placeholder="Opcional"></label></article>`;},
 eventosAsistencia(){const f=document.getElementById("apFecha"),t=document.getElementById("apTurno");f.onchange=()=>this.abrirAsistencia(f.value,t.value);t.onchange=()=>this.abrirAsistencia(f.value,t.value);document.querySelectorAll(".ap-estado").forEach(s=>s.onchange=()=>{const a=s.closest(".ap-colaborador");a.querySelector(".ap-campo-falta").hidden=s.value!=="FALTO";if(s.value!=="FALTO")a.querySelector(".ap-detalle").hidden=true;});document.querySelectorAll(".ap-tipo").forEach(s=>s.onchange=()=>s.closest(".ap-colaborador").querySelector(".ap-detalle").hidden=s.value!=="OTRA JUSTIFICADA");document.getElementById("apBuscarCobertura").oninput=e=>this.buscarCobertura(e.target.value);document.getElementById("apGuardarAsistencia").onclick=()=>this.guardarAsistencia();},
 buscarCobertura(q){q=this.n(q);const c=document.getElementById("apResultadosCobertura"),lista=(this.datos.disponiblesCobertura||[]).filter(x=>!this.coberturas.some(y=>String(y.idEmpleado)===String(x.idEmpleado))&&(!q||this.n(x.nombre+" "+x.idEmpleado).includes(q))).slice(0,8);c.innerHTML=q?lista.map(x=>`<button type="button" data-ap-cobertura="${this.e(x.idEmpleado)}"><b>${this.e(x.nombre)}</b><small>${this.e(x.idEmpleado)} · ${this.e(x.turno)}</small></button>`).join(""):"";c.querySelectorAll("[data-ap-cobertura]").forEach(b=>b.onclick=()=>this.agregarCobertura(b.dataset.apCobertura));},
 agregarCobertura(id){const x=(this.datos.disponiblesCobertura||[]).find(a=>String(a.idEmpleado)===String(id));if(!x)return;this.coberturas.push(x);const lineas=this.datos.lineasTrabajo||[],cubiertos=[...(this.datos.noRequeridos||[]),...(this.datos.colaboradores||[])];document.getElementById("apCoberturasLista").insertAdjacentHTML("beforeend",`<article class="ap-colaborador ap-es-cobertura" data-empleado-id="${this.e(x.idEmpleado)}" data-cobertura="SI"><div class="ap-identidad"><span class="ap-avatar"><i class="fa-solid fa-people-arrows"></i></span><div><strong>${this.e(x.nombre)}</strong><small>Cobertura desde ${this.e(x.turno)}</small></div></div><label>Razón<select class="ap-motivo-cobertura"><option value="">Seleccione</option><option>CUBRIENDO VACACIONES</option><option>CUBRIENDO BONO FELICIDAD</option><option>CUBRIENDO LICENCIA MEDICA</option><option>CUBRIENDO AUSENCIA INJUSTIFICADA</option><option>OTRA COBERTURA</option></select></label><label>Cubre a<select class="ap-cubierto"><option value="">Seleccione</option>${cubiertos.map(c=>`<option value="${this.e(c.empleadoId||c.idEmpleado)}" data-nombre="${this.e(c.nombre)}">${this.e(c.nombre)}</option>`).join("")}</select></label><label>Línea<select class="ap-linea"><option value="">Seleccione</option>${lineas.map(l=>`<option>${this.e(l)}</option>`).join("")}</select></label><label>Comentario<input class="ap-comentario-input" placeholder="Opcional"></label><button type="button" class="ap-quitar"><i class="fa-solid fa-xmark"></i></button></article>`);document.getElementById("apBuscarCobertura").value="";document.getElementById("apResultadosCobertura").innerHTML="";document.querySelectorAll(".ap-quitar").forEach(b=>b.onclick=()=>b.closest(".ap-colaborador").remove());},
 async guardarAsistencia(){const registros=[];document.querySelectorAll(".ap-colaborador").forEach(a=>{const cobertura=a.dataset.cobertura==="SI";if(cobertura){const cub=a.querySelector(".ap-cubierto"),opt=cub.options[cub.selectedIndex];registros.push({empleadoId:a.dataset.empleadoId,estadoAsistencia:"ASISTIO",esCobertura:"SI",motivoCobertura:a.querySelector(".ap-motivo-cobertura").value,empleadoCubiertoId:cub.value,empleadoCubiertoNombre:opt?opt.dataset.nombre||"":"",lineaTrabajo:a.querySelector(".ap-linea").value,comentario:a.querySelector(".ap-comentario-input").value});}else{const estado=a.querySelector(".ap-estado").value;if(estado)registros.push({empleadoId:a.dataset.empleadoId,estadoAsistencia:estado,tipoInasistencia:a.querySelector(".ap-tipo").value,detalleJustificacion:a.querySelector(".ap-detalle-input").value,comentario:a.querySelector(".ap-comentario-input").value,esCobertura:"NO"});}});if(!registros.length){Sistema.info("Registre al menos un colaborador.");return;}const coberturas=registros.filter(x=>x.esCobertura==="SI");if(coberturas.some(x=>!x.motivoCobertura||!x.empleadoCubiertoId||!x.lineaTrabajo)){Sistema.info("Complete razón, colaborador cubierto y línea de cada cobertura.");return;}this.cargar("Guardando asistencia","Registrando el turno y las coberturas.");try{const r=await API.post({action:"guardarAsistenciaPersonal",fecha:document.getElementById("apFecha").value,turno:document.getElementById("apTurno").value,registros});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible guardar.");Sistema.exito(r.mensaje);await this.abrirAsistencia(document.getElementById("apFecha").value,document.getElementById("apTurno").value);}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 async cargarColaboradores(){const r=await API.post({action:"listarColaboradoresGestionPersonal"});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible cargar colaboradores.");return r.data.colaboradores||[];},
 opcionesColaboradores(lista){return `<option value="">Seleccione...</option>${lista.map(x=>`<option value="${this.e(x.idEmpleado)}">${this.e(x.nombre)} · ${this.e(x.turno)}</option>`).join("")}`;},
 async abrirVacaciones(){this.cargar("Cargando vacaciones","Consultando colaboradores y períodos.");try{const [cols,r]=await Promise.all([this.cargarColaboradores(),API.post({action:"listarVacacionesPersonal"})]);if(!r||!r.ok)throw new Error(r.mensaje);this.modal("Vacaciones",`<section class="ap-modulo"><div class="ap-form-bloque"><div class="ap-grid-form"><label>Colaborador<select id="apVacEmpleado">${this.opcionesColaboradores(cols)}</select></label><label>Desde<input id="apVacInicio" type="date"></label><label>Hasta<input id="apVacFinal" type="date"></label><label class="ancho">Comentario<input id="apVacComentario" placeholder="Opcional"></label></div><div class="ap-acciones"><button id="apGuardarVacaciones">Registrar vacaciones</button></div></div>${this.listaSimple(r.data.registros||[],"Empleado_Nombre","Fecha_Inicio","Fecha_Final","Estado")}</section>`);document.getElementById("apGuardarVacaciones").onclick=()=>this.guardarVacaciones();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 async guardarVacaciones(){this.cargar("Guardando vacaciones","Actualizando la disponibilidad del colaborador.");try{const r=await API.post({action:"registrarVacacionesPersonal",empleadoId:document.getElementById("apVacEmpleado").value,fechaInicio:document.getElementById("apVacInicio").value,fechaFinal:document.getElementById("apVacFinal").value,comentario:document.getElementById("apVacComentario").value});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);await this.abrirVacaciones();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 async abrirBono(){this.cargar("Cargando Bono Felicidad","Consultando beneficios programados.");try{const [cols,r]=await Promise.all([this.cargarColaboradores(),API.post({action:"listarBonosFelicidad"})]);if(!r||!r.ok)throw new Error(r.mensaje);this.modal("Bono Felicidad",`<section class="ap-modulo"><div class="ap-form-bloque"><div class="ap-grid-form"><label>Colaborador<select id="apBonoEmpleado">${this.opcionesColaboradores(cols)}</select></label><label>Fecha del bono<input id="apBonoFecha" type="date"></label><label class="ancho">Comentario<input id="apBonoComentario" placeholder="Opcional"></label></div><div class="ap-acciones"><button id="apGuardarBono">Registrar bono</button></div></div>${this.listaSimple(r.data.registros||[],"Empleado_Nombre","Fecha_Bono","Turno","Estado")}</section>`);document.getElementById("apGuardarBono").onclick=()=>this.guardarBono();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 async guardarBono(){this.cargar("Guardando Bono Felicidad","Actualizando la disponibilidad del colaborador.");try{const r=await API.post({action:"registrarBonoFelicidad",empleadoId:document.getElementById("apBonoEmpleado").value,fechaBono:document.getElementById("apBonoFecha").value,comentario:document.getElementById("apBonoComentario").value});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);await this.abrirBono();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 async abrirAmonestacion(){
  this.cargar("Cargando amonestaciones","Consultando colaboradores y documentos pendientes.");
  try{
   const [cols,r]=await Promise.all([this.cargarColaboradores(),API.post({action:"listarAmonestacionesPendientes",pagina:1,limite:12})]);
   if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible consultar las amonestaciones.");
   const datos=r.data||{};
   this.colaboradoresAmonestacion=cols;
   this.amonestacionesPendientes=datos.pendientes||datos.registros||[];
   this.amonestacionesHistorico=datos.historico||[];
   this.amonestacionesHistoricoPagina=1;
   this.amonestacionesHistoricoHayMas=datos.hayMasHistorico===true;
   this.amonestacionesHistoricoTotal=Number(datos.totalHistorico||this.amonestacionesHistorico.length);
   this.amonestacionActivaId="";
   this.amonestacionesVisibles=12;
   this.modal("Amonestaciones",`<section class="ap-modulo ap-modulo-amonestaciones"><div class="ap-form-bloque"><div id="apAmoEdicion" class="ap-edicion-pendiente" hidden><i class="fa-solid fa-file-pen"></i><span>Gestionando una amonestación pendiente.</span><button id="apCancelarAmo" type="button">Cancelar</button></div><div class="ap-grid-form"><label>Colaborador<select id="apAmoEmpleado">${this.opcionesColaboradores(cols)}</select></label><label>Fecha<input id="apAmoFecha" type="date" value="${this.hoy()}"></label><label class="ancho">Causa<input id="apAmoCausa" placeholder="Indique la causa de la amonestación"></label><label class="ancho">Comentario<textarea id="apAmoComentario" placeholder="Agregue una observación para Recursos Humanos"></textarea></label><div class="ancho ap-archivo-campo"><span class="ap-archivo-etiqueta">Formulario firmado PDF</span><label for="apAmoArchivo" class="ap-archivo-selector"><span class="ap-archivo-boton"><i class="fa-solid fa-file-arrow-up"></i> Seleccionar PDF</span><span id="apAmoArchivoNombre" class="ap-archivo-nombre">Ningún documento seleccionado</span></label><input id="apAmoArchivo" class="ap-archivo-input" type="file" accept=".pdf,application/pdf"></div></div><div class="ap-acciones"><button id="apGuardarAmo"><i class="fa-solid fa-paper-plane"></i> Registrar y enviar a RR. HH.</button></div></div><div class="ap-pendientes-encabezado"><strong>Amonestaciones pendientes</strong><span>${this.amonestacionesPendientes.length}</span></div><div id="apAmonestacionesLista"></div><section class="ap-historico-amonestaciones"><div class="ap-pendientes-encabezado"><strong>Histórico de amonestaciones</strong><span id="apAmoHistoricoTotal">${this.amonestacionesHistoricoTotal}</span></div><div class="ap-historico-filtros"><label>Colaborador<select id="apAmoHistEmpleado">${this.opcionesColaboradores(cols).replace("Seleccione...","Todos los colaboradores")}</select></label><label>Mes<input id="apAmoHistPeriodo" type="month"></label><label>Estado<select id="apAmoHistEstado"><option value="">Todos los estados</option><option value="ENVIADA RRHH">Enviada a RR. HH.</option><option value="ANULADA">Anulada</option></select></label><div class="ap-historico-acciones"><button id="apAmoAplicarFiltros" type="button"><i class="fa-solid fa-filter"></i> Aplicar</button><button id="apAmoLimpiarFiltros" type="button" class="ap-historico-limpiar"><i class="fa-solid fa-xmark"></i> Limpiar</button></div></div><div id="apAmonestacionesHistorico"></div></section></section>`);
   document.getElementById("apGuardarAmo").onclick=()=>this.guardarAmonestacion();
   document.getElementById("apCancelarAmo").onclick=()=>this.cancelarAmonestacionActiva();
   document.getElementById("apAmoArchivo").onchange=e=>{
    const archivo=e.target.files[0];
    document.getElementById("apAmoArchivoNombre").textContent=archivo?archivo.name:"Ningún documento seleccionado";
   };
   this.renderAmonestacionesPendientes();
   this.renderHistoricoAmonestaciones();
   document.getElementById("apAmoAplicarFiltros").onclick=()=>this.cargarHistoricoAmonestaciones(true);
   document.getElementById("apAmoLimpiarFiltros").onclick=()=>{document.getElementById("apAmoHistEmpleado").value="";document.getElementById("apAmoHistPeriodo").value="";document.getElementById("apAmoHistEstado").value="";this.cargarHistoricoAmonestaciones(true);};
  }catch(e){Sistema.error(e.message);}finally{this.ocultar();}
 },
 renderHistoricoAmonestaciones(){
  const lista=this.amonestacionesHistorico||[],contenedor=document.getElementById("apAmonestacionesHistorico");
  if(!contenedor)return;
  contenedor.innerHTML=`<div class="ap-listado-simple ap-listado-amonestaciones ap-listado-historico">${lista.map(a=>{const archivo=String(a.Archivo_URL||"").trim(),estado=this.n(a.Estado),clase=estado==="ANULADA"?"ap-estado-anulado":"ap-estado-enviado";return`<article class="ap-amonestacion-fila"><div><strong>${this.e(a.Empleado_Nombre)}</strong><span>${this.e(a.Fecha_Incidencia)} · ${this.e(a.Causa||a.Tipo_Amonestacion)}</span><small>${this.e(a.ID_Amonestacion)}${a.Registrado_Por_Nombre?` · Registrada por ${this.e(a.Registrado_Por_Nombre)}`:""}</small></div><em class="${clase}">${this.e(a.Estado)}</em>${archivo?`<a class="ap-ver-documento" href="${this.e(archivo)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i> Ver PDF</a>`:'<span class="ap-sin-documento">Sin documento</span>'}</article>`}).join("")||"<div class='ap-vacio'>No hay amonestaciones en el histórico para los filtros seleccionados.</div>"}</div>${this.amonestacionesHistoricoHayMas?`<button id="apCargarMasHistoricoAmonestaciones" type="button" class="ap-cargar-mas">Cargar más del histórico</button>`:""}`;
  const total=document.getElementById("apAmoHistoricoTotal");if(total)total.textContent=String(this.amonestacionesHistoricoTotal||0);
  const cargarMas=document.getElementById("apCargarMasHistoricoAmonestaciones");if(cargarMas)cargarMas.onclick=()=>this.cargarHistoricoAmonestaciones(false);
 },
 async cargarHistoricoAmonestaciones(reiniciar){
  const pagina=reiniciar?1:(this.amonestacionesHistoricoPagina||1)+1;
  this.cargar("Cargando histórico","Consultando las amonestaciones registradas.");
  try{
   const r=await API.post({action:"listarAmonestacionesPendientes",pagina,limite:12,empleadoId:document.getElementById("apAmoHistEmpleado")?.value||"",periodo:document.getElementById("apAmoHistPeriodo")?.value||"",estado:document.getElementById("apAmoHistEstado")?.value||""});
   if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible consultar el histórico.");
   const datos=r.data||{},nuevos=datos.historico||[];
   this.amonestacionesHistorico=reiniciar?nuevos:(this.amonestacionesHistorico||[]).concat(nuevos);
   this.amonestacionesHistoricoPagina=pagina;
   this.amonestacionesHistoricoHayMas=datos.hayMasHistorico===true;
   this.amonestacionesHistoricoTotal=Number(datos.totalHistorico||0);
   this.renderHistoricoAmonestaciones();
  }catch(e){Sistema.error(e.message);}finally{this.ocultar();}
 },
 renderAmonestacionesPendientes(){
  const lista=this.amonestacionesPendientes||[],contenedor=document.getElementById("apAmonestacionesLista");
  if(!contenedor)return;
  contenedor.innerHTML=`<div class="ap-listado-simple ap-listado-amonestaciones">${lista.slice(0,this.amonestacionesVisibles||12).map(a=>`<article class="ap-amonestacion-fila"><div><strong>${this.e(a.Empleado_Nombre)}</strong><span>${this.e(a.Fecha_Incidencia)} · ${this.e(a.Causa||a.Tipo_Amonestacion)}</span></div><em class="${this.n(a.Estado)==="VENCIDA"?"ap-estado-vencido":""}">${this.e(a.Estado)}</em><button type="button" class="ap-gestionar-amonestacion" data-ap-gestionar-amo="${this.e(a.ID_Amonestacion)}"><i class="fa-solid fa-pen-to-square"></i> Gestionar</button></article>`).join("")||"<div class='ap-vacio'>No hay amonestaciones pendientes.</div>"}</div>${lista.length>(this.amonestacionesVisibles||12)?`<button id="apCargarMasAmonestaciones" type="button" class="ap-cargar-mas">Cargar más pendientes</button>`:""}`;
  contenedor.querySelectorAll("[data-ap-gestionar-amo]").forEach(b=>b.onclick=()=>this.gestionarAmonestacion(b.dataset.apGestionarAmo));
  const cargarMas=document.getElementById("apCargarMasAmonestaciones");
  if(cargarMas)cargarMas.onclick=()=>{this.amonestacionesVisibles=(this.amonestacionesVisibles||12)+12;this.renderAmonestacionesPendientes();};
 },
 gestionarAmonestacion(id){
  const amonestacion=(this.amonestacionesPendientes||[]).find(a=>String(a.ID_Amonestacion)===String(id));
  if(!amonestacion){Sistema.info("Esta amonestación ya no se encuentra disponible.");return;}
  this.amonestacionActivaId=String(amonestacion.ID_Amonestacion);
  const empleado=document.getElementById("apAmoEmpleado"),fecha=document.getElementById("apAmoFecha");
  if(![...empleado.options].some(opcion=>String(opcion.value)===String(amonestacion.Empleado_ID))){
   empleado.insertAdjacentHTML("beforeend",`<option value="${this.e(amonestacion.Empleado_ID)}">${this.e(amonestacion.Empleado_Nombre)}</option>`);
  }
  empleado.value=String(amonestacion.Empleado_ID||"");
  fecha.value=String(amonestacion.Fecha_Incidencia||"").slice(0,10);
  empleado.disabled=true;
  fecha.disabled=true;
  document.getElementById("apAmoCausa").value=amonestacion.Causa||"";
  document.getElementById("apAmoComentario").value=amonestacion.Comentario||"";
  document.getElementById("apAmoArchivo").value="";
  document.getElementById("apAmoArchivoNombre").textContent="Seleccione el documento firmado";
  document.getElementById("apAmoEdicion").hidden=false;
  document.getElementById("apGuardarAmo").innerHTML='<i class="fa-solid fa-paper-plane"></i> Guardar documento y enviar a RR. HH.';
  document.querySelector(".ap-modulo-amonestaciones .ap-form-bloque").scrollIntoView({behavior:"smooth",block:"start"});
  document.getElementById("apAmoCausa").focus();
 },
 cancelarAmonestacionActiva(){
  this.amonestacionActivaId="";
  const empleado=document.getElementById("apAmoEmpleado"),fecha=document.getElementById("apAmoFecha");
  empleado.disabled=false;empleado.value="";
  fecha.disabled=false;fecha.value=this.hoy();
  document.getElementById("apAmoCausa").value="";
  document.getElementById("apAmoComentario").value="";
  document.getElementById("apAmoArchivo").value="";
  document.getElementById("apAmoArchivoNombre").textContent="Ningún documento seleccionado";
  document.getElementById("apAmoEdicion").hidden=true;
  document.getElementById("apGuardarAmo").innerHTML='<i class="fa-solid fa-paper-plane"></i> Registrar y enviar a RR. HH.';
 },
 async guardarAmonestacion(){
  const archivo=document.getElementById("apAmoArchivo").files[0],empleadoId=document.getElementById("apAmoEmpleado").value,causa=document.getElementById("apAmoCausa").value.trim(),comentario=document.getElementById("apAmoComentario").value.trim();
  if(!empleadoId){Sistema.info("Seleccione el colaborador.");return;}
  if(!causa){Sistema.info("Indique la causa de la amonestación.");return;}
  if(!archivo){Sistema.info("Seleccione el formulario firmado en PDF.");return;}
  if(archivo.type&&archivo.type!=="application/pdf"||!archivo.name.toLowerCase().endsWith(".pdf")){Sistema.info("El documento debe estar en formato PDF.");return;}
  this.cargar("Enviando amonestación","Guardando el expediente y notificando a RR. HH.");
  try{
   let idAmonestacion=this.amonestacionActivaId||"";
   if(!idAmonestacion){
    const registro=await API.post({action:"registrarAmonestacionPersonal",empleadoId,fechaIncidencia:document.getElementById("apAmoFecha").value,causa,comentario});
    if(!registro||!registro.ok)throw new Error(registro&&registro.mensaje||"No fue posible registrar la amonestación.");
    idAmonestacion=String(registro.data.idAmonestacion);
    this.amonestacionActivaId=idAmonestacion;
   }
   const envio=await API.post({action:"subirDocumentoAmonestacion",idAmonestacion,causa,comentario,archivoBase64:await this.base64(archivo)});
   if(!envio||!envio.ok)throw new Error(envio&&envio.mensaje||"La amonestación quedó pendiente, pero el documento no pudo enviarse.");
   Sistema.exito(envio.mensaje);
   await this.abrirAmonestacion();
  }catch(e){Sistema.error(e.message);}finally{this.ocultar();}
 },
 async abrirTrabajoExtra(){if(!this.puedeGestionar())return;this.modal("Trabajo extraordinario",`<section class="ap-selector-extra"><button id="apCrearJornada"><i class="fa-solid fa-calendar-plus"></i><b>Registrar jornada</b><span>Definir fecha, turnos, líneas y cupos.</span></button><button id="apAsignarJornada"><i class="fa-solid fa-users-gear"></i><b>Asignar personal</b><span>Completar grupos y colaboradores.</span></button></section>`);document.getElementById("apCrearJornada").onclick=()=>this.abrirCrearJornada();document.getElementById("apAsignarJornada").onclick=()=>this.abrirAsignarJornada();},
 async obtenerCatalogosExtra(){if(this.catalogos)return this.catalogos;const r=await API.post({action:"obtenerCatalogosJornadaExtraordinaria"});if(!r||!r.ok)throw new Error(r.mensaje);return this.catalogos=r.data;},
 async abrirCrearJornada(){if(!this.puedeCrearExtras()){Sistema.info("Solo encargado o administrador puede registrar jornadas.");return;}this.cargar("Preparando jornada","Cargando turnos, líneas y supervisores.");try{const c=await this.obtenerCatalogosExtra();this.modal("Registrar trabajo extraordinario",`<section class="ap-modulo"><div class="ap-grid-form"><label>Fecha<input id="apJeFecha" type="date"></label><label>Tipo<select id="apJeTipo"><option>FERIADO</option><option>FIN DE SEMANA</option><option>NORMAL</option></select></label><label>¿Habrá despacho?<select id="apJeDespacho"><option value="NO">No</option><option value="SI">Sí</option></select></label><label>Fecha límite<input id="apJeLimite" type="date"></label><label class="ancho">Descripción<input id="apJeDescripcion"></label></div><div class="ap-turnos-extra">${c.turnos.map(t=>this.bloqueTurno(t,c)).join("")}</div><div class="ap-acciones ap-doble"><button id="apGuardarBorrador" class="ap-gris">Guardar borrador</button><button id="apPublicarJornada">Publicar jornada</button></div></section>`);document.getElementById("apGuardarBorrador").onclick=()=>this.guardarJornada(false);document.getElementById("apPublicarJornada").onclick=()=>this.guardarJornada(true);document.querySelectorAll(".ap-turno-check").forEach(x=>x.onchange=()=>x.closest(".ap-turno-extra").classList.toggle("seleccionado",x.checked));document.querySelectorAll(".ap-agregar-linea").forEach(b=>b.onclick=()=>this.agregarLineaTurno(b.closest(".ap-turno-extra"),c.lineas));}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 bloqueTurno(t,c){return `<article class="ap-turno-extra" data-turno="${this.e(t.codigo)}"><header><label><input type="checkbox" class="ap-turno-check"> Turno ${this.e(t.codigo)} · ${this.e(t.nombre)}</label><span>${this.e(t.horaInicio)}–${this.e(t.horaFinal)}</span></header><div class="ap-turno-cuerpo"><label>Supervisor<select class="ap-turno-supervisor"><option value="">Seleccione</option>${c.supervisores.map(s=>`<option value="${this.e(s.id)}">${this.e(s.nombre)}</option>`).join("")}</select></label><div class="ap-lineas-turno"></div><button type="button" class="ap-secundario ap-agregar-linea">+ Agregar línea</button></div></article>`;},
 agregarLineaTurno(b,lineas){b.querySelector(".ap-lineas-turno").insertAdjacentHTML("beforeend",`<div class="ap-linea-extra"><select><option value="" selected disabled>Seleccione línea...</option>${lineas.map(l=>`<option>${this.e(l)}</option>`).join("")}</select><input type="number" min="1" placeholder="Cantidad"><button type="button" onclick="this.parentElement.remove()">×</button></div>`);},
 async guardarJornada(publicar){const turnos=[...document.querySelectorAll(".ap-turno-extra")].filter(b=>b.querySelector(".ap-turno-check").checked).map(b=>({codigo:b.dataset.turno,supervisorId:b.querySelector(".ap-turno-supervisor").value,lineas:[...b.querySelectorAll(".ap-linea-extra")].map(x=>({linea:x.querySelector("select").value,cantidad:x.querySelector("input").value}))}));if(turnos.some(t=>t.lineas.some(l=>!l.linea))){Sistema.info("Seleccione la línea de trabajo para cada posición agregada.");return;}this.cargar("Guardando jornada","Registrando turnos, líneas y necesidades.");try{const r=await API.post({action:"crearJornadaExtraordinaria",fechaTrabajo:document.getElementById("apJeFecha").value,tipoJornada:document.getElementById("apJeTipo").value,habraDespacho:document.getElementById("apJeDespacho").value,fechaLimiteAsignacion:document.getElementById("apJeLimite").value,descripcion:document.getElementById("apJeDescripcion").value,turnos,publicar:publicar?"SI":"NO"});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);await this.abrirAsignarJornada();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 async abrirAsignarJornada(){this.cargar("Cargando jornadas","Consultando jornadas publicadas y asignaciones.");try{const [r,c]=await Promise.all([API.post({action:"listarJornadasExtraordinarias"}),this.obtenerCatalogosExtra()]);if(!r||!r.ok)throw new Error(r.mensaje);this.modal("Asignar personal extraordinario",`<section class="ap-modulo ap-jornadas">${(r.data.jornadas||[]).filter(j=>!['FINALIZADA','CANCELADA'].includes(this.n(j.Estado))).map(j=>this.tarjetaJornada(j,c)).join("")||"<div class='ap-vacio'>No hay jornadas disponibles.</div>"}</section>`);document.querySelectorAll("[data-ap-grupo]").forEach(b=>b.onclick=()=>{const articulo=b.closest("article"),selector=articulo.querySelector(".ap-grupo-carga");if(selector.disabled){selector.disabled=false;b.textContent="Guardar grupo";b.dataset.reemplazar="SI";return;}this.definirGrupoCarga(b.dataset.apGrupo,selector.value,b.dataset.reemplazar==="SI");});document.querySelectorAll("[data-ap-guardar-turno]").forEach(b=>b.onclick=()=>this.guardarAsignacionesTurno(b));}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 tarjetaJornada(j,c){const grupo=String(j.Grupo_Carga_Regular||"").trim(),turnos=[...new Set((j.detalles||[]).map(d=>String(d.Turno)))],activos=(j.personal||[]).filter(p=>this.n(p.Estado_Asignacion)!=="CANCELADA");return `<article class="ap-jornada" data-jornada="${this.e(j.ID_Jornada)}"><header><div><b>${this.e(j.Fecha_Trabajo)} · ${this.e(j.Tipo_Jornada)}</b><span>${this.e(j.Descripcion)}</span></div><em>${this.e(j.Estado)}</em></header>${this.n(j.Habra_Despacho)==="SI"?`<div class="ap-carga-regular"><select class="ap-grupo-carga" ${grupo?"disabled":""}><option value="">Grupo regular de carga</option>${["4-3 A","4-3 B"].map(g=>`<option value="${g}" ${grupo===g?"selected":""}>${g}</option>`).join("")}</select><button data-ap-grupo="${this.e(j.ID_Jornada)}">${grupo?"Editar":"Cargar grupo"}</button></div>`:""}${turnos.map((turno,indice)=>`<details class="ap-turno-asignacion" ${indice===0?"open":""}><summary><b>Turno ${this.e(turno)}</b></summary>${(j.detalles||[]).filter(d=>String(d.Turno)===turno).map(d=>{const asignados=activos.filter(p=>String(p.ID_Detalle_Jornada)===String(d.ID_Detalle_Jornada)),cupos=Math.max(0,Number(d.Cantidad_Requerida||0)-asignados.length);return `<section class="ap-linea-asignacion"><header><b>${this.e(d.Linea_Trabajo)}</b> <span>${asignados.length}/${this.e(d.Cantidad_Requerida)}</span></header>${asignados.map(p=>`<div class="ap-persona-asignada">${this.e(p.Empleado_Nombre)}${this.n(p.Es_Trabajo_Corrido)==="SI"?" · Corrido":""}</div>`).join("")}${Array.from({length:cupos},()=>`<div class="ap-detalle-jornada" data-detalle="${this.e(d.ID_Detalle_Jornada)}"><select class="ap-persona-extra"><option value="" selected>Seleccionar colaborador...</option>${c.colaboradores.map(x=>`<option value="${this.e(x.id)}">${this.e(x.nombre)} · ${this.e(x.turno)}</option>`).join("")}</select><label><input type="checkbox" class="ap-corrido"> Corrido</label></div>`).join("")}</section>`;}).join("")}<div class="ap-acciones"><button data-ap-guardar-turno="${this.e(turno)}">Guardar turno ${this.e(turno)}</button></div></details>`).join("")}</article>`;},
 async definirGrupoCarga(id,grupo,reemplazar){if(!grupo){Sistema.info("Seleccione el grupo 4-3.");return;}this.cargar(reemplazar?"Actualizando grupo de carga":"Agregando grupo de carga","Incorporando el personal regular sin generar horas extras.");try{const r=await API.post({action:"definirGrupoCargaJornada",idJornada:id,grupoCarga:grupo,reemplazarGrupo:reemplazar?"SI":"NO"});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);await this.abrirAsignarJornada();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 async guardarAsignacionesTurno(boton){const bloque=boton.closest(".ap-turno-asignacion"),jornada=boton.closest(".ap-jornada"),asignaciones=[...bloque.querySelectorAll(".ap-detalle-jornada")].map(fila=>({idDetalleJornada:fila.dataset.detalle,empleadoId:fila.querySelector(".ap-persona-extra").value,trabajoCorrido:fila.querySelector(".ap-corrido").checked?"SI":"NO"})).filter(item=>item.empleadoId);if(!asignaciones.length){Sistema.info("Seleccione al menos un colaborador para guardar el turno.");return;}const claves=asignaciones.map(item=>item.idDetalleJornada+"::"+item.empleadoId);if(new Set(claves).size!==claves.length){Sistema.info("Un colaborador no puede repetirse en la misma línea.");return;}this.cargar("Guardando turno","Registrando todos los colaboradores seleccionados.");try{const r=await API.post({action:"asignarPersonalJornadaLote",idJornada:jornada.dataset.jornada,asignaciones});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible guardar las asignaciones.");Sistema.exito(r.mensaje);await this.abrirAsignarJornada();}catch(error){Sistema.error(error.message);await this.abrirAsignarJornada();}finally{this.ocultar();}},
 async asignarDesdeFila(b){const fila=b.closest(".ap-detalle-jornada"),j=b.closest(".ap-jornada"),empleadoId=fila.querySelector(".ap-persona-extra").value;if(!empleadoId){Sistema.info("Seleccione un candidato antes de asignarlo.");return;}this.cargar("Asignando colaborador","Validando turno, línea y tipo de horas.");try{const r=await API.post({action:"asignarPersonalJornada",idJornada:j.dataset.jornada,idDetalleJornada:b.dataset.apAsignar,empleadoId:empleadoId,trabajoCorrido:fila.querySelector(".ap-corrido").checked?"SI":"NO"});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);await this.abrirAsignarJornada();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}},
 listaSimple(lista,a,b,c,d){return `<div class="ap-listado-simple">${lista.slice(0,30).map(x=>`<article><strong>${this.e(x[a])}</strong><span>${this.e(x[b])} · ${this.e(x[c])}</span><em>${this.e(x[d])}</em></article>`).join("")||"<div class='ap-vacio'>No hay registros.</div>"}</div>`;},
 async cargarAvisos(pagina,limite){
  try{
   const r=await API.post({action:"obtenerAvisosAsistenciaUsuario",pagina:pagina||1,limite:limite||20});
   if(!r||!r.ok)return{avisos:[],total:0};

   const datos=r.data||{};
   const sesion=Sistema.obtenerSesion()||{};
   const rol=this.n(sesion.rol);
   const recibeSolicitudesEPP=["ANALISTA","SUPERVISOR","ENCARGADO","ADMINISTRADOR"].some(nombre=>rol.includes(nombre));

   if(recibeSolicitudesEPP)return datos;

   const avisos=(datos.avisos||[]).filter(aviso=>{
    const tipo=this.n(aviso.Tipo);
    return tipo!=="EPP SOLICITUD"&&tipo!=="EPP AUTORIZACION";
   });

   return Object.assign({},datos,{avisos,total:avisos.length});
  }catch(e){return{avisos:[],total:0};}
 },
 async abrirAvisos(pagina,anteriores){
  this.cargar("Cargando avisos","Consultando sus comunicaciones pendientes.");
  try{
   const d=await this.cargarAvisos(pagina||1,20),avisos=[...(anteriores||[]),...(d.avisos||[])];
   this.avisosActuales=avisos;
   const seleccionables=avisos.filter(a=>this.n(a.Tipo)!=="RECEPCION VACIA");
   this.modal("Mis avisos",`<section class="ap-modulo ap-centro-avisos">${this.puedeGestionar()?`<header class="ap-avisos-cabecera"><div><strong>Centro de avisos</strong><span>Comunicaciones internas del equipo</span></div><button id="apAbrirCrearAviso" type="button"><i class="fa-solid fa-bullhorn"></i> Crear aviso</button></header><div id="apAvisoFormulario"></div>`:""}${seleccionables.length?`<div id="apBarraSeleccionAvisos" class="ap-avisos-seleccion"><label class="ap-seleccionar-todos"><input id="apSeleccionarTodosAvisos" type="checkbox"><span>Seleccionar todos</span></label><div><span id="apTotalAvisosSeleccionados">0 seleccionados</span><button id="apMarcarAvisosSeleccionados" type="button" disabled><i class="fa-solid fa-check-double"></i> Marcar seleccionados como leídos</button></div></div>`:""}<section class="ap-avisos">${avisos.map(a=>{const especial=this.n(a.Tipo)==="RECEPCION VACIA";return `<article data-aviso-id="${this.e(a.ID_Aviso)}" data-prioridad="${this.e(this.n(a.Tipo))}" data-seleccionable="${especial?"NO":"SI"}">${especial?'<span class="ap-aviso-seleccion-vacia" aria-hidden="true"></span>':`<label class="ap-aviso-seleccion" title="Seleccionar aviso"><input type="checkbox" data-ap-seleccionar-aviso value="${this.e(a.ID_Aviso)}" aria-label="Seleccionar ${this.e(a.Titulo)}"><span></span></label>`}<i class="fa-solid ${this.n(a.Tipo)==="URGENTE"?"fa-triangle-exclamation":"fa-bell"}"></i><div class="ap-aviso-contenido"><strong>${this.e(a.Titulo)}</strong><p>${this.e(a.Mensaje)}</p><small>${this.e(a.Fecha_Creacion)}${["IMPORTANTE","URGENTE"].includes(this.n(a.Tipo))?` · ${this.e(a.Tipo)}`:""}</small></div>${especial?`<button data-ap-aprobar-recepcion="${this.e(a.Referencia_ID)}">Aprobar eliminación</button>`:`<button data-ap-leer="${this.e(a.ID_Aviso)}">Marcar leído</button>`}</article>`;}).join("")||"<div class='ap-vacio'>No tiene avisos pendientes.</div>"}</section>${d.hayMas?'<button id="apCargarMasAvisos" type="button" class="ap-cargar-mas">Cargar más avisos</button>':""}</section>`);
   const crear=document.getElementById("apAbrirCrearAviso"),cargarMas=document.getElementById("apCargarMasAvisos");
   if(crear)crear.onclick=()=>this.abrirCrearAviso();
   if(cargarMas)cargarMas.onclick=()=>this.abrirAvisos((d.pagina||1)+1,avisos);
   this.configurarSeleccionAvisos();
   document.querySelectorAll("[data-ap-leer]").forEach(b=>b.onclick=()=>this.marcarAvisoLeido(b));
   document.querySelectorAll('[data-aviso-id]').forEach(tarjeta=>{
    const aviso=avisos.find(a=>String(a.ID_Aviso)===String(tarjeta.dataset.avisoId));
    if(!aviso||this.n(aviso.Referencia_Tipo)!=="CENTRO_CONOCIMIENTO")return;
    const acciones=tarjeta.querySelector("button[data-ap-leer]");
    if(!acciones)return;
    const ir=document.createElement("button");ir.type="button";ir.className="ap-ir-conocimiento";ir.innerHTML='<i class="fa-solid fa-book-open"></i> Ir al Centro de conocimiento';
    ir.onclick=async()=>{Sistema.cerrarModal();if(window.activarMenu)activarMenu("menuCentroConocimiento");if(window.CentroConocimiento)await CentroConocimiento.cargar({documentoId:aviso.Referencia_ID});};
    acciones.before(ir);
   });
   document.querySelectorAll("[data-ap-aprobar-recepcion]").forEach(b=>b.onclick=async()=>{
    const confirmado=await Sistema.confirmar({titulo:"Eliminar recepción vacía",mensaje:"¿Autoriza eliminar esta recepción vacía y sin registros?",detalle:"Antes de eliminarla, el sistema comprobará nuevamente que no tenga materiales, cantidades ni líneas registradas.",tipo:"peligro",textoConfirmar:"Sí, eliminar",textoCancelar:"Cancelar"});
    if(!confirmado)return;
    this.cargar("Validando recepción","Confirmando que continúa vacía antes de eliminarla.");
    try{const r=await API.post({action:"aprobarEliminacionRecepcionVacia",idRecepcion:b.dataset.apAprobarRecepcion});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible eliminar la recepción.");Sistema.exito(r.mensaje);await this.abrirAvisos();}catch(error){Sistema.error(error.message);}finally{this.ocultar();}
   });
  }catch(e){Sistema.error(e.message);}finally{this.ocultar();}
 },
 configurarSeleccionAvisos(){
  const todos=document.getElementById("apSeleccionarTodosAvisos"),accion=document.getElementById("apMarcarAvisosSeleccionados");
  document.querySelectorAll("[data-ap-seleccionar-aviso]").forEach(c=>c.onchange=()=>this.actualizarSeleccionAvisos());
  if(todos)todos.onchange=()=>{document.querySelectorAll("[data-ap-seleccionar-aviso]").forEach(c=>{c.checked=todos.checked;});this.actualizarSeleccionAvisos();};
  if(accion)accion.onclick=()=>this.marcarAvisosSeleccionados();
  this.actualizarSeleccionAvisos();
 },
 actualizarSeleccionAvisos(){
  const casillas=[...document.querySelectorAll("[data-ap-seleccionar-aviso]")],seleccionadas=casillas.filter(c=>c.checked),todos=document.getElementById("apSeleccionarTodosAvisos"),total=document.getElementById("apTotalAvisosSeleccionados"),accion=document.getElementById("apMarcarAvisosSeleccionados");
  casillas.forEach(c=>c.closest("article")?.classList.toggle("seleccionado",c.checked));
  if(todos){todos.checked=casillas.length>0&&seleccionadas.length===casillas.length;todos.indeterminate=seleccionadas.length>0&&seleccionadas.length<casillas.length;}
  if(total)total.textContent=`${seleccionadas.length} seleccionado${seleccionadas.length===1?"":"s"}`;
  if(accion)accion.disabled=!seleccionadas.length;
 },
 async marcarAvisosSeleccionados(){
  const ids=[...document.querySelectorAll("[data-ap-seleccionar-aviso]:checked")].map(c=>c.value);
  if(!ids.length){Sistema.info("Seleccione al menos un aviso.");return;}
  await this.marcarAvisosLeidos(ids,document.getElementById("apMarcarAvisosSeleccionados"));
 },
 async marcarAvisosLeidos(ids,botonOrigen){
  const unicos=[...new Set((ids||[]).map(String).filter(Boolean))];
  if(!unicos.length)return;
  if(botonOrigen)botonOrigen.disabled=true;
  this.cargar(unicos.length===1?"Actualizando aviso":"Actualizando avisos",unicos.length===1?"Marcando la comunicación como leída.":"Marcando las comunicaciones seleccionadas como leídas.");
  try{
   const r=await API.post({action:"marcarAvisoAsistenciaLeido",idsAvisos:unicos,idAviso:unicos[0]});
   if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible marcar los avisos como leídos.");
   unicos.forEach(id=>[...document.querySelectorAll(".ap-avisos article[data-aviso-id]")].find(a=>a.dataset.avisoId===id)?.remove());
   this.avisosActuales=(this.avisosActuales||[]).filter(a=>!unicos.includes(String(a.ID_Aviso)));
   const lista=document.querySelector(".ap-avisos"),restantes=lista?[...lista.querySelectorAll("article")]:[];
   if(lista&&!restantes.length)lista.innerHTML="<div class='ap-vacio'>No tiene avisos pendientes.</div>";
   const barra=document.getElementById("apBarraSeleccionAvisos");
   if(barra&&!document.querySelector("[data-ap-seleccionar-aviso]"))barra.remove();
   this.actualizarSeleccionAvisos();
   if(unicos.length>1)Sistema.exito(r.mensaje||"Avisos actualizados correctamente.");
   document.dispatchEvent(new CustomEvent("avisosSistemaActualizados",{detail:{eliminados:Number(r.data&&r.data.eliminados||unicos.length)}}));
  }catch(error){Sistema.error(error.message);this.actualizarSeleccionAvisos();}finally{this.ocultar();}
 },
 async marcarAvisoLeido(boton){
  await this.marcarAvisosLeidos([boton.dataset.apLeer],boton);
 },
 async abrirCrearAviso(){
  if(!this.puedeGestionar()){Sistema.info("Su rol no puede crear avisos.");return;}
  this.cargar("Preparando aviso","Consultando colaboradores, roles y turnos disponibles.");
  try{
   const r=await API.post({action:"obtenerCatalogosAvisosSistema"});
   if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible cargar los destinatarios.");
   this.catalogosAvisos=r.data||{};
   const formulario=document.getElementById("apAvisoFormulario");
   formulario.innerHTML=`<section class="ap-form-bloque ap-aviso-formulario"><div class="ap-grid-form"><label>Título<input id="apAvisoTitulo" maxlength="120" placeholder="Asunto de la comunicación"></label><label>Prioridad<select id="apAvisoPrioridad"><option value="INFORMATIVO">Informativo</option><option value="IMPORTANTE">Importante</option><option value="URGENTE">Urgente</option></select></label><label class="ancho">Mensaje<textarea id="apAvisoMensaje" rows="3" maxlength="2000" placeholder="Escriba la información que recibirán los colaboradores"></textarea></label><label class="ancho">Destinatarios<select id="apAvisoAlcance"><option value="TODOS">Todos los colaboradores activos</option><option value="ROLES">Uno o varios roles</option><option value="TURNOS">Uno o varios turnos</option><option value="COLABORADORES">Uno o varios colaboradores específicos</option></select></label><div id="apAvisoSeleccion" class="ancho"></div></div><div class="ap-acciones ap-doble ap-aviso-acciones"><button id="apCancelarAviso" class="ap-gris" type="button">Cancelar</button><button id="apEnviarAviso" type="button"><i class="fa-solid fa-paper-plane"></i> Enviar aviso</button></div></section>`;
   document.getElementById("apAvisoAlcance").onchange=()=>this.renderSeleccionAviso();
   document.getElementById("apCancelarAviso").onclick=()=>{formulario.innerHTML="";};
   document.getElementById("apEnviarAviso").onclick=()=>this.guardarAvisoManual();
   this.renderSeleccionAviso();
   document.getElementById("apAvisoTitulo").focus();
  }catch(error){Sistema.error(error.message);}finally{this.ocultar();}
 },
 renderSeleccionAviso(){
  const alcance=document.getElementById("apAvisoAlcance").value,contenedor=document.getElementById("apAvisoSeleccion"),catalogos=this.catalogosAvisos||{};
  if(alcance==="TODOS"){contenedor.innerHTML=`<p class="ap-aviso-alcance-info"><i class="fa-solid fa-users"></i> Recibirán el aviso los ${Number((catalogos.colaboradores||[]).length)} usuarios activos.</p>`;return;}
  const elementos=alcance==="ROLES"?(catalogos.roles||[]).map(v=>({id:v,nombre:v})):alcance==="TURNOS"?(catalogos.turnos||[]).map(v=>({id:v,nombre:`Turno ${v}`})):(catalogos.colaboradores||[]).map(c=>({id:c.id,nombre:c.nombre,detalle:[c.rol,c.turno].filter(Boolean).join(" · ")}));
  contenedor.innerHTML=`<div class="ap-seleccion-multiple">${alcance==="COLABORADORES"?'<input id="apBuscarDestinatario" class="ap-destinatario-buscar" placeholder="Buscar colaborador por nombre, rol o código">':""}<div class="ap-destinatarios-lista">${elementos.map(item=>`<label class="ap-destinatario-opcion" data-busqueda="${this.e(this.n(`${item.nombre} ${item.detalle||""} ${item.id}`))}"><input type="checkbox" value="${this.e(item.id)}"><span><strong>${this.e(alcance==="COLABORADORES"?`${item.id} · ${item.nombre}`:item.nombre)}</strong>${item.detalle?`<small>${this.e(item.detalle)}</small>`:""}</span></label>`).join("")||"<div class='ap-vacio'>No hay destinatarios disponibles.</div>"}</div><span id="apTotalDestinatarios" class="ap-total-destinatarios">0 seleccionados</span></div>`;
  const actualizar=()=>{const total=contenedor.querySelectorAll('input[type="checkbox"]:checked').length;document.getElementById("apTotalDestinatarios").textContent=`${total} seleccionado${total===1?"":"s"}`;};
  contenedor.querySelectorAll('input[type="checkbox"]').forEach(c=>c.onchange=actualizar);
  const buscador=document.getElementById("apBuscarDestinatario");
  if(buscador)buscador.oninput=()=>{const texto=this.n(buscador.value);contenedor.querySelectorAll(".ap-destinatario-opcion").forEach(opcion=>{opcion.hidden=Boolean(texto)&&!opcion.dataset.busqueda.includes(texto);});};
 },
 async guardarAvisoManual(){
  const titulo=document.getElementById("apAvisoTitulo").value.trim(),mensaje=document.getElementById("apAvisoMensaje").value.trim(),prioridad=document.getElementById("apAvisoPrioridad").value,alcance=document.getElementById("apAvisoAlcance").value,seleccion=[...document.querySelectorAll('#apAvisoSeleccion input[type="checkbox"]:checked')].map(c=>c.value);
  if(!titulo){Sistema.info("Escriba el título del aviso.");return;}
  if(!mensaje){Sistema.info("Escriba el mensaje del aviso.");return;}
  if(alcance!=="TODOS"&&!seleccion.length){Sistema.info("Seleccione al menos un destinatario.");return;}
  const datos={action:"crearAvisoSistemaManual",titulo,mensaje,prioridad,alcance};
  if(alcance==="ROLES")datos.roles=seleccion;
  if(alcance==="TURNOS")datos.turnos=seleccion;
  if(alcance==="COLABORADORES")datos.empleadosIds=seleccion;
  this.cargar("Enviando aviso","Generando una comunicación independiente para cada destinatario.");
  try{const r=await API.post(datos);if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible enviar el aviso.");Sistema.exito(r.mensaje);await this.abrirAvisos();}catch(error){Sistema.error(error.message);}finally{this.ocultar();}
 },
 modal(t,h,o){Sistema.abrirModal(t,h,Object.assign({clase:"modal-asistencia-personal"},o||{}));},base64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]||"");r.onerror=rej;r.readAsDataURL(f);});},cargar(t,m){if(window.CargadorSistema)CargadorSistema.mostrar(t,m);},ocultar(){if(window.CargadorSistema)CargadorSistema.ocultar();},hoy(){const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;},n(v){return String(v||"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();},e(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
};

/* Extensión compatible: jornadas extraordinarias, inventario y marcación GPS. */
(function(AP){
 "use strict";
 if(!AP)return;

 AP.instalarEstilosAvanzados=function(){if(document.getElementById("apEstilosAvanzados"))return;const s=document.createElement("style");s.id="apEstilosAvanzados";s.textContent=".ap-jornadas-resumen{display:flex;flex-direction:column;gap:10px;margin-top:16px}.ap-jornada-resumen{padding:13px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.ap-jornada-resumen>header,.ap-jornada-resumen-acciones,.ap-carga-extra,.ap-inventario-cabecera,.ap-listado-grupo-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ap-jornada-resumen>header{justify-content:space-between}.ap-jornada-meta{color:#69717b;font-size:11px;margin:7px 0}.ap-jornada-resumen-acciones button,.ap-carga-extra button,.ap-guardar-inventario,.ap-marcacion-btn{min-height:34px;padding:0 11px;border:0;border-radius:8px;background:#cf173d;color:#fff;font:600 11px Poppins,sans-serif;cursor:pointer}.ap-jornada-resumen-acciones .ap-accion-secundaria{background:#f1f3f5;color:#283344}.ap-jornada-resumen-acciones .ap-accion-verde{background:#258942}.ap-carga-extra{padding:10px;margin-top:8px;border-radius:9px;background:#f4f6f8}.ap-carga-extra select,.ap-inventario-cupos select{min-height:35px;max-width:250px;padding:0 8px;border:1px solid #dce0e5;border-radius:7px;background:#fff}.ap-inventario-bloque{margin:12px 0;padding:12px;border:1px solid #dce8f5;border-radius:10px;background:#f8fbff}.ap-inventario-cupos{display:grid;gap:7px;margin:9px 0}.ap-listado-grupo{padding:12px 0;border-bottom:1px solid #e8eaed}.ap-listado-grupo-header i{color:#cf173d}.ap-listado-persona{padding:7px 0 7px 26px;color:#434a54}.ap-marcacion-acceso{position:fixed;right:18px;bottom:16px;z-index:35;display:flex;gap:7px}.ap-marcacion-btn{box-shadow:0 5px 17px #0002}.ap-tardanza-campo{min-width:110px}.ap-estado-finalizado{color:#258942;font-weight:700}@media(max-width:680px){.ap-carga-extra{align-items:stretch}.ap-carga-extra select,.ap-carga-extra button,.ap-jornada-resumen-acciones button{flex:1 1 100%;max-width:none}.ap-marcacion-acceso{right:10px;bottom:10px}.ap-jornada-resumen-acciones{display:grid;grid-template-columns:1fr}}";document.head.appendChild(s);};

 AP.filaAsistencia=function(c){const r=c.registro||{},estado=this.n(r.Estado_Asistencia||"");return `<article class="ap-colaborador" data-empleado-id="${this.e(c.idEmpleado)}" data-cobertura="NO"><div class="ap-identidad"><span class="ap-avatar"><i class="fa-solid fa-user"></i></span><div><strong>${this.e(c.nombre)}</strong><small>${this.e(c.rol)} · ${this.e(c.idEmpleado)}</small></div></div><label>Estado<select class="ap-estado"><option value="">Sin registrar</option><option value="ASISTIO" ${estado==="ASISTIO"?"selected":""}>Asistió</option><option value="TARDANZA" ${estado==="TARDANZA"?"selected":""}>Tardanza</option><option value="FALTO" ${estado==="FALTO"?"selected":""}>Faltó</option></select></label><label class="ap-tardanza-campo" ${estado==="TARDANZA"?"":"hidden"}>Hora de llegada<input type="time" class="ap-hora-llegada" value="${this.e(String(r.Hora_Entrada_Real||"").slice(0,5))}"></label><label class="ap-campo-falta" ${estado==="FALTO"?"":"hidden"}>Razón<select class="ap-tipo"><option value="">Seleccione</option>${["INJUSTIFICADA","MEDICA","OTRA JUSTIFICADA"].map(t=>`<option ${this.n(r.Tipo_Inasistencia)===t?"selected":""}>${t}</option>`).join("")}</select></label><label class="ap-detalle" ${this.n(r.Tipo_Inasistencia)==="OTRA JUSTIFICADA"?"":"hidden"}>Detalle<input class="ap-detalle-input" value="${this.e(r.Detalle_Justificacion||"")}"></label><label class="ap-comentario">Comentario<input class="ap-comentario-input" value="${this.e(r.Comentario||"")}" placeholder="Opcional"></label></article>`;};

 AP.eventosAsistencia=function(){const f=document.getElementById("apFecha"),t=document.getElementById("apTurno");f.onchange=()=>this.abrirAsistencia(f.value,t.value);t.onchange=()=>this.abrirAsistencia(f.value,t.value);document.querySelectorAll(".ap-estado").forEach(s=>s.onchange=()=>{const a=s.closest(".ap-colaborador");a.querySelector(".ap-campo-falta").hidden=s.value!=="FALTO";a.querySelector(".ap-tardanza-campo").hidden=s.value!=="TARDANZA";if(s.value!=="FALTO")a.querySelector(".ap-detalle").hidden=true;});document.querySelectorAll(".ap-tipo").forEach(s=>s.onchange=()=>s.closest(".ap-colaborador").querySelector(".ap-detalle").hidden=s.value!=="OTRA JUSTIFICADA");document.getElementById("apBuscarCobertura").oninput=e=>this.buscarCobertura(e.target.value);document.getElementById("apGuardarAsistencia").onclick=()=>this.guardarAsistencia();};

 AP.guardarAsistencia=async function(){const registros=[];for(const a of document.querySelectorAll(".ap-colaborador")){const cobertura=a.dataset.cobertura==="SI";if(cobertura){const cub=a.querySelector(".ap-cubierto"),opt=cub.options[cub.selectedIndex];registros.push({empleadoId:a.dataset.empleadoId,estadoAsistencia:"ASISTIO",esCobertura:"SI",motivoCobertura:a.querySelector(".ap-motivo-cobertura").value,empleadoCubiertoId:cub.value,empleadoCubiertoNombre:opt?opt.dataset.nombre||"":"",lineaTrabajo:a.querySelector(".ap-linea").value,comentario:a.querySelector(".ap-comentario-input").value});}else{const estado=a.querySelector(".ap-estado").value;if(estado){const hora=a.querySelector(".ap-hora-llegada").value;if(estado==="TARDANZA"&&!hora){Sistema.info("Indique la hora de llegada del colaborador con tardanza.");return;}registros.push({empleadoId:a.dataset.empleadoId,estadoAsistencia:estado,horaLlegada:hora,tipoInasistencia:a.querySelector(".ap-tipo").value,detalleJustificacion:a.querySelector(".ap-detalle-input").value,comentario:a.querySelector(".ap-comentario-input").value,esCobertura:"NO"});}}}if(!registros.length){Sistema.info("Registre al menos un colaborador.");return;}if(registros.some(x=>x.esCobertura==="SI"&&(!x.motivoCobertura||!x.empleadoCubiertoId||!x.lineaTrabajo))){Sistema.info("Complete razón, colaborador cubierto y línea de cada cobertura.");return;}const fecha=document.getElementById("apFecha").value,turno=document.getElementById("apTurno").value;this.cargar("Guardando asistencia","Registrando asistencia, tardanzas y coberturas.");try{const r=await API.post({action:"guardarAsistenciaPersonal",fecha,turno,registros});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible guardar.");Sistema.exito(r.mensaje);await this.abrirAsistencia(fecha,turno);}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};

 AP.abrirTrabajoExtra=async function(){if(!this.puedeGestionar())return;this.instalarEstilosAvanzados();this.cargar("Cargando jornadas","Consultando el personal y las jornadas extraordinarias.");try{const r=await API.post({action:"listarJornadasExtraordinarias"});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible consultar las jornadas.");const jornadas=r.data.jornadas||[];this.modal("Trabajo extraordinario",`<section class="ap-selector-extra"><button id="apCrearJornada"><i class="fa-solid fa-calendar-plus"></i><b>Registrar jornada</b><span>Definir fecha, turnos, líneas y cupos.</span></button><button id="apAsignarJornada"><i class="fa-solid fa-users-gear"></i><b>Asignar personal</b><span>Completar grupos, carga e inventario.</span></button></section><section class="ap-jornadas-resumen">${jornadas.map(j=>this.tarjetaResumenJornada(j)).join("")||"<div class='ap-vacio'>No hay jornadas registradas.</div>"}</section>`);document.getElementById("apCrearJornada").onclick=()=>this.abrirCrearJornada();document.getElementById("apAsignarJornada").onclick=()=>this.abrirAsignarJornada();document.querySelectorAll("[data-ap-ver-listado]").forEach(b=>b.onclick=()=>this.verListadoJornada(b.dataset.apVerListado));document.querySelectorAll("[data-ap-enviar-listado]").forEach(b=>b.onclick=()=>this.enviarListadoJornada(b.dataset.apEnviarListado));document.querySelectorAll("[data-ap-completar-jornada]").forEach(b=>b.onclick=()=>this.completarJornada(b.dataset.apCompletarJornada));}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};

 AP.tarjetaResumenJornada=function(j){const activos=(j.personal||[]).filter(p=>this.n(p.Estado_Asignacion)!=="CANCELADA"),ids=new Set(activos.map(p=>String(p.Empleado_ID)));(j.detalles||[]).forEach(d=>d.Supervisor_ID&&ids.add(String(d.Supervisor_ID)));const finalizada=this.n(j.Estado)==="FINALIZADA";return `<article class="ap-jornada-resumen"><header><strong><i class="fa-regular fa-calendar-days"></i> ${this.e(j.Fecha_Trabajo)} · ${this.e(j.Tipo_Jornada)}</strong><span class="${finalizada?"ap-estado-finalizado":""}">${this.e(j.Estado)}</span></header><p class="ap-jornada-meta">${ids.size} participantes · ${(j.detalles||[]).length} líneas${this.n(j.Habra_Despacho)==="SI"?" · Despacho":""}${this.n(j.Habra_Inventario)==="SI"?" · Inventario":""}</p><div class="ap-jornada-resumen-acciones"><button class="ap-accion-secundaria" data-ap-ver-listado="${this.e(j.ID_Jornada)}"><i class="fa-solid fa-list-check"></i> Ver listado</button><button data-ap-enviar-listado="${this.e(j.ID_Jornada)}"><i class="fa-regular fa-envelope"></i> Enviar listado</button>${finalizada?"":`<button class="ap-accion-verde" data-ap-completar-jornada="${this.e(j.ID_Jornada)}"><i class="fa-solid fa-check"></i> Marcar completada</button>`}</div></article>`;};

 const abrirCrearAnterior=AP.abrirCrearJornada.bind(AP);
 AP.abrirCrearJornada=async function(){await abrirCrearAnterior();const despacho=document.getElementById("apJeDespacho");if(!despacho)return;const c=this.catalogos||{},contenedor=despacho.closest(".ap-grid-form"),analistas=c.analistas||[];contenedor.insertAdjacentHTML("beforeend",`<label>¿Habrá inventario?<select id="apJeInventario"><option value="NO">No</option><option value="SI">Sí</option></select></label><label id="apJeAnalistaCampo" hidden>Analista responsable<select id="apJeAnalista"><option value="">Seleccione analista...</option>${analistas.map((a,i)=>`<option value="${this.e(a.id)}" ${analistas.length===1&&i===0?"selected":""}>${this.e(a.nombre)}</option>`).join("")}</select></label><label id="apJeCantidadCampo" hidden>Auxiliares para inventario<input id="apJeCantidadInventario" type="number" min="0" value="0"></label>`);document.getElementById("apJeInventario").onchange=e=>{const si=e.target.value==="SI";document.getElementById("apJeAnalistaCampo").hidden=!si;document.getElementById("apJeCantidadCampo").hidden=!si;};};

 AP.guardarJornada=async function(publicar){const turnos=[...document.querySelectorAll(".ap-turno-extra")].filter(b=>b.querySelector(".ap-turno-check").checked).map(b=>({codigo:b.dataset.turno,supervisorId:b.querySelector(".ap-turno-supervisor").value,lineas:[...b.querySelectorAll(".ap-linea-extra")].map(x=>({linea:x.querySelector("select").value,cantidad:x.querySelector("input").value}))}));if(turnos.some(t=>t.lineas.some(l=>!l.linea))){Sistema.info("Seleccione la línea de trabajo para cada posición agregada.");return;}const inventario=document.getElementById("apJeInventario");if(inventario&&inventario.value==="SI"&&!document.getElementById("apJeAnalista").value){Sistema.info("Seleccione el analista responsable del inventario.");return;}this.cargar("Guardando jornada","Registrando turnos, líneas, despacho e inventario.");try{const r=await API.post({action:"crearJornadaExtraordinaria",fechaTrabajo:document.getElementById("apJeFecha").value,tipoJornada:document.getElementById("apJeTipo").value,habraDespacho:document.getElementById("apJeDespacho").value,habraInventario:inventario?inventario.value:"NO",analistaInventarioId:document.getElementById("apJeAnalista")?document.getElementById("apJeAnalista").value:"",cantidadAuxiliaresInventario:document.getElementById("apJeCantidadInventario")?document.getElementById("apJeCantidadInventario").value:0,fechaLimiteAsignacion:document.getElementById("apJeLimite").value,descripcion:document.getElementById("apJeDescripcion").value,turnos,publicar:publicar?"SI":"NO"});if(!r||!r.ok)throw new Error(r.mensaje);Sistema.exito(r.mensaje);await this.abrirAsignarJornada();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};

 const tarjetaJornadaAnterior=AP.tarjetaJornada.bind(AP);
 AP.tarjetaJornada=function(j,c){let html=tarjetaJornadaAnterior(j,c);const grupo=String(j.Grupo_Carga_Regular||"").trim(),activos=(j.personal||[]).filter(p=>this.n(p.Estado_Asignacion)!=="CANCELADA"),candidatos=(c.colaboradores||[]).filter(x=>![...activos].some(p=>String(p.Empleado_ID)===String(x.id)&&this.n(p.Linea_Trabajo)==="CARGA"));if(this.n(j.Habra_Despacho)==="SI"&&grupo){const regulares=activos.filter(p=>this.n(p.Tipo_Asignacion)==="CARGA REGULAR");const cobertura=`<div class="ap-carga-extra"><select class="ap-carga-candidato"><option value="">Agregar colaborador a carga...</option>${candidatos.map(x=>`<option value="${this.e(x.id)}">${this.e(x.nombre)} · ${this.e(x.turno)}</option>`).join("")}</select><select class="ap-carga-motivo"><option value="">Razón de cobertura...</option><option value="VACACIONES">Vacaciones</option><option value="BONO">Bono</option><option value="LICENCIA MEDICA">Licencia médica</option><option value="AUSENTISMO">Ausentismo</option></select><select class="ap-carga-cubierto"><option value="">Colaborador cubierto...</option>${regulares.map(x=>`<option value="${this.e(x.Empleado_ID)}">${this.e(x.Empleado_Nombre)}</option>`).join("")}</select><button data-ap-cobertura-carga="${this.e(j.ID_Jornada)}"><i class="fa-solid fa-user-plus"></i> Agregar</button></div>`;html=html.replace('</div><details class="ap-turno-asignacion"',`</div>${cobertura}<details class="ap-turno-asignacion"`);if(!html.includes('data-ap-cobertura-carga'))html=html.replace('</div></article>',`</div>${cobertura}</article>`);}if(this.n(j.Habra_Inventario)==="SI"){const inv=activos.filter(p=>this.n(p.Tipo_Asignacion)==="AUXILIAR INVENTARIO"),cupos=Math.max(0,Number(j.Cantidad_Auxiliares_Inventario||0)-inv.length),bloque=`<section class="ap-inventario-bloque"><div class="ap-inventario-cabecera"><i class="fa-solid fa-boxes-stacked"></i><strong>Inventario</strong><span>${inv.length}/${Number(j.Cantidad_Auxiliares_Inventario||0)}</span></div><p>Analista: ${this.e(j.Analista_Inventario_Nombre||"Sin asignar")}</p>${inv.map(x=>`<div class="ap-persona-asignada">${this.e(x.Empleado_Nombre)}</div>`).join("")}<div class="ap-inventario-cupos">${Array.from({length:cupos},()=>`<select class="ap-inventario-persona"><option value="">Seleccionar colaborador...</option>${(c.colaboradores||[]).map(x=>`<option value="${this.e(x.id)}">${this.e(x.nombre)} · ${this.e(x.turno)}</option>`).join("")}</select>`).join("")}</div>${cupos?`<button class="ap-guardar-inventario" data-ap-guardar-inventario="${this.e(j.ID_Jornada)}">Guardar inventario</button>`:""}</section>`;html=html.replace(/<\/article>\s*$/,bloque+"</article>");}return html;};

 const abrirAsignarAnterior=AP.abrirAsignarJornada.bind(AP);
 AP.abrirAsignarJornada=async function(){this.instalarEstilosAvanzados();await abrirAsignarAnterior();document.querySelectorAll("[data-ap-cobertura-carga]").forEach(b=>b.onclick=()=>this.guardarCoberturaCarga(b));document.querySelectorAll("[data-ap-guardar-inventario]").forEach(b=>b.onclick=()=>this.guardarInventarioJornada(b));};

 AP.guardarCoberturaCarga=async function(b){const fila=b.closest(".ap-carga-extra"),empleadoId=fila.querySelector(".ap-carga-candidato").value,motivoCobertura=fila.querySelector(".ap-carga-motivo").value,empleadoCubiertoId=fila.querySelector(".ap-carga-cubierto").value;if(!empleadoId||!motivoCobertura){Sistema.info("Seleccione el colaborador y la razón de la cobertura de carga.");return;}this.cargar("Asignando cobertura de carga","Registrando la jornada extraordinaria del colaborador.");try{const r=await API.post({action:"asignarCoberturaCargaJornada",idJornada:b.dataset.apCoberturaCarga,empleadoId,motivoCobertura,empleadoCubiertoId});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible agregar la cobertura.");Sistema.exito(r.mensaje);await this.abrirAsignarJornada();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};

 AP.guardarInventarioJornada=async function(b){const bloque=b.closest(".ap-inventario-bloque"),empleadosIds=[...bloque.querySelectorAll(".ap-inventario-persona")].map(x=>x.value).filter(Boolean);if(!empleadosIds.length){Sistema.info("Seleccione al menos un colaborador de inventario.");return;}if(new Set(empleadosIds).size!==empleadosIds.length){Sistema.info("No puede repetir colaboradores en inventario.");return;}this.cargar("Guardando inventario","Registrando el analista y los auxiliares asignados.");try{const r=await API.post({action:"asignarPersonalInventarioJornada",idJornada:b.dataset.apGuardarInventario,empleadosIds});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible guardar el personal.");Sistema.exito(r.mensaje);await this.abrirAsignarJornada();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};

 AP.verListadoJornada=async function(id){this.cargar("Cargando listado","Organizando supervisores, líneas, carga e inventario.");try{const r=await API.post({action:"obtenerDetalleJornadaExtraordinaria",idJornada:id});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible cargar el listado.");const d=r.data,grupos={};(d.personal||[]).forEach(p=>{const clave=String(p.Linea_Trabajo||"GENERAL")+" · Turno "+String(p.Turno_Trabajado||"");(grupos[clave]=grupos[clave]||[]).push(p);});this.modal("Listado de personal extraordinario",`<section class="ap-modulo"><div class="ap-jornada-meta"><strong>${this.e(d.jornada.Fecha_Trabajo)} · ${this.e(d.jornada.Tipo_Jornada)}</strong> · ${d.totalColaboradores} participantes</div><section class="ap-listado-grupo"><header class="ap-listado-grupo-header"><i class="fa-solid fa-user-tie"></i><strong>Supervisores responsables</strong></header>${(d.supervisores||[]).map(s=>`<div class="ap-listado-persona">${this.e(s.nombre)} · Turno ${this.e(s.turno)}</div>`).join("")}</section>${Object.keys(grupos).sort().map(k=>`<section class="ap-listado-grupo"><header class="ap-listado-grupo-header"><i class="fa-solid ${this.n(k).includes("CARGA")?"fa-truck-ramp-box":this.n(k).includes("INVENTARIO")?"fa-boxes-stacked":"fa-industry"}"></i><strong>${this.e(k)}</strong></header>${grupos[k].map(p=>`<div class="ap-listado-persona">${this.e(p.Empleado_Nombre)}${p.Motivo_Cobertura?` · ${this.e(p.Motivo_Cobertura)}`:""}</div>`).join("")}</section>`).join("")}<div class="ap-acciones"><button id="apVolverJornadas">Volver</button></div></section>`);document.getElementById("apVolverJornadas").onclick=()=>this.abrirTrabajoExtra();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};

 AP.enviarListadoJornada=async function(id){const confirmado=await Sistema.confirmar({titulo:"Enviar listado",mensaje:"¿Desea enviar el listado a los correos configurados?",detalle:"El sistema preparará y enviará el listado de horas extraordinarias.",tipo:"info",textoConfirmar:"Sí, enviar",textoCancelar:"Cancelar"});if(!confirmado)return;this.cargar("Enviando listado","Preparando y enviando el listado de horas extraordinarias.");try{const r=await API.post({action:"enviarListadoJornadaExtraordinaria",idJornada:id});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible enviar el listado.");Sistema.exito(r.mensaje);await this.abrirTrabajoExtra();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};
 AP.completarJornada=async function(id){const confirmado=await Sistema.confirmar({titulo:"Completar jornada",mensaje:"¿Desea marcar esta jornada como completada?",detalle:"La jornada cambiará a estado finalizado.",tipo:"advertencia",textoConfirmar:"Sí, completar",textoCancelar:"Cancelar"});if(!confirmado)return;this.cargar("Completando jornada","Actualizando el estado del trabajo extraordinario.");try{const r=await API.post({action:"completarJornadaExtraordinaria",idJornada:id});if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible completar la jornada.");Sistema.exito(r.mensaje);await this.abrirTrabajoExtra();}catch(e){Sistema.error(e.message);}finally{this.ocultar();}};

 AP.obtenerUbicacionActual=function(){
  return new Promise((resolve,reject)=>{
   if(!window.isSecureContext){
    reject(new Error("La marcación GPS requiere abrir el sistema mediante HTTPS o localhost."));
    return;
   }

   if(!navigator.geolocation){
    reject(new Error("Este dispositivo no dispone de ubicación GPS. Verifique que la ubicación esté activada y que el navegador tenga autorización para utilizarla."));
    return;
   }

   const informarErrorUbicacion=error=>{
    const codigo=Number(error&&error.code||0);
    const instrucciones="Active la ubicación o el GPS de su dispositivo y verifique que el navegador tenga autorización para utilizarlo.";
    const mensaje=codigo===3
     ?"La ubicación tardó demasiado. "+instrucciones
     :instrucciones;

    // En Android un GPS apagado puede reportarse como permiso denegado;
    // por eso ambos casos incluyen siempre las dos comprobaciones necesarias.
    reject(new Error(mensaje));
   };

   navigator.geolocation.getCurrentPosition(
    posicion=>resolve({
     latitud:posicion.coords.latitude,
     longitud:posicion.coords.longitude,
     precision:posicion.coords.accuracy
    }),
    informarErrorUbicacion,
    {enableHighAccuracy:true,timeout:20000,maximumAge:0}
   );
  });
 };

 AP.abrirMarcacionPersonal=async function(){
  this.instalarEstilosAvanzados();
  this.cargar("Consultando jornada","Verificando su asistencia y asignaciones extraordinarias.");

  try{
   const r=await API.post({action:"obtenerMarcacionPersonalActual"});
   if(!r||!r.ok)throw new Error(r&&r.mensaje||"No fue posible consultar su jornada.");

   const d=r.data;
   if(!d.gpsActivo)throw new Error("La marcación GPS no está habilitada en Configuracion.");

   const extra=d.tipo==="HORAS_EXTRAS";
   const texto=d.finalizada?"Jornada finalizada":d.iniciada?"Terminar jornada":extra?"Registrar horas extras":"Registrar asistencia";
   const instruccion=d.iniciada?"Deslice para terminar la jornada":"Deslice para registrarse";

   this.modal("Registro de jornada",`<section class="ap-modulo ap-marcacion-modulo"><div class="ap-form-bloque ap-marcacion-tarjeta"><span class="ap-marcacion-etiqueta">CONTROL DE ASISTENCIA</span><h3 class="ap-marcacion-titulo"><i class="fa-solid fa-location-dot"></i> ${extra?"Jornada extraordinaria":"Asistencia del turno"}</h3><p class="ap-marcacion-meta"><span>Fecha: <strong>${this.e(d.fecha)}</strong></span><span>Turno: <strong>${this.e(d.turno)}</strong></span></p>${extra?(d.asignaciones||[]).map(a=>`<p class="ap-marcacion-asignacion">${this.e(a.Linea_Trabajo)} · ${this.e(a.Turno_Trabajado)}</p>`).join(""):""}<p class="ap-marcacion-explicacion"><i class="fa-solid fa-shield-halved"></i> ${d.finalizada?"La entrada y la salida de esta jornada ya fueron registradas correctamente.":"El sistema validará su ubicación y utilizará la hora oficial del servidor."}</p><div class="ap-acciones ap-marcacion-acciones">${d.finalizada?`<div class="ap-marcacion-finalizada" role="status"><span class="ap-marcacion-finalizada-icono"><i class="fa-solid fa-check"></i></span><span><strong>${texto}</strong><small>Registro completado correctamente</small></span></div>`:`<div id="apMarcacionDeslizador" class="ap-marcacion-deslizador"><span class="ap-marcacion-deslizador-texto">${instruccion}</span><span id="apMarcacionIcono" class="ap-marcacion-deslizador-icono" aria-hidden="true"><i class="fa-solid fa-location-crosshairs"></i></span><input id="apRegistrarMarcacion" class="ap-marcacion-deslizador-rango" type="range" min="0" max="100" step="1" value="0" aria-label="${instruccion}" aria-valuetext="Deslice hacia la derecha para confirmar"></div>`}</div></div></section>`);

   const control=document.getElementById("apRegistrarMarcacion");
   if(!control)return;

   const carril=document.getElementById("apMarcacionDeslizador");
   const icono=document.getElementById("apMarcacionIcono");
   let confirmado=false;

   const actualizar=()=>{
    const valor=Math.max(0,Math.min(100,Number(control.value)||0));
    const recorrido=Math.max(0,carril.clientWidth-icono.offsetWidth-10);
    icono.style.transform="translateX("+Math.round(recorrido*valor/100)+"px)";
    carril.style.setProperty("--ap-marcacion-avance",valor+"%");
    control.setAttribute("aria-valuetext",valor>=96?"Registro confirmado":valor+"% completado");

   };

   const reiniciar=()=>{
    control.value="0";
    carril.classList.remove("ap-marcacion-confirmada");
    actualizar();
   };

   const confirmar=()=>{
    if(confirmado||this.marcacionEnCurso)return;
    if(Number(control.value)<96){reiniciar();return;}

    confirmado=true;
    control.disabled=true;
    carril.classList.add("ap-marcacion-confirmada");

    Promise.resolve(this.registrarMarcacionPersonal(d)).finally(()=>{
     if(!document.body.contains(control))return;
     control.value="0";
     carril.classList.remove("ap-marcacion-confirmada");
     actualizar();
     control.disabled=false;
     confirmado=false;
    });
   };

   // input solo actualiza el aspecto; change confirma una única vez
   // cuando el usuario termina de arrastrar o completa el control.
   control.addEventListener("input",actualizar);
   control.addEventListener("change",confirmar);
   control.addEventListener("pointerup",()=>{
    if(!confirmado&&Number(control.value)<96)window.requestAnimationFrame(reiniciar);
   });
  }catch(e){Sistema.error(e.message);}finally{this.ocultar();}
 };

 AP.registrarMarcacionPersonal=async function(d){
  if(this.marcacionEnCurso)return;
  this.marcacionEnCurso=true;
  this.cargar("Validando ubicación","Consultando GPS y registrando la hora oficial del servidor.");

  try{
   const ubicacion=await this.obtenerUbicacionActual();
   const respuesta=await API.post(Object.assign({
    action:"registrarMarcacionPersonal",
    tipoMarcacion:d.tipo,
    movimiento:d.iniciada?"SALIDA":"ENTRADA",
    idAsignacion:d.idAsignacion
   },ubicacion));

   if(!respuesta||!respuesta.ok){
    throw new Error(respuesta&&respuesta.mensaje||"No fue posible registrar la jornada.");
   }

   Sistema.exito(respuesta.mensaje+" Hora: "+respuesta.data.hora);
   await this.abrirMarcacionPersonal();
  }catch(error){
   Sistema.error(error.message);
  }finally{
   this.marcacionEnCurso=false;
   this.ocultar();
  }
 };

 AP.instalarAccesoMarcacion=function(){
  const destino=document.getElementById("inicioAccesoMarcacion");
  const accesoAnterior=document.getElementById("apAccesoMarcacion");
  const sesion=window.Sistema&&Sistema.obtenerSesion?Sistema.obtenerSesion():null;
  const rol=this.n(sesion&&sesion.rol);
  const permitido=!!sesion&&(rol.includes("AUXILIAR")||rol.includes("MONTACARGUISTA")||rol.includes("ANALISTA"));

  // La marcación pertenece exclusivamente a Inicio, debajo de la fecha.
  // Nunca debe insertarse en document.body ni quedar flotando sobre otros módulos.
  if(!destino||!permitido){
   if(accesoAnterior)accesoAnterior.remove();
   return;
  }

  if(accesoAnterior&&destino.contains(accesoAnterior))return;
  if(accesoAnterior)accesoAnterior.remove();

  this.instalarEstilosAvanzados();

  const acceso=document.createElement("div");
  acceso.id="apAccesoMarcacion";
  acceso.className="ap-marcacion-acceso ap-marcacion-acceso-inicio";
  acceso.style.cssText="position:static;inset:auto;z-index:auto;display:flex;width:100%;margin:8px 0 0;";
  acceso.innerHTML='<button type="button" class="ap-marcacion-btn" style="width:100%;min-height:38px;box-shadow:none;"><i class="fa-solid fa-location-dot"></i> Registrar jornada</button>';
  acceso.querySelector("button").onclick=()=>this.abrirMarcacionPersonal();
  destino.appendChild(acceso);
 };

 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>AP.instalarAccesoMarcacion(),700));else setTimeout(()=>AP.instalarAccesoMarcacion(),700);
})(window.AsistenciaPersonal);

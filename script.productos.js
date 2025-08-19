// ============ PRODUCTOS ============
// Carga segura tras DOM
document.addEventListener("DOMContentLoaded", () => {
  // --- Firebase (compat) ---
  const firebaseConfig = {
    apiKey: "AIzaSyBDcOCQ0OrAaxr-yhhD5iVHqegwvhpjZaE",
    authDomain: "listacompra-6d0b3.firebaseapp.com",
    databaseURL: "https://listacompra-6d0b3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "listacompra-6d0b3",
    storageBucket: "listacompra-6d0b3.appspot.com",
    messagingSenderId: "175496423309",
    appId: "1:175496423309:web:509b2eb64961245536bfc4"
  };
  try {
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
  } catch(e) {
    try { firebase.initializeApp(firebaseConfig); } catch(_){ /* noop */ }
  }
  window.db = firebase.database();

  // --- Rutas ---
  const rutaProductos = "productos/Charly";

  // --- State ---
  window.productos = [];
  let categorias = [];
  let filtroTexto = "";
  let filtroCategoria = "";
  let gruposDOM = new Map();
  let productoActual = null;

  // --- DOM refs ---
  const input = document.getElementById("input-producto");
  const selectSuper = document.getElementById("selector-super");
  const btnAgregar = document.getElementById("btn-agregar");
  const contenedorLista = document.getElementById("lista-productos");
  const totalEstimadoEl = document.getElementById("total-estimado");
  const filtroCatSel = document.getElementById("filtro-categoria");

  // --- Helpers ---
  const normalize = (s) => (s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const debounce = (fn,wait=300)=>{ let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),wait);} };
  const guardarDebounced = debounce(() => {
    db.ref(rutaProductos).set(productos);
    localStorage.setItem("productos", JSON.stringify(productos));
  }, 300);
  function guardarAhora(){
    db.ref(rutaProductos).set(productos);
    localStorage.setItem("productos", JSON.stringify(productos));
  }
  window.persistir = (inmediato=false)=> (inmediato ? guardarAhora() : guardarDebounced());
  window.calcularTotalEstimado = function(){
    const total = productos.filter(p=>!p.comprado).reduce((s,p)=> s + (Number(p.precio)*Number(p.cantidad||0)), 0);
    if (totalEstimadoEl) totalEstimadoEl.textContent = `Total estimado: ${total.toFixed(2)} €`;
  };

  function actualizarCategoriasDesdeProductos(){
    categorias = [...new Set(productos.map(p=>p.categoria).filter(Boolean))];
    actualizarSelectorCategorias();
  }
  function actualizarSelectorCategorias(){
    if (!filtroCatSel) return;
    const valorPrevio = filtroCatSel.value;
    filtroCatSel.innerHTML = '<option value="">Todas las categorías</option>';
    categorias.forEach(cat=>{
      const opt=document.createElement("option"); opt.value=cat; opt.textContent=cat; filtroCatSel.appendChild(opt);
    });
    if ([...filtroCatSel.options].some(o=>o.value===valorPrevio)) filtroCatSel.value = valorPrevio;
  }
  function mantenerScrollDurante(fn){
    const y = window.scrollY; fn(); requestAnimationFrame(()=>window.scrollTo(0,y));
  }

  // --- Data load ---
  function cargarDesdeLocalStorage(){
    try{
      const arr = JSON.parse(localStorage.getItem("productos")||"[]");
      if (Array.isArray(arr)) {
        productos = arr;
        actualizarCategoriasDesdeProductos();
        renderLista();
        return true;
      }
    }catch{}
    return false;
  }
  function cargarDesdeFirebase(){
    db.ref(rutaProductos).once("value").then(s=>{
      const data = s.val(); if (!data) return;
      productos = Array.isArray(data) ? data : Object.values(data);
      actualizarCategoriasDesdeProductos();
      renderLista();
    });
  }

  // --- Render ---
  function limpiarGrupos(){ gruposDOM.clear(); contenedorLista && (contenedorLista.innerHTML=""); }
  function crearGrupo(supermercado){
    const grupo = document.createElement("div"); grupo.className="supermercado-grupo";
    const titulo = document.createElement("div"); titulo.className="supermercado-titulo"; titulo.textContent = supermercado; titulo.style.cursor="pointer";
    const contTar = document.createElement("div"); contTar.className="contenedor-tarjetas";
    titulo.addEventListener("click", ()=> contTar.classList.toggle("oculto"));
    grupo.append(titulo, contTar); contenedorLista.appendChild(grupo);
    const ref = {grupo, titulo, contenedor:contTar}; gruposDOM.set(supermercado, ref); return ref;
  }
  function pasaFiltros(p){
    if (filtroTexto && !normalize(p.nombre).includes(normalize(filtroTexto))) return false;
    if (filtroCategoria && normalize(p.categoria)!==normalize(filtroCategoria)) return false;
    return true;
  }
  window.renderLista = function(){
    if (!contenedorLista) return;
    calcularTotalEstimado();
    limpiarGrupos();
    const porSuper = new Map();
    for (const p of productos){
      if (!pasaFiltros(p)) continue;
      if (!porSuper.has(p.supermercado)) porSuper.set(p.supermercado, []);
      porSuper.get(p.supermercado).push(p);
    }
    for (const [supermercado, arr] of porSuper){
      const grupo = crearGrupo(supermercado);
      arr.sort((a,b)=> (a.comprado-b.comprado) || a.nombre.localeCompare(b.nombre));
      for (const p of arr) grupo.contenedor.appendChild(crearTarjetaProducto(p));
    }
  };
  function crearTarjetaProducto(prod){
    const tarjeta = document.createElement("div");
    tarjeta.className="tarjeta-producto"; if (prod.comprado) tarjeta.classList.add("tarjeta-comprado");
    tarjeta.dataset.id = prod.id;

    const checkbox = document.createElement("input"); checkbox.type="checkbox"; checkbox.className="checkbox"; checkbox.checked=!!prod.comprado;
    const imagen = document.createElement("img"); imagen.src = prod.imagenURL || "https://placehold.co/50";
    const nombre = document.createElement("div"); nombre.className="nombre-producto"; nombre.textContent = prod.nombre;

    const wrapCantidad = document.createElement("div"); wrapCantidad.style.display="flex"; wrapCantidad.style.alignItems="center"; wrapCantidad.style.gap="8px";
    const btnMenos = document.createElement("button"); btnMenos.type="button"; btnMenos.textContent="–"; btnMenos.style.minWidth="36px"; btnMenos.style.padding="6px"; btnMenos.style.borderRadius="10px"; btnMenos.style.border="none"; btnMenos.style.background="rgba(255,255,255,0.08)"; btnMenos.style.color="#fff";
    const contador = document.createElement("div"); contador.className="contador"; contador.textContent = prod.cantidad;
    const btnMas = document.createElement("button"); btnMas.type="button"; btnMas.textContent="+"; btnMas.style.minWidth="36px"; btnMas.style.padding="6px"; btnMas.style.borderRadius="10px"; btnMas.style.border="none"; btnMas.style.background="rgba(255,255,255,0.08)"; btnMas.style.color="#fff";
    wrapCantidad.append(btnMenos, contador, btnMas);

    // Gestos táctiles en contador
    let startY=null;
    contador.addEventListener("touchstart",(e)=>{ startY = e.touches[0].clientY; e.preventDefault(); }, {passive:false});
    contador.addEventListener("touchend",(e)=>{
      if (startY===null) return;
      const deltaY = e.changedTouches[0].clientY - startY;
      if (Math.abs(deltaY)>=15){
        if (deltaY>0) prod.cantidad++;
        else prod.cantidad = Math.max(1,(prod.cantidad||1)-1);
        actualizarTarjetaCantidad(prod.id, prod.cantidad); persistir(); calcularTotalEstimado();
      }
      startY=null;
    }, {passive:false});

    btnMas.addEventListener("click",(e)=>{ e.stopPropagation(); prod.cantidad=(prod.cantidad||0)+1; actualizarTarjetaCantidad(prod.id,prod.cantidad); persistir(); calcularTotalEstimado(); });
    btnMenos.addEventListener("click",(e)=>{ e.stopPropagation(); prod.cantidad=Math.max(1,(prod.cantidad||1)-1); actualizarTarjetaCantidad(prod.id,prod.cantidad); persistir(); calcularTotalEstimado(); });

    checkbox.addEventListener("change",()=>{ prod.comprado=!!checkbox.checked; actualizarTarjetaComprado(prod.id, prod.comprado); reordenarTarjetaEnGrupo(prod); persistir(); calcularTotalEstimado(); });

    tarjeta.addEventListener("click",(e)=>{
      if ([checkbox,btnMas,btnMenos].includes(e.target)) return;
      abrirModalEdicion(prod);
    });

    tarjeta.append(checkbox, imagen, nombre, wrapCantidad);
    return tarjeta;
  }
  function buscarTarjetaDOM(id){ return contenedorLista.querySelector(`.tarjeta-producto[data-id="${id}"]`); }
  function actualizarTarjetaCantidad(id,cantidad){ const c=buscarTarjetaDOM(id)?.querySelector(".contador"); if (c) c.textContent = cantidad; }
  function actualizarTarjetaComprado(id,comprado){ const card = buscarTarjetaDOM(id); if (card) card.classList.toggle("tarjeta-comprado", !!comprado); }
  function reordenarTarjetaEnGrupo(prod){
    const card = buscarTarjetaDOM(prod.id); if(!card) return;
    const grupoRef = gruposDOM.get(prod.supermercado); if(!grupoRef) return;
    const hijos = [...grupoRef.contenedor.children];
    const items = hijos.map(el=>{ const id=el.dataset.id; const p=productos.find(x=>x.id===id); return p && pasaFiltros(p) ? {el,p} : null; }).filter(Boolean);
    items.sort((a,b)=> (a.p.comprado-b.p.comprado) || a.p.nombre.localeCompare(b.p.nombre));
    for (const {el} of items) grupoRef.contenedor.appendChild(el);
  }

  // --- Inyección de campos de unidades en el modal (si no existen) ---
  (function ensureUnidadCampos(){
    const cont = document.querySelector("#modal-edicion .campos-laterales");
    if(!cont) return;
    if(!document.getElementById("modal-unidad")){
      const frag = document.createElement("div");
      frag.innerHTML = `
        <label>Unidad base</label>
        <select id="modal-unidad">
          <option value="ud">ud</option>
          <option value="g">g</option>
          <option value="ml">ml</option>
        </select>
        <label>g/ml por unidad</label>
        <input type="number" id="modal-gpu" step="0.01" placeholder="0 = desconocido" />
      `;
      const botones = cont.querySelector(".modal-botones");
      if (botones) cont.insertBefore(frag, botones); else cont.appendChild(frag);
    }
  })();

  // --- Modal producto ---
  function abrirModalEdicion(prod){
    productoActual = prod;
    const nombre = document.getElementById("modal-nombre");
    const precio = document.getElementById("modal-precio");
    const selSuper = document.getElementById("modal-super");
    const cat = document.getElementById("modal-categoria");
    const preview = document.getElementById("modal-preview-imagen");
    const inputFile = document.getElementById("modal-imagen");
    const selUnidad = document.getElementById("modal-unidad");
    const inpGpu    = document.getElementById("modal-gpu");
    if (selUnidad) selUnidad.value = (prod.unidadBase || "ud");
    if (inpGpu)    inpGpu.value    = Number(prod.gramosPorUnidad || 0);

    if (!nombre) return; // modal no presente
    nombre.value = prod.nombre || "";
    precio.value = prod.precio || 0;
    selSuper.innerHTML = [...new Set(productos.map(p=>p.supermercado))]
      .map(s=>`<option ${s===prod.supermercado ? "selected":""}>${s}</option>`).join("");
    cat.value = prod.categoria || "";
    preview.src = prod.imagenURL || "https://placehold.co/150";
    inputFile.value = "";

    document.getElementById("modal-edicion").classList.remove("oculto");
    setTimeout(()=> nombre.focus(), 10);
  }
  window.subirImagenACloudinary = function(file){
    const fd=new FormData();
    fd.append("file", file);
    fd.append("upload_preset","publico");
    return fetch("https://api.cloudinary.com/v1_1/dgdavibcx/image/upload",{method:"POST", body:fd})
      .then(r=>r.json()).then(d=>d.secure_url);
  };
  function cerrarModal(){ const m=document.getElementById("modal-edicion"); if(m) m.classList.add("oculto"); productoActual=null; }

  const btnGuardar = document.getElementById("btn-guardar-cambios");
  const btnBorrar = document.getElementById("btn-borrar-producto");
  const btnCerrar = document.getElementById("btn-cerrar-modal");

  if (btnGuardar) btnGuardar.addEventListener("click", async ()=>{
    if (!productoActual) return;
    const nuevoNombre = (document.getElementById("modal-nombre").value||"").trim();
    const nuevoPrecio = parseFloat(document.getElementById("modal-precio").value)||0;
    const nuevoSuper = document.getElementById("modal-super").value;
    const nuevaCat = (document.getElementById("modal-categoria").value||"").trim();
    const archivo = document.getElementById("modal-imagen").files[0];
    const selUnidad = document.getElementById("modal-unidad");
    const inpGpu    = document.getElementById("modal-gpu");

    const superAnterior = productoActual.supermercado;
    productoActual.nombre = nuevoNombre;
    productoActual.precio = nuevoPrecio;
    productoActual.supermercado = nuevoSuper;
    productoActual.categoria = nuevaCat || null;
    // NUEVO: guardar unidades
    productoActual.unidadBase = selUnidad ? selUnidad.value : (productoActual.unidadBase || "ud");
    productoActual.gramosPorUnidad = inpGpu ? Number(inpGpu.value||0) : Number(productoActual.gramosPorUnidad||0);

    if (nuevaCat && !categorias.includes(nuevaCat)) { categorias.push(nuevaCat); actualizarSelectorCategorias(); }

    if (archivo){
      try{ const url = await subirImagenACloudinary(archivo); productoActual.imagenURL = url; }catch{}
    }

    if (superAnterior !== productoActual.supermercado || !pasaFiltros(productoActual)) {
      mantenerScrollDurante(()=> renderLista());
    } else {
      const card = buscarTarjetaDOM(productoActual.id);
      if (card){
        const nombreEl = card.querySelector(".nombre-producto"); if (nombreEl) nombreEl.textContent = productoActual.nombre;
        const imgEl = card.querySelector("img"); if (imgEl && productoActual.imagenURL) imgEl.src = productoActual.imagenURL;
        reordenarTarjetaEnGrupo(productoActual);
      } else {
        mantenerScrollDurante(()=> renderLista());
      }
    }
    calcularTotalEstimado();
    persistir(true);
    cerrarModal();
  });
  if (btnBorrar) btnBorrar.addEventListener("click", ()=>{
    if (!productoActual) return;
    if (!confirm(`¿Eliminar "${productoActual.nombre}"?`)) return;
    productos = productos.filter(p=>p.id!==productoActual.id);
    const card = contenedorLista.querySelector(`.tarjeta-producto[data-id="${productoActual.id}"]`);
    if (card?.parentElement) card.parentElement.removeChild(card);
    calcularTotalEstimado(); persistir(true); cerrarModal();
  });
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  const modalEd = document.getElementById("modal-edicion");
  if (modalEd) modalEd.addEventListener("click",(e)=>{ if(e.target.id==="modal-edicion") cerrarModal(); });
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") cerrarModal(); });

  // --- Interacción cabecera ---
  if (btnAgregar) btnAgregar.addEventListener("click", ()=>{
    const nombreRaw = (input.value||"").trim();
    const supermercado = selectSuper?.value;
    if (!nombreRaw || !supermercado) return;
    const nombre = nombreRaw.charAt(0).toUpperCase()+nombreRaw.slice(1).toLowerCase();

    const existe = productos.filter(p=> normalize(p.nombre).includes(normalize(nombreRaw)));
    if (existe.length>0){
      filtroTexto = nombreRaw; renderLista();
    } else {
      const nuevo = {
        id: Date.now().toString(),
        nombre,
        supermercado,
        cantidad: 1,
        precio: 0,
        comprado: false,
        imagenURL: "",
        categoria: null,
        unidadBase: "ud",      // NUEVO
        gramosPorUnidad: 0     // NUEVO
      };
      productos.push(nuevo);
      const grupo = gruposDOM.get(supermercado);
      if (pasaFiltros(nuevo) && grupo) {
        const card = crearTarjetaProducto(nuevo); grupo.contenedor.appendChild(card); reordenarTarjetaEnGrupo(nuevo);
      } else {
        renderLista();
      }
      persistir(true); calcularTotalEstimado();
    }
    input.value = "";
  });
  if (input) input.addEventListener("input", ()=>{ filtroTexto = input.value.trim(); mantenerScrollDurante(()=>renderLista()); });
  if (filtroCatSel) filtroCatSel.addEventListener("change",(e)=>{ filtroCategoria = e.target.value||""; mantenerScrollDurante(()=>renderLista()); });

  // --- Init ---
  cargarDesdeLocalStorage();
  cargarDesdeFirebase();
  renderLista();
});

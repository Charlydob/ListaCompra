// ====== CONFIG ======
const input = document.getElementById("input-producto");
const selectSuper = document.getElementById("selector-super");
const btnAgregar = document.getElementById("btn-agregar");
const contenedorLista = document.getElementById("lista-productos");
const totalEstimadoEl = document.getElementById("total-estimado");
const rutaProductos = "productos/Charly";

// Firebase (compat)
const firebaseConfig = {
  apiKey: "AIzaSyBDcOCQ0OrAaxr-yhhD5iVHqegwvhpjZaE",
  authDomain: "listacompra-6d0b3.firebaseapp.com",
  databaseURL: "https://listacompra-6d0b3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "listacompra-6d0b3",
  storageBucket: "listacompra-6d0b3.appspot.com",
  messagingSenderId: "175496423309",
  appId: "1:175496423309:web:509b2eb64961245536bfc4"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ====== STATE ======
let productos = [];            // array de productos
let categorias = [];           // categorías únicas
let filtroTexto = "";          // filtro por nombre
let filtroCategoria = "";      // filtro por categoría
let gruposDOM = new Map();     // {supermercado -> {grupo, titulo, contenedor}}
let productoActual = null;     // para modal

// ====== HELPERS ======
const normalize = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const guardarDebounced = debounce(() => {
  db.ref(rutaProductos).set(productos);
  localStorage.setItem("productos", JSON.stringify(productos));
}, 300);

function guardarAhora() {
  db.ref(rutaProductos).set(productos);
  localStorage.setItem("productos", JSON.stringify(productos));
}

function persistir(inmediato = false) {
  (inmediato ? guardarAhora : guardarDebounced)();
}

function calcularTotalEstimado() {
  const total = productos
    .filter((p) => !p.comprado)
    .reduce((sum, p) => sum + (Number(p.precio) * Number(p.cantidad || 0)), 0);
  totalEstimadoEl.textContent = `Total estimado: ${total.toFixed(2)} €`;
}

function actualizarCategoriasDesdeProductos() {
  categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
  actualizarSelectorCategorias();
}

function actualizarSelectorCategorias() {
  const select = document.getElementById("filtro-categoria");
  const valorPrevio = select.value;
  select.innerHTML = '<option value="">Todas las categorías</option>';
  categorias.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  // restaurar selección si aplica
  if ([...select.options].some(o => o.value === valorPrevio)) {
    select.value = valorPrevio;
  }
}

function mantenerScrollDurante(rerenderFn) {
  const y = window.scrollY;
  rerenderFn();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

// ====== DATA LOAD ======
function cargarDesdeLocalStorage() {
  const data = localStorage.getItem("productos");
  if (!data) return false;
  try {
    const arr = JSON.parse(data);
    if (Array.isArray(arr)) {
      productos = arr;
      actualizarCategoriasDesdeProductos();
      renderLista(); // render rápido
      return true;
    }
  } catch { /* noop */ }
  return false;
}

function cargarDesdeFirebase() {
  db.ref(rutaProductos).once("value").then((snap) => {
    const data = snap.val();
    if (!data) return;
    const arr = Array.isArray(data) ? data : Object.values(data);
    productos = arr;
    actualizarCategoriasDesdeProductos();
    renderLista();
  });
}

// ====== RENDER ======
function limpiarGrupos() {
  gruposDOM.clear();
  contenedorLista.innerHTML = "";
}

function crearGrupo(supermercado) {
  const grupo = document.createElement("div");
  grupo.className = "supermercado-grupo";

  const titulo = document.createElement("div");
  titulo.className = "supermercado-titulo";
  titulo.textContent = supermercado;
  titulo.style.cursor = "pointer";

  const contenedorTarjetas = document.createElement("div");
  contenedorTarjetas.className = "contenedor-tarjetas";

  titulo.addEventListener("click", () => {
    contenedorTarjetas.classList.toggle("oculto");
  });

  grupo.appendChild(titulo);
  grupo.appendChild(contenedorTarjetas);
  contenedorLista.appendChild(grupo);

  const ref = { grupo, titulo, contenedor: contenedorTarjetas };
  gruposDOM.set(supermercado, ref);
  return ref;
}

function pasaFiltros(p) {
  if (filtroTexto) {
    if (!normalize(p.nombre).includes(normalize(filtroTexto))) return false;
  }
  if (filtroCategoria) {
    if (normalize(p.categoria) !== normalize(filtroCategoria)) return false;
  }
  return true;
}

function renderLista() {
  calcularTotalEstimado();
  limpiarGrupos();

  // Agrupar por super
  const porSuper = new Map();
  for (const p of productos) {
    if (!pasaFiltros(p)) continue;
    if (!porSuper.has(p.supermercado)) porSuper.set(p.supermercado, []);
    porSuper.get(p.supermercado).push(p);
  }

  for (const [supermercado, arr] of porSuper) {
    const grupo = crearGrupo(supermercado);

    // Orden: pendientes arriba, luego por nombre
    arr.sort((a, b) => {
      if (a.comprado !== b.comprado) return a.comprado - b.comprado;
      return a.nombre.localeCompare(b.nombre);
    });

    for (const p of arr) {
      const card = crearTarjetaProducto(p);
      grupo.contenedor.appendChild(card);
    }
  }
}

function crearTarjetaProducto(prod) {
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta-producto";
  if (prod.comprado) tarjeta.classList.add("tarjeta-comprado");
  tarjeta.dataset.id = prod.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "checkbox";
  checkbox.checked = !!prod.comprado;

  const imagen = document.createElement("img");
  imagen.src = prod.imagenURL || "https://placehold.co/50";

  const nombre = document.createElement("div");
  nombre.className = "nombre-producto";
  nombre.textContent = prod.nombre;

  // Controles de cantidad
  const wrapCantidad = document.createElement("div");
  wrapCantidad.style.display = "flex";
  wrapCantidad.style.alignItems = "center";
  wrapCantidad.style.gap = "8px";

  const btnMenos = document.createElement("button");
  btnMenos.type = "button";
  btnMenos.textContent = "–";
  btnMenos.style.minWidth = "36px";
  btnMenos.style.padding = "6px";
  btnMenos.style.borderRadius = "10px";
  btnMenos.style.border = "none";
  btnMenos.style.background = "rgba(255,255,255,0.08)";
  btnMenos.style.color = "#fff";

  const contador = document.createElement("div");
  contador.className = "contador";
  contador.textContent = prod.cantidad;

  const btnMas = document.createElement("button");
  btnMas.type = "button";
  btnMas.textContent = "+";
  btnMas.style.minWidth = "36px";
  btnMas.style.padding = "6px";
  btnMas.style.borderRadius = "10px";
  btnMas.style.border = "none";
  btnMas.style.background = "rgba(255,255,255,0.08)";
  btnMas.style.color = "#fff";

  wrapCantidad.appendChild(btnMenos);
  wrapCantidad.appendChild(contador);
  wrapCantidad.appendChild(btnMas);

  // Gestos táctiles (arriba/abajo)
  let startY = null;
  contador.addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
      e.preventDefault();
    },
    { passive: false }
  );
  contador.addEventListener(
    "touchend",
    (e) => {
      if (startY === null) return;
      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - startY;
      if (Math.abs(deltaY) >= 15) {
        if (deltaY > 0) prod.cantidad++;
        else prod.cantidad = Math.max(1, (prod.cantidad || 1) - 1);
        actualizarTarjetaCantidad(prod.id, prod.cantidad);
        persistir();
        calcularTotalEstimado();
      }
      startY = null;
    },
    { passive: false }
  );

  // Eventos de cantidad (+/-)
  btnMas.addEventListener("click", (e) => {
    e.stopPropagation();
    prod.cantidad = (prod.cantidad || 0) + 1;
    actualizarTarjetaCantidad(prod.id, prod.cantidad);
    persistir();
    calcularTotalEstimado();
  });

  btnMenos.addEventListener("click", (e) => {
    e.stopPropagation();
    prod.cantidad = Math.max(1, (prod.cantidad || 1) - 1);
    actualizarTarjetaCantidad(prod.id, prod.cantidad);
    persistir();
    calcularTotalEstimado();
  });

  // Checkbox comprado
  checkbox.addEventListener("change", (e) => {
    prod.comprado = !!checkbox.checked;
    actualizarTarjetaComprado(prod.id, prod.comprado);
    reordenarTarjetaEnGrupo(prod);
    persistir();
    calcularTotalEstimado();
  });

  // Click tarjeta → abrir modal (ignorar clicks internos)
  tarjeta.addEventListener("click", (e) => {
    if (e.target === checkbox || e.target === btnMas || e.target === btnMenos) return;
    abrirModalEdicion(prod);
  });

  tarjeta.appendChild(checkbox);
  tarjeta.appendChild(imagen);
  tarjeta.appendChild(nombre);
  tarjeta.appendChild(wrapCantidad);
  return tarjeta;
}

function buscarTarjetaDOM(id) {
  return contenedorLista.querySelector(`.tarjeta-producto[data-id="${id}"]`);
}

function actualizarTarjetaCantidad(id, cantidad) {
  const card = buscarTarjetaDOM(id);
  if (!card) return;
  const cont = card.querySelector(".contador");
  if (cont) cont.textContent = cantidad;
}

function actualizarTarjetaComprado(id, comprado) {
  const card = buscarTarjetaDOM(id);
  if (!card) return;
  card.classList.toggle("tarjeta-comprado", !!comprado);
}

function reordenarTarjetaEnGrupo(prod) {
  // Mover la tarjeta para respetar "pendientes arriba" + orden por nombre
  const card = buscarTarjetaDOM(prod.id);
  if (!card) return;

  const grupoRef = gruposDOM.get(prod.supermercado);
  if (!grupoRef) return;

  // Extraer tarjetas visibles del grupo que pasen filtros
  const hijos = [...grupoRef.contenedor.children];
  const items = hijos.map((el) => {
    const id = el.dataset.id;
    const p = productos.find((x) => x.id === id);
    return p && pasaFiltros(p) ? { el, p } : null;
  }).filter(Boolean);

  // Orden deseado
  items.sort((a, b) => {
    if (a.p.comprado !== b.p.comprado) return a.p.comprado - b.p.comprado;
    return a.p.nombre.localeCompare(b.p.nombre);
  });

  // Reinsertar en orden sin rerender total
  for (const { el } of items) grupoRef.contenedor.appendChild(el);
}

// ====== MODAL ======
function abrirModalEdicion(prod) {
  productoActual = prod;

  document.getElementById("modal-nombre").value = prod.nombre || "";
  document.getElementById("modal-precio").value = prod.precio || 0;

  const selectSuperModal = document.getElementById("modal-super");
  selectSuperModal.innerHTML = [...new Set(productos.map((p) => p.supermercado))]
    .map((s) => `<option ${s === prod.supermercado ? "selected" : ""}>${s}</option>`)
    .join("");

  document.getElementById("modal-categoria").value = prod.categoria || "";

  const preview = document.getElementById("modal-preview-imagen");
  const inputFile = document.getElementById("modal-imagen");
  preview.src = prod.imagenURL || "https://placehold.co/150";
  inputFile.value = "";

  const modal = document.getElementById("modal-edicion");
  modal.classList.remove("oculto");

  // Autofocus
  setTimeout(() => document.getElementById("modal-nombre").focus(), 10);
}

// Guardar cambios modal
document.getElementById("btn-guardar-cambios").addEventListener("click", async () => {
  if (!productoActual) return;

  const nuevoNombre = document.getElementById("modal-nombre").value.trim();
  const nuevoPrecio = parseFloat(document.getElementById("modal-precio").value) || 0;
  const nuevoSuper = document.getElementById("modal-super").value;
  const nuevaCat = document.getElementById("modal-categoria").value.trim();

  const archivo = document.getElementById("modal-imagen").files[0];

  // Actualizar campos base
  const superAnterior = productoActual.supermercado;
  productoActual.nombre = nuevoNombre;
  productoActual.precio = nuevoPrecio;
  productoActual.supermercado = nuevoSuper;
  productoActual.categoria = nuevaCat || null;

  // Actualizar categorías si es nueva
  if (nuevaCat && !categorias.includes(nuevaCat)) {
    categorias.push(nuevaCat);
    actualizarSelectorCategorias();
  }

  // Subida de imagen si procede
  if (archivo) {
    try {
      const url = await subirImagenACloudinary(archivo);
      productoActual.imagenURL = url;
    } catch {
      // no romper flujo si hay error
    }
  }

  // Actualización parcial del DOM
  if (superAnterior !== productoActual.supermercado || !pasaFiltros(productoActual)) {
    // el producto cambia de grupo o ya no pasa el filtro → rerender mínimo seguro
    mantenerScrollDurante(() => renderLista());
  } else {
    // actualizar tarjeta existente (nombre/imagen/precio no visibles en tarjeta excepto nombre)
    const card = buscarTarjetaDOM(productoActual.id);
    if (card) {
      const nombreEl = card.querySelector(".nombre-producto");
      if (nombreEl) nombreEl.textContent = productoActual.nombre;
      const imgEl = card.querySelector("img");
      if (imgEl && productoActual.imagenURL) imgEl.src = productoActual.imagenURL;
      reordenarTarjetaEnGrupo(productoActual);
    } else {
      mantenerScrollDurante(() => renderLista());
    }
  }

  calcularTotalEstimado();
  persistir(true); // guardar inmediato al cerrar modal
  cerrarModal();
});

// Borrar producto (con confirmación)
document.getElementById("btn-borrar-producto").addEventListener("click", () => {
  if (!productoActual) return;
  const ok = confirm(`¿Eliminar "${productoActual.nombre}"?`);
  if (!ok) return;
  productos = productos.filter((p) => p.id !== productoActual.id);
  const card = buscarTarjetaDOM(productoActual.id);
  if (card && card.parentElement) card.parentElement.removeChild(card);
  calcularTotalEstimado();
  persistir(true);
  cerrarModal();
});

// Cancelar modal
document.getElementById("btn-cerrar-modal").addEventListener("click", cerrarModal);

// Cerrar con fondo y con ESC
document.getElementById("modal-edicion").addEventListener("click", (e) => {
  if (e.target.id === "modal-edicion") cerrarModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarModal();
});

function cerrarModal() {
  document.getElementById("modal-edicion").classList.add("oculto");
  productoActual = null;
}

function subirImagenACloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "publico");
  return fetch("https://api.cloudinary.com/v1_1/dgdavibcx/image/upload", {
    method: "POST",
    body: formData,
  })
    .then((r) => r.json())
    .then((d) => d.secure_url);
}

// ====== INTERACCIÓN CABECERA ======

// Añadir / buscar
btnAgregar.addEventListener("click", () => {
  const nombreRaw = input.value.trim();
  const supermercado = selectSuper.value;
  if (!nombreRaw || !supermercado) return;

  const nombre =
    nombreRaw.charAt(0).toUpperCase() + nombreRaw.slice(1).toLowerCase();

  // ¿existe (búsqueda por substring insensible a acentos)?
  const existe = productos.filter((p) =>
    normalize(p.nombre).includes(normalize(nombreRaw))
  );

  if (existe.length > 0) {
    // mostrar coincidencias aplicando filtro texto
    filtroTexto = nombreRaw;
    renderLista();
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
    };
    productos.push(nuevo);
    // si el grupo ya existe, insertar sin rerender completo
    const grupo = gruposDOM.get(supermercado);
    if (pasaFiltros(nuevo) && grupo) {
      const card = crearTarjetaProducto(nuevo);
      grupo.contenedor.appendChild(card);
      reordenarTarjetaEnGrupo(nuevo);
    } else {
      renderLista();
    }
    persistir(true);
    calcularTotalEstimado();
  }
  input.value = "";
});

// Filtro dinámico al escribir (nombre)
input.addEventListener("input", () => {
  filtroTexto = input.value.trim();
  mantenerScrollDurante(() => renderLista());
});

// Filtro por categoría
document.getElementById("filtro-categoria").addEventListener("change", (e) => {
  filtroCategoria = e.target.value || "";
  mantenerScrollDurante(() => renderLista());
});

// ====== INIT ======
function init() {
  const hadLocal = cargarDesdeLocalStorage();
  cargarDesdeFirebase(); // sobreescribe con remoto cuando llegue
  renderLista(); // por si no hay datos aún
}
init();
// ================== RECETAS (ADITIVO, SIN ROMPER NADA) ==================
const rutaRecetas = "recetas/Charly";
let recetas = JSON.parse(localStorage.getItem("recetas") || "[]");

// Carga inicial de recetas (no bloquea tu init)
(function cargarRecetas(){
  try{
    firebase.database().ref(rutaRecetas).once("value").then(s=>{
      const v = s.val();
      if(Array.isArray(v)) recetas = v;
      else if (v && typeof v === "object") recetas = Object.values(v);
      localStorage.setItem("recetas", JSON.stringify(recetas));
      // no renderizo nada aquí (las recetas van en modal)
    });
  }catch(e){ /* offline? usamos local */ }
})();

const guardarRecetasDebounced = (function(){
  let t=null; 
  return function(){ clearTimeout(t); t=setTimeout(()=>{
    firebase.database().ref(rutaRecetas).set(recetas);
    localStorage.setItem("recetas", JSON.stringify(recetas));
  },300); };
})();

const uidR = ()=> Math.random().toString(36).slice(2,10);

// --------- UI refs (botón abrir/cerrar modal recetas)
const btnAbrirRecetas = document.getElementById("btn-recetas");
const modalRecetas = document.getElementById("modal-recetas");
const rBuscar = document.getElementById("r-buscar");
const rNueva = document.getElementById("r-nueva");
const rCerrar = document.getElementById("r-cerrar");
const rLista = document.getElementById("r-lista");

// Editor
const modalRE = document.getElementById("modal-receta-editor");
const reTitulo = document.getElementById("re-titulo");
const rePorciones = document.getElementById("re-porciones");
const reImagen = document.getElementById("re-imagen");
const reTexto = document.getElementById("re-texto");
const reAnalizar = document.getElementById("re-analizar");
const reIngs = document.getElementById("re-ings");
const reAddIng = document.getElementById("re-add-ing");
const rePasos = document.getElementById("re-pasos");
const reAddPaso = document.getElementById("re-add-paso");
const reGuardar = document.getElementById("re-guardar");
const reCerrar = document.getElementById("re-cerrar");
const reALista = document.getElementById("re-a-lista");

let recetaDraft = null;

// --------- Abrir/ cerrar modales
if(btnAbrirRecetas){
  btnAbrirRecetas.addEventListener("click", ()=>{
    renderListaRecetas();
    modalRecetas.classList.remove("oculto");
  });
}
if(rCerrar) rCerrar.addEventListener("click", ()=> modalRecetas.classList.add("oculto"));
if(modalRecetas) modalRecetas.addEventListener("click", (e)=>{ if(e.target===modalRecetas) modalRecetas.classList.add("oculto"); });
if(reCerrar) reCerrar.addEventListener("click", ()=> modalRE.classList.add("oculto"));
if(modalRE) modalRE.addEventListener("click", (e)=>{ if(e.target===modalRE) modalRE.classList.add("oculto"); });

if(rBuscar) rBuscar.addEventListener("input", renderListaRecetas);
if(rNueva) rNueva.addEventListener("click", ()=> abrirEditorReceta());

// --------- Render lista de recetas (en modal)
function renderListaRecetas(){
  if(!rLista) return;
  rLista.innerHTML = "";
  const q = normalize(rBuscar?.value || "");
  const lista = recetas
    .filter(r => !q || normalize(r.titulo||"").includes(q))
    .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""));
  for(const r of lista){
    const card = document.createElement("div");
    card.className = "tarjeta-receta";
    const img = document.createElement("img");
    img.src = r.imagenURL || "https://placehold.co/80x80?text=%20";
    const t = document.createElement("div");
    t.className = "titulo-receta";
    t.textContent = r.titulo || "(sin título)";

    const mac = calcularMacrosReceta(r);
    const chips = document.createElement("div");
    chips.className = "macros";
    const c1 = document.createElement("span"); c1.className="mchip"; c1.textContent = isFinite(mac.kcal) ? `${Math.round(mac.kcal)} kcal` : "— kcal";
    const c2 = document.createElement("span"); c2.className="mchip"; c2.textContent = isFinite(mac.carb) ? `C:${Math.round(mac.carb)}` : "C: —";
    const c3 = document.createElement("span"); c3.className="mchip"; c3.textContent = isFinite(mac.prot) ? `P:${Math.round(mac.prot)}` : "P: —";
    chips.append(c1,c2,c3);

    const btnEdit = document.createElement("button"); btnEdit.className="btn-inline"; btnEdit.textContent="Editar";
    btnEdit.onclick = ()=> abrirEditorReceta(r);
    const btnAdd = document.createElement("button"); btnAdd.className="btn-inline"; btnAdd.textContent="Añadir a lista";
    btnAdd.onclick = ()=> { añadirRecetaALaLista(r); alert("Ingredientes añadidos a la lista"); };
    const btnDel = document.createElement("button"); btnDel.className="btn-inline"; btnDel.textContent="Borrar";
    btnDel.onclick = ()=>{ if(confirm("¿Borrar receta?")){ recetas = recetas.filter(x=>x.id!==r.id); guardarRecetasDebounced(); renderListaRecetas(); } };

    card.append(img,t,chips,btnEdit,btnAdd,btnDel);
    rLista.append(card);
  }
}

// --------- Editor de receta
function abrirEditorReceta(receta=null){
  recetaDraft = receta ? JSON.parse(JSON.stringify(receta)) : { id: uidR(), titulo:"", porciones:4, imagenURL:"", categorias:[], ingredientes:[], pasos:[] };
  reTitulo.value = recetaDraft.titulo || "";
  rePorciones.value = recetaDraft.porciones || 4;
  reTexto.value = "";
  reIngs.innerHTML = "";
  rePasos.innerHTML = "";
  if(recetaDraft.ingredientes?.length){ recetaDraft.ingredientes.forEach(addIngRow); } else { addIngRow(); }
  if(recetaDraft.pasos?.length){ recetaDraft.pasos.forEach(addPasoRow); } else { addPasoRow(""); }
  modalRE.classList.remove("oculto");
}

reAddIng?.addEventListener("click", ()=> addIngRow());
reAddPaso?.addEventListener("click", ()=> addPasoRow(""));

function addIngRow(ing={nombre:"", cantidad:0, unidad:"ud"}){
  const row = document.createElement("div");
  row.className = "ing-row";
  row.innerHTML = `
    <input type="text" class="ing-nom" placeholder="Ingrediente" value="${ing.nombre||""}">
    <input type="number" step="0.01" min="0" class="ing-cant" placeholder="Cant." value="${ing.cantidad||0}">
    <select class="ing-uni">
      <option value="ud"${ing.unidad==="ud"?" selected":""}>ud</option>
      <option value="g"${ing.unidad==="g"?" selected":""}>g</option>
      <option value="ml"${ing.unidad==="ml"?" selected":""}>ml</option>
    </select>
    <button class="btn-inline ing-del">Borrar</button>
  `;
  row.querySelector(".ing-del").onclick = ()=> row.remove();
  reIngs.append(row);
}
function readIngs(){
  return [...reIngs.querySelectorAll(".ing-row")].map(r=>({
    nombre: r.querySelector(".ing-nom").value.trim(),
    cantidad: +r.querySelector(".ing-cant").value || 0,
    unidad: r.querySelector(".ing-uni").value,
    productoId: null
  })).filter(x=>x.nombre);
}

function addPasoRow(texto=""){
  const row = document.createElement("div");
  row.className="paso-row";
  row.innerHTML = `<input type="text" class="paso-txt" placeholder="Paso" value="${texto}">
  <button class="btn-inline paso-del">Borrar</button>`;
  row.querySelector(".paso-del").onclick = ()=> row.remove();
  rePasos.append(row);
}
function readPasos(){
  return [...rePasos.querySelectorAll(".paso-txt")].map(i=>i.value.trim()).filter(Boolean);
}

reAnalizar?.addEventListener("click", ()=>{
  const parsed = parsearRecetaDesdeTexto(reTexto.value||"");
  if(parsed.titulo) reTitulo.value = parsed.titulo;
  if(parsed.porciones) rePorciones.value = parsed.porciones;
  if(parsed.ingredientes?.length){ reIngs.innerHTML=""; parsed.ingredientes.forEach(addIngRow); }
  if(parsed.pasos?.length){ rePasos.innerHTML=""; parsed.pasos.forEach(addPasoRow); }
});

reGuardar?.addEventListener("click", ()=>{
  const r = {
    id: recetaDraft?.id || uidR(),
    titulo: reTitulo.value.trim() || "(sin título)",
    porciones: +rePorciones.value || 1,
    imagenURL: recetaDraft?.imagenURL || "",
    categorias: [],
    ingredientes: readIngs(),
    pasos: readPasos()
  };
  const ix = recetas.findIndex(x=>x.id===r.id);
  if(ix>=0) recetas[ix]=r; else recetas.push(r);
  guardarRecetasDebounced();
  renderListaRecetas();
  modalRE.classList.add("oculto");
});

reALista?.addEventListener("click", ()=>{
  const r = {
    id: recetaDraft?.id || uidR(),
    titulo: reTitulo.value.trim() || "(sin título)",
    porciones: +rePorciones.value || 1,
    imagenURL: recetaDraft?.imagenURL || "",
    categorias: [],
    ingredientes: readIngs(),
    pasos: readPasos()
  };
  añadirRecetaALaLista(r);
  alert("Ingredientes añadidos a la lista");
});

reImagen?.addEventListener("change", async ()=>{
  const f = reImagen.files?.[0];
  if(!f) return;
  try{
    const url = await subirImagenACloudinary(f);
    recetaDraft = recetaDraft || {};
    recetaDraft.imagenURL = url;
  }catch(e){ /* no romper */ }
});

// --------- Parser receta desde texto
function parsearRecetaDesdeTexto(s){
  const out = {titulo:"", porciones:0, ingredientes:[], pasos:[]};
  s = (s||"").replace(/\r/g,"");
  const mT = s.match(/t[íi]tulo\s*:\s*(.+)/i); if(mT) out.titulo = mT[1].trim();
  const mP = s.match(/porciones?\s*:\s*([0-9]+)/i); if(mP) out.porciones = +mP[1];

  const mI = s.match(/ingredientes\s*:\s*([\s\S]*?)(?:\n\s*(pasos?|elaboraci[óo]n)\s*:|$)/i);
  if(mI){
    const lines = mI[1].split("\n").map(l=>l.trim()).filter(Boolean);
    for(const l of lines){
      const m = l.match(/^-+\s*([\d.,]+)?\s*(g|ml|ud)?\s*(.+)$/i);
      if(m){
        const cant = m[1] ? parseFloat(m[1].replace(",",".")) : 0;
        const uni  = m[2] ? m[2].toLowerCase() : "ud";
        const nom  = (m[3]||"").replace(/\s*\(.*?\)\s*/g,"").trim();
        out.ingredientes.push({nombre:nom, cantidad:cant, unidad:uni, productoId:null});
      }else{
        out.ingredientes.push({nombre:l.replace(/^-\s*/,""), cantidad:0, unidad:"ud", productoId:null});
      }
    }
  }
  const mS = s.match(/(?:\n|^)(pasos?|elaboraci[óo]n)\s*:\s*([\s\S]*)$/i);
  if(mS){
    const lines = mS[2].split("\n").map(x=>x.trim()).filter(Boolean);
    for(const l of lines){
      const t = l.replace(/^\d+\)?[.)]?\s*/,"").trim();
      if(t) out.pasos.push(t);
    }
  }
  return out;
}

// --------- Añadir a la lista (usa tus estructuras y helpers existentes)
function añadirRecetaALaLista(receta){
  if(!Array.isArray(receta?.ingredientes)) return;
  for(const ing of receta.ingredientes){
    const n = normalize(ing.nombre||"");
    let prod = productos.find(p=> normalize(p.nombre)===n );
    if(!prod){
      prod = {
        id: Date.now().toString(),
        nombre: ing.nombre || "Ingrediente",
        supermercado: "Otros",
        cantidad: 0,
        precio: 0,
        comprado: false,
        imagenURL: "",
        categoria: null
      };
      productos.push(prod);
    }
    // Suma simple (sin romper unidades: priorizamos 'ud')
    const cant = Number(ing.cantidad||1);
    prod.cantidad = Math.max(1, (Number(prod.cantidad||0)) + (cant || 1));
  }
  // Re-render con tus funciones
  if (typeof renderLista === "function") renderLista();
  if (typeof calcularTotalEstimado === "function") calcularTotalEstimado();
  if (typeof persistir === "function") persistir(true);
}

// --------- Cálculo de macros (opcional, usa producto.nutricion si existiese)
function calcularMacrosReceta(r){
  let kcal=0, carb=0, prot=0, fat=0;
  if(!Array.isArray(r?.ingredientes)) return {kcal:NaN,carb:NaN,prot:NaN,fat:NaN};
  for(const ing of r.ingredientes){
    const n = normalize(ing.nombre||"");
    const prod = productos.find(p=> normalize(p.nombre)===n );
    if(!prod || !prod.nutricion) continue;
    let factor = 0;
    if(ing.unidad==="g"||ing.unidad==="ml") factor = (ing.cantidad||0)/100;
    else if (prod.gramosPorUnidad) factor = (prod.gramosPorUnidad*(ing.cantidad||1))/100;
    kcal += (prod.nutricion.kcal_100||0)*factor;
    carb += (prod.nutricion.carb_100||0)*factor;
    prot += (prod.nutricion.prot_100||0)*factor;
    fat  += (prod.nutricion.fat_100||0)*factor;
  }
  return {kcal,carb,prot,fat};
}
// ========= PESTAÑA RECETAS (solo añade; no tocamos tu lógica previa) =========

// Estado local (si no existiese ya)
window._recetas = window._recetas || JSON.parse(localStorage.getItem("recetas") || "[]");
const _rutaRecetas = "recetas/Charly";

// Carga inicial (idempotente)
(function _cargarRecetasUnaVez(){
  try{
    firebase.database().ref(_rutaRecetas).once("value").then(s=>{
      const v = s.val();
      if (Array.isArray(v)) window._recetas = v;
      else if (v && typeof v === "object") window._recetas = Object.values(v);
      localStorage.setItem("recetas", JSON.stringify(window._recetas));
      // Si la pestaña recetas está activa, renderizamos
      const recTab = document.getElementById("tab-recetas");
      if (recTab && recTab.classList.contains("active")) renderRecetas();
    });
  }catch(e){}
})();

const _guardarRecetasDeb = (()=>{ let t; return ()=>{
  clearTimeout(t); t=setTimeout(()=>{
    firebase.database().ref(_rutaRecetas).set(window._recetas||[]);
    localStorage.setItem("recetas", JSON.stringify(window._recetas||[]));
  },300);
};})();

// ---- Tabs (mostrar/ocultar vistas) ----
const tabProductos = document.getElementById("tab-productos");
const tabRecetas   = document.getElementById("tab-recetas");
const vistaRecetas = document.getElementById("vista-recetas");

// Detecta tu contenedor de productos (no lo renombramos)
const vistaProductos = document.querySelector("#vista-lista, #productos, .vista-productos") || document.body;

if (tabProductos && tabRecetas && vistaRecetas && vistaProductos){
  tabProductos.addEventListener("click", ()=>{
    tabProductos.classList.add("active");
    tabRecetas.classList.remove("active");
    vistaProductos.classList.remove("oculto");
    vistaRecetas.classList.add("oculto");
  });
  tabRecetas.addEventListener("click", ()=>{
    tabRecetas.classList.add("active");
    tabProductos.classList.remove("active");
    vistaProductos.classList.add("oculto");
    vistaRecetas.classList.remove("oculto");
    renderRecetas();
  });
}

// ---- UI Recetas ----
const buscarRecetas = document.getElementById("buscar-recetas");
const listaRecetas  = document.getElementById("lista-recetas");
const btnNuevaReceta= document.getElementById("btn-nueva-receta");

buscarRecetas && buscarRecetas.addEventListener("input", renderRecetas);
btnNuevaReceta && btnNuevaReceta.addEventListener("click", ()=> abrirEditorReceta());

// Editor modal (si ya lo tienes en tu HTML)
function abrirEditorReceta(receta){
  // Si ya implementaste tu modal de editor, rellénalo aquí.
  if (!document.getElementById("modal-receta-editor")){
    alert("No encuentro el modal de editor de recetas (#modal-receta-editor). Si quieres te lo añado sin tocar estilos.");
    return;
  }
  // Evento personalizado para tu editor (mantén tu implementación)
  document.dispatchEvent(new CustomEvent("editar-receta", { detail: receta||null }));
}

// Render de tarjetas
function renderRecetas(){
  if (!listaRecetas) return;
  const q = (buscarRecetas?.value || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").trim();
  const arr = (window._recetas||[])
    .filter(r => !q || (r.titulo||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").includes(q))
    .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""));
  listaRecetas.innerHTML = "";
  for (const r of arr){
    const card = document.createElement("div");
    card.className = "receta-card";

    const img = document.createElement("img");
    img.src = r.imagenURL || "https://placehold.co/80x80?text=%20";

    const info = document.createElement("div");
    info.className = "receta-info";
    info.innerHTML = `<div><strong>${r.titulo || "(sin título)"}</strong></div>`;

    const chips = document.createElement("div");
    chips.className = "receta-chips";
    const macros = calcularMacrosReceta(r);
    chips.innerHTML = `
      <span class="receta-chip">${isFinite(macros.kcal)? Math.round(macros.kcal):"—"} kcal</span>
      <span class="receta-chip">C:${isFinite(macros.carb)? Math.round(macros.carb):"—"}</span>
      <span class="receta-chip">P:${isFinite(macros.prot)? Math.round(macros.prot):"—"}</span>
      <span class="receta-chip">x${r.porciones||1}</span>
    `;

    const acciones = document.createElement("div");
    acciones.style.display="flex"; acciones.style.gap="6px";
    const bEdit = document.createElement("button"); bEdit.textContent="Editar";
    const bAdd  = document.createElement("button"); bAdd.textContent="Añadir a lista";
    const bDel  = document.createElement("button"); bDel.textContent="Borrar";
    bEdit.onclick = ()=> abrirEditorReceta(r);
    bAdd.onclick  = ()=> { añadirRecetaALaLista(r); alert("Ingredientes añadidos a la lista"); };
    bDel.onclick  = ()=> {
      if(confirm("¿Borrar receta?")){
        window._recetas = (window._recetas||[]).filter(x=>x.id!==r.id);
        _guardarRecetasDeb(); renderRecetas();
      }
    };

    acciones.append(bEdit,bAdd,bDel);
    info.appendChild(chips);
    card.append(img, info, acciones);
    listaRecetas.append(card);
  }
}

// ---- Sumar ingredientes a la lista (reutiliza tus estructuras) ----
function añadirRecetaALaLista(receta){
  if(!Array.isArray(receta?.ingredientes)) return;
  // Asumimos que tienes `window.productos` y funciones de render/persistencia.
  window.productos = window.productos || JSON.parse(localStorage.getItem("productos")||"[]");

  const normalize = s=> (s||"").toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu,"")
        .replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();

  for(const ing of receta.ingredientes){
    const n = normalize(ing.nombre);
    let prod = window.productos.find(p=> normalize(p.nombre)===n );
    if(!prod){
      prod = {
        id: Date.now().toString(36)+Math.random().toString(36).slice(2,7),
        nombre: ing.nombre || "Ingrediente",
        supermercado: "Otros",
        cantidad: 0,
        precio: 0,
        comprado: false,
        imagenURL: "",
        categoria: null
      };
      window.productos.push(prod);
    }
    const cant = Number(ing.cantidad||1);
    prod.cantidad = Math.max(1, (Number(prod.cantidad||0)) + (cant || 1));
  }

  // Persistencia y re-render usando tus funciones si existen
  if (typeof persistir === "function") persistir(true);
  else {
    localStorage.setItem("productos", JSON.stringify(window.productos));
    if (window.firebase?.database) firebase.database().ref("productos/Charly").set(window.productos);
  }
  if (typeof renderLista === "function") renderLista();
}

// ---- Macros (usa tus campos si los tienes) ----
function calcularMacrosReceta(r){
  let kcal=0, carb=0, prot=0, fat=0;
  if(!Array.isArray(r?.ingredientes)) return {kcal:NaN,carb:NaN,prot:NaN,fat:NaN};
  const normalize = s=> (s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").trim();

  for(const ing of r.ingredientes){
    const prod = (window.productos||[]).find(p=> normalize(p.nombre)===normalize(ing.nombre));
    if(!prod || !prod.nutricion) continue;
    let factor = 0;
    if(ing.unidad==="g"||ing.unidad==="ml") factor = (ing.cantidad||0)/100;
    else if (prod.gramosPorUnidad) factor = (prod.gramosPorUnidad*(ing.cantidad||1))/100;
    kcal += (prod.nutricion.kcal_100||0)*factor;
    carb += (prod.nutricion.carb_100||0)*factor;
    prot += (prod.nutricion.prot_100||0)*factor;
    fat  += (prod.nutricion.fat_100||0)*factor;
  }
  return {kcal, carb, prot, fat};
}

// ---- API pública mínima para que otros scripts puedan guardar recetas ----
window.Recetas = {
  add(r){
    r.id = r.id || (Date.now().toString(36)+Math.random().toString(36).slice(2,7));
    window._recetas.push(r);
    _guardarRecetasDeb();
    if (document.getElementById("tab-recetas")?.classList.contains("active")) renderRecetas();
  }
};
// === Switch Productos/Recetas (no invade tu lógica) ===
(function(){
  const tabProd = document.getElementById("tab-productos");
  const tabRec  = document.getElementById("tab-recetas");
  const vistaProd = document.getElementById("lista-productos");   // tu sección actual
  const vistaRec  = document.getElementById("vista-recetas");     // sección nueva

  if(!tabProd || !tabRec || !vistaProd || !vistaRec) return;

  function activarProd(){
    tabProd.classList.add("active");
    tabRec.classList.remove("active");
    vistaProd.classList.remove("oculto");
    vistaRec.classList.add("oculto");
  }
  function activarRec(){
    tabRec.classList.add("active");
    tabProd.classList.remove("active");
    vistaRec.classList.remove("oculto");
    vistaProd.classList.add("oculto");
    if (typeof renderRecetas === "function") renderRecetas();
  }

  tabProd.addEventListener("click", activarProd);
  tabRec.addEventListener("click", activarRec);
})();

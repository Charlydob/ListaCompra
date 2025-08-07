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

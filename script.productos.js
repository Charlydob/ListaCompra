// ============ PRODUCTOS ============
document.addEventListener("DOMContentLoaded", () => {

  // EVITAR SCROLL RARO / PANTALLA EN BLANCO AL ABRIR
  window.scrollTo(0, 0);

  const COMIDAS_POR_DIA = 2; // ...
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
  } catch (e) {
    try { firebase.initializeApp(firebaseConfig); } catch (_) { /* noop */ }
  }
  window.db = firebase.database();

  // --- Rutas ---
  const rutaProductos = "productos/Charly";

  // --- State ---
  window.productos = window.productos || [];
  let productos = window.productos;
  let categorias = [];
  let filtroTexto = "";
  let filtroCategoria = "";
  let stockFiltro = "todos";
  let gruposDOM = new Map();
  let productoActual = null;
  const estadoComprados = {};
  const headerPrincipal = document.querySelector("header");

  // --- DOM refs ---
  const input = document.getElementById("input-producto");
  const selectSuper = document.getElementById("selector-super");
  const btnAgregar = document.getElementById("btn-agregar");
  const contenedorLista = document.getElementById("lista-productos");
  const totalEstimadoEl = document.getElementById("total-estimado");
  const totalCharlyEl = document.getElementById("total-charly");
  const totalLauraEl = document.getElementById("total-laura");
  const filtroCatSel = document.getElementById("filtro-categoria");
  const btnScrollTop = document.getElementById("btn-scroll-top");

  // tabs
  const tabProd = document.getElementById("tab-productos");
  const tabRec = document.getElementById("tab-recetas");
  const tabStock = document.getElementById("tab-stock");
  const vistaRec = document.getElementById("vista-recetas");
  const vistaStock = document.getElementById("vista-stock");

  // stock view
  const buscarStock = document.getElementById("buscar-stock");
  const contStockResultado = document.getElementById("stock-resultado");
  const stockResumen = document.getElementById("stock-resumen");
  const listaStockVisible = document.getElementById("stock-visibles");

  // --- Helpers ---
  const normalize = (s) =>
    (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const parseStockValor = (val) => {
    const num = parseFloat((val || "").toString().replace(",", "."));
    return Math.max(0, isNaN(num) ? 0 : num);
  };

  const asegurarVisibilidadConStock = (p) => {
    if (parseStockValor(p?.stock) > 0) {
      p.visibleStock = true;
    }
  };

  const debounce = (fn, wait = 300) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), wait);
    };
  };

  const guardarDebounced = debounce(() => {
    db.ref(rutaProductos).set(productos);
    localStorage.setItem("productos", JSON.stringify(productos));
  }, 300);

  function guardarAhora() {
    db.ref(rutaProductos).set(productos);
    localStorage.setItem("productos", JSON.stringify(productos));
  }

  window.persistir = (inmediato = false) => (inmediato ? guardarAhora() : guardarDebounced());

function aplicarDefaultsProducto(p) {
  if (p.cantidad == null) p.cantidad = 1;
  if (p.stock == null) p.stock = 0;
  if (!p.supermercado) p.supermercado = "Otros";

  // ya existe en tu app
  if (p.comidas == null) p.comidas = 0;

  // NUEVO (stock inteligente)
  if (p.stockGrupo == null) p.stockGrupo = "";      // "", base, prot, verd, extra
  if (p.stockPorComida == null) p.stockPorComida = 1; // divisor (si algo “cuenta” media)
  if (p.stockMin == null) p.stockMin = null;        // null = sin umbral
  if (p.autoAddLow == null) p.autoAddLow = false;   // auto añadir a lista

  p.visibleStock = p.visibleStock !== false;
  asegurarVisibilidadConStock(p);
  return p;
}


  // --- Totales avanzados (dinero + comidas + días) ---
  window.calcularTotalEstimado = function () {
    let total = 0;
    let totalCharly = 0;
    let totalLaura = 0;
    let comidasCharly = 0;
    let comidasLaura = 0;

    for (const p of productos) {
      if (p.comprado) continue;

      const cantidad = Number(p.cantidad || 0);
      const precioUnit = Number(p.precio || 0);
      const comidasPack = Number(p.comidas || 0);

      const precioTotal = precioUnit * cantidad;
      const comidasTot = comidasPack * (cantidad || 1);

      total += precioTotal;

      const para = (p.para || "ambos").toLowerCase();
      if (para === "charly" || para === "c") {
        totalCharly += precioTotal;
        comidasCharly += comidasTot;
      } else if (para === "laura" || para === "l") {
        totalLaura += precioTotal;
        comidasLaura += comidasTot;
      } else {
        totalCharly += precioTotal / 2;
        totalLaura += precioTotal / 2;
        comidasCharly += comidasTot / 2;
        comidasLaura += comidasTot / 2;
      }
    }

    if (totalEstimadoEl) {
      totalEstimadoEl.textContent = `Total compra: ${total.toFixed(2)} €`;
    }

    const diasCharly = comidasCharly ? comidasCharly / COMIDAS_POR_DIA : 0;
    const diasLaura = comidasLaura ? comidasLaura / COMIDAS_POR_DIA : 0;

    if (totalCharlyEl) {
      totalCharlyEl.textContent =
        `Charly: ${totalCharly.toFixed(2)} € — ` +
        `${comidasCharly.toFixed(1)} comidas (~${diasCharly.toFixed(1)} días)`;
    }

    if (totalLauraEl) {
      totalLauraEl.textContent =
        `Laura: ${totalLaura.toFixed(2)} € — ` +
        `${comidasLaura.toFixed(1)} comidas (~${diasLaura.toFixed(1)} días)`;
    }
  };

  function actualizarCategoriasDesdeProductos() {
    categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
    actualizarSelectorCategorias();
  }

  function actualizarSelectorCategorias() {
    if (!filtroCatSel) return;
    const valorPrevio = filtroCatSel.value;
    filtroCatSel.innerHTML = '<option value="">Todas las categorías</option>';
    categorias.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      filtroCatSel.appendChild(opt);
    });
    if ([...filtroCatSel.options].some((o) => o.value === valorPrevio)) {
      filtroCatSel.value = valorPrevio;
    }
  }

  function mantenerScrollDurante(fn) {
    const y = window.scrollY;
    fn();
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  function modificarStock(prod, delta) {
    if (!prod) return;
    const nuevo = Math.max(0, parseStockValor(prod.stock) + delta);
    prod.stock = nuevo;
    asegurarVisibilidadConStock(prod);
    actualizarTarjetaStock(prod.id, nuevo);
    renderStockResultados();
    renderStockResumen();
    renderStockVisibles();
    persistir();
  }

  // --- Data load ---
  function cargarDesdeLocalStorage() {
    try {
      const arr = JSON.parse(localStorage.getItem("productos") || "[]");
      if (Array.isArray(arr)) {
        productos = arr.map(aplicarDefaultsProducto);
        window.productos = productos;
        actualizarCategoriasDesdeProductos();
        renderLista();
        return true;
      }
    } catch {}
    return false;
  }

  function cargarDesdeFirebase() {
    db.ref(rutaProductos).once("value").then((s) => {
      const data = s.val();
      if (!data) return;
      productos = (Array.isArray(data) ? data : Object.values(data)).map(aplicarDefaultsProducto);
      window.productos = productos;
      actualizarCategoriasDesdeProductos();
      renderLista();
    });
  }

  // --- Render productos (tarjetas) ---
  function limpiarGrupos() {
    gruposDOM.clear();
    if (contenedorLista) contenedorLista.innerHTML = "";
  }

  function crearGrupo(supermercado) {
    const grupo = document.createElement("div");
    grupo.className = "supermercado-grupo";

    const titulo = document.createElement("div");
    titulo.className = "supermercado-titulo";
    titulo.textContent = supermercado;
    titulo.style.cursor = "pointer";

    const contTar = document.createElement("div");
    contTar.className = "contenedor-tarjetas";

    titulo.addEventListener("click", () => contTar.classList.toggle("oculto"));

    grupo.append(titulo, contTar);
    contenedorLista.appendChild(grupo);
    const ref = { grupo, titulo, contenedor: contTar };
    gruposDOM.set(supermercado, ref);
    return ref;
  }

  function pasaFiltros(p) {
    if (filtroTexto && !normalize(p.nombre).includes(normalize(filtroTexto))) return false;
    if (filtroCategoria && normalize(p.categoria) !== normalize(filtroCategoria)) return false;
    return true;
  }

  function crearDestacadoBusqueda(p) {
    const wrap = document.createElement("div");
    wrap.className = "busqueda-destacada";

    const etiqueta = document.createElement("div");
    etiqueta.className = "busqueda-destacada-label";
    etiqueta.textContent = "Coincidencia encontrada";

    wrap.append(etiqueta, crearTarjetaProducto(p));
    return wrap;
  }

  window.renderLista = function () {
    if (!contenedorLista) return;
    calcularTotalEstimado();
    limpiarGrupos();

    let destacadoId = null;

    if (filtroTexto) {
      const candidato = productos
        .filter((p) => pasaFiltros(p))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))[0];

      if (candidato) {
        destacadoId = candidato.id;
        contenedorLista.appendChild(crearDestacadoBusqueda(candidato));
      }
    }

    const porSuper = new Map();
    for (const p of productos) {
      if (destacadoId && p.id === destacadoId) continue;
      if (!pasaFiltros(p)) continue;
      if (!porSuper.has(p.supermercado)) porSuper.set(p.supermercado, []);
      porSuper.get(p.supermercado).push(p);
    }

    const hayFiltroActivo = !!(filtroTexto || filtroCategoria);

    for (const [supermercado, arr] of porSuper) {
      const grupo = crearGrupo(supermercado);
      arr.sort((a, b) => (a.comprado - b.comprado) || a.nombre.localeCompare(b.nombre));

      const activos = arr.filter((p) => !p.comprado);
      const comprados = arr.filter((p) => p.comprado);

      if (!activos.length) grupo.contenedor.classList.add("oculto");
      else grupo.contenedor.classList.remove("oculto");

      for (const p of activos) grupo.contenedor.appendChild(crearTarjetaProducto(p));

      if (comprados.length) {
        const toggle = document.createElement("button");
        toggle.className = "btn-comprados";
        toggle.textContent = `Comprados (${comprados.length})`;

        const contComprados = document.createElement("div");
        contComprados.className = "contenedor-tarjetas cont-comprados oculto";
        contComprados.dataset.super = supermercado;

        const renderComprados = () => {
          contComprados.innerHTML = "";
          comprados.forEach((p) => contComprados.appendChild(crearTarjetaProducto(p)));
        };

        const abrir = () => {
          renderComprados();
          contComprados.classList.remove("oculto");
          estadoComprados[supermercado] = true;
        };
        const cerrar = () => {
          contComprados.classList.add("oculto");
          contComprados.innerHTML = "";
          estadoComprados[supermercado] = false;
        };

        toggle.addEventListener("click", () => {
          const abierto = contComprados.classList.contains("oculto") === false;
          if (abierto) cerrar();
          else abrir();
        });

        if (hayFiltroActivo || estadoComprados[supermercado]) abrir();

        grupo.contenedor.append(toggle, contComprados);
      }
    }

    renderStockResumen();
    renderStockVisibles();
  };

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

    const meta = document.createElement("div");
    meta.className = "producto-meta";
    meta.style.fontSize = "11px";
    meta.style.opacity = "0.8";
    const txtComidas = prod.comidas ? `${prod.comidas} comidas/pack` : "—";
    const txtPara =
      (prod.para || "ambos") === "ambos"
        ? "Ambos"
        : (prod.para || "").charAt(0).toUpperCase() + (prod.para || "").slice(1);
    meta.textContent = `${txtComidas} · ${txtPara}`;

    const wrapTexto = document.createElement("div");
    wrapTexto.style.display = "flex";
    wrapTexto.style.flexDirection = "column";
    wrapTexto.appendChild(nombre);
    wrapTexto.appendChild(meta);

    const wrapCantidad = document.createElement("div");
    wrapCantidad.className = "controles-cantidad";

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

    wrapCantidad.append(btnMenos, contador, btnMas);

    const chipStock = document.createElement("label");
    chipStock.className = "stock-field";
    chipStock.textContent = "En stock:";

    const inputStock = document.createElement("input");
    inputStock.type = "number";
    inputStock.inputMode = "numeric";
    inputStock.className = "stock-input";
    inputStock.placeholder = "0";
    inputStock.value = prod.stock ? prod.stock : "";
    inputStock.min = "0";
    inputStock.step = "0.01";

    const valorStock = document.createElement("span");
    valorStock.className = "chip-stock-valor oculto";
    valorStock.textContent = prod.stock ?? 0;

    chipStock.append(inputStock);

    const contDerecha = document.createElement("div");
    contDerecha.className = "tarjeta-controles";
    contDerecha.append(wrapCantidad, chipStock);

    // Gestos táctiles en contador
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
        const deltaY = e.changedTouches[0].clientY - startY;
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

    inputStock.addEventListener("click", (e) => e.stopPropagation());
    inputStock.addEventListener("change", (e) => {
      const nuevo = parseStockValor(e.target.value);
      prod.stock = nuevo;
      asegurarVisibilidadConStock(prod);
      actualizarTarjetaStock(prod.id, nuevo);
      renderStockResultados();
      renderStockResumen();
      renderStockVisibles();
      persistir();
    });

    checkbox.addEventListener("change", () => {
      prod.comprado = !!checkbox.checked;
      actualizarTarjetaComprado(prod.id, prod.comprado);
      persistir();
      calcularTotalEstimado();
      mantenerScrollDurante(() => renderLista());
    });

    tarjeta.addEventListener("click", (e) => {
      if ([checkbox, btnMas, btnMenos, inputStock].includes(e.target)) return;
      abrirModalEdicion(prod);
    });

    tarjeta.append(checkbox, imagen, wrapTexto, contDerecha);
aplicarLowClassEnTarjetaProd(prod);


    return tarjeta;
  }

  function buscarTarjetaDOM(id) {
    return contenedorLista.querySelector(`.tarjeta-producto[data-id="${id}"]`);
  }
function getStockMin(p) {
  const t = Number(p?.stockMin);
  return Number.isFinite(t) && t > 0 ? t : null;
}
function isLowStock(p) {
  const t = getStockMin(p);
  if (!t) return false;
  return parseStockValor(p.stock) <= t;
}
function aplicarLowClassEnTarjetaProd(p) {
  const card = buscarTarjetaDOM(p.id);
  if (card) card.classList.toggle("low-stock", isLowStock(p));
}
function autoAddSiBajo(p) {
  if (!p?.autoAddLow) return false;
  if (!isLowStock(p)) return false;
  if (p.comprado) {
    p.comprado = false;
    actualizarTarjetaComprado(p.id, false);
    return true;
  }
  return false;
}

// exports para stock.js
window.lc_isLowStock = isLowStock;
window.lc_getStockMin = getStockMin;
window.lc_applyLowStockToProductCard = aplicarLowClassEnTarjetaProd;
window.lc_autoAddIfLow = (p) => {
  const changed = autoAddSiBajo(p);
  if (changed) {
    calcularTotalEstimado();
    mantenerScrollDurante(() => renderLista());
    persistir();
  }
  return changed;
};

  function actualizarTarjetaCantidad(id, cantidad) {
    const c = buscarTarjetaDOM(id)?.querySelector(".contador");
    if (c) c.textContent = cantidad;
  }

  function actualizarTarjetaStock(id, stock) {
    const tarjeta = buscarTarjetaDOM(id);
    if (!tarjeta) return;
    const chip = tarjeta.querySelector(".chip-stock-valor");
    const input = tarjeta.querySelector(".stock-input");
    if (chip) chip.textContent = stock;
    if (input) input.value = stock ? stock : "";
      const prod = productos.find((p) => p.id === id);
  if (prod) {
    tarjeta.classList.toggle("low-stock", isLowStock(prod));
    if (autoAddSiBajo(prod)) {
      calcularTotalEstimado();
      mantenerScrollDurante(() => renderLista());
      persistir();
    }
  }

  }

  function actualizarTarjetaComprado(id, comprado) {
    const card = buscarTarjetaDOM(id);
    if (!card) return;
    card.classList.toggle("tarjeta-comprado", !!comprado);
    const chk = card.querySelector(".checkbox");
    if (chk) chk.checked = !!comprado;
  }
// Exports para el módulo Stock
window.lc_updateTarjetaStock = actualizarTarjetaStock;
window.lc_updateTarjetaComprado = actualizarTarjetaComprado;

  function reordenarTarjetaEnGrupo(prod) {
    const card = buscarTarjetaDOM(prod.id);
    if (!card) return;
    const grupoRef = gruposDOM.get(prod.supermercado);
    if (!grupoRef) return;

    const hijos = [...grupoRef.contenedor.children];
    const items = hijos
      .map((el) => {
        const id = el.dataset.id;
        const p = productos.find((x) => x.id === id);
        return p && pasaFiltros(p) ? { el, p } : null;
      })
      .filter(Boolean);

    items.sort(
      (a, b) => (a.p.comprado - b.p.comprado) || a.p.nombre.localeCompare(b.p.nombre)
    );
    for (const { el } of items) grupoRef.contenedor.appendChild(el);
  }

  // --- Campos extra en modal ---
  (function ensureCamposExtra() {
    const cont = document.querySelector("#modal-edicion .campos-laterales");
    if (!cont) return;
    if (!document.getElementById("modal-comidas")) {
      const frag = document.createElement("div");
      frag.innerHTML = `
        <label>Comidas por paquete</label>
        <input type="number" id="modal-comidas" step="1" min="0" placeholder="Ej. 2" />

        <label>Días por paquete</label>
        <input type="number" id="modal-dias" step="0.1" min="0" placeholder="Calculado automáticamente" />

        <label>Para quién</label>
        <select id="modal-para">
          <option value="ambos">Ambos</option>
          <option value="charly">Charly</option>
          <option value="laura">Laura</option>
        </select>

        <label>Grupo stock</label>
        <select id="modal-stock-grupo">
          <option value="">(Sin grupo)</option>
          <option value="base">Base</option>
          <option value="prot">Proteína</option>
          <option value="verd">Verdura</option>
          <option value="extra">Extra</option>
          <option value="desayuno">Desayuno</option>
          <option value="snack">Snack</option>
          <option value="plato">Plato</option>
        </select>

        <label>Stock por comida</label>
        <input type="number" id="modal-stock-porcomida" step="0.1" min="0.1" placeholder="1" />

        <label>Stock mínimo</label>
        <input type="number" id="modal-stock-min" step="0.1" min="0" placeholder="Umbral auto" />

        <label style="align-self:center; text-align:left">
          <input type="checkbox" id="modal-autoadd" style="width:auto;margin-right:8px" />
          Autoañadir si hay poco
        </label>
      `;
      const botones = cont.querySelector(".modal-botones");
      if (botones) cont.insertBefore(frag, botones);
      else cont.appendChild(frag);
    }
  })();

  // --- Modal producto ---
  function abrirModalEdicion(prod) {
    productoActual = prod;

    const nombre = document.getElementById("modal-nombre");
    const precio = document.getElementById("modal-precio");
    const selSuper = document.getElementById("modal-super");
    const cat = document.getElementById("modal-categoria");
    const preview = document.getElementById("modal-preview-imagen");
    const inputFile = document.getElementById("modal-imagen");
    const inpComidas = document.getElementById("modal-comidas");
    const inpDias = document.getElementById("modal-dias");
    const selPara = document.getElementById("modal-para");
    const selStockGrupo = document.getElementById("modal-stock-grupo");
    const inpStockPorComida = document.getElementById("modal-stock-porcomida");
    const inpStockMin = document.getElementById("modal-stock-min");
    const chkAutoAdd = document.getElementById("modal-autoadd");

    if (!nombre) return;

    nombre.value = prod.nombre || "";
    precio.value = prod.precio || 0;

    selSuper.innerHTML = [...new Set(productos.map((p) => p.supermercado))]
      .map((s) => `<option ${s === prod.supermercado ? "selected" : ""}>${s}</option>`)
      .join("");

    cat.value = prod.categoria || "";
    preview.src = prod.imagenURL || "https://placehold.co/150";
    inputFile.value = "";

    if (inpComidas) inpComidas.value = Number(prod.comidas || 0);
    const dias = prod.diasPorPaquete ?? (prod.comidas ? prod.comidas / COMIDAS_POR_DIA : 0);
    if (inpDias) inpDias.value = dias ? Number(dias).toFixed(1) : "";
    if (selPara) selPara.value = (prod.para || "ambos").toLowerCase();
    if (selStockGrupo) selStockGrupo.value = prod.stockGrupo || "";
    if (inpStockPorComida) inpStockPorComida.value = prod.stockPorComida || 1;
    if (inpStockMin) inpStockMin.value = prod.stockMin ?? "";
    if (chkAutoAdd) chkAutoAdd.checked = !!prod.autoAddLow;

    document.getElementById("modal-edicion").classList.remove("oculto");
    setTimeout(() => nombre.focus(), 10);
  }
  window.lc_abrirModalEdicion = abrirModalEdicion;

  window.subirImagenACloudinary = function (file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "publico");
    return fetch("https://api.cloudinary.com/v1_1/dgdavibcx/image/upload", {
      method: "POST",
      body: fd
    })
      .then((r) => r.json())
      .then((d) => d.secure_url);
  };

  function cerrarModal() {
    const m = document.getElementById("modal-edicion");
    if (m) m.classList.add("oculto");
    productoActual = null;
  }

  const btnGuardar = document.getElementById("btn-guardar-cambios");
  const btnBorrar = document.getElementById("btn-borrar-producto");
  const btnCerrar = document.getElementById("btn-cerrar-modal");
  const modalEd = document.getElementById("modal-edicion");

  if (btnGuardar)
    btnGuardar.addEventListener("click", async () => {
      if (!productoActual) return;

      const nuevoNombre = (document.getElementById("modal-nombre").value || "").trim();
      const nuevoPrecio =
        parseFloat(document.getElementById("modal-precio").value) || 0;
      const nuevoSuper = document.getElementById("modal-super").value;
      const nuevaCat = (document.getElementById("modal-categoria").value || "").trim();
      const archivo = document.getElementById("modal-imagen").files[0];
      const inpComidas = document.getElementById("modal-comidas");
      const inpDias = document.getElementById("modal-dias");
      const selPara = document.getElementById("modal-para");
      const selStockGrupo = document.getElementById("modal-stock-grupo");
      const inpStockPorComida = document.getElementById("modal-stock-porcomida");
      const inpStockMin = document.getElementById("modal-stock-min");
      const chkAutoAdd = document.getElementById("modal-autoadd");

      const superAnterior = productoActual.supermercado;

      productoActual.nombre = nuevoNombre;
      productoActual.precio = nuevoPrecio;
      productoActual.supermercado = nuevoSuper;
      productoActual.categoria = nuevaCat || null;
      productoActual.comidas = inpComidas
        ? Number(inpComidas.value || 0)
        : Number(productoActual.comidas || 0);
      const diasManual = inpDias ? Number(inpDias.value || 0) : 0;
      const diasCalc = productoActual.comidas ? productoActual.comidas / COMIDAS_POR_DIA : 0;
      productoActual.diasPorPaquete = diasManual || diasCalc || 0;
      productoActual.para = selPara
        ? selPara.value
        : (productoActual.para || "ambos");
      productoActual.stockGrupo = selStockGrupo ? selStockGrupo.value : productoActual.stockGrupo;
      productoActual.stockPorComida = inpStockPorComida
        ? Number(inpStockPorComida.value || 1)
        : Number(productoActual.stockPorComida || 1);
      productoActual.stockMin = inpStockMin ? Number(inpStockMin.value || 0) || null : productoActual.stockMin;
      productoActual.autoAddLow = chkAutoAdd ? !!chkAutoAdd.checked : !!productoActual.autoAddLow;

      if (nuevaCat && !categorias.includes(nuevaCat)) {
        categorias.push(nuevaCat);
        actualizarSelectorCategorias();
      }

      if (archivo) {
        try {
          const url = await subirImagenACloudinary(archivo);
          productoActual.imagenURL = url;
        } catch {}

      }

      if (superAnterior !== productoActual.supermercado || !pasaFiltros(productoActual)) {
        mantenerScrollDurante(() => renderLista());
      } else {
        const card = buscarTarjetaDOM(productoActual.id);
        if (card) {
          const nombreEl = card.querySelector(".nombre-producto");
          if (nombreEl) nombreEl.textContent = productoActual.nombre;
          const metaEl = card.querySelector(".producto-meta");
          if (metaEl) {
            const txtComidas = productoActual.comidas
              ? `${productoActual.comidas} comidas/pack`
              : "—";
            const txtPara =
              (productoActual.para || "ambos") === "ambos"
                ? "Ambos"
                : (productoActual.para || "").charAt(0).toUpperCase() +
                  (productoActual.para || "").slice(1);
            metaEl.textContent = `${txtComidas} · ${txtPara}`;
          }
          const imgEl = card.querySelector("img");
          if (imgEl && productoActual.imagenURL) imgEl.src = productoActual.imagenURL;
          reordenarTarjetaEnGrupo(productoActual);
        } else {
          mantenerScrollDurante(() => renderLista());
        }
      }

      calcularTotalEstimado();
      persistir(true);
      cerrarModal();
    });

  if (btnBorrar)
    btnBorrar.addEventListener("click", () => {
      if (!productoActual) return;
      if (!confirm(`¿Eliminar "${productoActual.nombre}"?`)) return;
      productos = productos.filter((p) => p.id !== productoActual.id);
      window.productos = productos;
      const card = contenedorLista.querySelector(
        `.tarjeta-producto[data-id="${productoActual.id}"]`
      );
      if (card?.parentElement) card.parentElement.removeChild(card);
      calcularTotalEstimado();
      persistir(true);
      cerrarModal();
    });

  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  if (modalEd)
    modalEd.addEventListener("click", (e) => {
      if (e.target.id === "modal-edicion") cerrarModal();
    });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarModal();
  });

  // --- Interacción cabecera / búsqueda con debounce ---
  const renderListaFiltradaDeb = debounce(
    () => mantenerScrollDurante(() => renderLista()),
    150
  );

  function crearToggleVisibilidad(p) {
    const btn = document.createElement("button");
    btn.className = "stock-toggle";

    const syncEstado = () => {
      const visible = p.visibleStock !== false;
      btn.textContent = visible ? "🚫" : "👁️";
      btn.title = visible ? "Visible en stock" : "Oculto en stock";
      btn.ariaLabel = btn.title;
    };

    btn.addEventListener("click", () => {
      p.visibleStock = p.visibleStock === false;
      syncEstado();
      renderStockVisibles();
      renderStockResumen();
      renderStockResultados();
      persistir();
    });

    syncEstado();
    return btn;
  }

  if (btnScrollTop) {
    const syncScrollBtn = () => {
      btnScrollTop.classList.toggle("visible", window.scrollY > 400);
    };
    window.addEventListener("scroll", syncScrollBtn, { passive: true });
    syncScrollBtn();
    btnScrollTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (btnAgregar)
    btnAgregar.addEventListener("click", () => {
      const nombreRaw = (input.value || "").trim();
      const supermercado = selectSuper?.value;
      if (!nombreRaw || !supermercado) return;

      const nombre =
        nombreRaw.charAt(0).toUpperCase() + nombreRaw.slice(1).toLowerCase();

      const existe = productos.filter((p) =>
        normalize(p.nombre).includes(normalize(nombreRaw))
      );
      if (existe.length > 0) {
        filtroTexto = nombreRaw;
        renderLista();
      } else {
        const nuevo = {
          id: Date.now().toString(),
          nombre,
          supermercado,
          cantidad: 1,
          stock: 0,
          visibleStock: true,
          precio: 0,
          comprado: false,
          imagenURL: "",
          categoria: null,
          comidas: 0,
          diasPorPaquete: 0,
          para: "ambos",
          stockGrupo: "",
          stockPorComida: 1,
          stockMin: null,
          autoAddLow: false
        };
        productos.push(nuevo);
        window.productos = productos;

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
      filtroTexto = "";
      input.value = "";
      renderLista();
      renderStockVisibles();
      renderStockResumen();
    });

  if (input)
    input.addEventListener("input", () => {
      filtroTexto = input.value.trim();
      renderListaFiltradaDeb();
    });

  if (filtroCatSel)
    filtroCatSel.addEventListener("change", (e) => {
      filtroCategoria = e.target.value || "";
      mantenerScrollDurante(() => renderLista());
    });

  // --- Vista Stock ---
// --- Vista Stock (stubs: implementación en script.stock.js) ---
function renderStockResultados() { window.StockTab?.renderStockResultados?.(); }
function renderStockResumen()    { window.StockTab?.renderStockResumen?.(); }
function renderStockVisibles()   { window.StockTab?.renderStockVisibles?.(); }


    function activarTab(tipo) {
    if (!tabProd || !tabRec || !tabStock) return;

    tabProd.classList.toggle("active", tipo === "prod");
    tabRec.classList.toggle("active", tipo === "rec");
    tabStock.classList.toggle("active", tipo === "stock");

    if (headerPrincipal)
      headerPrincipal.classList.toggle("oculto", tipo === "stock");

    if (contenedorLista)
      contenedorLista.classList.toggle("oculto", tipo !== "prod");
    if (vistaRec)
      vistaRec.classList.toggle("oculto", tipo !== "rec");
    if (vistaStock)
      vistaStock.classList.toggle("oculto", tipo !== "stock");
    if (tipo === "stock") {
      renderStockResumen();
      renderStockVisibles();
      renderStockResultados();
    }
  }

  tabProd?.addEventListener("click", () => activarTab("prod"));
  tabRec?.addEventListener("click", () => activarTab("rec"));
  tabStock?.addEventListener("click", () => activarTab("stock"));

   // --- Init optimizado ---
  const tieneLocal = cargarDesdeLocalStorage();
  if (!tieneLocal) {
    // si no hay datos aún, al menos actualiza cabecera vacía
    calcularTotalEstimado();
  }
  // cuando llegue Firebase, sobreescribe y re-renderiza una vez
  cargarDesdeFirebase();
  renderStockResumen();
  renderStockVisibles();
});

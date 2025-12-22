// ============ STOCK TAB (platos + low-stock) ============
(() => {
  const normalize = (s) =>
    (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const parseStockValor = (val) => {
    const num = parseFloat((val || "").toString().replace(",", "."));
    return Math.max(0, isNaN(num) ? 0 : num);
  };

  const debounce = (fn, wait = 150) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), wait);
    };
  };

  const getProductos = () => (Array.isArray(window.productos) ? window.productos : []);
  const persistir = (inmediato = false) => window.persistir?.(inmediato);

  const lcUpdateStock = (id, stock) => window.lc_updateTarjetaStock?.(id, stock);
  const lcUpdateComprado = (id, comprado) => window.lc_updateTarjetaComprado?.(id, comprado);

  const getStockMin = (p) => window.lc_getStockMin?.(p) ?? null;
  const isLowStock = (p) => window.lc_isLowStock?.(p) ?? false;

  // --- UI refs ---
  const buscarStock = () => document.getElementById("buscar-stock");
  const contStockResultado = () => document.getElementById("stock-resultado");
  const stockResumen = () => document.getElementById("stock-resumen");
  const listaStockVisible = () => document.getElementById("stock-visibles");

  // --- Estado ---
  let stockFiltro = "todos";
  const LS_PRESET = "stock_preset_v1";
  const LS_EXTRAS = "stock_include_extras_v1";
let presetKey = (localStorage.getItem(LS_PRESET) || "platos").toLowerCase();
  let includeExtras = localStorage.getItem(LS_EXTRAS) === "1";

const GROUPS = [
  { k: "", label: "—" },
  { k: "base", label: "Base" },
  { k: "prot", label: "Prot" },
  { k: "verd", label: "Verd" },
  { k: "extra", label: "Extra" },
  { k: "desayuno", label: "Desayuno" },
  { k: "snack", label: "Snack" },
    { k: "plato", label: "Plato (listo)" },
];


const PRESETS = {
  platos:    { label: "Platos",    req: { base: 1, prot: 1, verd: 1 } },
  desayunos: { label: "Desayunos", req: { desayuno: 1 } },
  merienda:  { label: "Merienda",  req: { snack: 1 } },
};


  // --- Cálculos platos ---
  const comidasPack = (p) => Math.max(0, Number(p?.comidas || 0));
  const porComida = (p) => {
    const x = Number(p?.stockPorComida);
    return Number.isFinite(x) && x > 0 ? x : 1;
  };
  const racionesDisponibles = (p) => (parseStockValor(p.stock) * comidasPack(p)) / porComida(p);

function computeGroupTotals() {
  const tot = {
    base: 0, prot: 0, verd: 0, extra: 0,
    desayuno: 0, snack: 0, plato: 0
  };

  for (const p of getProductos()) {
    if (p.visibleStock === false) continue;
    const g = (p.stockGrupo || "").toLowerCase();
    if (!(g in tot)) continue;
    tot[g] += racionesDisponibles(p);
  }
  return tot;
}



function computePresetMeals() {
  const preset = PRESETS[presetKey] || PRESETS.platos;
  const totals = computeGroupTotals();

  // Parte "combo" (base/prot/verd/etc)
  const req = { ...preset.req };
  if (includeExtras && presetKey === "platos") req.extra = 1; // si quieres que extras solo afecte a Platos

  let comboMeals = Infinity;
  let limiting = null;

  for (const [g, need] of Object.entries(req)) {
    const cap = need > 0 ? (totals[g] || 0) / need : Infinity;
    if (cap < comboMeals) {
      comboMeals = cap;
      limiting = g;
    }
  }

  if (!Number.isFinite(comboMeals)) comboMeals = 0;
  comboMeals = Math.max(0, Math.floor(comboMeals * 10) / 10);

  // Parte "plato listo" (solo suma en preset Platos)
  const readyMeals = presetKey === "platos" ? Math.max(0, totals.plato || 0) : 0;

  const totalMeals = Math.floor((comboMeals + readyMeals) * 10) / 10;

  const culprits =
    limiting && (totals[limiting] || 0) > 0
      ? getProductos()
          .filter((p) => p.visibleStock !== false)
          .filter((p) => (p.stockGrupo || "").toLowerCase() === limiting)
          .map((p) => ({ p, r: racionesDisponibles(p) }))
          .sort((a, b) => a.r - b.r)
          .slice(0, 3)
      : [];

  return { preset, totals, req, comboMeals, readyMeals, totalMeals, limiting, culprits };
}


  function ensureMealsPanel() {
    const ref = stockResumen();
    if (!ref) return null;
    let el = document.getElementById("stock-meals");
    if (!el) {
      el = document.createElement("div");
      el.id = "stock-meals";
      el.className = "stock-meals";
      ref.insertAdjacentElement("afterend", el);
    }
    return el;
  }

  function renderMealsPanel() {
    const el = ensureMealsPanel();
    if (!el) return;

const { preset, totals, comboMeals, readyMeals, totalMeals, limiting, culprits } = computePresetMeals();

    const chip = (key, label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "stock-chip";
      if (presetKey === key) b.classList.add("activo");
      b.textContent = label;
      b.addEventListener("click", () => {
        presetKey = key;
        localStorage.setItem(LS_PRESET, presetKey);
        renderMealsPanel();
      });
      return b;
    };

    const extrasBtn = document.createElement("button");
    extrasBtn.type = "button";
    extrasBtn.className = "stock-chip";
    if (includeExtras) extrasBtn.classList.add("activo");
    extrasBtn.textContent = includeExtras ? "Extras: ON" : "Extras: OFF";
    extrasBtn.addEventListener("click", () => {
      includeExtras = !includeExtras;
      localStorage.setItem(LS_EXTRAS, includeExtras ? "1" : "0");
      renderMealsPanel();
    });

const limitingLabel =
  limiting === "base" ? "Base" :
  limiting === "prot" ? "Proteína" :
  limiting === "verd" ? "Verdura" :
  limiting === "extra" ? "Extras" :
  limiting === "desayuno" ? "Desayuno" :
  limiting === "snack" ? "Snack" : "—";


    el.innerHTML = "";
    const top = document.createElement("div");
    top.className = "stock-meals-top";

    const chips = document.createElement("div");
    chips.className = "stock-meals-chips";
    chips.append(
      chip("platos", "Platos"),
      chip("desayunos", "Desayunos"),
      chip("merienda", "Merienda")
    );

    top.append(chips, extrasBtn);

    const line1 = document.createElement("div");
    line1.className = "stock-meals-line";
line1.innerHTML = `
  <div><b>${preset.label}:</b> ${totalMeals} comidas</div>
  <div class="stock-meals-small">Limita: <b>${limitingLabel}</b></div>
`;


    const line2 = document.createElement("div");
    line2.className = "stock-meals-small";
line2.textContent =
  `Combo ${comboMeals.toFixed(1)} · Plato listo ${readyMeals.toFixed(1)} · ` +
  `Base ${totals.base.toFixed(1)} · Prot ${totals.prot.toFixed(1)} · Verd ${totals.verd.toFixed(1)} · ` +
  `Extra ${totals.extra.toFixed(1)} · Des ${totals.desayuno.toFixed(1)} · Snack ${totals.snack.toFixed(1)} · Plato ${totals.plato.toFixed(1)}`;

    const line3 = document.createElement("div");
    line3.className = "stock-meals-small";
    if (culprits.length) {
      line3.textContent =
        "Más justos: " + culprits.map(({ p, r }) => `${p.nombre} (${r.toFixed(1)})`).join(" · ");
    } else {
      line3.textContent = "Tip: asigna Grupo + Comidas/pack a los básicos (arroz, atún, verduras...).";
    }

    el.append(top, line1, line2, line3);
  }

  // --- Low-stock: auto añadir ---
  function autoAddIfLow(p) {
    if (!p?.autoAddLow) return false;
    if (!isLowStock(p)) return false;
    if (p.comprado) {
      p.comprado = false;
      lcUpdateComprado(p.id, false);
      window.renderLista?.();
      persistir();
      return true;
    }
    return false;
  }

  // --- UI piezas ---
  const crearToggleVisibilidad = (p) => {
    const btn = document.createElement("button");
    btn.className = "stock-toggle";
    const sync = () => {
      const visible = p.visibleStock !== false;
      btn.textContent = visible ? "🚫" : "👁️";
      btn.title = visible ? "Visible en stock" : "Oculto en stock";
    };
    btn.addEventListener("click", () => {
      p.visibleStock = p.visibleStock === false;
      sync();
      renderAll();
      persistir();
    });
    sync();
    return btn;
  };

  const crearCardStock = (p) => {
    const card = document.createElement("div");
    card.className = "stock-card";
    card.classList.toggle("low-stock", isLowStock(p));

    const titulo = document.createElement("div");
    titulo.className = "stock-card-titulo";
    titulo.textContent = p.nombre;

    const meta = document.createElement("div");
    meta.className = "stock-card-meta";
    const categoria = p.categoria ? ` · ${p.categoria}` : "";
    meta.textContent = `${p.supermercado || "Otros"}${categoria}`;

    const data = document.createElement("div");
    data.className = "stock-card-datos";
    data.textContent = `Stock: ${p.stock ?? 0} · Comidas/pack: ${Number(p.comidas || 0) || "—"}`;

    const controles = document.createElement("div");
    controles.className = "stock-card-controles";

    const btnMenos = document.createElement("button");
    btnMenos.textContent = "–";
    const valor = document.createElement("span");
    valor.textContent = p.stock ?? 0;
    const btnMas = document.createElement("button");
    btnMas.textContent = "+";

    const setStock = (nuevo) => {
      const prev = parseStockValor(p.stock);
      p.stock = Math.max(0, nuevo);
      valor.textContent = p.stock;
      card.classList.toggle("low-stock", isLowStock(p));
      lcUpdateStock(p.id, p.stock);
      window.lc_applyLowStockToProductCard?.(p);
      if (prev !== p.stock) autoAddIfLow(p);
      renderMealsPanel();
      persistir();
    };

    btnMas.addEventListener("click", () => setStock(parseStockValor(p.stock) + 1));
    btnMenos.addEventListener("click", () => setStock(parseStockValor(p.stock) - 1));

    controles.append(btnMenos, valor, btnMas);

    const visibilidad = crearToggleVisibilidad(p);

    const btnALista = document.createElement("button");
    btnALista.className = "stock-add-btn";
    btnALista.textContent = "🛒";
    btnALista.addEventListener("click", () => {
      p.comprado = false;
      lcUpdateComprado(p.id, false);
      window.renderLista?.();
      persistir();
    });

    const filaExtra = document.createElement("div");
    filaExtra.className = "stock-card-controles-busqueda";
    filaExtra.append(visibilidad, btnALista);

    // badge si está bajo
    if (isLowStock(p)) {
      const b = document.createElement("span");
      b.className = "stock-low-badge";
      b.textContent = `⚠️ ≤ ${getStockMin(p)}`;
      filaExtra.prepend(b);
    }

    card.append(titulo, meta, data, controles, filaExtra);
    card.addEventListener("click", (e) => {
      if ([inpStock, btnSubir, btnBajar, visibilidad, btnALista].includes(e.target)) return;
      window.lc_abrirModalEdicion?.(p);
    });
    return card;
  };

  const crearItemVisible = (p) => {
    const fila = document.createElement("div");
    fila.className = "stock-visible-item";
    fila.classList.toggle("low-stock", isLowStock(p));

    const nombreWrap = document.createElement("div");
    nombreWrap.className = "stock-nombre-wrap";

    const nombre = document.createElement("div");
    nombre.className = "stock-nombre";
    nombre.textContent = p.nombre;

    const mini = document.createElement("div");
    mini.className = "stock-mini";

    // grupo
    const selG = document.createElement("select");
    GROUPS.forEach(({ k, label }) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = label;
      selG.appendChild(o);
    });
    selG.value = (p.stockGrupo || "").toLowerCase();
    selG.addEventListener("change", () => {
      p.stockGrupo = selG.value;
      renderMealsPanel();
      persistir();
    });

    // umbral
    const inpMin = document.createElement("input");
    inpMin.type = "number";
    inpMin.min = "0";
    inpMin.step = "0.01";
    inpMin.placeholder = "min";
    inpMin.value = getStockMin(p) ?? "";
    inpMin.addEventListener("change", () => {
      const v = Number(inpMin.value);
      p.stockMin = Number.isFinite(v) && v > 0 ? v : null;
      fila.classList.toggle("low-stock", isLowStock(p));
      window.lc_applyLowStockToProductCard?.(p);
      if (p.autoAddLow) autoAddIfLow(p);
      persistir();
    });

    // auto add
    const btnAuto = document.createElement("button");
    btnAuto.type = "button";
    btnAuto.className = "btn-auto";
    const syncAuto = () => {
      btnAuto.classList.toggle("activo", !!p.autoAddLow);
      btnAuto.textContent = p.autoAddLow ? "⚡ Auto" : "⚡";
      btnAuto.title = "Auto-añadir a lista si baja del umbral";
    };
    btnAuto.addEventListener("click", () => {
      p.autoAddLow = !p.autoAddLow;
      syncAuto();
      if (p.autoAddLow) autoAddIfLow(p);
      persistir();
    });
    syncAuto();

    mini.append(selG, inpMin, btnAuto);

    nombreWrap.append(nombre, mini);

    // stock input
    const inpStock = document.createElement("input");
    inpStock.type = "number";
    inpStock.min = "0";
    inpStock.step = "0.01";
    inpStock.placeholder = "0";
    inpStock.className = "stock-input";
    inpStock.value = p.stock ? p.stock : "";
    inpStock.addEventListener("change", () => {
      const prev = parseStockValor(p.stock);
      const nuevo = parseStockValor(inpStock.value);
      p.stock = nuevo;

      fila.classList.toggle("low-stock", isLowStock(p));
      lcUpdateStock(p.id, nuevo);
      window.lc_applyLowStockToProductCard?.(p);

      if (prev !== nuevo) autoAddIfLow(p);

      renderMealsPanel();
      renderStockResumen();
      renderStockResultados();
      persistir();
    });

    const selVisible = crearToggleVisibilidad(p);

    const btnLista = document.createElement("button");
    btnLista.className = "stock-add-btn";
    btnLista.textContent = "🛒";
    btnLista.addEventListener("click", () => {
      p.comprado = false;
      lcUpdateComprado(p.id, false);
      window.renderLista?.();
      persistir();
    });

    fila.append(nombreWrap, inpStock, selVisible, btnLista);
    fila.addEventListener("click", (e) => {
      if ([inpStock, selG, inpMin, btnAuto, selVisible, btnLista].includes(e.target)) return;
      window.lc_abrirModalEdicion?.(p);
    });
    return fila;
  };

  // --- Render ---
  const renderStockResultados = () => {
    const cont = contStockResultado();
    const input = buscarStock();
    if (!cont) return;

    cont.innerHTML = "";
    const q = normalize(input?.value || "");
    if (!q) {
      cont.innerHTML = `<div class="stock-placeholder">Escribe para buscar un producto en stock.</div>`;
      return;
    }

    const coincidencias = getProductos()
      .filter((p) => normalize(p.nombre).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .slice(0, 12);

    if (!coincidencias.length) {
      cont.innerHTML = `<div class="stock-placeholder">No hay coincidencias.</div>`;
      return;
    }

    coincidencias.forEach((p) => {
      const card = p.visibleStock !== false ? crearItemVisible(p) : crearCardStock(p);
      cont.appendChild(card);
    });
  };

  const renderStockResumen = () => {
    const cont = stockResumen();
    if (!cont) return;

    const productos = getProductos();
    const visibles = productos.filter((p) => p.visibleStock !== false);
    const stockProductos = productos.filter((p) => parseStockValor(p.stock) !== 0);
    const faltan = visibles.filter((p) => parseStockValor(p.stock) === 0);
    const total = productos.length;

    const crearChip = (label, cantidad, filtro) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "stock-chip";
      if (stockFiltro === filtro) chip.classList.add("activo");
      chip.textContent = `${label}: ${cantidad}`;
      chip.addEventListener("click", () => {
        stockFiltro = filtro;
        renderStockResumen();
        renderStockVisibles();
      });
      return chip;
    };

    cont.innerHTML = "";
    cont.append(
      crearChip("Stock", stockProductos.length, "con-stock"),
      crearChip("Falta", faltan.length, "sin-stock"),
      crearChip("Total", total, "todos")
    );
  };

  const renderStockVisibles = () => {
    const cont = listaStockVisible();
    if (!cont) return;

    cont.innerHTML = "";
    const productos = getProductos();

    const visibles = productos
      .filter((p) => p.visibleStock !== false)
      .filter((p) => {
        if (stockFiltro === "con-stock") return parseStockValor(p.stock) > 0;
        if (stockFiltro === "sin-stock") return parseStockValor(p.stock) === 0;
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    if (!visibles.length) {
      const vacio = document.createElement("div");
      vacio.className = "stock-placeholder";
      vacio.textContent = "Marca productos como visibles para gestionarlos aquí.";
      cont.appendChild(vacio);
      return;
    }

    visibles.forEach((p) => cont.appendChild(crearItemVisible(p)));
  };

  const renderAll = () => {
    renderStockResumen();
    renderMealsPanel();
    renderStockVisibles();
    renderStockResultados();
  };

  // Exports (por si los stubs del script grande los llaman)
  window.StockTab = { renderAll, renderStockResumen, renderStockVisibles, renderStockResultados };

  document.addEventListener("DOMContentLoaded", () => {
    buscarStock()?.addEventListener("input", debounce(renderStockResultados, 120));
    renderAll();
  });
})();

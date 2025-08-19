// ============ RECETAS ============
document.addEventListener("DOMContentLoaded", () => {
  const rutaRecetas = "recetas/Charly";
  const db = (window.db || (window.firebase && firebase.database && firebase.database()));
  window._recetas = window._recetas || JSON.parse(localStorage.getItem("recetas")||"[]");

  // ---- Tabs & ocultar productos en Recetas
  const tabProd = document.getElementById("tab-productos");
  const tabRec  = document.getElementById("tab-recetas");
  const vistaRec  = document.getElementById("vista-recetas");
  const headerProductos = document.getElementById("input-producto")?.closest("header") || document.querySelector("#app > header, body > header, header");
  const listaProductos  = document.getElementById("lista-productos");

  function activarProd(){ tabProd?.classList.add("active"); tabRec?.classList.remove("active"); headerProductos?.classList.remove("oculto"); listaProductos?.classList.remove("oculto"); vistaRec?.classList.add("oculto"); }
  function activarRec(){  tabRec?.classList.add("active");  tabProd?.classList.remove("active");  headerProductos?.classList.add("oculto");    listaProductos?.classList.add("oculto");    vistaRec?.classList.remove("oculto"); renderRecetas(); }
  tabProd && tabProd.addEventListener("click", activarProd);
  tabRec  && tabRec.addEventListener("click", activarRec);

  // ---- Carga recetas
  (function cargarRecetas(){
    if (!db) { renderRecetas(); return; }
    db.ref(rutaRecetas).once("value").then(s=>{
      const v = s.val();
      if (Array.isArray(v)) window._recetas = v;
      else if (v && typeof v === "object") window._recetas = Object.values(v);
      localStorage.setItem("recetas", JSON.stringify(window._recetas));
      renderRecetas();
    }).catch(()=> renderRecetas());
  })();

  const guardarRecetasDeb = (()=>{ let t; return ()=>{ clearTimeout(t); t=setTimeout(()=>{
    if (db) db.ref(rutaRecetas).set(window._recetas||[]);
    localStorage.setItem("recetas", JSON.stringify(window._recetas||[]));
  },300); };})();

  // ---- UI Recetas
  const buscarRecetas = document.getElementById("buscar-recetas");
  const listaRecetas  = document.getElementById("lista-recetas");
  const btnNuevaReceta= document.getElementById("btn-nueva-receta");
  buscarRecetas && buscarRecetas.addEventListener("input", renderRecetas);
  btnNuevaReceta  && btnNuevaReceta.addEventListener("click", ()=> abrirEditorReceta());

  // === Añadir a la lista: NO sumes si existe; sólo desmarca ===
  function añadirRecetaALaLista(receta){
    if(!receta || !Array.isArray(receta.ingredientes)) return;

    const norm = s => (s||"").toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu,"")
      .replace(/[^a-z0-9\s]/g," ")
      .replace(/\s+/g," ")
      .trim();

    window.productos = window.productos || JSON.parse(localStorage.getItem("productos")||"[]");

    for (const ing of receta.ingredientes){
      const key = norm(ing.nombre);
      let prod = window.productos.find(p => norm(p.nombre) === key);

      if (prod){
        // 👉 pediste: si ya está en la lista, NO sumar, sólo desmarcar
        prod.comprado = false;
        continue;
      }

      // Si no existe, crearlo con cantidad segura (por defecto 1 ud)
      const uniIng = (ing.unidad||"ud").toLowerCase();
      const cantidadNueva = uniIng==="ud" ? Number(ing.cantidad||1) : 1;

      prod = {
        id: Date.now().toString(36)+Math.random().toString(36).slice(2,7),
        nombre: ing.nombre || "Ingrediente",
        supermercado: "Otros",
        cantidad: cantidadNueva,
        precio: 0,
        comprado: false,
        imagenURL: "",
        categoria: null,
        unidadBase: "ud",
        gramosPorUnidad: 0,
        _unidadSugerida: uniIng
      };
      window.productos.push(prod);
    }

    if (typeof window.persistir === "function") window.persistir(true);
    else {
      localStorage.setItem("productos", JSON.stringify(window.productos));
      const _db = (window.db || (window.firebase && firebase.database && firebase.database()));
      if (_db) _db.ref("productos/Charly").set(window.productos);
    }
    if (typeof window.renderLista === "function") window.renderLista();
    if (typeof window.calcularTotalEstimado === "function") window.calcularTotalEstimado();
  }
  window.añadirRecetaALaLista = añadirRecetaALaLista;

  // ========== RENDER TARJETAS ==========
  function renderRecetas(){
    if (!listaRecetas) return;
    const norm = s=> (s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").trim();
    const q = norm(buscarRecetas?.value || "");
    const arr = (window._recetas||[])
      .filter(r=> !q || norm(r.titulo).includes(q))
      .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""));

    listaRecetas.innerHTML = "";
    arr.forEach((r)=>{
      const card = document.createElement("div");
      card.className = "receta-card";
      card.dataset.id = r.id;

      const img = document.createElement("img");
      img.src = r.imagenURL || "https://placehold.co/80x80?text=%20";

      const info = document.createElement("div");
      info.className = "receta-info";
info.innerHTML = `<strong class="receta-titulo" title="${(r.titulo||'(sin título)')}">${r.titulo || "(sin título)"}</strong>`;
      const chips = document.createElement("div");
      chips.className = "receta-chips";
      const m = calcularMacrosReceta(r);
      chips.innerHTML = `
        <span class="receta-chip">${isFinite(m.kcal)?Math.round(m.kcal):"—"} kcal</span>
        <span class="receta-chip">C:${isFinite(m.carb)?Math.round(m.carb):"—"}</span>
        <span class="receta-chip">P:${isFinite(m.prot)?Math.round(m.prot):"—"}</span>
        <span class="receta-chip">x${r.porciones||1}</span>
      `;

      const acciones = document.createElement("div");
      acciones.className = "receta-acciones";

      const bEdit = document.createElement("button"); bEdit.textContent="Editar";
      const bAdd  = document.createElement("button"); bAdd.textContent="Añadir a lista";
      const bDel  = document.createElement("button"); bDel.textContent="Borrar";

      bEdit.addEventListener("click", (ev)=>{ ev.stopPropagation(); abrirDetalleReceta(r.id); });
      bAdd .addEventListener("click", (ev)=>{ ev.stopPropagation(); añadirRecetaALaLista(r); bAdd.disabled = true; bAdd.textContent = "Añadido ✓"; setTimeout(()=>{ bAdd.disabled=false; bAdd.textContent="Añadir a lista"; }, 1200); });
      bDel .addEventListener("click", (ev)=>{ ev.stopPropagation(); if(!confirm("¿Borrar receta?")) return; window._recetas = (window._recetas||[]).filter(x=>x.id!==r.id); guardarRecetasDeb(); renderRecetas(); });

      acciones.append(bEdit,bAdd,bDel);
      info.appendChild(chips);
      card.addEventListener("click", ()=> abrirDetalleReceta(r.id));
      card.append(img, info, acciones);
      listaRecetas.append(card);
    });
  }

  // ========== EDITOR RÁPIDO ==========
  function abrirEditorReceta(receta=null){
    const modalRE = document.getElementById("modal-receta-editor");
    if (!modalRE) { abrirDetalleReceta(receta?.id); return; }
    document.dispatchEvent(new CustomEvent("editar-receta", { detail: receta||null }));
  }

  // ---- Refs modal (ya existe en el HTML)
  const modal   = document.getElementById("modal-receta-detalle");
  const $m      = (s)=> modal.querySelector(s);
  const imgEl   = $m("#r-det-img");
  const tEl     = $m("#r-det-titulo");
  const ingsEl  = $m("#r-det-ings");
  const pasosEl = $m("#r-det-pasos");
  const kcalEl  = $m("#r-det-kcal");
  const carbEl  = $m("#r-det-carb");
  const protEl  = $m("#r-det-prot");
  const fatEl   = $m("#r-det-fat");
  const porcEl  = $m("#r-det-porc");
  const btnAddIng  = $m("#r-det-add-ing");
  const btnAddPaso = $m("#r-det-add-paso");
  const btnGuardar = $m("#r-det-guardar");
  const btnCerrar  = $m("#r-det-cerrar");

  let recetaDetalle = null;

  // ---- Abrir modal por id
  window.abrirDetalleReceta = abrirDetalleReceta;
  function abrirDetalleReceta(id){
    const r = (window._recetas||[]).find(x=>x.id===id);
    if(!r) return;
    recetaDetalle = JSON.parse(JSON.stringify(r));
    renderDetalle();
    modal.classList.remove("oculto");
  }

  // ---- Render modal (listeners DIRECTOS por fila)
  function renderDetalle(){
    if(!recetaDetalle) return;

    imgEl.src = recetaDetalle.imagenURL || "https://placehold.co/180";
    const m = calcularMacrosReceta(recetaDetalle);
    kcalEl.textContent = `${isFinite(m.kcal)?Math.round(m.kcal):"—"} kcal`;
    carbEl.textContent = `C:${isFinite(m.carb)?Math.round(m.carb):"—"}`;
    protEl.textContent = `P:${isFinite(m.prot)?Math.round(m.prot):"—"}`;
    fatEl.textContent  = `G:${isFinite(m.fat)?Math.round(m.fat):"—"}`;
    porcEl.textContent = `x${recetaDetalle.porciones||1}`;

    tEl.textContent = recetaDetalle.titulo || "(sin título)";
    activarInline(tEl, v=> recetaDetalle.titulo = v.trim() || "(sin título)");

    // Ingredientes
    ingsEl.innerHTML = "";
    (recetaDetalle.ingredientes||[]).forEach((ing, i)=>{
      const li = document.createElement("li");
      li.className = "r-ing-item";
      li.innerHTML = `
        <label class="r-ing-check-wrap">
          <input type="checkbox" class="r-ing-check" ${ing.tengo ? "checked":""} aria-label="Ya lo tengo">
        </label>
        <div class="r-ing-nom r-edit" contenteditable="true">${ing.nombre||""}</div>
        <div class="r-ing-cant r-edit" contenteditable="true">${ing.cantidad||0}</div>
        <div class="r-ing-uni r-edit" contenteditable="true">${(ing.unidad||"ud")}</div>
        <button class="r-ing-x">✕</button>
      `;
      const chk  = li.querySelector(".r-ing-check");
      const nom  = li.querySelector(".r-ing-nom");
      const cant = li.querySelector(".r-ing-cant");
      const uni  = li.querySelector(".r-ing-uni");
      const del  = li.querySelector(".r-ing-x");

      chk.addEventListener("click", (e)=>{ e.stopPropagation(); recetaDetalle.ingredientes[i].tengo = chk.checked; });
      chk.addEventListener("change",(e)=>{ e.stopPropagation(); recetaDetalle.ingredientes[i].tengo = chk.checked; });

      activarInline(nom,  v=> recetaDetalle.ingredientes[i].nombre  = v.trim());
      activarInline(cant, v=> recetaDetalle.ingredientes[i].cantidad = parseFloat(v.replace(",","."))||0);
      activarInline(uni,  v=> recetaDetalle.ingredientes[i].unidad   = (v||"ud").trim().toLowerCase());

      del.addEventListener("click", (e)=>{ e.stopPropagation(); recetaDetalle.ingredientes.splice(i,1); renderDetalle(); });
      ingsEl.appendChild(li);
    });

    // Pasos
    pasosEl.innerHTML = "";
    (recetaDetalle.pasos||[]).forEach((txt, i)=>{
      const li = document.createElement("li");
      li.className = "r-paso";
      li.innerHTML = `
        <div class="r-paso-line">
          <div class="r-paso-txt r-edit" contenteditable="true">${txt || ""}</div>
          <button class="r-ing-x">✕</button>
        </div>
      `;
      const t = li.querySelector(".r-paso-txt");
      const del = li.querySelector(".r-ing-x");
      activarInline(t, v=> recetaDetalle.pasos[i] = v.trim());
      del.addEventListener("click", (e)=>{ e.stopPropagation(); recetaDetalle.pasos.splice(i,1); renderDetalle(); });
      pasosEl.appendChild(li);
    });
  }

  function activarInline(el, onCommit){
    el.addEventListener("focus", ()=> el.classList.add("r-editing"));
    el.addEventListener("blur",  ()=> { el.classList.remove("r-editing"); onCommit?.(el.textContent||""); recalcMacros(); });
    el.addEventListener("keydown",(e)=>{ if (e.key==="Enter"){ e.preventDefault(); el.blur(); } });
  }
  function recalcMacros(){
    if(!recetaDetalle) return;
    const m = calcularMacrosReceta(recetaDetalle);
    kcalEl.textContent = `${isFinite(m.kcal)?Math.round(m.kcal):"—"} kcal`;
    carbEl.textContent = `C:${isFinite(m.carb)?Math.round(m.carb):"—"}`;
    protEl.textContent = `P:${isFinite(m.prot)?Math.round(m.prot):"—"}`;
    fatEl.textContent  = `G:${isFinite(m.fat)?Math.round(m.fat):"—"}`;
  }

  // ---- Botones modal
  btnAddIng && btnAddIng.addEventListener("click", (e)=>{ e.stopPropagation();
    recetaDetalle.ingredientes = recetaDetalle.ingredientes || [];
    recetaDetalle.ingredientes.push({nombre:"Nuevo ingrediente", cantidad:0, unidad:"ud", tengo:false});
    renderDetalle();
  });
  btnAddPaso && btnAddPaso.addEventListener("click", (e)=>{ e.stopPropagation();
    recetaDetalle.pasos = recetaDetalle.pasos || []; recetaDetalle.pasos.push("Nuevo paso"); renderDetalle();
  });
  btnGuardar && btnGuardar.addEventListener("click", (e)=>{ e.stopPropagation();
    if(!recetaDetalle) return;
    recetaDetalle.ingredientes = (recetaDetalle.ingredientes||[]).filter(i=> (i.nombre||"").trim());
    recetaDetalle.pasos = (recetaDetalle.pasos||[]).filter(p=> (p||"").trim());
    const arr = window._recetas || [];
    const ix = arr.findIndex(x=>x.id===recetaDetalle.id);
    if (ix>=0) arr[ix] = recetaDetalle; else arr.push(recetaDetalle);
    if (db) db.ref(rutaRecetas).set(arr);
    localStorage.setItem("recetas", JSON.stringify(arr));
    renderRecetas(); cerrar();
  });
  btnCerrar && btnCerrar.addEventListener("click", (e)=>{ e.stopPropagation(); cerrar(); });
  modal.addEventListener("click", (e)=>{ if(e.target===modal) cerrar(); });
  document.addEventListener("keydown", (e)=>{ if(!modal.classList.contains("oculto") && e.key==="Escape") cerrar(); });
  function cerrar(){ modal.classList.add("oculto"); recetaDetalle=null; }

  // ---- Imagen -> subir a Cloudinary
  imgEl && imgEl.addEventListener("click", async (e)=>{
    e.stopPropagation();
    const inp = document.createElement("input");
    inp.type="file"; inp.accept="image/*"; inp.capture="environment";
    inp.onchange = async (ev)=>{
      const f = ev.target.files?.[0]; if(!f || !recetaDetalle) return;
      try{
        const url = await (window.subirImagenACloudinary ? window.subirImagenACloudinary(f) : subirGenericoACloudinary(f));
        recetaDetalle.imagenURL = url; imgEl.src = url;
      }catch{}
    };
    inp.click();
  });
  async function subirGenericoACloudinary(file){
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset","publico");
    const r = await fetch("https://api.cloudinary.com/v1_1/dgdavibcx/image/upload",{method:"POST", body:fd});
    const d = await r.json(); return d.secure_url;
  }

  // ========== Utiles ==========
  function calcularMacrosReceta(r){
    let kcal=0, carb=0, prot=0, fat=0;
    if(!Array.isArray(r?.ingredientes)) return {kcal:NaN,carb:NaN,prot:NaN,fat:NaN};
    const norm = s=> (s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").trim();
    for(const ing of r.ingredientes){
      const prod = (window.productos||[]).find(p=> norm(p.nombre)===norm(ing.nombre));
      if(!prod || !prod.nutricion) continue;
      let factor=0;
      if(ing.unidad==="g"||ing.unidad==="ml") factor = (ing.cantidad||0)/100;
      else if (prod.gramosPorUnidad) factor = (prod.gramosPorUnidad*(ing.cantidad||1))/100;
      kcal += (prod.nutricion.kcal_100||0)*factor;
      carb += (prod.nutricion.carb_100||0)*factor;
      prot += (prod.nutricion.prot_100||0)*factor;
      fat  += (prod.nutricion.fat_100||0)*factor;
    }
    return {kcal,carb,prot,fat};
  }
});

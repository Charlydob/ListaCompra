const input = document.getElementById("input-producto");
const selectSuper = document.getElementById("selector-super");
const btnAgregar = document.getElementById("btn-agregar");
const contenedorLista = document.getElementById("lista-productos");

let productos = []; // Lista total
let categorias = []; // [ "Frutas", "Quesos", etc. ]

btnAgregar.addEventListener("click", () => {
  const nombre = input.value.trim().toLowerCase();
  const supermercado = selectSuper.value;

  if (!nombre || !supermercado) return;

  // Buscar si ya existe producto similar
  const yaExiste = productos.filter(p =>
    p.nombre.toLowerCase().includes(nombre)
  );

  if (yaExiste.length > 0) {
    renderLista(nombre); // Mostrar coincidencias
  } else {
    // Crear producto nuevo
    const nuevoProducto = {
      id: Date.now().toString(),
      nombre: nombre,
      supermercado: supermercado,
      cantidad: 1,
      precio: 0,
      comprado: false,
      imagenURL: "",
      categoria: null // A implementar luego
    };
    productos.push(nuevoProducto);
    renderLista();
  }

  input.value = "";
});

// Filtro dinámico al escribir
input.addEventListener("input", () => {
  const texto = input.value.trim().toLowerCase();
  renderLista(texto);
});

function renderLista(filtro = "") {
  contenedorLista.innerHTML = "";

  // Agrupar por supermercado
  const agrupados = {};
  for (let prod of productos) {
    if (filtro && !prod.nombre.toLowerCase().includes(filtro)) continue;
    if (!agrupados[prod.supermercado]) agrupados[prod.supermercado] = [];
    agrupados[prod.supermercado].push(prod);
  }

  for (let superKey in agrupados) {
    const grupo = document.createElement("div");
    grupo.className = "supermercado-grupo";

    const titulo = document.createElement("div");
    titulo.className = "supermercado-titulo";
    titulo.textContent = superKey;
    grupo.appendChild(titulo);

    // Ordenar por nombre, pendientes arriba
    const tarjetas = agrupados[superKey].sort((a, b) => {
      if (a.comprado !== b.comprado) return a.comprado - b.comprado;
      return a.nombre.localeCompare(b.nombre);
    });

    for (let prod of tarjetas) {
      const tarjeta = document.createElement("div");
      tarjeta.className = "tarjeta-producto";
      if (prod.comprado) tarjeta.classList.add("tarjeta-comprado");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "checkbox";
      checkbox.checked = prod.comprado;
      checkbox.addEventListener("change", () => {
        prod.comprado = checkbox.checked;
        renderLista(filtro);
      });

      const imagen = document.createElement("img");
      imagen.src = prod.imagenURL || "https://via.placeholder.com/50";

      const nombre = document.createElement("div");
      nombre.className = "nombre-producto";
      nombre.textContent = prod.nombre;


    //   👇 Scroll táctil (drag vertical):

const contador = document.createElement("div");
contador.className = "contador";
contador.textContent = prod.cantidad;

let startY = null;

contador.addEventListener("touchstart", (e) => {
  startY = e.touches[0].clientY;
  e.preventDefault(); // 💥 evita scroll
}, { passive: false }); // ⚠️ necesario para que funcione e.preventDefault en móviles

contador.addEventListener("touchend", (e) => {
  if (startY === null) return;

  const endY = e.changedTouches[0].clientY;
  const deltaY = endY - startY;

  if (Math.abs(deltaY) < 15) return; // gesto mínimo

  if (deltaY > 0) {
    prod.cantidad++;
  } else {
    prod.cantidad = Math.max(1, prod.cantidad - 1);
  }

  startY = null;
  renderLista();
}, { passive: false });



      tarjeta.appendChild(checkbox);
      tarjeta.appendChild(imagen);
      tarjeta.appendChild(nombre);
      tarjeta.appendChild(contador);

      tarjeta.addEventListener("click", (e) => {
        if (e.target === checkbox) return; // no abrir editor si fue el check
        // abrir modal de edición (a implementar)
        alert(`Editar "${prod.nombre}" (WIP)`);
      });

      grupo.appendChild(tarjeta);
    }

    contenedorLista.appendChild(grupo);
  }
}

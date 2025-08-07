const input = document.getElementById("input-producto");
const selectSuper = document.getElementById("selector-super");
const btnAgregar = document.getElementById("btn-agregar");
const contenedorLista = document.getElementById("lista-productos");
const rutaProductos = "productos/Charly"; 
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


let productos = []; // Lista total
let categorias = []; // [ "Frutas", "Quesos", etc. ]
// FireBase configuracion
function guardarEnFirebase() {
  db.ref(rutaProductos).set(productos);
  localStorage.setItem("productos", JSON.stringify(productos));
}

function cargarDesdeFirebase() {
  db.ref(rutaProductos).once("value").then(snapshot => {
    const data = snapshot.val();
    console.log("📦 Productos Firebase:", data); // 👈 debug
    if (data) {
      productos = Array.isArray(data) ? data : Object.values(data);
      renderLista();
    }
  });
}


function cargarDesdeLocalStorage() {
  const data = localStorage.getItem("productos");
  if (data) {
    productos = JSON.parse(data);
    renderLista();
  }
}
// AÑADIR CREAR PRODUCTOS
btnAgregar.addEventListener("click", () => {
  console.log("🚀 Botón presionado");

  const nombre = input.value.trim().toLowerCase();
  const supermercado = selectSuper.value;

  if (!nombre || !supermercado) {
    console.log("⚠️ Falta nombre o supermercado");
    return;
  }

  const yaExiste = productos.filter(p =>
    p.nombre.toLowerCase().includes(nombre)
  );

  if (yaExiste.length > 0) {
    console.log("🔍 Producto ya existe, mostrando coincidencias");
    renderLista(nombre);
  } else {
    const nuevoProducto = {
      id: Date.now().toString(),
      nombre: nombre,
      supermercado: supermercado,
      cantidad: 1,
      precio: 0,
      comprado: false,
      imagenURL: "",
      categoria: null
    };
    productos.push(nuevoProducto);
    console.log("✅ Producto añadido:", nuevoProducto);
    guardarEnFirebase();
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
calcularTotalEstimado();
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
        guardarEnFirebase();
        renderLista(filtro);
      });

      const imagen = document.createElement("img");
imagen.src = prod.imagenURL || "https://placehold.co/50";

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
guardarEnFirebase();

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
         abrirModalEdicion(prod);
      });

      grupo.appendChild(tarjeta);
    }

    contenedorLista.appendChild(grupo);
  }
}
// MODAL EDICION TARJETA
let productoActual = null;

// Abrir modal con datos
function abrirModalEdicion(prod) {
  productoActual = prod;

  document.getElementById("modal-nombre").value = prod.nombre;
  document.getElementById("modal-precio").value = prod.precio;
  document.getElementById("modal-super").innerHTML = [...new Set(productos.map(p => p.supermercado))]
    .map(s => `<option ${s === prod.supermercado ? "selected" : ""}>${s}</option>`)
    .join("");
  document.getElementById("modal-categoria").value = prod.categoria || "";

  document.getElementById("modal-edicion").classList.remove("oculto");
}

// Guardar cambios
document.getElementById("btn-guardar-cambios").addEventListener("click", () => {
  if (!productoActual) return;

  productoActual.nombre = document.getElementById("modal-nombre").value.trim();
  productoActual.precio = parseFloat(document.getElementById("modal-precio").value) || 0;
  productoActual.supermercado = document.getElementById("modal-super").value;
  productoActual.categoria = document.getElementById("modal-categoria").value.trim();

  const archivo = document.getElementById("modal-imagen").files[0];
  if (archivo) {
    subirImagenACloudinary(archivo).then(url => {
      productoActual.imagenURL = url;
      cerrarModal();
      guardarEnFirebase();
      renderLista();
    });
  } else {
    cerrarModal();
    guardarEnFirebase();
    renderLista();
  }
});

// Borrar producto
document.getElementById("btn-borrar-producto").addEventListener("click", () => {
  if (!productoActual) return;
  productos = productos.filter(p => p.id !== productoActual.id);
  cerrarModal();
  guardarEnFirebase();
  renderLista();
});

// Cancelar
document.getElementById("btn-cerrar-modal").addEventListener("click", cerrarModal);

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
    body: formData
  })
  .then(res => res.json())
  .then(data => data.secure_url);
}

// CALCULAR EL PRECIO ESTIMADO
function calcularTotalEstimado() {
  const total = productos
    .filter(p => !p.comprado)
    .reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

  const texto = `Total estimado: ${total.toFixed(2)} €`;
  document.getElementById("total-estimado").textContent = texto;
}
// 🧠 CARGAR PRODUCTOS AL INICIO

cargarDesdeFirebase();

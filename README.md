# Guardias médicas

Aplicación web móvil para que un médico residente marque sus guardias en un calendario y obtenga automáticamente el salario bruto esperado, la retención estimada de IRPF y una estimación después de IRPF. Los datos se sincronizan de forma privada entre dispositivos mediante Firebase.

> La estimación no es un neto exacto: no incluye Seguridad Social ni otros conceptos de nómina.

## Stack

- React 19 + TypeScript + Vite
- Firebase Authentication (email y contraseña)
- Cloud Firestore
- `date-fns` para fechas
- Vitest para la lógica de dominio
- CSS responsive sin framework y manifiesto PWA

## Instalación y ejecución

Requiere Node.js 20.19 o 22.12 en adelante.

```bash
npm install
cp .env.example .env
npm run dev
```

La app compila aun sin credenciales; en ese caso muestra un aviso claro y deshabilita el acceso.

```bash
npm run build
npm test
```

## Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. En **Configuración del proyecto → Tus apps**, registra una aplicación web.
3. Copia `.env.example` como `.env` y completa exactamente:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

4. En **Authentication → Sign-in method**, habilita **Correo electrónico/contraseña** (no hace falta habilitar enlace por email).
5. En **Firestore Database**, crea una base de datos. Elige la región adecuada y publica las reglas de `firestore.rules` desde la consola, o instala Firebase CLI, inicia sesión y ejecuta `firebase deploy --only firestore:rules`.
6. Añade los dominios en los que despliegues la app a **Authentication → Settings → Authorized domains**.

Las reglas limitan cualquier lectura o escritura bajo `users/{uid}` al usuario autenticado con ese mismo `uid`. La aplicación almacena los ajustes en `users/{uid}/profile/settings` y cada mes en `users/{uid}/months/{YYYY-MM}`.

## Arquitectura

```text
src/
├── components/              # Login, calendario y ajustes
├── config/
│   ├── salaryRates.ts       # Todas las tarifas por año de residencia
│   └── holidays/            # Festivos organizados por año
├── domain/
│   └── calculateSalary.ts   # Clasificación y cálculo puro, sin React/Firebase
├── services/userData.ts     # Persistencia del perfil y meses
├── firebase.ts              # Inicialización por variables de entorno
└── styles.css               # Diseño responsive
```

## Tarifas y festivos

- Para cambiar tarifas, edita únicamente `src/config/salaryRates.ts`.
- Para añadir un año, crea por ejemplo `src/config/holidays/2027.ts` y regístralo en `src/config/holidays/index.ts`.
- Los festivos especiales oficiales parten de un array vacío. Cada usuario puede añadir y quitar fechas confirmadas desde **Ajustes → Festivos especiales**.
- La prioridad de cálculo es: especial, festivo oficial, domingo, sábado y laborable.
- La paga extra no se suma automáticamente.

## Despliegue

Genera los archivos estáticos con `npm run build` y despliega `dist/` en cualquier hosting compatible con SPA (por ejemplo Firebase Hosting, Vercel o Netlify). No se requiere ni se recomienda GitHub Pages.

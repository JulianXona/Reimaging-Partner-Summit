# DELETE / KEEP / CREATE — Partner Summit SAP

Tres páginas, un backend serverless, storage en Vercel KV.

## URLs

| Ruta | Para quién |
|------|-----------|
| `/` | Participantes (celular o laptop) |
| `/board` | Board en la tele (pantalla limpia, tiempo real) |
| `/moderador` | Moderador (controles, estado, cierre de sesión) |

---

## Setup en 5 pasos

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create dkc-summit --public --push
```
O crear el repo en github.com y hacer push manual.

### 2. Importar en Vercel
- Ir a vercel.com → "Add New Project"
- Conectar el repo de GitHub
- Framework Preset: **Other**
- Click "Deploy"

### 3. Agregar Vercel KV (storage)
- En el dashboard de Vercel → tu proyecto → **Storage**
- Click **"Create Database"** → elegir **KV (Redis)**
- Nombre: `dkc-storage` → Create
- Click **"Connect to Project"** → seleccionar tu proyecto
- Vercel agrega automáticamente las variables de entorno necesarias

### 4. Redeploy
Después de conectar el KV, hacer un redeploy:
- Dashboard del proyecto → Deployments → tres puntitos → **Redeploy**

### 5. ¡Listo!
Tu app está en `https://[tu-proyecto].vercel.app`

---

## Variables de entorno (se agregan solas con el KV)
- `KV_REST_API_URL` — URL de tu base Redis
- `KV_REST_API_TOKEN` — Token de autenticación

No necesitás configurarlas manualmente si usás Vercel KV conectado al proyecto.

---

## Flujo del evento

1. **Moderador** abre `/moderador` en su compu
2. **Board** se abre en la compu conectada a la tele → `/board`
3. **Participantes** escanean QR o ingresan la URL en sus dispositivos → `/`
4. Todos cargan sus tarjetas (pueden editar hasta que el moderador cierre)
5. Moderador hace click en **"Cerrar sesión"** cuando termina la carga
6. Se hace la votación y conversación con el board proyectado
7. (Próximamente) Síntesis con IA al cierre

---

## Estructura del proyecto
```
dkc-summit/
├── index.html        # Vista participante
├── board.html        # Board TV (tiempo real)
├── moderador.html    # Panel del moderador
├── api/
│   └── responses.js  # Serverless function (Vercel)
└── vercel.json       # Routing config
```

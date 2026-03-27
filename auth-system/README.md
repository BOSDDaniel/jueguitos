# 🎮 jueguitos-auth — Sistema de Autenticación

Sistema de autenticación con roles para controlar el acceso a los juegos JavaScript
alojados en tu repositorio, conectado a Aiven MySQL.

---

## 📁 Estructura

```
auth-system/
├── database/
│   └── schema.sql          ← Script SQL — ejecutar primero
├── src/
│   ├── config/
│   │   └── db.js           ← Pool de conexión a Aiven
│   ├── middlewares/
│   │   └── auth.js         ← verifyToken + checkRole
│   ├── routes/
│   │   └── authRoutes.js   ← Endpoints REST
│   ├── services/
│   │   └── authService.js  ← Lógica de negocio
│   └── index.js            ← Servidor Express
├── .env.example
└── package.json
```

---

## 🚀 Instalación

```bash
npm install
cp .env.example .env        # Ajusta el JWT_SECRET
```

### Crear las tablas en Aiven

```bash
mysql -h mysql-5ddca62-bosddaniel-6781.a.aivencloud.com \
      -P 20571 -u avnadmin -p --ssl-mode=REQUIRED \
      jueguitosDB < database/schema.sql
```

### Arrancar

```bash
npm run dev   # desarrollo
npm start     # producción
```

---

## 🔑 API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/registro` | — | Registra usuario (rol: pendiente) |
| POST | `/api/auth/login` | — | Devuelve JWT |
| GET  | `/api/auth/me` | JWT | Info del usuario actual |
| GET  | `/api/admin/usuarios` | admin / moderador | Lista usuarios |
| PATCH | `/api/admin/usuarios/:id/rol` | admin | Cambia rol de un usuario |

---

## 👥 Sistema de Roles

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso total + gestión de roles |
| `moderador` | Puede ver usuarios y aprobarlos |
| `jugador` | Accede a los juegos autorizados |
| `pendiente` | Registrado, espera aprobación manual |

### Flujo de aprobación

1. Usuario se registra → rol automático: **pendiente**
2. Admin hace login y obtiene JWT
3. Admin llama `PATCH /api/admin/usuarios/:id/rol` con `{ "rol": "jugador" }`
4. Usuario ya puede acceder a los juegos

### Ejemplo — aprobar un usuario

```bash
# 1. Login como admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@jueguitos.com","password":"Admin1234!"}'

# 2. Usar el token para cambiar el rol (sustituye <TOKEN> y <ID>)
curl -X PATCH http://localhost:3000/api/admin/usuarios/<ID>/rol \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"rol":"jugador"}'
```

---

## 🛡️ Proteger una ruta de juego en tu código

```js
const { verifyToken, checkRole } = require('./src/middlewares/auth');

// Solo jugadores, moderadores y admins pueden acceder
router.get('/juegos/tetris', verifyToken, checkRole('jugador','moderador','admin'), handler);
```

---

## ⚠️ Seguridad

- Las contraseñas se almacenan con **bcrypt** (costo 12)
- Aiven exige **SSL** en todas las conexiones
- Cambia `JWT_SECRET` por un valor aleatorio antes de producción:
  ```bash
  openssl rand -hex 32
  ```
- El admin inicial (`admin@jueguitos.com` / `Admin1234!`) debe cambiar su contraseña en el primer uso

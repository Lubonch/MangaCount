# Plan de Acción — Bot de WhatsApp para MangaCount

## Objetivo

Un bot de WhatsApp corriendo en `192.168.0.50` que permite, desde cualquier lugar con señal de celular, consultar y actualizar la colección de manga. Caso de uso principal: estar en una librería, preguntar "¿ya tengo este manga y hasta qué volumen?" y poder marcar los volúmenes recién comprados.

---

## Cómo funciona (arquitectura simple)

```
Tu celular
    │  WhatsApp  (red de Meta, funciona desde cualquier lado)
    ▼
Servidor de WhatsApp (Meta)
    │
    ▼
192.168.0.50 — whatsapp-web.js  →  http://localhost:3000/api  →  PostgreSQL
```

`whatsapp-web.js` abre una sesión de WhatsApp Web en el servidor con un navegador headless. La conexión es **saliente** desde el servidor hacia WhatsApp — no se necesita exponer ningún puerto a internet ni tener IP pública. El bot funciona siempre que el servidor tenga acceso a internet (para conectarse a WhatsApp).

---

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Runtime | Node.js 20 LTS |
| WhatsApp | `whatsapp-web.js` + Puppeteer (headless Chrome) |
| HTTP client | `axios` |
| Persistencia de sesión | `LocalAuth` (incluido en whatsapp-web.js) |
| Estado por usuario | Map en memoria (simple y suficiente) |
| API backend | MangaCount en http://localhost:3000/api |

---

## Estructura de Archivos

```
WhatsappBot/
├── package.json
├── index.js              # Entry point, conecta el cliente WA y el router de mensajes
├── src/
│   ├── commands/
│   │   ├── perfiles.js   # Listar y seleccionar perfiles
│   │   ├── buscar.js     # Buscar manga por título
│   │   ├── estado.js     # Estado de un manga específico
│   │   ├── actualizar.js # Actualizar volúmenes comprados
│   │   └── pendientes.js # Listar mangas incompletos/prioritarios
│   ├── api.js            # Wrapper de Axios sobre http://localhost:3000/api
│   ├── session.js        # Estado por número de teléfono (perfil activo)
│   └── messages.js       # Templates de respuesta formateados
├── .wwebjs_auth/         # Sesión persistida por LocalAuth (gitignored)
└── .env                  # MANGA_API_URL=http://localhost:3000/api
```

---

## Flujo de Conversación

### Estado 1 — Sin perfil seleccionado

Cualquier mensaje recibido → el bot responde con la lista de perfiles:

```
📚 *MangaCount*
Hola! ¿Qué perfil querés usar?

1️⃣  Tendou
2️⃣  Lucas

Respondé con el número del perfil.
```

### Estado 2 — Perfil seleccionado

El bot responde al número elegido y muestra el menú:

```
✅ Perfil *Tendou* seleccionado.

¿Qué querés hacer?
• *buscar [título]* — ver si tenés un manga
• *pendientes* — tus series incompletas
• *actualizar [título] [cantidad]* — marcar volúmenes comprados
• *perfil* — cambiar de perfil
```

### Comando: `buscar`

**Input:** `buscar attack on titan`

**Output (encontrado):**
```
🔍 *Attack on Titan*

📦 Formato: Tankoubon
🏢 Editorial: Ivrea
📗 Tenés: 34 de 34 vol.
✅ Completo
```

**Output (no encontrado):**
```
❌ No encontré *atack on titam* en tu colección.
¿Quizás quisiste decir uno de estos?
   • Attack on Titan
   • Titan's Bride
```
*(búsqueda aproximada con includes case-insensitive)*

### Comando: `pendientes`

**Input:** `pendientes`

**Output:**
```
📋 Series incompletas de *Tendou*:

⭐ Berserk — 42/45 vol. (3 pendientes)
⭐ Vinland Saga — 17/27 vol. (10 pendientes)
   One Piece — 104/⁇ vol.
   Chainsaw Man — 11/17 vol. (6 pendientes)

(23 series incompletas en total)
```
*Las marcadas con ⭐ son prioritarias.*

### Comando: `actualizar`

**Input:** `actualizar berserk 43`

**Output:**
```
✏️ ¿Confirmás?
*Berserk* — cambiar de 42 a *43* vol. comprados
(quedarían 2 pendientes de 45)

Respondé *si* para confirmar o *no* para cancelar.
```

→ `si`

```
✅ Actualizado. Berserk: 43/45 vol.
```

### Comando: `perfil`

Vuelve al Estado 1, limpia el perfil activo.

---

## API Calls Necesarios

| Acción | Endpoint | Método |
|---|---|---|
| Listar perfiles | `GET /api/profile` | GET |
| Ver colección del perfil | `GET /api/entry?profileId={id}` | GET |
| Buscar manga por título | `GET /api/entry?profileId={id}` + filtro JS | GET |
| Actualizar entrada | `POST /api/entry` (con id existente) | POST |

Todos los datos vienen de un solo `GET /api/entry?profileId={id}` — se hace **una vez al arrancar una sesión** y se guarda en memoria. La búsqueda y listado de pendientes se resuelven en memoria sin nuevas llamadas. Solo `actualizar` hace una llamada al API.

---

## Modelo de Datos (EntryModel relevante)

```json
{
  "id": 5,
  "manga": {
    "id": 12,
    "title": "Berserk",
    "totalVolumes": 45,
    "format": { "name": "Tankoubon" },
    "publisher": { "name": "Ivrea" }
  },
  "quantity": 42,
  "pending": "",
  "isPriority": true
}
```

---

## Plan de Implementación por Fases

### Fase 1 — Infraestructura base ✦ (empezar aquí)

- [ ] Crear `package.json` con dependencias: `whatsapp-web.js`, `puppeteer`, `axios`, `dotenv`
- [ ] Crear `index.js` con cliente WhatsApp + LocalAuth + QR en consola
- [ ] Crear `api.js` con `getProfiles()` y `getEntriesByProfile(profileId)`
- [ ] Crear `session.js` con Map de estado por número de teléfono
- [ ] Verificar que el bot conecta y responde `pong` al mensaje `ping`

**Criterio de done:** el bot aparece online en WhatsApp y responde a un mensaje de prueba.

### Fase 2 — Selección de perfil

- [ ] Al recibir cualquier mensaje de un número sin sesión → responder con lista de perfiles
- [ ] Al recibir un número válido → confirmar perfil, cargar entradas en memoria, mostrar menú

**Criterio de done:** se puede seleccionar el perfil Tendou enviando "1".

### Fase 3 — Búsqueda

- [ ] Implementar `buscar.js`: filtro case-insensitive por título sobre las entradas en memoria
- [ ] Formatear respuesta con `messages.js`
- [ ] Incluir sugerencias cuando no hay match exacto (títulos que contengan alguna palabra del input)

**Criterio de done:** `buscar berserk` devuelve datos correctos.

### Fase 4 — Pendientes

- [ ] Implementar `pendientes.js`: filtrar entradas donde `quantity < totalVolumes`, ordenar por prioridad
- [ ] Paginar si son muchas (mostrar de a 10 con "ver más")

**Criterio de done:** `pendientes` devuelve lista correcta.

### Fase 5 — Actualización

- [ ] Implementar `actualizar.js` con flujo de confirmación (estado `awaiting_confirm`)
- [ ] Llamar `POST /api/entry` con los datos actualizados
- [ ] Refrescar entradas en memoria tras confirmar

**Criterio de done:** `actualizar berserk 43` + `si` persiste en la base de datos.

### Fase 6 — Deploy en servidor

- [ ] Copiar `WhatsappBot/` al servidor: `scp -r WhatsappBot/ pihole@192.168.0.50:/home/pihole/mangacount/bot/`
- [ ] `npm install` en el servidor (instala Chromium vía Puppeteer)
- [ ] Primera ejecución con `node index.js` para escanear QR con el celular
- [ ] Configurar como servicio systemd para auto-start (ver sección Deploy)

---

## Deploy en el Servidor

### Primera vez (escaneo QR)

```bash
ssh pihole@192.168.0.50
cd /home/pihole/mangacount/bot
npm install
node index.js
# → QR code en consola, escanearlo con el celular
# → Una vez conectado, Ctrl+C
# La sesión queda guardada en .wwebjs_auth/
```

### Correr en background

```bash
# Con nohup (igual que la app principal)
nohup node index.js >> bot.log 2>&1 &

# Ver logs
tail -f /home/pihole/mangacount/bot/bot.log
```

### Como servicio systemd (recomendado para que arranque solo)

Crear `/etc/systemd/system/mangacount-bot.service`:
```ini
[Unit]
Description=MangaCount WhatsApp Bot
After=network.target mangacount.service

[Service]
Type=simple
User=pihole
WorkingDirectory=/home/pihole/mangacount/bot
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable mangacount-bot
sudo systemctl start mangacount-bot
```

---

## Consideraciones Importantes

### ¿Por qué funciona desde cualquier lado?
El servidor en `192.168.0.50` abre una conexión **saliente** a los servidores de WhatsApp. Cuando mandás un mensaje desde tu celular (con datos móviles o WiFi de otro lado), pasa por los servidores de WhatsApp y llega al bot. No necesitás estar en la red local.

### Sesión de WhatsApp
`whatsapp-web.js` usa el mismo mecanismo que WhatsApp Web. Esto significa:
- El número vinculado al bot **no puede estar abierto en WhatsApp Web en otro dispositivo al mismo tiempo**
- Si cerrás sesión en WhatsApp desde el celular, hay que re-escanear el QR
- Lo ideal es usar un número secundario (SIM vieja, número virtual) dedicado al bot

### Rate limits
No hay rate limits estrictos para uso personal. Evitar mandar mensajes masivos automáticos para no arriesgarse a ban.

### Chromium en Raspberry Pi / Pi-hole
`192.168.0.50` es la máquina Pi-hole. Si es una Raspberry Pi, Puppeteer puede ser pesado. En ese caso usar `puppeteer-core` + Chromium del sistema:
```bash
sudo apt install chromium-browser
```
Y en el código pasar `executablePath: '/usr/bin/chromium-browser'` al cliente.

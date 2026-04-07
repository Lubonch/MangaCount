# Deploy a Servidor via SSH

Guía para compilar y desplegar MangaCount en el servidor LAN `192.168.0.50`.

## Datos del Servidor

| Campo         | Valor                              |
|---------------|------------------------------------|
| IP            | `192.168.0.50`                     |
| SSH User      | `pihole`                           |
| SSH Password  | `pihole`                           |
| App directory | `/home/pihole/mangacount/app/`     |
| Puerto        | `3000`                             |
| URL           | http://192.168.0.50:3000           |
| Log           | `/home/pihole/mangacount/app/manga.log` |

## Prerrequisitos en el Servidor (ya instalados)

- .NET 8 Runtime (`/usr/bin/dotnet`)
- PostgreSQL 16 (`MangaCount` database, user `pihole`, password `pihole`)
- Directorio `/home/pihole/mangacount/app/` existente

---

## Deploy Completo (build + publish + copy + restart)

Ejecutar desde la raíz del repositorio en la máquina local:

### 1. Publicar la aplicación

```bash
cd /mnt/Files-2tb/repos/MangaCount

dotnet publish MangaCount.Server -c Release -o ./publish
```

Esto compila el backend y copia el build del frontend (React) como archivos estáticos embebidos.

### 2. Copiar al servidor

```bash
scp publish/MangaCount.Server.dll pihole@192.168.0.50:/home/pihole/mangacount/app/
```

> Si hay otros archivos nuevos en `publish/` (DLLs de dependencias, archivos `wwwroot/`), copiar el directorio completo la primera vez:
> ```bash
> scp -r publish/* pihole@192.168.0.50:/home/pihole/mangacount/app/
> ```

### 3. Reiniciar la aplicación

```bash
ssh pihole@192.168.0.50 'bash -s' << 'EOF'
pkill -f MangaCount.Server.dll || true
sleep 3
cd /home/pihole/mangacount/app
nohup /usr/bin/dotnet MangaCount.Server.dll --urls=http://0.0.0.0:3000 >> manga.log 2>&1 &
echo "Iniciado con PID $!"
EOF
```

### 4. Verificar que levantó

```bash
sleep 3 && curl -s http://192.168.0.50:3000/api/profile
```

---

## Deploy Rápido (solo DLL, sin cambios de frontend)

Cuando solo se modificó código C# (sin tocar `mangacount.client`):

```bash
# Desde la raíz del repo
dotnet build MangaCount.Server -c Release

scp MangaCount.Server/bin/Release/net8.0/MangaCount.Server.dll \
    pihole@192.168.0.50:/home/pihole/mangacount/app/

ssh pihole@192.168.0.50 \
  'pkill -f MangaCount.Server.dll; sleep 3; cd /home/pihole/mangacount/app && nohup /usr/bin/dotnet MangaCount.Server.dll --urls=http://0.0.0.0:3000 >> manga.log 2>&1 &'
```

---

## Ver Logs en Tiempo Real

```bash
ssh pihole@192.168.0.50 'tail -f /home/pihole/mangacount/app/manga.log'
```

Para ver las últimas 50 líneas:

```bash
ssh pihole@192.168.0.50 'tail -50 /home/pihole/mangacount/app/manga.log'
```

---

## Verificar Estado del Proceso

```bash
ssh pihole@192.168.0.50 'pgrep -a -f MangaCount'
```

---

## Acceder a la Base de Datos en el Servidor

```bash
ssh pihole@192.168.0.50 'psql -U pihole -d MangaCount'
```

Comandos útiles dentro de psql:

```sql
-- Contar registros
SELECT COUNT(*) FROM manga;
SELECT COUNT(*) FROM entry;
SELECT COUNT(*) FROM profile;

-- Ver formatos
SELECT * FROM format;

-- Ver editoriales
SELECT * FROM publisher;

-- Salir
\q
```

---

## Importar Colección desde TSV

Con la app corriendo, enviar el archivo TSV al endpoint de importación para el perfil `1`:

```bash
curl -X POST http://192.168.0.50:3000/api/entry/import/1 \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/mnt/Files-2tb/repos/MangaCount/Inventario - Lucas.tsv"
```

La respuesta incluye un resumen de los registros importados.

---

## Parar la Aplicación

```bash
ssh pihole@192.168.0.50 'pkill -f MangaCount.Server.dll'
```

---

## Cadena de Conexión en Producción

El archivo `appsettings.Production.json` en el servidor contiene:

```json
{
  "ConnectionStrings": {
    "MangacountDatabase": "Host=localhost;Database=MangaCount;Username=pihole;Password=pihole"
  }
}
```

La variable de entorno `ASPNETCORE_ENVIRONMENT=Production` hace que la app use este archivo en lugar del `appsettings.json` de desarrollo.

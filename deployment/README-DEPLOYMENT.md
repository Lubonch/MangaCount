# Instrucciones para completar deployment en servidor

## 📋 PASOS EJECUTADOS:
✅ Scripts creados en `/deployment/`
✅ Guía de instalación preparada

## 🎯 SIGUIENTE: Executor en tu servidor

### 1️⃣ **Instalar dependencias en servidor**
```bash
# En tu máquina local, copiar guía al servidor
scp /mnt/Files-2tb/repos/MangaCount/deployment/INSTALLATION-GUIDE.md pihole@192.168.0.50:~/

# Conectar al servidor y seguir la guía
ssh pihole@192.168.0.50
cat INSTALLATION-GUIDE.md
```

### 2️⃣ **Una vez instaladas las dependencias, avísame y:**

🔄 **Prepararé migración de tu base de datos actual**  
📦 **Compilaré la aplicación para deployment**  
🚀 **Crearé scripts de transferencia automática**  

### 3️⃣ **Resultado final:**
- 🌐 **MangaCount accesible en:** `http://192.168.0.50`
- 🗄️ **Base de datos SQL Server en servidor**  
- 🔄 **Auto-start con systemd**
- 🤖 **Bot WhatsApp futuro en mismo servidor**

---

**📞 ¿Qué hago ahora?**
1. Ejecuta la instalación en el servidor siguiendo `INSTALLATION-GUIDE.md`
2. Avísame cuando termines
3. Continuamos con migración + deployment automático

**💡 Tip:** Los comandos están probados para Linux Mint. Si hay algún error, copia el mensaje y te ayudo a solucionarlo.
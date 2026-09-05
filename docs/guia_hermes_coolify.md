# Guía: YouTube & MP3 en Hermes Agent (Despliegue en Coolify)

Al tener a Hermes en **Coolify**, tu agente vive dentro de un contenedor Docker. Para que pueda descargar MP3, necesitamos que las herramientas `yt-dlp` y `ffmpeg` estén instaladas **dentro** de ese contenedor.

Aquí tienes los dos métodos para lograrlo:

---

## Método A: Modificar el Dockerfile (Recomendado para persistencia)

Si desplegaste Hermes usando un repositorio de GitHub en Coolify, puedes modificar el `Dockerfile` de tu repositorio.

1.  Busca la línea donde se instalan las dependencias (normalmente empieza con `RUN apt-get update`).
2.  Asegúrate de que incluya `ffmpeg` y añade la descarga de `yt-dlp`. Debería verse algo así:

```dockerfile
# ... (líneas anteriores del Dockerfile)

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# ... (resto del Dockerfile)
```

3.  **Guarda y haz Push** a tu repositorio. Coolify detectará el cambio y reconstruirá la imagen con las herramientas instaladas.

---

## Método B: Usar Docker Compose en Coolify

Si usas la opción de **Docker Compose** en Coolify, puedes añadir un comando de inicialización para instalar las herramientas cada vez que el contenedor arranque (aunque es más lento).

En la configuración de tu servicio en Coolify, busca el apartado de **Docker Compose** y asegúrate de tener algo así:

```yaml
services:
  hermes:
    image: nousresearch/hermes-agent:latest
    # ... otras configuraciones ...
    entrypoint: >
      sh -c "apt-get update && apt-get install -y ffmpeg curl && 
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && 
      chmod a+rx /usr/local/bin/yt-dlp && 
      python3 run_agent.py"
```

---

## 📂 Configuración de Almacenamiento (Volúmenes)

Para que los MP3 que descargue Hermes no se borren si el contenedor se reinicia, debes mapear un **Volumen** en Coolify:

1.  En la configuración de tu aplicación en Coolify, ve a **Storages / Volumes**.
2.  Añade un nuevo volumen:
    *   **Destination Path:** `/opt/hermes/downloads` (o la carpeta donde Hermes guarde las descargas).
    *   **Source Path:** Una carpeta en tu servidor (ej: `/home/ubuntu/hermes_data/downloads`).

---

## 🤖 ¿Cómo pedirle a Hermes que descargue?

Una vez que Coolify haya reiniciado a Hermes con estas herramientas, simplemente dile:

> *"Hermes, usa la terminal para descargar este video como MP3 usando yt-dlp: [URL]"*

**Nota sobre la "Skin":** Como mencioné antes, la skin no te dará la función, pero si quieres que la interfaz de Hermes en Coolify se vea mejor, puedes buscar en la configuración de la UI de Hermes (si la tiene habilitada) el selector de **Themes** o **Skins**. Pero lo importante para el MP3 es el **Dockerfile** que configuramos arriba.

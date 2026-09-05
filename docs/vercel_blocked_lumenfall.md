# Diagnóstico del despliegue bloqueado de LumenFall en Vercel

La captura muestra el estado `Blocked` en los despliegues de los commits de la rama `perf/render-optimization`. Esto no equivale a un error de compilación (`Failed`). La documentación oficial de Vercel indica que `DEPLOYMENT_BLOCKED` significa que una condición previa impide que el despliegue continúe; las causas pueden incluir configuración, limitaciones de cuenta, políticas o estado de la cuenta.

La documentación de Vercel también indica que, cuando los commits no disparan o quedan bloqueados, deben revisarse la conexión Git de Vercel, la identidad del autor del commit y la configuración de `Ignored Build Step`. En este repositorio no hay `vercel.json`; el portal está en la raíz y el videojuego en `Lumenfall-juego`. La compilación local del videojuego termina correctamente con `npm run build`, por lo que la captura no demuestra un fallo del código.

La hipótesis más probable, pendiente de confirmación en el panel de Vercel, es una protección o regla del proyecto, una conexión Git que necesita reautenticación, una restricción del plan Hobby para el autor de la rama, o una configuración de raíz/comando que no coincide con el proyecto que se desea publicar.

Fuentes:

[1] https://vercel.com/docs/errors/deployment_blocked — Vercel, DEPLOYMENT_BLOCKED.
[2] https://vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel — Vercel, Why aren't commits triggering deployments on Vercel?

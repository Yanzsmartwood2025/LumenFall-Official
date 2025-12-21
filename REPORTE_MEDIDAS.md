# Reporte de Estandarización de Medidas y Nuevos VFX

## 1. Regla de Unidad Base (Nuevo Estándar)

Siguiendo las directrices de la Dirección, se ha establecido un sistema de medidas estricto para garantizar la disciplina en el arte visual del proyecto.

- **Constante Definida:** `PIXELS_PER_UNIT = 64`
- **Regla:** El tamaño lógico de los objetos en el juego se calcula automáticamente dividiendo los píxeles del frame por 64.
- **Objetivo:** Asegurar que la escala visual sea consistente y predecible desde la fase de diseño de assets.

## 2. Análisis de Estado Actual vs. Nuevo Sistema

### Personaje Principal (Joziel)
- **Sistema Legacy:** Joziel (128px) tiene una altura manual de 4.2 unidades.
- **Escala Implícita:** ~30 píxeles por unidad.
- **Impacto:** El personaje se mantiene con su configuración manual actual ("Legacy") para no romper la jugabilidad existente.

### Nuevos Assets (Sistema Nuevo)
Los nuevos assets de VFX se han implementado bajo la regla estricta de 64 px/unidad.

#### A. Aura de Carga (`carga.jpg`)
- **Resolución Total:** 1600x678
- **Grilla:** 5 Columnas x 2 Filas
- **Tamaño de Frame:** 320x339 píxeles
- **Cálculo Automático:**
  - Ancho: 320 / 64 = **5.0 Unidades**
  - Alto: 339 / 64 = **5.3 Unidades**
- **Resultado Visual:** El aura tiene una altura de 5.3u, cubriendo perfectamente al personaje (4.2u). La escala es **CORRECTA** y cumple el propósito de "envolver" a Joziel.

#### B. Proyectil de Fuego (`proyectil-1.jpg`)
- **Resolución Total:** 1600x678
- **Grilla:** 4 Columnas x 2 Filas
- **Tamaño de Frame:** 400x339 píxeles
- **Cálculo Automático:**
  - Ancho: 400 / 64 = **6.25 Unidades**
  - Alto: 339 / 64 = **5.3 Unidades**
- **Resultado Visual:** El proyectil resultante es **MASIVO** (más grande que el propio personaje).
- **Observación:** Al aplicar la disciplina de "Cálculo Automático", el motor respeta fielmente el tamaño del asset proporcionado. Dado que el arte original es de alta resolución y no pixel-art, el objeto en juego refleja esa magnitud.

## 3. Recomendaciones para Futuros Assets

Para mantener coherencia con el mundo de juego (donde 1 metro ≈ 1 unidad ≈ 64px):

1. **Proyectiles Estándar:** Diseñar en lienzos más pequeños (ej. frames de 64x64 o 128x128) si se desea un tamaño "normal".
2. **Jefes/Enemigos Grandes:** El sistema actual (frames de ~300-400px) es ideal para crear criaturas gigantes (5-6 metros de altura) sin pérdida de calidad.
3. **Pixel Art vs HD:** Si se mezcla Pixel Art (Joziel) con VFX HD (Proyectiles), la diferencia de densidad de píxeles será notoria. Se recomienda unificar el estilo o aceptar esta estética híbrida.

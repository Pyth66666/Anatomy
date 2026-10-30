# Vet Anatomy Viewer

Visor 3D de anatomía veterinaria — perro, caballo y vaca — como PWA instalable.
Alternativa didáctica y gratuita a los atlas veterinarios comerciales.

## Modelos y atribución

Los modelos 3D provienen del **[Virginia Tech Virtual Animal Project / VT-ARIES](https://github.com/VT-ARIES/Anatomy)**,
bajo licencia [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/):

> Virginia Tech Virtual Animal Project / VT-ARIES — CC BY-NC-SA 4.0

- **Atribución**: la cita de arriba debe conservarse en cualquier derivado.
- **NoComercial**: esta app no puede monetizarse (sin ads, sin suscripciones, sin venta).
- **ShareAlike**: los modelos y sus derivados se redistribuyen bajo la misma licencia.

El código propio de este visor es MIT.

## Desarrollo

Sin build step: ES modules + importmap, three.js vendido localmente en `vendor/`.

```bash
node scripts/scan-models.mjs   # regenera models.json desde models/
npx serve .                     # o cualquier static server
```

## Estructura

```
models/          modelos .glb por especie/región/pieza (VT-ARIES)
models.json      inventario generado (no editar a mano)
scripts/         scan-models.mjs
vendor/          three.js y addons (vendidos, sin CDN)
index.html       shell + home de especies
viewer.html      visor 3D
js/              app
sw.js            service worker (precache shell, runtime cache de .glb)
```
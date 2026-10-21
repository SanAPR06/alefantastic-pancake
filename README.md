# Registro de Trabajo

App web para registrar el trabajo diario (subtítulos, horas, metadata y presentaciones) y generar
al final de cada periodo el Excel con el mismo formato que "Alessandra actividades.xlsx".

## Uso

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # pruebas (incluye reproducir la hoja Abril-Mayo: total $1003)
npm run build    # genera dist/ para publicar como sitio estático
```

## Cómo funciona

- **Registrar**: cada trabajo se anota al terminarlo. Se recuerdan el último programa, los idiomas y el
  precio usado; en "Episodios" se sugiere el siguiente episodio. `Number of eps` = episodios × idiomas.
- **Resumen**: elegir fechas → "Descargar Excel" genera la hoja `Subtitulos <Periodo>` y la hoja
  `Comentarios` (horas por día). "Cerrar periodo" lo marca como cobrado y el siguiente empieza al día siguiente.
- **Ajustes**: tipos de trabajo y precios, tarifa por hora, respaldo/restauración en JSON.

Los datos viven en el navegador (IndexedDB). Todo acceso pasa por `src/data/db.ts`, para cambiarlo por
un backend con login en la fase 3.

## Estructura

- `src/domain/` — tipos y cálculos (sin dependencias de UI)
- `src/data/db.ts` — almacenamiento
- `src/export/excel.ts` — generación del .xlsx (ExcelJS, se carga solo al exportar)
- `src/ui/` — pantallas

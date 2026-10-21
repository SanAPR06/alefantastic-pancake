/** Fecha en formato ISO local: YYYY-MM-DD */
export type FechaISO = string;

export type Categoria = 'subtitulos' | 'metadata' | 'presentacion' | 'horas';

/** ENG CC va en la misma columna que ENG en el Excel. */
export type Idioma = 'eng' | 'eng_cc' | 'spa';

export interface Registro {
  id: string;
  fecha: FechaISO;
  categoria: Categoria;
  /** Columna "Programa" (o nombre de la presentación / actividad por horas). */
  programa: string;
  /** Id del tipo de trabajo (Trailer, Episodios, ...). Solo subtítulos. */
  tipoId?: string;
  /** Columna "Episodio": "del 1 al 60", "Trailer", "Ep 2"... */
  descripcion: string;
  idiomas: Idioma[];
  /** Columna "Number of eps" (episodios × idiomas). */
  unidades: number;
  /** Columna "Price Per episode". Para metadata/presentación es el monto fijo. */
  precioUnitario: number;
  /** Horas trabajadas. Obligatorio para categoría "horas"; opcional en el resto (estadísticas, fase 2). */
  horas?: number;
  nota?: string;
  creadoEn: number;
}

export interface TipoTrabajo {
  id: string;
  nombre: string;
  /** Precio por unidad (episodio × idioma) */
  precio: number;
  /** true → se piden episodios "del X al Y"; false → se pide una cantidad */
  porRango: boolean;
}

export interface Ajustes {
  id: 'ajustes';
  nombreEmpleado: string;
  tarifaHora: number;
  actividadHoras: string;
  montoMetadata: number;
  /** Precio sugerido de una presentación; varía, se puede cambiar en cada una. */
  montoPresentacion: number;
  /** Uso interno: rellenar "Price Per episode" en el Excel. Normalmente vacío (lo pone la jefa). */
  precioEnExcel?: boolean;
  tipos: TipoTrabajo[];
}

export interface Periodo {
  id: string;
  nombre: string;
  desde: FechaISO;
  hasta: FechaISO;
  cerradoEn: number;
}

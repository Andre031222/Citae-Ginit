// Fuente única de los colores de resaltado semántico.
// Cada entrada expone key, label semántico, nombre de color y hex.

export const HIGHLIGHT_COLORS = [
  { key: 'yellow', label: 'Cita / idea clave',   name: 'Amarillo', hex: '#FCC419' },
  { key: 'green',  label: 'Dato / evidencia',     name: 'Verde',    hex: '#51CF66' },
  { key: 'blue',   label: 'Insight propio',        name: 'Azul',     hex: '#4DABF7' },
  { key: 'pink',   label: 'Duda / contradicción', name: 'Rosa',     hex: '#F06595' },
  { key: 'navy',   label: 'Clave del paper',       name: 'Índigo',   hex: '#5C7CFA' },
];

/** Devuelve el valor hex para una key de color, con fallback amarillo */
export const colorHex  = key => HIGHLIGHT_COLORS.find(c => c.key === key)?.hex  ?? '#f5c542';

/** Devuelve el nombre de pantalla (ej. "Verde") para una key de color */
export const colorName = key => HIGHLIGHT_COLORS.find(c => c.key === key)?.name ?? key;

import type {
  LessonActivity,
  LessonActivityCatalog,
  LessonActivityCategory,
} from "./types";

/**
 * Catalog of padel technical activities (reference for coaches).
 * `hasSides`: exercise on **forehand (D)** and **backhand (R)**.
 */
export type PadelActivity = {
  id: string;
  /** Spanish text (usual teaching terms). */
  label: string;
  hasSides?: boolean;
};

export type PadelActivitySection = {
  id: string;
  title: string;
  activities: PadelActivity[];
};

export const PADEL_ACTIVITY_SECTIONS: PadelActivitySection[] = [
  {
    id: "defensa",
    title: "Defensa",
    activities: [
      { id: "defensa-general", label: "Defensa" },
      { id: "derecha-directa", label: "Derecha directa" },
      { id: "reves-directo", label: "Revés directo" },
      { id: "salida-pared-dr", label: "Salida de pared ( D y R )", hasSides: true },
      { id: "salida-pared-volcadita-dr", label: "Salida de pared volcadita ( D y R )", hasSides: true },
      { id: "bajada-pared-dr", label: "Bajada de pared ( D y R )", hasSides: true },
      { id: "pared-lateral", label: "Pared lateral" },
      { id: "doble-vidrio-lat-fondo", label: "Doble vidrio ( lateral - fondo )" },
      { id: "doble-vidrio-fondo-lat", label: "Doble vidrio ( fondo - lateral )" },
      { id: "vidrio-fondo-giros", label: "Vidrio de fondo con giros" },
      { id: "globos-directo-dr", label: "Globos directo ( D y R )", hasSides: true },
      { id: "globos-vidrios-dr", label: "Globos con vidrios ( D y R )", hasSides: true },
      { id: "defensa-reja", label: "Defensa de reja" },
      { id: "contra-vidrios-fondo", label: "Contra vidrios de fondo" },
      { id: "contra-vidrios-lateral", label: "Contra vidrios lateral" },
    ],
  },
  {
    id: "transicion",
    title: "Transición",
    activities: [
      { id: "voleas-bloqueo", label: "Voleas de bloqueo" },
      { id: "voleas-globo", label: "Voleas de globo" },
      { id: "volea-contra-golpe", label: "Volea contra golpe" },
      { id: "bote-pronto", label: "Bote pronto" },
      { id: "recuperacion-globo", label: "Recuperación de globo" },
      { id: "recuperacion-globo-rincon", label: "Recuperación de globo al rincón" },
      { id: "recuperacion-smash", label: "Recuperación de smash" },
    ],
  },
  {
    id: "ataque",
    title: "Ataque",
    activities: [
      { id: "voleas-dr", label: "Voleas ( D y R )", hasSides: true },
      { id: "voleas-bajas-dr", label: "Voleas bajas ( D y R )", hasSides: true },
      { id: "drop-dejadita", label: "Drop shot, dejadita" },
      { id: "voleas-reja", label: "Voleas a la reja" },
      { id: "bandeja", label: "Bandeja" },
      { id: "bandeja-salto", label: "Bandeja con salto" },
      { id: "vibora", label: "Víbora" },
      { id: "gancho", label: "Gancho" },
      { id: "rulo", label: "Rulo" },
      { id: "smash", label: "Smash" },
      { id: "smash-x3", label: "Smash x3" },
      { id: "smash-x4", label: "Smash x4" },
    ],
  },
  {
    id: "servicios",
    title: "Servicios y resto",
    activities: [
      { id: "saque", label: "Saque" },
      { id: "saque-americana", label: "Saque en americana" },
      { id: "saque-australiano", label: "Saque en australiano" },
    ],
  },
];

/** Initial catalog persisted in localStorage (coach/admin can edit). */
export function createDefaultLessonActivityCatalog(): LessonActivityCatalog {
  const categories: LessonActivityCategory[] = [];
  const activities: LessonActivity[] = [];
  PADEL_ACTIVITY_SECTIONS.forEach((section, si) => {
    categories.push({
      id: section.id,
      name: section.title,
      description: "",
      sortOrder: si,
    });
    section.activities.forEach((act, ai) => {
      activities.push({
        id: act.id,
        categoryId: section.id,
        name: act.label,
        hasSides: Boolean(act.hasSides),
        active: true,
        sortOrder: ai,
      });
    });
  });
  return { categories, activities };
}

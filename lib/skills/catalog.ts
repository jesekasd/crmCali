import { SkillSlug, StudentSkillStatus } from "@/types/domain";

export interface SkillStage {
  index: number;
  label: string;
  description: string;
  benchmark: string;
}

export interface SkillDefinition {
  slug: SkillSlug;
  label: string;
  shortDescription: string;
  category: "balance" | "pull" | "static" | "core";
  stages: SkillStage[];
}

function buildStages(stages: Array<Omit<SkillStage, "index">>): SkillStage[] {
  return stages.map((stage, index) => ({ index, ...stage }));
}

export const SKILL_CATALOG: SkillDefinition[] = [
  {
    slug: "handstand",
    label: "Handstand",
    shortDescription: "Control de línea, balance y resistencia invertida.",
    category: "balance",
    stages: buildStages([
      { label: "Wall Walk", description: "Aprender entrada segura a invertido.", benchmark: "3 reps controladas" },
      { label: "Chest to Wall Hold", description: "Alinear hombros, cadera y pies.", benchmark: "30 segundos" },
      { label: "Shoulder Taps", description: "Consolidar estabilidad unilateral.", benchmark: "10 taps por lado" },
      { label: "Freestanding Attempts", description: "Practicar salidas y balance libre.", benchmark: "10 intentos consistentes" },
      { label: "Freestanding 10s", description: "Primer hold sólido sin pared.", benchmark: "10 segundos" },
      { label: "Freestanding 30s", description: "Resistencia base para trabajo avanzado.", benchmark: "30 segundos" }
    ])
  },
  {
    slug: "muscle_up",
    label: "Muscle-Up",
    shortDescription: "Tirón explosivo, transición y empuje sobre barra.",
    category: "pull",
    stages: buildStages([
      { label: "Scapular Pulls", description: "Base escapular y depresión activa.", benchmark: "12 reps limpias" },
      { label: "Explosive Pull-Ups", description: "Ganar altura de tirón.", benchmark: "5 reps al pecho" },
      { label: "Chest to Bar", description: "Llevar el tirón por encima de la barra.", benchmark: "3 reps" },
      { label: "Deep Bar Dips", description: "Cerrar la fase de empuje.", benchmark: "8 reps" },
      { label: "Banded Muscle-Up", description: "Practicar transición asistida.", benchmark: "3 reps controladas" },
      { label: "Strict Muscle-Up", description: "Ejecución completa sin ayuda.", benchmark: "1 rep limpia" }
    ])
  },
  {
    slug: "front_lever",
    label: "Front Lever",
    shortDescription: "Palanca horizontal con control escapular y core.",
    category: "static",
    stages: buildStages([
      { label: "Hollow Body Hold", description: "Base de core anti-extensión.", benchmark: "40 segundos" },
      { label: "Tuck Front Lever", description: "Primer patrón específico.", benchmark: "10 segundos" },
      { label: "Advanced Tuck", description: "Mayor palanca con cadera más abierta.", benchmark: "8 segundos" },
      { label: "One Leg Front Lever", description: "Transición unilateral.", benchmark: "5 segundos por lado" },
      { label: "Straddle Front Lever", description: "Palanca casi completa.", benchmark: "5 segundos" },
      { label: "Full Front Lever", description: "Ejecución final.", benchmark: "5 segundos" }
    ])
  },
  {
    slug: "planche",
    label: "Planche",
    shortDescription: "Empuje horizontal con proyección y control escapular.",
    category: "static",
    stages: buildStages([
      { label: "Planche Lean", description: "Construir proyección y fuerza de hombro.", benchmark: "20 segundos" },
      { label: "Tuck Planche", description: "Primera compresión real.", benchmark: "8 segundos" },
      { label: "Advanced Tuck", description: "Mayor apertura de cadera.", benchmark: "6 segundos" },
      { label: "Straddle Planche", description: "Palanca avanzada abierta.", benchmark: "4 segundos" },
      { label: "Full Planche Prep", description: "Intentos con línea casi completa.", benchmark: "3 intentos sólidos" },
      { label: "Full Planche", description: "Posición final completa.", benchmark: "3 segundos" }
    ])
  },
  {
    slug: "back_lever",
    label: "Back Lever",
    shortDescription: "Control de extensión de hombro y línea posterior.",
    category: "static",
    stages: buildStages([
      { label: "Skin the Cat", description: "Movilidad específica de hombro.", benchmark: "5 reps suaves" },
      { label: "German Hang", description: "Tolerancia de extensión pasiva.", benchmark: "20 segundos" },
      { label: "Tuck Back Lever", description: "Primer hold específico.", benchmark: "10 segundos" },
      { label: "Advanced Tuck", description: "Mayor palanca.", benchmark: "8 segundos" },
      { label: "Straddle Back Lever", description: "Control avanzado abierto.", benchmark: "5 segundos" },
      { label: "Full Back Lever", description: "Posición final completa.", benchmark: "5 segundos" }
    ])
  },
  {
    slug: "l_sit",
    label: "L-Sit",
    shortDescription: "Compresión, soporte y control de core.",
    category: "core",
    stages: buildStages([
      { label: "Tucked Support", description: "Soporte activo con compresión básica.", benchmark: "20 segundos" },
      { label: "Single Leg L-Sit", description: "Extensión alternada.", benchmark: "10 segundos por lado" },
      { label: "Full L-Sit", description: "Línea completa.", benchmark: "15 segundos" },
      { label: "L-Sit Raises", description: "Control dinámico desde soporte.", benchmark: "8 reps" },
      { label: "V-Sit Prep", description: "Más compresión y elevación.", benchmark: "10 segundos" },
      { label: "V-Sit", description: "Meta avanzada de compresión.", benchmark: "5 segundos" }
    ])
  }
];

export const SKILL_SLUGS = SKILL_CATALOG.map((skill) => skill.slug) as SkillSlug[];
export const STUDENT_SKILL_STATUS_VALUES = ["active", "completed", "archived"] as const satisfies readonly StudentSkillStatus[];

export function isSkillSlug(value: string): value is SkillSlug {
  return SKILL_SLUGS.includes(value as SkillSlug);
}

export function isStudentSkillStatus(value: string): value is StudentSkillStatus {
  return STUDENT_SKILL_STATUS_VALUES.includes(value as StudentSkillStatus);
}

export function getSkillDefinition(skillSlug: SkillSlug): SkillDefinition {
  const definition = SKILL_CATALOG.find((skill) => skill.slug === skillSlug);

  if (!definition) {
    throw new Error(`Unknown skill slug: ${skillSlug}`);
  }

  return definition;
}

export function getMaxSkillStageIndex(skillSlug: SkillSlug) {
  return getSkillDefinition(skillSlug).stages.length - 1;
}

export function clampSkillStageIndex(skillSlug: SkillSlug, stageIndex: number) {
  const maxStageIndex = getMaxSkillStageIndex(skillSlug);
  return Math.min(Math.max(Math.floor(stageIndex), 0), maxStageIndex);
}

export function getSkillStage(skillSlug: SkillSlug, stageIndex: number) {
  const definition = getSkillDefinition(skillSlug);
  return definition.stages[clampSkillStageIndex(skillSlug, stageIndex)];
}

export function getNextSkillStage(skillSlug: SkillSlug, stageIndex: number) {
  const definition = getSkillDefinition(skillSlug);
  const nextIndex = clampSkillStageIndex(skillSlug, stageIndex + 1);
  return nextIndex > stageIndex ? definition.stages[nextIndex] : null;
}

export function getSkillCompletionRatio(skillSlug: SkillSlug, stageIndex: number) {
  const maxStageIndex = getMaxSkillStageIndex(skillSlug);

  if (maxStageIndex <= 0) {
    return 1;
  }

  return clampSkillStageIndex(skillSlug, stageIndex) / maxStageIndex;
}

export function resolveStudentSkillStatus(skillSlug: SkillSlug, currentStage: number, status: StudentSkillStatus) {
  if (status === "archived") {
    return "archived";
  }

  return clampSkillStageIndex(skillSlug, currentStage) >= getMaxSkillStageIndex(skillSlug) ? "completed" : status;
}

"use client";

import { BrainCircuit20Regular } from "@fluentui/react-icons";
import { CatalogPage, type CatalogConfig } from "@/components/ui/CatalogPage";

const CONFIG: CatalogConfig = {
  apiPath: "/api/admin/personalities",
  layoutTitle: "PERSONALIDADES",
  title: "Personalidades",
  description: "Catálogo de personalidades y sus templates de prompt",
  icon: <BrainCircuit20Regular />,
  templateField: "personality_template",
  hasUnlockCost: false,
  nameMaxLength: 100,
  namePlaceholder: "Nombre de la personalidad",
  templateLabel: "Template de personalidad",
  templatePlaceholder: "Prompt / template de personalidad (system prompt)...",
  templateRows: 8,
  newLabel: "Nueva personalidad",
  editTitle: "Editar personalidad",
  createSubmitLabel: "Crear personalidad",
  deleteTitle: "Eliminar personalidad",
  deletePrompt: "¿Estás seguro de que quieres eliminar la personalidad ",
  emptyLabel: "No se encontraron personalidades",
  createdToast: "Personalidad creada",
  updatedToast: "Personalidad actualizada",
  deletedToast: "Personalidad eliminada",
};

export default function PersonalitiesPage() {
  return <CatalogPage config={CONFIG} />;
}

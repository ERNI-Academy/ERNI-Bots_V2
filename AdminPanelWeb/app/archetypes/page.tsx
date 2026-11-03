"use client";

import { ContactCard20Regular } from "@fluentui/react-icons";
import { CatalogPage, type CatalogConfig } from "@/components/ui/CatalogPage";

const CONFIG: CatalogConfig = {
  apiPath: "/api/admin/archetypes",
  layoutTitle: "ARQUETIPOS",
  title: "Arquetipos",
  description: "Catálogo de arquetipos desbloqueables y sus templates de prompt",
  icon: <ContactCard20Regular />,
  templateField: "archetype_template",
  hasUnlockCost: true,
  nameMaxLength: 50,
  namePlaceholder: "Nombre del arquetipo",
  templateLabel: "Template del arquetipo",
  templatePlaceholder: "Prompt / template del arquetipo (system prompt)...",
  templateRows: 6,
  newLabel: "Nuevo arquetipo",
  editTitle: "Editar arquetipo",
  createSubmitLabel: "Crear arquetipo",
  deleteTitle: "Eliminar arquetipo",
  deletePrompt: "¿Estás seguro de que quieres eliminar el arquetipo ",
  emptyLabel: "No se encontraron arquetipos",
  createdToast: "Arquetipo creado",
  updatedToast: "Arquetipo actualizado",
  deletedToast: "Arquetipo eliminado",
};

export default function ArchetypesPage() {
  return <CatalogPage config={CONFIG} />;
}

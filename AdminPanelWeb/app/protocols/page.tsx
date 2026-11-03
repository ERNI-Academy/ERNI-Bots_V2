"use client";

import { WindowConsole20Regular } from "@fluentui/react-icons";
import { CatalogPage, type CatalogConfig } from "@/components/ui/CatalogPage";

const CONFIG: CatalogConfig = {
  apiPath: "/api/admin/protocols",
  layoutTitle: "PROTOCOLOS",
  title: "Protocolos",
  description: "Catálogo de protocolos desbloqueables y sus templates de prompt",
  icon: <WindowConsole20Regular />,
  templateField: "protocol_template",
  hasUnlockCost: true,
  nameMaxLength: 50,
  namePlaceholder: "Nombre del protocolo",
  templateLabel: "Template del protocolo",
  templatePlaceholder: "Prompt / template del protocolo (system prompt)...",
  templateRows: 6,
  newLabel: "Nuevo protocolo",
  editTitle: "Editar protocolo",
  createSubmitLabel: "Crear protocolo",
  deleteTitle: "Eliminar protocolo",
  deletePrompt: "¿Estás seguro de que quieres eliminar el protocolo ",
  emptyLabel: "No se encontraron protocolos",
  createdToast: "Protocolo creado",
  updatedToast: "Protocolo actualizado",
  deletedToast: "Protocolo eliminado",
};

export default function ProtocolsPage() {
  return <CatalogPage config={CONFIG} />;
}

import clsx from "clsx";
import type { PropsWithChildren } from "react";
import { useAppStore } from "@/shared/store/appStore";
import type { StepStatus, WorkflowStepId } from "@/shared/types/domain";

const sections = [
  { id: "import", label: "1. Importer", stepId: "importAnalysis" as WorkflowStepId },
  { id: "renaming", label: "2. Renommer", stepId: "renaming" as WorkflowStepId },
  { id: "processing", label: "3. Traiter", stepId: "processing" as WorkflowStepId },
  { id: "export", label: "4. Exporter", stepId: "export" as WorkflowStepId },
  { id: "templates", label: "Templates", stepId: undefined },
  { id: "logs", label: "Logs", stepId: undefined }
] as const;

export type SectionId = (typeof sections)[number]["id"];

interface WorkflowShellProps extends PropsWithChildren {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
}

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: "À faire",
  running: "En cours",
  success: "OK",
  error: "Erreur",
  skipped: "Ignoré"
};

export function WorkflowShell({ activeSection, onSelectSection, children }: WorkflowShellProps) {
  const project = useAppStore((s) => s.project);
  const errorCount = useAppStore((s) => s.logs.filter((log) => log.level === "error").length);

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Audio Workflow</h1>
        <p className="muted">Flux: import, renommage, traitement, export.</p>
        {project ? (
          <div className="sidebar-project">
            <span className="muted">Projet en cours</span>
            <strong title={project.rootDir}>{project.name}</strong>
          </div>
        ) : (
          <p className="muted">Aucun projet ouvert.</p>
        )}
        <nav>
          {sections.map((section) => {
            const status: StepStatus | undefined =
              section.stepId && project ? project.workflowState[section.stepId]?.status : undefined;
            const badge =
              section.id === "logs" && errorCount > 0
                ? { label: `${errorCount}`, level: "error" as const }
                : status
                  ? { label: STATUS_LABEL[status], level: stepBadgeLevel(status) }
                  : undefined;

            return (
              <button
                key={section.id}
                className={clsx("nav-item", activeSection === section.id && "active")}
                onClick={() => onSelectSection(section.id)}
                type="button"
              >
                <span>{section.label}</span>
                {badge ? (
                  <span className={clsx("nav-badge", `nav-badge-${badge.level}`)}>{badge.label}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function stepBadgeLevel(status: StepStatus): "neutral" | "running" | "success" | "error" {
  switch (status) {
    case "running":
      return "running";
    case "success":
      return "success";
    case "error":
      return "error";
    case "pending":
    case "skipped":
    default:
      return "neutral";
  }
}

import clsx from "clsx";
import type { PropsWithChildren } from "react";

const sections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "import", label: "Import / Analyse" },
  { id: "renaming", label: "Renommage" },
  { id: "processing", label: "Traitements" },
  { id: "export", label: "Export" },
  { id: "templates", label: "Templates" },
  { id: "logs", label: "Logs" }
] as const;

interface WorkflowShellProps extends PropsWithChildren {
  activeSection: (typeof sections)[number]["id"];
  onSelectSection: (section: (typeof sections)[number]["id"]) => void;
}

export function WorkflowShell({ activeSection, onSelectSection, children }: WorkflowShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Audio Workflow</h1>
        <p className="muted">MVP Windows - Tauri + React</p>
        <nav>
          {sections.map((section) => (
            <button
              key={section.id}
              className={clsx("nav-item", activeSection === section.id && "active")}
              onClick={() => onSelectSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

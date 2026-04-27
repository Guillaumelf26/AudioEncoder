import { useState } from "react";
import { ImportAnalysisSection } from "@/features/project/ImportAnalysisSection";
import { ProjectDashboardSection } from "@/features/project/ProjectDashboardSection";
import { LogsConsoleSection } from "@/features/logs/LogsConsoleSection";
import { TemplatesSection } from "@/features/templates/TemplatesSection";
import { ExportSection } from "@/features/workflow/ExportSection";
import { ProcessingSection } from "@/features/workflow/ProcessingSection";
import { RenamingSection } from "@/features/workflow/RenamingSection";
import { WorkflowActionsSection } from "@/features/workflow/WorkflowActionsSection";
import { WorkflowShell } from "@/layout/WorkflowShell";
import { useAppStore } from "@/shared/store/appStore";
import { tauriClient } from "@/shared/api/tauriClient";

type SectionId = "dashboard" | "import" | "renaming" | "processing" | "export" | "templates" | "logs";

export function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const ffmpegPath = useAppStore((s) => s.ffmpegPath);
  const ffprobePath = useAppStore((s) => s.ffprobePath);
  const setToolPaths = useAppStore((s) => s.setToolPaths);
  const addLog = useAppStore((s) => s.addLog);

  async function checkTools() {
    const result = await tauriClient.checkToolchain(ffmpegPath, ffprobePath);
    addLog({
      id: crypto.randomUUID(),
      stepId: "importAnalysis",
      at: new Date().toISOString(),
      level: result.ffmpegAvailable && result.ffprobeAvailable ? "info" : "warn",
      message: `ffmpeg: ${result.ffmpegAvailable ? "OK" : "absent"} / ffprobe: ${result.ffprobeAvailable ? "OK" : "absent"}`
    });
  }

  return (
    <WorkflowShell activeSection={activeSection} onSelectSection={setActiveSection}>
      <section className="card">
        <h2>Configuration outils</h2>
        <div className="row">
          <input
            className="input"
            value={ffmpegPath}
            onChange={(e) => setToolPaths(e.target.value, ffprobePath)}
            placeholder="Chemin ffmpeg"
          />
          <input
            className="input"
            value={ffprobePath}
            onChange={(e) => setToolPaths(ffmpegPath, e.target.value)}
            placeholder="Chemin ffprobe"
          />
          <button className="btn" onClick={() => void checkTools()} type="button">
            Vérifier
          </button>
        </div>
      </section>

      <WorkflowActionsSection />

      {activeSection === "dashboard" && <ProjectDashboardSection />}
      {activeSection === "import" && <ImportAnalysisSection />}
      {activeSection === "renaming" && <RenamingSection />}
      {activeSection === "processing" && <ProcessingSection />}
      {activeSection === "export" && <ExportSection />}
      {activeSection === "templates" && <TemplatesSection />}
      {activeSection === "logs" && <LogsConsoleSection />}
    </WorkflowShell>
  );
}

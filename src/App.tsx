import { useEffect, useState } from "react";
import { ImportAnalysisSection } from "@/features/project/ImportAnalysisSection";
import { ProjectDashboardSection } from "@/features/project/ProjectDashboardSection";
import { LogsConsoleSection } from "@/features/logs/LogsConsoleSection";
import { ExportSection } from "@/features/workflow/ExportSection";
import { ProcessingSection } from "@/features/workflow/ProcessingSection";
import { RenamingSection } from "@/features/workflow/RenamingSection";
import { TemplatesSection } from "@/features/templates/TemplatesSection";
import { ToastViewport } from "@/components/ToastViewport";
import { WorkflowShell, type SectionId } from "@/layout/WorkflowShell";
import { useAppStore } from "@/shared/store/appStore";
import { tauriClient, isTauriAvailable } from "@/shared/api/tauriClient";
import { runAsync } from "@/shared/actions/runAsync";

export function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("import");
  const [isCheckingTools, setIsCheckingTools] = useState(false);
  const ffmpegPath = useAppStore((s) => s.ffmpegPath);
  const ffprobePath = useAppStore((s) => s.ffprobePath);
  const setToolPaths = useAppStore((s) => s.setToolPaths);
  const pushToast = useAppStore((s) => s.pushToast);
  const addLog = useAppStore((s) => s.addLog);

  useEffect(() => {
    if (!isTauriAvailable()) {
      pushToast({
        level: "warn",
        title: "Mode web detecte",
        message:
          "Tu utilises l'app dans un navigateur (npm run dev). Les actions FFmpeg et fichiers ne fonctionneront pas tant que tu ne lances pas npm run tauri:dev."
      });
    }
  }, [pushToast]);

  async function checkTools() {
    if (isCheckingTools) {
      return;
    }
    setIsCheckingTools(true);
    await runAsync(
      async () => {
        const result = await tauriClient.checkToolchain(ffmpegPath, ffprobePath);
        if (result.resolvedFfmpegPath && result.resolvedFfprobePath) {
          setToolPaths(result.resolvedFfmpegPath, result.resolvedFfprobePath);
        }
        addLog({
          id: crypto.randomUUID(),
          stepId: "importAnalysis",
          at: new Date().toISOString(),
          level: result.ffmpegAvailable && result.ffprobeAvailable ? "info" : "warn",
          message: `ffmpeg: ${result.ffmpegAvailable ? "OK" : "absent"} / ffprobe: ${
            result.ffprobeAvailable ? "OK" : "absent"
          }`
        });
        if (result.autoInstallAttempted) {
          addLog({
            id: crypto.randomUUID(),
            stepId: "importAnalysis",
            at: new Date().toISOString(),
            level: result.autoInstallSucceeded ? "info" : "warn",
            message: result.autoInstallSucceeded
              ? "Installation automatique FFmpeg/FFprobe effectuée"
              : "Installation automatique FFmpeg/FFprobe échouée"
          });
        }
        if (result.details) {
          addLog({
            id: crypto.randomUUID(),
            stepId: "importAnalysis",
            at: new Date().toISOString(),
            level: "info",
            message: result.details
          });
        }
        if (!result.ffmpegAvailable || !result.ffprobeAvailable) {
          throw new Error(
            "FFmpeg ou FFprobe introuvable. Renseigne le chemin manuellement ou installe-le puis recommence."
          );
        }
        return result;
      },
      {
        stepId: "importAnalysis",
        successTitle: "Outils detectes",
        successMessage: "FFmpeg et FFprobe sont prets a l'emploi.",
        errorTitle: "Verification des outils echouee"
      }
    );
    setIsCheckingTools(false);
  }

  return (
    <>
      <WorkflowShell activeSection={activeSection} onSelectSection={setActiveSection}>
        <div className={activeSection === "import" ? "stack" : "section-hidden"}>
          <ProjectDashboardSection />
          <section className="card">
            <h2>Outils FFmpeg / FFprobe</h2>
            <p className="muted">
              Sur Windows, l'installation automatique via winget est tentee si ces outils sont absents.
            </p>
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
              <button
                className="btn"
                onClick={() => void checkTools()}
                disabled={isCheckingTools}
                type="button"
              >
                {isCheckingTools ? "Verification..." : "Verifier"}
              </button>
            </div>
          </section>
          <ImportAnalysisSection />
        </div>
        <div className={activeSection === "renaming" ? "" : "section-hidden"}>
          <RenamingSection />
        </div>
        <div className={activeSection === "processing" ? "" : "section-hidden"}>
          <ProcessingSection />
        </div>
        <div className={activeSection === "export" ? "" : "section-hidden"}>
          <ExportSection />
        </div>
        <div className={activeSection === "templates" ? "" : "section-hidden"}>
          <TemplatesSection />
        </div>
        <div className={activeSection === "logs" ? "" : "section-hidden"}>
          <LogsConsoleSection />
        </div>
      </WorkflowShell>
      <ToastViewport />
    </>
  );
}

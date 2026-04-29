import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import { runAsync } from "@/shared/actions/runAsync";
import type { AudioTrack, SourceFile } from "@/shared/types/domain";

export function ImportAnalysisSection() {
  const project = useAppStore((s) => s.project);
  const setProject = useAppStore((s) => s.setProject);
  const ffprobePath = useAppStore((s) => s.ffprobePath);
  const addLog = useAppStore((s) => s.addLog);
  const setStepStatus = useAppStore((s) => s.setStepStatus);
  const pushToast = useAppStore((s) => s.pushToast);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function ensureSessionProject() {
    if (project) {
      return project;
    }
    const session = await tauriClient.createSessionProject();
    setProject(session);
    addLog({
      id: crypto.randomUUID(),
      stepId: "importAnalysis",
      at: new Date().toISOString(),
      level: "info",
      message: `Session de travail creee dans ${session.rootDir}`
    });
    pushToast({
      level: "info",
      title: "Session rapide creee",
      message: "Si tu veux choisir l'emplacement, va dans 'Importer' puis 'Enregistrer le projet sous'.",
      action: { label: "Ouvrir le dossier", path: session.rootDir }
    });
    return session;
  }

  async function onAnalyzeFiles() {
    if (isAnalyzing) {
      return;
    }
    setIsAnalyzing(true);
    const startedAt = new Date().toISOString();
    setStepStatus("importAnalysis", "running", { startedAt });

    const result = await runAsync(
      async () => {
        const selected = await open({
          multiple: true,
          directory: false,
          filters: [{ name: "WAV", extensions: ["wav", "WAV"] }]
        });

        if (!selected || !Array.isArray(selected) || selected.length === 0) {
          throw new Error("Aucun fichier selectionne");
        }

        const activeProject = await ensureSessionProject();
        const analyzed = await tauriClient.analyzeSourceFiles(selected, ffprobePath);
        const tracks = buildTracksFromSourceFiles(analyzed);
        const updated = {
          ...activeProject,
          sourceFiles: analyzed,
          tracks,
          updatedAt: new Date().toISOString()
        };
        setProject(updated);
        await tauriClient.saveProject(updated);
        addLog({
          id: crypto.randomUUID(),
          stepId: "importAnalysis",
          at: new Date().toISOString(),
          level: "info",
          message: `${analyzed.length} fichier(s) analyse(s)`
        });
        return { count: analyzed.length, project: updated };
      },
      {
        stepId: "importAnalysis",
        successTitle: "Import et analyse OK",
        errorTitle: "Import / analyse echoue"
      }
    );

    if (result) {
      setStepStatus("importAnalysis", "success", { endedAt: new Date().toISOString() });
      pushToast({
        level: "success",
        title: `${result.count} fichier(s) analyse(s)`,
        action: { label: "Ouvrir le dossier sources", path: result.project.workDirs.sources }
      });
    } else {
      setStepStatus("importAnalysis", "error", {
        endedAt: new Date().toISOString(),
        error: "Echec import"
      });
    }
    setIsAnalyzing(false);
  }

  return (
    <section className="card">
      <h2>Import / Analyse des sources</h2>
      <p className="muted">
        Selectionne tes WAV deja separes. L'app cree un projet si besoin et n'ecrit rien dans le dossier source.
      </p>
      <div className="row">
        <button
          className="btn"
          onClick={() => void onAnalyzeFiles()}
          type="button"
          disabled={isAnalyzing}
        >
          {isAnalyzing ? "Analyse en cours..." : "Importer et analyser des WAV"}
        </button>
        {project ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              tauriClient.revealInExplorer(project.workDirs.sources).catch(() => undefined);
            }}
          >
            Ouvrir 01_sources
          </button>
        ) : null}
      </div>
      <SourceTable files={project?.sourceFiles ?? []} />
    </section>
  );
}

function buildTracksFromSourceFiles(sourceFiles: SourceFile[]): AudioTrack[] {
  return sourceFiles.map((file, index) => ({
    id: crypto.randomUUID(),
    sourceFileId: file.id,
    channelIndex: index + 1,
    displayName: file.fileName.replace(/\.[^/.]+$/u, ""),
    currentPath: file.absolutePath,
    state: "source"
  }));
}

function SourceTable({ files }: { files: SourceFile[] }) {
  if (!files.length) {
    return <p className="muted">Aucun fichier analyse.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Fichier</th>
          <th>Canaux</th>
          <th>Duree (s)</th>
          <th>SR (Hz)</th>
          <th>Bit depth</th>
          <th>Codec</th>
          <th>Taille (MB)</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id}>
            <td>{file.fileName}</td>
            <td>{file.channels}</td>
            <td>{file.durationSeconds?.toFixed(2) ?? "-"}</td>
            <td>{file.sampleRateHz ?? "-"}</td>
            <td>{file.bitDepth ?? "-"}</td>
            <td>{file.codec ?? "-"}</td>
            <td>{(file.fileSizeBytes / (1024 * 1024)).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

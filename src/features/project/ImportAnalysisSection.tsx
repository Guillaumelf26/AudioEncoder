import { open } from "@tauri-apps/plugin-dialog";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import type { SourceFile } from "@/shared/types/domain";

export function ImportAnalysisSection() {
  const project = useAppStore((s) => s.project);
  const setProject = useAppStore((s) => s.setProject);
  const ffprobePath = useAppStore((s) => s.ffprobePath);
  const addLog = useAppStore((s) => s.addLog);

  async function onAnalyzeFiles() {
    if (!project) {
      return;
    }
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [{ name: "WAV", extensions: ["wav", "WAV"] }]
    });

    if (!selected || !Array.isArray(selected) || selected.length === 0) {
      return;
    }

    const analyzed = await tauriClient.analyzeSourceFiles(selected, ffprobePath);
    const updated = {
      ...project,
      sourceFiles: analyzed,
      updatedAt: new Date().toISOString()
    };
    setProject(updated);
    await tauriClient.saveProject(updated);
    addLog({
      id: crypto.randomUUID(),
      stepId: "importAnalysis",
      at: new Date().toISOString(),
      level: "info",
      message: `${analyzed.length} fichier(s) analysé(s)`
    });
  }

  return (
    <section className="card">
      <h2>Import / Analyse des sources</h2>
      <div className="row">
        <button className="btn" disabled={!project} onClick={() => void onAnalyzeFiles()} type="button">
          Importer et analyser des WAV
        </button>
      </div>
      <SourceTable files={project?.sourceFiles ?? []} />
    </section>
  );
}

function SourceTable({ files }: { files: SourceFile[] }) {
  if (!files.length) {
    return <p className="muted">Aucun fichier analysé.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Fichier</th>
          <th>Canaux</th>
          <th>Durée (s)</th>
          <th>SR (Hz)</th>
          <th>Bit depth</th>
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
            <td>{(file.fileSizeBytes / (1024 * 1024)).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

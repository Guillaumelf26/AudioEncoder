import { useEffect, useMemo, useState } from "react";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import type { ExportPreset, ExportTemplate } from "@/shared/types/domain";

interface FileEntry {
  absolutePath: string;
  fileName: string;
}

export function ExportSection() {
  const project = useAppStore((s) => s.project);
  const templates = useAppStore((s) => s.templates);
  const setTemplates = useAppStore((s) => s.setTemplates);
  const ffmpegPath = useAppStore((s) => s.ffmpegPath);
  const addLog = useAppStore((s) => s.addLog);
  const pushToast = useAppStore((s) => s.pushToast);
  const setStepStatus = useAppStore((s) => s.setStepStatus);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [running, setRunning] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const exportTemplates = templates?.export ?? [];
  const selectedTemplate = exportTemplates.find((t) => t.id === selectedTemplateId) ?? exportTemplates[0];

  const refreshFiles = useMemo(
    () => async (silent: boolean) => {
      if (!project) {
        return;
      }
      if (!silent) setIsLoadingFiles(true);
      try {
        const list = await tauriClient.listDirectoryFiles(project.workDirs.processed, ["wav"]);
        const entries: FileEntry[] = list.map((absolutePath) => ({
          absolutePath,
          fileName: absolutePath.split(/[\\/]/).pop() ?? absolutePath
        }));
        setFiles(entries);
        setSelectedFiles((current) => {
          const next = new Set<string>();
          for (const entry of entries) {
            if (current.has(entry.absolutePath)) next.add(entry.absolutePath);
          }
          if (next.size === 0 && entries.length > 0) {
            for (const entry of entries) next.add(entry.absolutePath);
          }
          return next;
        });
      } catch (error) {
        if (!silent) {
          pushToast({
            level: "error",
            title: "Lecture du dossier processed echouee",
            message: error instanceof Error ? error.message : String(error)
          });
        }
      } finally {
        if (!silent) setIsLoadingFiles(false);
      }
    },
    [project, pushToast]
  );

  useEffect(() => {
    void refreshFiles(true);
  }, [refreshFiles]);

  useEffect(() => {
    if (!selectedTemplate) {
      setSelectedPresets(new Set());
      return;
    }
    setSelectedPresets((current) => {
      if (current.size > 0) {
        const filtered = new Set<string>();
        for (const preset of selectedTemplate.presets) {
          if (current.has(preset.id)) filtered.add(preset.id);
        }
        if (filtered.size > 0) return filtered;
      }
      return new Set(selectedTemplate.presets.map((preset) => preset.id));
    });
  }, [selectedTemplate]);

  function toggleFile(path: string) {
    setSelectedFiles((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function togglePreset(id: string) {
    setSelectedPresets((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiles() {
    setSelectedFiles(new Set(files.map((entry) => entry.absolutePath)));
  }
  function clearSelection() {
    setSelectedFiles(new Set());
  }

  function onCreateDefaultExportTemplate() {
    if (!templates) return;
    const newTemplate: ExportTemplate = {
      id: crypto.randomUUID(),
      name: "Web + Archive",
      presets: [
        { id: crypto.randomUUID(), format: "wav", sampleRateHz: 48000, channels: 2 },
        { id: crypto.randomUUID(), format: "mp3", bitrateKbps: 320, channels: 2 },
        { id: crypto.randomUUID(), format: "aacM4a", bitrateKbps: 256, channels: 2 }
      ]
    };
    setTemplates({ ...templates, export: [...exportTemplates, newTemplate] });
    setSelectedTemplateId(newTemplate.id);
    pushToast({
      level: "success",
      title: "Template d'export cree",
      message: newTemplate.name
    });
  }

  async function runExport() {
    if (!project || !selectedTemplate || running) return;
    const filesToExport = files.filter((entry) => selectedFiles.has(entry.absolutePath));
    const presetsToUse = selectedTemplate.presets.filter((preset) => selectedPresets.has(preset.id));
    if (!filesToExport.length || !presetsToUse.length) {
      pushToast({
        level: "warn",
        title: "Selection incomplete",
        message: "Coche au moins un fichier et un preset avant de lancer l'export."
      });
      return;
    }
    const total = filesToExport.length * presetsToUse.length;
    setRunning(true);
    setProgressTotal(total);
    setProgressCurrent(0);
    setProgressLabel("Demarrage de l'export...");
    setStepStatus("export", "running", { startedAt: new Date().toISOString() });

    let exported = 0;
    let failures = 0;
    const outputDir = selectedTemplate.outputDir ?? project.workDirs.exported;

    for (const file of filesToExport) {
      const baseName = file.fileName.replace(/\.[^/.]+$/u, "");
      for (const preset of presetsToUse) {
        const ext = extensionFor(preset.format);
        const output = `${outputDir}/${baseName}.${ext}`;
        setProgressCurrent(exported + 1);
        setProgressLabel(`${baseName} -> ${preset.format} (${exported + 1}/${total})`);
        try {
          const response = await tauriClient.executeExportOperation(
            ffmpegPath,
            file.absolutePath,
            output,
            preset
          );
          addLog({
            id: crypto.randomUUID(),
            stepId: "export",
            at: new Date().toISOString(),
            level: response.success ? "info" : "error",
            message: response.success
              ? `Export OK: ${output}`
              : `Export en erreur: ${output}`,
            response
          });
          if (!response.success) failures += 1;
        } catch (error) {
          failures += 1;
          addLog({
            id: crypto.randomUUID(),
            stepId: "export",
            at: new Date().toISOString(),
            level: "error",
            message: `Export plante: ${error instanceof Error ? error.message : String(error)}`
          });
        }
        exported += 1;
      }
    }

    setRunning(false);
    if (failures === 0) {
      setStepStatus("export", "success", { endedAt: new Date().toISOString() });
      pushToast({
        level: "success",
        title: "Export termine",
        message: `${exported} fichier(s) ecrit(s) dans 05_exports.`,
        action: { label: "Ouvrir le dossier export", path: outputDir }
      });
    } else {
      setStepStatus("export", "error", {
        endedAt: new Date().toISOString(),
        error: `${failures} export(s) en erreur`
      });
      pushToast({
        level: "error",
        title: "Export partiel",
        message: `${exported - failures}/${exported} reussi(s). Voir l'onglet Logs.`,
        action: { label: "Ouvrir le dossier export", path: outputDir }
      });
    }
  }

  return (
    <section className="card">
      <h2>Export / Encodage</h2>
      <p className="muted">
        Coche les fichiers de 04_processed et les presets, puis lance l'encodage. Chaque combinaison fichier x preset produit une sortie.
      </p>

      <div className="row">
        <select
          className="input"
          value={selectedTemplate?.id ?? ""}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          disabled={!exportTemplates.length}
        >
          {exportTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <button
          className="btn-secondary"
          type="button"
          onClick={onCreateDefaultExportTemplate}
          disabled={!templates}
        >
          + Creer un template d'export par defaut
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => void refreshFiles(false)}
          disabled={!project || isLoadingFiles}
        >
          {isLoadingFiles ? "Lecture..." : "Rafraichir la liste"}
        </button>
        <button
          className="btn"
          type="button"
          disabled={!project || !selectedTemplate || running || !files.length}
          onClick={() => void runExport()}
        >
          {running ? "Export en cours..." : "Lancer l'export"}
        </button>
        {project ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              tauriClient
                .revealInExplorer(selectedTemplate?.outputDir ?? project.workDirs.exported)
                .catch(() => undefined);
            }}
          >
            Ouvrir 05_exports
          </button>
        ) : null}
      </div>

      {running && (
        <div className="processing-progress" aria-live="polite">
          <div className="row">
            <strong>
              Progression: {progressCurrent}/{progressTotal}
            </strong>
            <span className="muted">{progressLabel}</span>
          </div>
          <progress max={Math.max(progressTotal, 1)} value={progressCurrent} />
        </div>
      )}

      {!exportTemplates.length ? (
        <p className="muted">Aucun template d'export. Cree un template par defaut ou importe un JSON dans l'onglet Templates.</p>
      ) : null}

      {!project ? (
        <p className="muted">Cree d'abord un projet et lance un import.</p>
      ) : !files.length ? (
        <p className="muted">
          Aucun fichier dans <code>{project.workDirs.processed}</code>. Lance d'abord un traitement (etape 3).
        </p>
      ) : (
        <>
          <div className="row" style={{ marginTop: 12 }}>
            <strong>Fichiers ({selectedFiles.size}/{files.length})</strong>
            <button className="btn-secondary" type="button" onClick={selectAllFiles}>
              Tout cocher
            </button>
            <button className="btn-secondary" type="button" onClick={clearSelection}>
              Tout decocher
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Fichier</th>
                <th>Chemin</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.absolutePath}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.absolutePath)}
                      onChange={() => toggleFile(file.absolutePath)}
                      aria-label={`Inclure ${file.fileName} dans l'export`}
                    />
                  </td>
                  <td>{file.fileName}</td>
                  <td className="path-cell" title={file.absolutePath}>
                    {file.absolutePath}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {selectedTemplate ? (
        <ExportPresetTable
          template={selectedTemplate}
          selectedPresets={selectedPresets}
          onToggle={togglePreset}
        />
      ) : null}
    </section>
  );
}

function ExportPresetTable({
  template,
  selectedPresets,
  onToggle
}: {
  template: ExportTemplate;
  selectedPresets: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <h3>Presets du template "{template.name}" ({selectedPresets.size}/{template.presets.length})</h3>
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Format</th>
            <th>Bitrate</th>
            <th>SR</th>
            <th>Canaux</th>
            <th>VBR</th>
          </tr>
        </thead>
        <tbody>
          {template.presets.map((preset) => (
            <tr key={preset.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedPresets.has(preset.id)}
                  onChange={() => onToggle(preset.id)}
                  aria-label={`Inclure le preset ${preset.format}`}
                />
              </td>
              <td>{preset.format}</td>
              <td>{preset.bitrateKbps ? `${preset.bitrateKbps} kbps` : "-"}</td>
              <td>{preset.sampleRateHz ?? "-"}</td>
              <td>{preset.channels ?? "-"}</td>
              <td>{preset.qualityVbr ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function extensionFor(format: ExportPreset["format"]) {
  if (format === "aacM4a") {
    return "m4a";
  }
  return format;
}

import { useState } from "react";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import type { ExportTemplate } from "@/shared/types/domain";

export function ExportSection() {
  const project = useAppStore((s) => s.project);
  const templates = useAppStore((s) => s.templates);
  const ffmpegPath = useAppStore((s) => s.ffmpegPath);
  const addLog = useAppStore((s) => s.addLog);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  const exportTemplates = templates?.export ?? [];
  const selectedTemplate = exportTemplates.find((t) => t.id === selectedTemplateId) ?? exportTemplates[0];

  async function runExport() {
    if (!project || !selectedTemplate) {
      return;
    }

    const firstPreset = selectedTemplate.presets[0];
    if (!firstPreset) {
      return;
    }

    const input = `${project.workDirs.processed}/mix.wav`;
    const extension = extensionFor(firstPreset.format);
    const output = `${selectedTemplate.outputDir ?? project.workDirs.exported}/mix_export.${extension}`;
    const response = await tauriClient.executeExportOperation(ffmpegPath, input, output, firstPreset);

    addLog({
      id: crypto.randomUUID(),
      stepId: "export",
      at: new Date().toISOString(),
      level: response.success ? "info" : "error",
      message: response.success ? `Export OK: ${output}` : "Export en erreur",
      response
    });
  }

  return (
    <section className="card">
      <h2>Export / Encodage</h2>
      <div className="row">
        <select
          className="input"
          value={selectedTemplate?.id ?? ""}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
        >
          {exportTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <button
          className="btn"
          disabled={!project || !selectedTemplate}
          onClick={() => void runExport()}
          type="button"
        >
          Lancer l’export
        </button>
      </div>

      {selectedTemplate ? <ExportTemplatePreview template={selectedTemplate} /> : <p className="muted">Aucun template export.</p>}
    </section>
  );
}

function ExportTemplatePreview({ template }: { template: ExportTemplate }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Preset</th>
          <th>Format</th>
          <th>Bitrate</th>
          <th>SR</th>
          <th>Canaux</th>
        </tr>
      </thead>
      <tbody>
        {template.presets.map((preset) => (
          <tr key={preset.id}>
            <td>{preset.id.slice(0, 8)}</td>
            <td>{preset.format}</td>
            <td>{preset.bitrateKbps ? `${preset.bitrateKbps} kbps` : "-"}</td>
            <td>{preset.sampleRateHz ?? "-"}</td>
            <td>{preset.channels ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function extensionFor(format: "wav" | "mp3" | "aacM4a") {
  if (format === "aacM4a") {
    return "m4a";
  }
  return format;
}

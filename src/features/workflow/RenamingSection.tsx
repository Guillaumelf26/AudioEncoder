import { useMemo, useState } from "react";
import { useAppStore } from "@/shared/store/appStore";
import type { RenameTemplate } from "@/shared/types/domain";

export function RenamingSection() {
  const project = useAppStore((s) => s.project);
  const templates = useAppStore((s) => s.templates);
  const addLog = useAppStore((s) => s.addLog);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  const renameTemplates = templates?.renaming ?? [];
  const selectedTemplate = renameTemplates.find((t) => t.id === selectedTemplateId) ?? renameTemplates[0];
  const preview = useRenamePreview(project?.tracks ?? [], selectedTemplate);

  function onRunRenaming() {
    if (!selectedTemplate || !project) {
      return;
    }
    addLog({
      id: crypto.randomUUID(),
      stepId: "renaming",
      at: new Date().toISOString(),
      level: "info",
      message: `Renommage simulé avec template "${selectedTemplate.name}" (${preview.length} piste(s))`
    });
  }

  return (
    <section className="card">
      <h2>Renommage bulk</h2>
      <div className="row">
        <select
          className="input"
          value={selectedTemplate?.id ?? ""}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
        >
          {renameTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <button className="btn" disabled={!selectedTemplate || !project} onClick={onRunRenaming} type="button">
          Exécuter le renommage
        </button>
      </div>

      {!preview.length ? (
        <p className="muted">Aucune piste disponible pour le renommage.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Avant</th>
              <th>Après</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((item) => (
              <tr key={item.before}>
                <td>{item.before}</td>
                <td>{item.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function useRenamePreview(
  tracks: { id: string; displayName: string; channelIndex?: number }[],
  template?: RenameTemplate
) {
  return useMemo(() => {
    if (!template || tracks.length === 0) {
      return [];
    }

    const map = new Map(template.map.map((rule) => [rule.sourceLabel, rule.targetLabel]));
    return tracks
      .filter((track) => !template.ignoredTrackIds.includes(track.id))
      .map((track, index) => {
        const base = map.get(track.displayName) ?? track.displayName;
        const trackNum = (track.channelIndex ?? index + 1).toString().padStart(2, "0");
        const parts = [
          template.naming.prefix,
          template.naming.includeTrackIndex ? trackNum : undefined,
          base,
          template.naming.suffix
        ].filter(Boolean);
        return { before: track.displayName, after: parts.join("_") };
      });
  }, [template, tracks]);
}

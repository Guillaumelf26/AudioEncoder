import { useMemo, useState } from "react";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import { runAsync } from "@/shared/actions/runAsync";
import type { RenameTemplate } from "@/shared/types/domain";

export function RenamingSection() {
  const project = useAppStore((s) => s.project);
  const templates = useAppStore((s) => s.templates);
  const setTemplates = useAppStore((s) => s.setTemplates);
  const setProject = useAppStore((s) => s.setProject);
  const setStepStatus = useAppStore((s) => s.setStepStatus);
  const pushToast = useAppStore((s) => s.pushToast);
  const addLog = useAppStore((s) => s.addLog);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [newPresetName, setNewPresetName] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const renameTemplates = templates?.renaming ?? [];
  const selectedTemplate = renameTemplates.find((t) => t.id === selectedTemplateId) ?? renameTemplates[0];
  const preview = useRenamePreview(project?.tracks ?? [], selectedTemplate);

  function setRenamingTemplates(nextRenaming: RenameTemplate[]) {
    if (!templates) {
      return;
    }
    setTemplates({ ...templates, renaming: nextRenaming });
  }

  function createPresetFromCurrentTracks(name: string): RenameTemplate | undefined {
    if (!project?.tracks.length) {
      return undefined;
    }
    return {
      id: crypto.randomUUID(),
      name,
      description: "Preset cree depuis les pistes de la session",
      map: project.tracks.map((track) => ({
        sourceLabel: track.displayName,
        targetLabel: track.displayName
      })),
      ignoredTrackIds: [],
      naming: {
        includeDate: false,
        includeProjectName: false,
        includeSourceName: false,
        includeTrackIndex: true,
        prefix: "",
        suffix: ""
      },
      conflictStrategy: "suffixIncrement"
    };
  }

  function onCreatePresetFromTracks() {
    const preset = createPresetFromCurrentTracks(`Preset session ${renameTemplates.length + 1}`);
    if (!preset) {
      pushToast({
        level: "warn",
        title: "Aucune piste",
        message: "Importe d'abord des fichiers WAV."
      });
      return;
    }
    const nextRenaming = [...renameTemplates, preset];
    setRenamingTemplates(nextRenaming);
    setSelectedTemplateId(preset.id);
    pushToast({
      level: "success",
      title: "Preset cree depuis les pistes",
      message: preset.name
    });
  }

  function updateSelectedTemplate(nextTemplate: RenameTemplate) {
    if (!selectedTemplate) {
      return;
    }
    setRenamingTemplates(renameTemplates.map((template) => (template.id === selectedTemplate.id ? nextTemplate : template)));
  }

  function onUpdateRule(sourceLabel: string, targetLabel: string) {
    if (!selectedTemplate) {
      return;
    }
    const mapIndex = selectedTemplate.map.findIndex((rule) => rule.sourceLabel === sourceLabel);
    const nextMap = [...selectedTemplate.map];
    if (mapIndex >= 0) {
      const existingRule = nextMap[mapIndex];
      if (existingRule) {
        nextMap[mapIndex] = { ...existingRule, targetLabel };
      }
    } else {
      nextMap.push({ sourceLabel, targetLabel });
    }
    updateSelectedTemplate({ ...selectedTemplate, map: nextMap });
  }

  function onSaveAsPreset() {
    if (!selectedTemplate) {
      return;
    }
    const presetName = newPresetName.trim();
    if (!presetName) {
      return;
    }
    const cloned = { ...selectedTemplate, id: crypto.randomUUID(), name: presetName };
    setRenamingTemplates([...renameTemplates, cloned]);
    setSelectedTemplateId(cloned.id);
    setNewPresetName("");
    pushToast({
      level: "success",
      title: "Preset enregistre",
      message: presetName
    });
  }

  async function onRunRenaming() {
    if (!selectedTemplate || !project || isRunning) {
      return;
    }
    setIsRunning(true);
    setStepStatus("renaming", "running", { startedAt: new Date().toISOString() });

    const result = await runAsync(
      async () => {
        const updated = await tauriClient.applyTrackRenaming(
          project,
          preview.map((item) => ({ trackId: item.trackId, targetName: item.after }))
        );
        setProject(updated);
        await tauriClient.saveProject(updated);
        addLog({
          id: crypto.randomUUID(),
          stepId: "renaming",
          at: new Date().toISOString(),
          level: "info",
          message: `Renommage applique avec preset "${selectedTemplate.name}" (${preview.length} piste(s))`
        });
        return updated;
      },
      {
        stepId: "renaming",
        errorTitle: "Renommage echoue"
      }
    );

    if (result) {
      setStepStatus("renaming", "success", { endedAt: new Date().toISOString() });
      pushToast({
        level: "success",
        title: "Renommage applique",
        message: `${preview.length} piste(s) deplacee(s) dans 03_renamed.`,
        action: { label: "Ouvrir 03_renamed", path: result.workDirs.renamed }
      });
    } else {
      setStepStatus("renaming", "error", {
        endedAt: new Date().toISOString(),
        error: "Echec renommage"
      });
    }
    setIsRunning(false);
  }

  return (
    <section className="card">
      <h2>Renommage bulk</h2>
      <p className="muted">
        Importe tes fichiers, ajuste les noms, puis enregistre ton preset sans sortir de l'application.
      </p>
      <div className="row">
        <select
          className="input"
          disabled={!renameTemplates.length}
          value={selectedTemplate?.id ?? ""}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
        >
          {renameTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <button className="btn-secondary" onClick={onCreatePresetFromTracks} type="button" disabled={!project?.tracks.length}>
          Creer un preset depuis mes pistes
        </button>
        <button
          className="btn"
          disabled={!selectedTemplate || !project || isRunning}
          onClick={() => void onRunRenaming()}
          type="button"
        >
          {isRunning ? "Renommage en cours..." : "Appliquer le renommage"}
        </button>
        {project ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              tauriClient.revealInExplorer(project.workDirs.renamed).catch(() => undefined);
            }}
          >
            Ouvrir 03_renamed
          </button>
        ) : null}
      </div>

      {selectedTemplate && (
        <div className="row" style={{ marginTop: 10 }}>
          <input
            className="input"
            value={selectedTemplate.naming.prefix ?? ""}
            placeholder="Prefixe (optionnel)"
            onChange={(e) =>
              updateSelectedTemplate({ ...selectedTemplate, naming: { ...selectedTemplate.naming, prefix: e.target.value } })
            }
          />
          <input
            className="input"
            value={selectedTemplate.naming.suffix ?? ""}
            placeholder="Suffixe (optionnel)"
            onChange={(e) =>
              updateSelectedTemplate({ ...selectedTemplate, naming: { ...selectedTemplate.naming, suffix: e.target.value } })
            }
          />
          <label className="muted">
            <input
              type="checkbox"
              checked={selectedTemplate.naming.includeTrackIndex}
              onChange={(e) =>
                updateSelectedTemplate({
                  ...selectedTemplate,
                  naming: { ...selectedTemplate.naming, includeTrackIndex: e.target.checked }
                })
              }
            />{" "}
            Inclure index piste
          </label>
        </div>
      )}

      {selectedTemplate && (
        <div className="row" style={{ marginTop: 10 }}>
          <input
            className="input"
            value={newPresetName}
            placeholder="Nom du nouveau preset"
            onChange={(e) => setNewPresetName(e.target.value)}
          />
          <button className="btn-secondary" disabled={!newPresetName.trim()} onClick={onSaveAsPreset} type="button">
            Enregistrer comme nouveau preset
          </button>
        </div>
      )}

      {!preview.length ? (
        <p className="muted">Aucune piste disponible pour le renommage. Commence par importer des WAV.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Avant</th>
              <th>Nouveau nom (editable)</th>
              <th>Apres</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((item) => (
              <tr key={item.trackId}>
                <td>{item.before}</td>
                <td>
                  <input
                    className="input"
                    value={item.targetLabel}
                    onChange={(e) => onUpdateRule(item.before, e.target.value)}
                  />
                </td>
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
        const targetLabel = map.get(track.displayName) ?? track.displayName;
        const trackNum = (track.channelIndex ?? index + 1).toString().padStart(2, "0");
        const parts = [
          template.naming.prefix,
          template.naming.includeTrackIndex ? trackNum : undefined,
          targetLabel,
          template.naming.suffix
        ].filter(Boolean);
        return { trackId: track.id, before: track.displayName, targetLabel, after: parts.join("_") };
      });
  }, [template, tracks]);
}

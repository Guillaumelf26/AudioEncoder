import { open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { tauriClient, isTauriAvailable } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import { runAsync } from "@/shared/actions/runAsync";
import { buildDefaultTemplatesBundle } from "@/features/templates/defaultTemplates";

export function TemplatesSection() {
  const templates = useAppStore((s) => s.templates);
  const setTemplates = useAppStore((s) => s.setTemplates);
  const pushToast = useAppStore((s) => s.pushToast);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function onResetToDefaults() {
    const bundle = buildDefaultTemplatesBundle();
    setTemplates(bundle);
    pushToast({
      level: "success",
      title: "Templates par defaut reinitialises",
      message: `${bundle.renaming.length} renommage(s), ${bundle.processing.length} traitement(s), ${bundle.export.length} export(s).`
    });
  }

  async function onLoadTemplates() {
    if (isLoading) return;
    setIsLoading(true);
    await runAsync(
      async () => {
        const path = await open({
          multiple: false,
          directory: false,
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
        if (!path || typeof path !== "string") {
          throw new Error("Aucun fichier selectionne");
        }
        const bundle = await tauriClient.loadTemplates(path);
        setTemplates(bundle);
        return path;
      },
      {
        stepId: "importAnalysis",
        successTitle: "Templates importes",
        errorTitle: "Import templates echoue"
      }
    );
    setIsLoading(false);
  }

  async function onSaveTemplates() {
    if (!templates || isSaving) return;
    setIsSaving(true);
    await runAsync(
      async () => {
        const path = await save({
          defaultPath: "audio-workflow-templates.json",
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
        if (!path) {
          throw new Error("Sauvegarde annulee");
        }
        await tauriClient.saveTemplates(path, templates);
        return path;
      },
      {
        stepId: "importAnalysis",
        successTitle: "Templates exportes",
        errorTitle: "Export templates echoue"
      }
    );
    setIsSaving(false);
  }

  return (
    <section className="card">
      <h2>Templates</h2>
      <p className="muted">
        Ces presets pilotent renommage, traitements et export. Ils sont conserves dans le navigateur entre les sessions et peuvent etre exportes/importes en JSON.
      </p>
      <div className="row">
        <button className="btn-secondary" onClick={onResetToDefaults} type="button">
          Restaurer les templates par defaut
        </button>
        <button
          className="btn"
          onClick={() => void onLoadTemplates()}
          type="button"
          disabled={isLoading || !isTauriAvailable()}
        >
          {isLoading ? "Lecture..." : "Importer JSON"}
        </button>
        <button
          className="btn"
          disabled={!templates || isSaving || !isTauriAvailable()}
          onClick={() => void onSaveTemplates()}
          type="button"
        >
          {isSaving ? "Ecriture..." : "Exporter JSON"}
        </button>
      </div>

      {templates ? (
        <div className="kv-grid">
          <span>Workflow templates</span>
          <strong>{templates.workflows.length}</strong>
          <span>Renommage</span>
          <strong>{templates.renaming.length}</strong>
          <span>Traitements</span>
          <strong>{templates.processing.length}</strong>
          <span>Export</span>
          <strong>{templates.export.length}</strong>
        </div>
      ) : (
        <p className="muted">Aucun template charge.</p>
      )}
    </section>
  );
}

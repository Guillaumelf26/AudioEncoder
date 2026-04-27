import { open, save } from "@tauri-apps/plugin-dialog";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import { buildDefaultTemplatesBundle } from "@/features/templates/defaultTemplates";

export function TemplatesSection() {
  const templates = useAppStore((s) => s.templates);
  const setTemplates = useAppStore((s) => s.setTemplates);
  const addLog = useAppStore((s) => s.addLog);

  function onCreateDefault() {
    const bundle = buildDefaultTemplatesBundle();
    setTemplates(bundle);
    addLog({
      id: crypto.randomUUID(),
      stepId: "importAnalysis",
      at: new Date().toISOString(),
      level: "info",
      message: "Templates par défaut chargés en mémoire"
    });
  }

  async function onLoadTemplates() {
    const path = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (!path || typeof path !== "string") {
      return;
    }
    const bundle = await tauriClient.loadTemplates(path);
    setTemplates(bundle);
    addLog({
      id: crypto.randomUUID(),
      stepId: "importAnalysis",
      at: new Date().toISOString(),
      level: "info",
      message: `Templates importés: ${path}`
    });
  }

  async function onSaveTemplates() {
    if (!templates) {
      return;
    }
    const path = await save({
      defaultPath: "audio-workflow-templates.json",
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (!path) {
      return;
    }
    await tauriClient.saveTemplates(path, templates);
    addLog({
      id: crypto.randomUUID(),
      stepId: "importAnalysis",
      at: new Date().toISOString(),
      level: "info",
      message: `Templates exportés: ${path}`
    });
  }

  return (
    <section className="card">
      <h2>Templates</h2>
      <div className="row">
        <button className="btn" onClick={onCreateDefault} type="button">
          Générer templates MVP
        </button>
        <button className="btn" onClick={() => void onLoadTemplates()} type="button">
          Importer JSON
        </button>
        <button className="btn" disabled={!templates} onClick={() => void onSaveTemplates()} type="button">
          Exporter JSON
        </button>
      </div>

      {templates ? (
        <div className="kv-grid">
          <span>Workflow templates</span>
          <strong>{templates.workflows.length}</strong>
          <span>Rename templates</span>
          <strong>{templates.renaming.length}</strong>
          <span>Processing templates</span>
          <strong>{templates.processing.length}</strong>
          <span>Export templates</span>
          <strong>{templates.export.length}</strong>
        </div>
      ) : (
        <p className="muted">Aucun template chargé.</p>
      )}
    </section>
  );
}

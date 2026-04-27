import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";

export function ProjectDashboardSection() {
  const project = useAppStore((s) => s.project);
  const setProject = useAppStore((s) => s.setProject);
  const addLog = useAppStore((s) => s.addLog);
  const [projectName, setProjectName] = useState("");

  async function onCreateProject() {
    const directory = await open({ directory: true, multiple: false });
    if (!directory || typeof directory !== "string") {
      return;
    }
    const newProject = await tauriClient.createProject(projectName || "New Project", directory);
    setProject(newProject);
    addLog({
      id: crypto.randomUUID(),
      stepId: "importAnalysis",
      at: new Date().toISOString(),
      level: "info",
      message: `Projet créé: ${newProject.name}`
    });
  }

  return (
    <section className="card">
      <h2>Dashboard projet</h2>
      <div className="row">
        <input
          className="input"
          placeholder="Nom du projet"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <button className="btn" onClick={() => void onCreateProject()} type="button">
          Créer un projet
        </button>
      </div>
      {project ? (
        <div className="kv-grid">
          <span>Nom</span>
          <strong>{project.name}</strong>
          <span>Racine</span>
          <strong>{project.rootDir}</strong>
          <span>Sources</span>
          <strong>{project.sourceFiles.length}</strong>
          <span>Pistes</span>
          <strong>{project.tracks.length}</strong>
        </div>
      ) : (
        <p className="muted">Aucun projet ouvert.</p>
      )}
    </section>
  );
}

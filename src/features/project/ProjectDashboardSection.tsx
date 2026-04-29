import { open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { tauriClient, isTauriAvailable } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import { runAsync } from "@/shared/actions/runAsync";

export function ProjectDashboardSection() {
  const project = useAppStore((s) => s.project);
  const setProject = useAppStore((s) => s.setProject);
  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  async function onCreateProject() {
    if (isCreating) return;
    setIsCreating(true);
    await runAsync(
      async () => {
        const directory = await open({ directory: true, multiple: false });
        if (!directory || typeof directory !== "string") {
          throw new Error("Aucun dossier selectionne");
        }
        const name = projectName.trim() || "Nouveau projet";
        const newProject = await tauriClient.createProject(name, directory);
        setProject(newProject);
        return newProject;
      },
      {
        stepId: "importAnalysis",
        successTitle: "Projet cree",
        errorTitle: "Creation de projet echouee"
      }
    );
    setIsCreating(false);
  }

  async function onOpenProject() {
    if (isOpening) return;
    setIsOpening(true);
    await runAsync(
      async () => {
        const path = await open({
          directory: false,
          multiple: false,
          filters: [{ name: "Projet", extensions: ["json"] }]
        });
        if (!path || typeof path !== "string") {
          throw new Error("Aucun fichier projet.json selectionne");
        }
        const loaded = await tauriClient.loadProject(path);
        setProject(loaded);
        return loaded;
      },
      {
        stepId: "importAnalysis",
        successTitle: "Projet charge",
        errorTitle: "Ouverture de projet echouee"
      }
    );
    setIsOpening(false);
  }

  async function onSaveProjectAs() {
    if (!project) return;
    await runAsync(
      async () => {
        const directory = await save({
          defaultPath: `${project.name}.json`,
          filters: [{ name: "Projet", extensions: ["json"] }]
        });
        if (!directory) {
          throw new Error("Sauvegarde annulee");
        }
        await tauriClient.saveProject(project);
        return directory;
      },
      {
        stepId: "importAnalysis",
        successTitle: "Projet enregistre",
        successMessage: project.rootDir,
        errorTitle: "Enregistrement echoue"
      }
    );
  }

  return (
    <section className="card">
      <h2>Projet</h2>
      <div className="row">
        <input
          className="input"
          placeholder="Nom du nouveau projet"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <button
          className="btn"
          onClick={() => void onCreateProject()}
          type="button"
          disabled={isCreating || !isTauriAvailable()}
        >
          {isCreating ? "Creation..." : "Nouveau projet (choisir dossier)"}
        </button>
        <button
          className="btn-secondary"
          onClick={() => void onOpenProject()}
          type="button"
          disabled={isOpening || !isTauriAvailable()}
        >
          {isOpening ? "Ouverture..." : "Ouvrir un projet"}
        </button>
        <button
          className="btn-secondary"
          onClick={() => void onSaveProjectAs()}
          type="button"
          disabled={!project}
        >
          Enregistrer le projet sous...
        </button>
        {project ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              tauriClient.revealInExplorer(project.rootDir).catch(() => undefined);
            }}
          >
            Ouvrir le dossier projet
          </button>
        ) : null}
      </div>
      {project ? (
        <div className="kv-grid">
          <span>Nom</span>
          <strong>{project.name}</strong>
          <span>Dossier projet</span>
          <strong className="path-cell" title={project.rootDir}>
            {project.rootDir}
          </strong>
          <span>Sources analysees</span>
          <strong>{project.sourceFiles.length}</strong>
          <span>Pistes</span>
          <strong>{project.tracks.length}</strong>
        </div>
      ) : (
        <p className="muted">Aucun projet ouvert. Cree un projet ou utilise simplement le bouton Importer ci-dessous (session rapide).</p>
      )}
    </section>
  );
}

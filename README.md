# Audio Workflow Desktop (MVP)

Application desktop Windows pour automatiser un workflow audio multipiste avec FFmpeg/FFprobe.

## Stack

- `Tauri 2` + backend `Rust`
- `React` + `TypeScript` strict
- Persistance locale en `JSON`

## Cible MVP

- Plateforme: Windows (la session crée automatiquement un dossier dans `%LOCALAPPDATA%\AudioWorkflow\sessions`)
- Sources: WAV déjà séparés (24 bits / 48 kHz majoritaire)
- Étapes MVP: Import/Analyse, Renommage, Traitements (gain/pan/reverb/merges), Export WAV/MP3/AAC
- Hors MVP mais extensible: split multicanal, normalisation, compression avancée

## Structure

- Frontend: `src/`
- Backend Tauri: `src-tauri/src/`
- Templates par défaut: `src/features/templates/defaultTemplates.ts`

### Dossiers projet générés

- `01_sources` (réservé, utilisé pour copier les sources si besoin)
- `03_renamed` (sortie du renommage)
- `04_processed` (sortie des traitements ; entrée de l'export)
- `05_exports` (sortie de l'encodage)
- `logs` (`app.log`, JSONL)

## Moteur FFmpeg/FFprobe

- Analyse: `ffprobe -v error -print_format json -show_format -show_streams`
- ProcessTrack (gain + pan + reverb combinés en un seul passage):
  `-af "volume=+2dB,pan=stereo|c0=...,aecho=0.8:0.9:80:0.3"`
- Merge stereo: `pan=stereo|c0=...|c1=...` puis `amix=inputs=N:normalize=0`
- Merge bus mono: `amix=inputs=N:normalize=0`
- Export MP3/AAC/WAV: `libmp3lame`, `aac`, `pcm_s24le`

## UX

- Toast global haut-droit pour chaque action (succès / erreur / info).
- Sidebar : statut par étape (À faire / En cours / OK / Erreur), badge erreurs sur l'onglet Logs.
- Boutons "Ouvrir le dossier" pour `01_sources`, `03_renamed`, `04_processed`, `05_exports` et le dossier projet.
- Logs persistés dans `<projet>/logs/app.log` (JSONL).

## Workflow utilisateur

1. **Onglet Importer**
   - Crée un projet (Nouveau projet / Ouvrir un projet) ou laisse l'app créer une session rapide automatique.
   - Vérifie ffmpeg / ffprobe (auto-install via winget si absent sur Windows).
   - Importe les WAV : analyse ffprobe et tableau de métadonnées.
2. **Onglet Renommer**
   - Choisis un preset ou crée-en un depuis tes pistes courantes, ajuste prefix/suffix/index, applique.
3. **Onglet Traiter**
   - Sélectionne des pistes (clic, Ctrl+clic, Shift+clic), règle gain/pan/reverb (commun ou individuel), crée des merges stéréo/mono, lance la chaîne (un fichier `<piste>_processed.wav` par piste avec effets, plus les merges).
4. **Onglet Exporter**
   - Coche les fichiers de `04_processed` à exporter et les presets du template (WAV / MP3 / AAC). Chaque combinaison fichier × preset donne un fichier dans `05_exports`.
5. **Onglet Templates**
   - Restaurer les templates par défaut, importer/exporter un JSON.
6. **Onglet Logs**
   - Toutes les commandes FFmpeg avec stdout/stderr.

## Commandes

```bash
npm install
npm run dev            # frontend web seul (sans backend Tauri)
npm run tauri:dev      # app desktop complète (Windows: PowerShell + VsDevShell)
npm run tauri:env-check
npm run build          # tsc --noEmit + vite build
npm run lint
```

## Préparation à la diffusion store

- CSP stricte définie dans `src-tauri/tauri.conf.json`.
- Métadonnées `publisher`, `copyright`, `category`, `shortDescription`, `longDescription` à personnaliser avant publication.
- `bundle.targets` est `nsis` ; pour Microsoft Store, ajouter `msix` ou utiliser un wrapper MSIX et signer avec un certificat de code (`certificateThumbprint` à renseigner).
- Icônes : `src-tauri/icons/icon.ico`. Pour le Store, fournir aussi les variantes `Square150x150Logo`, `StoreLogo`, etc.
- Politique de confidentialité requise (l'app installe FFmpeg via winget : à mentionner dans la description du store).

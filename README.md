# Audio Workflow Desktop (MVP)

Application desktop Windows pour automatiser un workflow audio multipiste avec FFmpeg/FFprobe.

## Stack

- `Tauri 2` + backend `Rust`
- `React` + `TypeScript` strict
- Persistance locale en `JSON`

## Cible MVP

- Plateforme: Windows
- Sources: WAV déjà séparés (24 bits / 48 kHz majoritaire)
- Étapes MVP: Import/Analyse, Renommage, Traitements (merge/pan/gain), Export WAV/MP3/AAC
- Hors MVP mais extensible: split multicanal, normalisation, compression avancée

## Structure

- Frontend: `src`
- Backend Tauri: `src-tauri/src`
- Templates défaut: `resources/templates`

### Dossiers projet générés

- `01_sources`
- `03_renamed`
- `04_processed`
- `05_exports`
- `logs`

## Moteur FFmpeg/FFprobe

- Analyse: `ffprobe -v error -print_format json -show_format -show_streams`
- Merge stereo: `join=inputs=2:channel_layout=stereo`
- Pan: `pan=stereo|...`
- Gain: `volume=+XdB`
- Export MP3/AAC: `libmp3lame`, `aac`

## Plan d’implémentation et critères d’acceptation

### Phase 0 - Initialisation

- [x] App Tauri + React + TS stricte
- [x] Architecture modulaire (UI/services/domain/engine/storage/validation)
- [x] Vérification chemin `ffmpeg`/`ffprobe`

### Phase 1 - Import/Analyse

- [x] Import fichiers WAV
- [x] Analyse via FFprobe
- [x] Affichage tableau métadonnées

### Phase 2 - Renommage

- [x] Templates de renommage
- [x] Preview avant/après
- [x] Gestion pistes ignorées

### Phase 3 - Traitements

- [x] Pipeline ordonné
- [x] Opérations MVP: merge, pan, gain
- [x] Point d’extension pour `futureCompression` et `futureNormalize`

### Phase 4 - Export

- [x] Presets WAV/MP3/AAC
- [x] Commandes FFmpeg de sortie

### Phase 5 - Templates

- [x] Bundle templates global
- [x] Import/Export JSON

### Phase 6 - Fiabilité

- [x] Logs structurés en UI
- [x] Exécution séquentielle
- [x] Annulation demandée après opération courante

## Commandes

```bash
npm install
npm run dev
npm run tauri:dev
```

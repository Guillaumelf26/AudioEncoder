import { buildDefaultProcessingTemplate } from "@/features/workflow/defaultProcessingTemplate";
import type { TemplatesBundle } from "@/shared/types/domain";

export function buildDefaultTemplatesBundle(): TemplatesBundle {
  const renameTemplateId = crypto.randomUUID();
  const processingTemplate = buildDefaultProcessingTemplate();
  const exportTemplateId = crypto.randomUUID();

  return {
    workflows: [
      {
        id: crypto.randomUUID(),
        name: "Concert 32 pistes - MVP",
        renameTemplateId,
        processingTemplateId: processingTemplate.id,
        exportTemplateId
      }
    ],
    renaming: [
      {
        id: renameTemplateId,
        name: "Live Default 32ch",
        description: "Preset de renommage live standard",
        map: [
          { sourceLabel: "CH01", targetLabel: "Kick" },
          { sourceLabel: "CH02", targetLabel: "Snare" },
          { sourceLabel: "CH03", targetLabel: "HiHat" },
          { sourceLabel: "CH04", targetLabel: "Bass" },
          { sourceLabel: "CH05", targetLabel: "Piano_L" },
          { sourceLabel: "CH06", targetLabel: "Piano_R" }
        ],
        ignoredTrackIds: [],
        naming: {
          includeDate: false,
          includeProjectName: true,
          includeSourceName: false,
          includeTrackIndex: true,
          prefix: "LIVE"
        },
        conflictStrategy: "suffixIncrement"
      }
    ],
    processing: [processingTemplate],
    export: [
      {
        id: exportTemplateId,
        name: "Web + Archive",
        presets: [
          {
            id: crypto.randomUUID(),
            format: "wav",
            sampleRateHz: 48000,
            channels: 2
          },
          {
            id: crypto.randomUUID(),
            format: "mp3",
            bitrateKbps: 320,
            channels: 2
          },
          {
            id: crypto.randomUUID(),
            format: "aacM4a",
            bitrateKbps: 256,
            channels: 2
          }
        ]
      }
    ]
  };
}

import { z } from "zod";

export const workflowStepIdSchema = z.enum(["importAnalysis", "renaming", "processing", "export"]);
export const stepStatusSchema = z.enum(["pending", "running", "success", "error", "skipped"]);

export const sourceFileSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string().min(1),
  absolutePath: z.string().min(1),
  fileSizeBytes: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative().optional(),
  sampleRateHz: z.number().positive().optional(),
  bitDepth: z.number().positive().optional(),
  channels: z.number().positive(),
  codec: z.string().optional(),
  channelNames: z.array(z.string())
});

export const audioTrackSchema = z.object({
  id: z.string().uuid(),
  sourceFileId: z.string().uuid(),
  channelIndex: z.number().nonnegative().optional(),
  displayName: z.string().min(1),
  currentPath: z.string().min(1),
  state: z.enum(["source", "renamed", "processed", "exported", "ignored"])
});

export const renameTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  map: z.array(
    z.object({
      sourceLabel: z.string().min(1),
      targetLabel: z.string().min(1)
    })
  ),
  ignoredTrackIds: z.array(z.string()),
  naming: z.object({
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    includeProjectName: z.boolean(),
    includeDate: z.boolean(),
    includeTrackIndex: z.boolean(),
    includeSourceName: z.boolean()
  }),
  conflictStrategy: z.enum(["error", "suffixIncrement", "replace"])
});

export const processingOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("processTrack"),
    inputTrackId: z.string(),
    outputFileName: z.string().min(1),
    gainDb: z.number().optional(),
    pan: z.number().min(-1).max(1).optional(),
    reverb: z
      .object({
        delayMs: z.number().positive(),
        decay: z.number().min(0).max(1)
      })
      .optional()
  }),
  z.object({
    type: z.literal("mixToStereoPanned"),
    inputs: z
      .array(
        z.object({
          inputTrackId: z.string(),
          pan: z.number().min(-1).max(1)
        })
      )
      .min(1),
    outputFileName: z.string().min(1)
  }),
  z.object({
    type: z.literal("mergeToStereo"),
    inputLeftTrackId: z.string(),
    inputRightTrackId: z.string(),
    outputFileName: z.string().min(1)
  }),
  z.object({
    type: z.literal("mergeToMonoBus"),
    inputTrackIds: z.array(z.string()).min(1),
    outputFileName: z.string().min(1)
  }),
  z.object({
    type: z.literal("pan"),
    inputTrackId: z.string(),
    position: z.number().min(-1).max(1),
    outputFileName: z.string().min(1)
  }),
  z.object({
    type: z.literal("gain"),
    inputTrackId: z.string(),
    gainDb: z.number(),
    outputFileName: z.string().min(1)
  }),
  z.object({
    type: z.literal("reverbSimple"),
    inputTrackId: z.string(),
    outputFileName: z.string().min(1),
    delayMs: z.number().positive(),
    decay: z.number().min(0).max(1)
  }),
  z.object({
    type: z.literal("futureCompression"),
    inputTrackId: z.string(),
    outputFileName: z.string().min(1),
    thresholdDb: z.number(),
    ratio: z.number().positive()
  }),
  z.object({
    type: z.literal("futureNormalize"),
    inputTrackId: z.string(),
    outputFileName: z.string().min(1),
    mode: z.string().min(1)
  })
]);

export const processingTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  operations: z.array(processingOperationSchema),
  keepOriginalTracks: z.boolean(),
  keepGeneratedTracks: z.boolean()
});

export const exportTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  outputDir: z.string().optional(),
  presets: z.array(
    z.object({
      id: z.string().uuid(),
      format: z.enum(["wav", "mp3", "aacM4a"]),
      bitrateKbps: z.number().positive().optional(),
      sampleRateHz: z.number().positive().optional(),
      channels: z.number().positive().optional(),
      qualityVbr: z.number().int().min(0).max(9).optional()
    })
  )
});

export const templatesBundleSchema = z.object({
  workflows: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      renameTemplateId: z.string().uuid().optional(),
      processingTemplateId: z.string().uuid().optional(),
      exportTemplateId: z.string().uuid().optional()
    })
  ),
  renaming: z.array(renameTemplateSchema),
  processing: z.array(processingTemplateSchema),
  export: z.array(exportTemplateSchema)
});

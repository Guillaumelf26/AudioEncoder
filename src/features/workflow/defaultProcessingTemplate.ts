import type { ProcessingTemplate } from "@/shared/types/domain";

export function buildDefaultProcessingTemplate(): ProcessingTemplate {
  return {
    id: crypto.randomUUID(),
    name: "MVP - Merge/Pan/Gain",
    keepOriginalTracks: true,
    keepGeneratedTracks: true,
    operations: [
      {
        type: "mergeToStereo",
        inputLeftTrackId: "Piano_L",
        inputRightTrackId: "Piano_R",
        outputFileName: "Piano_stereo.wav"
      },
      {
        type: "gain",
        inputTrackId: "Kick",
        gainDb: 2,
        outputFileName: "Kick_plus2.wav"
      },
      {
        type: "futureCompression",
        inputTrackId: "Drums_bus",
        thresholdDb: -18,
        ratio: 3,
        outputFileName: "Drums_compressed.wav"
      }
    ]
  };
}

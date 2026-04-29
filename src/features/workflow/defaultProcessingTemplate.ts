import type { ProcessingTemplate } from "@/shared/types/domain";

export function buildDefaultProcessingTemplate(): ProcessingTemplate {
  return {
    id: crypto.randomUUID(),
    name: "MVP - Mix stereo + Gain",
    keepOriginalTracks: true,
    keepGeneratedTracks: true,
    operations: [
      {
        type: "mixToStereoPanned",
        inputs: [
          { inputTrackId: "Piano_L", pan: -0.6 },
          { inputTrackId: "Piano_R", pan: 0.6 },
          { inputTrackId: "Kick", pan: 0 }
        ],
        outputFileName: "mix_stereo.wav"
      },
      {
        type: "processTrack",
        inputTrackId: "Kick",
        outputFileName: "Kick_processed.wav",
        gainDb: 2
      }
    ]
  };
}

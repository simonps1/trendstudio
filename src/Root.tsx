import React from "react";
import { Composition } from "remotion";
import { compositionId, FORMATS } from "./core/formats";
import { MANIFEST } from "./core/manifest";
import { COMPONENTS } from "./core/registry";

export const RemotionRoot: React.FC = () => (
  <>
    {MANIFEST.flatMap((v) =>
      v.formats.map((f) => {
        const fmt = FORMATS[f];
        return (
          <Composition
            key={compositionId(v.id, f)}
            id={compositionId(v.id, f)}
            component={COMPONENTS[v.id]}
            durationInFrames={Math.round(v.durationSec * fmt.fps)}
            fps={fmt.fps}
            width={fmt.width}
            height={fmt.height}
          />
        );
      }),
    )}
  </>
);

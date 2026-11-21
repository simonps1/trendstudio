import React from "react";
import { Composition, Still } from "remotion";
import { Avatar, Banner } from "./brand/Brand";
import { compositionId, FORMATS } from "./core/formats";
import { MANIFEST } from "./core/manifest";
import { COMPONENTS } from "./core/registry";

export const RemotionRoot: React.FC = () => (
  <>
    <Still id="brand-avatar" component={Avatar} width={1080} height={1080} />
    <Still id="brand-banner" component={Banner} width={2560} height={1440} />
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

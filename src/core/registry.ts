import type React from "react";
import { StarLife } from "../videos/star-life/StarLife";

/** Video id -> root component. Keep in sync with manifest.ts. */
export const COMPONENTS: Record<string, React.FC> = {
  "star-life": StarLife,
};

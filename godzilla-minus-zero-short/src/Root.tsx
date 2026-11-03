import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { FPS, W, H, SCENE_FRAMES, SCENES } from "./lib";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="GodzillaMinusZero"
    component={Main}
    durationInFrames={SCENE_FRAMES * SCENES.length}
    fps={FPS}
    width={W}
    height={H}
  />
);

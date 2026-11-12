import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { FPS, W, H, TOTAL_FRAMES } from "./lib";

export const RemotionRoot: React.FC = () => (
  <Composition id="VisionQuestFanEnding" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
);

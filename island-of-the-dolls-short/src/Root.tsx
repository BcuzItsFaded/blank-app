import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { FPS, W, H, TOTAL_FRAMES } from "./lib";

export const RemotionRoot: React.FC = () => (
  <>
    {/* storyboard-panel version (the hosts' painted panels, animated) */}
    <Composition id="IslandOfTheDolls" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ cel: false }} />
    {/* code-drawn cel-animation version (same engine as the Godzilla Short) */}
    <Composition id="IslandOfTheDollsCel" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ cel: true }} />
  </>
);

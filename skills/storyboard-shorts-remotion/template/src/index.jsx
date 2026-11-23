import React from "react";
import { Composition, registerRoot } from "remotion";
import { StoryboardShort } from "./Video";
import data from "./data.json";
const Root = () => (
  <Composition id="StoryboardShort" component={StoryboardShort} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} />
);
registerRoot(Root);

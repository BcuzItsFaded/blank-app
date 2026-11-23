import React from "react";
import { Composition, registerRoot } from "remotion";
import { YouShort } from "./Video";
import data from "./data.json";
const Root = () => (
  <Composition id="YouShort" component={YouShort} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} />
);
registerRoot(Root);

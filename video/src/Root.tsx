import React from "react";
import { Composition } from "remotion";
import { Demo, plan } from "./Demo";
import { FPS, frames } from "./layout";

export const Root: React.FC = () => (
  <Composition id="MakanNation" component={Demo} width={1920} height={1080} fps={FPS} durationInFrames={frames(plan().total)} />
);

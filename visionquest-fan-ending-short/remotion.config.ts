import { Config } from "@remotion/cli/config";

// Use the container's pre-installed headless Chromium. On your own machine,
// delete this line and Remotion will download its own browser.
const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
import fs from "fs";
if (fs.existsSync(shell)) Config.setBrowserExecutable(shell);

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer("swangle");

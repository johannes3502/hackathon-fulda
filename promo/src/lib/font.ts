import { continueRender, delayRender, staticFile } from "remotion";

let started = false;

export const ensureFont = (): void => {
  if (started) {
    return;
  }
  started = true;
  const handle = delayRender("Loading Open Sans variable font");
  const font = new FontFace(
    "Open Sans Variable",
    `url(${staticFile("fonts/OpenSans.woff2")}) format("woff2-variations")`,
    { weight: "300 800", style: "normal" },
  );
  font
    .load()
    .then((loaded) => {
      (document.fonts as unknown as Set<FontFace>).add(loaded);
      continueRender(handle);
    })
    .catch(() => {
      continueRender(handle);
    });
};

import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PITCH_QUESTION_TEXT } from "@/features/stage/pitch";
import { StageQuestion } from "./StageQuestion";

it("renders the prepared fallback question before any backend responds", () => {
  const html = renderToStaticMarkup(<StageQuestion />);

  expect(html).toContain("Jury-Frage · Datenschutz");
  expect(html).toContain("vorbereitet");
  expect(html).toContain(PITCH_QUESTION_TEXT);
  expect(html).toContain("Frage vorlesen");
  expect(html).toContain("Stopp");
  expect(html).toContain("Antwortfenster 90 s");
  expect(html).toContain("Kernpunkte zeigen");
  expect(html).toContain(
    "Genau eine Frage, keine Nachfrage, keine Bewertung.",
  );
  expect(html).not.toContain("Die Aufnahme bleibt im Browser.");
});

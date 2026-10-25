import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Explicit opt-in: real backend jobs and billed Gemini/ElevenLabs calls.
test.use({ trace: "off", video: "off" });
test("synthetic recording reaches Whisper, Gemini and an authenticated ElevenLabs audio conversation", async ({
  page,
  request,
}, info) => {
  test.skip(
    process.env.RUN_CLOUD_SMOKE !== "1",
    "Requires configured local services and explicit cloud opt-in",
  );
  test.setTimeout(240_000);
  const fixture = readFileSync(
    "../backend/tests/fixtures/speech-de.wav",
  ).toString("base64");
  const jobs: { path: string; jobId: string }[] = [];
  let sourceId: string | undefined;
  let audioChunks = 0;
  let outputFormat = "";
  let promptSent = false;
  let openingOverridden = false;
  let kickoffSent = false;
  let opening = "";
  let recognizedAnswer = false;
  let repliedToAnswer = false;
  let socketClosed = false;
  page.on("response", async (response) => {
    const path = new URL(response.url()).pathname;
    if (response.status() === 202 && response.request().method() === "POST") {
      const body = await response.json();
      if (body.job_id) jobs.push({ path, jobId: body.job_id });
      if (path === "/api/sources") sourceId = body.source.id;
    }
  });
  page.on("websocket", (socket) => {
    if (new URL(socket.url()).hostname !== "api.elevenlabs.io") return;
    socket.on("close", () => {
      socketClosed = true;
    });
    socket.on("framesent", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "conversation_initiation_client_data") {
        openingOverridden =
          message.conversation_config_override?.agent?.first_message ===
          "Ich habe noch ein paar Fragen. Bist du bereit?";
        const prompt =
          message.conversation_config_override?.agent?.prompt?.prompt;
        promptSent =
          typeof prompt === "string" &&
          prompt.includes("source_passages") &&
          prompt.includes("synthetic-cloud-notes.txt");
      }
      if (message.type === "user_message") kickoffSent = true;
    });
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "audio") audioChunks++;
      if (message.type === "agent_response" && !opening)
        opening = (message.agent_response_event?.agent_response ?? "").replace(
          /^\[rushed\]\s*/,
          "",
        );
      if (message.type === "agent_response" && recognizedAnswer)
        repliedToAnswer = true;
      if (message.type === "user_transcript")
        recognizedAnswer = Boolean(
          message.user_transcription_event?.user_transcript,
        );
      if (message.type === "conversation_initiation_metadata")
        outputFormat =
          message.conversation_initiation_metadata_event
            .agent_output_audio_format;
    });
  });
  // Replace physical devices only. All API, model and WebSocket traffic stays real.
  await page.addInitScript(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const state = window as unknown as {
      playSyntheticSpeech: () => Promise<void>;
    };
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const audio = new AudioContext();
      const buffer = await audio.decodeAudioData(bytes.buffer.slice(0));
      const destination = audio.createMediaStreamDestination();
      const silence = audio.createConstantSource();
      silence.offset.value = 0;
      silence.connect(destination);
      silence.start();
      await audio.resume();
      const stream = new MediaStream();
      if (constraints?.audio)
        stream.addTrack(destination.stream.getAudioTracks()[0]);
      state.playSyntheticSpeech = async () => {
        await audio.resume();
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.connect(destination);
        source.start();
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
        });
      };
      if (constraints?.video) {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const draw = () => {
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#192e46";
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = "white";
          ctx.font = "24px sans-serif";
          ctx.fillText("Synthetic cloud integration test", 100, 180);
        };
        draw();
        const timer = setInterval(draw, 100);
        const track = canvas.captureStream(10).getVideoTracks()[0];
        stream.addTrack(track);
        track.addEventListener("ended", () => clearInterval(timer));
      }
      return stream;
    };
  }, fixture);
  try {
    const ready = await request.get("/api/health/ready");
    expect(ready.ok()).toBe(true);
    await page.goto("/live");
    await page.getByText("Recording options", { exact: true }).click();
    await page.getByLabel("Create a transcript").check();
    await page.getByLabel("Stream transcription with Deepgram (EU)").uncheck();
    await page.getByText("Presentation & material", { exact: false }).click();
    await page.getByLabel("What are you preparing for?").selectOption("school");
    await page.getByLabel("Upload presentation material").setInputFiles({
      name: "synthetic-cloud-notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Synthetische Beispieldaten: In unserem Prototyp üben wir Präsentationen. Wir sprechen deutlich und erklären unsere Quellen. Quellen werden mit Dateiname und Seitenzahl genannt. Die Übung besteht aus einem Vortrag und drei Rückfragen.",
      ),
    });
    await expect(
      page.getByLabel("Presentation material", { exact: true }),
    ).toContainText("Ready", { timeout: 90_000 });
    await page
      .getByRole("button", { name: "Enable camera", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start recording", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Finish & review" }),
    ).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() =>
      (
        window as unknown as { playSyntheticSpeech: () => Promise<void> }
      ).playSyntheticSpeech(),
    );
    await page.getByRole("button", { name: "Finish & review" }).click();
    await expect(page).toHaveURL(/\/review$/, { timeout: 90_000 });
    await page
      .getByText("Transcript and source checks", { exact: true })
      .click();
    await expect(page.locator(".recorded-transcript")).toContainText(
      /Prototyp|Präsentationen/i,
      { timeout: 90_000 },
    );
    await page
      .getByRole("button", { name: "Check facts", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Check again", exact: true }),
    ).toBeEnabled({ timeout: 90_000 });
    // The short speech fixture may legitimately contain no checkable facts.
    await expect(page.locator(".fact-check-inputs")).toContainText("1 ready");
    await page
      .getByRole("group", { name: "Review steps" })
      .getByRole("button", { name: "Practice questions" })
      .click();
    await expect(
      page.getByRole("button", { name: "Practice by typing", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Start voice questions", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Skip to results", exact: true }),
    ).toBeVisible({ timeout: 45_000 });
    await expect
      .poll(() => audioChunks, { timeout: 30_000 })
      .toBeGreaterThan(0);
    expect(promptSent).toBe(true);
    expect(openingOverridden).toBe(true);
    expect(kickoffSent).toBe(false);
    await expect
      .poll(() => opening)
      .toBe("Ich habe noch ein paar Fragen. Bist du bereit?");
    expect(outputFormat).toBe("pcm_48000");
    await page.evaluate(() =>
      (
        window as unknown as { playSyntheticSpeech: () => Promise<void> }
      ).playSyntheticSpeech(),
    );
    await expect.poll(() => recognizedAnswer, { timeout: 30_000 }).toBe(true);
    await expect.poll(() => repliedToAnswer, { timeout: 30_000 }).toBe(true);
    await page.screenshot({
      path: info.outputPath("cloud-voice-conversation.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Skip to results", exact: true })
      .click();
    await expect.poll(() => socketClosed).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Your take at a glance" }),
    ).toBeVisible();
  } finally {
    await page
      .getByRole("button", { name: "Skip to results", exact: true })
      .click({ timeout: 1000 })
      .catch(() => {});
    if (sourceId)
      expect((await request.delete(`/api/sources/${sourceId}`)).ok()).toBe(
        true,
      );
    await info.attach("synthetic-job-ids", {
      body: JSON.stringify(jobs),
      contentType: "application/json",
    });
  }
});

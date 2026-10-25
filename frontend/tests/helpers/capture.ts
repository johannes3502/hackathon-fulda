import type { Page } from "@playwright/test";

export async function syntheticCamera(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as {
      stoppedTracks: number;
      mediaConstraints: MediaStreamConstraints | undefined;
    };
    state.stoppedTracks = 0;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      state.mediaConstraints = constraints;
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d")!;
      let frame = 0;
      const paint = () => {
        ctx.fillStyle = "#192e46";
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = "#9dc4fb";
        ctx.beginPath();
        ctx.arc(320 + Math.sin(frame / 15) * 70, 160, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "22px sans-serif";
        ctx.fillText(`Synthetic test video · frame ${frame++}`, 100, 290);
      };
      paint();
      const timer = setInterval(paint, 100);
      const stream = canvas.captureStream(10);
      let audio: AudioContext | undefined;
      if (constraints?.audio) {
        audio = new AudioContext();
        await audio.resume();
        const oscillator = audio.createOscillator();
        oscillator.frequency.value = 200;
        const gain = audio.createGain();
        gain.gain.value = 0.05;
        const destination = audio.createMediaStreamDestination();
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.start();
        const track = destination.stream.getAudioTracks()[0];
        track.addEventListener("ended", () => void audio?.close());
        stream.addTrack(track);
      }
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => {
          if (track.readyState === "live") state.stoppedTracks++;
          clearInterval(timer);
          stop();
          if (track.kind === "audio" && audio?.state !== "closed")
            void audio?.close();
        };
      }
      return stream;
    };
  });
}
// Controlled landmarks exercise the real evaluator, recording and UI, not model accuracy.
export async function syntheticPose(page: Page) {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("/pose/worker.js"))
          (window as unknown as { poseWorker: Worker }).poseWorker = this;
      }
    };
  });
  await page.route("**/pose/worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `let origin = null, kind = 'raised';
      onmessage = ({data}) => {
        if (data.type === 'init') postMessage({type:'ready'});
        if (data.type === 'test-start') { origin = data.timestamp; kind = data.kind ?? 'raised'; }
        if (data.type === 'test-kind') kind = data.kind;
        if (data.type === 'frame') {
          const points = Array.from({length:33}, () => ({x:.5,y:.2,z:0,visibility:.99,presence:.99}));
          const set = (i,x,y) => Object.assign(points[i],{x,y});
          set(11,.38,.38); set(12,.62,.38); set(13,.34,.55); set(14,.66,.55);
          set(15,.34,.72); set(16,.66,.72); set(23,.41,.82); set(24,.59,.82);
          if (origin !== null && data.timestamp - origin >= 4000) {
            if (kind === 'raised') { set(14,.73,.35); set(16,.72,.12); }
            if (kind === 'shift') for (const point of points) point.x += .12;
            if (kind === 'crossed') { set(15,.59,.49); set(16,.41,.49); }
          }
          for(let i=25;i<33;i++) points[i].visibility=.1;
          postMessage({type:'sample',timestamp:data.timestamp,width:data.frame.width,height:data.frame.height,points});
          data.frame.close();
        }
      };`,
    }),
  );
}

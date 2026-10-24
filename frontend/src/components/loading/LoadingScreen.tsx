"use client";

import { useEffect, useRef } from "react";
import "@fontsource/noto-serif-display/latin-400.css";
import "./loading-screen.css";

/** Indeterminate loading: mount while work is pending, unmount when complete. */
export function LoadingScreen({ label = "Einen Moment bitte" }: { label?: string }) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = stage.current;
    if (!host) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let dispose: (() => void) | undefined;

    async function setup() {
      if (!host || motion.matches) return;
      try {
        // Load WebGL only on the client; the HTML logo is visible immediately.
        const THREE = await import("three");
        if (cancelled || motion.matches) return;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0xffffff, 0);
        renderer.domElement.setAttribute("aria-hidden", "true");
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1.35, 1.35, 1.35, -1.35, 0.1, 10);
        camera.position.z = 4;
        const geometry = new THREE.CylinderGeometry(1, 1, 0.055, 96);
        const material = new THREE.MeshBasicMaterial({ color: "#42ff8c" });
        const disc = new THREE.Mesh(geometry, material);
        disc.rotation.x = Math.PI / 2;
        const pivot = new THREE.Group();
        pivot.add(disc);
        scene.add(pivot);
        host.appendChild(renderer.domElement);

        const resize = () => renderer.setSize(host.clientWidth, host.clientHeight);
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();
        let started: number | undefined;
        const render = (time: number) => {
          started ??= time;
          const elapsed = (time - started) / 1000;
          pivot.rotation.y = elapsed * Math.PI / 3.6;
          pivot.rotation.z = Math.sin(elapsed * 0.8) * 0.06;
          renderer.render(scene, camera);
          host.dataset.ready = "true";
        };
        const play = () => {
          renderer.setAnimationLoop(null);
          if (motion.matches) {
            pivot.rotation.set(0, 0, 0);
            renderer.render(scene, camera);
          } else if (!document.hidden) {
            started = undefined;
            renderer.setAnimationLoop(render);
          }
        };
        const contextLost = (event: Event) => {
          event.preventDefault();
          renderer.setAnimationLoop(null);
          delete host.dataset.ready;
        };
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        document.addEventListener("visibilitychange", play);
        motion.addEventListener("change", play);
        dispose = () => {
          renderer.setAnimationLoop(null);
          observer.disconnect();
          document.removeEventListener("visibilitychange", play);
          motion.removeEventListener("change", play);
          renderer.domElement.removeEventListener("webglcontextlost", contextLost);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          delete host.dataset.ready;
        };
        play();
      } catch {
        // Unsupported WebGL or a failed chunk keeps the static HTML mark usable.
      }
    }
    void setup();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <section className="loading418-screen" aria-label="Wird geladen" lang="de">
      <div className="loading418-center">
        <div className="loading418-mark" aria-hidden="true">
          <div className="loading418-stage" ref={stage}>
            <div className="loading418-disc" />
          </div>
          <span className="loading418-monogram">418</span>
        </div>
        <p className="loading418-status" role="status">
          <span className="loading418-dot" aria-hidden="true" />
          {label}
        </p>
      </div>
    </section>
  );
}


"use client";

import { useEffect, useRef } from "react";

/** SVG remains available until Three.js renders, and if WebGL is unavailable. */
export function StatsRing({ value }: { value: number }) {
  const host = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    valueRef.current = value;
    drawRef.current?.();
  }, [value]);

  useEffect(() => {
    const element = host.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void import("three")
      .then((THREE) => {
        if (cancelled) return;
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(
          -1.15,
          1.15,
          1.15,
          -1.15,
          0.1,
          10,
        );
        camera.position.z = 3;
        const geometry = new THREE.RingGeometry(0.84, 1, 360);
        const trackMaterial = new THREE.MeshBasicMaterial({ color: "#edf1ee" });
        const progressMaterial = new THREE.MeshBasicMaterial({
          color: "#3803bf",
        });
        const progressGeometry = geometry.clone();
        scene.add(new THREE.Mesh(geometry, trackMaterial));
        const arc = new THREE.Mesh(progressGeometry, progressMaterial);
        // RingGeometry starts at three o'clock; mirror to fill clockwise from twelve.
        arc.rotation.y = Math.PI;
        arc.rotation.z = Math.PI / 2;
        progressMaterial.side = THREE.DoubleSide;
        arc.position.z = 0.01;
        scene.add(arc);
        element.appendChild(renderer.domElement);
        const draw = () => {
          progressGeometry.setDrawRange(
            0,
            Math.round((valueRef.current / 100) * 360) * 6,
          );
          renderer.render(scene, camera);
          element.dataset.ready = "true";
        };
        const resize = () => {
          renderer.setSize(element.clientWidth, element.clientHeight);
          draw();
        };
        const observer = new ResizeObserver(resize);
        const lost = (event: Event) => {
          event.preventDefault();
          drawRef.current = null;
          delete element.dataset.ready;
        };
        cleanup = () => {
          drawRef.current = null;
          observer.disconnect();
          renderer.domElement.removeEventListener("webglcontextlost", lost);
          geometry.dispose();
          progressGeometry.dispose();
          trackMaterial.dispose();
          progressMaterial.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          delete element.dataset.ready;
        };
        renderer.domElement.addEventListener("webglcontextlost", lost);
        drawRef.current = draw;
        observer.observe(element);
        resize();
      })
      .catch(() => {
        cleanup?.();
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className="stats418-ring" ref={host} aria-hidden="true">
      <svg viewBox="0 0 230 230">
        <circle
          cx="115"
          cy="115"
          r="92"
          fill="none"
          stroke="#edf1ee"
          strokeWidth="16"
        />
        <circle
          cx="115"
          cy="115"
          r="92"
          fill="none"
          stroke="#3803bf"
          strokeWidth="16"
          pathLength="100"
          strokeDasharray={`${value} 100`}
          transform="rotate(-90 115 115)"
        />
      </svg>
    </div>
  );
}

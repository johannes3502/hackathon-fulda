"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { loadLandingMotion, type LandingGsap } from "@/features/landing/motion";
import { FeatureStage } from "./FeatureStage";
import { TOUR_CHAPTERS } from "./tour-data";
import "./feature-tour.css";

const NAVIGATION_KEYS = [
  "ArrowDown",
  "ArrowRight",
  "ArrowUp",
  "ArrowLeft",
  "Home",
  "End",
];

export function FeatureTour() {
  const [active, setActive] = useState(TOUR_CHAPTERS[0].key);
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const gsapRef = useRef<LandingGsap | null>(null);
  const revealCleanup = useRef<(() => void) | null>(null);
  const firstStageRender = useRef(true);

  const activeIndex = Math.max(
    0,
    TOUR_CHAPTERS.findIndex((chapter) => chapter.key === active),
  );
  const chapter = TOUR_CHAPTERS[activeIndex];

  useEffect(() => {
    function selectFromHash() {
      const hash = window.location.hash.replace(/^#/, "");
      const match = TOUR_CHAPTERS.find((item) => item.anchor === hash);
      if (!match) return;
      setActive(match.key);
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ block: "start" });
      });
    }
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const gsap = await loadLandingMotion();
        if (cancelled) return;
        gsapRef.current = gsap;
        const media = gsap.matchMedia();
        media.add("(prefers-reduced-motion: no-preference)", () => {
          gsap.fromTo(
            section,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 84%",
                once: true,
              },
            },
          );
        });
        revealCleanup.current = () => media.revert();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(section);
    return () => {
      cancelled = true;
      observer.disconnect();
      revealCleanup.current?.();
      revealCleanup.current = null;
    };
  }, []);

  useEffect(() => {
    if (firstStageRender.current) {
      firstStageRender.current = false;
      return;
    }
    const gsap = gsapRef.current;
    const stage = stageRef.current;
    if (!gsap || !stage) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        stage,
        { opacity: 0.35, scale: 0.995 },
        { opacity: 1, scale: 1, duration: 0.32, ease: "power2.out" },
      );
    });
    return () => media.revert();
  }, [active]);

  function select(key: string) {
    setActive(key);
    requestAnimationFrame(() => {
      tabs.current.get(key)?.focus({ preventScroll: true });
    });
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!NAVIGATION_KEYS.includes(event.key)) return;
    event.preventDefault();
    const last = TOUR_CHAPTERS.length - 1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowDown" || event.key === "ArrowRight"
            ? Math.min(last, index + 1)
            : Math.max(0, index - 1);
    select(TOUR_CHAPTERS[next].key);
  }

  return (
    <section
      ref={sectionRef}
      id="feature-tour"
      className="feature-tour"
      tabIndex={-1}
      aria-labelledby="feature-tour-title"
    >
      <header className="feature-tour-head">
        <span className="feature-tour-brand" aria-hidden="true">
          <BrandLogo />
        </span>
        <div>
          <span className="stats418-section-eyebrow">
            So funktioniert 418 Pitch Practice
          </span>
          <h2 id="feature-tour-title">
            Vier Momente, die aus einem Versuch einen nächsten Schritt machen.
          </h2>
          <p>
            Kein Gesamtscore. Keine Note. Nur messbare Stellen, die du
            wiederfindest.
          </p>
        </div>
      </header>

      <div className="feature-tour-layout">
        <div
          className="feature-tour-tabs"
          role="tablist"
          aria-label="Funktionen der Tour"
          aria-orientation="vertical"
        >
          {TOUR_CHAPTERS.map((item, index) => (
            <button
              key={item.key}
              id={item.anchor}
              ref={(node) => {
                if (node) tabs.current.set(item.key, node);
                else tabs.current.delete(item.key);
              }}
              type="button"
              role="tab"
              aria-selected={item.key === active}
              aria-controls="feature-tour-panel"
              tabIndex={item.key === active ? 0 : -1}
              className={`feature-tour-tab${item.key === active ? " is-active" : ""}`}
              onClick={() => setActive(item.key)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              <span className="feature-tour-number">{item.number}</span>
              <span>
                <strong>{item.short}</strong>
                <small>{item.title}</small>
              </span>
            </button>
          ))}
        </div>

        <div
          ref={stageRef}
          id="feature-tour-panel"
          className="feature-tour-panel"
          role="tabpanel"
          aria-labelledby={chapter.anchor}
          tabIndex={0}
        >
          <FeatureStage chapter={chapter} />
          <div className="feature-tour-copy">
            <h3>{chapter.title}</h3>
            <p>{chapter.copy}</p>
            <ul>
              {chapter.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer className="feature-tour-foot">
        <p>
          Prototyp-Heuristiken. Keine Note, keine Genauigkeitszusage.
          Screenshots aus dem Prototyp mit Beispieldaten.
        </p>
        <div className="feature-tour-actions">
          <Link href="/live" className="button button-primary">
            Live ausprobieren
          </Link>
          <Link href="/progress" className="button button-outline">
            Fortschritt ansehen
          </Link>
        </div>
      </footer>
    </section>
  );
}

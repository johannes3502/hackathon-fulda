"use client";

import Image from "next/image";
import type { TourChapter } from "./tour-data";

export function FeatureStage({ chapter }: { chapter: TourChapter }) {
  const media = chapter.media;
  return (
    <div className="feature-tour-stage-inner">
      <div className="feature-tour-frame">
        {media.kind === "image" ? (
          <Image
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            sizes="(max-width: 900px) 100vw, 880px"
            loading="lazy"
          />
        ) : (
          <video
            key={media.src}
            controls
            playsInline
            preload="metadata"
            poster={media.poster}
            aria-label={media.alt}
          >
            <source src={media.src} type="video/mp4" />
          </video>
        )}
      </div>
      <p className="feature-tour-caption">
        {media.kind === "video"
          ? media.caption
          : "Ansicht aus dem Prototyp mit Beispieldaten."}
      </p>
    </div>
  );
}

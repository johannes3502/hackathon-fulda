import "./loading-screen.css";
import { BrandLogo } from "@/components/shared/BrandLogo";

/** Indeterminate loading: mount while work is pending, unmount when complete. */
export function LoadingScreen({
  label = "Einen Moment bitte",
}: {
  label?: string;
}) {
  return (
    <section className="loading418-screen" aria-label="Wird geladen" lang="de">
      <div className="loading418-center">
        <BrandLogo />
        <p className="loading418-status" role="status">
          <span className="loading418-dot" aria-hidden="true" />
          {label}
        </p>
      </div>
    </section>
  );
}

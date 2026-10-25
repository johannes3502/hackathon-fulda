export type LandingGsap = typeof import("gsap").gsap;

let loaded: LandingGsap | null = null;

/** Loads GSAP only when the tour is close to the viewport. */
export async function loadLandingMotion(): Promise<LandingGsap> {
  if (loaded) return loaded;
  const [gsapModule, triggerModule] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  gsapModule.gsap.registerPlugin(triggerModule.ScrollTrigger);
  loaded = gsapModule.gsap;
  return loaded;
}

import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="brand-logo">
      <Image
        src="/brand/418-pitch-practice.png"
        alt="418 Pitch Practice"
        width={2000}
        height={2000}
        sizes="200px"
        preload
      />
    </span>
  );
}

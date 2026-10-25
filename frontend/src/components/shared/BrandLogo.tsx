import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="brand-logo">
      <Image
        src="/brand/418-pitch-practice-mark.png"
        alt="418 Pitch Practice"
        width={1210}
        height={1210}
        sizes="200px"
        preload
      />
    </span>
  );
}

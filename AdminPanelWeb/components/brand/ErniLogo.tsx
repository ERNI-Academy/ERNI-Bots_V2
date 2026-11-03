import Image from "next/image";

// Aspect ratios of the vector artwork extracted from the ERNI Brand Book (page 13 and page 27).
const FULL_LOGO_RATIO = 514.51 / 133.4;
const COAT_OF_ARMS_RATIO = 33.42 / 35.54;

interface ErniLogoProps {
  /** Rendered height in px. The Brand Book sets 24px as the digital minimum for the main logo. */
  height?: number;
  /**
   * "auto": full logo on light surfaces, white coat of arms on dark surfaces (follows the active theme).
   * "on-dark": white coat of arms only, for brand-coloured or dark panels.
   */
  surface?: "auto" | "on-dark";
}

export function ErniLogo({ height = 24, surface = "auto" }: ErniLogoProps) {
  const coatOfArms = (
    <Image
      src="/brand/erni-coat-of-arms-white.svg"
      alt="ERNI"
      height={height}
      width={Math.round(height * COAT_OF_ARMS_RATIO)}
      unoptimized
      priority
      className={surface === "auto" ? "erni-logo-dark-surface" : undefined}
    />
  );

  if (surface === "on-dark") return coatOfArms;

  return (
    <>
      <Image
        src="/brand/erni-logo.svg"
        alt="ERNI"
        height={height}
        width={Math.round(height * FULL_LOGO_RATIO)}
        unoptimized
        priority
        className="erni-logo-light-surface"
      />
      {coatOfArms}
    </>
  );
}

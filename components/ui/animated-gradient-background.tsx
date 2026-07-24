"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export function AnimatedGradientBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const primaryBlobRef = useRef<HTMLDivElement | null>(null);
  const secondaryBlobRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const primaryBlob = primaryBlobRef.current;
    const secondaryBlob = secondaryBlobRef.current;

    if (!container || !primaryBlob || !secondaryBlob) return;

    const media = gsap.matchMedia();

    const context = gsap.context(() => {
      /*
       * Desktop:
       * Both blobs follow the cursor at different speeds.
       */
      media.add(
        "(min-width: 768px) and (pointer: fine)",
        () => {
          const defaultX = window.innerWidth / 2;
          const defaultY = window.innerHeight * 0.4;

          gsap.set([primaryBlob, secondaryBlob], {
            xPercent: -50,
            yPercent: -50,
          });

          gsap.set(primaryBlob, {
            x: defaultX,
            y: defaultY,
            opacity: 0.8,
          });

          gsap.set(secondaryBlob, {
            x: defaultX,
            y: defaultY,
            opacity: 0.55,
          });

          const movePrimaryX = gsap.quickTo(primaryBlob, "x", {
            duration: 0.3,
            ease: "power3.out",
          });

          const movePrimaryY = gsap.quickTo(primaryBlob, "y", {
            duration: 0.3,
            ease: "power3.out",
          });

          const moveSecondaryX = gsap.quickTo(secondaryBlob, "x", {
            duration: 1,
            ease: "power3.out",
          });

          const moveSecondaryY = gsap.quickTo(secondaryBlob, "y", {
            duration: 1,
            ease: "power3.out",
          });

          const handlePointerMove = (event: PointerEvent) => {
            movePrimaryX(event.clientX);
            movePrimaryY(event.clientY);

            moveSecondaryX(event.clientX);
            moveSecondaryY(event.clientY);
          };

          const handlePointerLeave = () => {
            gsap.to(primaryBlob, {
              opacity: 0.55,
              duration: 0.4,
            });

            gsap.to(secondaryBlob, {
              opacity: 0.35,
              duration: 0.5,
            });
          };

          const handlePointerEnter = () => {
            gsap.to(primaryBlob, {
              opacity: 0.8,
              duration: 0.3,
            });

            gsap.to(secondaryBlob, {
              opacity: 0.55,
              duration: 0.3,
            });
          };

          window.addEventListener("pointermove", handlePointerMove);
          document.documentElement.addEventListener(
            "mouseleave",
            handlePointerLeave,
          );
          document.documentElement.addEventListener(
            "mouseenter",
            handlePointerEnter,
          );

          return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            document.documentElement.removeEventListener(
              "mouseleave",
              handlePointerLeave,
            );
            document.documentElement.removeEventListener(
              "mouseenter",
              handlePointerEnter,
            );
          };
        },
      );

      /*
       * Mobile/tablet:
       * No cursor, so two blobs move up and down continuously.
       */
      media.add(
        "(max-width: 767px), (pointer: coarse)",
        () => {
          gsap.set(primaryBlob, {
            xPercent: -50,
            yPercent: -50,
            left: "20%",
            top: "25%",
            opacity: 0.7,
          });

          gsap.set(secondaryBlob, {
            xPercent: -50,
            yPercent: -50,
            left: "80%",
            top: "75%",
            opacity: 0.5,
          });

          const primaryAnimation = gsap.to(primaryBlob, {
            y: "28vh",
            x: "8vw",
            scale: 1.12,
            duration: 7,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });

          const secondaryAnimation = gsap.to(secondaryBlob, {
            y: "-32vh",
            x: "-10vw",
            scale: 1.15,
            duration: 9,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });

          return () => {
            primaryAnimation.kill();
            secondaryAnimation.kill();
          };
        },
      );
    }, container);

    return () => {
      media.revert();
      context.revert();

      gsap.killTweensOf(primaryBlob);
      gsap.killTweensOf(secondaryBlob);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Main bright green blob */}
      <div
        ref={primaryBlobRef}
        className="absolute left-0 top-0 h-[75vmax] w-[75vmax] rounded-full will-change-transform md:h-[55vmax] md:w-[55vmax]"
        style={{
          background:
            "radial-gradient(circle, rgba(55,255,0,0.7) 0%, rgba(48,230,0,0.38) 30%, rgba(36,201,0,0.14) 55%, transparent 72%)",
          filter: "blur(clamp(3rem, 8vw, 8rem))",
        }}
      />

      {/* Darker trailing blob */}
      <div
        ref={secondaryBlobRef}
        className="absolute left-0 top-0 h-[90vmax] w-[90vmax] rounded-full will-change-transform md:h-[70vmax] md:w-[70vmax]"
        style={{
          background:
            "radial-gradient(circle, rgba(36,201,0,0.5) 0%, rgba(22,138,0,0.3) 35%, rgba(22,138,0,0.1) 58%, transparent 74%)",
          filter: "blur(clamp(4rem, 10vw, 10rem))",
        }}
      />

      <div className="absolute inset-0 bg-black/15" />
    </div>
  );
}
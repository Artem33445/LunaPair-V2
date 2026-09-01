import React, { useRef, useEffect, useCallback, useState, ReactNode } from 'react';
import { gsap } from 'gsap';
import './MagicBento.css';

const DEFAULT_PARTICLE_COUNT = 8;
const DEFAULT_SPOTLIGHT_RADIUS = 280;
const DEFAULT_GLOW_COLOR = '132, 0, 255';
const MOBILE_BREAKPOINT = 768;

export type BentoItem = {
  id?: string;
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  content?: ReactNode;
  className?: string;
};

const createParticleElement = (x: number, y: number, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
    will-change: transform, opacity;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75
});

type ParticleCardProps = {
  children: ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
};

const ParticleCard = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false
}: ParticleCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLElement[]>([]);
  const particlesInitialized = useRef(false);
  const cachedRectRef = useRef<DOMRect | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    particlesRef.current.forEach(particle => {
      gsap.killTweensOf(particle);
      particle.remove();
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          {
            scale: 'random(0.6, 1.2)',
            opacity: 'random(0.4, 0.9)',
            x: 'random(-20, 20)',
            y: 'random(-20, 20)',
            duration: 'random(1, 1.8)',
            ease: 'power1.out',
            onComplete: () => {
              clone.remove();
              particlesRef.current = particlesRef.current.filter(p => p !== clone);
              if (isHoveredRef.current) {
                animateParticles();
              }
            }
          }
        );
      }, index * 120);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    // Fast quickTo pipelines to eliminate GSAP allocation overhead on mousemove
    const rotXTo = enableTilt ? gsap.quickTo(element, 'rotationX', { duration: 0.25, ease: 'power2.out' }) : null;
    const rotYTo = enableTilt ? gsap.quickTo(element, 'rotationY', { duration: 0.25, ease: 'power2.out' }) : null;
    const xTo = enableMagnetism ? gsap.quickTo(element, 'x', { duration: 0.35, ease: 'power2.out' }) : null;
    const yTo = enableMagnetism ? gsap.quickTo(element, 'y', { duration: 0.35, ease: 'power2.out' }) : null;

    if (enableTilt) {
      gsap.set(element, { transformPerspective: 1000, force3D: true });
    }

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      cachedRectRef.current = element.getBoundingClientRect();
      animateParticles();
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      cachedRectRef.current = null;
      clearAllParticles();

      if (rotXTo) rotXTo(0);
      if (rotYTo) rotYTo(0);
      if (xTo) xTo(0);
      if (yTo) yTo(0);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = cachedRectRef.current || element.getBoundingClientRect();
      if (!cachedRectRef.current) cachedRectRef.current = rect;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt && rotXTo && rotYTo) {
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        rotXTo(rotateX);
        rotYTo(rotateY);
      }

      if (enableMagnetism && xTo && yTo) {
        const magnetX = (x - centerX) * 0.04;
        const magnetY = (y - centerY) * 0.04;
        xTo(magnetX);
        yTo(magnetY);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = cachedRectRef.current || element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.35) 0%, rgba(${glowColor}, 0.15) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
        will-change: transform, opacity;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => ripple.remove()
        }
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter, { passive: true });
    element.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    element.addEventListener('mousemove', handleMouseMove, { passive: true });
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
      gsap.killTweensOf(element);
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}: {
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const isInsideSection = useRef(false);
  const cachedCardsRef = useRef<{ el: HTMLElement; rect: DOMRect }[]>([]);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.14) 0%,
        rgba(${glowColor}, 0.07) 18%,
        rgba(${glowColor}, 0.03) 30%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
      will-change: left, top, opacity;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const spotXTo = gsap.quickTo(spotlight, 'left', { duration: 0.1, ease: 'power2.out' });
    const spotYTo = gsap.quickTo(spotlight, 'top', { duration: 0.1, ease: 'power2.out' });
    const spotOpacityTo = gsap.quickTo(spotlight, 'opacity', { duration: 0.25, ease: 'power2.out' });

    let sectionRect: DOMRect | null = null;

    const updateCachedRects = () => {
      if (!gridRef.current) return;
      const section = gridRef.current.closest('.bento-section');
      sectionRect = section?.getBoundingClientRect() || null;
      const cards = gridRef.current.querySelectorAll<HTMLElement>('.magic-bento-card');
      cachedCardsRef.current = Array.from(cards).map(el => ({ el, rect: el.getBoundingClientRect() }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      if (!sectionRect) {
        updateCachedRects();
      }

      const mouseInside =
        sectionRect &&
        e.clientX >= sectionRect.left &&
        e.clientX <= sectionRect.right &&
        e.clientY >= sectionRect.top &&
        e.clientY <= sectionRect.bottom;

      isInsideSection.current = mouseInside || false;

      if (!mouseInside) {
        spotOpacityTo(0);
        cachedCardsRef.current.forEach(({ el }) => {
          el.style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cachedCardsRef.current.forEach(({ el, rect }) => {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(rect.width, rect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
        const relativeY = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--glow-x', `${relativeX}%`);
        el.style.setProperty('--glow-y', `${relativeY}%`);
        el.style.setProperty('--glow-intensity', glowIntensity.toString());
      });

      spotXTo(e.clientX);
      spotYTo(e.clientY);

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      spotOpacityTo(targetOpacity);
    };

    const handleMouseEnterSection = () => {
      updateCachedRects();
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      sectionRect = null;
      cachedCardsRef.current.forEach(({ el }) => {
        el.style.setProperty('--glow-intensity', '0');
      });
      spotOpacityTo(0);
    };

    window.addEventListener('scroll', updateCachedRects, { passive: true });
    window.addEventListener('resize', updateCachedRects, { passive: true });
    gridRef.current?.addEventListener('mouseenter', handleMouseEnterSection, { passive: true });
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateCachedRects);
      window.removeEventListener('resize', updateCachedRects);
      gridRef.current?.removeEventListener('mouseenter', handleMouseEnterSection);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      spotlightRef.current?.remove();
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

const BentoCardGrid = ({ children, gridRef, className = "" }: { children: ReactNode; gridRef: React.RefObject<HTMLDivElement | null>; className?: string }) => (
  <div className={`card-grid bento-section ${className}`} ref={gridRef}>
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.innerWidth <= MOBILE_BREAKPOINT ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(pointer: coarse)').matches ||
      ('ontouchstart' in window) ||
      navigator.maxTouchPoints > 0
    );
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= MOBILE_BREAKPOINT ||
        window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(pointer: coarse)').matches ||
        ('ontouchstart' in window) ||
        navigator.maxTouchPoints > 0
      );
    };

    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

type MagicBentoProps = {
  items: BentoItem[];
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  gridClassName?: string;
};

export const MagicBento = ({
  items,
  textAutoHide = false,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = false,
  enableMagnetism = true,
  gridClassName = "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
}: MagicBentoProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  return (
    <>
      {enableSpotlight && !isMobile && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef} className={gridClassName}>
        {items.map((card, index) => {
          const baseClassName = `magic-bento-card ${textAutoHide ? 'magic-bento-card--text-autohide' : ''} ${enableBorderGlow ? 'magic-bento-card--border-glow' : ''} ${card.className || ''}`;
          const cardProps = {
            className: baseClassName,
            style: {
              backgroundColor: card.color,
              '--glow-color-rgb': glowColor
            } as React.CSSProperties
          };

          const InnerContent = () => (
            <>
              {(card.label || card.title || card.description) && (
                <div className="magic-bento-card__header">
                  {card.label && <div className="magic-bento-card__label text-primary">{card.label}</div>}
                </div>
              )}
              <div className="magic-bento-card__content text-text">
                {card.title && <h2 className="magic-bento-card__title">{card.title}</h2>}
                {card.description && <p className="magic-bento-card__description">{card.description}</p>}
                {card.content}
              </div>
            </>
          );

          if (enableStars && !isMobile) {
            return (
              <ParticleCard
                key={card.id || index}
                {...cardProps}
                disableAnimations={shouldDisableAnimations}
                particleCount={particleCount}
                glowColor={glowColor}
                enableTilt={enableTilt}
                clickEffect={clickEffect}
                enableMagnetism={enableMagnetism}
              >
                <InnerContent />
              </ParticleCard>
            );
          }

          return (
            <div key={card.id || index} {...cardProps}>
              <InnerContent />
            </div>
          );
        })}
      </BentoCardGrid>
    </>
  );
};

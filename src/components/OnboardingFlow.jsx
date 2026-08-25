import { useState, useEffect, useRef } from 'react';

const ONBOARDING_KEY = 'cabi-onboarding-completed';

const SLIDES = [
  {
    icon: '🌱',
    title: 'স্বাগতম!',
    subtitle: 'Welcome',
    description: 'উদ্ভিদ গোয়েন্দা অ্যাপে আপনাকে স্বাগতম। এই অ্যাপ আপনাকে ফসলের রোগ চিনতে, পরামর্শ পেতে এবং কৃষি জ্ঞান বাড়াতে সাহায্য করবে।',
    bgGradient: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #34d399 100%)',
    floatingEmoji: '🍃',
  },
  {
    icon: '📸',
    title: 'ছবি তুলে রোগ চিনুন',
    subtitle: 'Diagnose by Photo',
    description: 'ফসলের ছবি তুললেই AI রোগ চিহ্নিত করবে। CABI এর ৫-ধাপ প্রোটোকল অনুসারে নির্ণয়, ব্যবস্থাপনা ও প্রতিরোধের পরামর্শ পাবেন।',
    bgGradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #93c5fd 100%)',
    floatingEmoji: '🔍',
  },
  {
    icon: '🎮',
    title: 'শিখুন ও খেলুন',
    subtitle: 'Learn & Play',
    description: 'মজার গেমের মাধ্যমে উদ্ভিদ রোগ, পোকামাকড় ও IPM পদ্ধতি শিখুন। লক্ষণ চিনুন, কারণ খুঁজুন, রোগ ত্রিভুজ বুঝুন এবং মাঠ পরিদর্শন করুন।',
    bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c4b5fd 100%)',
    floatingEmoji: '🎯',
  },
  {
    icon: '🚀',
    title: 'শুরু করুন!',
    subtitle: "Let's Get Started",
    description: 'এখনই শুরু করুন আপনার ফসলের রোগ নির্ণয়। ছবি তুলুন, পরামর্শ নিন, এবং সুস্থ ফসল উৎপাদন করুন!',
    bgGradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde68a 100%)',
    floatingEmoji: '🌾',
  },
];

export default function OnboardingFlow({ C: _C, onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visible, setVisible] = useState(false);
  const [slideDirection, setSlideDirection] = useState('next');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed === 'true') {
      if (onComplete) onComplete();
      return;
    }
    setVisible(true);
  }, [onComplete]);

  const navigateTo = (newSlide, direction) => {
    if (isTransitioning) return;
    setSlideDirection(direction);
    setIsTransitioning(true);
    setCurrentSlide(newSlide);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  function handleNext() {
    if (currentSlide < SLIDES.length - 1) {
      navigateTo(currentSlide + 1, 'next');
    }
  }

  function handlePrev() {
    if (currentSlide > 0) {
      navigateTo(currentSlide - 1, 'prev');
    }
  }

  function handleSkip() {
    setFadingOut(true);
    setTimeout(() => {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setVisible(false);
      if (onComplete) onComplete();
    }, 300);
  }

  function handleGetStarted() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
    if (onComplete) onComplete();
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  if (!visible) return null;

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  const slideStyle = {
    background: slide.bgGradient,
    animation: fadingOut ? 'fadeOut .3s ease forwards' : 'fadeIn .4s ease',
  };

  const contentSlideStyle = {
    transform: isTransitioning
      ? slideDirection === 'next'
        ? 'translateX(30px)'
        : 'translateX(-30px)'
      : 'translateX(0)',
    opacity: isTransitioning ? 0.5 : 1,
    transition: 'all .5s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const decorativeElements = [
    { size: 8, top: '20%', left: '10%', duration: '4s', delay: '0s', opacity: 0.2 },
    { size: 6, top: '60%', right: '15%', duration: '5.5s', delay: '1.2s', opacity: 0.15 },
    { size: 10, bottom: '30%', left: '80%', duration: '6s', delay: '2s', opacity: 0.1 },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: slide.bgGradient,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        ...slideStyle,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="অনবোর্ডিং গাইড"
    >
      {/* Skip button */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '16px 20px',
      }}>
        <button
          onClick={handleSkip}
          aria-label="অনবোর্ডিং এড়িয়ে যান"
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 20,
            padding: '6px 16px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          এড়িয়ে যান / Skip
        </button>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 28px',
          textAlign: 'center',
          ...contentSlideStyle,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Existing floating emojis */}
        <div style={{
          fontSize: 40,
          marginBottom: 8,
          opacity: 0.4,
          animation: 'leafFloat 6s ease-in-out infinite',
          position: 'absolute',
          top: '15%',
          right: '15%',
          willChange: 'transform',
        }}>
          {slide.floatingEmoji}
        </div>
        <div style={{
          fontSize: 28,
          marginBottom: 8,
          opacity: 0.25,
          animation: 'leafFloat 5s ease-in-out infinite 1s',
          position: 'absolute',
          bottom: '25%',
          left: '12%',
          willChange: 'transform',
        }}>
          {slide.floatingEmoji}
        </div>

        {/* Additional parallax decorative elements */}
        {decorativeElements.map((el, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: el.size,
              height: el.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              top: el.top,
              left: el.left,
              right: el.right,
              bottom: el.bottom,
              opacity: el.opacity,
              animation: `floatGentle ${el.duration} ease-in-out infinite`,
              animationDelay: el.delay,
              willChange: 'transform',
            }}
          />
        ))}

        {/* Main icon */}
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          marginBottom: 24,
          border: '2px solid rgba(255,255,255,0.2)',
          animation: 'popIn .5s ease',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          {slide.icon}
        </div>

        {/* Title */}
        <h1 style={{
          color: '#ffffff',
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 4,
          lineHeight: 1.2,
          fontFamily: "'Plus Jakarta Sans', 'Noto Sans Bengali', sans-serif",
        }}>
          {slide.title}
        </h1>

        {/* English subtitle */}
        <div style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 16,
          letterSpacing: 0.5,
        }}>
          {slide.subtitle}
        </div>

        {/* Description */}
        <p style={{
          color: 'rgba(255,255,255,0.9)',
          fontSize: 15,
          lineHeight: 1.7,
          maxWidth: 320,
          marginBottom: 32,
        }}>
          {slide.description}
        </p>

        {/* Feature pills for slide 2 and 3 */}
        {currentSlide === 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
            {[
              { icon: '📷', text: 'ছবি তুলুন' },
              { icon: '🤖', text: 'AI বিশ্লেষণ' },
              { icon: '📋', text: 'ফলাফল দেখুন' },
            ].map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                color: '#fff',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <span>{step.icon}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        )}

        {currentSlide === 2 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
            {[
              { icon: '🔍', text: 'লক্ষণ চিনুন' },
              { icon: '🕵️', text: 'কারণ খুঁজুন' },
              { icon: '🔺', text: 'রোগ ত্রিভুজ' },
              { icon: '🧭', text: 'মাঠ পরিদর্শন' },
            ].map((game, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                color: '#fff',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <span>{game.icon}</span>
                <span>{game.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: progress bar + button */}
      <div style={{
        padding: '20px 28px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        {/* Animated progress indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          width: '100%',
          maxWidth: 280,
          position: 'relative',
        }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            height: 2,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 1,
            zIndex: 0,
          }}>
            <div style={{
              width: `${((currentSlide) / (SLIDES.length - 1)) * 100}%`,
              height: '100%',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 1,
              transition: 'width .5s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>

          {/* Dots with pulse ring on active */}
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                zIndex: 1,
                width: i === currentSlide ? 24 : 8,
                height: i === currentSlide ? 24 : 8,
                borderRadius: '50%',
                background: i === currentSlide ? '#ffffff' : 'rgba(255,255,255,0.4)',
                transition: 'all .3s ease',
                flexShrink: 0,
              }}
            >
              {i === currentSlide && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.8)',
                    animation: 'pulseRing 1.5s ease-out infinite',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 360 }}>
          {currentSlide > 0 && (
            <button
              onClick={handlePrev}
              aria-label="পেছনের স্লাইডে যান"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                minHeight: 44,
              }}
            >
              ← পেছনে
            </button>
          )}

          {isLast ? (
            <button
              onClick={handleGetStarted}
              aria-label="অ্যাপ শুরু করুন"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                background: '#ffffff',
                border: 'none',
                color: '#065f46',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                minHeight: 44,
              }}
            >
              🚀 শুরু করুন!
            </button>
          ) : (
            <button
              onClick={handleNext}
              aria-label="পরবর্তী স্লাইডে যান"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                background: '#ffffff',
                border: 'none',
                color: '#065f46',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                minHeight: 44,
              }}
            >
              পরবর্তী →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function isOnboardingCompleted() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function resetOnboarding() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_KEY);
}

import { useCallback, useState } from 'react';
import Confetti from '../components/ui/Confetti';

export function useConfetti() {
  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    setActive(false);
    requestAnimationFrame(() => {
      setActive(true);
    });
  }, []);

  const handleComplete = useCallback(() => {
    setActive(false);
  }, []);

  const ConfettiComponent = active ? (
    <Confetti active={active} onComplete={handleComplete} />
  ) : null;

  return { trigger, active, ConfettiComponent };
}

export function useStagger(items = [], baseDelay = 60) {
  return items.map((_, index) => ({
    '--stagger-delay': `${index * baseDelay}ms`,
  }));
}

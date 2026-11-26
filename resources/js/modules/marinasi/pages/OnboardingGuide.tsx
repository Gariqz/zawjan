import { useId, useRef, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import ZawjanMascot from '@/components/shared/ZawjanMascot';
import { Button } from '@/components/ui/button';
import { onboardingCopy } from '@/content/id/onboarding';

const c = onboardingCopy.guide;

export function OnboardingGuide({ initiallyOpen, onClose }: { initiallyOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(initiallyOpen ? 0 : null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const slide = step === null ? null : c.slides[step];
  const close = () => { setStep(null); onClose(); trigger.current?.focus(); };

  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-card border border-brand-primary/20 bg-brand-mint">
      <div className="grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-2 p-4 min-[400px]:grid-cols-[minmax(0,1fr)_5rem] sm:grid-cols-[minmax(0,1fr)_7rem] sm:gap-4 sm:p-5">
        <div>
          <h2 id={`${id}-title`} className="font-display text-xl font-semibold leading-tight text-brand-forest sm:text-2xl">{c.title}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{c.intro}</p>
          <Button ref={trigger} variant="outline" size="sm" className="mt-3" aria-expanded={step !== null} aria-controls={id}
            onClick={() => step === null ? setStep(0) : close()}>
            <BookOpen className="h-4 w-4" aria-hidden />{step === null ? c.open : c.skip}
          </Button>
        </div>
        <ZawjanMascot pose={slide?.pose ?? 'welcome'} className="mx-auto h-auto w-full max-w-28" />
      </div>
      <div id={id} hidden={step === null}>
        {slide && step !== null && (
          <div className="border-t border-brand-primary/20 bg-surface-white p-4 sm:p-5">
            <div aria-live="polite" aria-atomic="true">
              <h3 className="text-lg font-semibold text-brand-forest">{slide.title}</h3>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">{slide.body}</p>
              <p className="mt-3 text-sm font-semibold text-brand-primary">{c.progress(step + 1, c.slides.length)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" aria-disabled={step === 0} className="aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
                onClick={() => { if (step > 0) setStep(step - 1); }}>{c.previous}</Button>
              {step < c.slides.length - 1
                ? <Button size="sm" onClick={() => setStep(step + 1)}>{c.next}<ArrowRight className="h-4 w-4" aria-hidden /></Button>
                : <Button size="sm" onClick={close}>{c.finish}</Button>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { ArrowLeft, ArrowRight, X } from "lucide-react";

export interface TourStep {
  title: string;
  body: string;
  tab: string;
}

interface DemoTourProps {
  isOpen: boolean;
  step: number;
  steps: TourStep[];
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export function DemoTour({
  isOpen,
  step,
  steps,
  onNext,
  onPrevious,
  onSkip,
}: DemoTourProps) {
  if (!isOpen) {
    return null;
  }

  const current = steps[step];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-32px))] rounded-lg border border-zinc-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">
            90-second demo tour · Step {step + 1} of {steps.length}
          </p>
          <h2 className="mt-2 text-base font-semibold text-zinc-950">
            {current.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          aria-label="Skip demo tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{current.body}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={step === 0}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          {step === steps.length - 1 ? "Finish" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

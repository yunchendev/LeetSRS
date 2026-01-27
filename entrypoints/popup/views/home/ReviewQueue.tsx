import { useCallback, useMemo, useState, useEffect } from 'react';
import { ReviewCard } from './ReviewCard';
import { NotesSection } from './NotesSection';
import { ActionsSection } from './ActionsSection';
import {
  useReviewQueueQuery,
  useRateCardMutation,
  useRemoveCardMutation,
  useDelayCardMutation,
  usePauseCardMutation,
  useAnimationsEnabledQuery,
  useRatingHotkeysQuery,
} from '@/hooks/useBackgroundQueries';
import { Rating, type Grade } from 'ts-fsrs';
import { i18n } from '@/shared/i18n';
import type { Card } from '@/shared/cards';
import { DEFAULT_RATING_HOTKEYS } from '@/shared/settings';

export function ReviewQueue() {
  const { data: animationsEnabled = true } = useAnimationsEnabledQuery();
  const { data: queue = [], isLoading, error } = useReviewQueueQuery({ refetchOnWindowFocus: true });
  const { data: ratingHotkeys = DEFAULT_RATING_HOTKEYS } = useRatingHotkeysQuery();
  const rateCardMutation = useRateCardMutation();
  const removeCardMutation = useRemoveCardMutation();
  const delayCardMutation = useDelayCardMutation();
  const pauseCardMutation = usePauseCardMutation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [animatingCard, setAnimatingCard] = useState<Card | null>(null);

  const isTypingTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    const tagName = element.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.isContentEditable;
  };

  const handleCardAction = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: {
        getSlideDirection?: (result: T) => 'left' | 'right' | null;
        errorMessage: string;
      }
    ) => {
      if (queue.length === 0 || isProcessing) return;

      setAnimatingCard(queue[0]);
      setIsProcessing(true);

      try {
        const result = await action();

        if (animationsEnabled && options.getSlideDirection) {
          const direction = options.getSlideDirection(result);
          if (direction) setSlideDirection(direction);
        }

        const animationDelay = animationsEnabled ? 400 : 0;
        setTimeout(() => {
          setSlideDirection(null);
          setIsProcessing(false);
          setAnimatingCard(null);
        }, animationDelay);
      } catch (error) {
        console.error(options.errorMessage, error);
        setSlideDirection(null);
        setIsProcessing(false);
        setAnimatingCard(null);
      }
    },
    [animationsEnabled, isProcessing, queue]
  );

  const handleRating = useCallback(
    async (rating: Grade) => {
      const currentCard = queue[0];
      await handleCardAction(
        () =>
          rateCardMutation.mutateAsync({
            slug: currentCard.slug,
            name: currentCard.name,
            rating,
            leetcodeId: currentCard.leetcodeId,
            difficulty: currentCard.difficulty,
          }),
        {
          getSlideDirection: (result) => (result.shouldRequeue ? 'left' : 'right'),
          errorMessage: 'Failed to rate card:',
        }
      );
    },
    [queue, handleCardAction, rateCardMutation]
  );

  const handleDelete = async () => {
    const currentCard = queue[0];
    await handleCardAction(() => removeCardMutation.mutateAsync(currentCard.slug), {
      getSlideDirection: () => 'left',
      errorMessage: 'Failed to delete card:',
    });
  };

  const handleDelay = async (days: number) => {
    const currentCard = queue[0];
    await handleCardAction(() => delayCardMutation.mutateAsync({ slug: currentCard.slug, days }), {
      getSlideDirection: () => 'right',
      errorMessage: 'Failed to delay card:',
    });
  };

  const handlePause = async () => {
    const currentCard = queue[0];
    await handleCardAction(() => pauseCardMutation.mutateAsync({ slug: currentCard.slug, paused: true }), {
      getSlideDirection: () => 'right',
      errorMessage: 'Failed to pause card:',
    });
  };

  const ratingHotkeyMap = useMemo(() => {
    const map: Record<string, Grade> = {};
    if (ratingHotkeys.again) map[ratingHotkeys.again.toLowerCase()] = Rating.Again as Grade;
    if (ratingHotkeys.hard) map[ratingHotkeys.hard.toLowerCase()] = Rating.Hard as Grade;
    if (ratingHotkeys.good) map[ratingHotkeys.good.toLowerCase()] = Rating.Good as Grade;
    if (ratingHotkeys.easy) map[ratingHotkeys.easy.toLowerCase()] = Rating.Easy as Grade;
    return map;
  }, [ratingHotkeys]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target) || queue.length === 0 || isProcessing) {
        return;
      }

      const key = event.key.toLowerCase();
      const rating = ratingHotkeyMap[key];
      if (rating !== undefined) {
        event.preventDefault();
        handleRating(rating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queue.length, isProcessing, handleRating, ratingHotkeyMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-secondary">{i18n.home.loadingReviewQueue}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-red-500">{i18n.errors.failedToLoadReviewQueue}</div>
      </div>
    );
  }

  const currentCard = animatingCard ?? queue[0];

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-3 px-4">
        <div className="text-xl font-semibold text-primary">{i18n.home.noCardsToReview}</div>
        <div className="text-base text-secondary text-center">
          {i18n.home.addProblemsInstructions}{' '}
          <svg
            className="inline-block mx-1 align-text-bottom"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#10b981' }}
          >
            <path d="M9 4.55a8 8 0 0 1 6 14.9m0 -4.45v5h5" />
            <path d="M5.63 7.16l0 .01" />
            <path d="M4.06 11l0 .01" />
            <path d="M4.63 15.1l0 .01" />
            <path d="M7.16 18.37l0 .01" />
            <path d="M11 19.94l0 .01" />
          </svg>
          {i18n.home.addProblemsButton}
        </div>
      </div>
    );
  }

  const getAnimationClass = () => {
    if (!animationsEnabled) return '';

    const baseClasses = 'transition-all duration-300 ease-out';

    if (slideDirection === 'left') {
      return `${baseClasses} animate-slide-left`;
    }
    if (slideDirection === 'right') {
      return `${baseClasses} animate-slide-right`;
    }
    return `${baseClasses} animate-slide-in`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={getAnimationClass()}>
        {/* The key is important to ensure React re-mounts the component for a new card */}
        <ReviewCard key={currentCard.id} card={currentCard} onRate={handleRating} isProcessing={isProcessing} />
      </div>
      <NotesSection cardId={currentCard.id} />
      <ActionsSection onDelete={handleDelete} onDelay={handleDelay} onPause={handlePause} />
    </div>
  );
}

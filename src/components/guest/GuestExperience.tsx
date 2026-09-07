'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import WelcomeScreen from './WelcomeScreen';
import IdentityStep from './IdentityStep';
import ComposeStep from './ComposeStep';
import SelfieStep from './SelfieStep';
import PreviewStep from './PreviewStep';
import ThankYouScreen from './ThankYouScreen';
import ClosedScreen from './ClosedScreen';
import WishWall from '@/components/wall/WishWall';
import { resolveTheme, themeStyle } from '@/lib/themes';
import type { GuestPayload, PublicWish, WishDraft } from '@/lib/types';

type Step = 'welcome' | 'identity' | 'compose' | 'selfie' | 'preview' | 'wall' | 'thanks';

const EMPTY_DRAFT: WishDraft = {
  message: '',
  guestName: '',
  isAnonymous: false,
  sticker: null,
  gif: null,
  meme: null,
  selfie: null,
};

export default function GuestExperience({ payload }: { payload: GuestPayload }) {
  const { event, assets } = payload;
  const theme = useMemo(() => resolveTheme(event.themeId), [event.themeId]);

  const [step, setStep] = useState<Step>('welcome');
  const [draft, setDraft] = useState<WishDraft>(EMPTY_DRAFT);
  const [wall, setWall] = useState<PublicWish[]>(payload.wall);
  const [submitted, setSubmitted] = useState<PublicWish | null>(null);
  const [pendingModeration, setPendingModeration] = useState(false);
  const [replay, setReplay] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof WishDraft>(key: K, value: WishDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [],
  );

  // The Wish Wall is the payoff — keep the browser back button from skipping it.
  useEffect(() => {
    if (step === 'welcome') return;
    const onPop = (e: PopStateEvent) => {
      e.preventDefault();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [step]);

  const send = useCallback(async () => {
    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${event.id}/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: draft.message,
          guestName: draft.guestName,
          isAnonymous: draft.isAnonymous,
          sticker: draft.sticker,
          gif: draft.gif,
          meme: draft.meme,
          selfie: draft.selfie,
        }),
      });

      const data = (await response.json()) as
        | { wish: PublicWish; pending: boolean; wall: PublicWish[] }
        | { error: string };

      if (!response.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Your wish could not be sent. Please try again.');
        return;
      }

      // Show the guest's own selfie in the animation even though the stored
      // copy stays private — the image is already here in the browser.
      const landed: PublicWish = { ...data.wish, selfieUrl: draft.selfie };

      setWall(data.wall);
      setSubmitted(landed);
      setPendingModeration(data.pending);
      setStep(event.settings.wallEnabled ? 'wall' : 'thanks');
    } catch {
      setError('We could not reach the Wish Wall. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }, [draft, event.id, event.settings.wallEnabled]);

  if (event.status !== 'open') {
    return (
      <div style={themeStyle(theme)}>
        <ClosedScreen
          theme={theme}
          event={event}
          wall={payload.wall}
          reason={event.status === 'full' ? 'full' : 'closed'}
        />
      </div>
    );
  }

  return (
    // reducedMotion="user" makes every motion component honour the guest's OS
    // setting: animations resolve straight to their final state instead of
    // moving. Paired with the CSS reveals, nothing can be left invisible.
    <MotionConfig reducedMotion="user">
      <div style={themeStyle(theme)}>
        {/* Each screen brings its own CSS entrance, so no JS crossfade sits
            between the guest and the next step. */}
        <div key={step}>
            {step === 'welcome' && (
              <WelcomeScreen
                theme={theme}
                event={event}
                wishCount={wall.length}
                onStart={() => setStep('identity')}
              />
            )}

            {step === 'identity' && (
              <IdentityStep
                theme={theme}
                name={draft.guestName}
                isAnonymous={draft.isAnonymous}
                onNameChange={(value) => update('guestName', value)}
                onAnonymousChange={(value) => update('isAnonymous', value)}
                onContinue={() => setStep('compose')}
                onBack={() => setStep('welcome')}
              />
            )}

            {step === 'compose' && (
              <ComposeStep
                theme={theme}
                assets={assets}
                message={draft.message}
                charLimit={event.settings.charLimit}
                sticker={draft.sticker}
                gif={draft.gif}
                meme={draft.meme}
                onMessageChange={(value) => update('message', value)}
                onStickerChange={(value) => update('sticker', value)}
                onGifChange={(value) => update('gif', value)}
                onMemeChange={(value) => update('meme', value)}
                onContinue={() => setStep(event.settings.selfieEnabled ? 'selfie' : 'preview')}
                onBack={() => setStep('identity')}
              />
            )}

            {step === 'selfie' && (
              <SelfieStep
                theme={theme}
                selfie={draft.selfie}
                onSelfieChange={(value) => update('selfie', value)}
                onContinue={() => setStep('preview')}
                onBack={() => setStep('compose')}
              />
            )}

            {step === 'preview' && (
              <PreviewStep
                theme={theme}
                draft={draft}
                sending={sending}
                error={error}
                onSend={send}
                onBack={() => setStep(event.settings.selfieEnabled ? 'selfie' : 'compose')}
              />
            )}

            {step === 'wall' && (
              <WishWall
                theme={theme}
                wishes={wall}
                // On a revisit the wall is simply browsable — no second fly-in.
                incoming={replay ? null : submitted}
                onSettled={
                  replay ? undefined : () => window.setTimeout(() => setStep('thanks'), 2600)
                }
                onClose={replay ? () => setStep('thanks') : undefined}
              />
            )}

            {step === 'thanks' && (
              <ThankYouScreen
                theme={theme}
                event={event}
                pending={pendingModeration}
                onViewWall={() => {
                  setReplay(true);
                  setStep('wall');
                }}
              />
            )}
        </div>
      </div>
    </MotionConfig>
  );
}

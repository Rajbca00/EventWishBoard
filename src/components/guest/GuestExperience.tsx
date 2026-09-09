'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  clearPendingWish,
  isRetryable,
  MAX_SERVER_RETRIES,
  loadPendingWish,
  retryDelay,
  savePendingWish,
} from '@/lib/pending-wish';
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
  selfiePublic: false,
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'retrying'>('idle');
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

  /*
   * Submission is deliberately stubborn.
   *
   * The draft is written to the device before the first request and only
   * cleared once the server has actually accepted it, so a dropped connection,
   * a locked phone or a closed tab cannot lose a guest's message. Transport
   * failures retry on a backoff, and immediately whenever the phone comes back
   * online or the guest returns to the tab.
   */
  const attemptRef = useRef<((value: WishDraft) => Promise<void>) | null>(null);
  const inFlight = useRef(false);
  const attempts = useRef(0);
  const retryTimer = useRef<number | null>(null);

  const cancelRetry = useCallback(() => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const attemptSend = useCallback(
    async (payload: WishDraft) => {
      if (inFlight.current) return;
      inFlight.current = true;
      cancelRetry();
      setError(null);
      setStatus(attempts.current === 0 ? 'sending' : 'retrying');

      let httpStatus: number | null = null;
      let serverMessage: string | null = null;

      try {
        const response = await fetch(`/api/events/${event.id}/wishes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: payload.message,
            guestName: payload.guestName,
            isAnonymous: payload.isAnonymous,
            sticker: payload.sticker,
            gif: payload.gif,
            meme: payload.meme,
            selfie: payload.selfie,
            selfiePublic: payload.selfiePublic,
          }),
        });

        httpStatus = response.status;
        const data = (await response.json().catch(() => null)) as
          | { wish: PublicWish; pending: boolean; wall: PublicWish[] }
          | { error: string }
          | null;

        if (response.ok && data && !('error' in data)) {
          clearPendingWish(event.id);
          attempts.current = 0;
          setStatus('idle');

          // Show the guest's own selfie in the animation even though the stored
          // copy stays private — the image is already here in the browser.
          setWall(data.wall);
          setSubmitted({ ...data.wish, selfieUrl: payload.selfie });
          setPendingModeration(data.pending);
          setStep(event.settings.wallEnabled ? 'wall' : 'thanks');
          return;
        }

        serverMessage = data && 'error' in data ? data.error : null;

        // A rejected wish stays rejected however many times we send it, so
        // surface the reason instead of quietly looping.
        if (!isRetryable(httpStatus)) {
          clearPendingWish(event.id);
          attempts.current = 0;
          setStatus('idle');
          setDraft(payload);
          setStep('preview');
          setError(serverMessage ?? 'Your wish could not be sent. Please try again.');
          return;
        }
      } catch {
        // Never reached the server at all — worth another go.
      } finally {
        inFlight.current = false;
      }

      attempts.current += 1;

      /*
       * A server that answered and failed is a different problem from a phone
       * with no signal. Bad reception genuinely comes back, so those retry for
       * as long as the guest keeps the page open — but a broken server will not
       * fix itself while they wait, and leaving them on "Still sending…"
       * forever tells them nothing. After a few tries, say so.
       *
       * The draft stays on the device either way, so the wish is still
       * recovered automatically once the problem is fixed.
       */
      if (httpStatus !== null && attempts.current > MAX_SERVER_RETRIES) {
        setStatus('idle');
        setDraft(payload);
        setStep('preview');
        setError(
          serverMessage ??
            'The Wish Wall is not responding. Your wish is saved — try again in a moment.',
        );
        return;
      }

      savePendingWish(event.id, payload, attempts.current);
      setStatus('retrying');
      retryTimer.current = window.setTimeout(
        () => attemptRef.current?.(payload),
        retryDelay(attempts.current),
      );
    },
    [cancelRetry, event.id, event.settings.wallEnabled],
  );

  useEffect(() => {
    attemptRef.current = attemptSend;
  }, [attemptSend]);

  const send = useCallback(() => {
    savePendingWish(event.id, draft, 0);
    attempts.current = 0;
    void attemptSend(draft);
  }, [attemptSend, draft, event.id]);

  // Resume an unfinished send as soon as there is any reason to hope.
  useEffect(() => {
    const resume = () => {
      if (inFlight.current || status !== 'retrying') return;
      const pending = loadPendingWish(event.id);
      if (pending) void attemptRef.current?.(pending.draft);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') resume();
    };

    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [event.id, status]);

  /*
   * Pick up a wish left unsent by an earlier visit — phone locked, tab evicted,
   * browser restarted. `attemptSend` owns every state change from here,
   * including putting the draft back on screen if the server rejects it, so
   * this only has to hand over the recovered payload.
   */
  useEffect(() => {
    const pending = loadPendingWish(event.id);
    if (!pending) return;
    attempts.current = pending.attempts;
    void attemptSend(pending.draft);
  }, [event.id, attemptSend]);

  useEffect(() => cancelRetry, [cancelRetry]);

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
                sharingOffered={event.settings.publicSelfies}
                selfiePublic={draft.selfiePublic}
                onSelfiePublicChange={(value) => update('selfiePublic', value)}
                onSelfieChange={(value) => update('selfie', value)}
                onContinue={() => setStep('preview')}
                onBack={() => setStep('compose')}
              />
            )}

            {step === 'preview' && (
              <PreviewStep
                theme={theme}
                draft={draft}
                sending={status === 'sending'}
                retrying={status === 'retrying'}
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

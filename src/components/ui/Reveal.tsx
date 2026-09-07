import { cn } from '@/lib/utils';

interface Props extends React.HTMLAttributes<HTMLElement> {
  /** Seconds before this element starts revealing. */
  delay?: number;
  as?: 'div' | 'p' | 'h1' | 'h2' | 'section' | 'footer' | 'button';
  type?: 'button' | 'submit';
  children: React.ReactNode;
}

/**
 * A staggered entrance built on a CSS keyframe rather than a JS animation.
 *
 * The distinction matters on a phone at a venue: a JS-driven fade that never
 * gets a frame leaves the guest staring at a blank screen, whereas a CSS
 * animation still resolves — and collapses to "instantly visible" under
 * prefers-reduced-motion, which globals.css already enforces.
 */
export default function Reveal({ delay = 0, as = 'div', className, children, style, ...rest }: Props) {
  const Tag = as;
  return (
    <Tag
      className={cn('reveal', className)}
      style={{ animationDelay: delay ? `${delay}s` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

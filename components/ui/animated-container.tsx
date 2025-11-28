'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

// Hover scale effect - subtle lift on hover
export interface HoverScaleProps extends HTMLMotionProps<'div'> {
  scale?: number;
  children: React.ReactNode;
}

export function HoverScale({ scale = 1.02, children, className, ...props }: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Hover lift effect - elevate on hover
export interface HoverLiftProps extends HTMLMotionProps<'div'> {
  liftAmount?: number;
  children: React.ReactNode;
}

export function HoverLift({ liftAmount = -4, children, className, ...props }: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y: liftAmount }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Fade in on mount
export interface FadeInProps extends HTMLMotionProps<'div'> {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
}

export function FadeIn({ delay = 0, duration = 0.3, children, className, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Slide in from direction
export interface SlideInProps extends HTMLMotionProps<'div'> {
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
  distance?: number;
  children: React.ReactNode;
}

export function SlideIn({
  direction = 'up',
  delay = 0,
  duration = 0.4,
  distance = 20,
  children,
  className,
  ...props
}: SlideInProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'left':
        return { x: -distance, opacity: 0 };
      case 'right':
        return { x: distance, opacity: 0 };
      case 'up':
        return { y: distance, opacity: 0 };
      case 'down':
        return { y: -distance, opacity: 0 };
    }
  };

  return (
    <motion.div
      initial={getInitialPosition()}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Pulse effect for notifications/updates
export interface PulseProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export function Pulse({ children, className, ...props }: PulseProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Shake effect for errors
export interface ShakeProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  trigger?: boolean;
}

export function Shake({ children, trigger = false, className, ...props }: ShakeProps) {
  const shakeAnimation = {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  };

  return (
    <motion.div
      animate={trigger ? shakeAnimation : {}}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Bounce effect for success/confirmation
export interface BounceProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  trigger?: boolean;
}

export function Bounce({ children, trigger = false, className, ...props }: BounceProps) {
  const bounceAnimation = {
    y: [0, -20, 0],
    transition: {
      duration: 0.5,
      ease: [0.36, 0, 0.66, -0.56],
    },
  };

  return (
    <motion.div
      animate={trigger ? bounceAnimation : {}}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Rotate effect for refresh/loading
export interface RotateProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  spinning?: boolean;
  speed?: number;
}

export function Rotate({ children, spinning = false, speed = 1, className, ...props }: RotateProps) {
  return (
    <motion.div
      animate={spinning ? { rotate: 360 } : {}}
      transition={{
        duration: 1 / speed,
        repeat: spinning ? Infinity : 0,
        ease: 'linear',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Expand/collapse with smooth height animation
export interface ExpandableProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  expanded: boolean;
}

export function Expandable({ children, expanded, className, ...props }: ExpandableProps) {
  return (
    <motion.div
      initial={false}
      animate={{
        height: expanded ? 'auto' : 0,
        opacity: expanded ? 1 : 0,
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn('overflow-hidden', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Spotlight effect on hover
export interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Spotlight({ children, className, ...props }: SpotlightProps) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.1), transparent)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

// Magnetic effect - elements follow cursor slightly
export interface MagneticProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  strength?: number;
}

export function Magnetic({ children, strength = 0.3, className, ...props }: MagneticProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setPosition({
      x: (e.clientX - centerX) * strength,
      y: (e.clientY - centerY) * strength,
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

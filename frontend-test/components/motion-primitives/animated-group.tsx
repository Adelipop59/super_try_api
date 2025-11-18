"use client";

import React, { ComponentPropsWithoutRef, ReactNode } from "react";
import { motion, Variants } from "framer-motion";

type AnimatedGroupProps = {
  children: ReactNode;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: "fade" | "slide" | "scale" | "blur";
  as?: string;
} & Omit<ComponentPropsWithoutRef<typeof motion.div>, 'variants'>;

const defaultVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  },
};

const presets = {
  fade: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  slide: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
  },
  scale: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
    item: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
    },
  },
  blur: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
    item: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      visible: { opacity: 1, filter: "blur(0px)" },
    },
  },
};

export function AnimatedGroup({
  children,
  variants,
  className,
  preset,
  as = "div",
  ...props
}: AnimatedGroupProps) {
  const MotionComponent = motion[as as keyof typeof motion] as typeof motion.div;

  const selectedVariants = variants || (preset ? presets[preset] : defaultVariants);
  const containerVariants = variants?.container || (preset ? presets[preset]?.container : defaultVariants.container);

  return (
    <MotionComponent
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

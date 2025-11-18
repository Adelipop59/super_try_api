"use client";

import { motion, Variants } from "framer-motion";
import { ComponentPropsWithoutRef, ReactNode, useMemo } from "react";

type TextEffectProps = {
  children: string;
  per?: "word" | "char" | "line";
  as?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?:
    | "blur"
    | "shake"
    | "scale"
    | "fade"
    | "slide"
    | "fade-in-blur";
  delay?: number;
  speedSegment?: number;
  trigger?: boolean;
} & ComponentPropsWithoutRef<typeof motion.div>;

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
  },
};

function getPresetVariants(preset: TextEffectProps["preset"]): {
  container: Variants;
  item: Variants;
} {
  switch (preset) {
    case "blur":
      return {
        container: defaultContainerVariants,
        item: {
          hidden: { opacity: 0, filter: "blur(12px)" },
          visible: { opacity: 1, filter: "blur(0px)" },
        },
      };
    case "shake":
      return {
        container: defaultContainerVariants,
        item: {
          hidden: { x: 0 },
          visible: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.5 } },
        },
      };
    case "scale":
      return {
        container: defaultContainerVariants,
        item: {
          hidden: { opacity: 0, scale: 0 },
          visible: { opacity: 1, scale: 1 },
        },
      };
    case "fade":
      return {
        container: defaultContainerVariants,
        item: {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        },
      };
    case "slide":
      return {
        container: defaultContainerVariants,
        item: {
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        },
      };
    case "fade-in-blur":
      return {
        container: {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
            },
          },
        },
        item: {
          hidden: { opacity: 0, filter: "blur(12px)" },
          visible: {
            opacity: 1,
            filter: "blur(0px)",
            transition: {
              duration: 0.8,
            }
          },
        },
      };
    default:
      return {
        container: defaultContainerVariants,
        item: defaultItemVariants,
      };
  }
}

export function TextEffect({
  children,
  per = "word",
  as = "p",
  variants,
  className,
  preset,
  delay = 0,
  speedSegment = 0.05,
  trigger = true,
  ...props
}: TextEffectProps) {
  const MotionComponent = motion[as as keyof typeof motion] as typeof motion.div;
  const presetVariants = preset ? getPresetVariants(preset) : undefined;

  const containerVariants: Variants = variants?.container || presetVariants?.container || defaultContainerVariants;
  const itemVariants: Variants = variants?.item || presetVariants?.item || defaultItemVariants;

  const modifiedContainerVariants = useMemo(() => {
    if (delay > 0 && containerVariants.visible) {
      return {
        ...containerVariants,
        visible: {
          ...(typeof containerVariants.visible === 'object' ? containerVariants.visible : {}),
          transition: {
            ...(typeof containerVariants.visible === 'object' && containerVariants.visible.transition ? containerVariants.visible.transition : {}),
            staggerChildren: speedSegment,
            delayChildren: delay,
          },
        },
      };
    }
    return containerVariants;
  }, [containerVariants, delay, speedSegment]);

  const segments = useMemo(() => {
    if (per === "line") {
      return children.split("\n");
    }
    return children.split(per === "word" ? " " : "");
  }, [children, per]);

  return (
    <MotionComponent
      initial="hidden"
      animate={trigger ? "visible" : "hidden"}
      aria-label={children}
      variants={modifiedContainerVariants}
      className={className}
      {...props}
    >
      {segments.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          variants={itemVariants}
          style={{
            display: per === "line" ? "block" : "inline-block",
            whiteSpace: per === "line" ? "normal" : "pre",
          }}
        >
          {segment}
          {per === "word" && index < segments.length - 1 && " "}
        </motion.span>
      ))}
    </MotionComponent>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (otp: string) => void;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  onComplete,
}: OtpInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Split string into array of characters
  const digits = React.useMemo(() => {
    const chars = value.split("");
    return Array.from({ length }, (_, i) => chars[i] || "");
  }, [value, length]);

  React.useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    const char = val.slice(-1); // get last entered character

    if (char && !/^\d$/.test(char)) return; // numbers only

    const newDigits = [...digits];
    newDigits[index] = char;
    const newOtp = newDigits.join("");
    onChange(newOtp);

    // Auto advance to next box
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.length === length && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    const numeric = pasted.replace(/\D/g, "").slice(0, length);
    if (!numeric) return;

    onChange(numeric);
    const targetIdx = Math.min(numeric.length, length - 1);
    inputRefs.current[targetIdx]?.focus();

    if (numeric.length === length && onComplete) {
      onComplete(numeric);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i]}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={cn(
            "h-12 w-10 sm:h-14 sm:w-12 rounded-xl text-center text-xl sm:text-2xl font-mono font-extrabold transition-all border outline-none select-none",
            digits[i]
              ? "bg-purple-950/40 border-purple-500 text-purple-200 shadow-md shadow-purple-900/30 ring-2 ring-purple-500/20"
              : "bg-background/80 border-border/80 text-foreground focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

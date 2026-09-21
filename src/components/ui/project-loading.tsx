"use client";

import { useEffect, useState } from "react";

interface ProjectLoadingProps {
  onComplete: () => void;
}

// Module scope: stable across renders so the interval effect below never
// re-runs spuriously (they are pure constants).
const steps = [
  "Understanding your prompt...",
  "Analyzing requirements...",
  "Planning project structure...",
  "Setting up Next.js framework...",
  "Generating initial code...",
  "Creating components...",
  "Configuring project files...",
  "Finalizing setup..."
];

const activities = [
  "🧠 Processing natural language...",
  "📋 Breaking down requirements...",
  "🏗️ Designing architecture...",
  "⚛️ Setting up React components...",
  "🎨 Applying UI patterns...",
  "📁 Creating file structure...",
  "🔧 Configuring TypeScript...",
  "📦 Installing dependencies...",
  "🎯 Optimizing for performance...",
  "✨ Adding interactive features..."
];

export const ProjectLoading = ({ onComplete }: ProjectLoadingProps) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [backgroundActivity, setBackgroundActivity] = useState("");

  useEffect(() => {
    console.log("ProjectLoading component mounted");
    
    // Progress animation (3.5 seconds total)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          console.log("Progress completed, calling onComplete");
          clearInterval(progressInterval);
          setTimeout(() => onComplete(), 0);
          return 100;
        }
        return prev + (100 / 87.5); // 3.5 seconds = 87.5 intervals of 40ms
      });
    }, 40);

    // Step progression (every 440ms for 8 steps in 3.5 seconds)
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          return steps.length - 1;
        }
        return prev + 1;
      });
    }, 440);

    // Background activity (every 500ms)
    const activityInterval = setInterval(() => {
      setBackgroundActivity(activities[Math.floor(Math.random() * activities.length)]);
    }, 500);

    return () => {
      console.log("ProjectLoading component unmounting");
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearInterval(activityInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Neutral Loader Icon (brand-matching, no purple/blue) */}
        <div className="relative flex items-center justify-center">
          {/* Outer rotating ring */}
          <div className="w-20 h-20 border-4 border-transparent border-t-white/80 border-r-white/40 rounded-full animate-spin"></div>

          {/* Inner pulsing circle */}
          <div className="absolute w-12 h-12 bg-white/15 rounded-full animate-pulse"></div>

          {/* Center dot */}
          <div className="absolute w-4 h-4 bg-white/90 rounded-full animate-ping"></div>
        </div>

        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Initializing your project
          </h2>
          <p className="text-white/80 text-lg">
            {steps[currentStep]}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 mx-auto">
          <div className="h-3 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-text-secondary text-sm">
              {Math.round(progress)}%
            </p>
            <p className="text-text-secondary text-sm">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>

        {/* Background Activity */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-text-secondary text-sm font-mono">
              {backgroundActivity}
            </p>
          </div>
        </div>

        {/* Animated Dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
};

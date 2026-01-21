/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-6">
      <div className="container mx-auto px-4 text-center text-sm">
        <p className="flex items-center justify-center gap-2 text-muted-foreground">
          © 2025. Built with{' '}
          <Heart className="h-4 w-4 fill-red-500 text-red-500" /> using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}


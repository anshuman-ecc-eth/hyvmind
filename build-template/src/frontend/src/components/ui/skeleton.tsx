/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="skeleton" className={cn('bg-accent animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };

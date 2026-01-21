/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(false);
    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth < breakpoint);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [breakpoint]);
    return isMobile;
}

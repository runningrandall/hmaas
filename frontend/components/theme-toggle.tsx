'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

const modes = ['light', 'dark', 'system'] as const;
const icons = { light: Sun, dark: Moon, system: Monitor };

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (!mounted) return <Button variant="ghost" size="icon" className="h-8 w-8" disabled />;

    const current = (theme ?? 'system') as (typeof modes)[number];
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    const Icon = icons[current];

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(next)}
            title={`Theme: ${current} (click for ${next})`}
        >
            <Icon className="h-4 w-4" />
            <span className="sr-only">Toggle theme ({current})</span>
        </Button>
    );
}

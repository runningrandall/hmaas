"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePicker12HourProps {
    value: string; // "HH:mm" (24h format)
    onChange: (value: string) => void;
    className?: string;
    id?: string;
}

export function TimePicker12Hour({
    value,
    onChange,
    className,
    id,
}: TimePicker12HourProps) {
    // Parse initial 24h value to 12h components
    const parseTime = (val: string) => {
        if (!val) return { hour: "12", minute: "00", ampm: "AM" };
        const [hStr, mStr] = val.split(":");
        let h = parseInt(hStr, 10);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const m = parseInt(mStr, 10);

        const ampm = h >= 12 ? "PM" : "AM";
        if (h > 12) h -= 12;
        if (h === 0) h = 12;

        return {
            hour: h.toString(),
            minute: mStr || "00",
            ampm,
        };
    };

    const [timeState, setTimeState] = React.useState(parseTime(value));

    // Sync state if value prop changes externally (e.g. reset form)
    React.useEffect(() => {
        setTimeState(parseTime(value));
    }, [value]);

    const handleChange = (part: "hour" | "minute" | "ampm", newVal: string) => {
        const newState = { ...timeState, [part]: newVal };
        setTimeState(newState);

        // Convert back to 24h for onChange
        let hInt = parseInt(newState.hour, 10);
        if (newState.ampm === "PM" && hInt !== 12) hInt += 12;
        if (newState.ampm === "AM" && hInt === 12) hInt = 0;

        const hStr = hInt.toString().padStart(2, "0");
        const mStr = newState.minute.padStart(2, "0");

        onChange(`${hStr}:${mStr}`);
    };

    // Generate options
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0")); // 5 min increments

    return (
        <div className={cn("flex items-center space-x-2", className)} id={id}>
            <div className="relative flex-1 min-w-[70px]">
                <select
                    value={timeState.hour}
                    onChange={(e) => handleChange("hour", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Select hour"
                >
                    {hours.map((h) => (
                        <option key={h} value={h}>
                            {h}
                        </option>
                    ))}
                </select>
            </div>
            <span className="text-muted-foreground">:</span>
            <div className="relative flex-1 min-w-[70px]">
                <select
                    value={timeState.minute}
                    onChange={(e) => handleChange("minute", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Select minute"
                >
                    {minutes.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
            </div>
            <div className="relative flex-1 min-w-[70px]">
                <select
                    value={timeState.ampm}
                    onChange={(e) => handleChange("ampm", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Select AM/PM"
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
            <Clock className="h-4 w-4 text-white ml-2" />
        </div>
    );
}

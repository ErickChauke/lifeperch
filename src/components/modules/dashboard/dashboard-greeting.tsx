"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

// Returns a time-of-day greeting word for the given hour.
function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Dashboard masthead: live date eyebrow + time-aware greeting headline.
// Server passes initial values (so SSR and first client render match), then
// the client corrects to the visitor's local time after mount.
export function DashboardGreeting({
  name,
  initialDate,
  initialGreeting,
}: {
  name: string;
  initialDate: string;
  initialGreeting: string;
}) {
  const [state, setState] = useState({
    date: initialDate,
    greeting: initialGreeting,
  });

  useEffect(() => {
    const now = new Date();
    setState({
      date: format(now, "EEEE d MMMM").toUpperCase(),
      greeting: greetingFor(now.getHours()),
    });
  }, []);

  return (
    <>
      <p className="text-fg-3 font-mono text-xs tracking-[0.04em]">
        {state.date}
      </p>
      <h2 className="mt-3 text-[36px] leading-[1.12] font-semibold tracking-[-0.03em]">
        {state.greeting}, {name}.
        <br />
        Your day is <span className="text-accent-read">a clean page.</span>
      </h2>
    </>
  );
}

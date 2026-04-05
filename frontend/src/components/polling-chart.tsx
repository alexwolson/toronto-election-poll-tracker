"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PollingChartProps {
  data: Record<string, string | number>[];
  candidates: string[];
}

const COLORS: Record<string, string> = {
  chow: "#2563eb",
  bradford: "#dc2626",
  bailao: "#16a34a",
  furey: "#9333ea",
  tory: "#2dd4bf",
  matlow: "#f97316",
  mendicino: "#64748b",
  ford: "#0ea5e9",
  saunders: "#4f46e5",
  hunter: "#be185d"
};

const DEFAULT_COLOR = "#94a3b8";

export function PollingChart({ data, candidates }: PollingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 60]} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        <Legend />
        {candidates.map((c) => (
          <Line
            key={c}
            type="monotone"
            dataKey={c}
            stroke={COLORS[c] || DEFAULT_COLOR}
            name={c.charAt(0).toUpperCase() + c.slice(1)}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

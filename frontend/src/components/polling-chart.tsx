"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PollingChartProps {
  data: Record<string, string | number>[];
}

export function PollingChart({ data }: PollingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}%` : `${v}%`} />
        <Legend />
        <Line type="monotone" dataKey="chow" stroke="#2563eb" name="Chow" />
        <Line type="monotone" dataKey="bradford" stroke="#dc2626" name="Bradford" />
        <Line type="monotone" dataKey="bailao" stroke="#16a34a" name="Bailao" />
      </LineChart>
    </ResponsiveContainer>
  );
}
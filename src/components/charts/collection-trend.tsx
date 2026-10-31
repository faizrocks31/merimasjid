"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaise } from "@/lib/money";

export function CollectionTrend({ data }: { data: { label: string; grossPaise: number; netPaise: number }[] }) {
  const chartData = data.map((d) => ({
    label: d.label,
    gross: d.grossPaise / 100,
    net: d.netPaise / 100,
  }));

  return (
    <div className="h-56 w-full" role="img" aria-label="Collection trend for the last six months">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f5132" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#0f5132" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e1d8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5c6b62" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#5c6b62" }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v: number) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
          />
          <Tooltip
            formatter={(value, name) => [
              formatPaise(Math.round(Number(value ?? 0) * 100)),
              name === "gross" ? "Gross" : "Net",
            ]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e3e1d8", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="gross" stroke="#0f5132" strokeWidth={2} fill="url(#grossFill)" />
          <Area type="monotone" dataKey="net" stroke="#a1791f" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

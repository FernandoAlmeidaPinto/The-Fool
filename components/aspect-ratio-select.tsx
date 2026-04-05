"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { label: "2:3 (Tarot padrão)", value: "2/3" },
  { label: "3:4", value: "3/4" },
  { label: "4:5", value: "4/5" },
  { label: "1:1 (Quadrado)", value: "1/1" },
];

interface AspectRatioSelectProps {
  defaultValue?: string;
}

export function AspectRatioSelect({ defaultValue = "2/3" }: AspectRatioSelectProps) {
  const isPreset = PRESETS.some((p) => p.value === defaultValue);
  const [mode, setMode] = useState<"preset" | "custom">(isPreset ? "preset" : "custom");
  const [presetValue, setPresetValue] = useState(isPreset ? defaultValue : "2/3");

  const defaultParts = defaultValue.split("/");
  const [customW, setCustomW] = useState(isPreset ? "" : (defaultParts[0] ?? ""));
  const [customH, setCustomH] = useState(isPreset ? "" : (defaultParts[1] ?? ""));

  const isCustomValid = mode === "custom" && customW && customH;
  const hiddenValue = mode === "preset" ? presetValue : (isCustomValid ? `${customW}/${customH}` : "");

  return (
    <div className="space-y-2">
      <Label htmlFor="aspectMode">Proporção das Cartas</Label>
      <input type="hidden" name="cardAspectRatio" value={hiddenValue} />
      <select
        id="aspectMode"
        value={mode === "preset" ? presetValue : "custom"}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "custom") {
            setMode("custom");
          } else {
            setMode("preset");
            setPresetValue(val);
          }
        }}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
        <option value="custom">Personalizado</option>
      </select>
      {mode === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            required
            placeholder="Largura"
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
            className="w-24"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            min="1"
            required
            placeholder="Altura"
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            className="w-24"
          />
        </div>
      )}
    </div>
  );
}

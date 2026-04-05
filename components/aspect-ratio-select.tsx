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

// 1 cm ≈ 37.8 px at 96 DPI
const CM_TO_PX = 37.8;

function cmToPx(cm: number): number {
  return Math.round(cm * CM_TO_PX);
}

interface AspectRatioSelectProps {
  defaultValue?: string;
}

export function AspectRatioSelect({ defaultValue = "2/3" }: AspectRatioSelectProps) {
  const isPreset = PRESETS.some((p) => p.value === defaultValue);
  const [mode, setMode] = useState<"preset" | "custom">(isPreset ? "preset" : "custom");
  const [presetValue, setPresetValue] = useState(isPreset ? defaultValue : "2/3");
  const [unit, setUnit] = useState<"px" | "cm">("px");

  const defaultParts = defaultValue.split("/");
  const [customW, setCustomW] = useState(isPreset ? "" : (defaultParts[0] ?? ""));
  const [customH, setCustomH] = useState(isPreset ? "" : (defaultParts[1] ?? ""));

  function getHiddenValue(): string {
    if (mode === "preset") return presetValue;
    if (!customW || !customH) return "";

    const w = Number(customW);
    const h = Number(customH);
    if (!w || !h) return "";

    if (unit === "cm") {
      return `${cmToPx(w)}/${cmToPx(h)}`;
    }
    return `${w}/${h}`;
  }

  const hiddenValue = getHiddenValue();

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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              step={unit === "cm" ? "0.1" : "1"}
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
              step={unit === "cm" ? "0.1" : "1"}
              required
              placeholder="Altura"
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              className="w-24"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "px" | "cm")}
              className="h-9 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
            >
              <option value="px">px</option>
              <option value="cm">cm</option>
            </select>
          </div>
          {unit === "cm" && customW && customH && (
            <p className="text-xs text-muted-foreground">
              Convertido: {cmToPx(Number(customW))} × {cmToPx(Number(customH))} px
            </p>
          )}
        </div>
      )}
    </div>
  );
}

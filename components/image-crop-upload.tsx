"use client";

import { useState, useRef } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageCropUploadProps {
  name: string;
  aspectRatio: number; // e.g. 2/3 = 0.6667
  required?: boolean;
  currentImage?: string | null;
  label?: string;
  circular?: boolean;
}

export function ImageCropUpload({
  name,
  aspectRatio,
  required = false,
  currentImage = null,
  label = "Imagem",
  circular = false,
}: ImageCropUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Formato inválido. Use JPEG, PNG ou WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCroppedBlob(null);
      setCroppedPreview(null);
    };
    reader.readAsDataURL(file);
  }

  function applyCrop() {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
      width: 600,
      height: Math.round(600 / aspectRatio),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCroppedBlob(blob);
        setCroppedPreview(URL.createObjectURL(blob));

        // Put the cropped blob into a DataTransfer to set on the hidden file input
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        const dt = new DataTransfer();
        dt.items.add(file);
        if (hiddenInputRef.current) {
          hiddenInputRef.current.files = dt.files;
        }
      },
      "image/jpeg",
      0.9
    );
  }

  function reset() {
    setImageSrc(null);
    setCroppedBlob(null);
    setCroppedPreview(null);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Current image (edit mode) */}
      {currentImage && !imageSrc && !croppedPreview && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Imagem atual:</p>
          
        </div>
      )}

      {/* File picker */}
      {!croppedPreview && (
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
      )}

      {/* Cropper */}
      {imageSrc && !croppedPreview && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Ajuste a área de corte e clique em &quot;Recortar&quot;.</p>
          <div className={`max-w-lg border border-border rounded-md overflow-hidden ${circular ? "[&_.cropper-view-box]:rounded-full [&_.cropper-face]:rounded-full" : ""}`}>
            <Cropper
              ref={cropperRef}
              src={imageSrc}
              style={{ height: 400, width: "100%" }}
              aspectRatio={aspectRatio}
              guides={!circular}
              viewMode={1}
              minCropBoxHeight={50}
              minCropBoxWidth={50}
              background={false}
              responsive={true}
              autoCropArea={1}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={applyCrop}>
              Recortar
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Cropped preview */}
      {croppedPreview && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Imagem recortada:</p>

          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Escolher outra imagem
          </Button>
        </div>
      )}

      {/* Hidden file input that carries the cropped image to the form */}
      <input
        ref={hiddenInputRef}
        type="file"
        name={name}
        required={required && !currentImage}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. Máximo 5MB.</p>
    </div>
  );
}

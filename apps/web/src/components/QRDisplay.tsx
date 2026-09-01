import { QRCodeSVG } from "qrcode.react";

interface QRDisplayProps {
  url: string;
  size?: number;
}

export function QRDisplay({ url, size = 200 }: QRDisplayProps) {
  return (
    <div className="rounded-2xl bg-white p-4 inline-block shadow-lg">
      <QRCodeSVG value={url} size={size} level="M" includeMargin />
    </div>
  );
}

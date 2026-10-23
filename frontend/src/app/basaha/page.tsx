// Feature: ayasib-ocr-lens (Tier 1)
// Basaha: capture/upload a photo, scan it, and show the Bisaya translation over the image.
import { Shell } from "@/components/Shell";
import { PhotoLens } from "@/components/PhotoLens";
import { FooterNote } from "@/components/FooterNote";
import { photoText as p } from "@/lib/photoStrings";

export default function PhotoPage() {
  return (
    <Shell title={p.lensTitle}>
      <main>
        <h1 className="page-title">{p.lensTitle}</h1>
        <PhotoLens />
        <FooterNote />
      </main>
    </Shell>
  );
}

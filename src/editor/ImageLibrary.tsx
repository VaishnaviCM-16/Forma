import { useRef, useState } from "react";
import {
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  Search,
  Upload,
  X,
} from "lucide-react";

export interface ImageCredit {
  creator?: string;
  license?: string;
  licenseUrl?: string;
  source?: string;
}
export interface InsertedImage extends ImageCredit {
  dataUrl: string;
  name: string;
}
interface CommonsItem {
  title: string;
  thumb: string;
  original: string;
  page: string;
  creator: string;
  license: string;
  licenseUrl: string;
}
const MAX_BYTES = 390 * 1024;
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

async function compactImage(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error(
        "This image has too many pixels to safely process. Choose an image under 40 megapixels.",
      );
    let scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser cannot process this image.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const encoded = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error("This image could not be processed.")),
          "image/jpeg",
          Math.max(0.42, 0.84 - attempt * 0.06),
        ),
      );
      if (encoded.size <= MAX_BYTES)
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("Image encoding failed."));
          reader.onerror = () => reject(new Error("Image encoding failed."));
          reader.readAsDataURL(encoded);
        });
      scale *= 0.78;
    }
    throw new Error(
      "This image is too detailed to share. Choose a smaller image (maximum 390 KiB after compression).",
    );
  } finally {
    bitmap.close();
  }
}

function meta(value?: string) {
  return (
    value
      ?.replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  );
}
async function searchCommons(query: string): Promise<CommonsItem[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "420",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`${COMMONS_API}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(
      "Wikimedia Commons image search is temporarily unavailable.",
    );
  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title: string;
          fullurl?: string;
          imageinfo?: Array<{
            thumburl?: string;
            url?: string;
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }
      >;
    };
  };
  return Object.values(data.query?.pages ?? {}).flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.url) return [];
    const ext = info.extmetadata ?? {};
    return [
      {
        title: page.title.replace(/^File:/, ""),
        thumb: info.thumburl,
        original: info.url,
        page:
          page.fullurl ??
          `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
        creator:
          meta(ext.Artist?.value || ext.Credit?.value) || "Creator not listed",
        license: meta(ext.LicenseShortName?.value) || "License not listed",
        licenseUrl: ext.LicenseUrl?.value ?? "",
      },
    ];
  });
}

export default function ImageLibrary({
  onInsert,
}: {
  onInsert: (image: InsertedImage) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommonsItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Choose an image smaller than 15 MiB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const dataUrl = await compactImage(file);
      onInsert({
        dataUrl,
        name:
          file.name.replace(/[\x00-\x1f/\\]/g, "").slice(0, 90) ||
          "Uploaded image",
        source: "Local upload",
      });
      setNotice(
        "Image added to this live session. It is shared with anyone using this room link.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The image could not be processed.",
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError("Enter at least two search characters.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const found = await searchCommons(query.trim());
      setResults(found);
      if (!found.length)
        setNotice("No image results found. Try different search terms.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  };
  const addCommons = async (item: CommonsItem) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(item.thumb, {
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok)
        throw new Error("This image could not be downloaded from Commons.");
      const image = await compactImage(await response.blob());
      onInsert({
        dataUrl: image,
        name: item.title.slice(0, 90),
        creator: item.creator,
        license: item.license,
        licenseUrl: item.licenseUrl,
        source: item.page,
      });
      setNotice("Image added with its visible source and license attribution.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image import failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        className="image-library-trigger"
        onClick={() => setOpen(true)}
        title="Upload or search open-licensed images"
      >
        <ImagePlus size={15} />
        <span>Images</span>
      </button>
      {open && (
        <div className="image-panel-scrim" onClick={() => setOpen(false)}>
          <section
            className="image-library-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-library-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="image-panel-header">
              <div>
                <span className="eyebrow">LIVE SESSION MEDIA</span>
                <h2 id="image-library-title">Add an image.</h2>
                <p>
                  Image content is compressed and shared with this guest room in
                  memory; it will not survive a server restart.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Close image library"
              >
                <X size={17} />
              </button>
            </header>
            <div className="upload-zone">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) =>
                  void upload(event.currentTarget.files?.[0])
                }
              />
              <Upload size={18} />
              <strong>Upload from your device</strong>
              <span>
                JPEG, PNG or WebP · compressed to 390 KiB max for live sharing
              </span>
              <button
                className="button-secondary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={14} /> Processing…
                  </>
                ) : (
                  "Choose image"
                )}
              </button>
            </div>
            <div className="media-divider">
              <span>OR SEARCH WIKIMEDIA COMMONS</span>
            </div>
            <form
              className="commons-search"
              onSubmit={(event) => void search(event)}
            >
              <Search size={16} />
              <input
                value={query}
                maxLength={100}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find an open image"
                aria-label="Search Wikimedia Commons"
              />
              <button disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={15} /> : "Search"}
              </button>
            </form>
            {error && (
              <p className="form-error media-message" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="form-success media-message" role="status">
                {notice}
              </p>
            )}
            <div className="commons-results">
              {results.map((item) => (
                <article key={item.page} className="commons-result">
                  <a
                    href={item.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="commons-thumb"
                    aria-label={`View ${item.title} source`}
                  >
                    <img src={item.thumb} alt="" loading="lazy" />
                  </a>
                  <div className="commons-result-info">
                    <a
                      href={item.page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="commons-result-title"
                    >
                      {item.title}
                      <ExternalLink size={12} />
                    </a>
                    <span>By {item.creator}</span>
                    <span>{item.license}</span>
                    {item.licenseUrl && (
                      <a
                        href={item.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="license-link"
                      >
                        Review license
                      </a>
                    )}
                  </div>
                  <button
                    className="button-secondary commons-add"
                    disabled={busy}
                    onClick={() => void addCommons(item)}
                  >
                    Add
                  </button>
                </article>
              ))}
            </div>
            <footer className="image-panel-footer">
              Commons metadata is supplied by contributors; verify licensing for
              your use. Images are ephemeral, room-shared payloads—not cloud
              storage.{" "}
              <a
                href="https://commons.wikimedia.org/wiki/Commons:Licensing"
                target="_blank"
                rel="noopener noreferrer"
              >
                Licensing guide
              </a>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

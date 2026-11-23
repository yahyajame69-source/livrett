import BookMockup from "./BookMockup";

const SAFE_DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;

function getSafeCoverUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (SAFE_DATA_IMAGE_RE.test(trimmed)) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed);
    if (u.protocol === "https:" || u.protocol === "http:") {
      return u.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export default function ProductCard({ product }: { product: any }) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_ORDER_NUMBER || "25377840307";
  const message = encodeURIComponent(
    `Bonjour, je souhaite commander : ${product.title} (prix : ${product.price} ${product.currency || "DJF"}).`
  );
  const safeCover = getSafeCoverUrl(product.cover_url);

  return (
    <article className="product">
      <div className="coverStage">
        <BookMockup title={product.title} coverUrl={safeCover} />
      </div>
      <h3>{product.title}</h3>
      <p className="muted">{product.description || "Un livre merveilleux à découvrir."}</p>
      <p className="muted">Âge conseillé : {product.age_range || "À découvrir"}</p>
      <div className="price">
        {Number(product.price).toLocaleString("fr-FR")} {product.currency || "DJF"}
      </div>
      <div className="productActions">
        <a
          className="btn"
          target="_blank"
          rel="noreferrer"
          href={`https://wa.me/${number}?text=${message}`}
        >
          Commander sur WhatsApp
        </a>
      </div>
    </article>
  );
}
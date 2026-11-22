import BookMockup from "./BookMockup";

function getSafeImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol === "https:" || u.protocol === "http:") {
      return u.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export default function ProductCard({ product }: { product: any }) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "25377531900";
  const message = encodeURIComponent(
    `Bonjour, je souhaite commander : ${product.title} (prix : ${product.price} ${product.currency || "DJF"}).`
  );
  const safeCover = getSafeImageUrl(product.cover_url);

  return (
    <article className="product">
      <div className="coverStage">
        {safeCover ? (
          <img
            src={safeCover}
            alt={product.title}
            referrerPolicy="no-referrer"
            style={{
              height: "90%",
              maxWidth: "90%",
              objectFit: "contain",
              filter: "drop-shadow(10px 12px 10px #0003)",
            }}
          />
        ) : (
          <BookMockup title={product.title} />
        )}
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
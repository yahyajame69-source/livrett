import BookCoverImage from "./BookCoverImage";

export default function BookMockup({
  title = "Le petit papillon doré",
  subtitle = "Une histoire merveilleuse",
  coverUrl,
}: {
  title?: string;
  subtitle?: string;
  coverUrl?: string | null;
}) {
  return (
    <div className="book3d" aria-label={`Couverture 3D : ${title}`}>
      <div className="bookBack" />
      <div className="bookSpine">
        <span className="bookSpineTitle">{title}</span>
      </div>
      <div className="bookPages" />
      <div className="bookTopPages" />
      <div className={coverUrl ? "bookCover hasImage" : "bookCover"}>
        {coverUrl ? (
          <BookCoverImage src={coverUrl} title={title} subtitle={subtitle} />
        ) : (
          <div className="bookCoverFallback">
            <small>✦ LE MONDE DES PETITS LIVRES ✦</small>
            <strong>{title}</strong>
            <span style={{ fontSize: 44 }}>🦋</span>
            <small>{subtitle}</small>
          </div>
        )}
      </div>
    </div>
  );
}
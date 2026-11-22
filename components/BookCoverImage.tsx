"use client";

import { useState } from "react";

export default function BookCoverImage({
  src,
  title,
  subtitle,
}: {
  src: string;
  title: string;
  subtitle: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="bookCoverFallback">
        <small>✦ LE MONDE DES PETITS LIVRES ✦</small>
        <strong>{title}</strong>
        <span style={{ fontSize: 42 }}>🦋</span>
        <small>{subtitle}</small>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Couverture : ${title}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="bookCoverImg"
    />
  );
}

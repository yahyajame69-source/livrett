"use client";

import { useEffect, useState } from "react";
import type { AuthorProfile } from "@/lib/author-defaults";

export default function AuthorShowcase3D({
  author,
  compact = false,
}: {
  author: Pick<AuthorProfile, "name" | "role" | "bio" | "photo_url">;
  compact?: boolean;
}) {
  const [tilt, setTilt] = useState({ rx: 4, ry: -9, gx: 50, gy: 35, active: false });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [author.photo_url]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 20;
    const rx = (0.5 - py) * 16;
    setTilt({
      rx,
      ry,
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 4, ry: -9, gx: 50, gy: 35, active: false });
  };

  const initials = author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className={compact ? "authorStage authorStageCompact" : "authorStage"}>
      <div
        className={tilt.active ? "authorCard3d isTilting" : "authorCard3d"}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
      >
        <div className="authorCardBack" aria-hidden="true" />
        <div className="authorCardEdgeRight" aria-hidden="true" />
        <div className="authorCardEdgeBottom" aria-hidden="true" />
        <div className="authorCardFrame">
          <div className="authorPhotoWrap">
            {author.photo_url && !imgFailed ? (
              <img
                src={author.photo_url}
                alt={`Portrait de ${author.name}`}
                className="authorPhotoImg"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="authorPhotoFallback" aria-hidden="true">
                <span>{initials || "AM"}</span>
              </div>
            )}
            <div
              className="authorSheen"
              style={{
                background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,250,240,.32), rgba(230,184,92,.08) 38%, transparent 68%)`,
              }}
              aria-hidden="true"
            />
          </div>
          <div className="authorCaption">
            <div className="authorRole">{author.role || "Auteur & Éditeur"}</div>
            <h2 className="authorName">{author.name}</h2>
            <p className="authorBio">{author.bio}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

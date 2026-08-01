import type { ReactNode } from "react";

interface DisplaySectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function DisplaySection({
  title,
  description,
  children,
  className = "",
}: DisplaySectionProps) {
  return (
    <section className={`bookshop-display-section ${className}`.trim()}>
      {title || description ? (
        <header className="bookshop-display-section-heading">
          {title ? <h2 className="bookshop-display-section-title">{title}</h2> : null}
          {description ? (
            <p className="bookshop-display-section-description">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="bookshop-display-section-body">{children}</div>
    </section>
  );
}

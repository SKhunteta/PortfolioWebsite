import Paragraph from "./Paragraph";
import {
  BOOK_AUTHOR,
  BOOK_TITLE,
  EXCERPT,
  EXCERPT_TITLE,
} from "./constants";

const ExcerptReader = ({ registerParagraph }) => (
  <article className="max-w-prose mx-auto px-5 sm:px-6">
    <header className="text-center mb-12">
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-mr-text-muted mb-4">
        Excerpt · Act One
      </p>
      <h1 className="font-serif text-3xl sm:text-4xl text-mr-text mb-3">
        {BOOK_TITLE}
      </h1>
      <p className="font-sans text-sm text-mr-text-secondary mb-6">
        a novel by {BOOK_AUTHOR}
      </p>
      <h2 className="font-serif-atlas italic text-lg sm:text-xl text-mr-text-secondary">
        1. {EXCERPT_TITLE}
      </h2>
    </header>

    <div className="space-y-6">
      {EXCERPT.map((paragraph) => (
        <Paragraph
          key={paragraph.id}
          ref={registerParagraph(paragraph.id)}
          paragraph={paragraph}
        />
      ))}
    </div>
  </article>
);

export default ExcerptReader;

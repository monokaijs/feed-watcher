import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Pre-process content to handle Facebook-specific elements and fix the issues
  const preprocessContent = (text: string): string => {
    // Step 1: Protect markdown links from auto-link processing
    const markdownLinks: { linkText: string; url: string }[] = [];
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const placeholder = `__MARKDOWN_LINK_${markdownLinks.length}__`;
      markdownLinks.push({ linkText, url });
      return placeholder;
    });

    // Step 2: Handle auto-links (now safe from markdown links)
    text = text.replace(/https?:\/\/[^\s<>"]+/g, (url) => {
      return `[${url}](${url})`;
    });

    // Step 3: Handle Facebook mentions (@username) - convert to bold for styling
    text = text.replace(/@([a-zA-Z0-9._]+)/g, '**@$1**');

    // Step 4: Handle hashtags (#hashtag) - but only if not at start of line (to avoid conflicts with headers)
    // Match hashtags that are not at the beginning of a line or after # (to avoid markdown headers)
    text = text.replace(/(\s|^)#([a-zA-Z0-9_]+)(?=\s|$|[^\w])/g, (match, prefix, hashtag) => {
      // Only convert to bold if it's not a markdown header (headers have space after #)
      return `${prefix}**#${hashtag}**`;
    });

    // Step 5: Restore markdown links
    markdownLinks.forEach((link, index) => {
      text = text.replace(`__MARKDOWN_LINK_${index}__`, `[${link.linkText}](${link.url})`);
    });

    return text;
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for different elements
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 mt-5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium mb-2 mt-3">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-medium mb-2 mt-2">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-medium mb-2 mt-2">{children}</h6>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-muted/50 px-1 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="text-sm font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4 bg-muted/50 rounded-lg p-4 overflow-x-auto">
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-6 border-border" />
          ),
          strong: ({ children }) => {
            const text = children?.toString() || '';
            // Check if this is a mention or hashtag
            if (text.startsWith('@') || text.startsWith('#')) {
              return (
                <a className="text-primary font-medium cursor-pointer" href={`https://www.facebook.com/hashtag/${text.replace('#', '')}`} target={'_blank'}>{children}</a>
              );
            }
            return <strong className="font-semibold">{children}</strong>;
          },
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          del: ({ children }) => (
            <del className="line-through">{children}</del>
          ),
        }}
      >
        {preprocessContent(content)}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

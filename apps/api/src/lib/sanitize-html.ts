const BLOCK_TAGS = ['script', 'style', 'iframe', 'object', 'embed'];
const EVENT_ATTRIBUTE = /^on[a-z]+/i;

function removeBlockTags(html: string): string {
  let result = html;
  for (const tag of BLOCK_TAGS) {
    const pattern = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    result = result.replace(pattern, '');
  }
  return result;
}

function removeDangerousAttributes(html: string): string {
  return html
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, (match) => {
      const attribute = match.split('=')[0].trim();
      return EVENT_ATTRIBUTE.test(attribute) ? '' : match;
    })
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, (match) => {
      const attribute = match.split('=')[0].trim();
      return EVENT_ATTRIBUTE.test(attribute) ? '' : match;
    })
    .replace(/on[a-z]+\s*=\s*[^\s>]+/gi, (match) => {
      const attribute = match.split('=')[0].trim();
      return EVENT_ATTRIBUTE.test(attribute) ? '' : match;
    });
}

export function sanitizeHtml(html: string | null | undefined): string | undefined {
  if (!html) return undefined;
  const withoutBlocks = removeBlockTags(html);
  const withoutAttrs = removeDangerousAttributes(withoutBlocks);
  const trimmed = withoutAttrs.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Bot listing pagination: stores the already formatted lines + the page
// size and exposes the render of each page. Pure (no discord.js): the bot
// builds the buttons from the descriptor returned by `renderPage`.

export const PAGINATION_TTL_MS = 300000;

export function createPaginationStore({ ttlMs = PAGINATION_TTL_MS, now = Date.now } = {}) {
  const items = new Map();
  let seq = 0;

  return {
    create({ lines, pageSize, userId, header = '' }) {
      const token = `${(++seq).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      items.set(token, {
        token,
        lines: Array.isArray(lines) ? lines : [],
        pageSize: Math.max(1, Number(pageSize) || 1),
        userId,
        header,
        expiresAt: now() + ttlMs,
      });
      return token;
    },
    get(token) {
      const item = items.get(token);
      if (!item) return null;
      if (item.expiresAt <= now()) {
        items.delete(token);
        return null;
      }
      return item;
    },
    remove(token) {
      items.delete(token);
    },
  };
}

export function totalPages(item) {
  return Math.max(1, Math.ceil((item?.lines?.length ?? 0) / (item?.pageSize || 1)));
}

export function renderPage(item, page, t = (key) => key) {
  const pages = totalPages(item);
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);
  const start = (current - 1) * item.pageSize;
  const body = item.lines.slice(start, start + item.pageSize).join('\n');
  const footer = t('bot.pagerFooter', { page: current, pages, total: item.lines.length });
  const content = [item.header, body, footer].filter((part) => part && part.length > 0).join('\n\n');
  return {
    content,
    page: current,
    pages,
    prevId: `mc:pend:${item.token}:${current - 1}`,
    nextId: `mc:pend:${item.token}:${current + 1}`,
    prevDisabled: current <= 1,
    nextDisabled: current >= pages,
  };
}

(() => {
  // Guard: only initialise once per page load
  if (window.__chiselActive) return;
  window.__chiselActive = false;

  // ─── State ───────────────────────────────────────────────────────────────
  let hoveredEl = null;
  let lockedEl = null;
  let inputCard = null;
  let labelChip = null;

  // ─── Activate on message ─────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ACTIVATE_INSPECTOR') {
      if (window.__chiselActive) {
        deactivate();
      } else {
        activate();
      }
    }
  });

  function activate() {
    window.__chiselActive = true;
    document.addEventListener('mouseover', onHover, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    showToast('Chisel active — hover an element and click it');
  }

  function deactivate() {
    window.__chiselActive = false;
    document.removeEventListener('mouseover', onHover, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    clearHighlight();
    removeCard();
    removeChip();
  }

  // ─── Hover ────────────────────────────────────────────────────────────────
  function onHover(e) {
    if (lockedEl) return; // input card is open, don't change highlight
    const el = e.target;
    if (isChiselEl(el)) return;
    if (el === hoveredEl) return;
    clearHighlight();
    hoveredEl = el;
    el.classList.add('chisel-highlight');
    showChip(el);
  }

  function onMouseOut(e) {
    if (lockedEl) return;
    if (e.target === hoveredEl) {
      clearHighlight();
    }
  }

  function clearHighlight() {
    if (hoveredEl) {
      hoveredEl.classList.remove('chisel-highlight');
      hoveredEl = null;
    }
    removeChip();
  }

  // ─── Click → open input card ──────────────────────────────────────────────
  function onClick(e) {
    const el = e.target;
    if (isChiselEl(el)) return;
    e.preventDefault();
    e.stopPropagation();

    // If card already open, close it first
    if (inputCard) {
      removeCard();
      lockedEl = null;
    }

    lockedEl = el;
    clearHighlight();
    lockedEl.classList.add('chisel-locked');
    openCard(lockedEl);
  }

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (inputCard) {
        removeCard();
        lockedEl.classList.remove('chisel-locked');
        lockedEl = null;
      } else {
        deactivate();
      }
    }
  }

  // ─── Label chip ───────────────────────────────────────────────────────────
  function showChip(el) {
    removeChip();
    const label = getElementLabel(el);
    labelChip = document.createElement('div');
    labelChip.className = 'chisel-chip';
    labelChip.textContent = label;
    document.body.appendChild(labelChip);
    positionChip(el);
  }

  function positionChip(el) {
    if (!labelChip) return;
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    let top = rect.top + scrollY - 26;
    let left = rect.left + scrollX;
    if (top < scrollY + 4) top = rect.bottom + scrollY + 4;
    labelChip.style.top = top + 'px';
    labelChip.style.left = left + 'px';
  }

  function removeChip() {
    if (labelChip) { labelChip.remove(); labelChip = null; }
  }

  // ─── Input card ───────────────────────────────────────────────────────────
  function openCard(el) {
    inputCard = document.createElement('div');
    inputCard.className = 'chisel-card';

    const meta = document.createElement('div');
    meta.className = 'chisel-card-meta';
    meta.textContent = getElementLabel(el);

    const input = document.createElement('textarea');
    input.className = 'chisel-card-input';
    input.placeholder = 'Describe the change… (e.g. "make this button red and larger")';
    input.rows = 3;

    const actions = document.createElement('div');
    actions.className = 'chisel-card-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'chisel-btn chisel-btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      removeCard();
      lockedEl.classList.remove('chisel-locked');
      lockedEl = null;
    };

    const sendBtn = document.createElement('button');
    sendBtn.className = 'chisel-btn chisel-btn-send';
    sendBtn.textContent = 'Copy Prompt';
    sendBtn.onclick = () => submit(el, input.value.trim());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit(el, input.value.trim());
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(sendBtn);
    inputCard.appendChild(meta);
    inputCard.appendChild(input);
    inputCard.appendChild(actions);
    document.body.appendChild(inputCard);

    positionCard(el);
    setTimeout(() => input.focus(), 50);
  }

  function positionCard(el) {
    if (!inputCard) return;
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const cardW = 320;
    const cardH = 160;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.bottom + scrollY + 8;
    let left = rect.left + scrollX;

    // Flip up if off bottom of viewport
    if (rect.bottom + cardH + 8 > vh) {
      top = rect.top + scrollY - cardH - 8;
    }
    // Clamp horizontally
    if (left + cardW > scrollX + vw - 16) {
      left = scrollX + vw - cardW - 16;
    }
    if (left < scrollX + 8) left = scrollX + 8;

    inputCard.style.top = top + 'px';
    inputCard.style.left = left + 'px';
  }

  function removeCard() {
    if (inputCard) { inputCard.remove(); inputCard = null; }
    if (lockedEl) lockedEl.classList.remove('chisel-locked');
  }

  // ─── Submit → build prompt → clipboard ───────────────────────────────────
  function submit(el, instruction) {
    if (!instruction) {
      const input = inputCard.querySelector('textarea');
      input.focus();
      input.style.borderColor = '#ef4444';
      return;
    }

    const context = extractContext(el);
    const prompt = buildPrompt(instruction, context);

    chrome.runtime.sendMessage({ type: 'WRITE_CLIPBOARD', text: prompt }, () => {
      removeCard();
      lockedEl.classList.remove('chisel-locked');
      lockedEl = null;
      showToast('Prompt copied to clipboard — paste into Claude Code');
    });
  }

  // ─── Context extraction ───────────────────────────────────────────────────
  function extractContext(el) {
    const ctx = {
      selector: getCSSPath(el),
      tagName: el.tagName.toLowerCase(),
      classes: [...el.classList]
        .filter(c => !c.startsWith('chisel-'))
        .join(' ') || null,
      id: el.id || null,
      innerText: (el.innerText || '').slice(0, 100).replace(/\s+/g, ' ').trim() || null,
      htmlSnippet: el.outerHTML.slice(0, 400),
      react: getReactContext(el),
      styles: getKeyStyles(el)
    };
    return ctx;
  }

  function getReactContext(el) {
    try {
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
      if (!fiberKey) return null;
      let fiber = el[fiberKey];
      while (fiber) {
        if (fiber._debugSource) {
          return {
            component: fiber._debugOwner?.type?.name || null,
            file: fiber._debugSource.fileName || null,
            line: fiber._debugSource.lineNumber || null
          };
        }
        fiber = fiber.return;
      }
      // Try to get component name even without debugSource
      fiber = el[fiberKey];
      while (fiber) {
        const name = fiber.type?.name || fiber.type?.displayName;
        if (name && typeof name === 'string' && name[0] === name[0].toUpperCase()) {
          return { component: name, file: null, line: null };
        }
        fiber = fiber.return;
      }
    } catch (_) {}
    return null;
  }

  function getKeyStyles(el) {
    try {
      const s = window.getComputedStyle(el);
      return {
        color: s.color,
        background: s.backgroundColor,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        margin: s.margin,
        display: s.display,
        borderRadius: s.borderRadius,
        width: s.width,
        height: s.height
      };
    } catch (_) { return {}; }
  }

  // ─── Prompt builder ───────────────────────────────────────────────────────
  function buildPrompt(instruction, ctx) {
    const lines = [];

    lines.push('You are modifying a web UI. Make ONLY the described change and nothing else. Do not refactor, rename, or reorganise anything.');
    lines.push('');
    lines.push(`TASK: ${instruction}`);
    lines.push('');
    lines.push('## Target Element');
    lines.push(`Tag: ${ctx.tagName}`);
    if (ctx.id) lines.push(`ID: ${ctx.id}`);
    if (ctx.classes) lines.push(`Classes: ${ctx.classes}`);
    lines.push(`Selector: ${ctx.selector}`);
    if (ctx.innerText) lines.push(`Text content: "${ctx.innerText}"`);
    lines.push('');
    lines.push('## HTML Snippet');
    lines.push('```html');
    lines.push(ctx.htmlSnippet);
    lines.push('```');

    if (ctx.react) {
      lines.push('');
      lines.push('## React Component');
      if (ctx.react.component) lines.push(`Component: ${ctx.react.component}`);
      if (ctx.react.file) lines.push(`File: ${ctx.react.file}`);
      if (ctx.react.line) lines.push(`Line: ${ctx.react.line}`);
      if (ctx.react.file) {
        lines.push('');
        lines.push(`Start by reading ${ctx.react.file} to understand the current implementation.`);
      }
    } else {
      lines.push('');
      lines.push('## Project Context');
      lines.push('No React component detected. Search the codebase for the selector or text content above to find the relevant file.');
    }

    lines.push('');
    lines.push('## Current Computed Styles');
    lines.push('```');
    Object.entries(ctx.styles).forEach(([k, v]) => {
      if (v && v !== 'none' && v !== 'normal' && v !== 'auto') {
        lines.push(`${k}: ${v}`);
      }
    });
    lines.push('```');
    lines.push('');
    lines.push('## Rules');
    lines.push('- Make minimal edits only');
    lines.push('- Match the existing styling approach (Tailwind, CSS modules, inline styles, plain CSS — use whatever is already in use)');
    lines.push('- After editing, confirm what file(s) you changed and what specifically changed (1-3 sentences)');

    return lines.join('\n');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function getElementLabel(el) {
    const react = getReactContext(el);
    if (react?.component) return `<${react.component} />`;
    let label = el.tagName.toLowerCase();
    if (el.id) return `${label}#${el.id}`;
    const classes = [...el.classList]
      .filter(c => !c.startsWith('chisel-'))
      .slice(0, 2)
      .join('.');
    if (classes) label += `.${classes}`;
    return `<${label}>`;
  }

  function getCSSPath(el) {
    const parts = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      }
      const classes = [...current.classList]
        .filter(c => !c.startsWith('chisel-'))
        .slice(0, 2)
        .join('.');
      if (classes) selector += `.${classes}`;

      const parent = current.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(s => s.nodeName === current.nodeName);
        if (siblings.length > 1) {
          selector += `:nth-child(${[...parent.children].indexOf(current) + 1})`;
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
      if (parts.length >= 5) break;
    }
    return parts.join(' > ');
  }

  function isChiselEl(el) {
    return el.closest('.chisel-card, .chisel-chip, .chisel-toast') !== null;
  }

  function showToast(msg) {
    const existing = document.querySelector('.chisel-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'chisel-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
})();

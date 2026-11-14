/**
 * Fast GPT — an OpenAI-logo button in the DeepSeek Harness composer toolbar.
 *
 * Clicking it opens chatgpt.com in a separate popup window. The browser half
 * is a classic script: the DSH Web shell loads this file, its loader registers
 * a lazy factory, and React comes from the shell's shared module table.
 */

/** Subset of the React runtime the button needs. */
interface ReactRuntime {
  createElement(
    type: unknown,
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ): unknown;
  Fragment: unknown;
  useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void];
  useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void;
}

type Translator = (key: string) => string;

interface SlotRegistration {
  name: string;
  id: string;
  order?: number;
  locale?: string;
}

interface ClientContext {
  effect(effect: () => (() => void) | void, label?: string): void;
  locale: {
    register(namespace: string, dicts: Record<string, Record<string, string>>): () => void;
  };
  slots: {
    inject(name: string, callback: () => () => void): () => void;
    register(
      options: SlotRegistration,
      component: (props: { t?: Translator }) => unknown,
    ): () => void;
  };
}

window.__ModuleLoader__.load({
  id: '@xqcherry/dsh-fast-gpt',
  factory(require) {
    const React = require('react') as ReactRuntime;
    const h = React.createElement;
    const { useEffect, useState } = React;

    const NS = 'fast-gpt';
    const CHATGPT_URL = 'https://chatgpt.com/';
    const WINDOW_NAME = 'fast-gpt-chatgpt';
    const POPUP_WIDTH = 1080;
    const POPUP_HEIGHT = 840;
    const BLOCKED_NOTICE_MS = 5000;

    /**
     * OpenAI mark, 24×24 outline. Artwork from Simple Icons v13 (CC0 1.0);
     * "OpenAI" and the OpenAI logo are trademarks of OpenAI.
     */
    const OPENAI_MARK =
      'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z';

    /**
     * Last popup handle. ChatGPT sends `Cross-Origin-Opener-Policy:
     * same-origin-allow-popups`, so the browser may sever this reference once
     * the popup loads; the window name is then the only hint left.
     */
    let popup: Window | null = null;

    /** Centered popup features, clamped to the current screen. */
    function popupFeatures(): string {
      const screen = window.screen;
      const availWidth = Number(screen.availWidth) || 1280;
      const availHeight = Number(screen.availHeight) || 900;
      const width = Math.min(POPUP_WIDTH, Math.max(480, availWidth - 40));
      const height = Math.min(POPUP_HEIGHT, Math.max(360, availHeight - 80));
      const originX = Number.isFinite(window.screenX) ? window.screenX : 0;
      const originY = Number.isFinite(window.screenY) ? window.screenY : 0;
      const outerWidth = Number(window.outerWidth) || availWidth;
      const outerHeight = Number(window.outerHeight) || availHeight;
      const left = Math.max(0, Math.round(originX + (outerWidth - width) / 2));
      const top = Math.max(0, Math.round(originY + (outerHeight - height) / 2));
      return (
        'popup=yes,width=' + width + ',height=' + height +
        ',left=' + left + ',top=' + top +
        ',resizable=yes,scrollbars=yes'
      );
    }

    /**
     * Open or focus the ChatGPT popup. Called synchronously from the click
     * handler so the browser keeps the user gesture.
     * @returns whether a popup reference was obtained (false means blocked).
     */
    function openChatGPT(): boolean {
      if (popup !== null && popup.closed === false) {
        try {
          popup.focus();
        } catch {
          // Cross-origin focus is best-effort.
        }
        return true;
      }
      popup = window.open(CHATGPT_URL, WINDOW_NAME, popupFeatures());
      if (popup === null) return false;
      try {
        popup.focus();
      } catch {
        // Cross-origin focus is best-effort.
      }
      return true;
    }

    /** The OpenAI mark as the button glyph; inherits the host text color. */
    function OpenAIMark(): unknown {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: 16,
          height: 16,
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', { d: OPENAI_MARK, fill: 'currentColor' }),
      );
    }

    const STYLE = `
.fast-gpt-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.fast-gpt-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.fast-gpt-inline:hover {
  background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2));
  color: var(--dsw-alias-label-primary);
}
.fast-gpt-inline:active {
  background: var(--dsw-alias-bg-layer-2);
}
.fast-gpt-inline:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.fast-gpt-inline svg {
  display: block;
  width: 16px;
  height: 16px;
}
.fast-gpt-blocked {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  width: max-content;
  max-width: 230px;
  padding: 5px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-state-error-primary);
  font-size: 11px;
  line-height: 1.45;
  white-space: normal;
  pointer-events: none;
}
`;

    /** Composer toolbar entry: an icon-only GPT button beside the model picker. */
    function FastGptButton(props: { t?: Translator }): unknown {
      const t: Translator =
        typeof props.t === 'function' ? props.t : (key: string) => key;
      const [blocked, setBlocked] = useState(false);

      useEffect(() => {
        if (!blocked) return undefined;
        const timer = window.setTimeout(() => setBlocked(false), BLOCKED_NOTICE_MS);
        return () => window.clearTimeout(timer);
      }, [blocked]);

      return h(
        React.Fragment,
        null,
        h('style', null, STYLE),
        h(
          'span',
          { className: 'fast-gpt-anchor' },
          h(
            'button',
            {
              type: 'button',
              className: 'fast-gpt-inline',
              title: t('open'),
              'aria-label': t('open'),
              onClick: () => setBlocked(!openChatGPT()),
            },
            h(OpenAIMark),
          ),
          blocked
            ? h('span', { className: 'fast-gpt-blocked', role: 'status' }, t('blocked'))
            : null,
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx: ClientContext) {
        ctx.effect(
          () =>
            ctx.locale.register(NS, {
              zh: {
                open: '在独立窗口中打开 ChatGPT',
                blocked: '弹窗被浏览器拦截，请允许本站弹窗后重试。',
              },
              en: {
                open: 'Open ChatGPT in a separate window',
                blocked: 'Popup blocked — allow popups for this site, then try again.',
              },
            }),
          'fast-gpt: dictionaries',
        );

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register(
            {
              name: 'conversation.input.right',
              id: 'fast-gpt',
              order: 1000,
              locale: NS,
            },
            FastGptButton,
          ),
        );
      },
    };
  },
});

const R2LA_WINDOW_KEY = "__b404R2laWindowProxy__";

/**
 * Open a single reusable R2LA window while severing its opener relationship.
 * The WindowProxy is stored on the B404 page so it survives component/module
 * re-evaluation while the page remains loaded.
 */
export function createR2laNavigator() {
  /** @param {string} url @param {Window} browserWindow */
  return function navigateR2la(url, browserWindow = window) {
    /** @type {WindowProxy | null} */
    const r2laWindow = browserWindow[R2LA_WINDOW_KEY] ?? null;

    if (r2laWindow && !r2laWindow.closed) {
      try {
        r2laWindow.location.href = url;
      } catch {
        browserWindow[R2LA_WINDOW_KEY] = null;
      }

      if (browserWindow[R2LA_WINDOW_KEY] === r2laWindow) {
        try { r2laWindow.focus(); } catch {}
        return true;
      }
    }

    const opened = browserWindow.open(url, "b404-r2la");
    if (!opened) return false;

    try {
      opened.opener = null;
      browserWindow[R2LA_WINDOW_KEY] = opened;
    } catch {
      try { opened.close(); } catch {}
      return false;
    }
    return true;
  };
}

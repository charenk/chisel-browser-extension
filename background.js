chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_INSPECTOR') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      const url = tab.url || '';
      const isLocalhost =
        url.startsWith('http://localhost') ||
        url.startsWith('http://127.0.0.1') ||
        url.startsWith('http://0.0.0.0');

      if (!isLocalhost) {
        sendResponse({ ok: false, reason: 'not_localhost' });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ['content/inspector.js']
        },
        () => {
          chrome.scripting.insertCSS(
            { target: { tabId: tab.id }, files: ['content/inspector.css'] },
            () => {
              chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_INSPECTOR' });
              sendResponse({ ok: true });
            }
          );
        }
      );
    });
    return true; // keep channel open for async sendResponse
  }

  if (msg.type === 'WRITE_CLIPBOARD') {
    // Clipboard write must happen in a user-gesture context.
    // We relay it through the background which has clipboardWrite permission.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (text) => navigator.clipboard.writeText(text),
        args: [msg.text]
      });
    });
  }
});

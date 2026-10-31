import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f8939ab8-4af4-492f-bd77-25c5ad445671';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'chrome_qa_profile_test');

class ChromeCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Log.entryAdded') {
          console.log('[Browser Log]', msg.params.entry);
        }
        if (msg.method === 'Network.loadingFailed') {
          console.log('[Network Failed]', msg.params.requestId, msg.params.errorText, msg.params.type);
        }
        if (msg.method === 'Network.responseReceived') {
          const resp = msg.params.response;
          if (resp.url.includes('.css') || resp.status >= 400) {
            console.log('[Network Response]', resp.status, resp.url, resp.mimeType);
          }
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank',
  ]);

  await sleep(1500);

  try {
    const listRes = await fetch('http://localhost:9223/json');
    const tabs = await listRes.json();
    const targetTab = tabs.find((t) => t.type === 'page') || tabs[0];
    const cdp = new ChromeCDP(targetTab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('Log.enable');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('[CDP] Navigating to http://10.151.164.41:3000 ...');
    await cdp.send('Page.navigate', { url: 'http://10.151.164.41:3000' });
    await sleep(3000);

    const styleRes = await cdp.send('Runtime.evaluate', {
      expression: `({
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        bodyFont: window.getComputedStyle(document.body).fontFamily,
        styleSheets: Array.from(document.styleSheets).map(s => s.href),
        cssRulesCount: Array.from(document.styleSheets).map(s => {
          try { return s.cssRules.length; } catch(e) { return 'CORS/Error: ' + e.message; }
        })
      })`,
      returnByValue: true
    });
    console.log('[CDP] Style Eval:', JSON.stringify(styleRes.result.value, null, 2));

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'live_home_test.png'), Buffer.from(shot.data, 'base64'));
    console.log('[CDP] Saved live_home_test.png');

    await cdp.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

main().catch(console.error);


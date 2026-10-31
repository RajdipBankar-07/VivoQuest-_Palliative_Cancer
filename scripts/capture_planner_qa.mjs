import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f8939ab8-4af4-492f-bd77-25c5ad445671';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'chrome_qa_profile');

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
  console.log('[QA] 1. Authenticating as Ops Manager...');
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '9899110001', password: 'Ops#2026' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    throw new Error('Ops Manager login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.token;
  const user = loginData.data.user;
  console.log(`[QA] Logged in as: ${user.fullName} (${user.role})`);

  console.log('[QA] 2. Spawning headless Chrome on debug port 9222...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank',
  ]);

  await sleep(1800);

  try {
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const targetTab = tabs.find((t) => t.type === 'page') || tabs[0];

    const cdp = new ChromeCDP(targetTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    async function takeScreenshot(filename) {
      const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(snap.data, 'base64');
      const outPath = path.join(ARTIFACTS_DIR, filename);
      fs.writeFileSync(outPath, buf);
      console.log(`[QA] Saved screenshot: ${filename} (${buf.length} bytes)`);
    }

    // Desktop Viewport
    console.log('[QA] 3. Setting Desktop Viewport 1440x900...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('[QA] 4. Navigating to operations login to set localStorage token...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/operations/login' });
    await sleep(2000);

    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('vivo_token', ${JSON.stringify(token)});
        localStorage.setItem('vivo_user', ${JSON.stringify(JSON.stringify(user))});
      `,
    });

    console.log('[QA] 5. Navigating to operations dashboard...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/operations/dashboard' });
    await sleep(4000);

    // Capture 1: Daily Delivery Planner in Orders Tab
    console.log('[QA] 6. Capturing Daily Delivery Planner (Desktop)...');
    await takeScreenshot('desktop_daily_delivery_planner.png');

    // Capture 2: Notification Bell Dropdown
    console.log('[QA] 7. Toggling Notifications Bell...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const bellBtn = document.querySelector('button[title*="Operational Alerts"]');
        if (bellBtn) bellBtn.click();
      `,
    });
    await sleep(1500);
    await takeScreenshot('desktop_operational_notifications.png');

    // Close notifications if open
    await cdp.send('Runtime.evaluate', {
      expression: `
        const closeBtn = document.querySelector('button[title*="Operational Alerts"]');
        // Click to close if drawer is visible
        if (document.querySelector('.z-50.overflow-hidden')) {
          closeBtn?.click();
        }
      `,
    });
    await sleep(600);

    // Capture 3: Completed Deliveries Tab
    console.log('[QA] 8. Switching to Completed Deliveries tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const tabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Completed Deliveries'));
        if (tabBtn) tabBtn.click();
      `,
    });
    await sleep(3000);
    await takeScreenshot('desktop_completed_deliveries.png');

    // Capture 4: Mobile Viewport 375x812
    console.log('[QA] 9. Setting Mobile Viewport 375x812...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    // Switch back to Orders tab
    await cdp.send('Runtime.evaluate', {
      expression: `
        const ordersTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Orders & Delivery'));
        if (ordersTab) ordersTab.click();
      `,
    });
    await sleep(2500);
    await takeScreenshot('mobile_daily_delivery_planner.png');

    console.log('[QA] All screenshots captured successfully!');
    await cdp.close();
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

main().catch((err) => {
  console.error('[QA] Error:', err);
  process.exit(1);
});

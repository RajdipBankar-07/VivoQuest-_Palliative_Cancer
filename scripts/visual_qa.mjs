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
  console.log('[QA] 1. Authenticating Ops Manager via backend API...');
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

  await sleep(1500);

  try {
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const targetTab = tabs.find((t) => t.type === 'page') || tabs[0];
    console.log('[QA] Target WebSocket:', targetTab.webSocketDebuggerUrl);

    const cdp = new ChromeCDP(targetTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Desktop Viewport
    console.log('[QA] 3. Setting Desktop Viewport 1440x900...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('[QA] 4. Navigating to operations login...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/operations/login' });
    await sleep(2000);
    await takeScreenshot('desktop_operations_login.png');

    // Inject token & user into localStorage
    console.log('[QA] 5. Injecting credentials into localStorage...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('vivo_token', ${JSON.stringify(token)});
        localStorage.setItem('vivo_user', ${JSON.stringify(JSON.stringify(user))});
      `,
    });

    // Navigate to /operations/dashboard
    console.log('[QA] 6. Navigating to operations dashboard...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/operations/dashboard' });
    await sleep(4000); // Wait for React render & data fetches

    const pageCheck = await cdp.send('Runtime.evaluate', {
      expression: `document.body.innerText.slice(0, 400)`,
      returnByValue: true,
    });
    console.log('[QA] Rendered Page Text Preview:\n', pageCheck.result.value);

    // Function to capture screenshot
    async function takeScreenshot(filename) {
      const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(snap.data, 'base64');
      const outPath = path.join(ARTIFACTS_DIR, filename);
      fs.writeFileSync(outPath, buf);
      console.log(`[QA] Saved screenshot: ${filename} (${buf.length} bytes)`);
    }

    // 1. Orders & Delivery tab
    await takeScreenshot('desktop_orders_delivery.png');

    // 2. Switch to Products & Inventory
    console.log('[QA] 7. Switching to Products & Inventory tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('2. Products'))?.click();
      `,
    });
    await sleep(2500);
    await takeScreenshot('desktop_products_inventory.png');

    // 3. Switch to Installation & Maintenance
    console.log('[QA] 8. Switching to Installation & Maintenance tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('3. Installation'))?.click();
      `,
    });
    await sleep(2500);
    await takeScreenshot('desktop_installation_maintenance.png');

    // 4. Switch to Returns & Complaints
    console.log('[QA] 9. Switching to Returns & Complaints tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('4. Returns'))?.click();
      `,
    });
    await sleep(2500);
    await takeScreenshot('desktop_returns_complaints.png');

    // 5. Switch back to Orders tab and test Mobile Viewport
    console.log('[QA] 10. Switching back to Orders tab for Mobile Viewport QA...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('1. Orders'))?.click();
      `,
    });
    await sleep(2000);

    console.log('[QA] 11. Setting Mobile Viewport 375x812 (iPhone)...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1500);
    await takeScreenshot('mobile_operations_dashboard.png');

    // 6. DOM Layout Metrics & Overflow check
    console.log('[QA] 12. Performing DOM layout & overflow audit...');
    const domCheck = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const bodyWidth = document.body.clientWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const horizontalOverflow = bodyScrollWidth > bodyWidth;
          const brokenImages = Array.from(document.querySelectorAll('img')).filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
          const errorText = document.body.innerText.includes('Application error') || document.body.innerText.includes('Unhandled Runtime Error');
          return {
            bodyWidth,
            bodyScrollWidth,
            horizontalOverflow,
            brokenImagesCount: brokenImages.length,
            hasRuntimeError: errorText,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('[QA] DOM Layout Audit Results:', domCheck.result.value);

    // 7. Reset to Desktop and test Patient Order View
    console.log('[QA] 13. Navigating to Patient Order Tracking View with Reschedule Modal...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/orders/6ae28e3c55464746192f427a' });
    await sleep(3000);
    await takeScreenshot('desktop_patient_reschedule_order.png');

    await cdp.close();
  } finally {
    console.log('[QA] Cleaning up Chrome process...');
    chromeProc.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('[QA] Fatal Error:', err);
  process.exit(1);
});

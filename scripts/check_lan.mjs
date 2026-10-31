async function check() {
  try {
    const r = await fetch('http://10.151.164.41:3000/');
    const html = await r.text();
    const matches = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map(x => x[1]);
    console.log('Found CSS links on LAN IP:', matches);
    for (const url of matches) {
      const res = await fetch('http://10.151.164.41:3000' + url);
      console.log(url, 'Status:', res.status, 'Size:', (await res.text()).length);
    }
  } catch (err) {
    console.error('Error connecting to LAN IP:', err.message);
  }
}
check();


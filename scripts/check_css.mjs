async function check() {
  const r = await fetch('http://localhost:3000/');
  const html = await r.text();
  const matches = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map(x => x[1]);
  console.log('Found CSS links:', matches);
  for (const url of matches) {
    const res = await fetch('http://localhost:3000' + url);
    console.log(url, 'Status:', res.status, 'Size:', (await res.text()).length);
  }
}
check();


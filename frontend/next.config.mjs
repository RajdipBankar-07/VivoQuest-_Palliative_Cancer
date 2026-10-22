/** @type {import('next').NextConfig} */
const devOrigins = [
  '10.151.164.41',
  '10.151.164.41:3000',
  'localhost',
  'localhost:3000',
  '127.0.0.1',
  '127.0.0.1:3000',
];

if (process.env.LAN_IP) {
  devOrigins.push(process.env.LAN_IP);
  devOrigins.push(`${process.env.LAN_IP}:3000`);
}

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: Array.from(new Set(devOrigins)),
};

export default nextConfig;



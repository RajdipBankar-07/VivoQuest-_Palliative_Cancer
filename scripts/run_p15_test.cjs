const { spawn } = require('child_process');

const proc = spawn('npx.cmd', ['tsx', 'apps/api/tests/phase15OtpDeliveryRatings.test.ts'], {
  shell: true,
  env: process.env,
});

proc.stdout.on('data', (d) => process.stdout.write(d.toString()));
proc.stderr.on('data', (d) => process.stderr.write(d.toString()));
proc.on('close', (code) => console.log('Process exited with code:', code));


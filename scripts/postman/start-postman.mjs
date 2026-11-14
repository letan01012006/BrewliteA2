import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const apiDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../apps/api',
);
const require = createRequire(resolve(apiDirectory, 'package.json'));
const { parse } = require('dotenv');
const settings = {
  ...parse(readFileSync(resolve(apiDirectory, '.env'))),
  ...process.env,
};

function databaseUrl(value, label) {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
    return url;
  } catch {
    throw new Error(
      `${label} phải là URL PostgreSQL hợp lệ trong apps/api/.env.`,
    );
  }
}

const mainDatabase = databaseUrl(settings.DATABASE_URL, 'DATABASE_URL');
const testDatabase = databaseUrl(
  settings.TEST_DATABASE_URL,
  'TEST_DATABASE_URL',
);
if (
  mainDatabase.hostname === testDatabase.hostname &&
  (mainDatabase.port || '5432') === (testDatabase.port || '5432') &&
  mainDatabase.pathname === testDatabase.pathname
) {
  throw new Error(
    'TEST_DATABASE_URL phải trỏ tới database riêng với DATABASE_URL.',
  );
}

const port = Number(settings.POSTMAN_PORT || 4001);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('POSTMAN_PORT phải là số nguyên từ 1024 đến 65535.');
}
await new Promise((accept, reject) => {
  const probe = createServer();
  probe.once('error', () =>
    reject(
      new Error(
        `Cổng ${port} đang được sử dụng. Hãy dừng phiên Postman API trước khi chạy lại.`,
      ),
    ),
  );
  probe.listen(port, '0.0.0.0', () => probe.close(accept));
});

const environment = {
  ...settings,
  PORT: String(port),
  DATABASE_URL: settings.TEST_DATABASE_URL,
  NODE_ENV: 'development',
  JWT_SECRET: randomBytes(32).toString('hex'),
  JWT_EXPIRES_IN: '1d',
  OTP_HASH_SECRET: randomBytes(32).toString('hex'),
  SMS_PROVIDER: 'local',
  AUTH_OTP_DEMO: 'true',
  AUTH_DEMO_SEED: 'true',
  DEMO_MANAGER_PHONE: '0900000001',
  DEMO_MANAGER_PASSWORD: 'Manager@123',
  PAYMENT_MOCK_ENABLED: 'true',
  ESMS_API_KEY: '',
  ESMS_SECRET_KEY: '',
  ESMS_BRANDNAME: '',
  VNPAY_TMN_CODE: '',
  VNPAY_HASH_SECRET: '',
};

async function run(script, argumentsList) {
  await new Promise((accept, reject) => {
    const child = spawn(
      process.execPath,
      [resolve(apiDirectory, script), ...argumentsList],
      {
        cwd: apiDirectory,
        env: environment,
        stdio: 'inherit',
        windowsHide: true,
      },
    );
    const interrupt = () => child.kill('SIGINT');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    const cleanup = () => {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    };
    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('exit', (code) => {
      cleanup();
      if (code === 0) accept();
      else reject(new Error(`Lệnh ${script} kết thúc với mã ${code}.`));
    });
  });
}

console.log(`Postman API: http://localhost:${port}/api`);
console.log(
  `Database test: ${decodeURIComponent(testDatabase.pathname.slice(1))}. OTP local: 123456. Thanh toán WALLET/CARD giả lập.`,
);
console.log(
  'Đang generate Prisma, áp dụng migrations và nạp dữ liệu demo vào database test...',
);
await run('node_modules/prisma/build/index.js', ['generate']);
await run('node_modules/prisma/build/index.js', ['migrate', 'deploy']);
await run('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);
await run('node_modules/@nestjs/cli/bin/nest.js', ['start', '--watch']);

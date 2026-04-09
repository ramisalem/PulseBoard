const { device } = require('detox');
const { spawn } = require('child_process');
const http = require('http');
const adapter = require('detox/runners/jest/adapter');
const specReporter = require('detox/runners/jest/specReporter');
const assignReporter = require('detox/runners/jest/assignReporter');

let mockServerProcess;

jasmine.getEnv().addReporter(adapter);
jasmine.getEnv().addReporter(specReporter);
jasmine.getEnv().addReporter(assignReporter);

function waitForServer(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      http
        .get(url, res => {
          if (res.statusCode === 200) {
            console.log('Mock server is ready');
            resolve();
          } else {
            retry();
          }
        })
        .on('error', retry);
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Mock server not ready after ${timeout}ms`));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

beforeAll(async () => {
  console.log('Starting mock server...');

  mockServerProcess = spawn('npm', ['start'], {
    cwd: './mock-server',
    stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
  });

  mockServerProcess.stdout.on('data', data => {
    console.log(`Mock Server: ${data}`);
  });

  mockServerProcess.stderr.on('data', data => {
    console.error(`Mock Server Error: ${data}`);
  });

  mockServerProcess.on('error', error => {
    console.error('Failed to start mock server:', error);
  });

  console.log('Waiting for mock server to be ready...');
  await waitForServer('http://localhost:4000/metrics/snapshot', 15000);

  console.log('Mock server is ready, launching app...');
  await device.launchApp({ newInstance: true });
}, 180000);

beforeEach(async () => {
  await adapter.beforeEach();
});

afterAll(async () => {
  console.log('Cleaning up...');

  if (mockServerProcess) {
    console.log('Stopping mock server...');
    mockServerProcess.kill('SIGTERM');

    await new Promise(resolve => {
      mockServerProcess.on('exit', () => {
        console.log('Mock server stopped');
        resolve();
      });
    });
  }

  await adapter.afterAll();
});

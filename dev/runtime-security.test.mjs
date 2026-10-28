import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const checks = [
  'src/server/scripts/check-runtime.cjs',
  'Gateway/scripts/check-runtime.cjs',
];
const rejected = [
  undefined, '', 'unknown', '1.2', '1.2.1-beta.1',
  '1.0.3', '1.0.9', '1.1.0', '1.2.0',
];
const accepted = ['1.0.10', '1.0.11', '1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.0', '2.0.0'];

function runtimeContext(versions, blockSwitchError) {
  return {
    process: { versions },
    require(name) {
      assert.equal(name, 'node:zlib');
      return { constants: { BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH: blockSwitchError } };
    },
  };
}

for (const file of checks) {
  for (const brotli of rejected) {
    test(`${file} rejects Brotli ${JSON.stringify(brotli)} before application startup`, () => {
      assert.throws(
        () => vm.runInNewContext(read(file), runtimeContext({ node: '24.22.0', brotli })),
        /CVE-2026-111497: refusing to start.*Node\.js 24\.22\.0/,
      );
    });
  }
  for (const brotli of accepted) {
    test(`${file} accepts patched Brotli ${brotli}`, () => {
      assert.doesNotThrow(() => vm.runInNewContext(read(file), runtimeContext({ node: '24.22.1', brotli })));
    });
  }
  for (const [node, brotli] of [['22.23.4', '1.1.0'], ['24.22.1', '1.2.0'], ['26.12.1', '1.2.0']]) {
    test(`${file} accepts the ${node} backport despite Brotli ${brotli}`, () => {
      assert.doesNotThrow(() => vm.runInNewContext(read(file), runtimeContext({ node, brotli }, -17)));
    });
  }
  test(`${file} does not accept a version claim without the decoder fix`, () => {
    for (const errorCode of [undefined, -16, '-17']) {
      assert.throws(() => vm.runInNewContext(read(file), runtimeContext({
        node: '24.22.1', brotli: '1.2.0', electron: '45.0.0',
      }, errorCode)), /CVE-2026-111497/);
    }
  });
}

test('independently deployed API and Gateway retain the same runtime policy', () => {
  assert.equal(read(checks[0]), read(checks[1]));
});

test('API and Gateway check the runtime before importing application modules', () => {
  for (const file of ['src/server/src/index.ts', 'Gateway/src/index.ts']) {
    assert.match(read(file), /^import '\.\.\/scripts\/check-runtime\.cjs';/);
  }
  assert.match(read('Gateway/Dockerfile'), /COPY scripts\/check-runtime\.cjs \.\/scripts\/check-runtime\.cjs/);
});

test('Station checks its own runtime before starting services or creating browser windows', () => {
  const main = read('Station/src/main.ts');
  const bootstrap = main.slice(main.indexOf('async function bootstrap()'));
  const check = bootstrap.indexOf("require(path.join(runtimePaths.serverDir, 'scripts', 'check-runtime.cjs'))");
  assert.ok(check >= 0);
  assert.ok(check < bootstrap.indexOf('await startKaraokeDockServer('));
  assert.ok(check < bootstrap.indexOf('createMainWindow()'));
  assert.match(bootstrap, /catch \(error\)[\s\S]*showErrorBox[\s\S]*app\.exit\(1\)/);

  let invoked = false;
  assert.throws(() => vm.runInNewContext(read('Station/scripts/check-runtime.cjs'), {
    __dirname: '/project/Station/scripts',
    process: { env: { TEST_ENV: 'preserved' } },
    require(name) {
      if (name === 'electron') return '/electron';
      if (name === 'node:path') return { resolve: () => '/project/src/server/scripts/check-runtime.cjs' };
      assert.equal(name, 'node:child_process');
      return {
        execFileSync(command, args, options) {
          invoked = true;
          assert.equal(command, '/electron');
          assert.deepEqual(Array.from(args), [
            '--require', '/project/src/server/scripts/check-runtime.cjs', '-e', '',
          ]);
          assert.equal(options.env.ELECTRON_RUN_AS_NODE, '1');
          assert.equal(options.env.TEST_ENV, 'preserved');
          assert.equal(options.stdio, 'inherit');
          throw new Error('unpatched Electron');
        },
      };
    },
  }, { displayErrors: false }), /unpatched Electron/);
  assert.ok(invoked);
});

test('Station development and packaging cannot bypass the Electron preflight', () => {
  const pkg = JSON.parse(read('Station/package.json'));
  assert.equal(pkg.scripts['check:runtime'], 'node scripts/check-runtime.cjs');
  for (const name of ['dev', 'dist:appimage']) {
    assert.match(pkg.scripts[name], /^npm run check:runtime && /);
  }
});

test('all Node container stages are pinned to patched releases', () => {
  for (const file of ['dev/Dockerfile', 'src/server/Dockerfile', 'src/web/Dockerfile', 'Gateway/Dockerfile']) {
    const images = Array.from(read(file).matchAll(/^FROM (node:\S+)/gm), match => match[1]);
    assert.ok(images.length > 0);
    for (const image of images) {
      assert.equal(image, file === 'Gateway/Dockerfile' ? 'node:26.12.1-bookworm-slim' : 'node:26.12.1-alpine');
    }
  }
});

test('package manifests and lockfiles declare patched supported Node release lines', () => {
  for (const directory of ['src/server', 'src/web', 'Gateway', 'Station']) {
    const pkg = JSON.parse(read(`${directory}/package.json`));
    const lock = JSON.parse(read(`${directory}/package-lock.json`));
    assert.equal(pkg.engines.node, '^22.23.4 || ^24.22.1 || ^26.12.1');
    assert.deepEqual(lock.packages[''].engines, pkg.engines);
  }
});

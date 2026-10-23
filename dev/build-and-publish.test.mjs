import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'karaokedock-build-version-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'dev'));
  mkdirSync(path.join(root, 'bin'));
  copyFileSync(new URL('./build-and-publish.sh', import.meta.url), path.join(root, 'dev/build-and-publish.sh'));
  writeFileSync(path.join(root, 'dev/Dockerfile'), 'FROM scratch\n');
  for (const name of ['web', 'server']) {
    const directory = path.join(root, 'src', name);
    mkdirSync(directory, { recursive: true });
    const pkg = { name: `karaoke-${name}`, version: '7.2.9', private: true };
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify(pkg));
    writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify({
      ...pkg, lockfileVersion: 4, packages: { '': pkg },
    }));
  }
  writeFileSync(path.join(root, 'bin/podman'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALL_LOG"
case "$1" in
  login) echo test-user ;;
  build) exit "\${BUILD_EXIT:-0}" ;;
esac
`, { mode: 0o755 });
  return {
    run(input = '\n\n', extraEnv = {}) {
      return spawnSync('bash', [path.join(root, 'dev/build-and-publish.sh')], {
        cwd: root, input, encoding: 'utf8',
        env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, CALL_LOG: `${root}/calls`, ...extraEnv },
      });
    },
    versions() {
      return ['web', 'server'].flatMap(name => {
        const dir = path.join(root, 'src', name);
        const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
        const lock = JSON.parse(readFileSync(path.join(dir, 'package-lock.json'), 'utf8'));
        return [pkg.version, lock.version, lock.packages[''].version];
      });
    },
    calls: () => readFileSync(path.join(root, 'calls'), 'utf8'),
  };
}

test('increments both packages and lockfiles once per multi-architecture build', t => {
  const build = fixture(t);
  const first = build.run();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.deepEqual(build.versions(), Array(6).fill('7.2.10'));
  assert.match(build.calls(), /--platform linux\/amd64,linux\/arm64/);
  assert.match(build.calls(), /--label org.opencontainers.image.version=7.2.10/);
  assert.match(build.calls(), /manifest push --all localhost\/karaokedock:latest/);
  const second = build.run('test-release\n1\n');
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.deepEqual(build.versions(), Array(6).fill('7.2.11'));
  assert.match(build.calls(), /--platform linux\/amd64 --label org.opencontainers.image.version=7.2.11/);
});

test('invalid input does not change versions', t => {
  const build = fixture(t);
  assert.notEqual(build.run('invalid/tag\n').status, 0);
  assert.deepEqual(build.versions(), Array(6).fill('7.2.9'));
});

test('a failed build keeps its version and is not published', t => {
  const build = fixture(t);
  assert.notEqual(build.run('\n2\n', { BUILD_EXIT: '1' }).status, 0);
  assert.deepEqual(build.versions(), Array(6).fill('7.2.10'));
  assert.doesNotMatch(build.calls(), /manifest push/);
});

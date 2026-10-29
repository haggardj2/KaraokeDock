import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const PACKAGES = { 'src/web': '7.2.9', 'src/server': '7.2.9', Gateway: '0.1.0', Station: '0.1.0' };

function writePackage(directory, name, version, extra = {}) {
  mkdirSync(directory, { recursive: true });
  const pkg = { name, version, private: true, ...extra };
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify(pkg));
  writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify({
    name, version, lockfileVersion: 3, packages: { '': { name, version } },
  }));
}

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'karaokedock-build-version-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'dev'));
  mkdirSync(path.join(root, 'bin'));
  copyFileSync(new URL('./build-and-publish.sh', import.meta.url), path.join(root, 'dev/build-and-publish.sh'));
  writeFileSync(path.join(root, 'dev/Dockerfile'), 'FROM scratch\n');
  for (const [directory, version] of Object.entries(PACKAGES)) {
    // The Station "build" records which version it packaged instead of running electron-builder.
    const extra = directory === 'Station'
      ? { scripts: { 'dist:appimage': 'node -e "require(\'fs\').writeFileSync(\'built-version\', require(\'./package.json\').version)"' } }
      : {};
    writePackage(path.join(root, directory), `fixture-${directory.replace('/', '-')}`, version, extra);
  }
  writeFileSync(path.join(root, 'Gateway/Dockerfile'), 'FROM scratch\n');
  writeFileSync(path.join(root, 'bin/podman'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALL_LOG"
case "$1" in
  login) echo test-user ;;
  build) exit "\${BUILD_EXIT:-0}" ;;
esac
`, { mode: 0o755 });
  return {
    run(input, extraEnv = {}) {
      return spawnSync('bash', [path.join(root, 'dev/build-and-publish.sh')], {
        cwd: root, input, encoding: 'utf8',
        env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, CALL_LOG: `${root}/calls`, ...extraEnv },
      });
    },
    // Each package's version as [package.json, lockfile, lockfile root package].
    versions() {
      return Object.fromEntries(Object.keys(PACKAGES).map(directory => {
        const pkg = JSON.parse(readFileSync(path.join(root, directory, 'package.json'), 'utf8'));
        const lock = JSON.parse(readFileSync(path.join(root, directory, 'package-lock.json'), 'utf8'));
        return [directory, [pkg.version, lock.version, lock.packages[''].version]];
      }));
    },
    calls: () => (existsSync(path.join(root, 'calls')) ? readFileSync(path.join(root, 'calls'), 'utf8') : ''),
    stationBuiltVersion: () => (existsSync(path.join(root, 'Station/built-version'))
      ? readFileSync(path.join(root, 'Station/built-version'), 'utf8') : null),
  };
}

const all = version => [version, version, version];

test('shows the current version and suggests the next patch for a default KaraokeDock image build', t => {
  const build = fixture(t);
  const result = build.run('\n\n\n\n\n');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /KaraokeDock \(web\): 7\.2\.9/);
  // Enter accepts the suggested next patch version (read -p only prints the prompt on a terminal).
  assert.match(result.stdout, /Version: +7\.2\.10/);
  assert.deepEqual(build.versions(), {
    'src/web': all('7.2.10'), 'src/server': all('7.2.10'), Gateway: all('0.1.0'), Station: all('0.1.0'),
  });
  assert.match(build.calls(), /--platform linux\/amd64,linux\/arm64/);
  assert.match(build.calls(), /--label org.opencontainers.image.version=7.2.10/);
  assert.match(build.calls(), /manifest push --all localhost\/karaokedock:latest docker:\/\/docker.io\/haggardj2\/karaokedock:latest/);
  assert.doesNotMatch(build.calls(), /karaokedock-gateway/);
  // Only the chosen tag is pushed unless the version tag was asked for.
  assert.doesNotMatch(build.calls(), /:7\.2\.10/);
  assert.equal(build.stationBuiltVersion(), null);
});

test('pushes both the tag and the version only when asked', t => {
  const build = fixture(t);
  const result = build.run('9.1.0\n1,2\nlatest\ny\n\n');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Tags: +latest and 9\.1\.0/);
  const pushes = build.calls().split('\n').filter(line => line.startsWith('manifest push'));
  assert.deepEqual(pushes, [
    'manifest push --all localhost/karaokedock:latest docker://docker.io/haggardj2/karaokedock:latest',
    'manifest push --all localhost/karaokedock:latest docker://docker.io/haggardj2/karaokedock:9.1.0',
    'manifest push --all localhost/karaokedock-gateway:latest docker://docker.io/haggardj2/karaokedock-gateway:latest',
    'manifest push --all localhost/karaokedock-gateway:latest docker://docker.io/haggardj2/karaokedock-gateway:9.1.0',
  ]);
});

test('is not asked when the tag already is the version', t => {
  const build = fixture(t);
  // Tag 7.2.10 equals the version, so the next line answers the architecture question.
  const result = build.run('\n1\n7.2.10\n1\n');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const pushes = build.calls().split('\n').filter(line => line.startsWith('manifest push'));
  assert.deepEqual(pushes, ['manifest push --all localhost/karaokedock:7.2.10 docker://docker.io/haggardj2/karaokedock:7.2.10']);
  assert.match(build.calls(), /--platform linux\/amd64 /);
});

test('builds any mix of targets at a chosen version, which is not bumped again', t => {
  const build = fixture(t);
  const result = build.run('8.0.0\n1,2,3\nrelease\n\n1\n');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(build.versions(), {
    'src/web': all('8.0.0'), 'src/server': all('8.0.0'), Gateway: all('8.0.0'), Station: all('8.0.0'),
  });
  const calls = build.calls();
  assert.match(calls, /--platform linux\/amd64 --label org.opencontainers.image.version=8.0.0 --manifest localhost\/karaokedock:release -f \S+\/dev\/Dockerfile/);
  assert.match(calls, /--manifest localhost\/karaokedock-gateway:release -f \S+\/Gateway\/Dockerfile \S+\/Gateway/);
  assert.match(calls, /docker:\/\/docker.io\/haggardj2\/karaokedock-gateway:release/);
  assert.equal(build.stationBuiltVersion(), '8.0.0');

  // Building the same version again is allowed and changes nothing.
  const again = build.run('8.0.0\n3\n');
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.deepEqual(build.versions()['src/web'], all('8.0.0'));
  // ...and the next suggestion is then 8.0.1.
  assert.equal(build.run('\n3\n').status, 0);
  assert.deepEqual(build.versions()['src/web'], all('8.0.1'));
});

test('a Station-only build needs no Docker Hub login and leaves the Gateway version alone', t => {
  const build = fixture(t);
  const result = build.run('\n3\n');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(build.calls(), '');
  assert.deepEqual(build.versions(), {
    'src/web': all('7.2.10'), 'src/server': all('7.2.10'), Gateway: all('0.1.0'), Station: all('7.2.10'),
  });
  assert.equal(build.stationBuiltVersion(), '7.2.10');
});

test('the suggestion after a pre-release is its release version', t => {
  const build = fixture(t);
  assert.equal(build.run('7.3.0-rc.1\n3\n').status, 0);
  assert.equal(build.run('\n3\n').status, 0);
  assert.deepEqual(build.versions()['src/web'], all('7.3.0'));
});

test('invalid input does not change versions', t => {
  const build = fixture(t);
  for (const input of ['not-a-version\n', '7.2\n', '\n4\n', '\n1\ninvalid/tag\n', '\n1\n\nmaybe\n', '\n1\n\n\n3\n']) {
    assert.notEqual(build.run(input).status, 0, input);
  }
  assert.deepEqual(build.versions(), Object.fromEntries(Object.entries(PACKAGES).map(([dir, v]) => [dir, all(v)])));
  assert.doesNotMatch(build.calls(), /build|push/);
});

test('a failed build keeps its version and is not published', t => {
  const build = fixture(t);
  assert.notEqual(build.run('\n1\n\n\n2\n', { BUILD_EXIT: '1' }).status, 0);
  assert.deepEqual(build.versions()['src/web'], all('7.2.10'));
  assert.doesNotMatch(build.calls(), /manifest push/);
});

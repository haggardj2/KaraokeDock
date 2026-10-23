import { transformSync } from 'esbuild'

export function transpile(source, format = 'cjs') {
  return transformSync(source, {
    loader: 'tsx',
    jsx: 'automatic',
    target: 'es2022',
    format,
  }).code
}

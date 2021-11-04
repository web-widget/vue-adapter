import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { createRequire } from "module";

// eslint-disable-next-line prettier/prettier
const require = createRequire(import.meta.url);

export default () => {
  const {
    source,
    main,
    module,
    system,
    unpkg,
    libraryName
  } = require(`./package.json`);

  return {
    input: source,
    output: [
      {
        file: unpkg,
        name: libraryName,
        exports: 'default',
        format: 'umd',
        sourcemap: true,
      },
      {
        file: module,
        format: 'esm',
        sourcemap: true,
      },
      {
        file: system,
        format: 'system',
        sourcemap: true,
      },
      {
        file: main,
        exports: 'default',
        format: 'cjs',
        sourcemap: true,
      }
    ],
      plugins: [
        resolve(),
        terser()
      ]
    }
  ;
}
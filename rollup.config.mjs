import typescript from '@rollup/plugin-typescript';
import {babel} from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import clear from 'rollup-plugin-clear';
export default [{
    input: 'src/index.ts',
    output: [
        {
            dir: 'dist',
            format: 'es',
            entryFileNames: 'index.js'
        },
        {
            dir: 'dist',
            format: 'cjs',
            entryFileNames: 'index.cjs'
        }
    ],
    plugins: [
        clear({
            targets: ['dist']
        }),
        typescript({exclude: ["**/*.test.ts"]}),
        babel({ babelHelpers: 'bundled' }),
        terser(),
    ],
    external: []
}];

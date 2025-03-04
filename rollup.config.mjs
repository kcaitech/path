import typescript from '@rollup/plugin-typescript';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

import { readFileSync } from 'fs';

const wasmPlugin = {
    name: 'wasm-plugin',
    transform(code, id) {
        if (id.endsWith('.wasm')) {
            const buffer = readFileSync(id);
            const base64 = buffer.toString('base64'); // 将二进制数据转换为 Base64
            return {
                code: `export default '${base64}';`, // 导出 Base64 字符串
                map: null,
            };
        }
    },
};


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
        commonjs(),
        resolve(),
        wasmPlugin,
        typescript({ exclude: ["**/*.test.ts"] }),
        babel({ babelHelpers: 'bundled' }),
        terser(),
    ],
    external: []
}];

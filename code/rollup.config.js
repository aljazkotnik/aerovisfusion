import pkg from './package.json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import babel from "@rollup/plugin-babel";


export default [
	// browser-friendly UMD build
	{
		input: 'src/combined.js',
		output: {
			name: 'combined',
			file: pkg.combined,
			format: 'iife',
			sourcemap: true
		},
		plugins: [
			resolve(), // so Rollup can find `ms`
			babel({
			  exclude: "node_modules/**"
			}),
			commonjs(), // so Rollup can convert `ms` to an ES module
			replace({preventAssignment: true, 'process.env.NODE_ENV': JSON.stringify( 'development' )}), // This fixed module loading!!
			babel({
			  exclude: "node_modules/**"
			})
		]
	}
];

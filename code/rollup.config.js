import pkg from './package.json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import babel from "@rollup/plugin-babel";


export default [
	// browser-friendly UMD build
	{
		input: 'src/annotations.js',
		output: {
			name: 'annotations',
			file: pkg.annotations,
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
	},
	
	{
		input: 'src/streamlines.js',
		output: {
			name: 'streamlines',
			file: pkg.streamlines,
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
	},
	
	{
		input: 'src/decals.js',
		output: {
			name: 'decals',
			file: pkg.decals,
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
	},
	
	{
		input: 'src/sandbox.js',
		output: {
			name: 'sandbox',
			file: "./dist/sandbox.js",
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

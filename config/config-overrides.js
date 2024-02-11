const path = require('path');
/* eslint-disable */
const fs = require('fs');
const {
	override,
	babelInclude,
	addWebpackAlias,
	useBabelRc,
	addWebpackModuleRule,
	Configuration,
	// addDecoratorsLegacy,
} = require('customize-cra');
// const rewireReactHotLoader = require("react-app-rewire-hot-loader");

module.exports = (config, env) => {
	config.resolve.symlinks = true; // Enable symlinks resolution
	/* -------------------------------------------------------------------------- */
	let rootdir = path.resolve('..');
	if (!path.dirname(rootdir).startsWith('react-chat-scroll')) {
		rootdir = path.resolve('../..');
	}

	config = Object.assign(
		// rewireReactHotLoader(config),
		override(
			// addWebpackAlias({
			// 	"react-dom": "@hot-loader/react-dom",
			// }),

			(c) => ({
				...c,
				output: {
					...c.output,
					filename: '[name].[fullhash:4].js',
					chunkFilename: '[name].[chunkhash:4].js',
				},
			}),
			addWebpackModuleRule({
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			}),
			addWebpackModuleRule({
				test: /\.html$/i,
				loader: 'html-loader',
			}),
			addWebpackModuleRule({
				test: /\.(cjs)$/,
				exclude: /@babel(?:\/|\\{1,2})runtime/,
				loader: require.resolve('babel-loader'),

				options: {
					babelrc: false,
					configFile: false,
					compact: false,

					presets: [
						[require.resolve('babel-preset-react-app/dependencies'), { helpers: true }],
					],
					cacheDirectory: true,
					cacheCompression: false,
					sourceMaps: true,
					inputSourceMap: true,
				},
			}),
			addWebpackAlias({
				crypto: 'crypto-browserify',
				stream: 'stream-browserify',
				path: 'path-browserify',
				'react-native': 'react-native-web',
				cldr: 'cldrjs/dist/cldr',
				cldr$: 'cldrjs',
			}),
			useBabelRc(),
			babelInclude([path.resolve('src')])
			// addDecoratorsLegacy(),
		)(config, env)
	);

	return config;
};

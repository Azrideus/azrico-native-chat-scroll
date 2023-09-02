const path = require('path');
/* eslint-disable */
const fs = require('fs');
const {
	override,
	babelInclude,
	addWebpackAlias,
	useBabelRc,
	addWebpackModuleRule,
	// addDecoratorsLegacy,
} = require('customize-cra');
// const rewireReactHotLoader = require("react-app-rewire-hot-loader");

module.exports = (config, env) => {
	config = Object.assign(
		// rewireReactHotLoader(config),
		override(
			// addWebpackAlias({
			// 	"react-dom": "@hot-loader/react-dom",
			// }),

			addWebpackModuleRule({
				test: /\.html$/i,
				loader: 'html-loader',
			}),
			addWebpackModuleRule({
				test: /\.css$/i,
				loader: 'raw-loader',
			}),
			addWebpackAlias({
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

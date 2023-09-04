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
	/* -------------------------------------------------------------------------- */
	let rootdir = path.resolve('..');
	if (!path.dirname(rootdir).startsWith('react-chatscroll')) {
		rootdir = path.resolve('../..');
	}

	const folders = ['packages'];
	const result_paths = [];

	for (let index = 0; index < folders.length; index++) {
		const current_folder = folders[index];
		const packageFolders = fs.readdirSync(path.resolve(`${rootdir}/${current_folder}`));
		const packageFiles = packageFolders.map((fld) =>
			fs.realpathSync(path.resolve(`${rootdir}/${current_folder}/${fld}/src`))
		);
		result_paths.push(...packageFiles);
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
			babelInclude([path.resolve('src'), ...result_paths])
			// addDecoratorsLegacy(),
		)(config, env)
	);

	return config;
};

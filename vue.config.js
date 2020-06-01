const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

module.exports = {
	publicPath: './',
	outputDir: './dist/',
	assetsDir: './assets/',
	filenameHashing: false,
	pages: {
		index	: 'src/index.js',
		main	: 'src/main.js',
		share	: 'src/share.js',
		notice	: 'src/notice.js'
	},
	configureWebpack: {
		plugins: [
			new MomentLocalesPlugin
		]
	}
};

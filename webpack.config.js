const defaultConfig = require('@wordpress/scripts/config/webpack.config');

// drop the RTL stylesheet copies wp-scripts emits, the styles use logical properties instead
const plugins = defaultConfig.plugins.filter(p => !(Object.values(p).length === 2 && Object.values(p)?.[1]?.filename === '[name]-rtl.css'));

module.exports = {
	...defaultConfig,
	plugins
};

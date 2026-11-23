const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const CopyPlugin = require('copy-webpack-plugin');

// drop the RTL stylesheet copies wp-scripts emits, the styles use logical properties instead
const plugins = defaultConfig.plugins.filter(p => !(Object.values(p).length === 2 && Object.values(p)?.[1]?.filename === '[name]-rtl.css'));

module.exports = {
	...defaultConfig,
	// the dashboard script, includes/class-dashboard.php loads it
	entry: () => ({
		...defaultConfig.entry(),
		dashboard: './src/dashboard/index.js'
	}),
	plugins: [
		...plugins,
		// the license of the Freemius Checkout library the Pricing tab bundles (readme: Third-party libraries)
		new CopyPlugin({ patterns: [{ from: 'node_modules/@freemius/checkout/LICENSE', to: 'freemius-checkout-LICENSE.txt' }] })
	]
};

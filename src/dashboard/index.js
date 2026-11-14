// the Poll dashboard: one React page, each tab a #/route (includes/class-dashboard.php prints only the box and the config)
import { createRoot } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import App from './App';
import Welcome from './Welcome';
import Polls from './Polls';
import Help from './Help';

const start = () => {
	const root = document.getElementById( 'alpl-dashboard' );
	const config = window.alplDashboard;
	if ( ! root || ! config ) {
		return;
	}
	// an add-on such as SoftIcon Poll Pro puts its own tabs here
	const tabs = applyFilters( 'alpl.dashboard.tabs', { welcome: Welcome, polls: Polls, help: Help }, config );
	createRoot( root ).render( <App config={ config } tabs={ tabs } /> );
};

// after every script on the page has run, so add-ons have added their tabs
if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', start );
} else {
	start();
}

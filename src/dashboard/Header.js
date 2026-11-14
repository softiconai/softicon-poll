import { __ } from '@wordpress/i18n';

const Header = ( { config, active } ) => <header className="alpl-dash-head">
	<a className="alpl-dash-brand" href="#/welcome">
		<img src={ config.icon } alt="" width="36" height="36" />
		<strong>{ __( 'Poll', 'softicon-poll' ) }</strong>
		<span className="alpl-version">v{ config.version }</span>
	</a>
	<nav className="alpl-dash-tabs" aria-label={ __( 'Poll dashboard', 'softicon-poll' ) }>
		{ config.tabs.map( ( tab ) => <a key={ tab.key } href={ '#/' + tab.key } className={ tab.key === active ? 'is-active' : undefined } aria-current={ tab.key === active ? 'page' : undefined }>
			{ tab.label }
		</a> ) }
	</nav>
	<div className="alpl-dash-end">
		<a className="alpl-dash-more" href="https://wordpress.org/plugins/author/softiconai/" target="_blank" rel="noopener noreferrer">{ __( 'Our plugins', 'softicon-poll' ) }</a>
		<a className="alpl-btn alpl-btn-coral alpl-add" href={ config.urls.newPoll }><span className="dashicons dashicons-plus-alt2" aria-hidden="true" />{ __( 'Add a poll', 'softicon-poll' ) }</a>
	</div>
</header>;

export default Header;

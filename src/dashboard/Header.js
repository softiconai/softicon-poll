import { __ } from '@wordpress/i18n';

// the group a tab is in (config.groups, includes/class-dashboard.php groups()): its tabs show as one
export const groupOf = ( config, key ) => ( config.groups || [] ).find( ( group ) => group.items.some( ( item ) => item.key === key ) );

const lockedTabs = ( config ) => config.lockedTabs || [];

// the group's tab opens the page last seen in it, else its first one that is not locked
const groupHref = ( config, group ) => {
	let last = '';
	try {
		last = window.localStorage.getItem( 'alpl-group-' + group.key ) || '';
	} catch ( e ) {
		// storage can be blocked
	}
	const keys = group.items.map( ( item ) => item.key );
	const open = keys.filter( ( key ) => ! lockedTabs( config ).includes( key ) );
	return '#/' + ( keys.includes( last ) && open.includes( last ) ? last : ( open[ 0 ] || keys[ 0 ] ) );
};

const Lock = () => <span className="dashicons dashicons-lock alpl-tab-lock" aria-label={ __( 'Locked', 'softicon-poll' ) } />;

// a locked tab (Pro without a license) opens the popup and stays where it is
const TabLink = ( { href, label, on, locked, unlock } ) => <a href={ href } className={ ( on ? 'is-active' : '' ) + ( locked ? ' is-locked' : '' ) || undefined } aria-current={ on ? 'page' : undefined }
	onClick={ locked ? ( event ) => {
		event.preventDefault();
		unlock();
	} : undefined }>
	{ label }{ locked && <Lock /> }
</a>;

const Header = ( { config, active, unlock } ) => <header className="alpl-dash-head">
	<a className="alpl-dash-brand" href="#/welcome">
		<img src={ config.icon } alt="" width="36" height="36" />
		<strong>{ config.pro ? __( 'Poll Pro', 'softicon-poll' ) : __( 'Poll', 'softicon-poll' ) }</strong>
		<span className="alpl-version">v{ config.version }</span>
	</a>
	<nav className="alpl-dash-tabs" aria-label={ __( 'Poll dashboard', 'softicon-poll' ) }>
		{ config.tabs.map( ( tab, index ) => {
			const group = groupOf( config, tab.key );
			if ( ! group ) {
				return <TabLink key={ tab.key } href={ '#/' + tab.key } label={ tab.label } on={ tab.key === active } locked={ lockedTabs( config ).includes( tab.key ) } unlock={ unlock } />;
			}
			// only where its first tab is
			if ( config.tabs.findIndex( ( other ) => groupOf( config, other.key ) === group ) !== index ) {
				return null;
			}
			return <TabLink key={ group.key } href={ groupHref( config, group ) } label={ group.label } unlock={ unlock }
				on={ group.items.some( ( item ) => item.key === active ) }
				locked={ group.items.every( ( item ) => lockedTabs( config ).includes( item.key ) ) } />;
		} ) }
	</nav>
	<div className="alpl-dash-end">
		<a className="alpl-dash-more" href="https://wordpress.org/plugins/author/softiconai/" target="_blank" rel="noopener noreferrer">{ __( 'Our plugins', 'softicon-poll' ) }</a>
		{ config.pro && ! config.locked
			? <span className="alpl-pro-on"><span className="dashicons dashicons-yes-alt" aria-hidden="true" />{ __( 'Pro active', 'softicon-poll' ) }</span>
			: <a className="alpl-btn alpl-btn-coral alpl-upgrade" href="#/pricing"><span className="dashicons dashicons-unlock" aria-hidden="true" />{ __( 'Upgrade to Pro', 'softicon-poll' ) }</a> }
	</div>
</header>;

export default Header;

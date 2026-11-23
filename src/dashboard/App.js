import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { applyFilters } from '@wordpress/hooks';
import apiFetch from '@wordpress/api-fetch';
import Header, { groupOf } from './Header';
import VideoPopup from './VideoPopup';
import useRoute from './useRoute';
import { OptInNotice } from './OptIn';

const keys = ( config ) => config.tabs.map( ( tab ) => tab.key );

// a short review request (includes/class-dashboard.php review()); any answer hides it, "later" for 30 days
const Review = ( { review } ) => {
	const [ open, setOpen ] = useState( true );
	if ( ! open ) {
		return null;
	}
	const answer = ( value ) => {
		setOpen( false );
		apiFetch( { path: '/softicon-poll/v1/dashboard/review', method: 'POST', data: { answer: value } } ).catch( () => {} );
	};
	return <div className="notice inline alpl-notice alpl-review notice-info" role="status">
		<p><strong>{ __( 'Enjoying SoftIcon Poll?', 'softicon-poll' ) }</strong> { __( 'A quick review on WordPress.org helps other people find it, and it means a lot to our small team.', 'softicon-poll' ) }</p>
		<p className="alpl-review-actions">
			<a className="button button-primary" href={ review.url } target="_blank" rel="noopener noreferrer" onClick={ () => answer( 'done' ) }>{ __( 'Leave a review', 'softicon-poll' ) }</a>
			<button type="button" className="button" onClick={ () => answer( 'later' ) }>{ __( 'Maybe later', 'softicon-poll' ) }</button>
			<button type="button" className="button-link" onClick={ () => answer( 'done' ) }>{ __( 'I already did', 'softicon-poll' ) }</button>
		</p>
	</div>;
};

// the menu of a group's pages, such as Manage: each with its icon, a line about it, and a Pro badge in the free plugin
const GroupNav = ( { group, tab, config, unlock } ) => <nav className="alpl-group-nav" aria-label={ group.label }>
	<span className="alpl-group-title">{ group.label }</span>
	{ group.items.map( ( item ) => {
		const locked = ( config.lockedTabs || [] ).includes( item.key );
		return <a key={ item.key } href={ '#/' + item.key } className={ item.key === tab ? 'is-active' : undefined } aria-current={ item.key === tab ? 'page' : undefined }
			onClick={ locked ? ( event ) => {
				event.preventDefault();
				unlock();
			} : undefined }>
			<span className={ 'alpl-group-icon dashicons dashicons-' + ( item.icon || 'admin-generic' ) } aria-hidden="true" />
			<span>
				<strong>
					{ item.label }
					{ locked && <span className="dashicons dashicons-lock alpl-tab-lock" aria-label={ __( 'Locked', 'softicon-poll' ) } /> }
					{ ( ! config.pro || locked ) && <span className="alpl-badge">{ __( 'Pro', 'softicon-poll' ) }</span> }
				</strong>
				{ item.text && <small>{ item.text }</small> }
			</span>
		</a>;
	} ) }
</nav>;

const App = ( { config, tabs } ) => {
	const [ allKeys ] = useState( () => keys( config ) );
	const route = useRoute( allKeys );
	const [ video, setVideo ] = useState( null );
	const [ lockedOpen, setLockedOpen ] = useState( false );
	const unlock = () => setLockedOpen( true );

	// '#/videos' is the video list on the Welcome tab
	const key = 'videos' === route ? 'welcome' : route;
	const tab = allKeys.includes( key ) && tabs[ key ] ? key : allKeys[ 0 ];
	const Content = tabs[ tab ];
	// Pro without a license: a locked tab reached by its address shows a short note and the popup
	const isLocked = ( config.lockedTabs || [] ).includes( tab );

	// it opens on a locked tab and closes on any other, also after the browser's Back button
	useEffect( () => {
		setLockedOpen( isLocked );
	}, [ isLocked ] );

	// the group's tab opens this page again next time
	const group = groupOf( config, tab );
	useEffect( () => {
		if ( group ) {
			try {
				window.localStorage.setItem( 'alpl-group-' + group.key, tab );
			} catch ( e ) {
				// storage can be blocked
			}
		}
	}, [ group, tab ] );

	useEffect( () => {
		if ( 'videos' === route ) {
			document.getElementById( 'alpl-videos' )?.scrollIntoView( { behavior: 'smooth' } );
		}
	}, [ route ] );

	const page = isLocked
		? <div className="alpl-card alpl-status"><span className="dashicons dashicons-lock" aria-hidden="true" />{ __( 'This is a Pro feature.', 'softicon-poll' ) }</div>
		: <Content config={ config } play={ setVideo } unlock={ unlock } />;

	return <>
		<Header config={ config } active={ tab } unlock={ unlock } />
		<div className="alpl-dash-body">
			{ config.notice && <OptInNotice notice={ config.notice } /> }
			{ config.review && <Review review={ config.review } /> }
			{ group ? <div className="alpl-group">
				<GroupNav group={ group } tab={ tab } config={ config } unlock={ unlock } />
				<div className="alpl-group-main">{ page }</div>
			</div> : page }
		</div>
		<VideoPopup video={ video } onClose={ () => setVideo( null ) } />
		{ /* SoftIcon Poll Pro without a license adds its popup here */ }
		{ applyFilters( 'alpl.dashboard.popup', null, { open: lockedOpen, onClose: () => setLockedOpen( false ), config } ) }
	</>;
};

export default App;

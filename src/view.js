import { __, sprintf } from '@wordpress/i18n';
import { resultRows, totalText } from './utils/functions';

// a REST path under the plugin's namespace, for pretty and plain (?rest_route=) permalinks
// "Voting ends in 3 hours" in the page's language, rounded up so the last second says "in 1 second";
// empty when the browser has no Intl.RelativeTimeFormat, the server's date then stays
const countdownText = ( left ) => {
	const units = [ [ 'day', 86400000 ], [ 'hour', 3600000 ], [ 'minute', 60000 ], [ 'second', 1000 ] ];
	const [ unit, size ] = units.find( ( [ , ms ] ) => left >= ms ) || units[ 3 ];
	try {
		const when = new Intl.RelativeTimeFormat( document.documentElement.lang || undefined, { numeric: 'always' } ).format( Math.max( 1, Math.ceil( left / size ) ), unit );
		/* translators: %s: how long until the poll closes, like "in 3 hours" */
		return sprintf( __( 'Voting ends %s.', 'softicon-poll' ), when );
	} catch ( e ) {
		return '';
	}
};

const endpoint = ( api, path, params = {} ) => {
	const url = new URL( api, window.location.href );
	const route = url.searchParams.get( 'rest_route' );
	if ( route ) {
		url.searchParams.set( 'rest_route', route.replace( /\/?$/, '/' ) + path );
	} else {
		url.pathname = url.pathname.replace( /\/?$/, '/' ) + path;
	}
	Object.entries( params ).forEach( ( [ key, value ] ) => url.searchParams.set( key, value ) );
	return url.toString();
};

const request = async ( config, path, { method = 'GET', params, body } = {} ) => {
	const send = ( nonce ) => fetch( endpoint( config.api, path, params ), {
		method,
		credentials: 'same-origin',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json', ...( nonce ? { 'X-WP-Nonce': nonce } : {} ) },
		body: body ? JSON.stringify( body ) : undefined,
	} );
	let response = await send( config.nonce );
	let data = await response.json().catch( () => ( {} ) );
	// a page cached with an old nonce: ask again as a logged-out visitor
	if ( config.nonce && 'rest_cookie_invalid_nonce' === data.code ) {
		config.nonce = '';
		response = await send( '' );
		data = await response.json().catch( () => ( {} ) );
	}
	return { ok: response.ok, data };
};

// polls that start together ask for their state in one request, 50 at most (the server's limit)
const BATCH = 50;
let waiting = null;

const ask = ( poll ) => request( poll.config, 'results/' + poll.config.id ).then( ( { ok, data } ) => {
	if ( ! ok ) {
		throw data;
	}
	return data;
} );

const sendGroup = async ( group ) => {
	const ids = [ ...new Set( group.map( ( item ) => item.poll.config.id ) ) ];
	// one config for the request, so a stale nonce dropped by request() is dropped for every poll
	const shared = { ...group[ 0 ].poll.config };
	let response;
	try {
		response = await request( shared, 'results', { params: { ids: ids.join( ',' ) } } );
	} catch ( e ) {
		response = { ok: false, data: {} };
	}
	group.forEach( ( { poll } ) => {
		poll.config.nonce = shared.nonce;
	} );
	const { ok, data } = response;

	if ( ok && data.polls ) {
		group.forEach( ( { poll, resolve, reject } ) => {
			const state = data.polls[ poll.config.id ];
			if ( state ) {
				resolve( state );
			} else {
				reject( { message: data.errors?.[ poll.config.id ] } );
			}
		} );
		return;
	}
	// an answer from WordPress, such as the plugin's own refusal or a busy server, is the same for every poll
	if ( data.code && 'rest_no_route' !== data.code ) {
		group.forEach( ( { reject } ) => reject( data ) );
		return;
	}
	// the route is missing or blocked before WordPress, such as by a firewall: one request each
	group.forEach( ( { poll, resolve, reject } ) => ask( poll ).then( resolve, reject ) );
};

const flush = () => {
	const queue = waiting;
	waiting = null;
	// a page normally has one API address and nonce; polls with different ones go in their own requests
	const groups = new Map();
	queue.forEach( ( item ) => {
		const key = item.poll.config.api + '|' + ( item.poll.config.nonce || '' );
		groups.set( key, [ ...( groups.get( key ) || [] ), item ] );
	} );
	groups.forEach( ( group ) => {
		for ( let i = 0; i < group.length; i += BATCH ) {
			sendGroup( group.slice( i, i + BATCH ) );
		}
	} );
};

const loadState = ( poll ) => new Promise( ( resolve, reject ) => {
	if ( ! waiting ) {
		waiting = [];
		// after the current IntersectionObserver callback, which starts every poll near the screen at once
		setTimeout( flush );
	}
	waiting.push( { poll, resolve, reject } );
} );

class Poll {
	constructor( el ) {
		this.el = el;
		this.config = JSON.parse( el.dataset.alpl || '{}' );
		const q = ( selector ) => el.querySelector( selector );
		this.form = q( '.alpl_form' );
		this.inputs = [ ...el.querySelectorAll( '.alpl_input' ) ];
		this.voteButton = q( '.alpl_vote' );
		this.showButton = q( '.alpl_show' );
		this.backButton = q( '.alpl_back' );
		this.results = q( '.alpl_results' );
		this.total = q( '.alpl_total' );
		this.message = q( '.alpl_message' );
		this.rows = [ ...el.querySelectorAll( '.alpl_row' ) ];
		// the author's order, sorting starts from it so ties keep their place
		this.order = [ ...this.rows ];
		this.state = null;
	}

	init() {
		this.form.addEventListener( 'submit', ( event ) => {
			event.preventDefault();
			this.vote();
		} );
		this.inputs.forEach( ( input ) => input.addEventListener( 'change', () => this.limit() ) );
		this.showButton?.addEventListener( 'click', () => this.showResults( true ) );
		this.backButton?.addEventListener( 'click', () => this.showForm() );
		this.load();
		if ( this.config.end * 1000 > Date.now() ) {
			this.tick();
			this.timer = setInterval( () => this.tick(), 1000 );
		}
	}

	// "Voting ends in 3 hours", in the page's language; at the end the server says whether the poll closed
	tick() {
		const left = ( this.config.end * 1000 ) - Date.now();
		if ( left <= 0 ) {
			this.stopTimer();
			setTimeout( () => this.load(), 1500 );
			return;
		}
		const text = countdownText( left );
		if ( text ) {
			this.meta( text );
		} else {
			this.stopTimer();
		}
	}

	stopTimer() {
		clearInterval( this.timer );
		this.timer = null;
	}

	async load() {
		this.el.classList.add( 'alpl_busy' );
		try {
			this.apply( await loadState( this ) );
		} catch ( error ) {
			this.say( error?.message || __( 'The poll could not be loaded. Please reload the page.', 'softicon-poll' ) );
		} finally {
			this.el.classList.remove( 'alpl_busy' );
		}
	}

	apply( state ) {
		this.state = state;
		this.inputs.forEach( ( input ) => {
			input.checked = state.choices.includes( input.value );
		} );

		if ( ! state.open ) {
			this.stopTimer();
			this.meta( __( 'This poll is closed.', 'softicon-poll' ) );
		}

		if ( state.canVote ) {
			this.showForm();
			return;
		}

		this.lock();
		if ( state.results ) {
			this.showResults( false );
		} else {
			this.showForm();
		}

		if ( state.needsLogin ) {
			// back to this page after logging in
			const login = new URL( this.config.login, window.location.href );
			login.searchParams.set( 'redirect_to', window.location.href );
			this.say( __( 'Please log in to vote.', 'softicon-poll' ), login.toString() );
		} else if ( state.voted && ! state.results ) {
			this.say( this.thanks( 'closed' === this.config.showResults && state.open ) );
		}
	}

	// no more voting from this page
	lock() {
		this.inputs.forEach( ( input ) => {
			input.disabled = true;
		} );
		this.voteButton.hidden = true;
	}

	showForm() {
		this.form.hidden = false;
		this.results.hidden = true;
		const canVote = !! this.state?.canVote;
		this.voteButton.hidden = ! canVote;
		if ( this.showButton ) {
			this.showButton.hidden = ! canVote || ! this.state.results;
		}
		if ( canVote ) {
			this.inputs.forEach( ( input ) => {
				input.disabled = false;
			} );
			this.limit();
		}
	}

	// peek: the visitor asked to see the results before voting
	showResults( peek ) {
		const { results, choices } = this.state;
		const rows = resultRows( results, this.config.format );

		// most votes first; the list's order is what screen readers read too
		if ( this.config.sort ) {
			const count = ( row ) => results.counts?.[ row.dataset.option ] || 0;
			this.rows = [ ...this.order ].sort( ( a, b ) => count( b ) - count( a ) );
			this.rows[ 0 ]?.parentNode.append( ...this.rows );
		}

		this.rows.forEach( ( row ) => {
			const data = rows[ row.dataset.option ] || { percent: 0, value: '' };
			const mine = choices.includes( row.dataset.option );
			row.querySelector( '.alpl_row_value' ).textContent = data.value;
			row.classList.toggle( 'is-mine', mine );
			row.classList.toggle( 'is-top', data.top );
			this.yours( row, mine );
			row.style.setProperty( '--alpl-percent', '0%' );
		} );

		this.total.textContent = this.config.showTotal ? this.totalText( results.voters ) : '';
		this.form.hidden = true;
		this.results.hidden = false;
		if ( this.backButton ) {
			this.backButton.hidden = ! peek;
		}

		// two frames so the bars grow from zero
		requestAnimationFrame( () => requestAnimationFrame( () => this.rows.forEach( ( row ) => {
			row.style.setProperty( '--alpl-percent', ( rows[ row.dataset.option ]?.percent || 0 ) + '%' );
		} ) ) );
	}

	// a "Your vote" tag beside the visitor's answer, made here so the page's HTML stays the same
	yours( row, mine ) {
		let tag = row.querySelector( '.alpl_yours' );
		if ( mine && ! tag ) {
			tag = Object.assign( this.el.ownerDocument.createElement( 'span' ), { className: 'alpl_yours', textContent: __( 'Your vote', 'softicon-poll' ) } );
			row.querySelector( '.alpl_row_label' ).append( tag );
		}
		if ( tag ) {
			tag.hidden = ! mine;
		}
	}

	// the author's own thank-you text, or the default one
	thanks( later = false ) {
		const own = ( this.config.thanks || '' ).trim();
		if ( ! own ) {
			return later ? __( 'Thanks for voting! The results will be shown when the poll closes.', 'softicon-poll' ) : __( 'Thanks for voting!', 'softicon-poll' );
		}
		return later ? own + ' ' + __( 'The results will be shown when the poll closes.', 'softicon-poll' ) : own;
	}

	totalText( voters ) {
		return totalText( voters, this.config.multiple );
	}

	// the results as one sentence for screen readers
	summary() {
		const rows = resultRows( this.state.results, this.config.format );
		// the answer's text only, not the hidden "Your vote" tag
		const name = ( row ) => row.querySelector( '.alpl_text' )?.textContent.trim() || row.querySelector( '.alpl_image' )?.alt.trim() || '';
		const parts = this.rows.map( ( row ) => name( row ) + ': ' + ( rows[ row.dataset.option ]?.value || '' ) );
		return parts.join( ', ' ) + '. ' + ( this.config.showTotal ? this.totalText( this.state.results.voters ) + '.' : '' );
	}

	// at most config.max checkboxes
	limit() {
		const checked = this.inputs.filter( ( input ) => input.checked ).length;
		if ( this.config.multiple ) {
			const full = checked >= this.config.max;
			this.inputs.forEach( ( input ) => {
				input.disabled = full && ! input.checked;
			} );
		}
		this.voteButton.disabled = ! checked;
	}

	async vote() {
		const choices = this.inputs.filter( ( input ) => input.checked ).map( ( input ) => input.value );
		if ( ! choices.length || ! this.state?.canVote ) {
			return;
		}

		this.voteButton.disabled = true;
		this.el.classList.add( 'alpl_busy' );
		try {
			const { ok, data } = await request( this.config, 'vote', { method: 'POST', body: { poll: this.config.id, choices } } );
			if ( ok ) {
				this.apply( data );
				if ( data.results ) {
					this.say( this.thanks(), '', this.summary() );
				}
			} else if ( data.data?.state ) {
				this.apply( data.data.state );
				this.say( data.message );
			} else {
				this.say( data.message || __( 'Your vote could not be saved. Please try again.', 'softicon-poll' ) );
				this.limit();
			}
		} catch ( error ) {
			this.say( __( 'Your vote could not be saved. Please try again.', 'softicon-poll' ) );
			this.limit();
		} finally {
			this.el.classList.remove( 'alpl_busy' );
		}
	}

	// the status line; with a link the text becomes one, extra is read by screen readers only
	say( text, link = '', extra = '' ) {
		const doc = this.el.ownerDocument;
		const content = link ? Object.assign( doc.createElement( 'a' ), { href: link, textContent: text } ) : doc.createTextNode( text );
		const nodes = [ content ];
		if ( extra ) {
			nodes.push( Object.assign( doc.createElement( 'span' ), { className: 'screen-reader-text', textContent: ' ' + extra } ) );
		}
		this.message.replaceChildren( ...nodes );
	}

	meta( text ) {
		let meta = this.el.querySelector( ':scope > .alpl_meta' );
		if ( ! meta ) {
			meta = Object.assign( this.el.ownerDocument.createElement( 'p' ), { className: 'alpl_meta' } );
			this.el.append( meta );
		}
		meta.textContent = text;
	}
}

const start = ( el ) => {
	if ( el.alpl ) {
		return;
	}
	try {
		el.alpl = new Poll( el );
		el.alpl.init();
	} catch ( e ) {
		// eslint-disable-next-line no-console
		console.error( 'SoftIcon Poll:', e );
	}
};

// done at once for every poll, before one starts near the screen, so nothing jumps in view:
// the author's button text, and the answers in a new order for each visitor (the HTML may be cached)
const prepare = ( el ) => {
	// boot() runs again when a page builder redraws a widget; a poll is prepared once
	if ( el.alplReady ) {
		return;
	}
	el.alplReady = true;
	let config;
	try {
		config = JSON.parse( el.dataset.alpl );
	} catch ( e ) {
		return;
	}
	// the countdown's first text, so the date does not show first and then change
	const meta = el.querySelector( ':scope > .alpl_meta' );
	const left = ( ( config.end || 0 ) * 1000 ) - Date.now();
	if ( meta && left > 0 ) {
		meta.textContent = countdownText( left ) || meta.textContent;
	}
	const text = ( config.vote || '' ).trim();
	const button = el.querySelector( '.alpl_vote' );
	if ( text && button ) {
		button.textContent = text;
	}
	const list = el.querySelector( '.alpl_options' );
	if ( config.shuffle && list ) {
		const items = [ ...list.children ];
		for ( let i = items.length - 1; i > 0; i-- ) {
			const j = Math.floor( Math.random() * ( i + 1 ) );
			[ items[ i ], items[ j ] ] = [ items[ j ], items[ i ] ];
		}
		list.append( ...items );
	}
};

// nothing is asked of the server until a poll gets near the screen; then every poll on the page starts,
// so they share one request instead of one each while the visitor scrolls
const boot = () => {
	const polls = [ ...document.querySelectorAll( '.alpl_poll[data-alpl]' ) ].filter( ( el ) => ! el.alpl );
	polls.forEach( prepare );
	if ( ! ( 'IntersectionObserver' in window ) ) {
		polls.forEach( start );
		return;
	}
	const observer = new IntersectionObserver( ( entries ) => {
		if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
			observer.disconnect();
			polls.forEach( start );
		}
	}, { rootMargin: '300px 0px' } );
	polls.forEach( ( el ) => observer.observe( el ) );
};

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', boot );
} else {
	boot();
}

// many calls in a row (Elementor calls once per element) look for new polls once
let queued = false;
const bootSoon = () => {
	if ( ! queued ) {
		queued = true;
		requestAnimationFrame( () => {
			queued = false;
			boot();
		} );
	}
};

// polls added to the page later (a shortcode loaded by a popup or a builder) start with this event
window.addEventListener( 'alpl:boot', bootSoon );

// Elementor's editor preview draws a widget again after each change, such as a Shortcode widget with a poll
const elementor = () => window.elementorFrontend?.hooks?.addAction( 'frontend/element_ready/global', bootSoon );
if ( window.elementorFrontend?.hooks ) {
	elementor();
} else {
	window.jQuery?.( window ).on( 'elementor/frontend/init', elementor );
}

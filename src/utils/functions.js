import { __, _n, sprintf } from '@wordpress/i18n';

// percent and label per answer, the same for the page and the editor preview;
// percent is of the people who voted, so with several answers each the shares can add up past 100
export const resultRows = ( results, format ) => {
	const { counts = {}, voters = 0 } = results || {};
	const top = Math.max( 0, ...Object.values( counts ) );
	const lang = document.documentElement.lang || undefined;

	return Object.fromEntries( Object.entries( counts ).map( ( [ id, count ] ) => {
		const percent = voters ? Math.round( ( count / voters ) * 100 ) : 0;
		/* translators: %1$d: a share of the votes, like 40 */
		const share = sprintf( __( '%1$d%%', 'softicon-poll' ), percent );
		/* translators: %s: number of votes */
		const votes = sprintf( _n( '%s vote', '%s votes', count, 'softicon-poll' ), count.toLocaleString( lang ) );
		const value = { percent: share, count: votes }[ format ] || share + ' · ' + votes;
		return [ id, { percent, value, top: count > 0 && count === top } ];
	} ) );
};

// the line under the results: with several answers each, people are counted, not votes
export const totalText = ( voters, multiple ) => {
	const number = voters.toLocaleString( document.documentElement.lang || undefined );
	if ( multiple ) {
		/* translators: %s: number of people who voted */
		return sprintf( _n( '%s voter', '%s voters', voters, 'softicon-poll' ), number );
	}
	/* translators: %s: number of votes */
	return sprintf( _n( '%s vote', '%s votes', voters, 'softicon-poll' ), number );
};

// ids made in the editor: a poll's lives in the votes table, an answer's only inside its poll
const randomId = ( length ) => {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = window.crypto.getRandomValues( new Uint8Array( length ) );
	return [ ...bytes ].map( ( byte ) => chars[ byte % chars.length ] ).join( '' );
};

export const newPollId = () => randomId( 12 );

export const newOptionId = ( options ) => {
	let id;
	do {
		id = 'o' + randomId( 5 );
	} while ( options.some( ( option ) => option.id === id ) );
	return id;
};

// the same check as Block::color() in PHP, so the editor shows what the page will: hex or a preset var(), rgb(a) as hex
export const safeColor = ( value ) => {
	const color = 'string' === typeof value ? value.trim() : '';
	if ( /^(#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\))$/i.test( color ) ) {
		return color;
	}
	const rgb = color.match( /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:\s*[,/]\s*([0-9.]+)(%?))?\s*\)$/i );
	if ( ! rgb ) {
		return undefined;
	}
	const hex = ( n ) => Math.round( Math.min( 255, n ) ).toString( 16 ).padStart( 2, '0' );
	const alpha = rgb[ 4 ] ? hex( Math.min( 1, rgb[ 4 ] / ( rgb[ 5 ] ? 100 : 1 ) ) * 255 ) : '';
	return '#' + hex( +rgb[ 1 ] ) + hex( +rgb[ 2 ] ) + hex( +rgb[ 3 ] ) + alpha;
};

// 2 to 4 columns, else 0 (a list); the same rounding as render.php's absint()
export const columnCount = ( columns ) => {
	const count = Math.min( 4, Math.floor( Number( columns ) || 0 ) );
	return count > 1 ? count : 0;
};

export const cssVars = ( { bgColor, textColor, accentColor, barBgColor, borderColor, buttonColor, buttonTextColor, columns } ) => ( {
	'--alpl-bg': safeColor( bgColor ),
	'--alpl-text': safeColor( textColor ),
	'--alpl-accent': safeColor( accentColor ),
	'--alpl-bar-bg': safeColor( barBgColor ),
	'--alpl-border': safeColor( borderColor ),
	'--alpl-button': safeColor( buttonColor ),
	'--alpl-button-text': safeColor( buttonTextColor ),
	'--alpl-columns': columnCount( columns ) || undefined,
} );

// media library items and fresh uploads keep the alt text in different places
export const toImage = ( media ) => ( {
	id: media.id,
	url: media.sizes?.medium?.url || media.url || media.source_url,
	alt: media.alt || media.alt_text || '',
} );

export const hasText = ( html ) => '' !== ( html || '' ).replace( /<[^>]*>/g, '' ).trim();

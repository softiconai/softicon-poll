// the free plugin's Manage pages: a working demo of each Pro screen with sample data (src/dashboard/ProPage.js);
// it can be clicked and changed, nothing is saved or sent
import { useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

// the same numbers on every visit: a small seeded generator
const seeded = ( start ) => {
	let seed = start;
	return () => {
		seed = ( ( seed * 9301 ) + 49297 ) % 233280;
		return seed / 233280;
	};
};

const Seg = ( { value, options, onChange, label } ) => <div className="alpl-try-seg" role="radiogroup" aria-label={ label }>
	{ options.map( ( [ key, text ] ) => <button type="button" key={ key } role="radio" aria-checked={ key === value } className={ key === value ? 'is-on' : '' } onClick={ () => onChange( key ) }>{ text }</button> ) }
</div>;

const Locked = ( { children } ) => <span className="alpl-try-locked"><span className="dashicons dashicons-lock" aria-hidden="true" />{ children }</span>;

const AnalyticsDemo = () => {
	const [ days, setDays ] = useState( 30 );
	const answers = [
		[ __( 'Saturday morning', 'softicon-poll' ), 0.41 ],
		[ __( 'Friday evening', 'softicon-poll' ), 0.33 ],
		[ __( 'Sunday afternoon', 'softicon-poll' ), 0.19 ],
		[ __( 'Other', 'softicon-poll' ), 0.07 ],
	];
	const data = useMemo( () => {
		const random = seeded( days );
		const bars = Array.from( { length: days }, ( item, i ) => Math.round( 12 + ( random() * 30 ) + ( Math.sin( i / 3 ) * 8 ) ) );
		const votes = bars.reduce( ( sum, n ) => sum + n, 0 );
		return { bars, votes, voters: Math.round( votes * 0.86 ), written: Math.round( votes * 0.07 ) };
	}, [ days ] );
	const top = Math.max( ...data.bars );

	return <>
		<div className="alpl-try-row">
			<Seg label={ __( 'Period', 'softicon-poll' ) } value={ days } onChange={ setDays }
				options={ [ [ 7, __( '7 days', 'softicon-poll' ) ], [ 30, __( '30 days', 'softicon-poll' ) ], [ 90, __( '90 days', 'softicon-poll' ) ] ] } />
			<Locked>{ __( 'Download CSV', 'softicon-poll' ) }</Locked>
		</div>
		<div className="alpl-try-stats">
			{ [
				[ __( 'Votes', 'softicon-poll' ), data.votes.toLocaleString() ],
				[ __( 'Voters', 'softicon-poll' ), data.voters.toLocaleString() ],
				[ __( 'Votes per day', 'softicon-poll' ), ( data.votes / days ).toFixed( 1 ) ],
				[ __( 'Written answers', 'softicon-poll' ), data.written.toLocaleString() ],
			].map( ( [ label, value ] ) => <div key={ label }><small>{ label }</small><strong>{ value }</strong></div> ) }
		</div>
		<div className="alpl-try-chart" aria-label={ __( 'Votes per day', 'softicon-poll' ) } role="img">
			{ data.bars.map( ( n, i ) => <i key={ i } style={ { height: ( ( n / top ) * 100 ) + '%' } } title={ String( n ) } /> ) }
		</div>
		<table className="alpl-try-table">
			<thead><tr><th>{ __( 'Which day suits the workshop?', 'softicon-poll' ) }</th><th>{ __( 'Votes', 'softicon-poll' ) }</th><th>{ __( 'Share', 'softicon-poll' ) }</th></tr></thead>
			<tbody>{ answers.map( ( [ name, share ] ) => <tr key={ name }>
				<td>{ name }</td>
				<td>{ Math.round( data.votes * share ).toLocaleString() }</td>
				<td><span className="alpl-try-bar"><i style={ { width: ( share * 100 ) + '%' } } /></span>{ Math.round( share * 100 ) }%</td>
			</tr> ) }</tbody>
		</table>
	</>;
};

const SettingsDemo = () => {
	const [ provider, setProvider ] = useState( 'turnstile' );
	const providers = [
		[ '', __( 'None', 'softicon-poll' ) ],
		[ 'turnstile', 'Cloudflare Turnstile' ],
		[ 'hcaptcha', 'hCaptcha' ],
		[ 'recaptcha', 'Google reCAPTCHA v3' ],
	];
	const notes = {
		'': __( 'Votes are not checked for robots.', 'softicon-poll' ),
		turnstile: __( 'Free, and usually no puzzle for visitors.', 'softicon-poll' ),
		hcaptcha: __( 'Free plan; visitors may get a picture puzzle.', 'softicon-poll' ),
		recaptcha: __( 'No box to tick; Google scores each vote.', 'softicon-poll' ),
	};
	return <>
		<span className="alpl-try-label">{ __( 'CAPTCHA service', 'softicon-poll' ) }</span>
		<Seg label={ __( 'CAPTCHA service', 'softicon-poll' ) } value={ provider } onChange={ setProvider } options={ providers } />
		<p className="alpl-try-note">{ notes[ provider ] }</p>
		{ provider && <div className="alpl-try-keys">
			<div>
				<label className="alpl-try-label" htmlFor="alpl-try-site">{ __( 'Site key', 'softicon-poll' ) }</label>
				<input id="alpl-try-site" type="text" className="alpl-try-input" defaultValue="0x4AAAAAAA-sample-site-key" />
			</div>
			<div>
				<label className="alpl-try-label" htmlFor="alpl-try-secret">{ __( 'Secret key', 'softicon-poll' ) }</label>
				<input id="alpl-try-secret" type="password" className="alpl-try-input" defaultValue="sample-secret" />
			</div>
		</div> }
		<p className="alpl-try-row"><Locked>{ __( 'Save settings', 'softicon-poll' ) }</Locked></p>
	</>;
};

const demos = { analytics: AnalyticsDemo, settings: SettingsDemo };

const ProDemo = ( { name, title } ) => {
	const Demo = demos[ name ];
	return <section className="alpl-try">
		<header>
			<span className="alpl-try-badge"><span className="dashicons dashicons-visibility" aria-hidden="true" />{ __( 'Try it', 'softicon-poll' ) }</span>
			<p>{ sprintf(
				/* translators: %s: the Pro feature, such as Poll analytics */
				__( 'A working demo of %s with sample data. Click around; nothing is saved.', 'softicon-poll' ), title ) }</p>
		</header>
		<div className="alpl-try-body"><Demo /></div>
	</section>;
};

export default ProDemo;

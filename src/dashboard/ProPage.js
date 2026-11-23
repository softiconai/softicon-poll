// The free plugin's Manage pages (Analytics, Settings): what each Pro page does, a working demo and the way to Pro;
// SoftIcon Poll Pro replaces them with the real pages
import { __ } from '@wordpress/i18n';
import VideoLink from './VideoLink';
import ProDemo from './ProDemo';

const pages = () => ( {
	analytics: {
		icon: 'chart-area',
		eyebrow: __( 'Insights', 'softicon-poll' ),
		title: __( 'Poll analytics', 'softicon-poll' ),
		text: __( 'See when people vote, how each answer does, and share a poll with a QR code.', 'softicon-poll' ),
		points: [
			__( 'Votes over time, by hour, day or month', 'softicon-poll' ),
			__( 'Today, 7, 30 or 90 days, all time, or your own dates', 'softicon-poll' ),
			__( 'Every vote or a summary as a CSV file', 'softicon-poll' ),
			__( 'Read the answers people wrote in "Other"', 'softicon-poll' ),
			__( 'A QR code, a vote page and a full-screen presentation for each poll', 'softicon-poll' ),
		],
	},
	settings: {
		icon: 'shield',
		eyebrow: __( 'Site', 'softicon-poll' ),
		title: __( 'CAPTCHA and settings', 'softicon-poll' ),
		text: __( 'Stop robots from voting with the CAPTCHA service you like.', 'softicon-poll' ),
		points: [
			__( 'Cloudflare Turnstile, hCaptcha or Google reCAPTCHA v3', 'softicon-poll' ),
			__( 'Checked on your server, so a robot cannot skip it', 'softicon-poll' ),
			__( 'Its script loads only on pages with such a poll', 'softicon-poll' ),
			__( 'Turn it on for each poll in its Voting rules', 'softicon-poll' ),
		],
	},
} );

const ProPage = ( { name, play } ) => {
	const page = pages()[ name ];
	return <div className="alpl-pp-wrap">
		<div className="alpl-pp">
			<header className="alpl-pp-hero">
				<span className={ 'alpl-pp-icon dashicons dashicons-' + page.icon } aria-hidden="true" />
				<div>
					<span className="alpl-pp-eyebrow">{ page.eyebrow } <span className="alpl-badge">{ __( 'Pro', 'softicon-poll' ) }</span></span>
					<h2>{ page.title }</h2>
					<p>{ page.text }</p>
				</div>
			</header>
			<div className="alpl-pp-body">
				<ul className="alpl-pp-points">
					{ page.points.map( ( point ) => <li key={ point }><span className="dashicons dashicons-yes" aria-hidden="true" />{ point }</li> ) }
				</ul>
				<div className="alpl-pp-actions">
					<a className="alpl-btn alpl-btn-coral" href="#/pricing">{ __( 'See Pro plans', 'softicon-poll' ) }</a>
					<a className="alpl-pp-link" href="#/compare">{ __( 'Compare Free and Pro', 'softicon-poll' ) }</a>
					{ page.video && <VideoLink url={ page.video } title={ page.title } play={ play } className="alpl-pp-link">
						<span className="dashicons dashicons-controls-play" aria-hidden="true" />{ __( 'Watch it in action', 'softicon-poll' ) }
					</VideoLink> }
				</div>
			</div>
		</div>
		<ProDemo name={ name } title={ page.title } />
	</div>;
};

// one component per tab, for the dashboard's tab list
export const proPages = () => Object.fromEntries( [ 'analytics', 'settings' ].map( ( name ) => [ name, ( props ) => <ProPage name={ name } { ...props } /> ] ) );

export default ProPage;

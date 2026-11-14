// the Help tab: the ways to get help, quick answers (from readme.txt's FAQ) and the site details a support topic needs
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import VideoLink from './VideoLink';
import { copyText } from './Copy';

const external = { target: '_blank', rel: 'noopener noreferrer' };
const FORUM = 'https://wordpress.org/support/plugin/softicon-poll/';
const EMAIL = 'softiconai@gmail.com';

const answers = () => [
	{
		q: __( 'Do I need an account or an outside service?', 'softicon-poll' ),
		a: __( 'No. Everything runs on your own site, and the votes are saved in your own database, in a table named wp_alpl_votes (with your table prefix).', 'softicon-poll' ),
	},
	{
		q: __( 'How does "one vote per person" work?', 'softicon-poll' ),
		a: __( 'A logged-in visitor votes once per account. Other visitors are recognised by a browser cookie and by a scrambled code made from the IP address, so clearing cookies does not allow a second vote. People who share one connection, like a family or an office, share one IP address: turn on "Only logged-in users" in the Voting panel if every account should vote once.', 'softicon-poll' ),
	},
	{
		q: __( 'Does it work with the Classic Editor or page builders?', 'softicon-poll' ),
		a: __( 'Yes. Go to Poll → All Polls, click Add a poll, write the question and the answers and publish. The list shows its shortcode, such as [softicon_poll id="123"]; paste it in the Classic Editor, a widget, Elementor\'s Shortcode widget, a Code module in Divi, an HTML module in Beaver Builder, a Text Block in WPBakery or the Shortcode element in Bricks and Oxygen.', 'softicon-poll' ),
	},
	{
		q: __( 'Does it work with caching plugins?', 'softicon-poll' ),
		a: __( 'Yes. The page holds only the question and the answers. Whether the visitor has voted, and the results, are loaded from your site when the poll comes into view, so a cached page still shows the current results and a poll you have closed.', 'softicon-poll' ),
	},
	{
		q: __( 'My site is behind Cloudflare or another proxy. Does that matter?', 'softicon-poll' ),
		a: __( 'Behind Cloudflare the plugin reads the visitor\'s real address from Cloudflare\'s header, but only when the request really comes from Cloudflare. Behind another proxy every visitor may seem to have the same address; return the real one with the alpl_voter_ip filter.', 'softicon-poll' ),
	},
	{
		q: __( 'Why do the percentages add up to more than 100%?', 'softicon-poll' ),
		a: __( 'Only in polls that allow several answers. The percent is the share of people who voted that picked that answer, so if every voter picks two answers the shares add up to 200%.', 'softicon-poll' ),
	},
	{
		q: __( 'Can I put a poll in the sidebar or footer?', 'softicon-poll' ),
		a: __( 'Yes. With a block theme, add it to a template or template part, such as the footer, in the Site Editor. With a classic theme, put the poll\'s shortcode in a Shortcode or Text widget, or put the poll in a synced pattern and add that pattern to the widget area.', 'softicon-poll' ),
	},
	{
		q: __( 'What happens if I copy a poll to another post?', 'softicon-poll' ),
		a: __( 'The copy gets its own new id when you open it in the editor, so the two polls keep separate votes. A poll inside a synced pattern keeps one set of votes wherever the pattern is used.', 'softicon-poll' ),
	},
	{
		q: __( 'How do I reset the votes?', 'softicon-poll' ),
		a: __( 'Select the poll, open the Votes panel in the block settings and click "Reset votes". You are asked to confirm first.', 'softicon-poll' ),
	},
	{
		q: __( 'Is it GDPR friendly?', 'softicon-poll' ),
		a: __( 'The plugin saves the chosen answers and a scrambled code made from the user account or the IP address, which can\'t be turned back into the address. Visitors who are not logged in get a cookie for one year. Suggested text for your privacy policy is under Settings → Privacy → Policy Guide.', 'softicon-poll' ),
	},
	{
		q: __( 'What is removed when I delete the plugin?', 'softicon-poll' ),
		a: __( 'The votes table, its settings and the note of which post each poll belongs to. The polls in your posts stay as blocks. Deleting a post for good also deletes the votes of the polls made in it.', 'softicon-poll' ),
	},
];

// the details a support topic asks for, copied to paste into it; nothing is sent anywhere
const siteDetails = ( config ) => [
	[ __( 'Plugin', 'softicon-poll' ), 'SoftIcon Poll ' + config.version ],
	[ 'WordPress', config.site?.wp || '' ],
	[ 'PHP', config.site?.php || '' ],
	[ __( 'Theme', 'softicon-poll' ), config.site?.theme || '' ],
	[ __( 'Browser', 'softicon-poll' ), window.navigator.userAgent.replace( /^Mozilla\/5\.0 /, '' ) ],
];

const Help = ( { config, play } ) => {
	const [ query, setQuery ] = useState( '' );
	const [ open, setOpen ] = useState( 0 );
	const [ copied, setCopied ] = useState( false );
	const details = siteDetails( config );
	const video = config.videos[ 0 ];

	const words = query.trim().toLowerCase();
	const found = answers().filter( ( item ) => ! words || ( item.q + ' ' + item.a ).toLowerCase().includes( words ) );

	const copy = () => copyText( details.map( ( [ name, value ] ) => name + ': ' + value ).join( '\n' ) ).then( () => {
		setCopied( true );
		setTimeout( () => setCopied( false ), 1800 );
	} ).catch( () => {} );

	const ways = [
		{
			icon: 'groups', title: __( 'Support forum', 'softicon-poll' ), href: FORUM, main: true,
			text: __( 'Ask on WordPress.org; the people who build the plugin answer, and you can search past answers.', 'softicon-poll' ),
			cta: __( 'Visit the forum', 'softicon-poll' ),
		},
		{ icon: 'editor-help', title: __( 'Questions and answers', 'softicon-poll' ), href: 'https://wordpress.org/plugins/softicon-poll/#faq', text: __( 'Every question from the plugin page, in one list.', 'softicon-poll' ), cta: __( 'Read the FAQ', 'softicon-poll' ) },
		video && { icon: 'video-alt3', title: __( 'Video', 'softicon-poll' ), video, text: __( 'The whole plugin in half a minute.', 'softicon-poll' ), cta: __( 'Watch here', 'softicon-poll' ) },
		{ icon: 'email-alt', title: __( 'Email', 'softicon-poll' ), href: 'mailto:' + EMAIL, mail: true, text: EMAIL, cta: __( 'Write to us', 'softicon-poll' ) },
	].filter( Boolean );

	const card = ( way ) => <>
		<span className={ 'alpl-hp-icon dashicons dashicons-' + way.icon } aria-hidden="true" />
		<strong>{ way.title }</strong>
		<small>{ way.text }</small>
		<b>{ way.cta } { ! way.video && ! way.mail && <span aria-hidden="true">↗</span> }</b>
	</>;

	return <div className="alpl-hp">
		<header className="alpl-hp-hero">
			<div>
				<span className="alpl-hp-eyebrow">{ __( 'Support', 'softicon-poll' ) }</span>
				<h2>{ __( 'How can we help?', 'softicon-poll' ) }</h2>
				<p>{ __( 'A real person reads every message: the developers who build SoftIcon Poll.', 'softicon-poll' ) }</p>
			</div>
			<div className="alpl-hp-search">
				<span className="dashicons dashicons-search" aria-hidden="true" />
				<input type="search" value={ query } onChange={ ( event ) => {
					setQuery( event.target.value );
					setOpen( 0 );
				} } placeholder={ __( 'Search the answers', 'softicon-poll' ) } aria-label={ __( 'Search the answers', 'softicon-poll' ) } />
			</div>
		</header>

		<div className="alpl-hp-ways">
			{ ways.map( ( way ) => way.video
				? <VideoLink key={ way.title } className="alpl-hp-way" url={ way.video.url } title={ way.video.title } play={ play }>{ card( way ) }</VideoLink>
				: <a key={ way.title } className={ 'alpl-hp-way' + ( way.main ? ' is-main' : '' ) } href={ way.href } { ...( way.mail ? {} : external ) }>{ card( way ) }</a> ) }
		</div>

		<div className="alpl-hp-body">
			<section className="alpl-hp-panel">
				<header>
					<h3>{ __( 'Quick answers', 'softicon-poll' ) }</h3>
					<span>{ words ? sprintf(
						/* translators: %d: the number of answers that match the search */
						__( '%d found', 'softicon-poll' ), found.length ) : __( 'The questions people ask most', 'softicon-poll' ) }</span>
				</header>
				{ found.map( ( item, index ) => <div className={ 'alpl-hp-qa' + ( open === index ? ' is-open' : '' ) } key={ item.q }>
					<button type="button" aria-expanded={ open === index } onClick={ () => setOpen( open === index ? -1 : index ) }>
						<span>{ item.q }</span><span className="alpl-hp-chev dashicons dashicons-arrow-down-alt2" aria-hidden="true" />
					</button>
					{ open === index && <div className="alpl-hp-answer">
						<p>{ item.a }</p>
					</div> }
				</div> ) }
				{ ! found.length && <p className="alpl-hp-none">{ __( 'No quick answer for that.', 'softicon-poll' ) } <a href={ FORUM } { ...external }>{ __( 'Ask in the forum', 'softicon-poll' ) } ↗</a></p> }
				<p className="alpl-hp-more"><a href="https://wordpress.org/plugins/softicon-poll/#faq" { ...external }>{ __( 'All questions and answers', 'softicon-poll' ) } ↗</a></p>
			</section>

			<aside className="alpl-hp-side">
				<section className="alpl-hp-panel">
					<header>
						<h3>{ __( 'Your site details', 'softicon-poll' ) }</h3>
						<button type="button" className={ 'alpl-hp-copy' + ( copied ? ' is-done' : '' ) } onClick={ copy }>
							<span className={ 'dashicons dashicons-' + ( copied ? 'yes' : 'clipboard' ) } aria-hidden="true" />{ copied ? __( 'Copied', 'softicon-poll' ) : __( 'Copy', 'softicon-poll' ) }
						</button>
					</header>
					<dl className="alpl-hp-details">
						{ details.map( ( [ name, value ] ) => <div key={ name }><dt>{ name }</dt><dd title={ value }>{ value }</dd></div> ) }
					</dl>
					<p className="alpl-hp-note">{ __( 'Paste these into your forum topic or email, with the address of the page and what you see. They are only copied, never sent.', 'softicon-poll' ) }</p>
				</section>
			</aside>
		</div>

		<div className="alpl-hp-love">
			<span className="alpl-hp-stars" aria-hidden="true">★★★★★</span>
			<div>
				<strong>{ __( 'Enjoying SoftIcon Poll?', 'softicon-poll' ) }</strong>
				<small>{ __( 'A review helps other people find it and keeps it free.', 'softicon-poll' ) }</small>
			</div>
			<a className="alpl-hp-btn" href="https://wordpress.org/support/plugin/softicon-poll/reviews/#new-post" { ...external }>{ __( 'Leave a review', 'softicon-poll' ) }</a>
			<a href="https://wordpress.org/plugins/author/softiconai/" { ...external }>{ __( 'More plugins', 'softicon-poll' ) }</a>
			<a href="https://github.com/softiconai/softicon-poll" { ...external }>{ __( 'Source on GitHub', 'softicon-poll' ) }</a>
		</div>
	</div>;
};

export default Help;

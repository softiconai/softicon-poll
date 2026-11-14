// Getting started on the Welcome tab: how to add a poll in the block editor, the Classic Editor, Elementor and
// other page builders, or a theme. It opens on the editor this site uses, and lists the site's own polls with their shortcodes.
import { createInterpolateElement, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import VideoLink from './VideoLink';
import { Code, shortcode } from './Copy';

const KEY = 'alpl_start_tab';

// the site's newest polls under Poll → All Polls, each with its shortcode to copy
const Polls = ( { start } ) => <div className="alpl-start-polls">
	<h4>{ __( 'Your polls', 'softicon-poll' ) }</h4>
	{ start.polls.length ? <>
		<ul>
			{ start.polls.map( ( poll ) => <li key={ poll.id }>
				<a className="alpl-start-poll" href={ poll.edit }>{ poll.title }</a>
				<Code text={ shortcode( poll.id ) } label={ sprintf(
					/* translators: %s: poll title */
					__( 'Copy the shortcode of %s', 'softicon-poll' ),
					poll.title
				) } />
			</li> ) }
		</ul>
		<p className="alpl-start-more">
			<a href={ start.allPolls }>{ sprintf(
				/* translators: %d: number of polls */
				_n( 'See all %d poll', 'See all %d polls', start.total, 'softicon-poll' ),
				start.total
			) }</a>
			<a href={ start.newPoll }>{ __( 'Add a poll', 'softicon-poll' ) }</a>
		</p>
	</> : <div className="alpl-start-empty">
		<p>{ __( 'No polls yet. Make one and its shortcode shows up here, ready to copy.', 'softicon-poll' ) }</p>
		<a className="alpl-btn alpl-btn-coral" href={ start.newPoll }>{ __( 'Add a poll', 'softicon-poll' ) }</a>
	</div> }
</div>;

const Video = ( { video, play } ) => <VideoLink className="alpl-start-video" url={ video.url } title={ video.title } play={ play }>
	<span className="dashicons dashicons-controls-play" aria-hidden="true" />
	<span>{ video.title }</span>
</VideoLink>;

const Step = ( { n, title, children, action } ) => <li className="alpl-start-step">
	<span className="alpl-step">{ n }</span>
	<div>
		<h3>{ title }</h3>
		{ children }
		{ action }
	</div>
</li>;

// the same two first steps for the Classic Editor, page builders and themes
const makeSteps = ( start ) => <>
	<Step n={ 1 } title={ __( 'Make the poll', 'softicon-poll' ) }
		action={ <a className="alpl-start-link" href={ start.newPoll }>{ __( 'Add a poll', 'softicon-poll' ) } &rarr;</a> }>
		<p>{ __( 'Go to Poll → All Polls → Add a poll. It opens with the Poll block: write the question and the answers, then publish.', 'softicon-poll' ) }</p>
	</Step>
	<Step n={ 2 } title={ __( 'Copy its shortcode', 'softicon-poll' ) }>
		<p>{ __( 'Every poll has a shortcode in the All Polls list and in the block\'s Shortcode panel. Your polls are listed here too.', 'softicon-poll' ) }</p>
	</Step>
</>;

const tabs = ( start ) => {
	const example = shortcode( start.polls[ 0 ]?.id || 123 );
	return [
		{
			key: 'block',
			icon: 'block-default',
			label: __( 'Block editor', 'softicon-poll' ),
			on: ! start.classic,
			steps: <>
				<Step n={ 1 } title={ __( 'Add the Poll block', 'softicon-poll' ) }
					action={ <a className="alpl-start-link" href={ start.newPage }>{ __( 'Create a page', 'softicon-poll' ) } &rarr;</a> }>
					<p>{ createInterpolateElement( __( 'In any page or post, click <b>+</b> and search for <b>Poll</b>, or type <code>/poll</code> in an empty line.', 'softicon-poll' ), { b: <strong />, code: <code /> } ) }</p>
				</Step>
				<Step n={ 2 } title={ __( 'Write the question and the answers', 'softicon-poll' ) }>
					<p>{ __( 'Type them right in the block, with an image for any answer. The inserter also has ready-made polls: Yes / No, Rating, Reactions and Multiple choice.', 'softicon-poll' ) }</p>
				</Step>
				<Step n={ 3 } title={ __( 'Choose when the results show, and publish', 'softicon-poll' ) }>
					<p>{ __( 'The results, an end date, the design and the colors are in the block\'s sidebar. Visitors vote as soon as the page is published.', 'softicon-poll' ) }</p>
				</Step>
			</>,
		},
		{
			key: 'classic',
			icon: 'editor-paste-text',
			label: __( 'Classic editor', 'softicon-poll' ),
			on: start.classic,
			polls: true,
			steps: <>
				{ makeSteps( start ) }
				<Step n={ 3 } title={ __( 'Paste it in the Classic Editor', 'softicon-poll' ) }>
					<p>{ __( 'Paste the shortcode where the poll goes, in the Visual or the Text tab, then update the page. It works in text and Shortcode widgets too.', 'softicon-poll' ) }</p>
					<Code text={ example } label={ __( 'Copy the shortcode', 'softicon-poll' ) } />
				</Step>
			</>,
		},
		{
			key: 'builders',
			icon: 'layout',
			label: __( 'Elementor & builders', 'softicon-poll' ),
			on: start.elementor,
			polls: true,
			steps: <>
				{ makeSteps( start ) }
				<Step n={ 3 } title={ __( 'Add a Shortcode widget', 'softicon-poll' ) }>
					<p>{ createInterpolateElement( __( 'In <b>Elementor</b>, drag the <b>Shortcode</b> widget onto the page and paste the shortcode; the poll shows in Elementor\'s preview too. Other builders work the same way:', 'softicon-poll' ), { b: <strong /> } ) }</p>
					<ul className="alpl-start-builders">
						<li><strong>Divi</strong> – { __( 'Code module', 'softicon-poll' ) }</li>
						<li><strong>Beaver Builder</strong> – { __( 'HTML module', 'softicon-poll' ) }</li>
						<li><strong>WPBakery</strong> – { __( 'Text Block', 'softicon-poll' ) }</li>
						<li><strong>Bricks, Oxygen</strong> – { __( 'Shortcode element', 'softicon-poll' ) }</li>
					</ul>
				</Step>
			</>,
		},
		{
			key: 'theme',
			icon: 'editor-code',
			label: __( 'Theme / PHP', 'softicon-poll' ),
			on: false,
			polls: true,
			steps: <>
				{ start.blockTheme && <Step n={ 1 } title={ __( 'Block theme: add the block to a template', 'softicon-poll' ) }
					action={ <a className="alpl-start-link" href={ start.siteEditor }>{ __( 'Open the Site Editor', 'softicon-poll' ) } &rarr;</a> }>
					<p>{ __( 'Your theme is a block theme. In Appearance → Editor, open a template or a template part, such as the footer, and add the Poll block like on any page.', 'softicon-poll' ) }</p>
				</Step> }
				<Step n={ start.blockTheme ? 2 : 1 } title={ __( 'Any theme: print the shortcode', 'softicon-poll' ) }>
					<p>{ createInterpolateElement( __( 'Make the poll under Poll → All Polls, then show it from a template file, such as <code>single.php</code>, with:', 'softicon-poll' ), { code: <code /> } ) }</p>
					<Code text={ `<?php echo do_shortcode( '${ example }' ); ?>` } label={ __( 'Copy the PHP code', 'softicon-poll' ) } />
				</Step>
			</>,
		},
	];
};

const remembered = () => {
	try {
		return window.localStorage.getItem( KEY );
	} catch ( e ) {
		return null;
	}
};

const GettingStarted = ( { config, play } ) => {
	const start = { ...config.start, ...config.urls };
	const list = tabs( start );
	const video = config.videos[ 0 ];
	// the tab picked last time, else the editor this site uses (Classic Editor, then Elementor), else the block editor
	const [ tab, setTab ] = useState( () => {
		const saved = remembered();
		if ( list.some( ( item ) => item.key === saved ) ) {
			return saved;
		}
		if ( start.classic ) {
			return 'classic';
		}
		return start.elementor ? 'builders' : 'block';
	} );
	const pick = ( key ) => {
		setTab( key );
		try {
			window.localStorage.setItem( KEY, key );
		} catch ( e ) {
			// private mode: the tab is not remembered
		}
	};
	const current = list.find( ( item ) => item.key === tab ) || list[ 0 ];

	// arrow keys move between the tabs, as in any tab list
	const onKey = ( event ) => {
		const at = list.findIndex( ( item ) => item.key === tab );
		const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: list.length - 1 }[ event.key ];
		if ( undefined === next ) {
			return;
		}
		event.preventDefault();
		const key = list[ ( next + list.length ) % list.length ].key;
		pick( key );
		event.currentTarget.parentNode.querySelector( `[data-tab="${ key }"]` )?.focus();
	};

	return <section className="alpl-start">
		<header className="alpl-start-head">
			<div>
				<h2>{ __( 'Getting started', 'softicon-poll' ) }</h2>
				<p>{ __( 'Pick where you build your pages; the steps follow.', 'softicon-poll' ) }</p>
			</div>
		</header>

		<div className="alpl-start-tabs" role="tablist" aria-label={ __( 'Where you build your pages', 'softicon-poll' ) }>
			{ list.map( ( item ) => <button key={ item.key } type="button" role="tab" id={ 'alpl-start-tab-' + item.key } data-tab={ item.key }
				aria-selected={ item.key === tab } aria-controls="alpl-start-panel" tabIndex={ item.key === tab ? 0 : -1 }
				className={ item.key === tab ? 'is-active' : '' } onClick={ () => pick( item.key ) } onKeyDown={ onKey }>
				<span className={ 'dashicons dashicons-' + item.icon } aria-hidden="true" />
				<span>{ item.label }</span>
				{ item.on && 'block' !== item.key && <span className="alpl-start-on">{ __( 'On this site', 'softicon-poll' ) }</span> }
			</button> ) }
		</div>

		<div className="alpl-start-body" role="tabpanel" id="alpl-start-panel" aria-labelledby={ 'alpl-start-tab-' + current.key }>
			<ol className="alpl-start-steps">{ current.steps }</ol>
			<aside className="alpl-start-side">
				{ current.polls ? <Polls start={ start } /> : <div className="alpl-start-polls">
					<h4>{ __( 'Fastest start', 'softicon-poll' ) }</h4>
					<p>{ createInterpolateElement( __( 'Open a new page, type <code>/poll</code> and press Enter: the block is ready for your question.', 'softicon-poll' ), { code: <code /> } ) }</p>
					<a className="alpl-btn alpl-btn-coral" href={ start.newPage }>{ __( 'Create a page', 'softicon-poll' ) }</a>
				</div> }
				{ video && <Video video={ video } play={ play } /> }
			</aside>
		</div>
	</section>;
};

export default GettingStarted;

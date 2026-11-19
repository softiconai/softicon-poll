import { __ } from '@wordpress/i18n';
import VideoLink from './VideoLink';
import GettingStarted from './GettingStarted';

// the editor opened for the way picked, with the steps written in the Poll block (src/utils/guide.js)
const withStart = ( href, mode ) => {
	const url = new URL( href, window.location.href );
	url.searchParams.set( 'alpl_start', mode );
	return url.toString();
};

// the first question: a block inside a page, or a poll with a shortcode for the Classic Editor and page builders.
// The one that fits the editor this site uses is marked
const Choice = ( { config } ) => {
	const { start, urls } = config;
	const shortcodeSite = start.classic || start.elementor;
	const options = [
		{
			key: 'block',
			icon: 'block-default',
			title: __( 'Block', 'softicon-poll' ),
			text: __( 'Add the poll right inside a page or post, in the block editor.', 'softicon-poll' ),
			action: __( 'Open a new page', 'softicon-poll' ),
			href: withStart( urls.newPage, 'block' ),
			fits: ! shortcodeSite,
		},
		{
			key: 'shortcode',
			icon: 'shortcode',
			title: __( 'Shortcode', 'softicon-poll' ),
			text: __( 'Make the poll once, then paste its shortcode in the Classic Editor, Elementor or any page builder.', 'softicon-poll' ),
			action: __( 'Make a poll', 'softicon-poll' ),
			href: withStart( urls.newPoll, 'shortcode' ),
			fits: shortcodeSite,
		},
	];
	return <div className="alpl-choice">
		<h3>{ __( 'How do you want to add your poll?', 'softicon-poll' ) }</h3>
		<div className="alpl-choice-cards">
			{ options.map( ( option ) => <a key={ option.key } className={ 'alpl-choice-card' + ( option.fits ? ' is-fit' : '' ) } href={ option.href }>
				<span className={ 'alpl-choice-icon dashicons dashicons-' + option.icon } aria-hidden="true" />
				<strong>{ option.title }{ option.fits && <span className="alpl-choice-fit">{ __( 'Fits this site', 'softicon-poll' ) }</span> }</strong>
				<span className="alpl-choice-text">{ option.text }</span>
				<span className="alpl-choice-go">{ option.action } &rarr;</span>
			</a> ) }
		</div>
		<p className="alpl-choice-more">
			<a href="#/polls">{ __( 'See your polls', 'softicon-poll' ) }</a>
		</p>
	</div>;
};

const Welcome = ( { config, play } ) => <>
	<section className="alpl-hero">
		<div>
			<h2>{ __( 'Ask your visitors, right on your own site', 'softicon-poll' ) }</h2>
			<p>{ __( 'Polls and quick surveys made in the block editor. The votes stay in your own database, work on cached pages and need no account.', 'softicon-poll' ) }</p>
			<Choice config={ config } />
		</div>
		{ config.videos[ 0 ] && <VideoLink className="alpl-hero-video" url={ config.videos[ 0 ].url } title={ config.videos[ 0 ].title } play={ play }>
			<span className="dashicons dashicons-controls-play" aria-hidden="true" />
			{ config.videos[ 0 ].title }
		</VideoLink> }
	</section>

	<GettingStarted config={ config } play={ play } />

	<h2 className="alpl-title" id="alpl-videos">{ __( 'Videos', 'softicon-poll' ) }</h2>
	<div className="alpl-grid alpl-videos">
		{ config.videos.map( ( video ) => <VideoLink key={ video.url } className="alpl-card alpl-video" url={ video.url } title={ video.title } play={ play }>
			<span className="dashicons dashicons-video-alt3" aria-hidden="true" />{ video.title }
		</VideoLink> ) }
	</div>
</>;

export default Welcome;

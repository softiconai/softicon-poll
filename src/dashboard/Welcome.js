import { __ } from '@wordpress/i18n';
import VideoLink from './VideoLink';
import GettingStarted from './GettingStarted';

const Welcome = ( { config, play } ) => <>
	<section className="alpl-hero">
		<div>
			<h2>{ __( 'Ask your visitors, right on your own site', 'softicon-poll' ) }</h2>
			<p>{ __( 'Polls and quick surveys made in the block editor. The votes stay in your own database, work on cached pages and need no account.', 'softicon-poll' ) }</p>
			<p className="alpl-actions">
				<a className="alpl-btn alpl-btn-coral" href={ config.urls.newPoll }>{ __( 'Add a poll', 'softicon-poll' ) }</a>
				<a className="alpl-btn alpl-btn-ghost" href="#/polls">{ __( 'See your polls', 'softicon-poll' ) }</a>
			</p>
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

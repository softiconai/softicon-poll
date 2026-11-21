// the Polls tab: every poll on the site, the post it lives in, open or closed, how many people voted and its shortcode
// (includes/class-dashboard.php polls())
import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { applyFilters } from '@wordpress/hooks';
import { useApi } from './api';
import Status from './Status';
import { Code } from './Copy';

const Empty = ( { config } ) => <div className="alpl-card alpl-polls-empty">
	<span className="dashicons dashicons-chart-bar" aria-hidden="true" />
	<h3>{ __( 'No polls yet', 'softicon-poll' ) }</h3>
	<p>{ __( 'Add the Poll block to any page or post, or make a poll under Poll → All Polls and use its shortcode. Every poll shows up here once it is saved.', 'softicon-poll' ) }</p>
	<p className="alpl-actions">
		<a className="alpl-btn alpl-btn-coral" href={ config.urls.newPoll }>{ __( 'Add a poll', 'softicon-poll' ) }</a>
		<a className="alpl-btn alpl-btn-line" href={ config.urls.newPage }>{ __( 'Create a page', 'softicon-poll' ) }</a>
	</p>
</div>;

const State = ( { poll } ) => {
	if ( ! poll.found ) {
		return <span className="alpl-state is-missing">{ __( 'Not found', 'softicon-poll' ) }</span>;
	}
	return <>
		<span className={ 'alpl-state ' + ( poll.open ? 'is-open' : 'is-closed' ) }>{ poll.open ? __( 'Open', 'softicon-poll' ) : __( 'Closed', 'softicon-poll' ) }</span>
		{ poll.ends && <small>{ sprintf(
			/* translators: %s: the date and time the poll closes */
			__( 'Ends %s', 'softicon-poll' ),
			poll.ends
		) }</small> }
	</>;
};

const Row = ( { poll } ) => <tr>
	<td className="alpl-polls-question">
		<strong>{ poll.question || <em>{ __( '(no question)', 'softicon-poll' ) }</em> }</strong>
		{ /* links under the question, added by an add-on such as SoftIcon Poll Pro (its Analytics) */ }
		{ applyFilters( 'alpl.dashboard.pollLinks', null, poll ) }
	</td>
	<td className="alpl-polls-post">
		{ poll.post.edit ? <a href={ poll.post.edit }>{ poll.post.title }</a> : poll.post.title }
		<small>
			{ poll.post.type }
			{ poll.post.status && <> · <span className="alpl-polls-status">{ poll.post.status }</span></> }
			{ poll.post.view && <> · <a href={ poll.post.view } target="_blank" rel="noopener noreferrer">{ __( 'View', 'softicon-poll' ) }</a></> }
		</small>
	</td>
	<td className="alpl-polls-state"><State poll={ poll } /></td>
	<td className="alpl-polls-voters">{ poll.voters.toLocaleString() }</td>
	<td className="alpl-polls-code">
		{ poll.shortcode ? <Code text={ poll.shortcode } label={ sprintf(
			/* translators: %s: the poll's question */
			__( 'Copy the shortcode of %s', 'softicon-poll' ),
			poll.question || poll.post.title
		) } /> : <span className="alpl-muted" title={ __( 'Only polls made under Poll → All Polls have a shortcode.', 'softicon-poll' ) }>—</span> }
	</td>
</tr>;

const Polls = ( { config } ) => {
	const { data, error, loading } = useApi( '/softicon-poll/v1/dashboard/polls' );
	const [ query, setQuery ] = useState( '' );

	if ( loading || error ) {
		return <Status error={ error } />;
	}
	if ( ! data.polls.length ) {
		return <Empty config={ config } />;
	}

	const words = query.trim().toLowerCase();
	const found = data.polls.filter( ( poll ) => ! words || ( poll.question + ' ' + poll.post.title ).toLowerCase().includes( words ) );

	return <section className="alpl-polls">
		<header>
			<div>
				<h2>{ __( 'Your polls', 'softicon-poll' ) }</h2>
				<p>{ data.more ? sprintf(
					/* translators: %d: the number of polls shown */
					__( 'The newest %d polls on this site.', 'softicon-poll' ),
					data.limit
				) : sprintf(
					/* translators: %d: the number of polls */
					_n( '%d poll on this site, in pages, posts, patterns, templates and under All Polls.', '%d polls on this site, in pages, posts, patterns, templates and under All Polls.', data.polls.length, 'softicon-poll' ),
					data.polls.length
				) }</p>
			</div>
			<div className="alpl-filter">
				<span className="dashicons dashicons-search" aria-hidden="true" />
				<input type="search" value={ query } onChange={ ( event ) => setQuery( event.target.value ) } placeholder={ __( 'Search polls', 'softicon-poll' ) } aria-label={ __( 'Search polls', 'softicon-poll' ) } />
			</div>
			<a className="alpl-btn alpl-btn-coral" href={ config.urls.newPoll }>{ __( 'Add a poll', 'softicon-poll' ) }</a>
		</header>
		<div className="alpl-polls-scroll">
			<table className="alpl-polls-table">
				<thead>
					<tr>
						<th scope="col">{ __( 'Question', 'softicon-poll' ) }</th>
						<th scope="col">{ __( 'Where', 'softicon-poll' ) }</th>
						<th scope="col">{ __( 'Status', 'softicon-poll' ) }</th>
						<th scope="col" className="alpl-polls-voters">{ __( 'Voters', 'softicon-poll' ) }</th>
						<th scope="col">{ __( 'Shortcode', 'softicon-poll' ) }</th>
					</tr>
				</thead>
				<tbody>
					{ found.map( ( poll ) => <Row key={ poll.id } poll={ poll } /> ) }
					{ ! found.length && <tr className="alpl-polls-none"><td colSpan="5">{ __( 'No poll matches your search.', 'softicon-poll' ) }</td></tr> }
				</tbody>
			</table>
		</div>
	</section>;
};

export default Polls;

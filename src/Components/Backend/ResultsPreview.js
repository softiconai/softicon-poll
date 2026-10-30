import { __, _n, sprintf } from '@wordpress/i18n';
import { RichText } from '@wordpress/block-editor';
import { useEffect, useState } from '@wordpress/element';
import { hasText, resultRows } from '../../utils/functions';

// the results as visitors see them; made-up numbers while the poll has no votes, so colors can be tried
const ResultsPreview = ({ attributes, results }) => {
	const { multiple, resultsFormat, showTotal } = attributes;
	// blank answers are left out on the page too
	const options = attributes.options.filter(option => hasText(option.text) || option.image?.url);
	const real = !!results?.voters;

	const counts = {};
	options.forEach((option, index) => {
		counts[option.id] = real ? results.counts[option.id] || 0 : Math.max(1, (options.length - index) * 3 - 1);
	});
	const voters = real ? results.voters : Object.values(counts).reduce((sum, count) => sum + count, 0);
	const rows = resultRows({ counts, voters }, resultsFormat);

	// the bars grow in once, like on the page
	const [grown, setGrown] = useState(false);
	useEffect(() => {
		const frame = requestAnimationFrame(() => setGrown(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	return <div className='alpl_results'>
		{!real && <p className='alplNotice'>{__('Sample results, this poll has no votes yet.', 'softicon-poll')}</p>}
		<ul className='alpl_rows'>
			{options.map(option => <li key={option.id} className={'alpl_row' + (rows[option.id].top ? ' is-top' : '')} style={{ '--alpl-percent': (grown ? rows[option.id].percent : 0) + '%' }}>
				<span className='alpl_row_head'>
					<span className='alpl_row_label'>
						{option.image?.url && <img className='alpl_image' src={option.image.url} alt='' />}
						<RichText.Content tagName='span' className='alpl_text' value={option.text} />
					</span>
					<span className='alpl_row_value'>{rows[option.id].value}</span>
				</span>
				<span className='alpl_bar'><span className='alpl_bar_fill' /></span>
			</li>)}
		</ul>
		{showTotal && <div className='alpl_results_foot'>
			<span className='alpl_total'>{multiple ?
				/* translators: %s: number of people who voted */
				sprintf(_n('%s voter', '%s voters', voters, 'softicon-poll'), voters) :
				/* translators: %s: number of votes */
				sprintf(_n('%s vote', '%s votes', voters, 'softicon-poll'), voters)}</span>
		</div>}
	</div>;
};

export default ResultsPreview;

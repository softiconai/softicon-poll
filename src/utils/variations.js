import { __ } from '@wordpress/i18n';
import { icons } from './icons';

// ready-made polls in the inserter; once added they are plain polls, so no isActive
const answers = texts => texts.map((text, i) => ({ id: 'o' + (i + 1), text }));

export const variations = [
	{
		name: 'yes-no',
		title: __('Yes / No poll', 'softicon-poll'),
		description: __('A quick question with a Yes and a No.', 'softicon-poll'),
		icon: icons.yesNo,
		keywords: [__('yes', 'softicon-poll'), __('no', 'softicon-poll'), __('feedback', 'softicon-poll'), __('helpful', 'softicon-poll')],
		attributes: {
			question: __('Was this article helpful?', 'softicon-poll'),
			options: answers([__('Yes', 'softicon-poll'), __('No', 'softicon-poll')])
		},
		scope: ['inserter']
	},
	{
		name: 'rating',
		title: __('Rating poll', 'softicon-poll'),
		description: __('Visitors rate from 1 to 5 stars.', 'softicon-poll'),
		icon: icons.rating,
		keywords: [__('rating', 'softicon-poll'), __('stars', 'softicon-poll'), __('score', 'softicon-poll'), __('review', 'softicon-poll')],
		attributes: {
			question: __('How would you rate this?', 'softicon-poll'),
			// words, not only stars, so screen readers and translations have something to say
			options: answers([
				'★★★★★ ' + __('Excellent', 'softicon-poll'),
				'★★★★ ' + __('Good', 'softicon-poll'),
				'★★★ ' + __('Okay', 'softicon-poll'),
				'★★ ' + __('Poor', 'softicon-poll'),
				'★ ' + __('Bad', 'softicon-poll')
			])
		},
		scope: ['inserter']
	},
	{
		name: 'reactions',
		title: __('Reactions poll', 'softicon-poll'),
		description: __('Visitors react with an emoji.', 'softicon-poll'),
		icon: icons.reactions,
		keywords: [__('reaction', 'softicon-poll'), __('emoji', 'softicon-poll'), __('like', 'softicon-poll'), __('mood', 'softicon-poll')],
		attributes: {
			question: __('What do you think?', 'softicon-poll'),
			options: answers([
				'👍 ' + __('Like', 'softicon-poll'),
				'❤️ ' + __('Love', 'softicon-poll'),
				'😂 ' + __('Funny', 'softicon-poll'),
				'😮 ' + __('Surprised', 'softicon-poll'),
				'👎 ' + __('Dislike', 'softicon-poll')
			]),
			resultsFormat: 'count'
		},
		scope: ['inserter']
	},
	{
		name: 'multiple',
		title: __('Multiple choice poll', 'softicon-poll'),
		description: __('Visitors tick every answer that fits.', 'softicon-poll'),
		icon: icons.multiple,
		keywords: [__('checkbox', 'softicon-poll'), __('multiple', 'softicon-poll'), __('survey', 'softicon-poll')],
		attributes: {
			question: __('Which of these do you use?', 'softicon-poll'),
			options: answers(['', '', '']),
			multiple: true
		},
		scope: ['inserter']
	}
];

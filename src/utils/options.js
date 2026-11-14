import { __ } from '@wordpress/i18n';
import { icons } from './icons';
import { icons as shared } from '../vendor/softicon-tools/components/icons';

export const tabs = [
	{ name: 'general', title: __( 'General', 'softicon-poll' ), className: 'general' },
	{ name: 'style', title: __( 'Style', 'softicon-poll' ), className: 'style' },
];

export const showResultsOptions = [
	{ label: __( 'After voting', 'softicon-poll' ), value: 'after', icon: icons.afterVote },
	{ label: __( 'Always', 'softicon-poll' ), value: 'always', icon: icons.always },
	{ label: __( 'When closed', 'softicon-poll' ), value: 'closed', icon: icons.closed },
	{ label: __( 'Never', 'softicon-poll' ), value: 'never', icon: icons.never },
];

export const formats = [
	{ label: __( 'Both', 'softicon-poll' ), value: 'both', icon: icons.both },
	{ label: __( 'Percent', 'softicon-poll' ), value: 'percent', icon: icons.percent },
	{ label: __( 'Votes', 'softicon-poll' ), value: 'count', icon: icons.count },
];

export const layouts = [
	{ label: __( 'List', 'softicon-poll' ), value: 0, icon: icons.list },
	// short labels, four tiles fit the sidebar
	{ label: __( '2 cols', 'softicon-poll' ), value: 2, icon: icons.cols2 },
	{ label: __( '3 cols', 'softicon-poll' ), value: 3, icon: icons.cols3 },
	{ label: __( '4 cols', 'softicon-poll' ), value: 4, icon: icons.cols4 },
];

// the cards in the Help panel
export const helpCards = [
	{ href: 'https://wordpress.org/support/plugin/softicon-poll/', label: __( 'Get support', 'softicon-poll' ), icon: shared.support },
	{ href: 'https://wordpress.org/support/plugin/softicon-poll/reviews/#new-post', label: __( 'Rate Poll', 'softicon-poll' ), icon: shared.star },
	{ href: 'https://wordpress.org/plugins/author/softiconai/', label: __( 'More plugins', 'softicon-poll' ), icon: shared.plugins },
];

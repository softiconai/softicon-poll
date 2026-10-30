import { __, _n, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button, DateTimePicker, Dropdown, Modal, TextControl } from '@wordpress/components';
import { dateI18n, getSettings } from '@wordpress/date';
import { FieldHead, HelpCards, Panel, Tiles, ToggleRow } from '../../../../vendor/softicon-tools/components/Panels';
import { formats, helpCards, showResultsOptions } from '../../../../utils/options';
import { hasText } from '../../../../utils/functions';

// a 12-hour clock when the site's time format has am/pm
const is12Hour = /a(?!\\)/i.test( getSettings().formats.time.toLowerCase().replace( /\\\\/g, '' ).split( '' ).reverse().join( '' ) );

const plain = ( html ) => ( html || '' ).replace( /<[^>]*>/g, '' ).trim();

const Votes = ( { options, votes } ) => {
	const { results, busy, refresh, reset } = votes;
	const [ confirming, setConfirming ] = useState( false );

	if ( ! results ) {
		return <p className="alplHelp">{ busy ? __( 'Loading…', 'softicon-poll' ) : __( 'The votes show here once the post is saved.', 'softicon-poll' ) }</p>;
	}

	return <div className="alplStack">
		<ul className="alplVotes">
			{ options.filter( ( option ) => hasText( option.text ) || option.image?.url ).map( ( option, index ) => <li key={ option.id }>
				<span>{ plain( option.text ) || sprintf(
					/* translators: %d: the answer's position, like 1 */
					__( 'Answer %d', 'softicon-poll' ),
					index + 1
				) }</span>
				<strong>{ results.counts[ option.id ] || 0 }</strong>
			</li> ) }
		</ul>
		<p className="alplHelp">{
			/* translators: %s: number of people who voted */
			sprintf( _n( '%s person voted.', '%s people voted.', results.voters, 'softicon-poll' ), results.voters )
		}</p>
		<div className="alplButtons">
			<Button variant="secondary" size="small" onClick={ refresh } isBusy={ busy } disabled={ busy }>{ __( 'Refresh', 'softicon-poll' ) }</Button>
			<Button variant="secondary" size="small" isDestructive onClick={ () => setConfirming( true ) } disabled={ busy || ! results.voters }>{ __( 'Reset votes', 'softicon-poll' ) }</Button>
		</div>

		{ confirming && <Modal title={ __( 'Reset votes?', 'softicon-poll' ) } onRequestClose={ () => setConfirming( false ) } size="small">
			<p>{ __( 'Every vote of this poll is deleted and everyone can vote again. This cannot be undone.', 'softicon-poll' ) }</p>
			<div className="alplButtons alplModalButtons">
				<Button variant="tertiary" onClick={ () => setConfirming( false ) }>{ __( 'Cancel', 'softicon-poll' ) }</Button>
				<Button variant="primary" isDestructive onClick={ () => {
					setConfirming( false );
					reset();
				} }>{ __( 'Reset votes', 'softicon-poll' ) }</Button>
			</div>
		</Modal> }
	</div>;
};

const General = ( { attributes, setAttributes, votes } ) => {
	const { options, multiple, maxChoices, showResults, resultsFormat, showTotal, closed, endDate, loginOnly } = attributes;
	const set = ( key ) => ( val ) => setAttributes( { [ key ]: val } );
	const ended = endDate && new Date( endDate ) <= new Date();

	return <>
		<Panel id="help" title={ __( 'Help', 'softicon-poll' ) }>
			<HelpCards cards={ helpCards } />
			<p className="alplHelp">{ __( 'Email:', 'softicon-poll' ) } <a href="mailto:softiconai@gmail.com">softiconai@gmail.com</a></p>
		</Panel>

		<Panel id="answers" title={ __( 'Answers', 'softicon-poll' ) }>
			<ToggleRow label={ __( 'Allow more than one answer', 'softicon-poll' ) } tip={ __( 'Visitors tick boxes instead of picking one answer.', 'softicon-poll' ) } checked={ multiple } onChange={ set( 'multiple' ) } />

			{ multiple && <div>
				<FieldHead label={ __( 'Most answers per visitor', 'softicon-poll' ) } tip={ __( '0 means any number of answers.', 'softicon-poll' ) } />
				<TextControl type="number" min={ 0 } max={ options.length } label={ __( 'Most answers per visitor', 'softicon-poll' ) } hideLabelFromVision value={ maxChoices }
					onChange={ ( val ) => setAttributes( { maxChoices: Math.max( 0, parseInt( val, 10 ) || 0 ) } ) } __next40pxDefaultSize __nextHasNoMarginBottom />
			</div> }

			<p className="alplHelp">{ __( 'Write the answers in the block. Press Enter for the next one.', 'softicon-poll' ) }</p>
		</Panel>

		<Panel id="results" title={ __( 'Results', 'softicon-poll' ) }>
			<Tiles label={ __( 'Show results', 'softicon-poll' ) } tip={ __( 'When visitors see the votes. Always adds a "View results" link before voting. With Never only you see them, here.', 'softicon-poll' ) } value={ showResults } options={ showResultsOptions } onChange={ set( 'showResults' ) } />

			{ 'never' !== showResults && <>
				<Tiles label={ __( 'Show as', 'softicon-poll' ) } value={ resultsFormat } options={ formats } onChange={ set( 'resultsFormat' ) } />
				<ToggleRow label={ __( 'Total votes', 'softicon-poll' ) } tip={ __( 'The number of people who voted, under the results.', 'softicon-poll' ) } checked={ showTotal } onChange={ set( 'showTotal' ) } />
			</> }
		</Panel>

		<Panel id="voting" title={ __( 'Voting', 'softicon-poll' ) }>
			<ToggleRow label={ __( 'Poll closed', 'softicon-poll' ) } tip={ __( 'No more votes. Visitors see the results unless they are set to Never.', 'softicon-poll' ) } checked={ closed } onChange={ set( 'closed' ) } />

			<div className="alplStack">
				<FieldHead label={ __( 'End date', 'softicon-poll' ) } tip={ __( "The poll closes by itself at this time, in your site's time zone.", 'softicon-poll' ) } />
				<div className="alplButtons">
					<Dropdown popoverProps={ { placement: 'left-start' } }
						renderToggle={ ( { isOpen, onToggle } ) => <Button variant="secondary" onClick={ onToggle } aria-expanded={ isOpen }>
							{ endDate ? dateI18n( getSettings().formats.datetime, endDate ) : __( 'Set an end date', 'softicon-poll' ) }
						</Button> }
						renderContent={ () => <div className="alplDatePicker">
							<DateTimePicker currentDate={ endDate || undefined } onChange={ ( val ) => setAttributes( { endDate: val || '' } ) } is12Hour={ is12Hour } />
						</div> } />
					{ endDate && <Button variant="tertiary" isDestructive onClick={ () => setAttributes( { endDate: '' } ) }>{ __( 'Remove', 'softicon-poll' ) }</Button> }
				</div>
				{ ended && <p className="alplHelp alplWarn">{ __( 'This date has passed, the poll is closed.', 'softicon-poll' ) }</p> }
			</div>

			<ToggleRow label={ __( 'Only logged-in users', 'softicon-poll' ) } tip={ __( 'Visitors who are not logged in see a link to log in. Each account votes once.', 'softicon-poll' ) } checked={ loginOnly } onChange={ set( 'loginOnly' ) } />

			{ ! loginOnly && <p className="alplHelp">{ __( 'Each visitor votes once, checked by browser and by a scrambled form of the IP address. The address itself is never saved.', 'softicon-poll' ) }</p> }
		</Panel>

		<Panel id="votes" title={ __( 'Votes', 'softicon-poll' ) }>
			<Votes options={ options } votes={ votes } />
		</Panel>
	</>;
};

export default General;

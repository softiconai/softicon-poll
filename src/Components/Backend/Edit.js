import { __, _n, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useRef, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { BlockControls, MediaUpload, MediaUploadCheck, RichText, store as blockEditorStore, useBlockProps } from '@wordpress/block-editor';
import { Button, ToolbarButton, ToolbarGroup } from '@wordpress/components';
// copied from the shared softicon-tools folder by `npm run tools` (prebuild), edit it there
import useIframeAssets from '../../vendor/softicon-tools/hooks/useIframeAssets';
import Settings from './Settings/Settings';
import ResultsPreview from './ResultsPreview';
import useVotes from './useVotes';
import { icons } from '../../utils/icons';
import { cssVars, hasText, newOptionId, newPollId, toImage } from '../../utils/functions';

const Edit = ( props ) => {
	const { attributes, setAttributes, clientId, name } = props;
	const { pollId, question, options, multiple, maxChoices, animateBars, accentColor } = attributes;
	const [ preview, setPreview ] = useState( false );
	const [ focusId, setFocusId ] = useState( null );
	const answerRefs = useRef( {} );
	// a block installed from the inserter's search gets these only in the top window
	const assetsRef = useIframeAssets( [ 'softicon-poll-style-css', 'softicon-poll-editor-style-css' ] );

	// votes are saved under the poll id: a new poll gets one, and a copy gets its own instead of sharing the original's
	const earlierIds = useSelect( ( select ) => {
		const { getBlocksByName, getBlockAttributes } = select( blockEditorStore );
		const ids = getBlocksByName( name );
		const index = ids.indexOf( clientId );
		return index > 0 ? ids.slice( 0, index ).map( ( id ) => getBlockAttributes( id )?.pollId ).join( ' ' ) : '';
	}, [ clientId, name ] );
	const { __unstableMarkNextChangeAsNotPersistent } = useDispatch( blockEditorStore );
	useEffect( () => {
		if ( ! pollId || earlierIds.split( ' ' ).includes( pollId ) ) {
			// not an undo step of its own
			__unstableMarkNextChangeAsNotPersistent();
			setAttributes( { pollId: newPollId() } );
		}
	}, [ pollId, earlierIds, setAttributes, __unstableMarkNextChangeAsNotPersistent ] );

	// the post being edited, to tell a pasted copy; in the site editor it is a template's name, not a number
	const postId = useSelect( ( select ) => {
		const id = select( 'core/editor' )?.getCurrentPostId?.();
		return 'number' === typeof id ? id : 0;
	}, [] );
	const votes = useVotes( pollId );

	// a poll pasted from another post still has that post's id: ask once per id and take a new one;
	// a synced pattern's poll belongs to the pattern, so it keeps its id wherever the pattern is used
	const inPattern = useSelect( ( select ) => !! select( blockEditorStore ).getBlockParentsByBlockName( clientId, 'core/block' ).length, [ clientId ] );
	const checked = useRef( '' );
	const latest = useRef( pollId );
	latest.current = pollId;
	useEffect( () => {
		if ( ! pollId || ! postId || inPattern || checked.current === pollId ) {
			return;
		}
		const asked = checked.current = pollId;
		apiFetch( { path: `/softicon-poll/v1/id-taken/${ pollId }?post=${ postId }` } ).then( ( { taken } ) => {
			if ( taken && latest.current === asked ) {
				const id = newPollId();
				checked.current = id;
				__unstableMarkNextChangeAsNotPersistent();
				setAttributes( { pollId: id } );
			}
		} ).catch( () => {} );
	}, [ pollId, postId, inPattern, setAttributes, __unstableMarkNextChangeAsNotPersistent ] );

	// a new answer gets the cursor
	useEffect( () => {
		if ( focusId && answerRefs.current[ focusId ] ) {
			answerRefs.current[ focusId ].focus();
			setFocusId( null );
		}
	}, [ focusId, options ] );

	const setOption = ( index, patch ) => setAttributes( { options: options.map( ( option, i ) => i === index ? { ...option, ...patch } : option ) } );
	const addOption = ( at = options.length ) => {
		const id = newOptionId( options );
		const next = [ ...options ];
		next.splice( at, 0, { id, text: '' } );
		setAttributes( { options: next } );
		setFocusId( id );
	};
	const removeOption = ( index ) => setAttributes( { options: options.filter( ( _, i ) => i !== index ) } );
	const moveOption = ( index, to ) => {
		const next = [ ...options ];
		next.splice( to, 0, next.splice( index, 1 )[ 0 ] );
		setAttributes( { options: next } );
	};

	const filled = options.filter( ( option ) => hasText( option.text ) || option.image?.url ).length;
	// the same line the page shows above the answers
	const hint = maxChoices && maxChoices < filled
		? sprintf(
			/* translators: %d: how many answers a visitor may pick */
			_n( 'Choose up to %d answer.', 'Choose up to %d answers.', maxChoices, 'softicon-poll' ),
			maxChoices
		)
		: __( 'Choose one or more answers.', 'softicon-poll' );
	const answerLabel = ( index ) => sprintf(
		/* translators: %d: the answer's position, like 1 */
		__( 'Answer %d', 'softicon-poll' ),
		index + 1
	);

	const blockProps = useBlockProps( {
		ref: assetsRef,
		className: 'alpl_poll' + ( animateBars ? ' alpl_animate' : '' ) + ( accentColor ? ' alpl_has_accent' : '' ),
		style: cssVars( attributes ),
	} );

	return <>
		<Settings { ...{ attributes, setAttributes, votes } } />

		<BlockControls>
			<ToolbarGroup>
				<ToolbarButton icon={ icons.add } label={ __( 'Add answer', 'softicon-poll' ) } onClick={ () => addOption() } />
				<ToolbarButton icon={ icons.chart } label={ __( 'Preview results', 'softicon-poll' ) } isPressed={ preview } onClick={ () => setPreview( ! preview ) } />
			</ToolbarGroup>
		</BlockControls>

		<div { ...blockProps }>
			<RichText tagName="div" className="alpl_question" value={ question } onChange={ ( val ) => setAttributes( { question: val } ) }
				placeholder={ __( 'Ask a question…', 'softicon-poll' ) } allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] } aria-label={ __( 'Question', 'softicon-poll' ) } />

			{ preview ? <ResultsPreview attributes={ attributes } results={ votes.results } /> : <>
				{ multiple && <p className="alpl_hint">{ hint }</p> }

				<div className="alpl_options">
					{ options.map( ( option, index ) => <div key={ option.id } className="alpl_option alplAnswer">
						<input className="alpl_input" type={ multiple ? 'checkbox' : 'radio' } tabIndex={ -1 } aria-hidden="true" readOnly checked={ false } />

						{ option.image?.url && <img className="alpl_image" src={ option.image.url } alt={ option.image.alt || '' } /> }

						{ /* Enter adds the next answer; the key comes from the text field inside, this wrapper is not a control itself */ }
						<div className="alplAnswerText" role="presentation" onKeyDown={ ( event ) => {
							if ( 'Enter' === event.key && ! event.shiftKey && ! event.nativeEvent.isComposing ) {
								event.preventDefault();
								addOption( index + 1 );
							}
						} }>
							<RichText
								ref={ ( el ) => {
									answerRefs.current[ option.id ] = el;
								} }
								tagName="span"
								className="alpl_text"
								value={ option.text }
								onChange={ ( val ) => setOption( index, { text: val } ) }
								placeholder={ answerLabel( index ) }
								aria-label={ answerLabel( index ) }
								allowedFormats={ [ 'core/bold', 'core/italic' ] }
								disableLineBreaks
							/>
						</div>

						<div className="alplAnswerTools">
							<MediaUploadCheck>
								<MediaUpload allowedTypes={ [ 'image' ] } value={ option.image?.id } onSelect={ ( media ) => setOption( index, { image: toImage( media ) } ) }
									render={ ( { open } ) => <Button size="small" icon={ icons.image } label={ option.image?.url ? __( 'Replace image', 'softicon-poll' ) : __( 'Add image', 'softicon-poll' ) } onClick={ open } /> } />
							</MediaUploadCheck>
							{ option.image?.url && <Button size="small" variant="link" isDestructive onClick={ () => setOption( index, { image: undefined } ) }>{ __( 'Remove image', 'softicon-poll' ) }</Button> }
							<Button size="small" icon={ icons.up } label={ __( 'Move up', 'softicon-poll' ) } disabled={ 0 === index } onClick={ () => moveOption( index, index - 1 ) } />
							<Button size="small" icon={ icons.down } label={ __( 'Move down', 'softicon-poll' ) } disabled={ index === options.length - 1 } onClick={ () => moveOption( index, index + 1 ) } />
							<Button size="small" icon={ icons.remove } label={ __( 'Remove answer', 'softicon-poll' ) } disabled={ options.length <= 2 } onClick={ () => removeOption( index ) } />
						</div>
					</div> ) }
				</div>

				<Button className="alplAdd" variant="secondary" icon={ icons.add } onClick={ () => addOption() }>{ __( 'Add answer', 'softicon-poll' ) }</Button>

				{ filled < 2 && <p className="alplNotice">{ __( 'Write at least two answers, the poll shows on the page only then.', 'softicon-poll' ) }</p> }

				<div className="alpl_actions">
					<span className="alpl_vote wp-element-button" aria-hidden="true">{ __( 'Vote', 'softicon-poll' ) }</span>
				</div>
			</> }
		</div>
	</>;
};

export default Edit;

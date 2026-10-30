<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

$alpl = ALPL_Poll\Block::settings( $attributes );

// the editor gives every poll an id; a poll needs two answers
if ( '' === $alpl['id'] || count( $alpl['options'] ) < 2 ) {
	return;
}

// votes are checked against this post's copy of the poll; 0 on archives, where only polls in templates show
$alpl_post = absint( get_the_ID() );

// colors become css variables so the stylesheet keeps the fallbacks
$alpl_style = '';
foreach ( array(
	'bgColor'     => '--alpl-bg',
	'textColor'   => '--alpl-text',
	'accentColor' => '--alpl-accent',
	'barBgColor'  => '--alpl-bar-bg',
	'borderColor' => '--alpl-border',
) as $alpl_attr => $alpl_var ) {
	$alpl_color = ALPL_Poll\Block::color( $attributes[ $alpl_attr ] ?? '' );
	if ( $alpl_color ) {
		$alpl_style .= $alpl_var . ':' . $alpl_color . ';';
	}
}

$alpl_config = array(
	'id'          => $alpl['id'],
	'post'        => $alpl_post,
	'api'         => rest_url( ALPL_Poll\Rest::NS . '/' ),
	// only logged-in visitors get a nonce, page caches skip their pages
	'nonce'       => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
	// view.js adds the page the visitor is on, the poll may be in a template shown on many pages
	'login'       => wp_login_url(),
	'multiple'    => $alpl['multiple'],
	'max'         => $alpl['max'],
	'showResults' => $alpl['showResults'],
	'format'      => $alpl['format'],
	'showTotal'   => $alpl['showTotal'],
);

$alpl_class = 'alpl_poll' . ( $alpl['animate'] ? ' alpl_animate' : '' ) . ( ALPL_Poll\Block::color( $attributes['accentColor'] ?? '' ) ? ' alpl_has_accent' : '' );
$alpl_qid   = wp_unique_id( 'alpl_q_' );
$alpl_hid   = wp_unique_id( 'alpl_h_' );
$alpl_has_q = '' !== trim( wp_strip_all_tags( $alpl['question'] ) );

if ( $alpl['multiple'] ) {
	$alpl_hint = $alpl['max'] < count( $alpl['options'] )
		/* translators: %d: how many answers a visitor may pick */
		? sprintf( _n( 'Choose up to %d answer.', 'Choose up to %d answers.', $alpl['max'], 'softicon-poll' ), $alpl['max'] )
		: __( 'Choose one or more answers.', 'softicon-poll' );
}

$alpl_meta = '';
if ( ! ALPL_Poll\Block::is_open( $alpl ) ) {
	$alpl_meta = __( 'This poll is closed.', 'softicon-poll' );
} elseif ( $alpl['endDate'] ) {
	/* translators: %s: the date and time the poll closes */
	$alpl_meta = sprintf( __( 'Voting ends on %s.', 'softicon-poll' ), wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $alpl['endDate']->getTimestamp() ) );
}

$alpl_wrapper = get_block_wrapper_attributes(
	array(
		'class'     => $alpl_class,
		'style'     => $alpl_style,
		// hex flags keep quotes and ampersands from breaking the attribute or JSON.parse
		'data-alpl' => wp_json_encode( $alpl_config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ),
	)
);

$alpl_label = function ( $option ) {
	$image = ALPL_Poll\Block::image( $option['image'] );
	if ( $image ) {
		echo '<img class="alpl_image" src="' . esc_url( $image['url'] ) . '" alt="' . esc_attr( $image['alt'] ) . '" loading="lazy" decoding="async">';
	}
	echo '<span class="alpl_text">' . wp_kses(
		$option['text'],
		array(
			'strong' => array(),
			'em'     => array(),
			'b'      => array(),
			'i'      => array(),
		)
	) . '</span>';
};
?>
<div <?php echo $alpl_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes ?>>
	<?php if ( $alpl_has_q ) : ?>
		<div class="alpl_question" id="<?php echo esc_attr( $alpl_qid ); ?>"><?php echo wp_kses_post( $alpl['question'] ); ?></div>
	<?php endif; ?>

	<form class="alpl_form">
		<fieldset class="alpl_fieldset" <?php echo $alpl_has_q ? 'aria-labelledby="' . esc_attr( $alpl_qid ) . '"' : 'aria-label="' . esc_attr__( 'Poll', 'softicon-poll' ) . '"'; ?><?php echo $alpl['multiple'] ? ' aria-describedby="' . esc_attr( $alpl_hid ) . '"' : ''; ?>>
			<?php if ( $alpl['multiple'] ) : ?>
				<p class="alpl_hint" id="<?php echo esc_attr( $alpl_hid ); ?>"><?php echo esc_html( $alpl_hint ); ?></p>
			<?php endif; ?>
			<div class="alpl_options">
				<?php foreach ( $alpl['options'] as $alpl_option ) : ?>
					<label class="alpl_option">
						<input class="alpl_input" type="<?php echo $alpl['multiple'] ? 'checkbox' : 'radio'; ?>" name="alpl_choice" value="<?php echo esc_attr( $alpl_option['id'] ); ?>" disabled>
						<?php $alpl_label( $alpl_option ); ?>
					</label>
				<?php endforeach; ?>
			</div>
		</fieldset>
		<div class="alpl_actions">
			<button type="submit" class="alpl_vote wp-element-button" disabled><?php esc_html_e( 'Vote', 'softicon-poll' ); ?></button>
			<?php if ( 'always' === $alpl['showResults'] ) : ?>
				<button type="button" class="alpl_link alpl_show" hidden><?php esc_html_e( 'View results', 'softicon-poll' ); ?></button>
			<?php endif; ?>
		</div>
	</form>

	<div class="alpl_results" hidden>
		<ul class="alpl_rows"<?php echo $alpl_has_q ? ' aria-labelledby="' . esc_attr( $alpl_qid ) . '"' : ''; ?>>
			<?php foreach ( $alpl['options'] as $alpl_option ) : ?>
				<li class="alpl_row" data-option="<?php echo esc_attr( $alpl_option['id'] ); ?>">
					<span class="alpl_row_head">
						<span class="alpl_row_label"><?php $alpl_label( $alpl_option ); ?></span>
						<span class="alpl_row_value"></span>
					</span>
					<span class="alpl_bar"><span class="alpl_bar_fill"></span></span>
				</li>
			<?php endforeach; ?>
		</ul>
		<div class="alpl_results_foot">
			<span class="alpl_total"></span>
			<button type="button" class="alpl_link alpl_back" hidden><?php esc_html_e( 'Back to vote', 'softicon-poll' ); ?></button>
		</div>
	</div>

	<p class="alpl_message" role="status"></p>
	<?php if ( $alpl_meta ) : ?>
		<p class="alpl_meta"><?php echo esc_html( $alpl_meta ); ?></p>
	<?php endif; ?>
	<noscript><p class="alpl_meta"><?php esc_html_e( 'Please turn on JavaScript to vote.', 'softicon-poll' ); ?></p></noscript>
</div>

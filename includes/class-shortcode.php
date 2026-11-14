<?php
namespace ALPL_Poll;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Polls for the Classic Editor and page builders: Poll → All Polls holds one Poll block per poll (set up in the
// block editor), and [softicon_poll id="123"] shows it anywhere a shortcode works.
class Shortcode {

	const TYPE = 'alpl_poll';
	const TAG  = 'softicon_poll';

	public function __construct() {
		add_action( 'init', array( $this, 'post_type' ) );
		add_shortcode( self::TAG, array( $this, 'render' ) );
		add_filter( 'manage_' . self::TYPE . '_posts_columns', array( $this, 'columns' ) );
		add_action( 'manage_' . self::TYPE . '_posts_custom_column', array( $this, 'column' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( $this, 'copy_script' ) );
		// Elementor's editor preview: the poll's script and styles from the start, so a Shortcode widget shows the poll at once
		add_action( 'elementor/preview/enqueue_styles', array( $this, 'builder_preview' ) );
		// a poll is set up in its block, so it always opens in the block editor, even where the Classic Editor
		// plugin (priority 100) switches every other post type to the classic one
		add_filter( 'use_block_editor_for_post_type', array( $this, 'block_editor' ), 200, 2 );
	}

	// not a page of its own on the site: a poll shows only where its shortcode is
	public function post_type() {
		register_post_type(
			self::TYPE,
			array(
				'labels'          => array(
					'name'               => __( 'Polls', 'softicon-poll' ),
					'singular_name'      => __( 'Poll', 'softicon-poll' ),
					'menu_name'          => __( 'Polls', 'softicon-poll' ),
					'add_new'            => __( 'Add a poll', 'softicon-poll' ),
					'add_new_item'       => __( 'Add a poll', 'softicon-poll' ),
					'edit_item'          => __( 'Edit poll', 'softicon-poll' ),
					'all_items'          => __( 'All Polls', 'softicon-poll' ),
					'not_found'          => __( 'No polls yet.', 'softicon-poll' ),
					'not_found_in_trash' => __( 'No polls in the trash.', 'softicon-poll' ),
					'search_items'       => __( 'Search polls', 'softicon-poll' ),
				),
				'public'          => false,
				'show_ui'         => true,
				// Poll → All Polls, under the dashboard's menu (includes/class-dashboard.php)
				'show_in_menu'    => Dashboard::PAGE,
				'show_in_rest'    => true,
				'capability_type' => 'page',
				'map_meta_cap'    => true,
				'supports'        => array( 'title', 'editor' ),
				'template'        => array( array( Block::NAME ) ),
				'template_lock'   => 'all',
			)
		);
	}

	public function block_editor( $use_block_editor, $type ) {
		return self::TYPE === $type ? true : $use_block_editor;
	}

	public function builder_preview() {
		wp_enqueue_script( generate_block_asset_handle( Block::NAME, 'viewScript' ) );
		wp_enqueue_style( generate_block_asset_handle( Block::NAME, 'style' ) );
	}

	public function render( $atts ) {
		$id   = is_array( $atts ) && isset( $atts['id'] ) ? absint( $atts['id'] ) : 0;
		$poll = $id ? get_post( $id ) : null;
		// only a published poll, never another post or a draft
		if ( ! $poll || self::TYPE !== $poll->post_type || 'publish' !== $poll->post_status ) {
			return '';
		}

		// the block is drawn as part of the poll's own post
		global $post;
		$page = $post;
		$post = $poll; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- put back below
		$html = '';
		foreach ( parse_blocks( $poll->post_content ) as $block ) {
			if ( Block::NAME === $block['blockName'] ) {
				$html .= render_block( $block );
			}
		}
		$post = $page; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- the page's own post again
		return $html;
	}

	public static function code( $id ) {
		return '[' . self::TAG . ' id="' . absint( $id ) . '"]';
	}

	// the All Polls list shows each poll's shortcode; a click copies it
	public function columns( $columns ) {
		$date = isset( $columns['date'] ) ? array( 'date' => $columns['date'] ) : array();
		unset( $columns['date'] );
		return $columns + array( 'alpl_shortcode' => __( 'Shortcode', 'softicon-poll' ) ) + $date;
	}

	public function column( $column, $id ) {
		if ( 'alpl_shortcode' === $column ) {
			printf( '<input type="text" class="alpl-shortcode" readonly value="%s" aria-label="%s" title="%s">', esc_attr( self::code( $id ) ), esc_attr__( 'Shortcode', 'softicon-poll' ), esc_attr__( 'Click to copy', 'softicon-poll' ) );
		}
	}

	public function copy_script( $hook ) {
		$screen = get_current_screen();
		if ( 'edit.php' !== $hook || ! $screen || self::TYPE !== $screen->post_type ) {
			return;
		}
		wp_add_inline_style( 'common', '.column-alpl_shortcode input{width:100%;max-width:240px;font-family:Menlo,Consolas,monospace;font-size:12px;cursor:copy}' );
		wp_add_inline_script( 'common', 'document.addEventListener("click",function(e){var i=e.target.closest&&e.target.closest(".alpl-shortcode");if(!i){return;}i.select();var done=function(){i.title=' . wp_json_encode( __( 'Copied', 'softicon-poll' ) ) . ';};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(i.value).then(done);}else if(document.execCommand("copy")){done();}});' );
	}
}

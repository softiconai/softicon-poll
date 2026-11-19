<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Freemius: an optional opt-in only, through the small client in vendor/fs-lite instead of the full SDK. It talks only
// to Freemius (wp.freemius.com, api.freemius.com) and sends nothing about the site before "Allow & Continue".
// Loaded by softicon-poll.php and by uninstall.php, which WordPress runs instead of an uninstall hook.
if ( ! class_exists( 'SofticonPoll\fs_lite' ) ) {
	require_once dirname( __DIR__ ) . '/vendor/fs-lite/fs-lite.php';
}

if ( ! function_exists( 'softicon_poll_fs' ) ) {
	function softicon_poll_fs() {
		global $softicon_poll_fs;

		if ( ! isset( $softicon_poll_fs ) ) {
			$softicon_poll_fs = new SofticonPoll\fs_lite(
				dirname( __DIR__ ) . '/softicon-poll.php',
				array(
					'id'         => '45551',
					'slug'       => 'softicon-poll',
					'public_key' => 'pk_c86bdedcc9044f322a2e81530432c',
					// the Poll dashboard (includes/class-dashboard.php): the opt-in screen is softicon-poll-opt-in, and
					// Allow or Skip goes on to the dashboard's Welcome tab
					'page'       => 'softicon-poll',
					'icon'       => plugins_url( 'assets/images/icon-128x128.png', __DIR__ ),
				)
			);
		}

		return $softicon_poll_fs;
	}

	softicon_poll_fs();
	do_action( 'softicon_poll_fs_loaded' );
}

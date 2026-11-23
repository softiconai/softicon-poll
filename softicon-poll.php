<?php
/**
 * Plugin Name: SoftIcon Poll – Poll & Survey Block
 * Description: A poll block for the block editor. Votes are saved on your own site, no account or outside service needed.
 * Version: 1.2.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: softiconai
 * Author URI: https://profiles.wordpress.org/softiconai/
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: softicon-poll
 * Domain Path: /languages
 *
 * @package SoftIcon_Poll
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( function_exists( 'softicon_poll_fs' ) ) {
	// SoftIcon Poll Pro (or another copy) is already loaded; activating this one switches the other off
	register_activation_hook(
		__FILE__,
		function () {
			foreach ( array( 'softicon-poll/softicon-poll.php', 'softicon-poll-pro/softicon-poll.php' ) as $alpl_plugin ) {
				if ( plugin_basename( __FILE__ ) !== $alpl_plugin && is_plugin_active( $alpl_plugin ) ) {
					deactivate_plugins( $alpl_plugin );
				}
			}
		}
	);
} else {
	define( 'ALPL_PLUGIN_VERSION', '1.2.0' );
	define( 'ALPL_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
	define( 'ALPL_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

	// the optional Freemius opt-in, see includes/freemius.php
	require_once ALPL_PLUGIN_PATH . 'includes/freemius.php';

	require_once ALPL_PLUGIN_PATH . 'includes/class-alpl-poll.php';
	ALPL_Poll::get_instance();

	register_activation_hook( __FILE__, array( 'ALPL_Poll\Votes', 'install' ) );
}

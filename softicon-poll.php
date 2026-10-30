<?php
/**
 * Plugin Name: SoftIcon Poll
 * Description: A poll block for the block editor. Votes are saved on your own site, no account or outside service needed.
 * Version: 1.0.0
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

define( 'ALPL_PLUGIN_VERSION', '1.0.0' );
define( 'ALPL_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'ALPL_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once ALPL_PLUGIN_PATH . 'includes/class-alpl-poll.php';
ALPL_Poll::get_instance();

register_activation_hook( __FILE__, array( 'ALPL_Poll\Votes', 'install' ) );

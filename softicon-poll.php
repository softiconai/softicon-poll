<?php
/*
*
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
*/


if ( !defined('ABSPATH') ) { exit; }

class ALPL_Poll{

    public static $instance;

    private function __construct()
    {
        $this->defined_constants();
        $this->load_classes();
    }

    public static function get_instance() {
        if( self::$instance ) {
            return self::$instance;
        }

        self::$instance = new self();
        return self::$instance;
    }

    public function defined_constants() {
        define('ALPL_PLUGIN_VERSION', '1.0.0');
        define('ALPL_PLUGIN_PATH', plugin_dir_path(__FILE__));
        define('ALPL_PLUGIN_URL', plugin_dir_url(__FILE__));
    }

    public function load_classes() {

        require_once ALPL_PLUGIN_PATH . 'includes/block.php';
        require_once ALPL_PLUGIN_PATH . 'includes/votes.php';
        require_once ALPL_PLUGIN_PATH . 'includes/rest.php';

        new ALPL_Poll\block();
        new ALPL_Poll\votes();
        new ALPL_Poll\rest();

        // add-ons such as SoftIcon Poll Pro hook in here
        do_action( 'alpl_loaded' );
    }
}
ALPL_Poll::get_instance();

register_activation_hook( __FILE__, array( 'ALPL_Poll\votes', 'install' ) );

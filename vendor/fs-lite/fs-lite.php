<?php
namespace SofticonPoll;
if ( !defined('ABSPATH') ) { exit;}

// A small Freemius opt-in for the free plugin, in place of the full SDK.
// It talks only to Freemius (wp.freemius.com and api.freemius.com). Anything about the site or the admin is sent
// only after "Allow & Continue"; the one call before that, pricing(), reads the public plans with the plugin's
// public key and sends nothing about the site.
// Everything it needs from the plugin comes in the config: the admin page and the icon.
// It prints no HTML: assets/fs-lite-optin.js (React, wp.element) draws the opt-in screen from card(), the Poll
// dashboard (src/dashboard) shows notice(), and assets/fs-lite.js draws the Plugins page form.
// Ported from SoftIcon Flipbook's vendor/fs-lite; the names are this plugin's, so they can run on one site.
class fs_lite {

    const OPTION   = 'softicon_poll_fs_lite';
    const OPT_IN   = 'https://wp.freemius.com/action/service/user/install/';
    const API      = 'https://api.freemius.com';
    const SDK      = '2.13.4';
    const NONCE    = 'softicon_poll_fs_lite';

    // the Freemius reason ids, see the deactivation form
    const REASON_OTHER     = 7;
    const REASON_TEMPORARY = 15;

    private static $instance;

    private $file;
    private $id;
    private $slug;
    private $public_key;
    private $page;
    private $icon;
    private $optin_hook = '';

    public function __construct( $file, array $config )
    {
        self::$instance   = $this;
        $this->file       = $file;
        $this->id         = (string) $config['id'];
        $this->slug       = $config['slug'];
        $this->public_key = $config['public_key'];
        $this->page       = $config['page'];
        $this->icon       = isset( $config['icon'] ) ? $config['icon'] : '';

        register_activation_hook( $file, array( $this, 'activated' ) );
        register_deactivation_hook( $file, array( $this, 'deactivated' ) );

        if ( is_admin() ) {
            add_action('admin_init', array( $this, 'admin_init' ));
            add_action('admin_menu', array( $this, 'optin_menu' ));
            add_action('wp_ajax_softicon_poll_fs_opt_in', array( $this, 'opt_in_ajax' ));
            add_action('admin_post_softicon_poll_fs_skip', array( $this, 'skip_action' ));
            add_action('wp_ajax_softicon_poll_fs_tracking', array( $this, 'tracking_ajax' ));
            add_action('wp_ajax_softicon_poll_fs_reason', array( $this, 'reason_ajax' ));
            add_action('admin_enqueue_scripts', array( $this, 'plugins_page_assets' ));
            add_filter('plugin_action_links_' . plugin_basename( $file ), array( $this, 'action_links' ));
        }
    }

    public static function instance() {
        return self::$instance;
    }

    // the plugin's admin page
    private function page_url() {
        return admin_url( 'admin.php?page=' . $this->page );
    }

    // the opt-in screen, a page of its own without a menu item (like the Freemius SDK's)
    private function optin_url() {
        return admin_url( 'admin.php?page=' . $this->page . '-opt-in' );
    }

    public function optin_menu() {
        $this->optin_hook = (string) add_submenu_page( '', __('Opt in', 'softicon-poll'), '', 'manage_options', $this->page . '-opt-in', array( $this, 'optin_render' ) );
        if ( $this->optin_hook ) {
            add_action( 'load-' . $this->optin_hook, array( $this, 'optin_load' ) );
        }
    }

    // nothing to ask (already decided): the plugin's page instead
    public function optin_load() {
        if ( ! $this->card() ) {
            wp_safe_redirect( $this->page_url() );
            exit;
        }
        add_filter( 'admin_body_class', function ( $classes ) {
            return $classes . ' alpl-fs-optin-page';
        } );
        // a page without a menu item has no title of its own; the browser tab needs one
        global $title;
        $title = __('Opt in', 'softicon-poll'); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- the admin header reads it
    }

    // fs-lite-optin.js draws the screen in here
    public function optin_render() {
        // other plugins' notices go before wp-header-end, outside the card
        echo '<div class="wrap"><hr class="wp-header-end" hidden><div id="alpl-fs-optin" class="alpl-fs-screen"></div></div>';
    }

    private static function asset( $name ) {
        return array( plugins_url( 'assets/' . $name, __FILE__ ), (string) filemtime( __DIR__ . '/assets/' . $name ) );
    }

    // the free plugin has no paid code
    public function is_premium() {
        return false;
    }

    public function can_use_premium_code() {
        return false;
    }

    /* ----- stored state ----- */

    // state: '' not asked yet, 'skipped', 'pending' (waiting for the email link), 'browser' (sent from the browser,
    // waiting for Freemius to send it back), 'connected'; 'tracking' is false after an opt-out
    private function data() {
        $data = get_option( self::OPTION, null );
        if ( ! is_array( $data ) ) {
            $data = $this->from_full_sdk();
            update_option( self::OPTION, $data, false );
        }
        return array_merge( array(
            'state'    => '',
            'tracking' => true,
            'install'  => array(),
            'email'    => '',
            'version'  => '',
            'reason'   => null,
            'token'    => '',
        ), $data );
    }

    private function save( array $changes ) {
        $data = array_merge( $this->data(), $changes );
        update_option( self::OPTION, $data, false );
        return $data;
    }

    // a site that opted in or skipped with the full Freemius SDK (1.4.2) keeps that choice
    private function from_full_sdk() {
        $data     = array( 'state' => '' );
        $accounts = get_option( 'fs_accounts', array() );
        if ( ! is_array( $accounts ) ) {
            return $data;
        }
        $site  = isset( $accounts['sites'][ $this->slug ] ) ? (array) $accounts['sites'][ $this->slug ] : array();
        $flags = isset( $accounts['plugin_data'][ $this->slug ] ) ? (array) $accounts['plugin_data'][ $this->slug ] : array();
        if ( ! empty( $site['id'] ) && ! empty( $site['public_key'] ) && ! empty( $site['secret_key'] ) ) {
            $data['state']   = 'connected';
            $data['install'] = array( 'id' => (string) $site['id'], 'public_key' => (string) $site['public_key'], 'secret_key' => (string) $site['secret_key'] );
            // the SDK keeps the keys after an opt-out and only turns these off; an opt-out stays an opt-out
            $off = ! empty( $site['is_disconnected'] );
            foreach ( array( 'site', 'user', 'events', 'diagnostic' ) as $permission ) {
                if ( isset( $flags[ 'is_' . $permission . '_tracking_allowed' ] ) && false === $flags[ 'is_' . $permission . '_tracking_allowed' ] ) {
                    $off = true;
                }
            }
            $data['tracking'] = ! $off;
        } elseif ( ! empty( $accounts['plugin_data'][ $this->slug ]['is_anonymous']['is'] ) ) {
            $data['state'] = 'skipped';
        }
        if ( ! empty( $accounts['unique_id'] ) && is_string( $accounts['unique_id'] ) ) {
            $data['uid'] = $accounts['unique_id'];
        }
        // the full SDK's sync jobs for this plugin
        wp_clear_scheduled_hook( 'fs_data_sync_' . $this->slug );
        wp_clear_scheduled_hook( 'fs_install_sync_' . $this->slug );
        return $data;
    }

    public function id() {
        return $this->id;
    }

    public function public_key() {
        return $this->public_key;
    }

    // the plans, features and prices set in Freemius; a read with the plugin's public key, nothing about the site is sent
    public function pricing() {
        $result = $this->api( 'pricing.json', 'GET' );
        return is_object( $result ) && isset( $result->plans ) && is_array( $result->plans ) ? $result : null;
    }

    public function is_connected() {
        $data = $this->data();
        return 'connected' === $data['state'] && $data['tracking'];
    }

    // the same anonymous site id the full SDK makes, so a site is never counted twice
    private function uid() {
        $data = $this->data();
        if ( ! empty( $data['uid'] ) ) {
            return $data['uid'];
        }
        $auth = defined( 'SECURE_AUTH_KEY' ) ? SECURE_AUTH_KEY : '';
        if ( '' === $auth || false !== strpos( $auth, ' ' ) || 'put your unique phrase here' === $auth ) {
            $auth = wp_generate_password( 64, true, true );
        }
        $uid = md5( preg_replace( '#^https?://#', '', $this->site_url() ) . $auth );
        $this->save( array( 'uid' => $uid ) );
        return $uid;
    }

    private function site_url() {
        return get_option( 'siteurl' );
    }

    private function version() {
        $data = get_file_data( $this->file, array( 'version' => 'Version' ) );
        return $data['version'];
    }

    /* ----- Freemius requests ----- */

    // what Freemius gets about the site; nothing about other plugins or themes
    private function site_data() {
        return array(
            'sdk_version'                  => self::SDK,
            'platform_version'             => get_bloginfo( 'version' ),
            'programming_language_version' => phpversion(),
            'url'                          => $this->site_url(),
            'title'                        => get_bloginfo( 'name' ),
            'language'                     => substr( get_bloginfo( 'language' ), 0, 8 ),
            'version'                      => $this->version(),
            'is_premium'                   => false,
        );
    }

    // a signed call to the Freemius API: an install's own keys, or the plugin's public key
    private function api( $path, $method, array $body = array(), $install = null, $blocking = true ) {
        // '/' is the scope itself (/v1/installs/12.json), 'uninstall.json' a resource under it
        $scope    = $install ? '/installs/' . $install['id'] : '/plugins/' . $this->id;
        $path     = trim( $path, '/' );
        $resource = '/v1' . $scope . ( '' === $path ? '.json' : '/' . $path );
        $id       = $install ? $install['id'] : $this->id;
        $public   = $install ? $install['public_key'] : $this->public_key;
        $secret   = $install ? $install['secret_key'] : $this->public_key;

        $json = $body ? wp_json_encode( $body ) : '';
        $md5  = $json ? md5( $json ) : '';
        $type = in_array( $method, array( 'POST', 'PUT' ), true ) ? 'application/json' : '';
        $date = gmdate( 'D, d M Y H:i:s +0000' );
        $sign = hash_hmac( 'sha256', implode( "\n", array( $method, $md5, $type, $date, $resource ) ), $secret );
        $sign = rtrim( strtr( base64_encode( $sign ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- the Freemius API signature format

        $headers = array(
            'Date'          => $date,
            'Authorization' => ( $secret === $public ? 'FSP ' : 'FS ' ) . $id . ':' . $public . ':' . $sign,
        );
        // the signature covers the content type, so a GET must not send one
        if ( $type ) {
            $headers['Content-Type'] = $type;
        }
        if ( $md5 ) {
            $headers['Content-MD5'] = $md5;
        }

        $response = wp_remote_request( self::API . $resource, array(
            'method'     => $method,
            'headers'    => $headers,
            'body'       => $json,
            'timeout'    => $blocking ? 15 : 3,
            'blocking'   => $blocking,
            // WordPress would put the site address in the user agent; a site that has not opted in sends none
            'user-agent' => 'fs-lite',
        ) );
        if ( ! $blocking || is_wp_error( $response ) ) {
            return $response;
        }
        return json_decode( wp_remote_retrieve_body( $response ) );
    }

    private function update_install( array $changes, $blocking = false ) {
        $data = $this->data();
        if ( 'connected' !== $data['state'] || empty( $data['install']['secret_key'] ) ) {
            return false;
        }
        return $this->api( '/', 'PUT', array_merge( $this->site_data(), array( 'uid' => $this->uid(), 'is_active' => true, 'is_uninstalled' => false ), $changes ), $data['install'], $blocking );
    }

    /* ----- opt-in ----- */

    // where Freemius sends the keys back; its token is kept until the opt-in finishes, so the link in a
    // confirmation email still works days later or after logging in again (a nonce would not)
    private function return_url() {
        $data  = $this->data();
        $token = ! empty( $data['token'] ) ? $data['token'] : wp_generate_password( 32, false );
        $this->save( array( 'token' => $token ) );
        return add_query_arg( array(
            'fs_action' => $this->slug . '_activate_new',
            'fs_token'  => $token,
        ), $this->page_url() );
    }

    // what Freemius gets at opt-in, the same from the server and from the browser
    private function opt_in_fields() {
        $user = wp_get_current_user();
        return array(
            'sdk_version'                    => self::SDK,
            'platform_version'               => get_bloginfo( 'version' ),
            'programming_language_version'   => phpversion(),
            'plugin_slug'                    => $this->slug,
            'plugin_id'                      => $this->id,
            'plugin_public_key'              => $this->public_key,
            'plugin_version'                 => $this->version(),
            'return_url'                     => $this->return_url(),
            'account_url'                    => $this->page_url(),
            'is_premium'                     => false,
            'is_active'                      => true,
            'is_uninstalled'                 => false,
            'is_localhost'                   => $this->is_localhost(),
            'user_firstname'                 => $user->user_firstname,
            'user_lastname'                  => $user->user_lastname,
            'user_email'                     => $user->user_email,
            'site_uid'                       => $this->uid(),
            'site_url'                       => $this->site_url(),
            'site_name'                      => get_bloginfo( 'name' ),
            'language'                       => substr( get_bloginfo( 'language' ), 0, 8 ),
            'is_disconnected'                => false,
            'is_extensions_tracking_allowed' => false,
            'is_diagnostic_tracking_allowed' => true,
        );
    }

    // Allow & Continue: the server sends the opt-in to Freemius; when the host blocks that, the page posts the
    // same fields to Freemius from the browser and Freemius sends the keys back to return_url
    public function opt_in_ajax() {
        check_ajax_referer( self::NONCE . '_opt_in' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( null, 403 );
        }
        // opted out before: the install exists, its permissions go back on
        $data = $this->data();
        if ( 'connected' === $data['state'] ) {
            $result = $this->api( 'permissions.json', 'PUT', array( 'permissions' => 'user,site,events,diagnostic', 'is_enabled' => true ), $data['install'] );
            if ( ! is_object( $result ) || ! isset( $result->install_id ) ) {
                wp_send_json_error();
            }
            $this->save( array( 'tracking' => true ) );
            wp_send_json_success( array( 'next' => add_query_arg( 'softicon_poll_fs', 'connected', $this->page_url() ) ) );
        }
        $fields   = $this->opt_in_fields();
        $response = wp_remote_post( self::OPT_IN, array( 'timeout' => 30, 'body' => array_merge( $fields, array( 'format' => 'json' ) ) ) );
        $result   = is_wp_error( $response ) ? null : json_decode( wp_remote_retrieve_body( $response ) );

        if ( is_object( $result ) && ! empty( $result->install_secret_key ) ) {
            $this->connect( $result->install_id, $result->install_public_key, $result->install_secret_key );
            wp_send_json_success( array( 'next' => add_query_arg( 'softicon_poll_fs', 'connected', $this->page_url() ) ) );
        }
        if ( is_object( $result ) && ! empty( $result->pending_activation ) ) {
            $this->save( array( 'state' => 'pending', 'email' => isset( $result->email ) ? sanitize_email( $result->email ) : $fields['user_email'] ) );
            wp_send_json_success( array( 'next' => $this->optin_url() ) );
        }
        $this->save( array( 'state' => 'browser' ) );
        wp_send_json_success( array( 'browser' => array( 'action' => self::OPT_IN, 'fields' => $fields ) ) );
    }

    private function connect( $id, $public_key, $secret_key ) {
        $this->save( array(
            'state'    => 'connected',
            'tracking' => true,
            'email'    => '',
            'token'    => '',
            'version'  => $this->version(),
            'install'  => array( 'id' => (string) absint( $id ), 'public_key' => sanitize_text_field( $public_key ), 'secret_key' => sanitize_text_field( $secret_key ) ),
        ) );
    }

    public function skip_action() {
        check_admin_referer( self::NONCE . '_skip' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__('You are not allowed to do this.', 'softicon-poll'), '', array( 'response' => 403 ) );
        }
        $this->save( array( 'state' => 'skipped' ) );
        wp_safe_redirect( $this->page_url() );
        exit;
    }

    public function admin_init() {
        // the link in the Freemius confirmation email comes back here with the install's keys
        // (and after an opt-in sent from the browser, with the keys or with "check your email")
        // phpcs:disable WordPress.Security.NonceVerification.Recommended -- the stored single-use token below stands in for a nonce
        $action = isset( $_GET['fs_action'] ) ? sanitize_key( wp_unslash( $_GET['fs_action'] ) ) : '';
        if ( $this->slug . '_activate_new' === $action && ( isset( $_GET['install_secret_key'] ) || isset( $_GET['pending_activation'] ) ) ) {
            $token = isset( $_GET['fs_token'] ) ? sanitize_text_field( wp_unslash( $_GET['fs_token'] ) ) : '';
            $saved = $this->data()['token'];
            if ( ! is_string( $saved ) || '' === $saved || ! hash_equals( $saved, $token ) ) {
                wp_die( esc_html__('This link has expired. Please opt in again from the Poll dashboard.', 'softicon-poll'), '', array( 'response' => 403 ) );
            }
            $waiting = in_array( $this->data()['state'], array( 'pending', 'browser' ), true );
            if ( current_user_can( 'manage_options' ) && $waiting && isset( $_GET['install_id'], $_GET['install_public_key'], $_GET['install_secret_key'] ) ) {
                $this->connect( absint( $_GET['install_id'] ), sanitize_text_field( wp_unslash( $_GET['install_public_key'] ) ), sanitize_text_field( wp_unslash( $_GET['install_secret_key'] ) ) );
                wp_safe_redirect( add_query_arg( 'softicon_poll_fs', 'connected', $this->page_url() ) );
                exit;
            }
            if ( current_user_can( 'manage_options' ) && $waiting && isset( $_GET['pending_activation'] ) ) {
                $email = isset( $_GET['user_email'] ) ? sanitize_email( wp_unslash( $_GET['user_email'] ) ) : '';
                $this->save( array( 'state' => 'pending', 'email' => $email ? $email : wp_get_current_user()->user_email ) );
                wp_safe_redirect( $this->optin_url() );
                exit;
            }
        }
        // phpcs:enable

        $data = $this->data();

        // once after activation on the Plugins screen: the opt-in if it is not answered yet, else the dashboard's Welcome;
        // only for the person who activated it, within a minute, and not after a bulk, network, AJAX or WP-CLI activation
        global $pagenow;
        $redirect = 'softicon_poll_fs_redirect_' . $this->slug;
        // a transient comes back as a string, hence the (int)
        if ( 'plugins.php' === $pagenow && get_current_user_id() && (int) get_transient( $redirect ) === get_current_user_id() ) {
            delete_transient( $redirect );
            if ( current_user_can( 'manage_options' ) && ! isset( $_GET['activate-multi'] ) && ! wp_doing_ajax() && ! is_network_admin() ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only reads where WordPress came from
                wp_safe_redirect( '' === $data['state'] ? $this->optin_url() : $this->page_url() );
                exit;
            }
        }

        // the plugin's page, opened before the opt-in was answered: the opt-in screen first (Skip goes on to the page)
        $page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only picks the page
        if ( $this->page === $page && '' === $data['state'] && 'admin.php' === $pagenow && current_user_can( 'manage_options' ) && ! wp_doing_ajax() ) {
            wp_safe_redirect( $this->optin_url() );
            exit;
        }

        // a new plugin version is reported once
        if ( $this->is_connected() && $data['version'] !== $this->version() ) {
            $this->save( array( 'version' => $this->version() ) );
            $this->update_install( array() );
        }
    }

    /* ----- activation, deactivation, uninstall ----- */

    public function activated() {
        register_uninstall_hook( $this->file, array( __CLASS__, 'uninstall' ) );
        // an old answer from an earlier deactivation is not sent later
        $data = $this->save( array( 'reason' => null ) );
        if ( get_current_user_id() && ! wp_doing_ajax() && ! ( defined( 'WP_CLI' ) && WP_CLI ) ) {
            set_transient( 'softicon_poll_fs_redirect_' . $this->slug, get_current_user_id(), MINUTE_IN_SECONDS );
        }
        if ( 'connected' === $data['state'] && $data['tracking'] ) {
            $this->update_install( array( 'is_active' => true ) );
        }
    }

    public function deactivated() {
        register_uninstall_hook( $this->file, array( __CLASS__, 'uninstall' ) );
        if ( $this->is_connected() ) {
            $this->update_install( array( 'is_active' => false ) );
        }
    }

    // the plugin is deleted: the reason given at deactivation goes to Freemius, then the stored data is removed
    public static function uninstall() {
        $self = self::instance();
        if ( $self ) {
            $data   = $self->data();
            $reason = is_array( $data['reason'] ) ? $data['reason'] : null;
            $params = $reason ? array( 'reason_id' => $reason['id'], 'reason_info' => $reason['info'] ) : array();
            if ( $self->is_connected() ) {
                $self->update_install( array_merge( $params, array( 'is_active' => false, 'is_uninstalled' => true ) ), true );
            } elseif ( $reason ) {
                // a site that never opted in only sends the answer it chose to give, with no name or email
                $self->api( 'uninstall.json', 'PUT', array_merge( $params, array( 'uid' => $self->uid() ) ) );
            }
        }
        delete_option( self::OPTION );
    }

    /* ----- opt-out and back in, from the Plugins page ----- */

    public function tracking_ajax() {
        check_ajax_referer( self::NONCE . '_tracking' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( null, 403 );
        }
        $data   = $this->data();
        $enable = ! empty( $_POST['enable'] );
        if ( 'connected' !== $data['state'] ) {
            wp_send_json_success( array( 'url' => $this->page_url() ) );
        }
        // an opt-out counts on this site at once, even if Freemius cannot be told; opting back in waits for Freemius
        if ( ! $enable ) {
            $this->save( array( 'tracking' => false ) );
            $this->api( 'permissions.json', 'PUT', array( 'permissions' => 'user,site,events,diagnostic', 'is_enabled' => false ), $data['install'], false );
            wp_send_json_success();
        }
        $result = $this->api( 'permissions.json', 'PUT', array( 'permissions' => 'user,site,events,diagnostic', 'is_enabled' => true ), $data['install'] );
        if ( ! is_object( $result ) || ! isset( $result->install_id ) ) {
            wp_send_json_error( array( 'message' => __('Could not reach Freemius. Please try again.', 'softicon-poll') ) );
        }
        $this->save( array( 'tracking' => true ) );
        wp_send_json_success();
    }

    public function action_links( $links ) {
        if ( ! current_user_can( 'manage_options' ) ) {
            return $links;
        }
        $data = $this->data();
        if ( $this->is_connected() ) {
            $links['softicon-poll-opt'] = '<a href="#" class="alpl-fs-tracking" data-enable="0">' . esc_html__('Opt Out', 'softicon-poll') . '</a>';
        } else {
            $links['softicon-poll-opt'] = '<a href="' . esc_url( add_query_arg( 'softicon_poll_fs', 'ask', $this->optin_url() ) ) . '">' . esc_html__('Opt In', 'softicon-poll') . '</a>';
        }
        return $links;
    }

    /* ----- the deactivation form ----- */

    public static function reasons() {
        return array(
            1                      => array( __('I no longer need the plugin', 'softicon-poll'), '' ),
            10                     => array( __('I could not figure out how to set it up', 'softicon-poll'), __('Where did you get stuck?', 'softicon-poll') ),
            13                     => array( __('It is not what I was looking for', 'softicon-poll'), __('What were you looking for?', 'softicon-poll') ),
            2                      => array( __('I found a better plugin', 'softicon-poll'), __('Which plugin?', 'softicon-poll') ),
            3                      => array( __('I only needed it for a short time', 'softicon-poll'), '' ),
            12                     => array( __('It is not working', 'softicon-poll'), __('What did not work? We would like to fix it.', 'softicon-poll') ),
            11                     => array( __('I need a feature it does not have', 'softicon-poll'), __('Which feature?', 'softicon-poll') ),
            4                      => array( __('It broke my site', 'softicon-poll'), '' ),
            self::REASON_TEMPORARY => array( __('It is a temporary deactivation, I am fixing something', 'softicon-poll'), '' ),
            self::REASON_OTHER     => array( __('Other', 'softicon-poll'), __('A few words help us improve the plugin', 'softicon-poll') ),
        );
    }

    public function reason_ajax() {
        check_ajax_referer( self::NONCE . '_reason' );
        if ( ! current_user_can( 'activate_plugins' ) ) {
            wp_send_json_error( null, 403 );
        }
        $id = isset( $_POST['reason'] ) ? absint( $_POST['reason'] ) : 0;
        if ( ! isset( self::reasons()[ $id ] ) ) {
            wp_send_json_error();
        }
        $info = isset( $_POST['info'] ) ? sanitize_text_field( wp_unslash( $_POST['info'] ) ) : '';
        $this->save( array( 'reason' => array( 'id' => $id, 'info' => mb_substr( $info, 0, 128 ) ) ) );
        wp_send_json_success();
    }

    public function plugins_page_assets( $hook ) {
        if ( 'plugins.php' !== $hook && ( '' === $this->optin_hook || $this->optin_hook !== $hook ) ) {
            return;
        }
        list( $css, $css_ver ) = self::asset( 'fs-lite.css' );
        wp_enqueue_style( 'softicon-poll-fs-lite', $css, array( 'dashicons' ), $css_ver );
        if ( 'plugins.php' !== $hook ) {
            list( $js, $js_ver ) = self::asset( 'fs-lite-optin.js' );
            wp_enqueue_script( 'softicon-poll-fs-lite-optin', $js, array( 'wp-element' ), $js_ver, true );
            wp_add_inline_script( 'softicon-poll-fs-lite-optin', 'window.softiconPollFsOptIn = ' . wp_json_encode( $this->card() ) . ';', 'before' );
            return;
        }
        list( $js, $js_ver ) = self::asset( 'fs-lite.js' );
        wp_enqueue_script( 'softicon-poll-fs-lite', $js, array( 'wp-element' ), $js_ver, true );
        $reasons = array();
        foreach ( self::reasons() as $id => $reason ) {
            $reasons[] = array( 'id' => $id, 'text' => $reason[0], 'ask' => $reason[1] );
        }
        wp_add_inline_script( 'softicon-poll-fs-lite', 'window.softiconPollFsLite = ' . wp_json_encode( array(
            'ajax'     => admin_url( 'admin-ajax.php' ),
            'plugin'   => plugin_basename( $this->file ),
            'reason'   => wp_create_nonce( self::NONCE . '_reason' ),
            'tracking' => wp_create_nonce( self::NONCE . '_tracking' ),
            'optOut'   => __('Stop sending usage data to SoftIcon through Freemius? You can opt in again at any time.', 'softicon-poll'),
            'error'    => __('Could not reach Freemius. Please try again.', 'softicon-poll'),
            // the deactivation form, only for people who may deactivate plugins
            'form'     => current_user_can( 'activate_plugins' ) ? array(
                'title'   => __('Quick question before you go', 'softicon-poll'),
                'text'    => __('Why are you deactivating SoftIcon Poll? Your answer helps us make it better.', 'softicon-poll'),
                'reasons' => $reasons,
                'note'    => __('Only your answer and an anonymous site ID are sent, when the plugin is deleted. No name or email unless you opted in before.', 'softicon-poll'),
                'skip'    => __('Skip & Deactivate', 'softicon-poll'),
                'cancel'  => __('Cancel', 'softicon-poll'),
                'submit'  => __('Submit & Deactivate', 'softicon-poll'),
            ) : null,
        ) ) . ';', 'before' );
    }

    /* ----- the opt-in screen ----- */

    // the opt-in screen's words and actions, drawn by assets/fs-lite-optin.js; null when there is nothing to ask
    public function card() {
        $data = $this->data();
        $ask  = isset( $_GET['softicon_poll_fs'] ) && 'ask' === sanitize_key( wp_unslash( $_GET['softicon_poll_fs'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only shows the card
        $open    = in_array( $data['state'], array( '', 'browser' ), true );
        $pending = 'pending' === $data['state'];
        if ( ! current_user_can( 'manage_options' ) || ( ! $open && ! $pending && ! ( $ask && ! $this->is_connected() ) ) ) {
            return null;
        }
        $user = wp_get_current_user();
        return array(
            'icon'        => $this->icon,
            'title'       => __('Never miss an important update', 'softicon-poll'),
            /* translators: %s: the admin's first name or user name */
            'text'        => sprintf( __('Hi %s! Opt in to get emails about security fixes and new features, and to share some basic site data with SoftIcon through Freemius. It helps us make SoftIcon Poll better. If you skip, the plugin works just the same.', 'softicon-poll'), $user->user_firstname ? $user->user_firstname : $user->display_name ),
            'shared'      => __('What is shared', 'softicon-poll'),
            'permissions' => array(
                array( 'icon' => 'admin-users', 'title' => __('Your profile', 'softicon-poll'), 'text' => __('Name and email address', 'softicon-poll') ),
                array( 'icon' => 'admin-site-alt3', 'title' => __('Your site', 'softicon-poll'), 'text' => __('Site address, title and language, WordPress and PHP versions', 'softicon-poll') ),
                array( 'icon' => 'admin-plugins', 'title' => __('Plugin events', 'softicon-poll'), 'text' => __('SoftIcon Poll version, activation, deactivation and uninstall', 'softicon-poll') ),
            ),
            'note'        => __('Nothing about your posts, visitors, other plugins or themes. You can opt out at any time from the Plugins page.', 'softicon-poll'),
            'privacy'     => array( 'url' => 'https://freemius.com/privacy/', 'label' => __('Freemius privacy policy', 'softicon-poll') ),
            // Allow goes to admin-ajax.php (see opt_in_ajax()), Skip is a form to admin-post.php
            'ajax'        => admin_url( 'admin-ajax.php' ),
            'form'        => admin_url( 'admin-post.php' ),
            'allow'       => array( 'action' => 'softicon_poll_fs_opt_in', 'nonce' => wp_create_nonce( self::NONCE . '_opt_in' ), 'label' => __('Allow & Continue', 'softicon-poll'), 'busy' => __('Connecting…', 'softicon-poll'), 'error' => __('Could not reach Freemius right now. Please try again later.', 'softicon-poll') ),
            // also after an earlier Skip (the Plugins page's Opt In link), so there is always a way back
            'skip'        => ! $pending ? array( 'action' => 'softicon_poll_fs_skip', 'nonce' => wp_create_nonce( self::NONCE . '_skip' ), 'label' => __('Skip', 'softicon-poll') ) : null,
            'dashboard'   => $this->page_url(),
            // waiting for the click in the Freemius confirmation email, which often lands in spam
            'pending'     => ! $pending ? null : array(
                'title'     => __('Check your email', 'softicon-poll'),
                'sent'      => __('We sent a confirmation email to', 'softicon-poll'),
                'email'     => $data['email'],
                'click'     => __('Click the button in that email to finish. Until then, nothing is sent.', 'softicon-poll'),
                'spamTitle' => __('Not in your inbox?', 'softicon-poll'),
                'spam'      => __('Look in your Spam or Junk folder (and Promotions in Gmail). Mark the email as "Not spam", then click the button in it.', 'softicon-poll'),
                'dashboard' => __('Go to the Poll dashboard', 'softicon-poll'),
                'resend'    => __('Send the email again', 'softicon-poll'),
            ),
            'footer'      => array(
                'powered' => __('Powered by Freemius', 'softicon-poll'),
                'privacy' => array( 'url' => 'https://freemius.com/privacy/', 'label' => __('Privacy Policy', 'softicon-poll') ),
                'terms'   => array( 'url' => 'https://freemius.com/terms/', 'label' => __('Terms of Service', 'softicon-poll') ),
            ),
        );
    }

    // the message after an opt-in, for the plugin's page to show; null when there is none
    public function notice() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return null;
        }
        $data   = $this->data();
        $notice = isset( $_GET['softicon_poll_fs'] ) ? sanitize_key( wp_unslash( $_GET['softicon_poll_fs'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only picks a message
        if ( 'connected' === $notice && $this->is_connected() ) {
            return array( 'type' => 'success', 'text' => __('Thank you! You will now hear about important SoftIcon Poll updates.', 'softicon-poll') );
        }
        if ( 'pending' === $data['state'] ) {
            /* translators: %s: email address */
            return array( 'type' => 'warning', 'text' => sprintf( __('Almost done: open the email we sent to %s and click the button in it. Not in your inbox? Look in your Spam or Junk folder and mark it as "Not spam".', 'softicon-poll'), $data['email'] ) );
        }
        if ( 'error' === $notice ) {
            return array( 'type' => 'error', 'text' => __('Could not reach Freemius right now. Please try again later.', 'softicon-poll') );
        }
        return null;
    }

    private function is_localhost() {
        $host = wp_parse_url( $this->site_url(), PHP_URL_HOST );
        return in_array( $host, array( 'localhost', '127.0.0.1', '::1' ), true ) || (bool) preg_match( '/\.(local|test|localhost|example|invalid)$/', (string) $host );
    }
}

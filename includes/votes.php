<?php
namespace ALPL_Poll;
if ( !defined('ABSPATH') ) { exit;}

// One row per chosen answer. A voter is a salted hash of the user id or the IP address,
// the address itself is never stored.
class votes {

    const DB_VERSION = '1';
    const CACHE      = 'alpl_votes';

    public function __construct()
    {
        add_action('admin_init', array( __CLASS__, 'maybe_install' ));
    }

    public static function table() {
        global $wpdb;
        return $wpdb->prefix . 'alpl_votes';
    }

    public static function install() {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // the unique key also answers "has this voter voted?" through its first two columns
        dbDelta( 'CREATE TABLE ' . self::table() . " (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            poll_id varchar(32) NOT NULL,
            option_id varchar(16) NOT NULL,
            voter_hash char(32) NOT NULL,
            created datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY poll_voter_option (poll_id,voter_hash,option_id),
            KEY poll_option (poll_id,option_id)
        ) " . $wpdb->get_charset_collate() . ';' );

        update_option( 'alpl_db_version', self::DB_VERSION, false );
    }

    public static function maybe_install() {
        if ( self::DB_VERSION !== get_option('alpl_db_version') ) {
            self::install();
        }
    }

    // the visitor's address; behind a proxy that hides it, a site can return the real one with this filter
    public static function ip() {
        $ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
        $ip = apply_filters( 'alpl_voter_ip', $ip );
        return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '';
    }

    // logged-in visitors are counted by account, others by address; the poll id in the hash
    // keeps the same visitor from being linked across polls
    public static function voter( $poll_id ) {
        $user = get_current_user_id();
        return wp_hash( ( $user ? 'user:' . $user : 'ip:' . self::ip() ) . '|' . $poll_id );
    }

    public static function cookie( $poll_id ) {
        return 'alpl_voted_' . $poll_id;
    }

    public static function choices_of( $poll_id, $voter ) {
        global $wpdb;
        return $wpdb->get_col( $wpdb->prepare( 'SELECT option_id FROM %i WHERE poll_id = %s AND voter_hash = %s', self::table(), $poll_id, $voter ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- per visitor, not worth caching
    }

    public static function add( $poll_id, $voter, $choices ) {
        global $wpdb;
        $now = current_time( 'mysql', true );
        foreach ( $choices as $choice ) {
            $wpdb->insert( self::table(), array( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- this plugin's own table
                'poll_id'    => $poll_id,
                'option_id'  => $choice,
                'voter_hash' => $voter,
                'created'    => $now,
            ), array( '%s', '%s', '%s', '%s' ) );
        }
        wp_cache_delete( $poll_id, self::CACHE );
    }

    // votes per answer and the number of people who voted
    public static function results( $poll_id ) {
        $cached = wp_cache_get( $poll_id, self::CACHE );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        global $wpdb;
        $rows   = $wpdb->get_results( $wpdb->prepare( 'SELECT option_id, COUNT(*) AS votes FROM %i WHERE poll_id = %s GROUP BY option_id', self::table(), $poll_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- cached below
        $voters = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(DISTINCT voter_hash) FROM %i WHERE poll_id = %s', self::table(), $poll_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- cached below

        $counts = array();
        foreach ( (array) $rows as $row ) {
            $counts[ $row->option_id ] = (int) $row->votes;
        }

        $results = array( 'counts' => $counts, 'voters' => $voters );
        wp_cache_set( $poll_id, $results, self::CACHE, MINUTE_IN_SECONDS );
        return $results;
    }

    public static function reset( $poll_id ) {
        global $wpdb;
        $wpdb->delete( self::table(), array( 'poll_id' => $poll_id ), array( '%s' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- this plugin's own table
        wp_cache_delete( $poll_id, self::CACHE );
    }
}

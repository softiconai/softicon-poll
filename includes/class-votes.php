<?php
namespace ALPL_Poll;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// One row per chosen answer, plus one ballot row per voter. A voter is a salted hash of the user id or
// the IP address, the address itself is never stored.
class Votes {

	const DB_VERSION = '1';
	const CACHE      = 'alpl_votes';
	// the ballot row's option id; answer ids are [a-z0-9] only, so it can't clash
	const BALLOT = '-';

	public function __construct() {
		add_action( 'admin_init', array( __CLASS__, 'maybe_install' ) );
		add_action( 'admin_init', array( $this, 'privacy_policy' ) );
	}

	// suggested text for the site's privacy policy (Settings > Privacy > Policy guide)
	public function privacy_policy() {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}
		$text = '<p>' . __( 'When you vote in a poll on this site, we save which answers you chose. To allow one vote per person, we also save a scrambled code made from your user account if you are logged in, or else from your IP address. Your IP address itself is not saved, and the code cannot be turned back into it.', 'softicon-poll' ) . '</p>'
			. '<p>' . __( 'If you are not logged in, your browser also gets a cookie named alpl_voted_ followed by the poll\'s id, for one year, so the site remembers that you voted. The votes stay on this site and are not sent to anyone else.', 'softicon-poll' ) . '</p>';
		wp_add_privacy_policy_content( 'SoftIcon Poll', wp_kses_post( $text ) );
	}

	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'alpl_votes';
	}

	public static function install() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// the unique key also answers "has this voter voted?" through its first two columns
		dbDelta(
			'CREATE TABLE ' . self::table() . ' (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            poll_id varchar(32) NOT NULL,
            option_id varchar(16) NOT NULL,
            voter_hash char(32) NOT NULL,
            created datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY poll_voter_option (poll_id,voter_hash,option_id),
            KEY poll_option (poll_id,option_id)
        ) ' . $wpdb->get_charset_collate() . ';'
		);

		update_option( 'alpl_db_version', self::DB_VERSION, false );
	}

	public static function maybe_install() {
		if ( self::DB_VERSION !== get_option( 'alpl_db_version' ) ) {
			self::install();
		}
	}

	// Cloudflare's addresses, https://www.cloudflare.com/ips/
	const CLOUDFLARE = array(
		'173.245.48.0/20',
		'103.21.244.0/22',
		'103.22.200.0/22',
		'103.31.4.0/22',
		'141.101.64.0/18',
		'108.162.192.0/18',
		'190.93.240.0/20',
		'188.114.96.0/20',
		'197.234.240.0/22',
		'198.41.128.0/17',
		'162.158.0.0/15',
		'104.16.0.0/13',
		'104.24.0.0/14',
		'172.64.0.0/13',
		'131.0.72.0/22',
		'2400:cb00::/32',
		'2606:4700::/32',
		'2803:f800::/32',
		'2405:b500::/32',
		'2405:8100::/32',
		'2a06:98c0::/29',
		'2c0f:f248::/32',
	);

	// the visitor's address. Behind Cloudflare every request comes from one of its servers, which would let
	// one visitor vote for the whole site; its header is used only when the request really comes from Cloudflare,
	// anyone else could fake it. Behind another proxy a site can return the real address with the filter.
	public static function ip() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

		if ( isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) && self::in_ranges( $ip, self::CLOUDFLARE ) ) {
			$visitor = sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ) );
			if ( filter_var( $visitor, FILTER_VALIDATE_IP ) ) {
				$ip = $visitor;
			}
		}

		$ip = apply_filters( 'alpl_voter_ip', $ip );
		return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '';
	}

	// IPv4 and IPv6 CIDR ranges
	public static function in_ranges( $ip, $ranges ) {
		$address = filter_var( $ip, FILTER_VALIDATE_IP ) ? inet_pton( $ip ) : false;
		if ( false === $address ) {
			return false;
		}
		foreach ( $ranges as $range ) {
			list( $subnet, $bits ) = explode( '/', $range );
			$subnet                = inet_pton( $subnet );
			if ( false === $subnet || strlen( $subnet ) !== strlen( $address ) ) {
				continue;
			}
			$bytes = intdiv( (int) $bits, 8 );
			$rest  = (int) $bits % 8;
			if ( substr( $address, 0, $bytes ) !== substr( $subnet, 0, $bytes ) ) {
				continue;
			}
			if ( ! $rest ) {
				return true;
			}
			$mask = ( 0xff << ( 8 - $rest ) ) & 0xff;
			if ( ( ord( $address[ $bytes ] ) & $mask ) === ( ord( $subnet[ $bytes ] ) & $mask ) ) {
				return true;
			}
		}
		return false;
	}

	// an IPv6 visitor gets a whole /64 to pick addresses from, so the network counts as one address
	public static function network() {
		$ip = self::ip();
		if ( false !== strpos( $ip, ':' ) ) {
			$ip = inet_ntop( substr( inet_pton( $ip ), 0, 8 ) . str_repeat( "\0", 8 ) ) . '/64';
		}
		return $ip;
	}

	// logged-in visitors are counted by account, others by address; the poll id in the hash
	// keeps the same visitor from being linked across polls
	public static function voter( $poll_id ) {
		$user = get_current_user_id();
		return wp_hash( ( $user ? 'user:' . $user : 'ip:' . self::network() ) . '|' . $poll_id );
	}

	public static function cookie( $poll_id ) {
		return 'alpl_voted_' . $poll_id;
	}

	// signed, so a hand-made cookie can't unlock the results of a poll the visitor hasn't voted in
	public static function cookie_value( $poll_id ) {
		return wp_hash( 'voted|' . $poll_id );
	}

	public static function has_cookie( $poll_id ) {
		$name = self::cookie( $poll_id );
		return isset( $_COOKIE[ $name ] ) && hash_equals( self::cookie_value( $poll_id ), sanitize_text_field( wp_unslash( $_COOKIE[ $name ] ) ) );
	}

	// [] when this voter hasn't voted, else the answers, with the ballot row for a vote whose answers were removed
	public static function choices_of( $poll_id, $voter ) {
		global $wpdb;
		return $wpdb->get_col( $wpdb->prepare( 'SELECT option_id FROM %i WHERE poll_id = %s AND voter_hash = %s', self::table(), $poll_id, $voter ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- per visitor, not worth caching
	}

	// false when the voter already has a ballot: of requests sent at the same time only the first gets one in
	public static function add( $poll_id, $voter, $choices ) {
		global $wpdb;
		$now   = current_time( 'mysql', true );
		$first = $wpdb->query( $wpdb->prepare( 'INSERT IGNORE INTO %i (poll_id, option_id, voter_hash, created) VALUES (%s, %s, %s, %s)', self::table(), $poll_id, self::BALLOT, $voter, $now ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- this plugin's own table
		if ( 1 !== $first ) {
			return false;
		}
		foreach ( $choices as $choice ) {
			$row = array(
				'poll_id'    => $poll_id,
				'option_id'  => $choice,
				'voter_hash' => $voter,
				'created'    => $now,
			);
			$wpdb->insert( self::table(), $row, array( '%s', '%s', '%s', '%s' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- this plugin's own table
		}
		wp_cache_delete( $poll_id, self::CACHE );
		return true;
	}

	// votes per answer and the number of people who voted (one ballot row each)
	public static function results( $poll_id ) {
		$cached = wp_cache_get( $poll_id, self::CACHE );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT option_id, COUNT(*) AS votes FROM %i WHERE poll_id = %s GROUP BY option_id', self::table(), $poll_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- cached below

		$counts = array();
		foreach ( (array) $rows as $row ) {
			$counts[ $row->option_id ] = (int) $row->votes;
		}
		$voters = isset( $counts[ self::BALLOT ] ) ? $counts[ self::BALLOT ] : 0;
		unset( $counts[ self::BALLOT ] );

		$results = array(
			'counts' => $counts,
			'voters' => $voters,
		);
		wp_cache_set( $poll_id, $results, self::CACHE, MINUTE_IN_SECONDS );
		return $results;
	}

	public static function reset( $poll_id ) {
		global $wpdb;
		$wpdb->delete( self::table(), array( 'poll_id' => $poll_id ), array( '%s' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- this plugin's own table
		wp_cache_delete( $poll_id, self::CACHE );
	}
}

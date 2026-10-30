<?php
namespace ALPL_Poll;
if ( !defined('ABSPATH') ) { exit;}

// The page only holds the question and answers; whether this visitor voted and the results come from here,
// so a page cache can keep the poll without freezing it.
class rest {

    const NS         = 'softicon-poll/v1';
    const RATE_LIMIT = 20; // votes per address per minute

    public function __construct()
    {
        add_action('rest_api_init', array( $this, 'routes' ));
    }

    public function routes() {
        $id   = '(?P<id>[a-z0-9]{6,32})';
        $post = array(
            'type'     => 'integer',
            'required' => true,
            'minimum'  => 1,
        );

        // public on purpose: visitors of cached pages have no nonce, the poll is read from the post and every value is checked
        register_rest_route( self::NS, '/results/' . $id, array(
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => array( $this, 'results' ),
            'permission_callback' => '__return_true',
            'args'                => array( 'post' => $post ),
        ) );

        register_rest_route( self::NS, '/vote', array(
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => array( $this, 'vote' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'poll'    => array(
                    'type'     => 'string',
                    'required' => true,
                    'pattern'  => '^[a-z0-9]{6,32}$',
                ),
                'post'    => $post,
                'choices' => array(
                    'type'     => 'array',
                    'required' => true,
                    'items'    => array( 'type' => 'string' ),
                    'maxItems' => 100,
                ),
            ),
        ) );

        // the editor's Votes panel
        register_rest_route( self::NS, '/manage/' . $id, array(
            array(
                'methods'             => \WP_REST_Server::READABLE,
                'callback'            => array( $this, 'manage' ),
                'permission_callback' => array( $this, 'can_manage' ),
            ),
            array(
                'methods'             => \WP_REST_Server::DELETABLE,
                'callback'            => array( $this, 'reset' ),
                'permission_callback' => array( $this, 'can_manage' ),
            ),
            'args' => array(
                'post' => array(
                    'type'    => 'integer',
                    'default' => 0,
                ),
            ),
        ) );
    }

    // editors see every poll; authors only the polls in posts they can edit
    public function can_manage( $request ) {
        if ( current_user_can('edit_others_posts') ) {
            return true;
        }
        $post_id = absint( $request['post'] );
        return $post_id && current_user_can( 'edit_post', $post_id ) && null !== block::find( $post_id, $request['id'] );
    }

    // published and not behind a password, or a draft its editor previews
    private static function viewable( $post_id ) {
        $post = get_post( $post_id );
        if ( ! $post ) {
            return false;
        }
        return ( is_post_publicly_viewable( $post ) && ! post_password_required( $post ) ) || current_user_can( 'edit_post', $post->ID );
    }

    private static function poll( $post_id, $poll_id ) {
        $attributes = self::viewable( $post_id ) ? block::find( $post_id, $poll_id ) : null;
        if ( null === $attributes ) {
            return new \WP_Error( 'alpl_not_found', __( 'This poll could not be found.', 'softicon-poll' ), array( 'status' => 404 ) );
        }
        return block::settings( $attributes );
    }

    // what view.js needs: can this visitor vote, what did they choose, and the results when they may see them
    private static function state( $settings, $post_id ) {
        $id          = $settings['id'];
        $choices     = votes::choices_of( $id, votes::voter( $id ) );
        // a poll for logged-in users counts accounts only, not the browser
        $voted       = (bool) $choices || ( ! $settings['loginOnly'] && isset( $_COOKIE[ votes::cookie( $id ) ] ) );
        $open        = block::is_open( $settings );
        $needs_login = $settings['loginOnly'] && ! is_user_logged_in();

        switch ( $settings['showResults'] ) {
            case 'always':
                $show = true;
                break;
            case 'closed':
                $show = ! $open;
                break;
            case 'never':
                $show = current_user_can( 'edit_post', $post_id );
                break;
            default:
                $show = $voted || ! $open;
        }

        $results = null;
        if ( $show ) {
            $all    = votes::results( $id );
            $counts = array();
            // votes for answers removed since then are left out
            foreach ( $settings['options'] as $option ) {
                $counts[ $option['id'] ] = isset( $all['counts'][ $option['id'] ] ) ? $all['counts'][ $option['id'] ] : 0;
            }
            $results = array(
                'counts' => (object) $counts,
                'voters' => $all['voters'],
            );
        }

        return array(
            'open'       => $open,
            'voted'      => $voted,
            'choices'    => array_values( $choices ),
            'canVote'    => $open && ! $voted && ! $needs_login,
            'needsLogin' => $open && ! $voted && $needs_login,
            'results'    => $results,
        );
    }

    private static function respond( $data ) {
        $response = rest_ensure_response( $data );
        // per visitor, a CDN must not keep one visitor's answer for the next
        foreach ( wp_get_nocache_headers() as $name => $value ) {
            if ( $value ) {
                $response->header( $name, $value );
            }
        }
        return $response;
    }

    public function results( \WP_REST_Request $request ) {
        $post_id  = absint( $request['post'] );
        $settings = self::poll( $post_id, $request['id'] );
        if ( is_wp_error( $settings ) ) {
            return $settings;
        }
        return self::respond( self::state( $settings, $post_id ) );
    }

    // counts requests per address for a minute; the address is hashed for the key too
    private static function rate_limited() {
        $key   = 'alpl_rate_' . wp_hash( 'rate|' . votes::ip() );
        $count = (int) get_transient( $key );
        if ( $count >= (int) apply_filters( 'alpl_rate_limit', self::RATE_LIMIT ) ) {
            return true;
        }
        set_transient( $key, $count + 1, MINUTE_IN_SECONDS );
        return false;
    }

    public function vote( \WP_REST_Request $request ) {
        if ( self::rate_limited() ) {
            return new \WP_Error( 'alpl_rate_limited', __( 'Too many votes from your network. Please try again in a minute.', 'softicon-poll' ), array( 'status' => 429 ) );
        }

        $post_id  = absint( $request['post'] );
        $settings = self::poll( $post_id, $request['poll'] );
        if ( is_wp_error( $settings ) ) {
            return $settings;
        }

        $state = self::state( $settings, $post_id );
        if ( ! $state['canVote'] ) {
            if ( ! $state['open'] ) {
                $error = array( 'alpl_closed', __( 'This poll is closed.', 'softicon-poll' ), 403 );
            } elseif ( $state['needsLogin'] ) {
                $error = array( 'alpl_login', __( 'Please log in to vote.', 'softicon-poll' ), 403 );
            } else {
                $error = array( 'alpl_voted', __( 'You have already voted.', 'softicon-poll' ), 409 );
            }
            // the page shows the right state from it
            return new \WP_Error( $error[0], $error[1], array( 'status' => $error[2], 'state' => $state ) );
        }

        $allowed = wp_list_pluck( $settings['options'], 'id' );
        $choices = array_values( array_unique( array_map( array( block::class, 'option_id' ), (array) $request['choices'] ) ) );
        if ( ! $choices || array_diff( $choices, $allowed ) || count( $choices ) > $settings['max'] ) {
            return new \WP_Error( 'alpl_invalid', __( 'Please choose a valid answer.', 'softicon-poll' ), array( 'status' => 400 ) );
        }

        $id = $settings['id'];
        votes::add( $id, votes::voter( $id ), $choices );

        // the browser remembers the vote too, for visitors whose address changes
        if ( ! $settings['loginOnly'] ) {
            setcookie( votes::cookie( $id ), '1', array(
                'expires'  => time() + YEAR_IN_SECONDS,
                'path'     => COOKIEPATH ? COOKIEPATH : '/',
                'domain'   => COOKIE_DOMAIN ? COOKIE_DOMAIN : '',
                'secure'   => is_ssl(),
                'httponly' => true,
                'samesite' => 'Lax',
            ) );
            $_COOKIE[ votes::cookie( $id ) ] = '1';
        }

        return self::respond( self::state( $settings, $post_id ) );
    }

    // every count, also for answers removed since; an empty list stays a JSON object
    private static function raw_results( $poll_id ) {
        $results           = votes::results( $poll_id );
        $results['counts'] = (object) $results['counts'];
        return $results;
    }

    public function manage( \WP_REST_Request $request ) {
        return self::respond( self::raw_results( $request['id'] ) );
    }

    public function reset( \WP_REST_Request $request ) {
        votes::reset( $request['id'] );
        return self::respond( self::raw_results( $request['id'] ) );
    }
}

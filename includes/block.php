<?php
namespace ALPL_Poll;
if ( !defined('ABSPATH') ) { exit;}

class block {

    const NAME = 'softicon/poll';

    public function __construct()
    {
        add_action('init', array( $this, 'register' ));
        add_filter('block_editor_settings_all', array( $this, 'no_inspector_tabs' ));
    }

    // the block has its own General and Style tabs; without this WordPress adds its Settings/Styles tabs above them
    public function no_inspector_tabs( $settings ) {
        $tabs = isset( $settings['blockInspectorTabs'] ) && is_array( $settings['blockInspectorTabs'] ) ? $settings['blockInspectorTabs'] : array();
        $tabs[ self::NAME ] = false;
        $settings['blockInspectorTabs'] = $tabs;
        return $settings;
    }

    public function register() {
        register_block_type( ALPL_PLUGIN_PATH . 'build' );
    }

    // the HTML an answer may keep, the editor only offers bold and italic
    public static function option_text( $text ) {
        return trim( wp_kses( (string) $text, array( 'strong' => array(), 'em' => array(), 'b' => array(), 'i' => array() ) ) );
    }

    // every setting with its default filled in and checked, the same for render.php and the REST routes
    public static function settings( $attributes ) {
        $attributes = is_array( $attributes ) ? $attributes : array();

        $options = array();
        $seen    = array();
        $items   = isset( $attributes['options'] ) && is_array( $attributes['options'] ) ? $attributes['options'] : self::default_options();
        foreach ( $items as $item ) {
            $id = isset( $item['id'] ) ? self::option_id( $item['id'] ) : '';
            if ( '' === $id || isset( $seen[ $id ] ) ) {
                continue;
            }
            $text  = isset( $item['text'] ) ? self::option_text( $item['text'] ) : '';
            $image = isset( $item['image'] ) && is_array( $item['image'] ) ? $item['image'] : array();
            // an empty answer without an image is a row the author left blank
            if ( '' === wp_strip_all_tags( $text ) && empty( $image['id'] ) && empty( $image['url'] ) ) {
                continue;
            }
            $seen[ $id ] = true;
            $options[]   = array(
                'id'    => $id,
                'text'  => $text,
                'image' => $image,
            );
        }

        $multiple = ! empty( $attributes['multiple'] );
        $max      = isset( $attributes['maxChoices'] ) ? absint( $attributes['maxChoices'] ) : 0;

        $settings = array(
            'id'          => isset( $attributes['pollId'] ) ? self::poll_id( $attributes['pollId'] ) : '',
            'question'    => isset( $attributes['question'] ) ? (string) $attributes['question'] : '',
            'options'     => $options,
            'multiple'    => $multiple,
            // 0 means any number of answers
            'max'         => $multiple ? ( $max && $max < count( $options ) ? $max : count( $options ) ) : 1,
            'showResults' => self::pick( $attributes, 'showResults', array( 'after', 'always', 'closed', 'never' ) ),
            'format'      => self::pick( $attributes, 'resultsFormat', array( 'both', 'percent', 'count' ) ),
            'showTotal'   => ! isset( $attributes['showTotal'] ) || (bool) $attributes['showTotal'],
            'animate'     => ! isset( $attributes['animateBars'] ) || (bool) $attributes['animateBars'],
            'closed'      => ! empty( $attributes['closed'] ),
            'endDate'     => isset( $attributes['endDate'] ) ? self::end_date( $attributes['endDate'] ) : null,
            'loginOnly'   => ! empty( $attributes['loginOnly'] ),
        );

        return apply_filters( 'alpl_settings', $settings, $attributes );
    }

    public static function default_options() {
        return array( array( 'id' => 'o1', 'text' => '' ), array( 'id' => 'o2', 'text' => '' ) );
    }

    // the first allowed value is the default
    private static function pick( $attributes, $key, $allowed ) {
        return isset( $attributes[ $key ] ) && in_array( $attributes[ $key ], $allowed, true ) ? $attributes[ $key ] : $allowed[0];
    }

    public static function poll_id( $value ) {
        $value = is_string( $value ) ? strtolower( $value ) : '';
        return preg_match( '/^[a-z0-9]{6,32}$/', $value ) ? $value : '';
    }

    public static function option_id( $value ) {
        $value = is_scalar( $value ) ? strtolower( (string) $value ) : '';
        return preg_match( '/^[a-z0-9]{1,16}$/', $value ) ? $value : '';
    }

    // the editor saves the site's local time without a zone, e.g. 2026-11-01T18:00:00
    public static function end_date( $value ) {
        if ( ! is_string( $value ) || '' === trim( $value ) ) {
            return null;
        }
        $date = date_create( $value, wp_timezone() );
        return $date ? $date : null;
    }

    // closed by hand or past the end date
    public static function is_open( $settings ) {
        if ( $settings['closed'] ) {
            return false;
        }
        return ! $settings['endDate'] || $settings['endDate']->getTimestamp() > time();
    }

    // hex, rgb(a), hsl(a) or a preset var(), anything else is dropped
    public static function color( $value ) {
        $value = is_string( $value ) ? trim( $value ) : '';
        if ( preg_match( '/^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([0-9.,%\s\/]+\)|var\(--[a-z0-9-]+\))$/i', $value ) ) {
            return $value;
        }
        return '';
    }

    public static function image( $image, $size = 'medium' ) {
        $id = isset( $image['id'] ) ? absint( $image['id'] ) : 0;
        if ( $id && wp_attachment_is_image( $id ) ) {
            $src = wp_get_attachment_image_src( $id, $size );
            if ( $src ) {
                return array(
                    'url' => $src[0],
                    'alt' => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
                );
            }
        }
        if ( ! empty( $image['url'] ) ) {
            return array(
                'url' => esc_url_raw( $image['url'] ),
                'alt' => isset( $image['alt'] ) ? sanitize_text_field( $image['alt'] ) : '',
            );
        }
        return null;
    }

    // the poll's saved attributes, read from the post itself so a vote is checked against the current answers;
    // synced patterns inside the post are followed
    public static function find( $post_id, $poll_id ) {
        $post = get_post( $post_id );
        if ( ! $post || '' === $poll_id ) {
            return null;
        }
        $visited = array();
        return self::find_in( parse_blocks( $post->post_content ), $poll_id, $visited );
    }

    private static function find_in( $blocks, $poll_id, &$visited ) {
        foreach ( $blocks as $block ) {
            if ( self::NAME === $block['blockName'] && isset( $block['attrs']['pollId'] ) && $poll_id === $block['attrs']['pollId'] ) {
                return $block['attrs'];
            }

            if ( 'core/block' === $block['blockName'] && ! empty( $block['attrs']['ref'] ) ) {
                $ref = absint( $block['attrs']['ref'] );
                if ( ! isset( $visited[ $ref ] ) ) {
                    $visited[ $ref ] = true;
                    $pattern         = get_post( $ref );
                    if ( $pattern && 'wp_block' === $pattern->post_type && 'publish' === $pattern->post_status ) {
                        $found = self::find_in( parse_blocks( $pattern->post_content ), $poll_id, $visited );
                        if ( $found ) {
                            return $found;
                        }
                    }
                }
            }

            if ( ! empty( $block['innerBlocks'] ) ) {
                $found = self::find_in( $block['innerBlocks'], $poll_id, $visited );
                if ( $found ) {
                    return $found;
                }
            }
        }
        return null;
    }
}

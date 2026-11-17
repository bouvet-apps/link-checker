package no.bouvet.xp.lib.url;

import java.net.IDN;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;

/**
 * Java's HttpClient rejects non-ASCII URLs (e.g. https://miljøløftet.no/),
 * so the host is converted to punycode and other non-ASCII characters are percent-encoded.
 */
public final class AsciiUrl implements ScriptBean {

    private static final Pattern URL_PATTERN = Pattern.compile( "^([a-zA-Z][a-zA-Z0-9+.-]*://)([^/?#@]*@)?([^/?#:]*)(.*)$", Pattern.DOTALL );

    public String toAscii( final String url ) {
        if ( url == null ) {
            return null;
        }
        final Matcher matcher = URL_PATTERN.matcher( url );
        if ( !matcher.matches() ) {
            return encodeNonAscii( url );
        }
        final String userInfo = matcher.group( 2 ) == null ? "" : matcher.group( 2 );
        final String host = IDN.toASCII( matcher.group( 3 ) );
        return matcher.group( 1 ) + encodeNonAscii( userInfo ) + host + encodeNonAscii( matcher.group( 4 ) );
    }

    private static String encodeNonAscii( final String value ) {
        final StringBuilder result = new StringBuilder( value.length() );
        value.codePoints().forEach( codePoint -> {
            if ( codePoint < 128 ) {
                result.appendCodePoint( codePoint );
            } else {
                for ( final byte b : new String( Character.toChars( codePoint ) ).getBytes( StandardCharsets.UTF_8 ) ) {
                    result.append( String.format( "%%%02X", b & 0xFF ) );
                }
            }
        } );
        return result.toString();
    }

    @Override
    public void initialize( final BeanContext context ) {
    }
}

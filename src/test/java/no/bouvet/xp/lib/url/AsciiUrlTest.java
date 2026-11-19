package no.bouvet.xp.lib.url;

import java.net.URI;
import java.net.http.HttpRequest;

public final class AsciiUrlTest {
    public static void main( final String[] args ) {
        final AsciiUrl converter = new AsciiUrl();
        check( converter, "https://milj\u00f8l\u00f8ftet.no/", "https://xn--miljlftet-o8ab.no/" );
        check( converter, "https://example.com/a%20b?q=\u00e6#x", "https://example.com/a%20b?q=%C3%A6#x" );
        check( converter, "https://user@bl\u00e5b\u00e6r.no:8080/sti/\u00f8l",
               "https://user@xn--blbr-roah.no:8080/sti/%C3%B8l" );
        check( converter, "https://example.com/", "https://example.com/" );
        check( converter, "http://[::1]:8080/a", "http://[::1]:8080/a" );
        check( converter, "https://example.com/\uD83D\uDE00", "https://example.com/%F0%9F%98%80" );
    }

    private static void check( final AsciiUrl converter, final String input, final String expected ) {
        final String actual = converter.toAscii( input );
        if ( !expected.equals( actual ) ) {
            throw new AssertionError( input + " converted to " + actual + ", expected " + expected );
        }
        HttpRequest.newBuilder( URI.create( actual ) ).build();
    }
}

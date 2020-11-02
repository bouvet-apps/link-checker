package no.bouvet.xp.lib.isdev;

import com.enonic.xp.launcher.impl.SharedConstants;

public final class IsDev {
    public boolean isDevMode() {
        return "dev".equalsIgnoreCase( System.getProperty( SharedConstants.XP_RUN_MODE ) );
    }
}
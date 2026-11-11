package no.bouvet.xp.lib.outboundreferences;

import java.util.function.Supplier;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;

import com.enonic.xp.content.ContentId;
import com.enonic.xp.content.ContentIds;
import com.enonic.xp.content.ContentService;

public final class OutboundReferences implements ScriptBean {

    private Supplier<ContentService> contentService;

    public List<String> getOutboundReferences( String stringId ) {
        ContentId contentId = ContentId.from(stringId);
        ContentIds references = this.contentService.get().getOutboundDependencies( contentId );
        return references.stream().map( ContentId::toString ).collect( Collectors.toCollection( ArrayList::new ) );
    }

    @Override
    public void initialize( final BeanContext context ) {
        this.contentService = context.getService( ContentService.class );
    }
}
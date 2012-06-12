package org.ringojs.test;

import junit.framework.TestCase;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextAction;
import org.ringojs.wrappers.EventAdapter;
import org.mozilla.javascript.ContextFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EventAdapterTest extends TestCase {


    public void testClassGen() {
        final List<Class<?>> classes = new ArrayList<Class<?>>();
        classes.add(java.lang.Runnable.class);
        classes.add(java.lang.Appendable.class);
        ContextFactory cf = ContextFactory.getGlobal();
        cf.call(new ContextAction() {
            public Object run(Context cx) {
                Class<?> c1 = EventAdapter.getAdapterClass(classes.toArray(), null);
                Class<?> c2 = EventAdapter.getAdapterClass(classes.toArray(), null);
                assertTrue(c1.getSuperclass() == Object.class);
                assertTrue(Runnable.class.isAssignableFrom(c1));
                assertTrue(Appendable.class.isAssignableFrom(c1));
                assertEquals(c1, c2);
                return null;
            }
        });
        cf.call(new ContextAction() {
            public Object run(Context cx) {
                Map<String,String> bindings = new HashMap<String,String>();
                bindings.put("append", "add");
                bindings.put("run", "run");
                Class<?> c1 = EventAdapter.getAdapterClass(classes.toArray(),
                        new HashMap<String,String>(bindings));
                Class<?> c2 = EventAdapter.getAdapterClass(classes.toArray(),
                        new HashMap<String,String>(bindings));
                assertTrue(c1.getSuperclass() == Object.class);
                assertTrue(Runnable.class.isAssignableFrom(c1));
                assertTrue(Appendable.class.isAssignableFrom(c1));
                assertEquals(c1, c2);
                return null;
            }
        });
    }
}

// JavaKwProbe.java: the ENGINE half of java_kw_giver.py. Run as a single-file source program under the SAME JDK it asks about:
//
//   java --add-exports jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED \
//        JavaKwProbe.java [--inventory] [--broken|--trivial]  < words.txt  > probe.json
//
// stdin: one candidate word per line. stdout: one JSON object. No network, no model, no corpus: javac is the authority.
//
// PROBE. For every word W, the word is placed as the NAME of a being in seven positions (class, interface, enum, method, field, local variable,
// parameter), each in an otherwise-valid snippet, and javac (javax.tools.JavaCompiler, -proc:none -Xlint:none, JavacTask.analyze(): parse, enter,
// attribute, no code generation) ACCEPTS the position iff it raises no ERROR diagnostic. Because the snippets are otherwise valid, any error is the
// word's. `probe[W]` is the array of seven booleans (true = accepted).
//
// CONTROLS BUILT TO FAIL (the caller runs them): --broken swaps every template for a snippet that cannot compile whatever W is (a probe that still
// said "accepted" would be blind); --trivial swaps every template for a snippet that does not place W at all (a probe that still said "refused" would
// be refusing on something other than the word).
//
// --inventory adds the engine's own VOCABULARY and scopes, read by reflection, never typed here:
//   tokenKinds   every com.sun.tools.javac.parser.Tokens.TokenKind with its fixed `name` (the keywords, the literals true/false/null, `_`, the operators)
//   namesTable   the string value of every public Name field of com.sun.tools.javac.util.Names (the compiler's own name table; it holds the
//                contextual words var, record, sealed, permits, yield, module, ... among ordinary names; the probe, not this list, arbitrates)
//   builtins     the public top-level types of java.lang (JLS 7.3: imported by every compilation unit), from the JDK's jrt module image
//   packages     the unqualified exports of every system module (the packages `import` names)
// and probes those vocabulary words too. The word space is the union of stdin and (with --inventory) the engine vocabulary.
import com.sun.source.util.JavacTask;
import javax.tools.*;
import java.lang.module.ModuleDescriptor;
import java.lang.module.ModuleFinder;
import java.lang.module.ModuleReference;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.net.URI;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public class JavaKwProbe {
    static final String[][] POSITIONS = {
        {"class", "class %W% {}"},
        {"interface", "interface %W% {}"},
        {"enum", "enum %W% { X }"},
        // A1 (amendment after run 1): the method signature (boolean, boolean) is one no member of java.lang.Object has, so no override or clash
        // can refuse the word; a refusal here is the word's own.
        {"method", "class A { void %W%(boolean p, boolean q) {} }"},
        {"field", "class A { int %W%; }"},
        {"local", "class A { void f() { int %W% = 0; } }"},
        {"param", "class A { void f(int %W%) {} }"},
    };
    static final String[][] BROKEN = {
        {"class", "class A { void ( ) ) } %W%"},
        {"interface", "class A { void ( ) ) } %W%"},
        {"enum", "class A { void ( ) ) } %W%"},
        {"method", "class A { void ( ) ) } %W%"},
        {"field", "class A { void ( ) ) } %W%"},
        {"local", "class A { void ( ) ) } %W%"},
        {"param", "class A { void ( ) ) } %W%"},
    };
    static final String[][] TRIVIAL = {
        {"class", "class A { }"}, {"interface", "class A { }"}, {"enum", "class A { }"}, {"method", "class A { }"},
        {"field", "class A { }"}, {"local", "class A { }"}, {"param", "class A { }"},
    };
    static final Pattern WORD = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");

    /** parseOnly: JavacTask.parse() (syntax diagnostics only); otherwise analyze() (parse, enter, attribute). */
    static boolean accepts(JavaCompiler jc, String src, boolean parseOnly) {
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///P.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        try {
            JavacTask task = (JavacTask) jc.getTask(null, null, dc, List.of("-proc:none", "-Xlint:none"), null, List.of(fo));
            if (parseOnly) task.parse(); else task.analyze();
        } catch (Exception e) {
            return false;
        }
        for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) {
            if (d.getKind() == Diagnostic.Kind.ERROR) return false;
        }
        return true;
    }

    static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }

    static String arr(Collection<String> xs) {
        StringBuilder b = new StringBuilder("[");
        boolean first = true;
        for (String x : xs) { if (!first) b.append(','); first = false; b.append(q(x)); }
        return b.append(']').toString();
    }

    public static void main(String[] args) throws Exception {
        String mode = "standard";
        boolean inventory = false;
        for (String a : args) {
            if (a.equals("--broken")) mode = "broken";
            else if (a.equals("--trivial")) mode = "trivial";
            else if (a.equals("--inventory")) inventory = true;
        }
        String[][] templates = mode.equals("broken") ? BROKEN : mode.equals("trivial") ? TRIVIAL : POSITIONS;
        LinkedHashSet<String> words = new LinkedHashSet<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) { line = line.trim(); if (!line.isEmpty()) words.add(line); }
        }

        StringBuilder inv = new StringBuilder();
        if (inventory) {
            // token kinds
            List<String> tk = new ArrayList<>();
            Class<?> tkc = Class.forName("com.sun.tools.javac.parser.Tokens$TokenKind");
            Field nameF = tkc.getField("name");
            Field tagF = tkc.getField("tag");
            StringBuilder tks = new StringBuilder("[");
            boolean first = true;
            for (Object c : tkc.getEnumConstants()) {
                Object n = nameF.get(c);
                if (n == null) continue;
                String name = n.toString();
                if (!first) tks.append(','); first = false;
                tks.append("{\"kind\":").append(q(c.toString().isEmpty() ? "" : ((Enum<?>) c).name())).append(",\"name\":").append(q(name)).append(",\"tag\":").append(q(String.valueOf(tagF.get(c)))).append('}');
                if (WORD.matcher(name).matches()) words.add(name);
            }
            tks.append(']');
            inv.append(",\"tokenKinds\":").append(tks);

            // names table
            List<String> names = new ArrayList<>();
            String namesErr = null;
            try {
                Class<?> namesC = Class.forName("com.sun.tools.javac.util.Names");
                Class<?> ctxC = Class.forName("com.sun.tools.javac.util.Context");
                Class<?> nameC = Class.forName("com.sun.tools.javac.util.Name");
                Object ctx = ctxC.getDeclaredConstructor().newInstance();
                Object ns = namesC.getMethod("instance", ctxC).invoke(null, ctx);
                for (Field f : namesC.getFields()) {
                    if (Modifier.isStatic(f.getModifiers())) continue;
                    Object v = f.get(ns);
                    if (v != null && nameC.isInstance(v)) {
                        String s = v.toString();
                        if (WORD.matcher(s).matches()) { names.add(s); words.add(s); }
                    }
                }
            } catch (Throwable t) {
                namesErr = t.toString();
            }
            Collections.sort(names);
            inv.append(",\"namesTable\":").append(arr(names));
            inv.append(",\"namesTableError\":").append(namesErr == null ? "null" : q(namesErr));

            // java.lang public top-level types
            List<String> builtins = new ArrayList<>();
            FileSystem jrt = FileSystems.getFileSystem(URI.create("jrt:/"));
            try (Stream<Path> s = Files.list(jrt.getPath("/modules/java.base/java/lang"))) {
                for (Path p : (Iterable<Path>) s::iterator) {
                    String fn = p.getFileName().toString();
                    if (!fn.endsWith(".class")) continue;
                    String n = fn.substring(0, fn.length() - 6);
                    if (n.contains("$") || n.equals("package-info") || n.equals("module-info")) continue;
                    try {
                        Class<?> c = Class.forName("java.lang." + n, false, null);
                        if (Modifier.isPublic(c.getModifiers())) builtins.add(n);
                    } catch (Throwable t) { /* not loadable here: not counted */ }
                }
            }
            Collections.sort(builtins);
            inv.append(",\"builtins\":").append(arr(builtins));

            // exported packages of every system module
            TreeSet<String> pkgs = new TreeSet<>();
            TreeSet<String> mods = new TreeSet<>();
            for (ModuleReference mr : ModuleFinder.ofSystem().findAll()) {
                ModuleDescriptor d = mr.descriptor();
                mods.add(d.name());
                for (ModuleDescriptor.Exports e : d.exports()) if (!e.isQualified()) pkgs.add(e.source());
            }
            inv.append(",\"packages\":").append(arr(pkgs));
            inv.append(",\"modules\":").append(arr(mods));
        }

        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        StringBuilder probe = new StringBuilder("{");
        StringBuilder parseProbe = new StringBuilder("{");
        boolean firstW = true;
        for (String w : words) {
            if (!firstW) { probe.append(','); parseProbe.append(','); } firstW = false;
            probe.append(q(w)).append(":[");
            parseProbe.append(q(w)).append(":[");
            for (int i = 0; i < templates.length; i++) {
                if (i > 0) { probe.append(','); parseProbe.append(','); }
                String src = templates[i][1].replace("%W%", w);
                probe.append(accepts(jc, src, false) ? "true" : "false");
                parseProbe.append(accepts(jc, src, true) ? "true" : "false");
            }
            probe.append(']');
            parseProbe.append(']');
        }
        probe.append('}');
        parseProbe.append('}');

        StringBuilder tpl = new StringBuilder("[");
        for (int i = 0; i < templates.length; i++) { if (i > 0) tpl.append(','); tpl.append('[').append(q(templates[i][0])).append(',').append(q(templates[i][1])).append(']'); }
        tpl.append(']');
        StringBuilder pos = new StringBuilder("[");
        for (int i = 0; i < templates.length; i++) { if (i > 0) pos.append(','); pos.append(q(templates[i][0])); }
        pos.append(']');

        StringBuilder out = new StringBuilder("{");
        out.append("\"java\":{\"version\":").append(q(System.getProperty("java.version")))
           .append(",\"vendor\":").append(q(System.getProperty("java.vendor")))
           .append(",\"vm\":").append(q(System.getProperty("java.vm.name") + " " + System.getProperty("java.vm.version")))
           .append(",\"sourceVersionLatest\":").append(q(String.valueOf(javax.lang.model.SourceVersion.latest()))).append('}');
        out.append(",\"mode\":").append(q(mode));
        out.append(",\"positions\":").append(pos);
        out.append(",\"templates\":").append(tpl);
        out.append(",\"probe\":").append(probe);
        out.append(",\"parseProbe\":").append(parseProbe);
        out.append(inv);
        out.append('}');
        System.out.println(out);
    }
}

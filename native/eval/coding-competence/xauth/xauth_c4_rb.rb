# xauth_c4_rb.rb: Ruby's OWN parser (Ripper, the interpreter's front end; the local ruby is 2.6.10) as an independent authority
# for the C4 edges of a ruby file. Used only by eval/coding-competence/c4-xauth.mjs.
# stdin: JSON list of file paths. stdout: JSON {path: {calls:[[caller,callee]], imports:[...], extends:[[child,base]]} | {error}}.
#
# Edge definitions (declared in c4-xauth.mjs, the SAME syntactic rules c4-edges.mjs states for the gold; the PARSER is the
# independent part):
#   calls    a syntactic call: Ripper :fcall (`f(x)`), :command (`f x`), :call (`r.f`, `R::f`, with or without arguments) and
#            :command_call (`r.f x`); callee = the method-name token. NOT calls: :vcall (a bare identifier, which Ruby itself can
#            only tell from a local variable by scope), `r.()`, :super, :zsuper, :yield, operators and index access.
#            caller = innermost enclosing :def / :defs / :class / :module by the node tree (the whole node, header included,
#            belongs to it); `class << self` is not a named scope; "<top>" outside all of them.
#   imports  `require`, `require_relative`, `load` as :fcall/:command whose first argument is a static string literal.
#   extends  :class with a constant superclass (`A < B`, `A < M::B` -> B); `include` / `extend` / `prepend` of constants called
#            directly in a class or module body (not inside a def) charge the enclosing class/module as child.
require "json"
require "ripper"

CALL_TOKENS = %i[@ident @const @kw @op @backtick].freeze
MIXINS = %w[include extend prepend].freeze
IMPORTERS = %w[require require_relative load].freeze

def tok_name(t)
  t.is_a?(Array) && CALL_TOKENS.include?(t[0]) && t[1].is_a?(String) ? t[1] : nil
end

def const_final(n)
  return nil unless n.is_a?(Array)
  case n[0]
  when :@const then n[1]
  when :var_ref, :top_const_ref then const_final(n[1])
  when :const_path_ref then const_final(n[2])
  when :const_ref then const_final(n[1])
  end
end

def plain_string(n)
  return nil unless n.is_a?(Array) && n[0] == :string_literal
  body = n[1]
  return nil unless body.is_a?(Array) && body[0] == :string_content
  parts = body[1..-1]
  return "" if parts.empty?
  return nil unless parts.all? { |p| p.is_a?(Array) && p[0] == :@tstring_content }
  parts.map { |p| p[1] }.join
end

# first argument node of an args structure (args_add_block / arg_paren / args_new...)
def first_arg(a)
  return nil unless a.is_a?(Array)
  case a[0]
  when :arg_paren then first_arg(a[1])
  when :args_add_block then first_arg(a[1])
  when :args_add_star then first_arg(a[1])
  else
    if a.is_a?(Array) && a[0].is_a?(Array) then a[0] else nil end
  end
end

def arg_list(a)
  return [] unless a.is_a?(Array)
  case a[0]
  when :arg_paren then arg_list(a[1])
  when :args_add_block then arg_list(a[1])
  else a[0].is_a?(Array) || a.empty? ? a : []
  end
end

class Walk
  attr_reader :calls, :imports, :extends
  def initialize
    @calls = []; @imports = []; @extends = []
    @callers = ["<top>"]
    @scopes = [] # [{kind:, name:, indef:}]
    @indef = 0
  end

  def caller; @callers.last; end

  def named_call(name, args)
    @calls << [caller, name]
    if IMPORTERS.include?(name)
      s = plain_string(first_arg(args))
      @imports << s if s && !s.empty?
    elsif MIXINS.include?(name) && @indef.zero? && !@scopes.empty?
      arg_list(args).each do |a|
        b = const_final(a)
        @extends << [@scopes.last, b] if b
      end
    end
  end

  def walk(n)
    return unless n.is_a?(Array)
    case n[0]
    when :class, :module
      name = const_final(n[1])
      if n[0] == :class && n[2]
        b = const_final(n[2])
        @extends << [name, b] if name && b && (n[2][0] == :var_ref || n[2][0] == :const_path_ref || n[2][0] == :top_const_ref)
      end
      @callers.push(name || caller)
      @scopes.push(name) if name
      saved = @indef; @indef = 0
      n[1..-1].each { |c| walk(c) }
      @indef = saved
      @scopes.pop if name
      @callers.pop
      return
    when :def, :defs
      nm = n[0] == :def ? tok_name(n[1]) : tok_name(n[3])
      @callers.push(nm || caller)
      @indef += 1
      n[1..-1].each { |c| walk(c) }
      @indef -= 1
      @callers.pop
      return
    when :fcall
      nm = tok_name(n[1]); @pending_fcall = nm
    when :method_add_arg
      f = n[1]
      if f.is_a?(Array) && f[0] == :fcall
        nm = tok_name(f[1]); named_call(nm, n[2]) if nm
        walk(n[2]); return
      end
    when :command
      nm = tok_name(n[1]); named_call(nm, n[2]) if nm
      n[2..-1].each { |c| walk(c) }
      return
    when :call
      nm = n.length >= 4 ? tok_name(n[3]) : nil
      @calls << [caller, nm] if nm
    when :command_call
      nm = tok_name(n[3]); @calls << [caller, nm] if nm
    end
    n.each { |c| walk(c) if c.is_a?(Array) }
  end
end

def run(path)
  src = File.read(path, encoding: "UTF-8")
  raise "invalid byte sequence" unless src.valid_encoding?
  sexp = Ripper.sexp(src)
  raise "Ripper.sexp returned nil (syntax this ruby cannot parse)" if sexp.nil?
  w = Walk.new
  w.walk(sexp)
  { "calls" => w.calls, "imports" => w.imports, "extends" => w.extends }
end

paths = JSON.parse($stdin.read)
res = {}
paths.each do |p|
  begin
    res[p] = run(p)
  rescue StandardError, SystemStackError => e
    res[p] = { "error" => "#{e.class}: #{e.message[0, 80]}" }
  end
end
$stdout.write(JSON.generate(res))

#!/usr/bin/env ruby
# lex_rb.rb -- ant-code (EXPLORATORY third language): Ruby source -> units of lexical tokens with parser gold (Ripper.lex + Ripper.sexp, stdlib of the system ruby 2.6).
# Same JSON shape as lex_py.py. U = identifier/constant/ivar/gvar/cvar bound in this file (def/class/module names, parameters, assignment targets, for/rescue targets),
# E = any other identifier/constant (method calls on externals, core classes, free names), K = keyword, L = number/string/symbol-content, P = the rest, A = bound here AND a core constant/method name
# is not decided here (only form-level ambiguity: one lowercase form in two classes).
require 'ripper'; require 'json'
src = File.read(ARGV[0], encoding: 'utf-8').encode('utf-8', invalid: :replace, undef: :replace)
sexp = Ripper.sexp(src) or abort("no parse")
bpos = {}; bnames = {}
IDENT = [:@ident, :@const, :@ivar, :@gvar, :@cvar, :@label]
def idnode?(n) n.is_a?(Array) && IDENT.include?(n[0]) && n[1].is_a?(String) && n[2].is_a?(Array) end
add = lambda { |n| next unless idnode?(n); nm = n[1].sub(/:\z/, ''); bpos[[n[2][0], n[2][1]]] = true; bnames[nm.downcase] = true }
params_walk = lambda { |n, f|
  next unless n.is_a?(Array)
  if idnode?(n) then f.call(n); next end
  n.each { |c| params_walk.call(c, f) }
}
walk = lambda { |n|
  next unless n.is_a?(Array)
  case n[0]
  when :var_field then add.call(n[1])
  when :def then add.call(n[1]); params_walk.call(n[2], add)
  when :defs then add.call(n[3]); params_walk.call(n[4], add)
  when :class then (c = n[1]; add.call(c[1]) if c.is_a?(Array) && c[0] == :const_ref); 
  when :module then (c = n[1]; add.call(c[1]) if c.is_a?(Array) && c[0] == :const_ref)
  when :block_var, :lambda then params_walk.call(n[1], add)
  when :mlhs_paren, :mlhs then params_walk.call(n, add) if false
  end
  n.each { |c| walk.call(c) }
}
walk.call(sexp)
kinds = { on_kw: :K, on_int: :L, on_float: :L, on_rational: :L, on_imaginary: :L, on_char: :L }
units = []; cur = [[], [], [], []]
flush = lambda { units << cur unless cur[0].empty?; cur = [[], [], [], []] }
fnv = lambda { |s| h = 2166136261; s.each_byte { |b| h = ((h ^ b) * 16777619) & 0xFFFFFFFF }; format('%07x', h & 0xFFFFFFF) }
enc = lambda { |t| t.downcase.gsub(/[^a-z0-9]/, 'z') }
prev = nil
Ripper.lex(src).each do |(pos, ev, text, _st)|
  case ev
  when :on_sp, :on_comment, :on_embdoc_beg, :on_embdoc, :on_embdoc_end, :on_ignored_nl, :on_heredoc_beg, :on_heredoc_end, :on_ignored_sp, :on___end__ then next
  when :on_nl, :on_semicolon then flush.call; prev = nil; next
  when :on_ident, :on_const, :on_ivar, :on_gvar, :on_cvar, :on_label
    nm = text.sub(/:\z/, '').downcase
    cls = bnames[nm] ? 'U' : 'E'
    cur[0] << enc.call(nm); cur[1] << cls; cur[2] << ((cls == 'U' && bpos[[pos[0], pos[1]]]) ? 1 : 0); cur[3] << text
  when :on_kw then cur[0] << text.downcase; cur[1] << 'K'; cur[2] << 0; cur[3] << text
  when :on_int, :on_float, :on_rational, :on_imaginary, :on_char then cur[0] << 'n' + text.downcase.gsub(/[^a-z0-9]/, ''); cur[1] << 'L'; cur[2] << 0; cur[3] << text
  when :on_tstring_content then cur[0] << 's' + fnv.call(text); cur[1] << 'L'; cur[2] << 0; cur[3] << text[0, 20]
  else cur[0] << text; cur[1] << 'P'; cur[2] << 0; cur[3] << text
  end
  prev = ev
end
flush.call
byform = Hash.new { |h, k| h[k] = {} }
units.each { |u| u[0].each_with_index { |f, i| byform[f][u[1][i]] = true unless u[1][i] == 'P' } }
bad = byform.select { |_, s| (s.keys - ['A']).size > 1 }.keys
puts JSON.generate({ file: ARGV[0], lang: 'rb', units: units.map { |u| u[0] }, cls: units.map { |u| u[1].each_with_index.map { |c, i| (c != 'P' && bad.include?(u[0][i])) ? 'A' : c } },
  decl: units.map { |u| u[2] }, raw: units.map { |u| u[3] }, nBound: bnames.size, nImported: 0 })

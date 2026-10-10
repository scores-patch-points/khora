# xauth_rb.rb: Ruby's OWN lexer (Ripper.lex, the interpreter's scanner) as an independent authority for ruby token boundaries.
# stdin: JSON list of file paths. stdout: JSON {path: {tokens:[[start,end,event],...]} | {error}} with UTF-16 offsets.
# Dropped: whitespace and newline events (on_sp, on_nl, on_ignored_nl, on_ignored_sp). The engine splits a string into begin / content /
# end pieces (and a regexp, %w list, quoted symbol likewise): the pieces of ONE outermost string-like construct are merged into one lexeme.
# Heredoc bodies arrive as separate content tokens and stay separate (the engine's own convention).
require "json"
require "ripper"

SKIP = %i[on_sp on_nl on_ignored_nl on_ignored_sp].freeze
BEGINS = %i[on_tstring_beg on_regexp_beg on_words_beg on_qwords_beg on_symbols_beg on_qsymbols_beg on_backtick on_symbeg].freeze
ENDS = %i[on_tstring_end on_regexp_end on_label_end].freeze

def run(path)
  src = File.read(path, encoding: "UTF-8")
  raise "invalid byte sequence" unless src.valid_encoding?
  out = []
  pos = 0 # UTF-16 units
  depth = 0
  ostart = 0
  Ripper.lex(src).each do |(_, ev, tok, _)|
    w = 0
    tok.each_char { |c| w += c.ord > 0xFFFF ? 2 : 1 }
    s = pos
    e = pos + w
    pos = e
    next if SKIP.include?(ev)
    # `:"foo"`: on_symbeg `:"`; `"foo": `: tstring_beg ... on_label_end
    if BEGINS.include?(ev) && !(ev == :on_symbeg && !tok.end_with?('"', "'"))
      ostart = s if depth.zero?
      depth += 1
      next
    end
    if depth > 0
      if ENDS.include?(ev)
        depth -= 1
        out << [ostart, e, "STRING"] if depth.zero?
      end
      next
    end
    out << [s, e, ev.to_s]
  end
  { "tokens" => out }
end

paths = JSON.parse($stdin.read)
res = {}
paths.each do |p|
  begin
    res[p] = run(p)
  rescue StandardError => e
    res[p] = { "error" => "#{e.class}: #{e.message[0, 120]}" }
  end
end
puts JSON.generate(res)

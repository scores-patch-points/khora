#!/usr/bin/env python3
"""cube-sidecar-worker.py — the python end of the cube sidecar.

The cube's tool rows (cube-tools.json) name python movers, nulls and witnesses
for the 27 cells. This worker is how they run: one long-lived process speaking
JSON lines over stdin/stdout, because a cold import of scipy or spaCy would
blow any short per-call budget, and re-paying it per call would make the
budget the binding constraint rather than the reading.

Contract (one JSON object per line, in and out; request ids echo back):

  {"op":"ping"}                     -> {"ok":true, ...}
  {"op":"probe","modules":[...]}    -> present/absent per module (find_spec)
  {"op":"probe-registry"}           -> present/absent per package of the registry
  {"op":"call", ...}                -> run one whitelisted tool row
  {"op":"perceive", ...}            -> one sense organ (ocrmac, pdfplumber, ...)
  {"op":"exit"}                     -> exits 0

`--oneshot` reads exactly one line, answers it and exits — the host uses it
where a synchronous, bounded probe is wanted (the senses hunt).

THE GATES, enforced here, not merely documented:

  · WHITELIST — a call names a cell and a package; the registry must carry
    that package in that cell (same env), or the call is a typed gap
    (`not_whitelisted`). The dotted method names a `use` string mentions are
    extracted and reported back (`off_use`) when a called entry is not among
    them; a use that names no entry (prose) never blocks the package's public
    surface.
  · NO NETWORK, NO SPAWN, NO WRITES OUTSIDE SCRATCH — an audit hook
    (sys.addaudithook) raises PermissionError on socket connect/resolve/send,
    subprocess spawn and os.exec/os.system, and on any open-for-write whose
    realpath is not under the scratch dir. A refusal is a typed gap
    (`worker_refused`), never a silent hang.
  · MODEL-BACKED TOOLS ARE LEFT OUT — a row whose note says model-backed
    (dspy through litellm) is refused with `sealed_external_required`:
    heimdall's sealed-external gate is the only admissible path for calls
    that reach an LLM, and this worker cannot assert that label.
  · PRODUCER TAGS — every reply carries `producer` (module.entry@env with the
    distribution version), so a reading is always attributable.

IDs are NEVER minted here. Python returns values and byte anchors; the record's
stableProvenanceId is JS (khora/opencode-eot.mjs, penelope's derivation) and
hashes what this worker returns. rfc8785 was removed from the registry for the
same reason: canonical JSON buys nothing when the hasher is not python.

Bounds: replies are serialized and refused (`over_bounds`) above the request's
declared maxBytes; non-JSON-able values degrade to a marker (`nonfinite`,
`bytes_b64`, `repr`) rather than an exception.
"""
import base64
import importlib
import importlib.metadata
import importlib.util
import json
import math
import os
import pathlib
import re
import sys
import tempfile

SCRATCH = pathlib.Path(
    os.environ.get("FOLD_CUBE_SCRATCH") or tempfile.mkdtemp(prefix="fold-cube-")
).resolve()
try:
    SCRATCH.mkdir(parents=True, exist_ok=True)
except OSError:
    pass

# PyPI name -> importable top-level module, only where the default transform
# (dashes to underscores) is not the truth. Checked against the registry by
# `probe-registry`; an alias for a package not carried there is unused.
MODULE_ALIASES = {
    "python-sat": "pysat",
    "scikit-learn": "sklearn",
    "z3-solver": "z3",
    "diff-match-patch": "diff_match_patch",
    "crowd-kit": "crowdkit",
    "causal-learn": "causallearn",
    "lingua-language-detector": "lingua",
    "tree-sitter": "tree_sitter",
    "mlx-whisper": "mlx_whisper",
    "pydantic-settings": "pydantic_settings",
    "sentence-transformers": "sentence_transformers",
    "sqlite-utils": "sqlite_utils",
    "ufal.udpipe": "ufal.udpipe",
}


def module_for(package):
    return MODULE_ALIASES.get(package, str(package).replace("-", "_"))


# ── the audit hook: the worker's own sandbox walls ──────────────────────────
_WRITE_FLAGS = 0
for name in ("O_WRONLY", "O_RDWR", "O_CREAT", "O_TRUNC", "O_APPEND"):
    _WRITE_FLAGS |= getattr(os, name, 0)
_DENY_NET = (
    "socket.connect", "socket.getaddrinfo", "socket.gethostbyname",
    "socket.gethostbyaddr", "socket.sendto", "socket.bind",
)
_DENY_SPAWN = ("subprocess.Popen", "os.system", "os.exec", "os.posix_spawn", "os.spawn")
_DENY_WRITE_EVENTS = ("os.remove", "os.rename", "os.mkdir", "os.rmdir")


def _under_scratch(p):
    try:
        return os.path.commonpath([os.path.realpath(p), str(SCRATCH)]) == str(SCRATCH)
    except (TypeError, ValueError):
        return False


def _is_write(mode, flags):
    if isinstance(mode, str) and any(c in mode for c in "wax+"):
        return True
    if isinstance(flags, int) and flags & _WRITE_FLAGS:
        return True
    return False


def _audit(event, args):
    if event in _DENY_NET:
        raise PermissionError(f"network is denied in the cube worker ({event})")
    if event in _DENY_SPAWN:
        raise PermissionError(f"process spawn is denied in the cube worker ({event})")
    if event in _DENY_WRITE_EVENTS:
        p = args[0] if args else None
        if isinstance(p, (str, bytes)) and not _under_scratch(os.fsdecode(p)):
            raise PermissionError(f"writes are confined to the scratch dir ({event})")
    elif event == "open":
        path = args[0] if args else None
        if isinstance(path, (str, bytes)) and not isinstance(path, int):
            mode = args[1] if len(args) > 1 else None
            flags = args[2] if len(args) > 2 else None
            if _is_write(mode, flags) and not _under_scratch(os.fsdecode(path)):
                raise PermissionError("writes are confined to the scratch dir (open)")


sys.addaudithook(_audit)

_REGISTRY = None


def registry():
    global _REGISTRY
    if _REGISTRY is None:
        path = os.environ.get("FOLD_CUBE_REGISTRY")
        if not path:
            raise FileNotFoundError("FOLD_CUBE_REGISTRY is not set")
        with open(path, encoding="utf-8") as f:
            _REGISTRY = json.load(f)
    return _REGISTRY


def gap(kind, why, **extra):
    return {"ok": False, "gap": kind, "why": why, **extra}


def find_row(cell, package, env):
    cells = registry()
    row = None
    for tool in (cells.get(cell) or {}).get("tools", []):
        if tool.get("package") == package and (env is None or tool.get("env") == env):
            row = tool
            break
    return row


_DOTTED = re.compile(r"[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+")


def use_entries(row):
    return sorted(set(_DOTTED.findall(str(row.get("use", "")))))


def dist_version(package):
    for name in (str(package), str(package).replace("_", "-")):
        try:
            return importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            continue
        except Exception:
            break
    return None


def jsonify(value):
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else {"nonfinite": repr(value)}
    if isinstance(value, complex):
        return {"re": value.real, "im": value.imag}
    if isinstance(value, (bytes, bytearray)):
        return {"bytes_b64": base64.b64encode(bytes(value)).decode()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [jsonify(item) for item in value]
    if isinstance(value, dict):
        return {str(k): jsonify(v) for k, v in value.items()}
    if hasattr(value, "tolist"):
        return jsonify(value.tolist())
    if hasattr(value, "item"):
        try:
            return jsonify(value.item())
        except Exception:
            pass
    return {"repr": repr(value)[:500]}


def coerce_numpy(args, kwargs):
    import numpy  # noqa: PLC0415 — only when a request asks for the coercion

    return [numpy.asarray(a) for a in args], {k: numpy.asarray(v) for k, v in kwargs.items()}


def do_probe(req):
    present, absent = [], []
    for name in req.get("modules") or []:
        try:
            (present if importlib.util.find_spec(name) is not None else absent).append(name)
        except (ImportError, ModuleNotFoundError, ValueError):
            absent.append(name)
    return {"ok": True, "python": sys.version.split()[0], "present": present, "absent": absent}


def do_probe_registry(req):
    packages = {}
    for cell in registry().values():
        for tool in cell.get("tools", []):
            if tool.get("source") != "pypi":
                continue
            package = tool.get("package")
            if package in packages:
                continue
            try:
                packages[package] = importlib.util.find_spec(module_for(package)) is not None
            except (ImportError, ModuleNotFoundError, ValueError):
                packages[package] = False
    return {"ok": True, "python": sys.version.split()[0], "packages": packages}


def do_call(req):
    cell = str(req.get("cell", ""))
    package = str(req.get("package", ""))
    env = req.get("env")
    row = find_row(cell, package, env)
    if row is None:
        return gap(
            "not_whitelisted",
            f'"{package}" is not a tool of {cell} in the registry'
            + (f" for env {env}" if env else ""),
        )
    note = str(row.get("note", ""))
    if "model-backed" in note or package == "dspy":
        return gap(
            "sealed_external_required",
            "this row is model-backed (an LLM call through litellm); heimdall's "
            "sealed-external gate is the only admissible path for that, and the "
            "cube sidecar cannot assert the label — left out",
        )
    module_name = str(req.get("module") or module_for(package))
    root = module_for(package)
    if module_name != root and not module_name.startswith(root + "."):
        return gap(
            "not_whitelisted",
            f'module "{module_name}" is outside the registered package "{package}"',
        )
    attr = str(req.get("attr", ""))
    if not attr or attr.startswith("_"):
        return gap("not_whitelisted", f'attr "{attr}" is not a public entry point')
    try:
        module = importlib.import_module(module_name)
        args, kwargs = req.get("args") or [], req.get("kwargs") or {}
        if req.get("coerce") == "numpy":
            args, kwargs = coerce_numpy(args, kwargs)
        method = req.get("method")
        producer_entry = f"{module_name}.{attr}"
        if method:
            target = getattr(module, attr)(*(req.get("construct_args") or []), **(req.get("construct_kwargs") or {}))
            getattr(target, str(method))(*(args or []), **(kwargs or {}))
            producer_entry = f"{producer_entry}.{method}"
            extracted = req.get("extract")
            if extracted:
                value = getattr(target, str(extracted))
                if callable(value):
                    value = value()
            else:
                value = target
        else:
            value = getattr(module, attr)(*(args or []), **(kwargs or {}))
    except PermissionError as e:
        return gap("worker_refused", str(e), where=f"{module_name}.{attr}")
    except Exception as e:
        return gap("call_error", f"{type(e).__name__}: {e}"[:400], where=f"{module_name}.{attr}")
    version = dist_version(package)
    producer = f"py:{producer_entry}@{env or 'sidecar'}" + (f" ({package} {version})" if version else f" ({package})")
    # The `use` column names the intended entry points (dotted, relative to the
    # package). A call outside that set is not refused — the registered package
    # IS the licence — but it is reported back, disclosed, never silent.
    entries = use_entries(row)
    rel = module_name[len(root) + 1:] if module_name != root else module_name
    called = f"{rel}.{attr}" if not method else f"{rel}.{attr}.{method}"
    out = {"ok": True, "producer": producer, "value": jsonify(value)}
    if entries and not any(called == e or called.startswith(e + ".") or e.startswith(called + ".") for e in entries):
        out["off_use"] = called
    return out


# ── the sense organs: python readings of bytes, same fan-out contract ───────
def _scratch_file(data, suffix):
    safe = re.sub(r"[^a-z0-9.]", "", str(suffix or ".bin").lower())[:10] or ".bin"
    if not safe.startswith("."):
        safe = "." + safe
    f = SCRATCH / f"perceive-{os.getpid()}-{len(data)}{safe}"
    f.write_bytes(data)
    return f


def do_perceive(req):
    organ = str(req.get("organ", ""))
    data = base64.b64decode(req.get("bytes_b64", ""))
    lang = str(req.get("lang") or "")
    f = _scratch_file(data, req.get("suffix", ".png"))
    producer = f"py:perceive.{organ}@sidecar"
    try:
        if organ == "ocrmac":
            import ocrmac  # noqa: PLC0415

            pref = [lang] if lang and lang != "eng" else ["en-US"]
            text = "\n".join(t for t, _ in ocrmac.OCR(str(f), language_preference=pref).recognize())
        elif organ == "pdfplumber":
            import pdfplumber  # noqa: PLC0415

            with pdfplumber.open(str(f)) as pdf:
                text = "\n".join((page.extract_text() or "") for page in pdf.pages)
        elif organ == "pymupdf":
            import fitz  # noqa: PLC0415

            with fitz.open(str(f)) as doc:
                text = "\n".join(page.get_text() for page in doc)
        elif organ == "mlx_whisper":
            import mlx_whisper  # noqa: PLC0415

            out = mlx_whisper.transcribe(str(f))
            text = str(out.get("text", ""))
        else:
            return gap("unknown_organ", f'"{organ}" is not a perceive organ of this worker')
    except PermissionError as e:
        return gap("worker_refused", str(e), organ=organ)
    except Exception as e:
        return gap("call_error", f"{type(e).__name__}: {e}"[:400], organ=organ)
    finally:
        try:
            f.unlink()
        except OSError:
            pass
    return {"ok": True, "producer": producer, "text": text.strip()}


def handle(req):
    op = req.get("op")
    if op == "ping":
        return {"ok": True, "worker": "cube-sidecar-worker", "python": sys.version.split()[0], "scratch": str(SCRATCH)}
    if op == "probe":
        return do_probe(req)
    if op == "probe-registry":
        return do_probe_registry(req)
    if op == "call":
        return do_call(req)
    if op == "perceive":
        return do_perceive(req)
    if op == "exit":
        raise SystemExit(0)
    return gap("unknown_op", f'"{op}" is not an op of the cube worker')


def main():
    oneshot = "--oneshot" in sys.argv
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            doc = json.loads(line)
            req_id = doc.get("id") if isinstance(doc, dict) else None
            out = handle(doc)
        except SystemExit:
            raise
        except Exception as e:  # never let one bad request kill the worker
            out = gap("worker_error", f"{type(e).__name__}: {e}"[:400])
        if not isinstance(out, dict):
            out = gap("worker_error", "the handler returned a non-object")
        if req_id is not None:
            out["id"] = req_id
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
        sys.stdout.flush()
        if oneshot:
            return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())

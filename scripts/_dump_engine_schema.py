"""Dump the engine's request surface as JSON — the DENOMINATOR nobody has ever been given.

⛔ WHY THIS READS THE MODEL AND NOT THE SOURCE. A regex over schemas.py would enumerate what the
   file LOOKS like it declares. `model_fields` is what pydantic actually built, which is what the
   running engine actually accepts. Those differ the moment anything is inherited, aliased or
   conditionally declared, and a census that can be wrong about its own population is worthless.

⚠️ IT IMPORTS A SIBLING REPO BY PATH. That is stated rather than hidden: the census REFUSES loudly
   if the engine is not on disk, because a census that silently measures nothing is the empty-green
   species this programme has spent weeks removing.
"""
import json
import os
import sys

ENGINE = os.environ.get("DATUM_ENGINE_DIR") or os.path.join(
    os.path.expanduser("~"), "datum-fi"
)
if not os.path.isdir(ENGINE):
    print(json.dumps({"error": "engine repo not found at " + ENGINE}))
    sys.exit(2)

sys.path.insert(0, ENGINE)
try:
    import schemas  # noqa: E402
except Exception as exc:  # pragma: no cover
    print(json.dumps({"error": "could not import schemas: " + repr(exc)}))
    sys.exit(2)


def dump(model_name):
    model = getattr(schemas, model_name, None)
    if model is None or not hasattr(model, "model_fields"):
        return None
    out = {}
    for name, f in model.model_fields.items():
        required = f.is_required()
        default = None if required else f.default
        # PydanticUndefined and other sentinels are not JSON; render them as text.
        try:
            json.dumps(default)
        except (TypeError, ValueError):
            default = repr(default)
        out[name] = {
            "required": required,
            "default": default,
            "description": (f.description or "").strip(),
        }
    return out


payload = {
    "engine_dir": ENGINE,
    "extra_policy": getattr(schemas.CalculateRequest, "model_config", {}).get("extra"),
    "CalculateRequest": dump("CalculateRequest"),
    "AccountInput": dump("AccountInput"),
}
print(json.dumps(payload, indent=2))

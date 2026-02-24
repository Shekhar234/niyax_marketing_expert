from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pathlib import Path
import pandas as pd
import numpy as np
import io, os, uuid, time, datetime, hashlib
import traceback
import logging
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

APP_TITLE = "NiYA-X | Intelligence On-Demand"
app = FastAPI(title=APP_TITLE)

# -------------------------
# Paths - More robust handling
# -------------------------
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR

# Try multiple possible locations for static directory
STATIC_DIR = None
possible_static_dirs = [
    BASE_DIR / "static",
    PROJECT_ROOT / "static",
    Path.cwd() / "static",
    Path("/app") / "static",
    Path("/app") / "niyax-complete" / "static"
]

for dir_path in possible_static_dirs:
    if dir_path.exists():
        STATIC_DIR = dir_path
        logger.info(f"✅ Found static directory at: {STATIC_DIR}")
        break

if STATIC_DIR is None:
    logger.warning("⚠️ Static directory not found, creating at default location")
    STATIC_DIR = BASE_DIR / "static"
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Create subdirectories
(STATIC_DIR / "css").mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "js").mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "assets").mkdir(parents=True, exist_ok=True)

RUNTIME_DIR = BASE_DIR / "runtime"
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

DATA_DIR = BASE_DIR / "data"
SESS_DIR = DATA_DIR / "sessions"
SESS_FILE = DATA_DIR / "sessions.json"
SESS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files
try:
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    logger.info(f"✅ Static files mounted from: {STATIC_DIR}")
except Exception as e:
    logger.error(f"❌ Failed to mount static files: {e}")

# -------------------------
# Routes
# -------------------------
@app.get("/", response_class=HTMLResponse)
def landing():
    """Landing page with expert cards"""
    try:
        landing_file = STATIC_DIR / "landing.html"
        if landing_file.exists():
            return landing_file.read_text(encoding="utf-8")
        else:
            logger.warning(f"Landing page not found at: {landing_file}")
            return f"""
            <html>
            <head><title>NiYA-X</title></head>
            <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                <h1>Welcome to NiYA-X</h1>
                <p style="color: #dc3545;">⚠️ Landing page not found at: <code>{landing_file}</code></p>
                <p>Please ensure <code>landing.html</code> is in the <code>static/</code> folder.</p>
                <p><a href="/marketing-expert">Go to Marketing Expert Demo →</a></p>
            </body>
            </html>
            """
    except Exception as e:
        logger.error(f"Error in landing page: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/marketing-expert", response_class=HTMLResponse)
def marketing_expert():
    """Marketing Expert demo page"""
    try:
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return index_file.read_text(encoding="utf-8")
        else:
            logger.error(f"Demo page not found at: {index_file}")
            raise HTTPException(
                status_code=404, 
                detail=f"Demo page not found. Expected at: {index_file}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading demo page: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cvm-expert", response_class=HTMLResponse)
def cvm_expert():
    """Marketing Expert Landing Page with predefined tasks"""
    try:
        cvm_file = STATIC_DIR / "marketing-landing.html"
        if cvm_file.exists():
            return cvm_file.read_text(encoding="utf-8")
        else:
            logger.error(f"Marketing Landing page not found at: {cvm_file}")
            raise HTTPException(
                status_code=404, 
                detail=f"Marketing Landing page not found. Expected at: {cvm_file}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading CVM Expert page: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/marketing-chat", response_class=HTMLResponse)
def marketing_chat():
    """Marketing Expert Chat Interface with Agent Orchestration"""
    try:
        chat_file = STATIC_DIR / "marketing-chat.html"
        if chat_file.exists():
            return chat_file.read_text(encoding="utf-8")
        else:
            logger.error(f"Marketing Chat page not found at: {chat_file}")
            raise HTTPException(
                status_code=404, 
                detail=f"Marketing Chat page not found. Expected at: {chat_file}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading Marketing Chat page: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "static_dir": str(STATIC_DIR),
        "static_exists": STATIC_DIR.exists(),
        "landing_exists": (STATIC_DIR / "landing.html").exists(),
        "demo_exists": (STATIC_DIR / "index.html").exists(),
        "sessions_count": len(SESSIONS),
        "timestamp": datetime.datetime.now().isoformat()
    }

# -------------------------
# Sessions
# -------------------------
SESSIONS: Dict[str, Dict[str, Any]] = {}

# -------------------------
# Models
# -------------------------
class StepRequest(BaseModel):
    session_id: str
    step: str
    lobs: Optional[List[str]] = None
    opportunity_types: Optional[List[str]] = None
    offer_count: Optional[int] = 3  # Legacy: Number of offers per LOB
    offer_counts_per_opp: Optional[Dict[str, int]] = None  # New: Number of offers per opportunity type

class PublishRequest(BaseModel):
    session_id: str
    target: str = "NEON_DX"
    mode: str = "api"
    endpoint_url: Optional[str] = None

# -------------------------
# Utils
# -------------------------
def _now() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def _require_session(session_id: str) -> Dict[str, Any]:
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found. Please upload again.")
    return SESSIONS[session_id]

def _save_sessions():
    """Save sessions to JSON file - SAFE VERSION"""
    try:
        logger.info(f"Session state: {len(SESSIONS)} active sessions")
    except Exception as e:
        logger.error(f"Error in save_sessions: {e}")

def _load_sessions():
    """Load sessions from JSON file - SAFE VERSION"""
    global SESSIONS
    try:
        if SESS_FILE.exists():
            try:
                with open(SESS_FILE, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        loaded = json.loads(content)
                        logger.info(f"Found existing sessions file, starting fresh session storage")
                    else:
                        logger.info("Sessions file is empty, starting fresh")
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ Corrupted sessions file, deleting and starting fresh: {e}")
                SESS_FILE.unlink()
                SESSIONS = {}
            except Exception as e:
                logger.warning(f"⚠️ Could not load sessions: {e}, starting fresh")
                SESSIONS = {}
        else:
            logger.info("No existing sessions file, starting fresh")
            SESSIONS = {}
    except Exception as e:
        logger.error(f"Error in load_sessions: {e}")
        SESSIONS = {}

def _hash01(*parts: str) -> float:
    s = "|".join([str(p) for p in parts])
    h = hashlib.md5(s.encode("utf-8")).hexdigest()
    v = int(h[:8], 16)
    return (v % 10_000_000) / 10_000_000.0

def _norm_lob(x: str) -> str:
    x = (x or "").strip().upper()
    if x in {"TOTAL_NETWORK", "TOTAL NETWORK", "TOTALNETWORK"}:
        return "TOTAL_NETWORK"
    if x in {"DATA"}: return "DATA"
    if x in {"VOICE"}: return "VOICE"
    if x in {"VAS"}: return "VAS"
    return "DATA"

def _normalize_lobs(lobs: Optional[List[str]]) -> List[str]:
    """Normalize LOB list - TOTAL_NETWORK is now a separate LOB, not expanded"""
    if not lobs:
        return ["DATA", "VOICE", "VAS"]
    up = [_norm_lob(a) for a in lobs if a and str(a).strip()]
    # TOTAL_NETWORK is now kept as a separate LOB (represents total revenue across all services)
    # No longer expand it to DATA + VOICE + VAS
    out, seen = [], set()
    for a in up:
        if a not in seen:
            out.append(a)
            seen.add(a)
    return out if out else ["DATA", "VOICE", "VAS"]

def _ensure_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "msisdn" not in df.columns:
        df.rename(columns={df.columns[0]: "msisdn"}, inplace=True)

    if "tenure_months" not in df.columns: df["tenure_months"] = 6
    if "arpu" not in df.columns: df["arpu"] = 10.0
    if "data_mb_30d" not in df.columns: df["data_mb_30d"] = 0.0
    if "voice_min_30d" not in df.columns: df["voice_min_30d"] = 0.0
    if "churn_risk" not in df.columns: df["churn_risk"] = 0.2
    if "vas_spend_30d" not in df.columns:
        arpu = pd.to_numeric(df["arpu"], errors="coerce").fillna(10.0)
        rnd = np.array([_hash01(m, "vas") for m in df["msisdn"].astype(str)])
        df["vas_spend_30d"] = np.round(arpu * (rnd * 0.25), 2)
    return df

def _overall_usage(df: pd.DataFrame) -> pd.Series:
    d = pd.to_numeric(df["data_mb_30d"], errors="coerce").fillna(0.0)
    v = pd.to_numeric(df["voice_min_30d"], errors="coerce").fillna(0.0)
    vas = pd.to_numeric(df["vas_spend_30d"], errors="coerce").fillna(0.0)
    d_n = d / (float(d.max()) if float(d.max()) != 0 else 1.0)
    v_n = v / (float(v.max()) if float(v.max()) != 0 else 1.0)
    vas_n = vas / (float(vas.max()) if float(vas.max()) != 0 else 1.0)
    return 0.5 * d_n + 0.35 * v_n + 0.15 * vas_n

def _sample_df(df: pd.DataFrame, max_rows: int = 200000) -> pd.DataFrame:
    if int(df.shape[0]) <= max_rows:
        return df
    return df.sample(n=max_rows, random_state=123).reset_index(drop=True)

def _derive_lifecycle_stage(df: pd.DataFrame) -> pd.DataFrame:
    df = _ensure_columns(df).copy()
    tenure = pd.to_numeric(df["tenure_months"], errors="coerce").fillna(6.0)
    churn = pd.to_numeric(df["churn_risk"], errors="coerce").fillna(0.2)
    usage = _overall_usage(df)

    non_user = usage <= 0.08
    prev_factor = np.array([0.7 + 0.9 * _hash01(m, "prev") for m in df["msisdn"].astype(str)])
    prev_activity = usage * prev_factor

    grower = usage >= (prev_activity * 1.15)
    dropper = usage <= (prev_activity * 0.80)
    new_user = tenure <= 2.0
    stopper = (churn >= 0.70) & (usage <= 0.20)

    stage = np.where(
        new_user, "New User",
        np.where(
            non_user, "Non-user",
            np.where(
                stopper, "Stopper",
                np.where(
                    dropper, "Dropper",
                    np.where(grower, "Grower", "Stable")
                )
            )
        )
    )
    df["lifecycle_stage"] = stage
    return df

def _base_strategy_from_lcs(lcs: str, churn_risk: float) -> str:
    """
    Determine base strategy based on Lifecycle Stage.
    
    Mapping:
    - Grower, New User -> No Action (already growing)
    - Dropper -> Retain (prevent further decline)
    - Stopper -> Revive (win back)
    - Non-user -> Cross-sell (activate new service)
    - Stable -> Upsell (opportunity to grow) or No Action
    """
    if lcs in {"Grower", "New User"}: return "No Action"
    if lcs == "Dropper": return "Retain"
    if lcs == "Stopper": return "Revive"
    if lcs == "Non-user": return "Cross-sell"
    # Stable users: more likely to be eligible for Upsell
    if lcs == "Stable": return "Upsell" if churn_risk < 0.50 else "No Action"
    return "No Action"

def _apply_type_filter(strategy: str, selected_types: List[str], lcs: str = "") -> str:
    """
    Apply opportunity type filter based on selection.
    
    LCS to valid Opportunity mapping:
    - Grower, New User -> No Action
    - Dropper -> Retain
    - Stopper -> Revive  
    - Stable -> Upsell (if high value) or No Action
    - Non-user -> Cross-sell
    
    If the selected opportunity type is valid for this LCS, use it.
    Otherwise, return the base strategy for this LCS.
    """
    if not selected_types or "Auto" in selected_types:
        return strategy
    
    # Normalize selected types
    allowed = {t.lower().replace(" ", "").replace("-", "") for t in selected_types}
    
    # Check if base strategy is in allowed types
    norm_strategy = strategy.lower().replace(" ", "").replace("-", "")
    if norm_strategy == "crosssell": norm_strategy = "crosssell"
    
    if norm_strategy in allowed:
        return strategy
    
    # If base strategy not in allowed, check if any allowed type is valid for this LCS
    lcs_lower = lcs.lower().replace(" ", "").replace("-", "") if lcs else ""
    
    # LCS to valid opportunities mapping
    lcs_valid_opps = {
        "grower": ["noaction"],
        "newuser": ["noaction"],
        "dropper": ["retain", "noaction"],
        "stopper": ["revive", "noaction"],
        "stable": ["upsell", "noaction"],
        "nonuser": ["crosssell", "noaction"]
    }
    
    valid_for_lcs = lcs_valid_opps.get(lcs_lower, ["noaction"])
    
    # Check if any selected type is valid for this LCS
    for selected in allowed:
        if selected in valid_for_lcs:
            # Return the properly formatted strategy name
            strategy_map = {
                "upsell": "Upsell",
                "retain": "Retain",
                "revive": "Revive",
                "crosssell": "Cross-sell",
                "noaction": "No Action"
            }
            return strategy_map.get(selected, "No Action")
    
    # No valid opportunity for this LCS in selection, return No Action
    return "No Action"

def _opportunity_name(strategy: str, lob: str) -> str:
    s = (strategy or "No Action").strip().lower().replace(" ", "")
    lob = _norm_lob(lob).lower()
    if s in {"cross-sell", "crosssell"}: s = "crosssell"
    if s == "noaction": s = "noaction"
    return f"{s}_{lob}"

def _premium_reason(row: pd.Series, strategy: str, lob: str) -> str:
    churn = float(pd.to_numeric(row.get("churn_risk", 0.2), errors="coerce") or 0.2)
    arpu = float(pd.to_numeric(row.get("arpu", 10.0), errors="coerce") or 10.0)
    tenure = float(pd.to_numeric(row.get("tenure_months", 6), errors="coerce") or 6)
    
    lob_lower = lob.lower()
    if strategy == "Retain":
        return f"High churn risk ({churn:.1%}) in {lob_lower}. Recommend loyalty offer to prevent revenue loss."
    elif strategy == "Revive":
        return f"Inactive {lob_lower} user with {tenure:.0f} months tenure. Target with win-back campaign."
    elif strategy == "Upsell":
        return f"Stable {lob_lower} user (ARPU ${arpu:.2f}). Opportunity to upgrade plan for increased revenue."
    elif strategy == "Cross-sell":
        return f"Non-user in {lob_lower}. Cross-sell opportunity to activate this service line."
    else:
        return f"No immediate action required for {lob_lower}."

def _strategy_from_opportunity(opp: str) -> str:
    opp_lower = opp.lower().replace("_", "")
    if "upsell" in opp_lower: return "Upsell"
    if "retain" in opp_lower: return "Retain"
    if "revive" in opp_lower: return "Revive"
    if "crosssell" in opp_lower: return "Cross-sell"
    return "No Action"

def _pick_offers(msisdn: str, lob: str, strategy: str, count: int = 3) -> List[str]:
    h = _hash01(msisdn, lob, strategy)
    lob_lower = lob.lower()
    
    offer_pools = {
        "Upsell": [
            f"Premium {lob_lower} plan with 2x benefits",
            f"Upgrade to unlimited {lob_lower} package",
            f"Enhanced {lob_lower} bundle with bonus features"
        ],
        "Retain": [
            f"Loyalty discount: 20% off {lob_lower} for 3 months",
            f"Exclusive retention offer: Free {lob_lower} upgrade",
            f"Stay & Save: Bonus {lob_lower} credits"
        ],
        "Revive": [
            f"Welcome back: 50% off {lob_lower} reactivation",
            f"Win-back offer: Free {lob_lower} trial month",
            f"Return bonus: Extra {lob_lower} value pack"
        ],
        "Cross-sell": [
            f"Try {lob_lower}: First month free",
            f"New to {lob_lower}? Get starter bonus",
            f"Activate {lob_lower} with special intro price"
        ]
    }
    
    pool = offer_pools.get(strategy, [f"Standard {lob_lower} offer {i+1}" for i in range(3)])
    seed = int(h * 1000)
    np.random.seed(seed)
    np.random.shuffle(pool)
    return pool[:count]

# -------------------------
# API Endpoints
# -------------------------
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    try:
        logger.info(f"📤 Upload request received: {file.filename}")
        
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files accepted")

        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV is empty")

        session_id = str(uuid.uuid4())
        rows, cols = df.shape[0], df.shape[1]

        SESSIONS[session_id] = {
            "raw": df,
            "raw_rows": rows,
            "raw_cols": cols,
            "steps": {},
            "status": {},
            "controls": {},
            "output_path": None,
            "created_at": _now()
        }
        
        logger.info(f"✅ Session created: {session_id} ({rows} rows, {cols} cols)")
        
        return {
            "session_id": session_id,
            "file_name": file.filename,
            "rows": rows,
            "cols": cols,
            "timestamp": _now()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Upload error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/run_step")
def run_step(req: StepRequest):
    try:
        logger.info(f"🔄 Running step: {req.step} for session {req.session_id}")
        
        sess = _require_session(req.session_id)
        step = (req.step or "").strip().lower()
        if step not in {"lifecycle", "opportunity", "offers", "launch"}:
            raise HTTPException(status_code=400, detail="Invalid step.")

        df = _sample_df(sess["raw"], 200000)
        df = _ensure_columns(df)
        time.sleep(1.0)

        if step == "lifecycle":
            df2 = _derive_lifecycle_stage(df)
            out = pd.DataFrame({
                "msisdn": df2["msisdn"].astype(str),
                "lifecycle_stage": df2["lifecycle_stage"].astype(str)
            })
            sess["steps"]["lifecycle"] = out
            sess["status"]["lifecycle"] = True

        elif step == "opportunity":
            if not sess["status"].get("lifecycle"):
                raise HTTPException(status_code=400, detail="Run Lifecycle step first.")
            lobs = _normalize_lobs(req.lobs)
            types = req.opportunity_types or ["Auto"]
            
            # ✅ Store the selected LOBs and types
            sess["controls"] = {"lobs": lobs, "types": types}
            logger.info(f"✅ Stored controls: LOBs={lobs}, Types={types}")

            df2 = _derive_lifecycle_stage(df)
            churn = pd.to_numeric(df2["churn_risk"], errors="coerce").fillna(0.2).astype(float)

            rows = []
            for i in range(len(df2)):
                lcs = str(df2.loc[i, "lifecycle_stage"])
                base_strategy = _base_strategy_from_lcs(lcs, float(churn.loc[i]))

                for lob in lobs:
                    # Pass LCS to filter so it can determine valid opportunities
                    strategy = _apply_type_filter(base_strategy, types, lcs)
                    opp = _opportunity_name(strategy, lob)
                    rows.append({
                        "msisdn": str(df2.loc[i, "msisdn"]),
                        "lifecycle_stage": lcs,
                        "lob": _norm_lob(lob),
                        "opportunity": opp,
                        "reason": _premium_reason(df2.loc[i], strategy, lob)
                    })

            out = pd.DataFrame(rows)
            sess["steps"]["opportunity"] = out
            sess["status"]["opportunity"] = True

        elif step == "offers":
            if not sess["status"].get("opportunity"):
                raise HTTPException(status_code=400, detail="Run Opportunity step first.")

            opp_df = sess["steps"]["opportunity"].copy()
            
            logger.info(f"📋 Opportunity DataFrame has {len(opp_df)} rows")
            logger.info(f"📋 Opportunity columns: {list(opp_df.columns)}")
            
            # ✅ Get the LOBs and types from controls (what was selected in Opportunity)
            selected_lobs = sess["controls"].get("lobs", [])
            selected_types = sess["controls"].get("types", ["Auto"])
            
            # ✅ Get offer counts per opportunity type (new format)
            offer_counts_per_opp = req.offer_counts_per_opp or {}
            
            # Fallback to legacy offer_count if new format not provided
            default_count = req.offer_count or 2
            
            # Normalize opportunity type keys for matching
            def normalize_opp_key(key: str) -> str:
                return key.lower().replace(" ", "").replace("-", "")
            
            # Build normalized offer counts dict
            normalized_counts = {}
            for opp_type, count in offer_counts_per_opp.items():
                normalized_counts[normalize_opp_key(opp_type)] = max(1, min(count, 3))
            
            logger.info(f"✅ Offer counts per opportunity: {offer_counts_per_opp}")
            logger.info(f"✅ Normalized counts: {normalized_counts}")
            logger.info(f"✅ Selected LOBs: {selected_lobs}, Types: {selected_types}")

            # For each MSISDN, generate offers based on their opportunity type
            rows = []
            
            # Check if opp_df has required columns
            if "msisdn" not in opp_df.columns or "lifecycle_stage" not in opp_df.columns:
                logger.error(f"❌ Missing required columns. Available: {list(opp_df.columns)}")
                raise HTTPException(status_code=500, detail="Opportunity data is missing required columns")
            
            grouped = opp_df.groupby(["msisdn", "lifecycle_stage"])
            logger.info(f"📋 Found {len(grouped)} unique MSISDN/lifecycle groups")

            for (msisdn, lcs), g in grouped:
                row = {"msisdn": msisdn, "lifecycle_stage": lcs}

                # Iterate over SELECTED LOBs from Opportunity step
                for lob in selected_lobs:
                    gg = g[g["lob"] == lob]
                    if gg.empty:
                        logger.warning(f"⚠️ LOB {lob} not found in opportunity data for {msisdn}")
                        continue
                    
                    opp = gg.iloc[0]["opportunity"]
                    strategy = _strategy_from_opportunity(opp)
                    
                    # Get offer count for this opportunity type
                    strategy_key = normalize_opp_key(strategy)
                    offer_count = normalized_counts.get(strategy_key, default_count)
                    
                    logger.debug(f"  MSISDN {msisdn}, LOB {lob}, Strategy {strategy}, Count {offer_count}")
                    
                    # Generate offers
                    offers = _pick_offers(msisdn, lob, strategy, offer_count)
                    
                    row[f"opportunity_{lob.lower()}"] = opp
                    
                    # Create offer columns based on the count for this opportunity type
                    for i in range(offer_count):
                        row[f"{lob.lower()}_offer{i+1}"] = offers[i]

                rows.append(row)

            logger.info(f"📋 Generated {len(rows)} offer rows")
            
            if len(rows) == 0:
                logger.warning("⚠️ No offer rows generated! Creating empty DataFrame with expected columns")
                # Create empty DataFrame with expected columns
                columns = ["msisdn", "lifecycle_stage"]
                for lob in selected_lobs:
                    lob_lower = lob.lower()
                    columns.append(f"opportunity_{lob_lower}")
                    for i in range(default_count):
                        columns.append(f"{lob_lower}_offer{i+1}")
                out = pd.DataFrame(columns=columns)
            else:
                out = pd.DataFrame(rows)
            
            sess["steps"]["offers"] = out
            sess["status"]["offers"] = True
            
            # Store the offer configuration for reference
            sess["controls"]["offer_counts"] = offer_counts_per_opp
            
            logger.info(f"✅ Generated {len(out)} offer rows with variable offers per opportunity type")
            logger.info(f"✅ Offer DataFrame columns: {list(out.columns)}")

        elif step == "launch":
            if not sess["status"].get("offers"):
                raise HTTPException(status_code=400, detail="Run Offers step first.")
            final_df = sess["steps"]["offers"].copy()
            out_path = str(RUNTIME_DIR / f"output_{req.session_id}.csv")
            final_df.to_csv(out_path, index=False)
            sess["steps"]["launch"] = final_df
            sess["status"]["launch"] = True
            sess["output_path"] = out_path

        logger.info(f"✅ Step completed: {step}")
        return {"ok": True, "step": step, "timestamp": _now()}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Step error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Step failed: {str(e)}")

@app.get("/api/preview/{session_id}")
def preview(session_id: str, step: str = "lifecycle", n: int = 12):
    try:
        sess = _require_session(session_id)
        step = (step or "lifecycle").strip().lower()
        
        logger.info(f"📋 Preview request for step: {step}, session: {session_id}")
        logger.info(f"📋 Available steps: {list(sess['steps'].keys())}")
        logger.info(f"📋 Step status: {sess['status']}")
        
        if step not in sess["steps"]:
            available_steps = list(sess["steps"].keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Step '{step}' not available yet. Available steps: {available_steps}. Run the step first."
            )

        df = sess["steps"][step]
        
        # Check if DataFrame is valid
        if df is None:
            raise HTTPException(status_code=400, detail=f"Step '{step}' has no data.")
        
        # Ensure it's a DataFrame
        if not isinstance(df, pd.DataFrame):
            logger.error(f"❌ Step '{step}' data is not a DataFrame: {type(df)}")
            raise HTTPException(status_code=500, detail=f"Step '{step}' data is invalid type: {type(df)}")
        
        # Handle empty DataFrame
        if df.empty:
            logger.warning(f"⚠️ Preview: DataFrame for step '{step}' is empty")
            return {
                "step": step,
                "columns": list(df.columns) if hasattr(df, 'columns') else [],
                "rows": [],
                "timestamp": _now()
            }
        
        df = df.copy().head(max(1, min(int(n), 50)))
        
        # ✅ Fix NaN values - replace with empty string for JSON serialization
        df = df.fillna('')
        
        # Convert DataFrame to records, handling any remaining issues
        rows_list = []
        for _, row in df.iterrows():
            row_dict = {}
            for col in df.columns:
                val = row[col]
                # Handle various problematic types
                if pd.isna(val):
                    row_dict[col] = ""
                elif isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
                    row_dict[col] = ""
                else:
                    row_dict[col] = str(val) if not isinstance(val, (str, int, bool)) else val
            rows_list.append(row_dict)
        
        # ✅ For offers, log what LOBs are in the data
        if step == "offers":
            selected_lobs = sess["controls"].get("lobs", [])
            logger.info(f"✅ Preview offers for LOBs: {selected_lobs}")
            logger.info(f"✅ Offer columns: {list(df.columns)}")
            logger.info(f"✅ Offer rows count: {len(df)}")
        
        return {
            "step": step,
            "columns": list(df.columns),
            "rows": rows_list,
            "timestamp": _now()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{session_id}")
def download(session_id: str):
    try:
        sess = _require_session(session_id)
        if not sess.get("status", {}).get("launch"):
            raise HTTPException(status_code=400, detail="Run Review & Launch first (Launch action).")
        path = sess.get("output_path")
        if not path or not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Output not found.")
        return FileResponse(path, filename=os.path.basename(path), media_type="text/csv")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/impact_forecast")
def impact_forecast(session_id: str, lobs: str = ""):
    try:
        sess = _require_session(session_id)

        import calendar
        today = datetime.date.today()
        months = []
        y, m = today.year, today.month
        for i in range(5, -1, -1):
            mm = m - i
            yy = y
            while mm <= 0:
                mm += 12
                yy -= 1
            months.append(calendar.month_abbr[mm])

        lobs_key = (lobs or "").strip()
        seed_key = f"{session_id}|{lobs_key}"
        seed_int = int(hashlib.md5(seed_key.encode("utf-8")).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed_int)

        base_size = int(sess.get("raw_rows") or 50000)
        size_factor = np.clip(base_size / 100000.0, 0.35, 2.50)

        rev_start = (80 + 70 * rng.random()) * size_factor
        rev_trend = (1.5 + 3.5 * rng.random())
        revenue6 = []
        val = rev_start
        for _ in range(6):
            val = val + rev_trend + rng.normal(0, 2.2)
            revenue6.append(float(np.clip(val, 10, None)))
        revenue6 = [round(x, 1) for x in revenue6]

        margin_pct_base = 0.22 + 0.10 * rng.random()
        margin6 = []
        for r in revenue6:
            mp = margin_pct_base + rng.normal(0, 0.008)
            margin6.append(round(max(0.0, r * mp), 1))

        churn_start = 2.6 + 1.6 * rng.random()
        churn_drop = 0.06 + 0.10 * rng.random()
        churn6 = []
        cv = churn_start
        for _ in range(6):
            cv = cv - churn_drop + rng.normal(0, 0.03)
            churn6.append(float(np.clip(cv, 0.6, 9.0)))
        churn6 = [round(x, 2) for x in churn6]

        revenue_total = round(sum(revenue6), 1)
        margin_total = round(sum(margin6), 1)
        churn_avg = round(float(np.mean(churn6)), 2)

        s = _hash01(seed_key, "uplift")
        rev_uplift = round(1.5 + 6.0 * s, 1)
        margin_uplift = round(0.8 + 4.0 * s, 1)
        churn_reduction = round(0.6 + 3.5 * s, 1)

        return {
            "session_id": session_id,
            "kpis": {
                "revenue_total_m": revenue_total,
                "margin_total_m": margin_total,
                "churn_avg_pct": churn_avg,
                "rev_uplift_pct": rev_uplift,
                "margin_uplift_pct": margin_uplift,
                "churn_reduction_pct": churn_reduction
            },
            "series": {
                "months6": months,
                "revenue6_m": revenue6,
                "margin6_m": margin6,
                "churn6_pct": churn6
            },
            "timestamp": _now()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/publish")
def publish(req: PublishRequest):
    try:
        _ = _require_session(req.session_id)
        ref = f"PUB-{req.session_id}-{int(_hash01(req.session_id, req.target)*100000):05d}"
        return {
            "ok": True,
            "status": "queued",
            "reference_id": ref,
            "target": req.target,
            "mode": req.mode,
            "endpoint_url": req.endpoint_url or "",
            "timestamp": _now()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Publish error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("🚀 NiYA-X Application Starting")
    logger.info("=" * 60)
    logger.info(f"📁 Backend directory: {BASE_DIR}")
    logger.info(f"📁 Project root: {PROJECT_ROOT}")
    logger.info(f"📁 Static directory: {STATIC_DIR}")
    logger.info(f"📁 Runtime directory: {RUNTIME_DIR}")
    logger.info(f"✅ Landing page: {(STATIC_DIR / 'landing.html').exists()}")
    logger.info(f"✅ Demo page: {(STATIC_DIR / 'index.html').exists()}")
    logger.info("=" * 60)
    _load_sessions()
    logger.info(f"📊 Active sessions: {len(SESSIONS)}")
    logger.info("=" * 60)

# Initialize on import
_load_sessions()

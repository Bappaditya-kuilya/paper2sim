"""
Paper2Sim Streamlit UI Entry Point

Main Streamlit application for the Paper2Sim tool that converts academic papers
into interactive explanations with animated mathematical visualizations.
"""
import json
import tempfile
import os
from pathlib import Path

from dotenv import load_dotenv
import streamlit as st

load_dotenv()

st.set_page_config(page_title="Paper2Sim", page_icon="📄", layout="wide")

# --- Custom CSS: Dark theme for code blocks, expanders, and tabs ---
st.markdown("""
<style>
    .block-container { padding-top: 2rem; }
    .stExpander { border: 1px solid #333; border-radius: 8px; }
    .eq-card { background: #1e1e2e; padding: 1rem; border-radius: 8px; margin: 0.5rem 0; }
    h1 { color: #89b4fa; }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
    .stTabs [data-baseweb="tab"] { border-radius: 4px; }
</style>
""", unsafe_allow_html=True)

# --- Sidebar: Settings and API key input ---
with st.sidebar:
    st.markdown("## ⚙️ Settings")
    groq_key = st.text_input(
        "Groq API Key",
        value=os.getenv("GROQ_API_KEY", ""),
        type="password",
        help="Get a free key at console.groq.com",
    )
    model = st.selectbox(
        "Model",
        ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "qwen/qwen3.8-27b"],
        help="Model for equation extraction and breakdown",
    )
    st.divider()
    st.markdown("### Links")
    st.markdown("[📖 GitHub](https://github.com)", unsafe_allow_html=True)
    if os.path.exists("threejs_demo/index.html"):
        st.markdown("[🌐 3D Sandbox](threejs_demo/index.html)", unsafe_allow_html=True)

# --- Session State ---
defaults = {
    "equations": [],
    "equation_mappings": {},
    "rendered_videos": {},
    "paper_info": None,
    "breakdown": None,
    "tex_content": None,
}
for k, v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

# --- Header: App title and description ---
st.markdown("# 📄 Paper2Sim")
st.markdown("**AI-powered paper explainer with animated visualizations**")
st.caption("Paste an arXiv URL or upload a PDF → get structured explanations, animated equations, and an interactive 3D demo.")

if not groq_key:
    st.warning("Enter your Groq API key in the sidebar to get started.")
    st.stop()

# --- Input: arXiv URL or PDF upload ---
col_input, col_action = st.columns([3, 1])
with col_input:
    arxiv_url = st.text_input(
        "arXiv URL",
        placeholder="https://arxiv.org/abs/1706.03762",
        label_visibility="visible",
    )
    uploaded = st.file_uploader("Or upload a PDF", type=["pdf"])
with col_action:
    st.write("")
    st.write("")
    run = st.button("▶ Analyze", type="primary", use_container_width=True)

# --- Main Pipeline ---
if run and (arxiv_url or uploaded):
    # Reset
    st.session_state.update({"equations": [], "equation_mappings": {}, "rendered_videos": {}})

    # --- arXiv Path ---
    if arxiv_url:
        from paper2sim.arxiv import parse_arxiv_url, get_paper_info, download_source

        arxiv_id = parse_arxiv_url(arxiv_url)
        if not arxiv_id:
            st.error("Invalid arXiv URL. Use format: `https://arxiv.org/abs/1706.03762`")
            st.stop()

        with st.status("Processing arXiv paper...", expanded=True) as status:
            # Paper info
            st.write("Fetching paper metadata...")
            info = get_paper_info(arxiv_id)
            if info:
                st.session_state.paper_info = info
                st.write(f"**{info['title']}**")

            # Source TeX
            st.write("Downloading source TeX...")
            tex_path = download_source(arxiv_id, tempfile.mkdtemp())
            equations = []

            if tex_path:
                st.session_state.tex_content = tex_path.read_text(encoding="utf-8", errors="ignore")
                from paper2sim.equations import extract_equations_from_tex
                equations = extract_equations_from_tex(st.session_state.tex_content)
                st.write(f"Extracted {len(equations)} equations from TeX source")

            # Fallback: LLM extraction from PDF
            if len(equations) < 3:
                st.write("Few equations from TeX, trying LLM extraction from PDF...")
                from paper2sim.arxiv import download_pdf
                from paper2sim.client import _extract_pdf_text
                from paper2sim.equations import extract_equations_with_llm

                pdf_path = download_pdf(arxiv_id, tempfile.mkdtemp())
                if pdf_path:
                    text = _extract_pdf_text(pdf_path)
                    llm_eqs = extract_equations_with_llm(text, api_key=groq_key, model=model)
                    if llm_eqs:
                        equations = llm_eqs
                        st.write(f"LLM extracted {len(equations)} equations")

            st.session_state.equations = equations
            status.update(label=f"Found {len(equations)} equations", state="complete")

    # --- PDF Path ---
    elif uploaded:
        with st.status("Processing PDF...", expanded=True) as status:
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(uploaded.read())
                    tmp_path = tmp.name

                from paper2sim.client import _extract_pdf_text
                from paper2sim.equations import extract_equations_with_llm

                text = _extract_pdf_text(Path(tmp_path))
                st.write(f"Extracted {len(text)} characters from PDF")

                st.write("Extracting equations with LLM...")
                equations = extract_equations_with_llm(text, api_key=groq_key, model=model)
                st.session_state.equations = equations
                st.write(f"Found {len(equations)} equations")

                # LLM breakdown
                from paper2sim import Paper2SimBreakdownClient
                st.write("Running paper breakdown...")
                client = Paper2SimBreakdownClient(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
                breakdown, _ = client.breakdown(tmp_path, model=model)
                st.session_state.breakdown = breakdown
                status.update(label="Done!", state="complete")
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)

from paper2sim.equations import classify_equation

# --- Display Results ---
if st.session_state.paper_info:
    info = st.session_state.paper_info
    st.markdown(f"### {info['title']}")
    st.caption(f"**Authors:** {info['authors']}")
    with st.expander("Abstract", expanded=False):
        st.write(info["abstract"])

elif st.session_state.breakdown:
    b = st.session_state.breakdown
    st.markdown(f"### {b.document_title}")
    st.write(b.document_summary)

# --- Equations: Extracted equations display and template mapping ---
if st.session_state.equations:
    st.markdown("---")
    st.markdown("### 📐 Extracted Equations")

    equations = st.session_state.equations
    cols = st.columns(2)
    for i, eq in enumerate(equations):
        eq_type = classify_equation(eq.get("latex", ""))
        template = eq.get("template", "—")
        with cols[i % 2]:
            with st.expander(f"**{eq_type}** — {eq.get('latex', '')[:60]}..."):
                st.code(eq.get("latex", ""), language="latex")
                st.caption(f"Type: {eq.get('type', 'unknown')} · Template: {template}")

    # --- Template Mapping ---
    st.markdown("### 🎬 Map to Animations")
    if st.button("Map Equations to Templates", type="primary"):
        with st.spinner("Mapping equations to animation templates..."):
            from paper2sim.equations import select_templates

            already_mapped = [eq for eq in equations if eq.get("template")]
            if already_mapped:
                mappings = already_mapped
            else:
                mappings = select_templates(equations)

            st.session_state.equation_mappings = {
                m.get("equation", m.get("latex", f"eq_{i}")): m
                for i, m in enumerate(mappings)
                if m.get("template")
            }
            n = len(st.session_state.equation_mappings)
            if n:
                st.success(f"Mapped {n} equations to animation templates")
            else:
                st.warning("No equations matched available templates")

    # --- Render: Animation generation and video playback ---
    if st.session_state.equation_mappings:
        st.markdown("### 🎥 Render Animations")

        for idx, (eq_text, mapping) in enumerate(st.session_state.equation_mappings.items()):
            template_name = mapping["template"]
            params = mapping.get("params", {})
            video_key = f"{idx}_{template_name}"
            rendered_path = st.session_state.rendered_videos.get(video_key)

            col_info, col_action = st.columns([3, 1])
            with col_info:
                st.markdown(f"**{template_name.replace('_', ' ').title()}**")
                st.code(eq_text[:80], language="latex")
            with col_action:
                if rendered_path:
                    st.success("✓ Rendered")
                elif st.button("Render", key=f"render_{idx}_{template_name}"):
                    with st.spinner(f"Rendering {template_name}..."):
                        out_dir = Path("rendered_videos")
                        out_dir.mkdir(exist_ok=True)
                        out_path = out_dir / f"{video_key}.mp4"

                        from paper2sim.templates import render_template
                        success = render_template(template_name, params, str(out_path))
                        if success:
                            st.session_state.rendered_videos[video_key] = str(out_path)
                            st.rerun()
                        else:
                            st.error(f"Failed to render {template_name}")

            if rendered_path:
                st.video(rendered_path)

        # Render All
        if st.button("▶ Render All", type="secondary"):
            from paper2sim.templates import render_template
            out_dir = Path("rendered_videos")
            out_dir.mkdir(exist_ok=True)
            progress = st.progress(0)
            total = len(st.session_state.equation_mappings)

            for i, (eq_text, mapping) in enumerate(st.session_state.equation_mappings.items()):
                video_key = f"{i}_{mapping['template']}"
                if video_key not in st.session_state.rendered_videos:
                    out_path = out_dir / f"{video_key}.mp4"
                    render_template(mapping["template"], mapping.get("params", {}), str(out_path))
                    if out_path.exists():
                        st.session_state.rendered_videos[video_key] = str(out_path)
                progress.progress((i + 1) / total)

            progress.empty()
            st.rerun()

# --- 3D Sandbox: Interactive mathematical surface exploration ---
if os.path.exists("threejs_demo/index.html"):
    st.markdown("---")
    st.markdown("### 🌐 Interactive 3D Sandbox")
    st.caption("Explore mathematical surfaces with real-time parameter controls")

    try:
        paper_eqs = []
        for eq in st.session_state.equations[:10]:
            latex = eq.get("latex", "")
            eq_type = classify_equation(latex)
            paper_eqs.append({"latex": latex, "type": eq_type})

        # Pass equations as URL params to the static HTML file
        import base64
        eq_json = base64.b64encode(json.dumps(paper_eqs).encode()).decode()
        demo_url = f"/app/static/threejs_demo/index.html?equations_b64={eq_json}"
        st.iframe(demo_url, height=600)
    except Exception as e:
        st.error(f"3D Sandbox error: {e}")

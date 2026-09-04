<p align="center">
  <img src="examples/deepseek_mhc_renders/deepseek_mhc.gif" alt="Paper2Sim Demo" width="300"/>
</p>

<h1 align="center">Paper2Sim</h1>

<p align="center">
  <strong>arXiv → Equations → Animated Videos → 3D Sandbox</strong><br/>
  <em>AI-powered pipeline that turns academic papers into interactive math visualizations</em>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#3d-sandbox">3D Sandbox</a> ·
  <a href="#templates">Templates</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

---

## The Problem

Reading "Attention Is All You Need" and staring at the scaled dot-product formula:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

You can parse the symbols. But can you *see* it? Can you drag the matrices around, watch them multiply, and feel why the $\sqrt{d_k}$ scaling matters?

**Paper2Sim makes that possible.** Feed it any arXiv paper. It extracts every equation, generates Manim animations, and drops you into an interactive 3D sandbox where you can play with the math.

---

## Pipeline Overview

```mermaid
flowchart LR
    A[📄 arXiv URL / PDF] --> B[🔍 Extract Equations]
    B --> C[🧠 Classify & Map]
    C --> D[🎬 Render Manim Videos]
    C --> E[🌐 3D Interactive Sandbox]

    style A fill:#1e1e2e,stroke:#89b4fa,color:#cdd6f4
    style B fill:#1e1e2e,stroke:#a6e3a1,color:#cdd6f4
    style C fill:#1e1e2e,stroke:#f9e2af,color:#cdd6f4
    style D fill:#1e1e2e,stroke:#cba6f7,color:#cdd6f4
    style E fill:#1e1e2e,stroke:#f38ba8,color:#cdd6f4
```

### Stage 1: Equation Extraction

```mermaid
flowchart TD
    subgraph Input
        I1[arXiv URL] --> P1[Download PDF]
        I2[Upload PDF] --> P2[PyMuPDF Text]
        I3[arXiv Source] --> P3[Extract .tex]
    end

    subgraph Extraction
        P1 --> E[Regex + LLM Extraction]
        P2 --> E
        P3 --> E
        E --> F{Garbage Filter}
        F -->|corrupted Unicode| G[Discard]
        F -->|clean LaTeX| H[Equation List]
    end

    style Input fill:#181825,stroke:#585b70,color:#cdd6f4
    style Extraction fill:#181825,stroke:#585b70,color:#cdd6f4
    style G fill:#45475a,stroke:#f38ba8,color:#f38ba8
    style H fill:#1e1e2e,stroke:#a6e3a1,color:#a6e3a1
```

**How it works:**
1. **arXiv URL** → download PDF + optional `.tex` source
2. **PDF upload** → PyMuPDF extracts raw text
3. **Source upload** → regex pulls `equation`/`align` environments directly from LaTeX
4. **Garbage filter** rejects corrupted Unicode (>10% non-ASCII) that some PDFs produce
5. **LLM fallback** via Groq (`openai/gpt-oss-120b`) for equations the regex misses

### Stage 2: Classification & Template Mapping

```mermaid
flowchart LR
    EQ[Equation] --> CL{Classifier}
    CL -->|softmax/attention| AT[attention_heatmap]
    CL -->|multihead/multi-head| MH[transformer_block]
    CL -->|layer.?norm| LN[transformer_block]
    CL -->|embedding/lookup| EL[embedding_lookup]
    CL -->|matrix multiply| MM[matrix_multiply]
    CL -->|gradient/nabla| GD[gradient_descent]
    CL -->|conv/convolve| CV[convolution_1d]
    CL -->|loss/loss.*L| LS[loss_landscape]
    CL -->|sin/cos| LC[linear_combination]
    CL -->|softmax/distribution| SD[softmax_distribution]
    CL -->|other| PD[probability_distribution]

    style EQ fill:#1e1e2e,stroke:#89b4fa,color:#cdd6f4
    style CL fill:#1e1e2e,stroke:#f9e2af,color:#cdd6f4
```

Each equation is pattern-matched to one of **10 Manim templates**. The classifier checks attention/multihead/layernorm patterns first (before the generic `\frac` catch-all) to avoid misclassification.

### Stage 3: Video Rendering

```mermaid
flowchart LR
    T[Template + Params] --> R[Manim Renderer]
    R --> V[MP4 Video]
    R -->|error| F[Error Feedback]
    F --> R

    style T fill:#1e1e2e,stroke:#89b4fa,color:#cdd6f4
    style R fill:#1e1e2e,stroke:#cba6f7,color:#cdd6f4
    style V fill:#1e1e2e,stroke:#a6e3a1,color:#a6e3a1
    style F fill:#1e1e2e,stroke:#f38ba8,color:#f38ba8
```

- **10 pre-built Manim templates** — no LLM code generation needed
- **Parameterized** — each template accepts dynamic values from the equation
- **Per-equation videos** — each equation gets its own rendered MP4
- **Recursive fallback** — searches `media/videos/` at multiple directory depths

---

## 3D Sandbox

An interactive Three.js surface plotter that visualizes any equation as a 3D surface.

```mermaid
flowchart TD
    subgraph Sandbox
        E[Equation] --> P[Base64 Encode]
        P --> URL[URL Parameter]
        URL --> JS[JavaScript Parser]
        JS --> PAT[14 Pattern Categories]
        PAT --> SURF[Three.js Surface]
        SURF --> INTERACT[OrbitControls]
    end

    style Sandbox fill:#181825,stroke:#89b4fa,color:#cdd6f4
```

**Features:**
- **Auto-matches ANY equation** — pattern-matches 14 categories (softmax, exp, sin/cos, frac, matrix, ReLU, etc.)
- **No hardcoding** — unlike the original v1 which only worked for specific equations
- **Base64 transport** — equations encoded to avoid URL escaping issues with LaTeX backslashes
- **Three.js 0.137.0 bundled locally** — no CDN dependency (fixes ORB blocking)
- **OrbitControls** — drag to rotate, scroll to zoom, shift+drag to pan

---

## Templates

| Template | What It Shows | Trigger Patterns |
|----------|---------------|------------------|
| `matrix_multiply` | Matrix multiplication animation | `matrix`, `multiply`, `\cdot`, `\times` |
| `attention_heatmap` | Attention weight heatmap | `attention`, `softmax`, `scale` |
| `gradient_descent` | Gradient descent on loss surface | `gradient`, `nabla`, `\partial` |
| `convolution_1d` | 1D convolution operation | `conv`, `convolve`, `kernel` |
| `softmax_distribution` | Softmax probability distribution | `softmax`, `distribution`, `probability` |
| `embedding_lookup` | Embedding vector lookup | `embedding`, `lookup`, `vector` |
| `loss_landscape` | Loss function landscape | `loss`, `L=`, `L(`, `minimize` |
| `transformer_block` | Transformer block diagram | `multi-head`, `layer.?norm`, `feed.?forward` |
| `linear_combination` | Linear combination of vectors | `sin`, `cos`, `linear`, `combination` |
| `probability_distribution` | Probability distribution curve | `pdf`, `gaussian`, `normal`, fallback |

---

## Quickstart

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- System deps for Manim: `libcairo2-dev libpango1.0-dev libharfbuzz-dev libfribidi-dev libfontconfig-dev libfreetype-dev`
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Install

```bash
git clone https://github.com/Bappaditya-kuilya/paper2sim.git
cd paper2sim
uv sync

# Install Manim system dependencies (Ubuntu/Debian)
sudo apt install libcairo2-dev libpango1.0-dev libharfbuzz-dev libfribidi-dev libfontconfig-dev libfreetype-dev

# Set up API key
cp .env.example .env
# Edit .env → GROQ_API_KEY=gsk_...
```

### Run

```bash
uv run streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501).

### Usage

1. **Paste an arXiv URL** (e.g., `https://arxiv.org/abs/1706.03762`) or **upload a PDF**
2. Click **Extract Equations** — see all equations appear in the sidebar
3. Click **Render Videos** — Manim renders each equation as a separate MP4
4. Click **Open 3D Sandbox** — explore equations as interactive 3D surfaces

---

## Architecture

```mermaid
flowchart TB
    subgraph Frontend["Streamlit UI"]
        APP[app.py]
        SIDEBAR[Settings Sidebar]
    end

    subgraph Core["paper2sim Package"]
        CLIENT[client.py<br/>Groq API + PDF]
        EQ[equations.py<br/>Extract + Classify]
        ARXIV[arxiv.py<br/>URL Parsing]
        TPL[templates/<br/>10 Manim Scenes]
        PROMPTS[prompts/<br/>LLM Prompts]
        MODELS[models.py<br/>Pydantic Schemas]
    end

    subgraph External["External Services"]
        GROQ[Groq API<br/>openai/gpt-oss-120b]
        MANIM[Manim<br/>Video Renderer]
    end

    subgraph Static["Static Assets"]
        THREEJS[threejs_demo/<br/>3D Sandbox HTML]
        LIB[lib/<br/>Three.js 0.137.0]
    end

    APP --> CLIENT
    APP --> EQ
    APP --> ARXIV
    CLIENT --> GROQ
    EQ --> TPL
    TPL --> MANIM
    CLIENT --> PROMPTS
    APP --> THREEJS
    THREEJS --> LIB

    style Frontend fill:#181825,stroke:#89b4fa,color:#cdd6f4
    style Core fill:#181825,stroke:#a6e3a1,color:#cdd6f4
    style External fill:#181825,stroke:#cba6f7,color:#cdd6f4
    style Static fill:#181825,stroke:#f9e2af,color:#cdd6f4
```

---

## Tech Stack

```mermaid
flowchart LR
    subgraph AI["AI & LLM"]
        GROQ[Groq API]
        OPENAI[OpenAI SDK]
    end

    subgraph Viz["Visualization"]
        MANIM[Manim]
        THREEJS[Three.js]
    end

    subgraph Data["Data & PDF"]
        PYMUPDF[PyMuPDF]
        LATEX[LaTeX Source]
    end

    subgraph UI["Frontend"]
        STREAMLIT[Streamlit]
    end

    AI --> Viz
    Data --> AI
    Viz --> UI

    style AI fill:#1e1e2e,stroke:#cba6f7,color:#cdd6f4
    style Viz fill:#1e1e2e,stroke:#a6e3a1,color:#cdd6f4
    style Data fill:#1e1e2e,stroke:#89b4fa,color:#cdd6f4
    style UI fill:#1e1e2e,stroke:#f9e2af,color:#cdd6f4
```

| Component | Purpose |
|-----------|---------|
| **Groq API** | Fast inference for equation extraction + classification |
| **Manim** | 3Blue1Brown-style mathematical animation engine |
| **Three.js** | Interactive 3D surface plotting in the sandbox |
| **PyMuPDF** | PDF text extraction |
| **Streamlit** | Web UI with sidebar controls |
| **Pydantic** | Schema validation for LLM outputs |

---

## API Usage

```python
from paper2sim import Paper2SimBreakdownClient, Paper2SimAnimationClient
from paper2sim.equations import extract_equations_from_text, classify_and_map

# Extract equations from text
equations = extract_equations_from_text(raw_text)
mappings = classify_and_map(equations)

# Or use the Groq client directly
from openai import OpenAI
from paper2sim.client import Paper2SimBreakdownClient

client = Paper2SimBreakdownClient(
    api_key="gsk_...",
    model="openai/gpt-oss-120b"
)
```

---

## Roadmap

```mermaid
flowchart LR
    subgraph Now["v0.1 - Current"]
        A[Equation extraction]
        B[10 Manim templates]
        C[3D Sandbox]
        D[arXiv integration]
    end

    subgraph Next["v0.2 - Next"]
        E[TTS narration]
        F[Full-paper breakdown]
        G[Custom template upload]
        H[Export as GIF]
    end

    subgraph Future["v1.0 - Vision"]
        I[RL-trained Manim agent]
        J[Video feedback loop]
        K[Multi-language]
        L[Browser extension]
    end

    Now --> Next --> Future

    style Now fill:#1e1e2e,stroke:#a6e3a1,color:#a6e3a1
    style Next fill:#1e1e2e,stroke:#f9e2af,color:#f9e2af
    style Future fill:#1e1e2e,stroke:#cba6f7,color:#cba6f7
```

---

## License

[CC-BY-NC-SA-4.0](LICENSE) — free to share and adapt for non-commercial purposes with attribution.

---

<p align="center">
  Built with curiosity and too much coffee.
</p>

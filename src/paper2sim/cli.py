"""CLI for paper2sim — extract equations and render 3D visualizations."""

import typer
from pathlib import Path
from typing import Optional

app = typer.Typer(
    name="paper2sim",
    help="Extract equations from papers and visualize them interactively",
    no_args_is_help=True,
)


@app.command()
def extract(
    url: Optional[str] = typer.Option(None, "--url", "-u", help="arXiv URL to extract from"),
    equation: Optional[str] = typer.Option(None, "--equation", "-e", help="Plain text equation"),
    output: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file path"),
    format: str = typer.Option("json", "--format", "-f", help="Output format (json, text)"),
):
    """Extract equations from a paper or text."""
    from paper2sim.equations import classify_equation

    if not url and not equation:
        typer.echo("Error: Provide either --url or --equation", err=True)
        raise typer.Exit(1)

    if equation:
        eq_type = classify_equation(equation)
        result = {
            "equations": [{"latex": equation, "type": eq_type}],
            "source": "text",
        }
    else:
        typer.echo(f"Extracting from {url}...")
        result = {
            "equations": [],
            "source": url,
            "status": "url_extraction_not_implemented",
        }

    if output:
        output.write_text(str(result))
        typer.echo(f"Saved to {output}")
    else:
        typer.echo(str(result))


@app.command()
def render(
    equation: str = typer.Option(..., "--equation", "-e", help="Equation to render"),
    model: str = typer.Option("auto", "--model", "-m", help="Model type (auto, trigonometric, polynomial, etc.)"),
    output: Optional[Path] = typer.Option(None, "--output", "-o", help="Output directory"),
):
    """Render an equation as a 3D visualization."""
    from paper2sim.equations import classify_equation

    if model == "auto":
        model = classify_equation(equation)

    typer.echo(f"Rendering {equation} as {model}...")
    typer.echo("Note: 3D rendering requires the web frontend")


@app.command()
def models():
    """List available model types."""
    from paper2sim.model_registry import list_models

    available = list_models()
    for model in available:
        typer.echo(f"  {model['type']}: {model['renderer']}")


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind"),
    port: int = typer.Option(8000, "--port", "-p", help="Port to listen on"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
):
    """Start the API server."""
    import uvicorn
    typer.echo(f"Starting server on {host}:{port}...")
    uvicorn.run("paper2sim.api:app", host=host, port=port, reload=reload)


def main():
    app()


if __name__ == "__main__":
    main()

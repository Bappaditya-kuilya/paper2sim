"""Paper2Sim CLI — command-line interface for extraction and rendering."""

import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(description="Paper2Sim — extract and visualize equations")
    sub = parser.add_subparsers(dest="command")

    extract = sub.add_parser("extract", help="Extract equations from a source")
    extract.add_argument("source", choices=["arxiv", "text", "pdf"])
    extract.add_argument("--url", help="arXiv URL")
    extract.add_argument("--text", help="Plain text equation")
    extract.add_argument("--pdf", help="Path to PDF file")

    render = sub.add_parser("render", help="Render an equation")
    render.add_argument("equation", help="Equation to render")
    render.add_argument("--template", default="generic", help="Template name")
    render.add_argument("--output", default="output.mp4", help="Output path")

    args = parser.parse_args()

    if args.command == "extract":
        if args.source == "arxiv" and args.url:
            from paper2sim.arxiv import parse_arxiv_url
            arxiv_id = parse_arxiv_url(args.url)
            print(json.dumps({"arxiv_id": arxiv_id}, indent=2))
        elif args.source == "text" and args.text:
            from paper2sim.equations import classify_equation
            eq_type = classify_equation(args.text)
            print(json.dumps({"equation": args.text, "type": eq_type}, indent=2))
        else:
            parser.print_help()
            sys.exit(1)
    elif args.command == "render":
        print(json.dumps({"equation": args.equation, "template": args.template, "output": args.output}, indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

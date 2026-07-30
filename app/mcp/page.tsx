import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MCP Server",
  description:
    "Query the TaxOSS index from Claude, Cursor, or any MCP client. Free, read-only, no API key.",
};

const ENDPOINT = "https://tax-oss.com/api/mcp";

const CLIENT_CONFIG = `{
  "mcpServers": {
    "taxoss": {
      "url": "${ENDPOINT}"
    }
  }
}`;

const CLAUDE_CODE = `claude mcp add --transport http taxoss ${ENDPOINT}`;

export default function McpPage() {
  return (
    <div className="container">
      <div className="narrow stack-24 prose">
        <div className="section-head">
          <span className="eyebrow">For AI agents</span>
          <h1 className="display-m">The index, as an MCP server.</h1>
          <p className="body-l">
            TaxOSS speaks the Model Context Protocol. Point any MCP client at
            one URL and your agent can search {""}
            open-source tax software by category, jurisdiction, and tax
            subject — the same index as this site, structured for tools.
            Read-only, no API key, free.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Endpoint</h3>
          <div className="token-box">
            <code>{ENDPOINT}</code>
          </div>
          <p className="form-hint">
            Streamable HTTP transport, stateless. Works with Claude
            (Desktop/Code), Cursor, VS Code, and any client speaking MCP
            2025-03-26 or later.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Claude Code</h3>
          <pre style={{ margin: 0 }}>
            <code>{CLAUDE_CODE}</code>
          </pre>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>JSON client config (Cursor, VS Code, Claude Desktop)</h3>
          <pre style={{ margin: 0 }}>
            <code>{CLIENT_CONFIG}</code>
          </pre>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Tools</h3>
          <div className="panel card" style={{ padding: 18 }}>
            <div className="kv">
              <span className="k mono">search_projects</span>
              <span className="v" style={{ fontFamily: "var(--font-sans)", textAlign: "right" }}>
                Free text + category, jurisdiction, and tax-subject filters
              </span>
            </div>
            <div className="kv">
              <span className="k mono">get_project</span>
              <span className="v" style={{ fontFamily: "var(--font-sans)", textAlign: "right" }}>
                Full record for one project, by owner/name or HF URL
              </span>
            </div>
            <div className="kv">
              <span className="k mono">list_categories</span>
              <span className="v" style={{ fontFamily: "var(--font-sans)", textAlign: "right" }}>
                The 20 tool-type categories, with counts
              </span>
            </div>
            <div className="kv">
              <span className="k mono">list_facets</span>
              <span className="v" style={{ fontFamily: "var(--font-sans)", textAlign: "right" }}>
                19 jurisdictions and 12 tax subjects, with counts
              </span>
            </div>
          </div>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Try asking your agent</h3>
          <p className="body">
            “Find an open-source VeriFactu library for Spain” · “Which MCP
            servers exist for German taxes?” · “Show me crypto tax calculators
            with the most stars” · “What open-source tax datasets exist for
            training?”
          </p>
        </div>

        <p className="body-s">
          The index itself lists {""}
          <Link href="/?category=mcp-servers" className="accent">
            tax MCP servers
          </Link>{" "}
          from the wider ecosystem — this endpoint is TaxOSS eating its own
          cooking.
        </p>
      </div>
    </div>
  );
}

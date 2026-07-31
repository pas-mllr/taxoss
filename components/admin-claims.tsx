"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminGrantClaim, adminReleaseClaim } from "@/app/actions";
import type { AdminProjectRow } from "@/lib/projects";
import type { Member } from "@/lib/users";
import { sourceLabel } from "@/lib/sources";
import { IconSearch, IconShield, IconTrash } from "@/components/icons";
import {
  AdminSearchPicker,
  type AdminPickerOption,
} from "@/components/admin-search-picker";

function claimantLabel(p: AdminProjectRow): string {
  return p.claimantName ?? p.claimantUsername ?? p.claimedById ?? "someone";
}

function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const TABLE_PAGE = 50;

type StatusFilter = "" | "claimed" | "unclaimed";

/**
 * Admin claim workbench: a grant form fed by searchable pickers, above a
 * filterable table of every project and its claim state. Both server actions
 * re-check admin rights, so this component is convenience, not security.
 */
export function AdminClaims({
  projects,
  members,
  projectHrefs,
}: {
  projects: AdminProjectRow[];
  members: Member[];
  /** Detail-page path per project id, built server-side. */
  projectHrefs: Record<number, string>;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<number | "">("");
  const [memberId, setMemberId] = useState<string>("");
  const [reassign, setReassign] = useState(false);
  const [notice, setNotice] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLDivElement>(null);

  // Table controls.
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [source, setSource] = useState("");
  const [shownCount, setShownCount] = useState(TABLE_PAGE);

  const selected = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );
  const claimed = useMemo(
    () => projects.filter((p) => p.claimedById !== null),
    [projects],
  );
  const claimants = useMemo(
    () => new Set(claimed.map((p) => p.claimedById)).size,
    [claimed],
  );

  const projectOptions = useMemo<AdminPickerOption[]>(
    () =>
      projects.map((p) => ({
        value: String(p.id),
        label: `${p.owner}/${p.repo}`,
        hint: p.claimedById
          ? `claimed · ${claimantLabel(p)}`
          : sourceLabel(p.source),
      })),
    [projects],
  );
  const memberOptions = useMemo<AdminPickerOption[]>(
    () => members.map((m) => ({ value: m.id, label: m.label })),
    [members],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (status === "claimed" && !p.claimedById) return false;
      if (status === "unclaimed" && p.claimedById) return false;
      if (source && p.source !== source) return false;
      if (!needle) return true;
      return [
        `${p.owner}/${p.repo}`,
        p.name,
        p.claimantName ?? "",
        p.claimantUsername ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [projects, query, status, source]);
  const shown = filtered.slice(0, shownCount);

  /** Prefill the grant form from a table row and bring it into view. */
  function startGrant(p: AdminProjectRow) {
    setProjectId(p.id);
    setReassign(p.claimedById !== null);
    setNotice(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function grant() {
    if (projectId === "" || !memberId) return;
    setNotice(null);
    startTransition(async () => {
      const result = await adminGrantClaim({
        projectId: Number(projectId),
        clerkUserId: memberId,
        reassign,
      });
      if (result.ok) {
        setNotice({
          kind: "ok",
          text: result.reassigned
            ? `Reassigned to ${result.claimant}.`
            : `Granted to ${result.claimant}.`,
        });
        setProjectId("");
        setMemberId("");
        setReassign(false);
        router.refresh();
      } else {
        setNotice({ kind: "error", text: result.error });
      }
    });
  }

  function release(p: AdminProjectRow) {
    if (
      !window.confirm(
        `Release ${p.owner}/${p.repo} from ${claimantLabel(p)}? Their maintainer grants go with it.`,
      )
    ) {
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await adminReleaseClaim(p.id);
      if (result.ok) {
        setNotice({ kind: "ok", text: `Released ${p.owner}/${p.repo}.` });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: result.error });
      }
    });
  }

  return (
    <div className="stack-24">
      <div className="admin-stats">
        <div className="stat-tile">
          <span className="stat-v">{projects.length}</span>
          <span className="stat-l">Projects indexed</span>
        </div>
        <div className="stat-tile is-violet">
          <span className="stat-v">{claimed.length}</span>
          <span className="stat-l">Claimed</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{projects.length - claimed.length}</span>
          <span className="stat-l">Unclaimed</span>
        </div>
        <div className="stat-tile is-blue">
          <span className="stat-v">{claimants}</span>
          <span className="stat-l">Claimants</span>
        </div>
      </div>

      <div
        ref={formRef}
        className="glass-strong panel"
        style={{ borderRadius: "var(--radius-xl)", scrollMarginTop: 84 }}
      >
        <div className="stack-16">
          <div className="stack-8">
            <label className="form-label" htmlFor="admin-project">
              Project
            </label>
            <AdminSearchPicker
              id="admin-project"
              placeholder="Search projects by owner or name…"
              options={projectOptions}
              value={projectId === "" ? "" : String(projectId)}
              onChange={(v) => setProjectId(v === "" ? "" : Number(v))}
            />
            {selected?.claimedById && (
              <p className="form-hint">
                Already claimed by {claimantLabel(selected)}. Granting it to
                someone else needs the reassign box below.
              </p>
            )}
          </div>

          <div className="stack-8">
            <label className="form-label" htmlFor="admin-member">
              Grant to
            </label>
            <AdminSearchPicker
              id="admin-member"
              placeholder="Search members by name or email…"
              options={memberOptions}
              value={memberId}
              onChange={setMemberId}
            />
            <p className="form-hint">
              Everyone who has signed in, newest first. If the person you want
              isn&apos;t here, they haven&apos;t signed in yet — a claim can
              only attach to an existing account.
            </p>
          </div>

          <label
            className={`choice-chip${reassign ? " is-checked" : ""}`}
            style={{ alignSelf: "flex-start" }}
          >
            <input
              type="checkbox"
              checked={reassign}
              onChange={(e) => setReassign(e.target.checked)}
            />
            Reassign if already claimed
          </label>

          <div className="stack-8">
            <button
              type="button"
              className="btn btn-primary"
              onClick={grant}
              disabled={pending || projectId === "" || !memberId}
            >
              <IconShield />
              {pending ? "Working…" : "Grant claim"}
            </button>
            {notice && (
              <div className={`notice is-${notice.kind === "ok" ? "success" : "error"}`}>
                {notice.text}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stack-16">
        <div className="admin-toolbar glass">
          <div className="field" role="search">
            <IconSearch />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShownCount(TABLE_PAGE);
              }}
              placeholder="Filter by project or claimant…"
              aria-label="Filter projects by name or claimant"
            />
          </div>
          <select
            className="select"
            aria-label="Filter by claim status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setShownCount(TABLE_PAGE);
            }}
          >
            <option value="">All statuses</option>
            <option value="claimed">Claimed</option>
            <option value="unclaimed">Unclaimed</option>
          </select>
          <select
            className="select"
            aria-label="Filter by source"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setShownCount(TABLE_PAGE);
            }}
          >
            <option value="">All sources</option>
            <option value="github">GitHub</option>
            <option value="huggingface">Hugging Face</option>
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Source</th>
                <th>Status</th>
                <th>Claimant</th>
                <th>Claimed</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-none">
                    No project matches these filters.
                  </td>
                </tr>
              ) : (
                shown.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={projectHrefs[p.id]} className="mono">
                        {p.owner}/{p.repo}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {sourceLabel(p.source)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${p.claimedById ? "is-claimed" : "is-unclaimed"}`}
                      >
                        <span className="dot" />
                        {p.claimedById ? "Claimed" : "Unclaimed"}
                      </span>
                    </td>
                    <td>{p.claimedById ? claimantLabel(p) : "—"}</td>
                    <td className="is-date">
                      {p.claimedAt ? day(p.claimedAt) : "—"}
                    </td>
                    <td className="is-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startGrant(p)}
                        disabled={pending}
                      >
                        <IconShield />
                        {p.claimedById ? "Reassign" : "Grant"}
                      </button>
                      {p.claimedById && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => release(p)}
                          disabled={pending}
                        >
                          <IconTrash />
                          Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-foot">
          <span className="meta-mono">
            Showing {shown.length} of {filtered.length} projects
          </span>
          {filtered.length > shownCount && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShownCount((n) => n + TABLE_PAGE)}
            >
              Show more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

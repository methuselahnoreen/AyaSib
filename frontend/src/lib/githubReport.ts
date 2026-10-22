// Feature: ayasib-andam-na
// Pure GitHub-issue URL builder for the client-only reporting path. No network, no secret.
// The repo comes from the build-time NEXT_PUBLIC_GITHUB_REPO constant, passed in by the caller.

export interface GithubReportInput {
  repo: string | null;
  serviceId: string;
  field?: string;
  explanation?: string;
  source?: string;
}

/**
 * Builds a prefilled GitHub "new issue" URL for maintainer review, or null when `repo` is unset.
 * All user/data values are URL-encoded. Returns:
 *   https://github.com/<owner>/<name>/issues/new?title=...&body=...
 */
export function buildGithubIssueUrl(input: GithubReportInput): string | null {
  const repo = (input.repo ?? "").trim();
  if (!repo) return null;

  const serviceId = (input.serviceId ?? "").trim();
  const field = (input.field ?? "").trim();
  const explanation = (input.explanation ?? "").trim();
  const source = (input.source ?? "").trim();

  const title = `Outdated info: ${serviceId}`;

  const bodyLines = [
    `Service id: ${serviceId}`,
    `Field questioned: ${field || "(not specified)"}`,
    "",
    "Explanation:",
    explanation || "(none provided)",
    "",
    `Source: ${source || "(none provided)"}`,
    "",
    "Reported via AyaSib. A maintainer reviews this against an official source before any KB change.",
  ];
  const body = bodyLines.join("\n");

  const query = `title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  return `https://github.com/${repo}/issues/new?${query}`;
}

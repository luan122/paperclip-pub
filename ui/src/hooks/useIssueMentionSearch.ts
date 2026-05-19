import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "../api/search";
import { queryKeys } from "../lib/queryKeys";
import type { IssueMentionOption } from "../components/MarkdownEditor";

const ISSUE_MENTION_SEARCH_DEBOUNCE_MS = 250;
const ISSUE_MENTION_SEARCH_LIMIT = 10;

export function useIssueMentionSearch(companyId: string | null | undefined) {
  const [rawQuery, setRawQuery] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (rawQuery === null) {
      setDebouncedQuery(null);
      return;
    }
    const id = setTimeout(() => setDebouncedQuery(rawQuery), ISSUE_MENTION_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const { data } = useQuery({
    queryKey: queryKeys.companySearch.search(
      companyId ?? "",
      debouncedQuery ?? "",
      "issues",
      ISSUE_MENTION_SEARCH_LIMIT,
      0,
    ),
    queryFn: () =>
      searchApi.search(companyId!, {
        q: debouncedQuery!,
        scope: "issues",
        limit: ISSUE_MENTION_SEARCH_LIMIT,
      }),
    enabled: Boolean(companyId && debouncedQuery !== null),
    staleTime: 30_000,
  });

  const issueMentions = useMemo<IssueMentionOption[]>(
    () =>
      (data?.results ?? [])
        .filter((r) => r.type === "issue" && r.issue?.identifier)
        .map((r) => ({
          id: r.id,
          kind: "issue" as const,
          identifier: r.issue!.identifier!,
          title: r.title,
          status: r.issue!.status,
        })),
    [data],
  );

  const onIssueSearch = useCallback((query: string | null) => {
    setRawQuery(query);
  }, []);

  return { issueMentions, onIssueSearch };
}

import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useSessions } from "../session";
import { useSources } from "../useSources";
import {
  Action,
  Columns,
  Copy,
  Divider,
  Field,
  Page,
  Section,
  useColors,
} from "../ui";
import { locationLabel } from "../../../frontend/src/features/sources/api";

export default function Sources() {
  const { options } = useSessions();
  const library = useSources(options.url);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const c = useColors();
  return (
    <Page>
      <Copy muted>
        Upload synthetic slides, papers, or notes, then search their passages.
        Fact-check and generated questions are still unavailable.
      </Copy>
      {!options.url.trim() && (
        <Action
          label="Set Analysis Server"
          onPress={() => router.push("/settings")}
        />
      )}
      {!!library.error && (
        <Copy accessibilityRole="alert" style={{ color: c.error }}>
          {library.error}
        </Copy>
      )}
      <Columns
        main={
          <>
            <Section
              title="Your sources"
              footer="PDF, PPTX, DOCX, TXT or MD · 25 MB each. Scanned PDFs need a text layer. Files are uploaded to your configured server."
            >
              <Action
                label={library.busy ? "Working…" : "Upload Documents"}
                icon="doc.badge.plus"
                disabled={!library.collection || library.busy}
                onPress={() => void library.upload()}
              />
              <Action
                secondary
                label="Refresh"
                icon="arrow.clockwise"
                disabled={!library.collection || library.busy}
                onPress={library.refresh}
              />
              {!library.sources.length && <Copy muted>No sources loaded.</Copy>}
              {library.sources.map((source) => (
                <View key={source.id} style={{ gap: 8 }}>
                  <Divider />
                  <Copy style={{ fontWeight: "600" }}>{source.filename}</Copy>
                  <Copy caption muted>
                    {source.status === "ready"
                      ? `Ready · ${source.chunk_count} passages`
                      : source.status === "failed"
                        ? `Failed · ${source.error ?? "Try uploading again"}`
                        : source.status === "queued"
                          ? "Waiting to be indexed…"
                          : "Reading and indexing…"}
                  </Copy>
                  <Action
                    destructive
                    label={`Remove ${source.filename}`}
                    disabled={library.busy}
                    onPress={() =>
                      Alert.alert(
                        "Delete source from server?",
                        "This removes the document and indexed passages for every device using this collection.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => void library.remove(source.id),
                          },
                        ],
                      )
                    }
                  />
                </View>
              ))}
            </Section>
            {library.hits && (
              <Section
                title="Matching passages"
                footer="Search matches are evidence to read, not a verdict that a claim is true or false."
              >
                {!library.hits.length && (
                  <Copy muted>No matching passages.</Copy>
                )}
                {library.hits.map((hit) => (
                  <View key={hit.chunk_id} style={{ gap: 8 }}>
                    <Copy style={{ fontWeight: "600" }}>{hit.filename}</Copy>
                    <Copy caption muted>
                      {locationLabel(hit.location)} ·{" "}
                      {hit.matched_by
                        .map((by) => (by === "vector" ? "meaning" : "keyword"))
                        .join(" + ")}
                    </Copy>
                    <Copy selectable>{hit.text}</Copy>
                    <Divider />
                  </View>
                ))}
              </Section>
            )}
          </>
        }
        side={
          <>
            <Section title="Find evidence">
              <Field
                label="Question or claim"
                value={query}
                onChangeText={setQuery}
                maxLength={2000}
                multiline
              />
              <Action
                label="Search Sources"
                icon="magnifyingglass"
                disabled={
                  library.busy ||
                  !query.trim() ||
                  !library.sources.some((s) => s.status === "ready")
                }
                onPress={() => void library.search(query)}
              />
            </Section>
            {!!library.collection && (
              <Section
                title="Use the same sources on web"
                footer="Collection IDs group documents; they are not a login or access-control secret. Use the same server and ID on both devices."
              >
                <Copy selectable caption>
                  {library.collection}
                </Copy>
                <Field
                  label="Collection ID from web"
                  value={collection}
                  onChangeText={setCollection}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Action
                  secondary
                  label="Open Collection"
                  disabled={library.busy || !collection.trim()}
                  onPress={() => void library.connect(collection)}
                />
              </Section>
            )}
            <Action
              secondary
              label="Server Settings"
              icon="slider.horizontal.3"
              disabled={library.busy}
              onPress={() => router.push("/settings")}
            />
          </>
        }
      />
    </Page>
  );
}

"""Fixed practice explanations, selected by evidence rather than model prose."""

# Each entry: explanation (DE, EN), next step (DE, EN). These are practice
# suggestions, not measured audience reactions or validated quality judgments.
COACHING = {
    "pace_fast": (
        ("Schnellere Passagen können Wortenden und Gedankenübergänge verwischen. Prüfe beim Anhören, ob das hier passiert.",
         "Faster passages can blur word endings and transitions between ideas. Listen for that at this moment."),
        ("Teile den Satz in Sinnabschnitte. Sprich die Kernaussage erneut und pausiere vor dem nächsten Gedanken.",
         "Split the sentence into thought groups. Repeat the main point and pause before the next idea.")),
    "pace_slow": (
        ("Ein langsamerer Abschnitt kann eine Aussage betonen. Wenn er ungeplant war, prüfe, ob der Gedanke ins Stocken gerät.",
         "A slower passage can emphasize a point. If it was unplanned, check whether the thought loses its flow."),
        ("Formuliere den Gedanken als kurzen Satz und sprich ihn zusammenhängend. Behalte absichtliche Betonungen bei.",
         "Put the thought into one short sentence and say it as a connected phrase. Keep deliberate emphasis.")),
    "pace": (
        ("Ein Tempowechsel wurde erfasst, seine Richtung ist nicht dokumentiert. Prüfe im Audio, ob er die Gliederung unterstützt.",
         "A pace change was recorded, but its direction is not documented. Check in the audio whether it supports the phrasing."),
        ("Höre den Satz an und sprich ihn erneut in Sinnabschnitten mit einer Pause zwischen den Gedanken.",
         "Listen to the sentence and repeat it in thought groups with a pause between ideas.")),
    "volume_quiet": (
        ("Ein niedrigerer Mikrofonpegel kann Wörter schwerer verständlich machen. Auch ein anderer Mikrofonabstand kann den Pegel ändern.",
         "A lower microphone level can make words harder to distinguish. A change in microphone distance can also change the level."),
        ("Halte den Mikrofonabstand gleich und wiederhole den Satz mit tragfähiger Stimme, ohne zu pressen. Höre beide Stellen an.",
         "Keep microphone distance steady and repeat the sentence with a clear, comfortable voice. Compare both passages.")),
    "volume_loud": (
        ("Ein höherer Mikrofonpegel kann die Betonung verändern; er belegt keine Übersteuerung. Prüfe Lautstärke und Abstand im Replay.",
         "A higher microphone level can change emphasis; it does not establish clipping. Check volume and distance in the replay."),
        ("Halte den Abstand gleich und sprich den Satz mit entspannterer Lautstärke erneut. Behalte beabsichtigte Betonungen bei.",
         "Keep the distance steady and repeat the sentence at a more relaxed volume. Keep intentional emphasis.")),
    "volume": (
        ("Eine Pegeländerung wurde erfasst, ihre Richtung ist nicht dokumentiert. Prüfe im Replay auch den Mikrofonabstand.",
         "A level change was recorded, but its direction is not documented. Check microphone distance in the replay as well."),
        ("Halte den Mikrofonabstand gleich, wiederhole den Satz mit bequemer Lautstärke und vergleiche die Aufnahmen.",
         "Keep microphone distance steady, repeat the sentence at a comfortable volume, and compare the recordings.")),
    "pitch": (
        ("Wenig Tonhöhenvariation kann Schlüsselwörter weniger deutlich absetzen. Das ist keine Aussage über Emotion oder Interesse.",
         "Little pitch variation can make key words less distinct. This says nothing about emotion or interest."),
        ("Wähle ein Schlüsselwort pro Satz, betone es mit der Stimme und lasse danach eine kurze Pause.",
         "Choose one key word per sentence, emphasize it with your voice, and leave a short pause afterwards.")),
    "filler": (
        ("Einzelne Füllwörter sind normal. Prüfe, ob der Transkript-Marker hier einen Gedanken unterbricht; die Erkennung kann Wörter auslassen.",
         "Occasional fillers are normal. Check whether this transcript marker interrupts a thought; recognition can omit words."),
        ("Prüfe das Wort im Audio. Wenn es dich stört, ersetze es beim Wiederholen durch eine stille Denkpause.",
         "Check the word against the audio. If you want to change it, replace it with a silent thinking pause when repeating the sentence.")),
    "repetition": (
        ("Ein wiederholter Wortansatz kann einen Satz unterbrechen, aber auch beabsichtigt oder ein Erkennungsfehler sein.",
         "A repeated word start can interrupt a sentence, but may also be intentional or a recognition error."),
        ("Höre den Wortansatz an. Wenn er ungeplant war, pausiere kurz und beginne mit der Kernaussage neu.",
         "Listen to the repeated start. If it was unplanned, pause briefly and restart with the main point.")),
    "pause_mid_sentence": (
        ("Die Pause liegt laut Transkript innerhalb eines Satzes. Sie kann den Zusammenhang unterbrechen; Satzzeichen und Absicht bleiben zu prüfen.",
         "The transcript places this pause inside a sentence. It can interrupt the connection between ideas; check punctuation and whether it was intentional."),
        ("Wenn die Pause ungeplant war, notiere ein Stichwort und übe den Satz als einen Gedanken. Setze die Pause danach.",
         "If the pause was unplanned, note a keyword and practise the sentence as one thought. Put the pause after it.")),
    "pause_boundary": (
        ("Die Pause liegt nach einem Satzzeichen im Transkript. Solche Pausen können Gedanken voneinander trennen; die Satzgrenze ist eine ASR-Heuristik.",
         "The pause follows sentence-ending punctuation in the transcript. Such pauses can separate ideas; the sentence boundary is an ASR heuristic."),
        ("Prüfe die Satzgrenze im Audio und behalte den Abstand zwischen abgeschlossenen Gedanken bei, wenn er passt.",
         "Check the sentence boundary against the audio and keep the space between complete thoughts where it fits.")),
    "pause": (
        ("Eine Pause allein ist kein Problem: sie kann Raum zum Denken schaffen. Aus dem Audiosignal geht ihre Absicht nicht hervor.",
         "A pause alone is not a problem: it can leave room to think. The audio signal does not establish its purpose."),
        ("Höre die Sätze vor und nach der Pause an. Behalte sie bei, wenn sie passt; bei ungeplantem Stocken hilft ein Stichwort.",
         "Listen to the sentences around the pause. Keep it if it fits; if you lost your place, try a keyword cue.")),
    "posture": (
        ("Die Haltung weicht von deiner Referenz ab. Das ist nicht automatisch schlecht; prüfe, ob die Position für dich bequem und beabsichtigt war.",
         "Your posture differs from your reference. This is not automatically a problem; check whether the position was comfortable and intentional."),
        ("Stelle die Kamera fest auf. Wiederhole den Satz in deiner bequemen Ausgangshaltung und vergleiche beide Stellen.",
         "Keep the camera fixed. Repeat the sentence in your comfortable starting posture and compare the two moments.")),
    "posture_no_reference": (
        ("Eine Kameramessung liegt vor, aber keine Haltungsreferenz. Daraus lässt sich keine Abweichung von deiner Ausgangshaltung ableiten.",
         "A camera measurement is available, but no posture reference. It cannot establish a deviation from your starting posture."),
        ("Prüfe die Position im Video. Kalibriere vor dem nächsten Take in einer bequemen neutralen Haltung mit fester Kamera.",
         "Review the position in the video. Before the next take, calibrate in a comfortable neutral posture with the camera fixed.")),
    "arms": (
        ("Die gehaltene Armposition kann den Bewegungsraum für eine erklärende Geste einschränken. Daraus folgt keine Aussage über deine Persönlichkeit.",
         "The held arm position can limit the room for an explanatory gesture. It says nothing about your personality."),
        ("Löse die Arme, wenn es bequem ist, und probiere eine offene Handbewegung zur Kernaussage. Vergleiche die Varianten im Video.",
         "If comfortable, release your arms and try an open hand movement with the main point. Compare the versions in the video.")),
    "head": (
        ("Die Kopforientierung hat sich verändert. Prüfe, ob du länger zu Notizen oder Folien schaust; Blickkontakt wird damit nicht gemessen.",
         "Head orientation changed. Check whether you stay turned towards notes or slides; this does not measure eye contact."),
        ("Nutze ein kurzes Stichwort auf der Folie oder in den Notizen und wende dich für die Erklärung wieder nach vorn, wenn es passt.",
         "Use a short keyword on your slide or notes, then turn forwards again for the explanation where it fits.")),
    "coverage": (
        ("Hier fehlen auswertbare Kameradaten. Das ist eine Messgrenze und kein Hinweis auf schlechte Haltung.",
         "Usable camera data is missing here. This is a measurement limit, not evidence of poor posture."),
        ("Richte die Kamera so aus, dass der Oberkörper sichtbar ist, und prüfe Licht und verdeckte Körperpunkte vor dem nächsten Take.",
         "Frame your upper body and check lighting and obscured body points before the next take.")),
    "supports": (
        ("Die zitierte Fundstelle wurde geprüft und stützt laut Quellenvergleich diese konkrete Aussage. Sie bewertet nicht den gesamten Vortrag.",
         "The quoted passage was checked and supports this specific statement according to the source comparison. It does not assess the whole talk."),
        ("Behalte die belegte Formulierung bei und nenne Quelle und Seite oder Folie bei dieser Aussage.",
         "Keep the supported wording and name the source and page or slide with this statement.")),
    "contradicts": (
        ("Vortrag und Fundstelle enthalten unterschiedliche Angaben. Kläre den Unterschied, bevor du die Aussage erneut verwendest; auch Quellen können falsch sein.",
         "The talk and cited passage contain different information. Resolve the difference before reusing the statement; sources can also be wrong."),
        ("Vergleiche Wortlaut, Zahl und Geltungsbereich. Korrigiere die Aussage oder erkläre mit einem Beleg, warum die Quelle abweicht.",
         "Compare wording, numbers and scope. Correct the statement or explain with evidence why the source differs.")),
    "not_found": (
        ("In den geprüften Quellen fehlt ein Beleg. Das heißt nicht, dass die Aussage falsch ist; ihre Grundlage bleibt offen.",
         "No evidence was found in the checked sources. This does not mean the statement is false; its basis remains unresolved."),
        ("Ergänze einen passenden Beleg oder kennzeichne die Aussage als Annahme und grenze sie genauer ein.",
         "Add a relevant source or label the statement as an assumption and narrow its scope.")),
    "unchecked": (
        ("Der Quellenvergleich ist technisch nicht abgeschlossen. Daraus lässt sich kein inhaltlicher Fehler ableiten.",
         "The source comparison did not complete technically. This does not establish a content error."),
        ("Prüfe die Aussage selbst am Material und starte den Quellenvergleich erneut, wenn der Dienst verfügbar ist.",
         "Check the statement against your material yourself and retry the source comparison when the service is available.")),
}


def sentence_pause(event) -> bool:
    payload = event.payload
    return (event.type == "pause" and event.source == "asr" and event.duration_ms > 0
            and payload.get("mid_sentence") is False
            and isinstance(payload.get("before"), str)
            and payload["before"].rstrip().endswith((".", "!", "?", ":")))


def coaching_key(event, *, evaluable: bool, verified: bool) -> str | None:
    payload = event.payload
    if not evaluable:
        return "coverage"
    if event.type == "fact":
        verdict = payload.get("verdict")
        if verdict in {"supports", "contradicts"} and verified:
            return verdict
        return "not_found" if verdict == "not_found" and payload.get("checked") else "unchecked"
    if event.type == "pause":
        return ("pause_boundary" if sentence_pause(event) else "pause_mid_sentence"
                if event.source == "asr" and payload.get("mid_sentence") is True else "pause")
    if event.type in {"pace", "volume"}:
        key = f"{event.type}_{payload.get('direction')}"
        return key if key in COACHING else event.type
    if event.type == "filler":
        return "repetition" if payload.get("kind") == "repetition" else "filler"
    if event.type == "pitch":
        return "pitch"
    kind = payload.get("kind")
    if kind == "arms-closed":
        return "arms"
    if kind in {"trunk-lateral", "shoulder-tilt", "head-lateral", "head-orientation"} and (
            payload.get("metric") or {}).get("baseline") is None:
        return "posture_no_reference"
    if kind in {"head-lateral", "head-orientation"}:
        return "head"
    if kind in {"trunk-lateral", "shoulder-tilt"}:
        return "posture"
    return None

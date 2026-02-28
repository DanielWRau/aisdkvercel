/**
 * Seed data for FormTemplates collection.
 *
 * Called automatically via Payload `onInit` hook.
 * Checksum-based: only inserts new templates, only updates existing ones
 * if seedChecksum matches (= admin has not manually edited).
 *
 * Override: SEED_FORCE=true env var forces update of all templates.
 */

import { createHash } from 'crypto'
import type { Payload } from 'payload'
import type { FormStructure } from '@/lib/form-structure'

type TemplateData = {
  name: string
  formularNummer: string
  sammlung: string
  description: string
  labels: { label: string }[]
  promptHinweise: string
  anwendungsschwelle: number
  pflicht: boolean
  sortOrder: number
  structure?: FormStructure
}

// ── Structures ─────────────────────────────────────────────────────────

const L214_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's1',
      nummer: '1',
      titel: 'Vergütung',
      festtext: 'Besondere Bedingungen:',
      felder: [
        {
          id: 'verguetung_bedingungen',
          label: 'Besondere Vergütungsregelungen',
          type: 'text',
          beschreibung: 'Besondere Vergütungsregelungen, z.B. Pauschal- oder Einheitspreise',
        },
        {
          id: 'abschlagszahlungen',
          label: 'Abschlagszahlungen vereinbart',
          type: 'boolean',
          beschreibung: 'Ob Abschlagszahlungen vereinbart sind',
        },
      ],
    },
    {
      id: 's2',
      nummer: '2',
      titel: 'Ausführungsfristen',
      felder: [],
      unterabschnitte: [
        {
          id: 's2_1',
          nummer: '2.1',
          titel: 'Beginn der Ausführung',
          festtext: 'Beginn der Ausführung:',
          felder: [
            {
              id: 'beginn_art',
              label: 'Art des Beginns',
              type: 'enum',
              optionen: [
                'Werktage nach Aufforderung',
                'Späteste Aufforderung am (Datum)',
                'Frühestens am (Datum)',
                'Werktage nach Zuschlagserteilung',
                'Spätestens am (Datum)',
              ],
              beschreibung: 'Art der Festlegung des Ausführungsbeginns',
            },
            {
              id: 'beginn_wert',
              label: 'Beginn-Wert',
              type: 'text',
              beschreibung: 'Anzahl Werktage oder Datum für den Ausführungsbeginn',
            },
          ],
        },
        {
          id: 's2_2',
          nummer: '2.2',
          titel: 'Vollendung der Ausführung in Werktagen',
          festtext: 'Vollendung der Ausführung in Werktagen nach Aufforderung, Zuschlagserteilung, etc.:\nSpätestens ___ Werktage nach Zuschlagserteilung',
          felder: [
            {
              id: 'vollendung_werktage',
              label: 'Werktage bis Vollendung',
              type: 'number',
              einheit: 'Werktage',
              beschreibung: 'Spätestens X Werktage nach Zuschlagserteilung',
              positionIndex: 0,
            },
            {
              id: 'einzelfristen_werktage',
              label: 'Einzelfristen (Werktage)',
              type: 'array',
              pflicht: false,
              beschreibung: 'Einzelfristen für Teilleistungen in Werktagen',
              spalten: [
                { id: 'bezeichnung', label: 'Bezeichnung', type: 'text' },
                { id: 'werktage', label: 'Werktage', type: 'number', einheit: 'Werktage' },
                { id: 'bezug', label: 'Bezug (nach)', type: 'text' },
              ],
              maxZeilen: 3,
            },
          ],
        },
        {
          id: 's2_3',
          nummer: '2.3',
          titel: 'Vollendung der Leistung nach Datum',
          festtext: 'Vollendung der Leistung nach Datum:\nSpätestens am ___',
          felder: [
            {
              id: 'vollendung_datum',
              label: 'Vollendungsdatum',
              type: 'date',
              pflicht: false,
              beschreibung: 'Spätestens am (Datum)',
              positionIndex: 0,
            },
            {
              id: 'einzelfristen_datum',
              label: 'Einzelfristen (Datum)',
              type: 'array',
              pflicht: false,
              beschreibung: 'Einzelfristen für Teilleistungen nach Datum',
              spalten: [
                { id: 'bezeichnung', label: 'Bezeichnung', type: 'text' },
                { id: 'datum', label: 'Datum', type: 'date' },
              ],
              maxZeilen: 3,
            },
          ],
        },
        {
          id: 's2_4',
          nummer: '2.4',
          titel: 'Weitere Fristenregelung',
          felder: [
            {
              id: 'weitere_fristen',
              label: 'Weitere Fristenregelung',
              type: 'text',
              pflicht: false,
              beschreibung: 'Zusätzliche Fristenregelungen, falls erforderlich',
            },
          ],
        },
      ],
    },
    {
      id: 's3',
      nummer: '3',
      titel: 'Abnahme',
      felder: [],
      unterabschnitte: [
        {
          id: 's3_1',
          nummer: '3.1',
          titel: 'Förmliche Abnahme',
          festtext: 'Die Leistung ist förmlich abzunehmen.',
          felder: [
            {
              id: 'foermliche_abnahme',
              label: 'Förmliche Abnahme erforderlich',
              type: 'boolean',
              beschreibung: 'Ob die Leistung förmlich abzunehmen ist',
            },
          ],
        },
        {
          id: 's3_2',
          nummer: '3.2',
          titel: 'Gefahrübergang',
          festtext: 'Die Gefahr geht, wenn nichts anderes vereinbart ist, auf den Auftraggeber über',
          felder: [
            {
              id: 'gefahruebergang',
              label: 'Gefahrübergang',
              type: 'enum',
              optionen: [
                'bei Lieferleistungen mit der Übernahme an der Anlieferungsstelle',
                'bei Aufbauleistungen mit der Abnahme',
              ],
              beschreibung: 'Zeitpunkt des Gefahrübergangs',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      nummer: '4',
      titel: 'Vertragsstrafen',
      felder: [],
      unterabschnitte: [
        {
          id: 's4_1',
          nummer: '4.1',
          titel: 'Überschreitung der Ausführungsfristen',
          festtext: 'Bei Überschreitung der Ausführungsfristen\nfür ___ ___ ___\nder Leistung hat der Auftragnehmer für jeden Werktag, um den eine Frist überschritten wird, eine Vertragsstrafe in Höhe von\n___ % vom Wert desjenigen Teils der Leistung, der nicht genutzt werden kann, zu zahlen.',
          felder: [
            {
              id: 'vertragsstrafe_bezugsfrist',
              label: 'Bezugsfrist',
              type: 'enum',
              optionen: ['Beginn', 'Vollendung', 'Einzelfrist'],
              beschreibung: 'Bezug: Beginn, Vollendung oder Einzelfrist',
              kontextImFesttext: 'für ☐ Beginn ☐ Vollendung ☐ Einzelfrist',
              positionIndex: 0,
            },
            {
              id: 'vertragsstrafe_bezug_2',
              label: 'Zweite Bezugsfrist',
              type: 'text',
              pflicht: false,
              kontextImFesttext: 'Optionale zweite Bezugsfrist',
              positionIndex: 1,
            },
            {
              id: 'vertragsstrafe_bezug_3',
              label: 'Dritte Bezugsfrist',
              type: 'text',
              pflicht: false,
              kontextImFesttext: 'Optionale dritte Bezugsfrist',
              positionIndex: 2,
            },
            {
              id: 'vertragsstrafe_prozentsatz',
              label: 'Prozentsatz je Werktag',
              type: 'percentage',
              einheit: 'v.H.',
              beschreibung: 'Prozentsatz der Vertragsstrafe je Werktag Überschreitung',
              positionIndex: 3,
            },
          ],
        },
        {
          id: 's4_2',
          nummer: '4.2',
          titel: 'Obergrenze',
          festtext: 'Die Summe der zu zahlenden Vertragsstrafenbeiträge wird auf insgesamt ___ % der Abrechnungssumme begrenzt.',
          felder: [
            {
              id: 'vertragsstrafe_obergrenze',
              label: 'Obergrenze',
              type: 'percentage',
              einheit: 'v.H.',
              beschreibung: 'Obergrenze der Vertragsstrafen in % der Abrechnungssumme (i.d.R. 5%)',
              positionIndex: 0,
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      nummer: '5',
      titel: 'Mängelansprüche',
      festtext: 'Für folgende Leistungen gelten die Verjährungsfristen für die Mängelansprüche der Ergänzenden Vertragsbedingungen bzw. des § 14 Nr. 3 VOL/B nicht, sondern',
      felder: [
        {
          id: 'maengelansprueche',
          label: 'Abweichende Verjährungsfristen',
          type: 'array',
          pflicht: false,
          beschreibung: 'Leistungen mit abweichenden Verjährungsfristen für Mängelansprüche',
          spalten: [
            { id: 'leistung', label: 'für (Leistung)', type: 'text' },
            { id: 'jahre', label: 'Jahre', type: 'number', einheit: 'Jahre' },
          ],
          maxZeilen: 3,
        },
      ],
    },
    {
      id: 's6',
      nummer: '6',
      titel: 'Rechnungen',
      festtext: 'Alle Rechnungen und beizufügenden Unterlagen (Wiege- und Lieferscheine etc.) sind zweifach einzureichen, davon abweichend:',
      felder: [
        {
          id: 'rechnungen_abschlag',
          label: 'Abschlagsrechnungen (-fach)',
          type: 'text',
          pflicht: false,
          beschreibung: 'Anzahl Ausfertigungen für Abschlagsrechnungen',
        },
        {
          id: 'rechnungen_teilschluss',
          label: 'Teilschlussrechnungen (-fach)',
          type: 'text',
          pflicht: false,
          beschreibung: 'Anzahl Ausfertigungen für Teilschlussrechnungen',
        },
        {
          id: 'rechnungen_schluss',
          label: 'Schlussrechnungen (-fach)',
          type: 'text',
          pflicht: false,
          beschreibung: 'Anzahl Ausfertigungen für Schlussrechnungen',
        },
        {
          id: 'rechnungen_unterlagen',
          label: 'Unterlagen (-fach)',
          type: 'text',
          pflicht: false,
          beschreibung: 'Anzahl Ausfertigungen für Unterlagen',
        },
        {
          id: 'getrennte_rechnungen',
          label: 'Getrennte Rechnungen für',
          type: 'text',
          pflicht: false,
          beschreibung: 'Für welche Leistungen getrennte Rechnungen zu stellen sind',
        },
      ],
    },
    {
      id: 's7',
      nummer: '7',
      titel: 'Sicherheitsleistungen',
      festtext: 'Zur Vertragserfüllung werden Sicherheitsleistungen in Höhe von 5 v.H. der Auftragssumme verlangt:',
      felder: [
        {
          id: 'sicherheitsleistungen',
          label: 'Sicherheitsleistungen verlangt',
          type: 'boolean',
          beschreibung: 'Ob Sicherheitsleistungen in Höhe von 5 v.H. der Auftragssumme verlangt werden',
        },
      ],
    },
    {
      id: 's8',
      nummer: '8',
      titel: 'Preisgleitklausel',
      festtext: 'Die Geltung folgender Preisgleitklausel(n) wird vereinbart:',
      felder: [
        {
          id: 'preisgleitklausel',
          label: 'Preisgleitklausel',
          type: 'text',
          pflicht: false,
          beschreibung: 'Art der vereinbarten Preisgleitklausel, z.B. Stoffpreisgleitklausel gemäß Formblatt L 225',
        },
      ],
    },
    {
      id: 's9',
      nummer: '9',
      titel: 'Verwendung von chemisch-synthetischen Pflanzenschutzmitteln',
      festtext: 'Die Verwendung von chemisch-synthetischen Pflanzenschutzmitteln im Rahmen der Leistungserbringung ist verboten.',
      felder: [
        {
          id: 'pflanzenschutzmittel_verboten',
          label: 'Pflanzenschutzmittel verboten',
          type: 'boolean',
          beschreibung: 'Ob die Verwendung chemisch-synthetischer Pflanzenschutzmittel verboten ist',
        },
      ],
    },
    {
      id: 's10',
      nummer: '10',
      titel: 'Weitere Besondere Vertragsbedingungen',
      felder: [
        {
          id: 'weitere_bvb',
          label: 'Weitere BVB',
          type: 'enum',
          optionen: ['Keine', 'Siehe beigefügte Unterlage „Weitere Besondere Vertragsbedingungen"'],
          beschreibung: 'Ob weitere Besondere Vertragsbedingungen gelten',
        },
        {
          id: 'weitere_bvb_text',
          label: 'Details weitere BVB',
          type: 'text',
          pflicht: false,
          beschreibung: 'Beschreibung weiterer Besonderer Vertragsbedingungen, falls zutreffend',
        },
      ],
    },
  ],
}

const L215_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'annotation-only',
  sections: [
    {
      id: 's1',
      nummer: '1',
      titel: 'Preise',
      annotierbar: true,
      festtext: '1.1 Der Einheitspreis ist der vertragliche Preis, auch wenn im Angebot der Gesamtbetrag einer Ordnungszahl (Position) nicht dem Ergebnis der Multiplikation von Mengenansatz und Einheitspreis entspricht.\n\n1.2 Die vereinbarten Preise beinhalten auch die Kosten für Verpackung, Aufladen, Beförderung bis zur Anlieferungs- oder Annahmestelle und Abladen, wenn in der Leistungsbeschreibung nichts anderes angegeben ist.\n\n1.3 Etwaige Patentgebühren und Lizenzvergütungen sind durch den Preis für die Leistung abgegolten.',
      felder: [],
    },
    {
      id: 's2',
      nummer: '2',
      titel: 'Technische Regelwerke (§ 1 Nr. 2)',
      annotierbar: true,
      festtext: 'In den Vergabeunterlagen genannte technische Regelwerke sind Ergänzende Vertragsbedingungen im Sinne von § 1 Nr. 2c.',
      felder: [],
    },
    {
      id: 's3',
      nummer: '3',
      titel: 'Änderung der Leistung (§ 2)',
      annotierbar: true,
      festtext: 'Beansprucht der Auftragnehmer aufgrund von § 2 Nr. 3 VOL/B eine erhöhte Vergütung, muss er dies dem Auftraggeber unverzüglich vor Ausführung der Leistung in Textform anzeigen.',
      felder: [],
    },
    {
      id: 's4',
      nummer: '4',
      titel: 'Ausführung der Leistungen (§ 4)',
      annotierbar: true,
      festtext: '4.1 Betriebs-, Bedienungs-, Gebrauchsanweisungen und dergleichen sind auch ohne besondere Vereinbarung der zu erbringenden Leistung beizufügen.\n\n4.2 Der Auftragnehmer darf Veröffentlichungen über die Leistung nur mit vorheriger schriftlicher Zustimmung des Auftraggebers vornehmen.',
      felder: [],
    },
    {
      id: 's5',
      nummer: '5',
      titel: 'Unterauftragnehmer (andere Unternehmer) (§ 4 Nr. 4)',
      annotierbar: true,
      festtext: '5.1 Der Auftragnehmer darf Leistungen nur an Unterauftragnehmer übertragen, die geeignet im Sinne der §§ 122 und 128 GWB sind.\n\n5.2 Der Auftragnehmer hat vor der beabsichtigten Übertragung Art und Umfang der Leistungen sowie Name und Anschrift des hierfür vorgesehenen Unterauftragnehmers in Textform bekannt zu geben.\n\n5.3 Sollen Leistungen, die Unterauftragnehmern übertragen sind, weiter vergeben werden, ist dies dem Auftraggeber vor der beabsichtigten Übertragung in Textform bekannt zu geben; die Nummern 5.1 und 5.2 gelten entsprechend.',
      felder: [],
    },
    {
      id: 's6',
      nummer: '6',
      titel: 'Sprache',
      annotierbar: true,
      festtext: 'Alle Unterlagen und Äußerungen des Auftragnehmers müssen in deutscher Sprache abgefasst sein. Fremdsprachliche Äußerungen Dritter (z. B. Bescheinigungen, sonstige Unterlagen von Behörden und Privaten) sind mit deutscher Übersetzung einzureichen.',
      felder: [],
    },
    {
      id: 's7',
      nummer: '7',
      titel: 'Wettbewerbsbeschränkungen (§ 8 Nr. 2)',
      annotierbar: true,
      festtext: 'Wenn der Auftragnehmer aus Anlass der Vergabe nachweislich eine Abrede getroffen hat, die eine Wettbewerbsbeschränkung darstellt, hat er 5 % der Abrechnungssumme an den Auftraggeber zu zahlen, es sei denn, dass ein Schaden in anderer Höhe nachgewiesen wird. Sonstige vertragliche oder gesetzliche Ansprüche des Auftraggebers, insbesondere aus § 8 Nr.2, bleiben unberührt.',
      felder: [],
    },
    {
      id: 's8',
      nummer: '8',
      titel: 'Abrechnung (§ 15)',
      annotierbar: true,
      festtext: '8.1 Rechnungen sind ihrem Zweck nach als Abschlags-, Teilschluss- oder Schlussrechnung zu bezeichnen; die Abschlags- und Teilschlussrechnungen sind fortlaufend zu nummerieren.\n\n8.2 In den Rechnungen sind Umfang und Wert aller bisherigen Leistungen nach den Ordnungszahlen (Positionen) des Leistungsverzeichnisses aufzuführen und mit Nettopreisen anzuzeigen. Der Umsatzsteuerbetrag ist mit dem Steuersatz hinzuzusetzen, der zum Zeitpunkt des Entstehens der Steuer, bei Schlussrechnungen zum Zeitpunkt des Bewirkens der Leistung, gilt. Beim Überschreiten von Vertragsfristen, die der Auftragnehmer zu vertreten hat, gilt der bei Fristablauf maßgebende Steuersatz.\n\n8.3 In jeder Rechnung sind Umfang und Wert aller bisherigen Leistungen und die bereits erhaltenen Zahlungen mit gesondertem Ausweis der darin enthaltenen Umsatzsteuerbeträge anzugeben.',
      felder: [],
    },
    {
      id: 's9',
      nummer: '9',
      titel: 'Leistungen nach Stundenverrechnungssätzen (§ 16)',
      annotierbar: true,
      festtext: '9.1 Der Auftragnehmer hat für Leistungen nach Stundenverrechnungssätzen arbeitstäglich Stundenlohnzettel in zweifacher Ausfertigung einzureichen. Diese müssen außer den Angaben nach § 16 Nr. 2 enthalten:\n– das Datum,\n– die Bezeichnung der Leistungsstelle,\n– die genaue Bezeichnung des Ausführungsortes innerhalb der Leistungsstelle,\n– die Art der Leistung,\n– die Namen der Arbeitskräfte und deren Berufs-, Lohn- oder Gehaltsgruppe,\n– die geleisteten Arbeitsstunden je Arbeitskraft, ggf. aufgegliedert nach Mehr-, Nacht-, Sonntags- und Feiertagsarbeit, sowie nach im Verrechnungssatz nicht enthaltenen Erschwernissen und ggf.\n– die Gerätekenngrößen\n\n9.2 Sind Leistungen nach Stundenverrechnungssätzen mit anderen Leistungen verbunden, so sind keine getrennten Rechnungen aufzustellen.',
      felder: [],
    },
    {
      id: 's10',
      nummer: '10',
      titel: 'Bürgschaften (§ 18)',
      annotierbar: true,
      festtext: '10.1 Wird Sicherheit durch Bürgschaft geleistet, ist das dafür jeweils einschlägige Formblatt des Auftraggebers zu verwenden oder die Bürgschaftserklärung muss vollständig den Formblättern des Auftraggebers entsprechen.\n\n10.2 Die Bürgschaft ist von einem in den Europäischen Gemeinschaften oder in einem Staat der Vertragsparteien des Abkommens über den Europäischen Wirtschaftsraum oder in einem Staat der Vertragsparteien des WTO-Abkommens über das öffentliche Beschaffungswesen zugelassenen Kreditinstitut bzw. Kredit- oder Kautionsversicherer zu stellen.\n\n10.3 Die Bürgschaft ist über den Gesamtbetrag der Sicherheit in nur einer Urkunde zu stellen.\n\n10.4 Die Urkunde über die Abschlagszahlungsbürgschaft wird zurückgegeben, wenn die Leistung für die die Sicherheit geleistet worden ist, erfüllt ist.\n\n10.5 Die Urkunde über die Vorauszahlungsbürgschaft wird zurückgegeben, wenn die Vorauszahlung auf fällige Zahlungen angerechnet worden ist.',
      felder: [],
    },
    {
      id: 's11',
      nummer: '11',
      titel: '„Equal Pay" Gebot',
      annotierbar: true,
      festtext: 'Der Auftragnehmer hat bei der Ausführung des öffentlichen Auftrags alle für ihn geltenden rechtlichen Verpflichtungen einzuhalten, insbesondere den Arbeitnehmerinnen und Arbeitnehmern wenigstens diejenigen Mindestbedingungen einschließlich des Mindestentgelts zu gewähren, die nach dem Mindestlohngesetz, einem nach dem Tarifvertragsgesetz mit den Wirkungen des Arbeitnehmerentsendegesetzes (AEntG) für allgemein verbindlich erklärten Tarifvertrag oder einer nach § 7, § 7a oder § 11 AEntG oder einer nach § 3a AÜG erlassenen Rechtsverordnung für die betreffende Leistung verbindlich vorgegeben werden, sowie gem. § 7 Abs. 1 AGG und § 3 Abs. 1 EntgTranspG Frauen und Männern bei gleicher oder gleichwertiger Arbeit gleiches Entgelt zu bezahlen. (StMWi Az.: Z4-5801/21/5 vom 19.11.2019)',
      felder: [],
    },
    {
      id: 's12',
      nummer: '12',
      titel: 'Neubeauftragung von Restleistungen nach vorzeitiger Vertragsbeendigung',
      annotierbar: true,
      festtext: 'Überträgt der Auftraggeber nach vorzeitiger Vertragsbeendigung die zur Erreichung des Vertragszwecks erforderlichen Leistungen ganz oder teilweise einem oder mehreren neuen Auftragnehmern, behält er sich vor, diese ohne Durchführung eines neuen Vergabeverfahrens zu beauftragen. Dies gilt, soweit die Vergütung des neuen Auftragnehmers unter Berücksichtigung aller Umstände nicht unangemessen hoch ist. Der bisherige Auftragnehmer kann gegen geltend gemachte Mehrkosten nicht einwenden, dass kein Vergabeverfahren durchgeführt wurde. Dies gilt nicht, wenn die Vergütung unter Berücksichtigung aller Umstände unangemessen hoch ist.',
      felder: [],
    },
  ],
}

const L124_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_rolle',
      titel: 'Rolle des Erklärenden',
      felder: [
        {
          id: 'rolle',
          label: 'Rolle',
          type: 'enum',
          optionen: ['Bewerber', 'Bieter', 'Mitglied einer Bieter-/Bewerbergemeinschaft', 'Nachunternehmer', 'Anderes Unternehmen'],
          beschreibung: 'Rolle des Erklärenden im Vergabeverfahren',
        },
      ],
    },
    {
      id: 's_unternehmen',
      titel: 'Unternehmensdaten',
      felder: [
        { id: 'unternehmen_name', label: 'Name des Unternehmens', type: 'text' },
        { id: 'unternehmen_anschrift', label: 'Anschrift', type: 'text' },
        { id: 'unternehmen_ust_id', label: 'Umsatzsteuer-ID-Nr.', type: 'text' },
      ],
    },
    {
      id: 's_umsatz',
      titel: 'Umsatz',
      festtext: 'Umsatz des Unternehmens in den letzten 3 abgeschlossenen Geschäftsjahren, soweit er Leistungen betrifft, die mit der zu vergebenden Leistung vergleichbar sind:',
      felder: [
        {
          id: 'umsatz',
          label: 'Umsatz vergleichbare Leistungen',
          type: 'array',
          beschreibung: 'Umsatz der letzten 3 abgeschlossenen Geschäftsjahre für vergleichbare Leistungen',
          spalten: [
            { id: 'jahr', label: 'Jahr', type: 'number' },
            { id: 'betrag', label: 'Betrag (EUR)', type: 'currency', einheit: 'EUR' },
          ],
          minZeilen: 3,
          maxZeilen: 3,
        },
      ],
    },
    {
      id: 's_referenzen',
      titel: 'Referenzen',
      festtext: 'Angaben zu Leistungen, die mit der zu vergebenden Leistung vergleichbar sind (mind. 3 Referenzen):',
      felder: [
        {
          id: 'referenzen',
          label: 'Referenzen',
          type: 'text',
          beschreibung: 'Erklärung zu vergleichbaren Leistungen der letzten 3 Jahre mit Ansprechpartner, Auftragssumme und Zeitraum (mind. 3 Referenzen)',
        },
      ],
    },
    {
      id: 's_versicherung',
      titel: 'Versicherung',
      felder: [
        {
          id: 'versicherung_personen',
          label: 'Mindestdeckung Personenschäden',
          type: 'currency',
          einheit: 'EUR',
          beschreibung: 'Mindestdeckungssumme für Personenschäden in EUR',
        },
        {
          id: 'versicherung_sach',
          label: 'Mindestdeckung Sach-/Vermögensschäden',
          type: 'currency',
          einheit: 'EUR',
          beschreibung: 'Mindestdeckungssumme für Sach- und Vermögensschäden in EUR',
        },
      ],
    },
    {
      id: 's_beschaeftigte',
      titel: 'Beschäftigte',
      festtext: 'Durchschnittliche jährliche Beschäftigtenzahl des Unternehmens und die Zahl seiner Führungskräfte in den letzten 3 Jahren:',
      felder: [
        {
          id: 'beschaeftigte',
          label: 'Beschäftigtenzahlen',
          type: 'array',
          beschreibung: 'Durchschnittliche Beschäftigtenzahl und Führungskräfte der letzten 3 Jahre',
          spalten: [
            { id: 'jahr', label: 'Jahr', type: 'number' },
            { id: 'beschaeftigte', label: 'Beschäftigte', type: 'number' },
            { id: 'fuehrungskraefte', label: 'Führungskräfte', type: 'number' },
          ],
          minZeilen: 3,
          maxZeilen: 3,
        },
      ],
    },
    {
      id: 's_handelsregister',
      titel: 'Handelsregister',
      felder: [
        {
          id: 'handelsregister_eingetragen',
          label: 'Im Handelsregister eingetragen',
          type: 'boolean',
          beschreibung: 'Ob das Unternehmen im Handelsregister eingetragen ist',
        },
        {
          id: 'handelsregister_details',
          label: 'Registergericht und -nummer',
          type: 'text',
          pflicht: false,
          beschreibung: 'Registergericht und Registernummer, falls eingetragen',
        },
      ],
    },
    {
      id: 's_insolvenz',
      titel: 'Insolvenz',
      felder: [
        {
          id: 'insolvenz',
          label: 'Erklärung zu Insolvenzverfahren',
          type: 'text',
          beschreibung: 'Erklärung, dass kein Insolvenzverfahren eröffnet oder beantragt wurde',
        },
      ],
    },
    {
      id: 's_ausschluss',
      titel: 'Ausschlussgründe §§ 123/124 GWB',
      felder: [
        {
          id: 'ausschlussgruende',
          label: 'Erklärung zu Ausschlussgründen',
          type: 'text',
          beschreibung: 'Erklärung, dass keine Ausschlussgründe nach §§ 123/124 GWB vorliegen',
        },
      ],
    },
    {
      id: 's_steuern',
      titel: 'Steuern und Sozialversicherung',
      felder: [
        {
          id: 'steuern_sozialversicherung',
          label: 'Erklärung Steuern/Sozialversicherung',
          type: 'text',
          beschreibung: 'Erklärung zur ordnungsgemäßen Zahlung von Steuern und Sozialversicherungsbeiträgen',
        },
      ],
    },
    {
      id: 's_bg',
      titel: 'Berufsgenossenschaft',
      felder: [
        {
          id: 'berufsgenossenschaft',
          label: 'Mitglied der Berufsgenossenschaft',
          type: 'boolean',
          beschreibung: 'Ob eine Mitgliedschaft bei der Berufsgenossenschaft besteht',
        },
      ],
    },
  ],
}

const L211_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_vergabestelle',
      titel: 'Vergabestelle',
      felder: [
        { id: 'vergabestelle_name', label: 'Name der Vergabestelle', type: 'text' },
        { id: 'vergabestelle_anschrift', label: 'Anschrift', type: 'text' },
        { id: 'vergabestelle_ansprechpartner', label: 'Ansprechpartner', type: 'text' },
        { id: 'vergabestelle_telefon', label: 'Telefon', type: 'text' },
        { id: 'vergabestelle_email', label: 'E-Mail', type: 'text' },
      ],
    },
    {
      id: 's_leistung',
      titel: 'Maßnahme / Leistung',
      felder: [
        { id: 'massnahme', label: 'Bezeichnung der Maßnahme', type: 'text' },
        { id: 'leistung', label: 'Bezeichnung der Leistung', type: 'text' },
        { id: 'vergabenummer', label: 'Vergabenummer', type: 'text' },
        {
          id: 'vergabeart',
          label: 'Vergabeart',
          type: 'enum',
          optionen: ['Öffentliche Ausschreibung', 'Beschränkte Ausschreibung', 'Beschränkte Ausschreibung mit Teilnahmewettbewerb', 'Verhandlungsvergabe', 'Verhandlungsvergabe mit Teilnahmewettbewerb'],
        },
      ],
    },
    {
      id: 's_fristen',
      titel: 'Fristen',
      felder: [
        { id: 'angebotsfrist', label: 'Angebotsfrist', type: 'text', beschreibung: 'Angebotsfrist (Datum und Uhrzeit)' },
        { id: 'bindefrist', label: 'Bindefrist', type: 'text', beschreibung: 'Bindefrist bis (Datum)' },
      ],
    },
    {
      id: 's_zuschlag',
      titel: 'Zuschlagskriterien',
      felder: [
        {
          id: 'zuschlagskriterien',
          label: 'Zuschlagskriterien und Gewichtung',
          type: 'text',
          beschreibung: 'Zuschlagskriterien und deren Gewichtung',
        },
      ],
    },
    {
      id: 's_unterlagen',
      titel: 'Beizufügende Unterlagen',
      felder: [
        {
          id: 'beizufuegende_unterlagen',
          label: 'Vom Bieter beizufügende Unterlagen',
          type: 'array',
          beschreibung: 'Liste der vom Bieter beizufügenden Unterlagen',
          spalten: [
            { id: 'unterlage', label: 'Unterlage', type: 'text' },
          ],
        },
      ],
    },
    {
      id: 's_form',
      titel: 'Angebotsform',
      felder: [
        {
          id: 'angebotsform',
          label: 'Angebotsform',
          type: 'text',
          beschreibung: 'Angebotsform: elektronisch über Vergabeplattform, schriftlich, etc.',
        },
      ],
    },
  ],
}

const L227_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_prinzip',
      titel: 'Zuschlagsprinzip',
      felder: [
        {
          id: 'zuschlagsprinzip',
          label: 'Zuschlagsprinzip',
          type: 'enum',
          optionen: ['Niedrigster Preis', 'Wirtschaftlichstes Angebot'],
          beschreibung: 'Niedrigster Preis oder wirtschaftlichstes Angebot',
        },
      ],
    },
    {
      id: 's_kriterien',
      titel: 'Kriterien',
      felder: [
        {
          id: 'kriterien',
          label: 'Zuschlagskriterien',
          type: 'array',
          beschreibung: 'Zuschlagskriterien mit Gewichtung in Prozent und ggf. Unterkriterien',
          spalten: [
            { id: 'kriterium', label: 'Kriterium', type: 'text' },
            { id: 'gewichtung', label: 'Gewichtung (%)', type: 'percentage', einheit: '%' },
          ],
        },
      ],
    },
    {
      id: 's_methode',
      titel: 'Bewertungsmethode',
      felder: [
        {
          id: 'bewertungsmethode',
          label: 'Bewertungsmethode',
          type: 'text',
          beschreibung: 'Bewertungsmethode: Punkteskala, Schulnoten, etc.',
        },
      ],
    },
    {
      id: 's_erlaeuterung',
      titel: 'Erläuterungen',
      felder: [
        {
          id: 'erlaeuterung',
          label: 'Erläuterungen zur Wertung',
          type: 'text',
          beschreibung: 'Erläuterungen zur Wertung und Bewertungsmatrix',
        },
      ],
    },
  ],
}

const L2491_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      festtext: 'Erklärung zur Vermeidung von ausbeuterischer Kinderarbeit gemäß ILO-Konvention Nr. 182.',
      felder: [
        { id: 'erklaerung', label: 'Erklärung', type: 'text', beschreibung: 'Erklärung zur Vermeidung ausbeuterischer Kinderarbeit' },
      ],
    },
    {
      id: 's_produkte',
      titel: 'Produktkategorien',
      felder: [
        {
          id: 'produktkategorien',
          label: 'Betroffene Produktkategorien',
          type: 'array',
          beschreibung: 'Produktkategorien, die von der Erklärung betroffen sind',
          spalten: [{ id: 'kategorie', label: 'Kategorie', type: 'text' }],
        },
      ],
    },
    {
      id: 's_nachweis',
      titel: 'Nachweis',
      felder: [
        { id: 'nachweisart', label: 'Art des Nachweises', type: 'text', beschreibung: 'Eigenerklärung, Zertifikate (SA8000, BSCI), Lieferantenerklärungen' },
        { id: 'lieferketten_pruefung', label: 'Lieferketten-Prüfung', type: 'text', beschreibung: 'Maßnahmen zur Prüfung der Lieferkette' },
      ],
    },
  ],
}

const L248_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      festtext: 'Erklärung zur Verwendung von Holzprodukten aus legaler und nachhaltiger Forstwirtschaft.',
      felder: [
        { id: 'erklaerung', label: 'Erklärung', type: 'text', beschreibung: 'Erklärung zur Verwendung von Holz aus legaler/nachhaltiger Forstwirtschaft' },
      ],
    },
    {
      id: 's_zertifizierung',
      titel: 'Zertifizierung',
      felder: [
        { id: 'zertifizierung', label: 'Zertifizierung', type: 'text', beschreibung: 'Vorhandene Zertifizierung: FSC, PEFC oder gleichwertig' },
        { id: 'herkunftsnachweis', label: 'Herkunftsnachweis', type: 'text', beschreibung: 'Herkunftsnachweis der Holzprodukte' },
      ],
    },
    {
      id: 's_eutr',
      titel: 'EU-Holzhandelsverordnung',
      felder: [
        { id: 'eu_holzhandelsvo', label: 'EU-Holzhandelsverordnung', type: 'text', beschreibung: 'Erklärung zur Einhaltung der EU-Holzhandelsverordnung (EUTR)' },
      ],
    },
  ],
}

const L2496_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_erklaerung',
      titel: 'Schutzerklärung',
      felder: [
        { id: 'erklaerung', label: 'Erklärung', type: 'text', beschreibung: 'Erklärung des Bieters bezüglich Scientology-Organisation' },
        {
          id: 'bestaetigung',
          label: 'Bestätigung',
          type: 'boolean',
          beschreibung: 'Bestätigung, dass keine Technologie von L. Ron Hubbard angewandt wird und keine Kurse/Seminare der Scientology-Organisation besucht wurden',
        },
      ],
    },
  ],
}

// ── Berlin (BerlAVG) — Structures ──────────────────────────────────────

const WIRT214_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_mindestentgelt',
      titel: 'Mindeststundenentgelt',
      festtext: 'Der Auftragnehmer verpflichtet sich, seinen Beschäftigten bei der Ausführung des Auftrags mindestens das folgende Stundenentgelt zu zahlen:',
      felder: [
        { id: 'mindeststundenentgelt', label: 'Aktueller Mindeststundenlohn', type: 'text', beschreibung: 'Aktueller Mindeststundenlohn gemäß BerlAVG' },
      ],
    },
    {
      id: 's_tariftreue',
      titel: 'Tariftreue',
      felder: [
        { id: 'tariftreue', label: 'Tariftreueerklärung', type: 'text', beschreibung: 'Tariftreueerklärung und Geltungsbereich' },
      ],
    },
    {
      id: 's_geltung',
      titel: 'Geltungsbereich',
      felder: [
        { id: 'geltungsbereich', label: 'Geltungsbereich', type: 'text', beschreibung: 'Beschreibung des Geltungsbereichs' },
      ],
    },
    {
      id: 's_nachunternehmer',
      titel: 'Nachunternehmer-Verpflichtung',
      felder: [
        { id: 'nachunternehmer_verpflichtung', label: 'Nachunternehmer-Verpflichtung', type: 'text', beschreibung: 'Verpflichtung zur Weitergabe an Nachunternehmer' },
      ],
    },
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      felder: [
        { id: 'erklaerung', label: 'Zusammenfassende Erklärung', type: 'text', beschreibung: 'Zusammenfassende Erklärung zum Mindestentgelt' },
      ],
    },
  ],
}

const WIRT2140_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_produkte',
      titel: 'Produktkategorien',
      felder: [
        {
          id: 'produktkategorien',
          label: 'Betroffene Produktkategorien',
          type: 'array',
          beschreibung: 'Betroffene Produktkategorien',
          spalten: [{ id: 'kategorie', label: 'Kategorie', type: 'text' }],
        },
      ],
    },
    {
      id: 's_ilo',
      titel: 'ILO-Erklärung',
      felder: [
        { id: 'ilo_erklaerung', label: 'ILO-Erklärung', type: 'text', beschreibung: 'Erklärung zur Einhaltung der ILO-Kernarbeitsnormen' },
        { id: 'nachweisart', label: 'Nachweisart', type: 'text', beschreibung: 'Art des Nachweises (Zertifikat, Eigenerklärung, etc.)' },
        { id: 'lieferkette', label: 'Lieferkette', type: 'text', beschreibung: 'Anforderungen an die Lieferkette' },
      ],
    },
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      felder: [
        { id: 'erklaerung', label: 'Zusammenfassende Erklärung', type: 'text' },
      ],
    },
  ],
}

const WIRT2141_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_unternehmen',
      titel: 'Unternehmensdaten',
      felder: [
        { id: 'beschaeftigtenzahl', label: 'Anzahl der Beschäftigten', type: 'number' },
        { id: 'groessenklasse', label: 'Größenklasse', type: 'enum', optionen: ['>10 Beschäftigte', '>25 Beschäftigte', '>250 Beschäftigte'] },
        { id: 'frauenanteil', label: 'Aktueller Frauenanteil', type: 'text', beschreibung: 'Aktueller Frauenanteil im Unternehmen' },
      ],
    },
    {
      id: 's_massnahmen',
      titel: 'Frauenfördermaßnahmen',
      felder: [
        {
          id: 'massnahmen',
          label: 'Ausgewählte Maßnahmen',
          type: 'array',
          beschreibung: 'Ausgewählte Frauenfördermaßnahmen gemäß FFV § 2',
          spalten: [{ id: 'massnahme', label: 'Maßnahme', type: 'text' }],
        },
      ],
    },
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      felder: [
        { id: 'erklaerung', label: 'Zusammenfassende Erklärung', type: 'text', beschreibung: 'Zusammenfassende Erklärung zur Frauenförderung' },
      ],
    },
  ],
}

const WIRT2143_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_gleichbehandlung',
      titel: 'Gleichbehandlung',
      felder: [
        { id: 'gleichbehandlung', label: 'Gleichbehandlungserklärung', type: 'text', beschreibung: 'Erklärung zur Gleichbehandlung' },
        { id: 'entgeltgleichheit', label: 'Entgeltgleichheit', type: 'text', beschreibung: 'Erklärung zur Entgeltgleichheit' },
      ],
    },
    {
      id: 's_massnahmen',
      titel: 'Maßnahmen',
      felder: [
        {
          id: 'massnahmen',
          label: 'Antidiskriminierungsmaßnahmen',
          type: 'array',
          beschreibung: 'Konkrete Antidiskriminierungsmaßnahmen',
          spalten: [{ id: 'massnahme', label: 'Maßnahme', type: 'text' }],
        },
      ],
    },
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      felder: [
        { id: 'erklaerung', label: 'Zusammenfassende Erklärung', type: 'text' },
      ],
    },
  ],
}

const WIRT2144_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_vertragsstrafen',
      titel: 'Vertragsstrafenregelung',
      felder: [
        { id: 'vertragsstrafen_regelung', label: 'Vertragsstrafenregelung', type: 'text', beschreibung: 'Regelung zu Vertragsstrafen bei Verstößen' },
      ],
    },
    {
      id: 's_kontrolle',
      titel: 'Kontrollrechte',
      felder: [
        { id: 'kontrollrechte', label: 'Kontrollrechte', type: 'text', beschreibung: 'Kontrollrechte des Auftraggebers' },
      ],
    },
    {
      id: 's_sanktionen',
      titel: 'Sanktionsstufen',
      felder: [
        {
          id: 'sanktionsstufen',
          label: 'Sanktionsstufen',
          type: 'array',
          beschreibung: 'Sanktionsstufen bei Verstößen',
          spalten: [{ id: 'stufe', label: 'Stufe', type: 'text' }],
        },
      ],
    },
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      felder: [
        { id: 'erklaerung', label: 'Zusammenfassende Erklärung', type: 'text' },
      ],
    },
  ],
}

const WIRT2145_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_anforderungen',
      titel: 'Umweltanforderungen',
      felder: [
        { id: 'umweltanforderungen', label: 'Umweltanforderungen', type: 'text', beschreibung: 'Spezifische Umweltanforderungen für diesen Auftrag' },
        { id: 'sektor_anlage', label: 'Sektoranlage', type: 'text', beschreibung: 'Relevante Sektoranlage / Branchenspezifik' },
      ],
    },
    {
      id: 's_nachweise',
      titel: 'Nachweise',
      felder: [
        {
          id: 'nachweisarten',
          label: 'Umweltnachweise',
          type: 'array',
          beschreibung: 'Geforderte Umweltnachweise / Zertifikate',
          spalten: [{ id: 'nachweis', label: 'Nachweis', type: 'text' }],
        },
      ],
    },
    {
      id: 's_energie',
      titel: 'Energieeffizienz',
      felder: [
        { id: 'energieeffizienz', label: 'Energieeffizienz', type: 'text', beschreibung: 'Anforderungen an Energieeffizienz' },
      ],
    },
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      felder: [
        { id: 'erklaerung', label: 'Zusammenfassende Erklärung', type: 'text', beschreibung: 'Zusammenfassende Erklärung zum Umweltschutz' },
      ],
    },
  ],
}

const WIRT215_STRUCTURE: FormStructure = {
  schemaVersion: 2,
  formType: 'fillable',
  sections: [
    {
      id: 's_zahlung',
      titel: 'Zahlungsbedingungen',
      felder: [
        { id: 'zahlungsbedingungen', label: 'Zahlungsbedingungen', type: 'text', beschreibung: 'Zahlungsbedingungen und -fristen' },
      ],
    },
    {
      id: 's_gewaehrleistung',
      titel: 'Gewährleistung',
      felder: [
        { id: 'gewaehrleistung', label: 'Gewährleistungsregelungen', type: 'text', beschreibung: 'Gewährleistungsregelungen' },
      ],
    },
    {
      id: 's_preis',
      titel: 'Preisgleitklausel',
      felder: [
        { id: 'preisgleitklausel', label: 'Preisgleitklausel', type: 'text', beschreibung: 'Preisgleitklausel / Preisanpassung' },
      ],
    },
    {
      id: 's_kuendigung',
      titel: 'Kündigungsrechte',
      felder: [
        { id: 'kuendigungsrechte', label: 'Kündigungsrechte', type: 'text', beschreibung: 'Kündigungsrechte und -bedingungen' },
      ],
    },
    {
      id: 's_haftung',
      titel: 'Haftung',
      felder: [
        { id: 'haftung', label: 'Haftungsregelungen', type: 'text', beschreibung: 'Haftungsregelungen' },
      ],
    },
    {
      id: 's_erklaerung',
      titel: 'Erklärung',
      felder: [
        { id: 'erklaerung', label: 'Zusammenfassende Erklärung', type: 'text', beschreibung: 'Zusammenfassende Erklärung zu den Vertragsbedingungen' },
      ],
    },
  ],
}

// ── Template Definitions ───────────────────────────────────────────────

const BERLIN_TEMPLATES: TemplateData[] = [
  {
    name: 'BVB Mindestentgelt',
    formularNummer: 'Wirt-214',
    sammlung: 'BerlAVG',
    description:
      'Besondere Vertragsbedingungen zur Einhaltung des Mindestentgelts gemäß § 9 BerlAVG.',
    labels: [{ label: 'BerlAVG' }, { label: 'ab-10000' }],
    promptHinweise:
      'Verwende den aktuellen Berliner Mindestlohn. Beachte Tariftreuepflichten. Nachunternehmer müssen einbezogen werden.',
    anwendungsschwelle: 10_000,
    pflicht: true,
    sortOrder: 10,
    structure: WIRT214_STRUCTURE,
  },
  {
    name: 'ILO-Kernarbeitsnormen',
    formularNummer: 'Wirt-2140',
    sammlung: 'BerlAVG',
    description:
      'Erklärung zur Einhaltung der ILO-Kernarbeitsnormen bei Lieferaufträgen gemäß § 8 BerlAVG.',
    labels: [{ label: 'BerlAVG' }, { label: 'ab-10000' }],
    promptHinweise:
      'Nur relevant bei Waren-/Lieferaufträgen. Produktkategorien aus Projektdaten ableiten. ILO-Konventionen referenzieren.',
    anwendungsschwelle: 10_000,
    pflicht: true,
    sortOrder: 20,
    structure: WIRT2140_STRUCTURE,
  },
  {
    name: 'Frauenförderverordnung (FFV)',
    formularNummer: 'Wirt-2141',
    sammlung: 'BerlAVG',
    description:
      'Erklärung zur Frauenförderung gemäß FFV. Ab 25.000 EUR netto Pflicht.',
    labels: [{ label: 'BerlAVG' }, { label: 'ab-25000' }],
    promptHinweise:
      'Größenklasse aus Beschäftigtenzahl ableiten. Maßnahmenkatalog gemäß FFV § 2 verwenden. Frauenanteil muss plausibel sein.',
    anwendungsschwelle: 25_000,
    pflicht: true,
    sortOrder: 30,
    structure: WIRT2141_STRUCTURE,
  },
  {
    name: 'Antidiskriminierung',
    formularNummer: 'Wirt-2143',
    sammlung: 'BerlAVG',
    description: 'Erklärung zur Einhaltung des Antidiskriminierungsrechts gemäß BerlAVG.',
    labels: [{ label: 'BerlAVG' }, { label: 'ab-10000' }],
    promptHinweise:
      'Gleichbehandlung nach AGG. Entgeltgleichheit betonen. Konkrete Maßnahmen vorschlagen.',
    anwendungsschwelle: 10_000,
    pflicht: true,
    sortOrder: 40,
    structure: WIRT2143_STRUCTURE,
  },
  {
    name: 'Kontrolle und Vertragsstrafen',
    formularNummer: 'Wirt-2144',
    sammlung: 'BerlAVG',
    description:
      'Regelungen zu Kontrollrechten und Vertragsstrafen bei Verstößen gegen BerlAVG-Verpflichtungen.',
    labels: [{ label: 'BerlAVG' }, { label: 'Vertragsbedingungen' }, { label: 'ab-10000' }],
    promptHinweise:
      'Vertragsstrafen-Höhe an Auftragswert koppeln. Sanktionsstufen: Abmahnung → Vertragsstrafe → Kündigung.',
    anwendungsschwelle: 10_000,
    pflicht: true,
    sortOrder: 50,
    structure: WIRT2144_STRUCTURE,
  },
  {
    name: 'Umweltschutzanforderungen',
    formularNummer: 'Wirt-2145',
    sammlung: 'BerlAVG',
    description:
      'Umweltbezogene Anforderungen und Nachweise gemäß Verwaltungsvorschrift Beschaffung und Umwelt (VwVBU).',
    labels: [{ label: 'BerlAVG' }, { label: 'Umwelt' }, { label: 'ab-10000' }],
    promptHinweise:
      'Sektoranlage nach Auftragsgegenstand wählen. Relevante Umweltzeichen / Zertifikate benennen.',
    anwendungsschwelle: 10_000,
    pflicht: false,
    sortOrder: 60,
    structure: WIRT2145_STRUCTURE,
  },
  {
    name: 'ZVB/BVB Vertragsbedingungen',
    formularNummer: 'Wirt-215',
    sammlung: 'BerlAVG',
    description:
      'Zusätzliche und Besondere Vertragsbedingungen: Zahlungen, Gewährleistung, Preisgleitung.',
    labels: [{ label: 'BerlAVG' }, { label: 'Vertragsbedingungen' }, { label: 'ab-10000' }],
    promptHinweise:
      'Zahlungsfrist 30 Tage. Gewährleistung nach VOL/B oder VOB/B je nach Auftragsart. Preisgleitklausel nur bei Laufzeit > 12 Monate.',
    anwendungsschwelle: 10_000,
    pflicht: true,
    sortOrder: 70,
    structure: WIRT215_STRUCTURE,
  },
]

const BAYERN_VHL_TEMPLATES: TemplateData[] = [
  {
    name: 'Besondere Vertragsbedingungen (Liefer-/DL)',
    formularNummer: 'L 214',
    sammlung: 'VHL Bayern',
    description:
      'Besondere Vertragsbedingungen für Liefer- und Dienstleistungen: Vergütung, Ausführungsfristen, Abnahme, Vertragsstrafen, Mängelansprüche, Sicherheitsleistungen, Preisgleitklausel. Quelle: VHL Bayern, Stand Juni 2022.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Vertragsbedingungen' }],
    promptHinweise:
      'Abschnitte: 1 Vergütung, 2 Ausführungsfristen (Beginn/Vollendung mit Datum/Werktagen), 3 Abnahme (förmlich ja/nein), 4 Vertragsstrafen (%-Satz vom Wert), 5 Mängelansprüche (Verjährungsfristen in Jahren), 6 Rechnungen (Anzahl Ausfertigungen), 7 Sicherheitsleistungen (5% Auftragssumme), 8 Preisgleitklausel, 9 Pflanzenschutzmittel, 10 Weitere BVB. Fristen und Prozentsätze müssen zum Auftragswert und zur Laufzeit passen.',
    anwendungsschwelle: 0,
    pflicht: true,
    sortOrder: 110,
    structure: L214_STRUCTURE,
  },
  {
    name: 'Zusätzliche Vertragsbedingungen (Liefer-/DL)',
    formularNummer: 'L 215',
    sammlung: 'VHL Bayern',
    description:
      'Zusätzliche Allgemeine Vertragsbedingungen für die Ausführung von Leistungen (VOL/B): Preise, Technische Regelwerke, Unterauftragnehmer, Abrechnung, Bürgschaften, Equal Pay. Quelle: VHL Bayern, Stand April 2024.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Vertragsbedingungen' }],
    promptHinweise:
      'Standardtext — hauptsächlich vorgegebene Klauseln. KI soll die relevanten Abschnitte für den konkreten Auftrag hervorheben und kontextspezifisch erläutern: Preisregelungen (§1), Unterauftragnehmer (§4 Nr. 4), Abrechnung (§15), Bürgschaften (§18), Equal Pay Gebot (§11). Nicht alle Abschnitte sind bei jedem Auftrag relevant.',
    anwendungsschwelle: 0,
    pflicht: true,
    sortOrder: 120,
    structure: L215_STRUCTURE,
  },
  {
    name: 'Eigenerklärung zur Eignung',
    formularNummer: 'L 124',
    sammlung: 'VHL Bayern',
    description:
      'Eigenerklärung des Bieters zur Eignung: Umsatz, Referenzen, Versicherung, Beschäftigtenzahl, Handelsregister, Insolvenz, Ausschlussgründe §§123/124 GWB, Steuern/Sozialversicherung. Quelle: VHL Bayern, Stand August 2023.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Eignung' }],
    promptHinweise:
      'Bieter-Perspektive: Umsatz der letzten 3 Jahre (vergleichbare Leistungen), mind. 3 Referenzen mit Ansprechpartner/Auftragssumme/Zeitraum, Berufs-/Betriebshaftpflicht (Mindestdeckung für Personen- und Sachschäden), Beschäftigtenzahl mit Führungskräften, Handelsregistereintragung, Erklärung zu Insolvenz und Ausschlussgründen, Steuern und Sozialversicherung. Felder kontextabhängig befüllen: z.B. Versicherungssummen an Auftragsgröße koppeln.',
    anwendungsschwelle: 0,
    pflicht: true,
    sortOrder: 100,
    structure: L124_STRUCTURE,
  },
  {
    name: 'Aufforderung zur Angebotsabgabe',
    formularNummer: 'L 211',
    sammlung: 'VHL Bayern',
    description:
      'Aufforderung zur Abgabe eines Angebots mit Angabe der Vergabestelle, Fristen, Zuschlagskriterien und beizufügenden Unterlagen. Quelle: VHL Bayern, Stand April 2022.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Aufforderung' }],
    promptHinweise:
      'Kopfdaten: Vergabestelle, Maßnahme, Leistung, Vergabenummer. Fristen: Angebotsfrist (Datum+Uhrzeit), Bindefrist, Ausführungsfristen. Zuschlagskriterien: Preis oder wirtschaftlichstes Angebot mit Gewichtung. Beizufügende Unterlagen: Eigenerklärung, Referenzen, etc. Angebotsform: elektronisch über Vergabeplattform.',
    anwendungsschwelle: 0,
    pflicht: true,
    sortOrder: 105,
    structure: L211_STRUCTURE,
  },
  {
    name: 'Gewichtung der Zuschlagskriterien',
    formularNummer: 'L 227',
    sammlung: 'VHL Bayern',
    description:
      'Festlegung und Gewichtung der Zuschlagskriterien: Preis, Qualität, Technik, Nachhaltigkeit etc. Quelle: VHL Bayern, Stand Juli 2023.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Wertung' }],
    promptHinweise:
      'Zuschlagskriterien mit Gewichtung in Prozent. Typisch: Preis 60%, Qualität 30%, Nachhaltigkeit 10% — anpassbar an Auftragsart. Unterkriterien definieren. Bei Dienstleistungen oft höhere Qualitätsgewichtung. Bewertungsmatrix mit Punkteskala (0-5 oder 0-10).',
    anwendungsschwelle: 0,
    pflicht: false,
    sortOrder: 130,
    structure: L227_STRUCTURE,
  },
  {
    name: 'Erklärung Kinderarbeit',
    formularNummer: 'L 2491',
    sammlung: 'VHL Bayern',
    description:
      'Erklärung zur Vermeidung von Kinderarbeit in der Lieferkette gemäß ILO-Konvention Nr. 182. Quelle: VHL Bayern, Stand Januar 2022.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Sozialstandards' }],
    promptHinweise:
      'Erklärung, dass keine Waren durch ausbeuterische Kinderarbeit hergestellt wurden. ILO-Konvention 182 referenzieren. Relevant bei Lieferaufträgen mit Produkten aus Risikoländern. Nachweisarten: Eigenerklärung, Zertifikate (SA8000, BSCI), Lieferantenerklärungen.',
    anwendungsschwelle: 0,
    pflicht: false,
    sortOrder: 140,
    structure: L2491_STRUCTURE,
  },
  {
    name: 'Erklärung Holzprodukte',
    formularNummer: 'L 248',
    sammlung: 'VHL Bayern',
    description:
      'Erklärung zur Verwendung von Holzprodukten aus legaler und nachhaltiger Forstwirtschaft. Quelle: VHL Bayern, Stand Oktober 2017.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Umwelt' }],
    promptHinweise:
      'Nur relevant bei Aufträgen mit Holzprodukten. Nachweis über FSC, PEFC oder gleichwertiges Zertifikat. Erklärung, dass kein Holz aus illegaler Rodung verwendet wird. EU-Holzhandelsverordnung (EUTR) beachten.',
    anwendungsschwelle: 0,
    pflicht: false,
    sortOrder: 150,
    structure: L248_STRUCTURE,
  },
  {
    name: 'Scientology-Schutzerklärung',
    formularNummer: 'L 2496',
    sammlung: 'VHL Bayern',
    description:
      'Bayern-spezifische Schutzerklärung bezüglich Scientology-Organisation. Quelle: VHL Bayern, Stand Februar 2024.',
    labels: [{ label: 'VHL Bayern' }, { label: 'Bayern-spezifisch' }],
    promptHinweise:
      'Bayern-spezifisches Formular. Erklärung des Bieters, dass er die Technologie von L. Ron Hubbard nicht anwendet und keine Kurse/Seminare der Scientology-Organisation besucht hat oder besuchen wird. Ab bestimmtem Auftragswert verpflichtend in Bayern.',
    anwendungsschwelle: 0,
    pflicht: false,
    sortOrder: 160,
    structure: L2496_STRUCTURE,
  },
]

const ALL_TEMPLATES: TemplateData[] = [...BERLIN_TEMPLATES, ...BAYERN_VHL_TEMPLATES]

// ── Seed Logic ─────────────────────────────────────────────────────────

function computeSeedChecksum(data: TemplateData): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

/**
 * Seed FormTemplates. Checksum-based — protects admin edits.
 *
 * Logic:
 * - New template → insert with seedChecksum
 * - Existing, no seedChecksum → legacy, set checksum + update
 * - Existing, checksum matches current seed → skip (no change)
 * - Existing, checksum matches OLD seed (seed data changed) → update
 * - SEED_FORCE=true → always update
 *
 * Admin protection: if admin sets seedChecksum to null, the template
 * becomes "manually managed" and won't be overwritten.
 */
export async function seedFormTemplates(payload: Payload): Promise<void> {
  let created = 0
  let updated = 0
  let skipped = 0
  const forceUpdate = process.env.SEED_FORCE === 'true'

  for (const template of ALL_TEMPLATES) {
    const checksum = computeSeedChecksum(template)

    const existing = await payload.find({
      collection: 'form-templates',
      where: { formularNummer: { equals: template.formularNummer } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs.length === 0) {
      // New template → insert
      await payload.create({
        collection: 'form-templates',
        data: { ...template, seedChecksum: checksum },
        overrideAccess: true,
      })
      created++
    } else {
      const doc = existing.docs[0]
      const existingChecksum = doc.seedChecksum as string | null | undefined

      if (forceUpdate) {
        // SEED_FORCE=true → always update
        await payload.update({
          collection: 'form-templates',
          id: doc.id,
          data: { ...template, seedChecksum: checksum },
          overrideAccess: true,
        })
        updated++
      } else if (existingChecksum === null || existingChecksum === undefined) {
        // Legacy template without checksum → set checksum + update
        await payload.update({
          collection: 'form-templates',
          id: doc.id,
          data: { ...template, seedChecksum: checksum },
          overrideAccess: true,
        })
        updated++
      } else if (existingChecksum === checksum) {
        // Unchanged since last seed → skip
        skipped++
      } else {
        // Seed data changed, existing checksum is from old seed → update
        await payload.update({
          collection: 'form-templates',
          id: doc.id,
          data: { ...template, seedChecksum: checksum },
          overrideAccess: true,
        })
        updated++
      }
    }
  }

  if (created > 0 || updated > 0) {
    payload.logger.info(
      `FormTemplates seed: ${created} created, ${updated} updated, ${skipped} skipped (${ALL_TEMPLATES.length} total)`,
    )
  }
}

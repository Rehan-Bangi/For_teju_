import {
  CoupleMetadata,
  ImportantDate,
  RelationshipSymbol,
  EmotionalMotif,
  FutureDream,
  StorySettings,
  StoryContentConfig,
  PersonProfile,
  ChapterContentDefinition,
  LetterTemplateDefinition,
  AnniversaryContentDefinition,
} from './contentTypes';
import { CHAPTER_CONTENT } from './chapterContent';
import { LETTER_TEMPLATES } from './letterTemplates';
import { ANNIVERSARY_CONTENT } from './anniversaryContent';

const DEFAULT_SETTINGS: StorySettings = {
  toneDefault: 'warm',
  allowSurpriseReveals: true,
  defaultDateFormat: 'long',
};

function createPersonProfile(
  fullName: string,
  preferredName: string,
  nicknames: string[] = []
): PersonProfile {
  return { fullName, preferredName, nicknames };
}

// No relationship-specific facts are hardcoded beyond the two names provided
// for this project. Dates, milestones, symbols, motifs, and dreams are left
// empty/configurable so real memories can be plugged in later.
export function createCoupleMetadata(overrides: Partial<CoupleMetadata> = {}): CoupleMetadata {
  return {
    partnerA: overrides.partnerA ?? createPersonProfile('Rehan', 'Rehan'),
    partnerB: overrides.partnerB ?? createPersonProfile('Tejal', 'Teju'),
    relationshipStartDate: overrides.relationshipStartDate ?? '',
    coupleNickname: overrides.coupleNickname,
    importantDates: overrides.importantDates ?? [],
    relationshipSymbols: overrides.relationshipSymbols ?? [],
    emotionalMotifs: overrides.emotionalMotifs ?? [],
    futureDreams: overrides.futureDreams ?? [],
    settings: { ...DEFAULT_SETTINGS, ...overrides.settings },
  };
}

export class StoryContentStore {
  private config: StoryContentConfig;

  constructor(initial?: Partial<StoryContentConfig>) {
    this.config = {
      couple: initial?.couple ?? createCoupleMetadata(),
      chapters: initial?.chapters ?? CHAPTER_CONTENT,
      letterTemplates: initial?.letterTemplates ?? LETTER_TEMPLATES,
      anniversaries: initial?.anniversaries ?? ANNIVERSARY_CONTENT,
    };
  }

  getConfig(): StoryContentConfig {
    return this.config;
  }

  getCouple(): CoupleMetadata {
    return this.config.couple;
  }

  setRelationshipStartDate(date: string): void {
    this.config.couple.relationshipStartDate = date;
  }

  updatePartner(which: 'partnerA' | 'partnerB', profile: Partial<PersonProfile>): void {
    this.config.couple[which] = { ...this.config.couple[which], ...profile };
  }

  setCoupleNickname(nickname: string): void {
    this.config.couple.coupleNickname = nickname;
  }

  addImportantDate(date: ImportantDate): void {
    this.config.couple.importantDates.push(date);
  }

  removeImportantDate(id: string): void {
    this.config.couple.importantDates = this.config.couple.importantDates.filter(
      (d) => d.id !== id
    );
  }

  addRelationshipSymbol(symbol: RelationshipSymbol): void {
    this.config.couple.relationshipSymbols.push(symbol);
  }

  removeRelationshipSymbol(id: string): void {
    this.config.couple.relationshipSymbols = this.config.couple.relationshipSymbols.filter(
      (s) => s.id !== id
    );
  }

  addEmotionalMotif(motif: EmotionalMotif): void {
    this.config.couple.emotionalMotifs.push(motif);
  }

  removeEmotionalMotif(id: string): void {
    this.config.couple.emotionalMotifs = this.config.couple.emotionalMotifs.filter(
      (m) => m.id !== id
    );
  }

  addFutureDream(dream: FutureDream): void {
    this.config.couple.futureDreams.push(dream);
  }

  removeFutureDream(id: string): void {
    this.config.couple.futureDreams = this.config.couple.futureDreams.filter(
      (d) => d.id !== id
    );
  }

  updateSettings(patch: Partial<StorySettings>): void {
    this.config.couple.settings = { ...this.config.couple.settings, ...patch };
  }

  getChapters(): ChapterContentDefinition[] {
    return [...this.config.chapters].sort((a, b) => a.order - b.order);
  }

  getChapterDefinition(id: string): ChapterContentDefinition | undefined {
    return this.config.chapters.find((c) => c.id === id);
  }

  registerChapterDefinition(definition: ChapterContentDefinition): void {
    const idx = this.config.chapters.findIndex((c) => c.id === definition.id);
    if (idx >= 0) this.config.chapters[idx] = definition;
    else this.config.chapters.push(definition);
  }

  getLetterTemplates(): LetterTemplateDefinition[] {
    return this.config.letterTemplates;
  }

  getLetterTemplate(id: string): LetterTemplateDefinition | undefined {
    return this.config.letterTemplates.find((t) => t.id === id);
  }

  registerLetterTemplate(template: LetterTemplateDefinition): void {
    const idx = this.config.letterTemplates.findIndex((t) => t.id === template.id);
    if (idx >= 0) this.config.letterTemplates[idx] = template;
    else this.config.letterTemplates.push(template);
  }

  getAnniversaryDefinitions(): AnniversaryContentDefinition[] {
    return this.config.anniversaries;
  }

  getAnniversaryDefinition(id: string): AnniversaryContentDefinition | undefined {
    return this.config.anniversaries.find((a) => a.id === id);
  }

  registerAnniversaryDefinition(definition: AnniversaryContentDefinition): void {
    const idx = this.config.anniversaries.findIndex((a) => a.id === definition.id);
    if (idx >= 0) this.config.anniversaries[idx] = definition;
    else this.config.anniversaries.push(definition);
  }

  serialize(): string {
    return JSON.stringify({
      couple: this.config.couple,
      chapters: this.config.chapters,
      letterTemplates: this.config.letterTemplates.map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
      })),
      anniversaries: this.config.anniversaries.map((a) => ({
        id: a.id,
        frequency: a.frequency,
        label: a.label,
        emotionalTheme: a.emotionalTheme,
        memoryHighlightStrategy: a.memoryHighlightStrategy,
      })),
    });
  }
}

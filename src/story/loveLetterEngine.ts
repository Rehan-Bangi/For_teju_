import { Memory } from './memory.types';

export interface LetterSection {
  id: string;
  heading: string;
  body: string;
  order: number;
}

export interface LoveLetter {
  id: string;
  title: string;
  sections: LetterSection[];
  signature: string;
  generatedAt: string;
}

export interface PersonalizationContext {
  recipientName: string;
  senderName: string;
  petNames?: string[];
  sharedJoke?: string;
  anniversaryYears?: number;
}

export type LetterTemplate = (
  ctx: PersonalizationContext,
  memories: Memory[]
) => LetterSection[];

function fillTemplate(template: string, ctx: PersonalizationContext): string {
  return template
    .replace(/{{recipientName}}/g, ctx.recipientName)
    .replace(/{{senderName}}/g, ctx.senderName)
    .replace(/{{sharedJoke}}/g, ctx.sharedJoke ?? '')
    .replace(/{{anniversaryYears}}/g, String(ctx.anniversaryYears ?? ''));
}

const DEFAULT_OPENING = `My dearest {{recipientName}},`;
const DEFAULT_CLOSING = `Forever and always,\n{{senderName}}`;

export class LoveLetterEngine {
  private templates: Map<string, LetterTemplate> = new Map();

  registerTemplate(key: string, template: LetterTemplate): void {
    this.templates.set(key, template);
  }

  private defaultBodySections(
    ctx: PersonalizationContext,
    memories: Memory[]
  ): LetterSection[] {
    const significant = memories
      .filter((m) => m.importance >= 4)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    return significant.map((m, i) => ({
      id: `section_${m.id}`,
      heading: m.title,
      body: fillTemplate(
        `I still think about ${m.description.toLowerCase()} It is one of the moments that made me fall deeper for you, {{recipientName}}.`,
        ctx
      ),
      order: i + 1,
    }));
  }

  generate(
    ctx: PersonalizationContext,
    memories: Memory[],
    templateKey?: string
  ): LoveLetter {
    const opening: LetterSection = {
      id: 'opening',
      heading: 'Opening',
      body: fillTemplate(DEFAULT_OPENING, ctx),
      order: 0,
    };

    const bodySections =
      templateKey && this.templates.has(templateKey)
        ? this.templates.get(templateKey)!(ctx, memories)
        : this.defaultBodySections(ctx, memories);

    const closing: LetterSection = {
      id: 'closing',
      heading: 'Closing',
      body: fillTemplate(DEFAULT_CLOSING, ctx),
      order: bodySections.length + 1,
    };

    return {
      id: `letter_${Date.now()}`,
      title: `For ${ctx.recipientName}`,
      sections: [opening, ...bodySections, closing],
      signature: ctx.senderName,
      generatedAt: new Date().toISOString(),
    };
  }

  generateAnniversaryLetter(
    ctx: PersonalizationContext,
    memories: Memory[]
  ): LoveLetter {
    const years = ctx.anniversaryYears ?? 1;
    const lastYearStart = new Date().getFullYear() - 1;
    const yearMemories = memories.filter(
      (m) => new Date(m.date).getFullYear() === lastYearStart
    );

    const anniversarySection: LetterSection = {
      id: 'anniversary_reflection',
      heading: `${years} ${years === 1 ? 'Year' : 'Years'} Together`,
      body: fillTemplate(
        `{{anniversaryYears}} years with you, {{recipientName}}, and every single one has felt like a gift I did not know I deserved.`,
        ctx
      ),
      order: 1,
    };

    const letter = this.generate(ctx, yearMemories);
    return {
      ...letter,
      title: `Happy Anniversary, ${ctx.recipientName}`,
      sections: [letter.sections[0]!, anniversarySection, ...letter.sections.slice(1)],
    };
  }
}

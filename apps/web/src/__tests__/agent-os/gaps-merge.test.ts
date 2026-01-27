/**
 * Gap Merge Tests
 *
 * Tests the gap merging logic that deduplicates gaps and applies
 * severity preference rules across assembly phases.
 */

import {
  mergeGaps,
  type AssemblyGap,
} from '@epic-ai/workers/processors/agent-os';

describe('Gap Merge Logic', () => {
  describe('Deduplication by type and field_path', () => {
    it('deduplicates identical gaps', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Cannot answer pricing questions',
          recommended_fix: 'Add pricing information',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'No pricing data available',
          recommended_fix: 'Update pricing in profile',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      // Should have only one gap
      expect(merged.length).toBe(1);
      expect(merged[0].gap_type).toBe('missing_pricing');
      expect(merged[0].field_path).toBe('company.pricing');
    });

    it('keeps distinct gaps with different types', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Impact A',
          recommended_fix: 'Fix A',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_hours',
          field_path: 'company.hours',
          severity: 'low',
          impact: 'Impact B',
          recommended_fix: 'Fix B',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(2);
      expect(merged.map((g) => g.gap_type)).toContain('missing_pricing');
      expect(merged.map((g) => g.gap_type)).toContain('missing_hours');
    });

    it('keeps distinct gaps with different field_paths', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_config',
          field_path: 'personality.tone',
          severity: 'low',
          impact: 'Impact A',
          recommended_fix: 'Fix A',
          source_phase: 'personality',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_config',
          field_path: 'personality.language',
          severity: 'low',
          impact: 'Impact B',
          recommended_fix: 'Fix B',
          source_phase: 'personality',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(2);
      expect(merged.map((g) => g.field_path)).toContain('personality.tone');
      expect(merged.map((g) => g.field_path)).toContain('personality.language');
    });
  });

  describe('Severity preference', () => {
    it('keeps higher severity when merging duplicates (medium → high)', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Medium impact',
          recommended_fix: 'Medium fix',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'high',
          impact: 'Critical: No pricing info',
          recommended_fix: 'Add pricing immediately',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      expect(merged[0].severity).toBe('high');
      expect(merged[0].source_phase).toBe('knowledge'); // Should take the higher severity entry
    });

    it('keeps higher severity when merging duplicates (low → medium)', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_contact',
          field_path: 'company.contact.email',
          severity: 'low',
          impact: 'Low impact',
          recommended_fix: 'Add email',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_contact',
          field_path: 'company.contact.email',
          severity: 'medium',
          impact: 'Medium impact',
          recommended_fix: 'Add email for notifications',
          source_phase: 'flow',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      expect(merged[0].severity).toBe('medium');
    });

    it('keeps higher severity when merging duplicates (low → high)', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_services',
          field_path: 'company.services',
          severity: 'low',
          impact: 'Limited service info',
          recommended_fix: 'Add services',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_services',
          field_path: 'company.services',
          severity: 'high',
          impact: 'Cannot discuss services',
          recommended_fix: 'Must add services immediately',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      expect(merged[0].severity).toBe('high');
    });

    it('keeps existing when new has lower severity', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'high',
          impact: 'Critical',
          recommended_fix: 'Fix immediately',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'low',
          impact: 'Minor',
          recommended_fix: 'Add when possible',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      expect(merged[0].severity).toBe('high');
      expect(merged[0].source_phase).toBe('enrichment'); // Should keep existing
    });

    it('keeps existing when severities are equal', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'First detected',
          recommended_fix: 'Original fix',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Duplicate',
          recommended_fix: 'Different fix',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      // When equal, existing takes precedence
      expect(merged[0].source_phase).toBe('enrichment');
    });
  });

  describe('Multi-phase merging', () => {
    it('correctly merges gaps from multiple phases', () => {
      // Simulate gaps accumulating through phases
      let gaps: AssemblyGap[] = [];

      // Phase 1: Enrichment
      const enrichmentGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_industry',
          field_path: 'company.industry',
          severity: 'low',
          impact: 'Cannot optimize for industry',
          recommended_fix: 'Add industry',
          source_phase: 'enrichment',
        },
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'low',
          impact: 'No pricing',
          recommended_fix: 'Add pricing',
          source_phase: 'enrichment',
        },
      ];
      gaps = mergeGaps(gaps, enrichmentGaps);
      expect(gaps.length).toBe(2);

      // Phase 2: Template (no new gaps related to existing)
      const templateGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_template',
          field_path: 'template.custom',
          severity: 'low',
          impact: 'Using default template',
          recommended_fix: 'Consider custom template',
          source_phase: 'template',
        },
      ];
      gaps = mergeGaps(gaps, templateGaps);
      expect(gaps.length).toBe(3);

      // Phase 3: Knowledge (escalates pricing gap)
      const knowledgeGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'high', // Escalated!
          impact: 'Cannot answer pricing questions',
          recommended_fix: 'Add pricing immediately',
          source_phase: 'knowledge',
        },
        {
          gap_type: 'missing_services',
          field_path: 'company.services',
          severity: 'medium',
          impact: 'Limited service knowledge',
          recommended_fix: 'Add service details',
          source_phase: 'knowledge',
        },
      ];
      gaps = mergeGaps(gaps, knowledgeGaps);

      // Should have 4 unique gaps
      expect(gaps.length).toBe(4);

      // Pricing gap should be escalated to high
      const pricingGap = gaps.find((g) => g.gap_type === 'missing_pricing');
      expect(pricingGap?.severity).toBe('high');
      expect(pricingGap?.source_phase).toBe('knowledge');

      // Other gaps should remain
      expect(gaps.find((g) => g.gap_type === 'missing_industry')).toBeDefined();
      expect(gaps.find((g) => g.gap_type === 'missing_template')).toBeDefined();
      expect(gaps.find((g) => g.gap_type === 'missing_services')).toBeDefined();
    });

    it('handles empty existing gaps', () => {
      const existing: AssemblyGap[] = [];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Impact',
          recommended_fix: 'Fix',
          source_phase: 'enrichment',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      expect(merged[0].gap_type).toBe('missing_pricing');
    });

    it('handles empty new gaps', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Impact',
          recommended_fix: 'Fix',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      expect(merged[0].gap_type).toBe('missing_pricing');
    });

    it('handles both empty', () => {
      const merged = mergeGaps([], []);
      expect(merged.length).toBe(0);
    });
  });

  describe('Gap structure preservation', () => {
    it('preserves all gap fields', () => {
      const existing: AssemblyGap[] = [];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing.model',
          severity: 'high',
          impact: 'Critical: Cannot provide pricing information',
          recommended_fix: 'Add pricing model and rates',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged[0]).toEqual({
        gap_type: 'missing_pricing',
        field_path: 'company.pricing.model',
        severity: 'high',
        impact: 'Critical: Cannot provide pricing information',
        recommended_fix: 'Add pricing model and rates',
        source_phase: 'knowledge',
      });
    });

    it('preserves gap ordering (existing gaps first, then new)', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_contact',
          field_path: 'company.contact',
          severity: 'low',
          impact: 'A',
          recommended_fix: 'A',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_services',
          field_path: 'company.services',
          severity: 'medium',
          impact: 'B',
          recommended_fix: 'B',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      // First gap should be from existing
      expect(merged[0].gap_type).toBe('missing_contact');
      // Second gap should be from new
      expect(merged[1].gap_type).toBe('missing_services');
    });
  });

  describe('Real-world gap scenarios', () => {
    it('Solar company missing pricing - escalates through pipeline', () => {
      // Initial enrichment - low severity
      let gaps = mergeGaps([], [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'low',
          impact: 'Pricing not detected from website',
          recommended_fix: 'Add pricing information',
          source_phase: 'enrichment',
        },
      ]);

      // Knowledge phase - escalates to medium
      gaps = mergeGaps(gaps, [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Cannot answer common pricing questions',
          recommended_fix: 'Add pricing to knowledge base',
          source_phase: 'knowledge',
        },
      ]);

      // Governance phase - escalates to high for sales agents
      gaps = mergeGaps(gaps, [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'high',
          impact: 'Sales agents must discuss pricing - critical gap',
          recommended_fix: 'Add pricing immediately before deployment',
          source_phase: 'governance',
        },
      ]);

      // Should have one gap at highest severity
      expect(gaps.filter((g) => g.gap_type === 'missing_pricing').length).toBe(1);
      expect(gaps.find((g) => g.gap_type === 'missing_pricing')?.severity).toBe('high');
    });

    it('Healthcare practice - accumulates compliance gaps', () => {
      let gaps: AssemblyGap[] = [];

      // Enrichment detects missing certifications
      gaps = mergeGaps(gaps, [
        {
          gap_type: 'missing_certification',
          field_path: 'company.certifications',
          severity: 'medium',
          impact: 'Cannot verify certifications',
          recommended_fix: 'Add certifications',
          source_phase: 'enrichment',
        },
      ]);

      // Governance adds compliance gaps
      gaps = mergeGaps(gaps, [
        {
          gap_type: 'missing_hipaa',
          field_path: 'governance.hipaa_compliant',
          severity: 'high',
          impact: 'Healthcare requires HIPAA compliance',
          recommended_fix: 'Enable HIPAA mode',
          source_phase: 'governance',
        },
        {
          gap_type: 'missing_disclaimer',
          field_path: 'governance.medical_disclaimer',
          severity: 'high',
          impact: 'Must include medical disclaimer',
          recommended_fix: 'Add medical disclaimer template',
          source_phase: 'governance',
        },
      ]);

      expect(gaps.length).toBe(3);
      expect(gaps.filter((g) => g.severity === 'high').length).toBe(2);
    });
  });
});

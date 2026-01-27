/**
 * Template Recommendation Engine (TRE v1) Tests
 *
 * Tests the multi-factor weighted scoring algorithm.
 */

import {
  calculateTemplateScore,
  getTemplateRecommendations,
  DEFAULT_TEMPLATE_LIBRARY,
  type AgentTemplate,
  type TemplateRecommendationInput,
} from '@epic-ai/workers/processors/agent-os';

describe('Template Recommendation Engine v1', () => {
  describe('calculateTemplateScore', () => {
    const salesQualifierTemplate = DEFAULT_TEMPLATE_LIBRARY.find(
      (t) => t.agent_type === 'sales_qualifier'
    )!;
    const appointmentTemplate = DEFAULT_TEMPLATE_LIBRARY.find(
      (t) => t.agent_type === 'appointment_setter'
    )!;
    const supportTemplate = DEFAULT_TEMPLATE_LIBRARY.find(
      (t) => t.agent_type === 'customer_support'
    )!;

    it('scores industry match correctly (30 points max)', () => {
      const input: TemplateRecommendationInput = {
        industry: 'technology',
      };

      const { total, breakdown } = calculateTemplateScore(salesQualifierTemplate, input);

      // Should get high industry match score for technology company + sales_qualifier
      expect(breakdown.industry_match).toBeGreaterThan(20);
      expect(total).toBeGreaterThan(20);
    });

    it('scores business model match correctly (15 points max)', () => {
      const input: TemplateRecommendationInput = {
        industry: 'software',
        business_model: 'b2b',
      };

      const { breakdown } = calculateTemplateScore(salesQualifierTemplate, input);

      // B2B business should match sales_qualifier which targets B2B
      expect(breakdown.business_model_match).toBe(15);
    });

    it('scores sales complexity match correctly (15 points max)', () => {
      const input: TemplateRecommendationInput = {
        industry: 'consulting',
        sales_complexity: 'complex',
      };

      const { breakdown } = calculateTemplateScore(salesQualifierTemplate, input);

      // Complex sales should match sales_qualifier
      expect(breakdown.sales_complexity_match).toBe(15);
    });

    it('scores AI recommended type correctly (10 points max)', () => {
      const input: TemplateRecommendationInput = {
        industry: 'any',
        recommended_agent_types: ['sales_qualifier'],
      };

      const salesScore = calculateTemplateScore(salesQualifierTemplate, input);
      const supportScore = calculateTemplateScore(supportTemplate, input);

      // Only sales_qualifier should get the AI recommended bonus
      expect(salesScore.breakdown.ai_recommended_type).toBe(10);
      expect(supportScore.breakdown.ai_recommended_type).toBe(0);
    });

    it('scores conversation fit based on business model', () => {
      const b2bInput: TemplateRecommendationInput = {
        business_model: 'b2b',
      };

      const b2cInput: TemplateRecommendationInput = {
        business_model: 'b2c',
      };

      const b2bSalesScore = calculateTemplateScore(salesQualifierTemplate, b2bInput);
      const b2cSupportScore = calculateTemplateScore(supportTemplate, b2cInput);

      // B2B should fit lead_gen conversation type (sales_qualifier)
      expect(b2bSalesScore.breakdown.conversation_fit).toBeGreaterThan(0);

      // B2C should fit support conversation type
      expect(b2cSupportScore.breakdown.conversation_fit).toBeGreaterThan(0);
    });

    it('scores market effectiveness correctly (10 points max)', () => {
      const input: TemplateRecommendationInput = {};

      const appointmentScore = calculateTemplateScore(appointmentTemplate, input);

      // Appointment setter has 85% market effectiveness
      expect(appointmentScore.breakdown.market_effectiveness).toBeCloseTo(8.5, 1);
    });

    it('generates appropriate reasons for high-scoring templates', () => {
      const input: TemplateRecommendationInput = {
        industry: 'technology',
        business_model: 'b2b',
        sales_complexity: 'complex',
        recommended_agent_types: ['sales_qualifier'],
      };

      const { reasons } = calculateTemplateScore(salesQualifierTemplate, input);

      // Should have multiple reasons for a well-matched template
      expect(reasons.length).toBeGreaterThanOrEqual(3);
      expect(reasons.some((r) => r.toLowerCase().includes('industry'))).toBe(true);
      expect(reasons.some((r) => r.toLowerCase().includes('b2b'))).toBe(true);
    });

    it('provides fallback reason for low-scoring templates', () => {
      const input: TemplateRecommendationInput = {
        industry: 'restaurants',
        business_model: 'b2c',
        sales_complexity: 'simple',
      };

      // Sales qualifier is not a good match for restaurants
      const { reasons, total } = calculateTemplateScore(salesQualifierTemplate, input);

      // Should still have at least one reason
      expect(reasons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getTemplateRecommendations', () => {
    it('returns sorted recommendations by score', () => {
      const input: TemplateRecommendationInput = {
        industry: 'technology',
        business_model: 'saas',
        sales_complexity: 'moderate',
      };

      const recommendations = getTemplateRecommendations(input);

      // Should be sorted descending by score
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].match_score).toBeGreaterThanOrEqual(
          recommendations[i].match_score
        );
      }
    });

    it('limits results to maxResults', () => {
      const input: TemplateRecommendationInput = {
        industry: 'any',
      };

      const recommendations = getTemplateRecommendations(input, DEFAULT_TEMPLATE_LIBRARY, 3);

      expect(recommendations.length).toBe(3);
    });

    it('includes match_level based on score thresholds', () => {
      const input: TemplateRecommendationInput = {
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
        recommended_agent_types: ['appointment_setter'],
      };

      const recommendations = getTemplateRecommendations(input);

      // Top recommendation should have a match level
      expect(['excellent', 'strong', 'good', 'fair', 'poor']).toContain(
        recommendations[0].match_level
      );
    });

    it('includes expected_outcome for each recommendation', () => {
      const input: TemplateRecommendationInput = {};

      const recommendations = getTemplateRecommendations(input);

      recommendations.forEach((rec) => {
        expect(rec.expected_outcome).toBeDefined();
        // ExpectedOutcome is now an object with kpi, range, impact, description
        expect(rec.expected_outcome.kpi).toBeDefined();
        expect(rec.expected_outcome.range).toBeDefined();
        expect(rec.expected_outcome.impact).toBeDefined();
        expect(rec.expected_outcome.description).toBeDefined();
        expect(rec.expected_outcome.description.length).toBeGreaterThan(10);
      });
    });

    it('normalizes match_score to 0-1 range', () => {
      const input: TemplateRecommendationInput = {
        industry: 'technology',
        business_model: 'b2b',
        sales_complexity: 'complex',
        recommended_agent_types: ['sales_qualifier'],
      };

      const recommendations = getTemplateRecommendations(input);

      recommendations.forEach((rec) => {
        expect(rec.match_score).toBeGreaterThanOrEqual(0);
        expect(rec.match_score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('scoring scenarios', () => {
    it('B2B SaaS company gets high sales_qualifier score', () => {
      const input: TemplateRecommendationInput = {
        industry: 'software',
        business_model: 'saas',
        sales_complexity: 'complex',
        service_category_tags: ['sales', 'crm'],
        recommended_agent_types: ['sales_qualifier'],
      };

      const recommendations = getTemplateRecommendations(input);

      // Sales qualifier should be highly ranked
      const salesQualifier = recommendations.find((r) =>
        r.template_id.includes('sales_qualifier')
      );
      expect(salesQualifier).toBeDefined();
      expect(salesQualifier!.match_score).toBeGreaterThan(0.6);
    });

    it('Healthcare practice gets high appointment_setter score', () => {
      const input: TemplateRecommendationInput = {
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
        service_category_tags: ['appointments', 'scheduling'],
        recommended_agent_types: ['appointment_setter'],
      };

      const recommendations = getTemplateRecommendations(input);

      // Appointment setter should be top ranked
      expect(recommendations[0].template_id).toContain('appointment');
      expect(recommendations[0].match_level).toBe('excellent');
    });

    it('Ecommerce business gets high support/recommender scores', () => {
      const input: TemplateRecommendationInput = {
        industry: 'ecommerce',
        business_model: 'b2c',
        sales_complexity: 'simple',
        service_category_tags: ['shopping', 'support'],
        recommended_agent_types: ['customer_support', 'product_recommender'],
      };

      const recommendations = getTemplateRecommendations(input);

      // Support or recommender should be highly ranked
      const topTypes = recommendations.slice(0, 3).map((r) => r.template_id);
      expect(
        topTypes.some((t) => t.includes('support') || t.includes('recommender'))
      ).toBe(true);
    });

    it('Unknown business model gets partial credit', () => {
      const input: TemplateRecommendationInput = {
        industry: 'technology',
        business_model: 'unknown',
      };

      const recommendations = getTemplateRecommendations(input);

      // Should still get recommendations with partial scores
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].match_score).toBeGreaterThan(0.2);
    });

    it('Empty input returns default recommendations', () => {
      const input: TemplateRecommendationInput = {};

      const recommendations = getTemplateRecommendations(input);

      // Should still return recommendations based on market effectiveness
      expect(recommendations.length).toBe(5);
      recommendations.forEach((rec) => {
        expect(rec.match_score).toBeGreaterThan(0);
      });
    });

    it('Solar installer gets high sales_qualifier score (spec example)', () => {
      // From spec: Solar Installer scoring ~96/100
      const input: TemplateRecommendationInput = {
        industry: 'solar',
        business_model: 'b2c',
        sales_complexity: 'complex',
        service_category_tags: ['installation', 'home improvement', 'consultation', 'sales'],
        recommended_agent_types: ['sales_qualifier', 'appointment_setter'],
      };

      const recommendations = getTemplateRecommendations(input);

      // Sales qualifier should be highly ranked (top 2)
      const topTemplates = recommendations.slice(0, 2);
      const hasSalesQualifier = topTemplates.some((t) => t.template_id.includes('sales_qualifier'));
      expect(hasSalesQualifier).toBe(true);

      // Should be excellent match
      const salesQualifier = recommendations.find((r) => r.template_id.includes('sales_qualifier'));
      expect(salesQualifier).toBeDefined();
      expect(salesQualifier!.match_level).toBe('excellent');
      expect(salesQualifier!.match_score).toBeGreaterThan(0.85);
    });

    it('Returns KPI-based expected outcomes', () => {
      const input: TemplateRecommendationInput = {
        industry: 'technology',
        recommended_agent_types: ['sales_qualifier'],
      };

      const recommendations = getTemplateRecommendations(input);
      const salesQualifier = recommendations.find((r) => r.template_id.includes('sales_qualifier'));

      expect(salesQualifier).toBeDefined();
      expect(salesQualifier!.expected_outcome.kpi).toBe('qualified_leads_per_week');
      expect(salesQualifier!.expected_outcome.range).toBe('15-30');
      expect(salesQualifier!.expected_outcome.impact).toBe('primary revenue driver');
    });
  });
});

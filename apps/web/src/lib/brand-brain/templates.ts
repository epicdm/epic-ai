/**
 * Brand Brain Templates
 * Pre-configured settings for common business types to speed up onboarding
 */

export interface BrandTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  voiceTone: string;
  writingStyle: string;
  emojiStyle: "none" | "minimal" | "moderate" | "heavy";
  ctaStyle: "none" | "soft" | "direct" | "urgent";
  contentPillars: string[];
  targetAudience: {
    demographics: string[];
    interests: string[];
    painPoints: string[];
  };
  suggestedHashtags: string[];
  sampleValues: string[];
}

export const brandTemplates: BrandTemplate[] = [
  {
    id: "tech-startup",
    name: "Tech Startup",
    description: "Software companies, apps, and tech innovators",
    icon: "🚀",
    voiceTone: "innovative",
    writingStyle: "conversational",
    emojiStyle: "minimal",
    ctaStyle: "direct",
    contentPillars: [
      "Product Updates",
      "Industry Insights",
      "Behind the Scenes",
      "Customer Success Stories",
      "Tech Tips",
    ],
    targetAudience: {
      demographics: ["Tech professionals", "Early adopters", "Business decision-makers"],
      interests: ["Innovation", "Productivity", "Technology trends"],
      painPoints: ["Manual processes", "Scaling challenges", "Integration issues"],
    },
    suggestedHashtags: ["TechStartup", "Innovation", "SaaS", "Productivity"],
    sampleValues: ["Innovation", "Transparency", "Customer Success"],
  },
  {
    id: "ecommerce",
    name: "E-commerce / Retail",
    description: "Online stores and retail businesses",
    icon: "🛍️",
    voiceTone: "friendly",
    writingStyle: "persuasive",
    emojiStyle: "moderate",
    ctaStyle: "urgent",
    contentPillars: [
      "New Arrivals",
      "Sales & Promotions",
      "Product Spotlights",
      "Customer Reviews",
      "Style Tips",
    ],
    targetAudience: {
      demographics: ["Online shoppers", "Value-conscious consumers", "Trend followers"],
      interests: ["Shopping", "Deals", "Quality products"],
      painPoints: ["Finding quality products", "Price comparison", "Shipping concerns"],
    },
    suggestedHashtags: ["ShopNow", "NewArrivals", "Sale", "MustHave"],
    sampleValues: ["Quality", "Value", "Customer Satisfaction"],
  },
  {
    id: "professional-services",
    name: "Professional Services",
    description: "Consulting, legal, accounting, and B2B services",
    icon: "💼",
    voiceTone: "professional",
    writingStyle: "authoritative",
    emojiStyle: "none",
    ctaStyle: "soft",
    contentPillars: [
      "Industry Expertise",
      "Case Studies",
      "Thought Leadership",
      "Regulatory Updates",
      "Best Practices",
    ],
    targetAudience: {
      demographics: ["Business owners", "C-suite executives", "Department heads"],
      interests: ["Business growth", "Compliance", "Efficiency"],
      painPoints: ["Complex regulations", "Resource constraints", "Strategic planning"],
    },
    suggestedHashtags: ["BusinessTips", "Leadership", "Growth", "Strategy"],
    sampleValues: ["Excellence", "Integrity", "Expertise"],
  },
  {
    id: "healthcare",
    name: "Healthcare & Wellness",
    description: "Medical practices, wellness centers, and health brands",
    icon: "🏥",
    voiceTone: "caring",
    writingStyle: "educational",
    emojiStyle: "minimal",
    ctaStyle: "soft",
    contentPillars: [
      "Health Tips",
      "Wellness Education",
      "Patient Stories",
      "Service Highlights",
      "Community Health",
    ],
    targetAudience: {
      demographics: ["Health-conscious individuals", "Patients", "Caregivers"],
      interests: ["Wellness", "Prevention", "Quality care"],
      painPoints: ["Access to care", "Health concerns", "Finding trusted providers"],
    },
    suggestedHashtags: ["Health", "Wellness", "HealthyLiving", "SelfCare"],
    sampleValues: ["Compassion", "Excellence", "Patient-Centered Care"],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    description: "Agents, brokers, and property management",
    icon: "🏠",
    voiceTone: "trustworthy",
    writingStyle: "informative",
    emojiStyle: "minimal",
    ctaStyle: "direct",
    contentPillars: [
      "Property Listings",
      "Market Updates",
      "Buying/Selling Tips",
      "Neighborhood Guides",
      "Success Stories",
    ],
    targetAudience: {
      demographics: ["Home buyers", "Sellers", "Investors"],
      interests: ["Real estate", "Investment", "Home ownership"],
      painPoints: ["Market uncertainty", "Finding the right property", "Negotiation"],
    },
    suggestedHashtags: ["RealEstate", "HomeForSale", "DreamHome", "JustListed"],
    sampleValues: ["Trust", "Local Expertise", "Client First"],
  },
  {
    id: "restaurant",
    name: "Restaurant & Food",
    description: "Restaurants, cafes, and food brands",
    icon: "🍽️",
    voiceTone: "warm",
    writingStyle: "conversational",
    emojiStyle: "heavy",
    ctaStyle: "urgent",
    contentPillars: [
      "Menu Highlights",
      "Behind the Kitchen",
      "Special Events",
      "Customer Favorites",
      "Food Stories",
    ],
    targetAudience: {
      demographics: ["Food lovers", "Local diners", "Event planners"],
      interests: ["Dining out", "Food quality", "Experiences"],
      painPoints: ["Finding good food", "Value for money", "Convenience"],
    },
    suggestedHashtags: ["Foodie", "EatLocal", "FoodLovers", "Delicious"],
    sampleValues: ["Quality Ingredients", "Warm Hospitality", "Community"],
  },
  {
    id: "creative-agency",
    name: "Creative Agency",
    description: "Marketing, design, and creative services",
    icon: "🎨",
    voiceTone: "creative",
    writingStyle: "bold",
    emojiStyle: "moderate",
    ctaStyle: "direct",
    contentPillars: [
      "Portfolio Work",
      "Creative Process",
      "Industry Trends",
      "Client Wins",
      "Team Culture",
    ],
    targetAudience: {
      demographics: ["Marketing managers", "Brand owners", "Entrepreneurs"],
      interests: ["Branding", "Design", "Marketing"],
      painPoints: ["Standing out", "Consistent branding", "ROI on creative"],
    },
    suggestedHashtags: ["Creative", "Design", "Branding", "Marketing"],
    sampleValues: ["Creativity", "Collaboration", "Results"],
  },
  {
    id: "fitness",
    name: "Fitness & Sports",
    description: "Gyms, trainers, and sports brands",
    icon: "💪",
    voiceTone: "energetic",
    writingStyle: "motivational",
    emojiStyle: "heavy",
    ctaStyle: "urgent",
    contentPillars: [
      "Workout Tips",
      "Transformation Stories",
      "Nutrition Advice",
      "Class Schedules",
      "Motivation",
    ],
    targetAudience: {
      demographics: ["Fitness enthusiasts", "Health seekers", "Athletes"],
      interests: ["Fitness", "Health", "Performance"],
      painPoints: ["Motivation", "Time constraints", "Knowing what works"],
    },
    suggestedHashtags: ["Fitness", "Workout", "FitFam", "HealthyLifestyle"],
    sampleValues: ["Determination", "Community", "Results"],
  },
  {
    id: "education",
    name: "Education & Training",
    description: "Schools, courses, and educational content",
    icon: "📚",
    voiceTone: "encouraging",
    writingStyle: "educational",
    emojiStyle: "minimal",
    ctaStyle: "soft",
    contentPillars: [
      "Learning Tips",
      "Course Updates",
      "Student Success",
      "Industry Knowledge",
      "Career Advice",
    ],
    targetAudience: {
      demographics: ["Students", "Professionals", "Lifelong learners"],
      interests: ["Learning", "Career growth", "Skills development"],
      painPoints: ["Time for learning", "Choosing right courses", "Practical skills"],
    },
    suggestedHashtags: ["Learning", "Education", "Skills", "Growth"],
    sampleValues: ["Excellence", "Accessibility", "Empowerment"],
  },
  {
    id: "custom",
    name: "Custom / Other",
    description: "Start from scratch with your own settings",
    icon: "✨",
    voiceTone: "professional",
    writingStyle: "balanced",
    emojiStyle: "minimal",
    ctaStyle: "soft",
    contentPillars: [],
    targetAudience: {
      demographics: [],
      interests: [],
      painPoints: [],
    },
    suggestedHashtags: [],
    sampleValues: [],
  },
];

export function getTemplateById(id: string): BrandTemplate | undefined {
  return brandTemplates.find((t) => t.id === id);
}

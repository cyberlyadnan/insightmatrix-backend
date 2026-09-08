import { isLockedMemberPanelQuestionId } from "./member-panel-locked";

/** Professional demographic & participation profile for panel matching — stable ids per seed prefix */

export function buildMemberPanelQuestions(seed: string) {
  const o = (idx: number, label: string, value: string) => ({
    id: `${seed}_opt_${idx}`,
    label,
    value
  });

  const q = (
    suffix: string,
    fields: {
      type: "radio" | "checkbox" | "dropdown" | "short_text";
      title: string;
      description?: string;
      helperText?: string;
      required?: boolean;
      placeholder?: string;
      options?: ReturnType<typeof o>[];
      validation?: Record<string, number | null | undefined>;
      order: number;
    }
  ) => {
    const id = `${seed}${suffix}`;
    const locked = isLockedMemberPanelQuestionId(id);
    return {
      id,
      type: fields.type,
      title: fields.title,
      description: fields.description ?? "",
      helperText: fields.helperText ?? "",
      required: locked ? true : Boolean(fields.required),
      placeholder: fields.placeholder ?? "",
      defaultValue: null,
      options: fields.options ?? [],
      validation: fields.validation ?? {},
      randomizeOptions: false,
      order: fields.order,
      visibilityConditions: [],
      isLocked: locked
    };
  };

  return [
    q("_q_age", {
      type: "radio",
      title: "Which age range do you fall into?",
      helperText: "Used to match age-targeted surveys.",
      order: 0,
      options: [
        o(1, "18–24", "18_24"),
        o(2, "25–34", "25_34"),
        o(3, "35–44", "35_44"),
        o(4, "45–54", "45_54"),
        o(5, "55 or older", "55_plus")
      ]
    }),
    q("_q_gender", {
      type: "radio",
      title: "How do you describe your gender?",
      order: 1,
      options: [
        o(10, "Female", "female"),
        o(11, "Male", "male"),
        o(12, "Non-binary / third gender", "non_binary"),
        o(13, "Prefer not to say", "prefer_not")
      ]
    }),
    q("_q_country", {
      type: "dropdown",
      title: "What is your country of residence?",
      helperText: "Search all countries — same ISO list as survey targeting.",
      placeholder: "Search and select country",
      order: 2,
      // Full country list is provided by the member UI CountrySearchSelect (ISO codes).
      // Options kept minimal for admin preview; API accepts any ISO alpha-2 for this field.
      options: [
        o(20, "United States", "US"),
        o(21, "United Kingdom", "GB"),
        o(22, "Canada", "CA"),
        o(23, "India", "IN"),
        o(24, "Australia", "AU"),
        o(25, "Germany", "DE"),
        o(26, "Other", "OTHER")
      ]
    }),
    q("_q_region", {
      type: "short_text",
      title: "City or region",
      description: "Helps match location-based studies without storing a full address.",
      helperText: "e.g. Bangalore, Greater London, Ontario",
      required: true,
      placeholder: "City, state/province, or region",
      validation: { minLength: 2, maxLength: 120 },
      order: 3
    }),
    q("_q_employment", {
      type: "radio",
      title: "What best describes your current employment status?",
      helperText: "Matched to survey profession targeting.",
      order: 4,
      options: [
        o(40, "Employed full-time", "full_time"),
        o(41, "Employed part-time", "part_time"),
        o(42, "Self-employed / freelancer", "self_employed"),
        o(43, "Student", "student"),
        o(44, "Not employed / homemaker / retired", "other_ne"),
        o(45, "Prefer not to say", "prefer_not")
      ]
    }),
    q("_q_industry", {
      type: "dropdown",
      title: "Which industry do you primarily work or study in?",
      helperText: "Choose the closest match — used for industry-targeted surveys.",
      placeholder: "Select industry",
      order: 5,
      // Values aligned with PANEL_INDUSTRY_OPTIONS / matching aliases
      options: [
        o(50, "Technology / IT", "technology"),
        o(51, "Healthcare / Life sciences", "healthcare"),
        o(52, "Finance / Insurance", "finance"),
        o(53, "Retail / Consumer goods", "retail"),
        o(54, "Manufacturing / Industrial", "mfg"),
        o(55, "Education", "education"),
        o(56, "Government / Public sector", "government"),
        o(57, "Media / Marketing / Advertising", "media"),
        o(58, "Hospitality / Travel", "hospitality"),
        o(59, "Other / Not applicable", "other")
      ]
    }),
    q("_q_education", {
      type: "radio",
      title: "What is your highest level of education completed?",
      order: 6,
      options: [
        o(60, "Secondary / high school or less", "secondary"),
        o(61, "Some college / vocational", "some_college"),
        o(62, "Bachelor’s degree", "bachelors"),
        o(63, "Master’s degree or higher", "masters_plus"),
        o(64, "Prefer not to say", "prefer_not")
      ]
    }),
    q("_q_income", {
      type: "radio",
      title: "Household income before taxes (annual, approximate)",
      helperText: "Use your local currency; ranges are relative bands for screening.",
      order: 7,
      options: [
        o(70, "Under $25,000 / €20,000 / ₹5 lakh", "band_1"),
        o(71, "$25,000–$49,999 / ₹5–10 lakh", "band_2"),
        o(72, "$50,000–$99,999 / ₹10–20 lakh", "band_3"),
        o(73, "$100,000–$149,999 / ₹20–40 lakh", "band_4"),
        o(74, "$150,000 or more / ₹40 lakh+", "band_5"),
        o(75, "Prefer not to say", "prefer_not")
      ]
    }),
    q("_q_ethnicity", {
      type: "radio",
      title: "How would you describe your ethnicity or cultural background?",
      helperText: "Used only in aggregate for representative sampling.",
      order: 8,
      options: [
        o(80, "Asian", "asian"),
        o(81, "Black / African descent", "black"),
        o(82, "Hispanic / Latino", "hispanic"),
        o(83, "White / Caucasian", "white"),
        o(84, "Middle Eastern / North African", "mena"),
        o(85, "Mixed / Multiple", "mixed"),
        o(86, "Prefer not to say", "prefer_not")
      ]
    }),
    q("_q_devices", {
      type: "checkbox",
      title: "Which devices do you use regularly?",
      helperText: "Select all that apply — matched to survey device targeting.",
      order: 9,
      options: [
        o(90, "Smartphone", "smartphone"),
        o(91, "Tablet", "tablet"),
        o(92, "Laptop / desktop computer", "computer"),
        o(93, "Smart TV / streaming device", "tv")
      ],
      validation: { minSelections: 1, maxSelections: 4 }
    }),
    q("_q_frequency", {
      type: "radio",
      title: "How often do you participate in paid surveys or research studies?",
      order: 10,
      options: [
        o(100, "This is my first time", "first"),
        o(101, "Occasionally (a few times per year)", "occasional"),
        o(102, "Regularly (monthly or more)", "regular")
      ]
    }),
    q("_q_topics", {
      type: "checkbox",
      title: "Which topics interest you for future studies?",
      helperText: "Select all that apply (helps invite you to relevant surveys).",
      order: 11,
      options: [
        o(110, "Consumer products & shopping", "consumer"),
        o(111, "Technology & apps", "technology"),
        o(112, "Health & wellness", "wellness"),
        o(113, "Finance & banking", "finance_topics"),
        o(114, "Automotive & mobility", "auto"),
        o(115, "Media & entertainment", "entertainment"),
        o(116, "B2B / workplace tools", "b2b")
      ],
      validation: { minSelections: 1, maxSelections: 7 }
    })
  ];
}

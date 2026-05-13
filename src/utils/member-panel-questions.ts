/** Professional demographic & participation profile for panel matching — stable ids per seed prefix */

export function buildMemberPanelQuestions(seed: string) {
  const o = (idx: number, label: string, value: string) => ({
    id: `${seed}_opt_${idx}`,
    label,
    value
  });

  return [
    {
      id: `${seed}_q_age`,
      type: "radio" as const,
      title: "Which age range do you fall into?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(1, "18–24", "18_24"),
        o(2, "25–34", "25_34"),
        o(3, "35–44", "35_44"),
        o(4, "45–54", "45_54"),
        o(5, "55 or older", "55_plus")
      ],
      validation: {},
      randomizeOptions: false,
      order: 0,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_gender`,
      type: "radio" as const,
      title: "How do you describe your gender?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(10, "Female", "female"),
        o(11, "Male", "male"),
        o(12, "Non-binary / third gender", "non_binary"),
        o(13, "Prefer not to say", "prefer_not")
      ],
      validation: {},
      randomizeOptions: false,
      order: 1,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_country`,
      type: "dropdown" as const,
      title: "What is your country of residence?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "Select country",
      defaultValue: null,
      options: [
        o(20, "United States", "us"),
        o(21, "United Kingdom", "uk"),
        o(22, "Canada", "ca"),
        o(23, "India", "in"),
        o(24, "Australia", "au"),
        o(25, "Germany", "de"),
        o(26, "France", "fr"),
        o(27, "Brazil", "br"),
        o(28, "Mexico", "mx"),
        o(29, "Other", "other")
      ],
      validation: {},
      randomizeOptions: false,
      order: 2,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_region`,
      type: "short_text" as const,
      title: "City or region",
      description: "Helps match location-based studies without storing full address.",
      helperText: "e.g. Ontario, Greater London, Mumbai suburbs",
      required: true,
      placeholder: "City, state/province, or region",
      defaultValue: null,
      options: [],
      validation: { minLength: 2, maxLength: 120 },
      randomizeOptions: false,
      order: 3,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_employment`,
      type: "radio" as const,
      title: "What best describes your current employment status?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(30, "Employed full-time", "full_time"),
        o(31, "Employed part-time", "part_time"),
        o(32, "Self-employed / freelancer", "self_employed"),
        o(33, "Student", "student"),
        o(34, "Not employed / homemaker / retired", "other_ne"),
        o(35, "Prefer not to say", "prefer_not")
      ],
      validation: {},
      randomizeOptions: false,
      order: 4,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_industry`,
      type: "dropdown" as const,
      title: "Which industry do you primarily work or study in?",
      description: "",
      helperText: "Choose the closest match.",
      required: true,
      placeholder: "Select industry",
      defaultValue: null,
      options: [
        o(40, "Technology / IT", "tech"),
        o(41, "Healthcare / Life sciences", "health"),
        o(42, "Finance / Insurance", "finance"),
        o(43, "Retail / Consumer goods", "retail"),
        o(44, "Manufacturing / Industrial", "mfg"),
        o(45, "Education", "education"),
        o(46, "Government / Public sector", "gov"),
        o(47, "Media / Marketing / Advertising", "media"),
        o(48, "Hospitality / Travel", "hospitality"),
        o(49, "Other / Not applicable", "other")
      ],
      validation: {},
      randomizeOptions: false,
      order: 5,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_education`,
      type: "radio" as const,
      title: "What is your highest level of education completed?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(50, "Secondary / high school or less", "secondary"),
        o(51, "Some college / vocational", "some_college"),
        o(52, "Bachelor’s degree", "bachelors"),
        o(53, "Master’s degree or higher", "masters_plus"),
        o(54, "Prefer not to say", "prefer_not")
      ],
      validation: {},
      randomizeOptions: false,
      order: 6,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_income`,
      type: "radio" as const,
      title: "Household income before taxes (annual, approximate)",
      description: "",
      helperText: "Use your local currency; ranges are relative bands for screening.",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(60, "Under $25,000 / €20,000 / ₹20 lakh", "band_1"),
        o(61, "$25,000–$49,999", "band_2"),
        o(62, "$50,000–$99,999", "band_3"),
        o(63, "$100,000–$149,999", "band_4"),
        o(64, "$150,000 or more", "band_5"),
        o(65, "Prefer not to say", "prefer_not")
      ],
      validation: {},
      randomizeOptions: false,
      order: 7,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_ethnicity`,
      type: "radio" as const,
      title: "How would you describe your ethnicity or cultural background?",
      description: "",
      helperText: "Used only in aggregate for representative sampling.",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(70, "Asian", "asian"),
        o(71, "Black / African descent", "black"),
        o(72, "Hispanic / Latino", "hispanic"),
        o(73, "White / Caucasian", "white"),
        o(74, "Middle Eastern / North African", "mena"),
        o(75, "Mixed / Multiple", "mixed"),
        o(76, "Prefer not to say", "prefer_not")
      ],
      validation: {},
      randomizeOptions: false,
      order: 8,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_devices`,
      type: "checkbox" as const,
      title: "Which devices do you use regularly?",
      description: "",
      helperText: "Select all that apply.",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(80, "Smartphone", "smartphone"),
        o(81, "Tablet", "tablet"),
        o(82, "Laptop / desktop computer", "computer"),
        o(83, "Smart TV / streaming device", "tv")
      ],
      validation: { minSelections: 1, maxSelections: 4 },
      randomizeOptions: false,
      order: 9,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_frequency`,
      type: "radio" as const,
      title: "How often do you participate in paid surveys or research studies?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(90, "This is my first time", "first"),
        o(91, "Occasionally (a few times per year)", "occasional"),
        o(92, "Regularly (monthly or more)", "regular")
      ],
      validation: {},
      randomizeOptions: false,
      order: 10,
      visibilityConditions: []
    },
    {
      id: `${seed}_q_topics`,
      type: "checkbox" as const,
      title: "Which topics interest you for future studies?",
      description: "",
      helperText: "Select all that apply (helps us invite you to relevant surveys).",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        o(100, "Consumer products & shopping", "consumer"),
        o(101, "Technology & apps", "technology"),
        o(102, "Health & wellness", "wellness"),
        o(103, "Finance & banking", "finance_topics"),
        o(104, "Automotive & mobility", "auto"),
        o(105, "Media & entertainment", "entertainment"),
        o(106, "B2B / workplace tools", "b2b")
      ],
      validation: { minSelections: 1, maxSelections: 7 },
      randomizeOptions: false,
      order: 11,
      visibilityConditions: []
    }
  ];
}

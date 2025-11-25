// assets/js/utils/clientSchema.js

// =======================================
// DEFAULT CLIENT STRUCTURE
// =======================================
export const clientDefault = {
  id: "",
  title: "",
  first_name: "",
  last_name: "",
  dob: "",
  gender: "",
  status: "Active",

  // Contact (NO address here anymore)
  phone: "",
  email: "",

  // Council
  councilId: null,

  // Disabilities
  disabilities: ["None"],

  // These are removed: kin_name, kin_relation, kin_address, kin_email
  // Because kin history is stored in client_kins table

  // Ethnicity & language
  ethnicity_type: "",
  ethnicity: "",
  language: "",

  optional_fields: [],

  // Who created the client
  created_by: "",

  profile_img: "../images/profile.png"
};


// =======================================
// FIELD GROUPS (for rendering sections)
// =======================================
export const fieldGroups = {
  "Personal Information": [
    "title",
    "first_name",
    "last_name",
    "id",
    "dob",
    "gender",
    "status"
  ],

  "Contact Details": [
    "phone",
    "email"
    // address removed, handled separately
  ],

  "Disability Information": [
    "disabilities"
  ],

  // Kin removed because handled separately through client_kins

  "Other Information": [
    "ethnicity_type",
    "ethnicity",
    "language"
  ],

  "Optional Fields": [
    "optional_fields"
  ]
};


// =======================================
// DROPDOWN OPTIONS
// =======================================
export const titleOptions = ["Dr.", "Master.", "Mr.", "Mrs.", "Ms.", "Miss."];

export const genderOptions = ["Male", "Female", "Other"];

export const kinOptions = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Husband",
  "Wife",
  "Self",
  "Other"
];

export const ethnicityOptions = {
  "White": [
    "English / Welsh/ Scottish/ Northern Irish/ British",
    "Irish",
    "Gypsy or Irish Traveller",
    "Any Other White Background"
  ],
  "Mixed/Multiple Ethnic Group": [
    "White and Black Caribbean",
    "White and Black African",
    "White and Asian",
    "Any other Mixed / Multiple ethnic background"
  ],
  "Asian/Asian British": [
    "Indian",
    "Pakistani",
    "Bangladeshi",
    "Chinese",
    "Any other Asian background"
  ],
  "Black/African/Caribbean/Black British": [
    "African",
    "Caribbean",
    "Any other Black / African / Caribbean background"
  ],
  "Other Ethnic Group": [
    "Arab",
    "Any other ethnic group"
  ],
  "Prefer not to disclose": [
    "Prefer not to disclose"
  ]
};